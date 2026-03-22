import {
  readAsStringAsync,
  writeAsStringAsync,
  getInfoAsync,
  cacheDirectory,
  deleteAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import { EncryptedStorageService } from '../core/storage/EncryptedStorageService';
import { CryptoService } from '../core/crypto/CryptoService';
import * as DocumentRepository from '../db/DocumentRepository';
import { KitHistoryService } from './KitHistoryService';
import { CloudBackupService } from './CloudBackupService';
import { AnalyticsService } from './AnalyticsService';
import type { Document, DocumentInsert } from '../models/Document';
import type { DocumentCategory } from '../models/DocumentCategory';
import {
  MAX_SINGLE_DOCUMENT_SIZE_BYTES,
  VAULT_STORAGE_CAP_PERSONAL_BYTES,
  ALLOWED_EXTENSIONS,
} from '../constants/storage';
import { safeAsync } from '../utils/safeAsync';

const THUMBNAIL_WIDTH = 200;

const EXTRA_ALLOWED = new Set(['.heic']);

let importLock: Promise<void> = Promise.resolve();

function inferFormat(path: string, mimeHint?: string): 'jpeg' | 'png' | 'pdf' {
  if (mimeHint?.includes('pdf')) return 'pdf';
  if (mimeHint?.includes('png')) return 'png';
  const ext = path.toLowerCase().slice(path.lastIndexOf('.'));
  if (ext === '.pdf') return 'pdf';
  if (ext === '.png') return 'png';
  return 'jpeg';
}

function validateExtension(path: string): void {
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex < path.lastIndexOf('/')) return;
  const ext = path.toLowerCase().slice(dotIndex);
  const allowed = ALLOWED_EXTENSIONS as readonly string[];
  if (!allowed.includes(ext) && !EXTRA_ALLOWED.has(ext)) {
    throw new Error(
      `Unsupported file type "${ext}". Allowed: ${allowed.join(', ')}`,
    );
  }
}

async function assertVaultCapacity(incomingBytes: number): Promise<void> {
  const currentSize = await EncryptedStorageService.getVaultSizeBytes();
  if (currentSize + incomingBytes > VAULT_STORAGE_CAP_PERSONAL_BYTES) {
    const usedMB = Math.round(currentSize / 1024 / 1024);
    const capGB = VAULT_STORAGE_CAP_PERSONAL_BYTES / 1024 / 1024 / 1024;
    throw new Error(
      `Vault storage limit reached (${usedMB}MB used of ${capGB}GB). ` +
        'Delete some documents to free space.',
    );
  }
}

async function generateThumbnail(
  sourceUri: string,
  format: 'jpeg' | 'png' | 'pdf',
): Promise<string | null> {
  if (format === 'pdf') return null;
  try {
    const result = await manipulateAsync(
      sourceUri,
      [{ resize: { width: THUMBNAIL_WIDTH } }],
      { compress: 0.6, format: SaveFormat.JPEG },
    );
    const thumbBase64 = await readAsStringAsync(result.uri, {
      encoding: EncodingType.Base64,
    });
    return thumbBase64;
  } catch {
    return null;
  }
}

export class DocumentService {
  /**
   * Import a document from a file path (scanner, file picker, photo picker).
   * Validates type + size + vault cap, encrypts, generates thumbnail, stores.
   */
  static async importFromFilePath(
    filePath: string,
    category: DocumentCategory,
    title: string,
    options?: Partial<DocumentInsert>,
  ): Promise<Document> {
    const release = importLock;
    let resolve!: () => void;
    importLock = new Promise<void>((r) => {
      resolve = r;
    });
    await release;
    try {
      validateExtension(filePath);

      const info = await getInfoAsync(filePath);
      if (!info.exists || typeof (info as { size?: number }).size !== 'number') {
        throw new Error('File not found or not accessible');
      }

      const size = (info as { size?: number }).size ?? 0;
      if (size > MAX_SINGLE_DOCUMENT_SIZE_BYTES) {
        throw new Error(
          `File too large. Maximum size is ${MAX_SINGLE_DOCUMENT_SIZE_BYTES / 1024 / 1024}MB`,
        );
      }

      await assertVaultCapacity(size);

      if (size > 10 * 1024 * 1024) {
        console.warn(
          `Large file import (${Math.round(size / 1024 / 1024)}MB) — high memory usage expected`,
        );
      }

      const base64 = await readAsStringAsync(filePath, {
        encoding: EncodingType.Base64,
      });
      const content = Buffer.from(base64, 'base64');
      const format = options?.format ?? inferFormat(filePath);
      const fileRef = CryptoService.generateSecureId('doc');

      await EncryptedStorageService.initializeVault();
      await EncryptedStorageService.saveFile(fileRef, content);

      let thumbnailRef: string | null = null;
      let result: Document;
      try {
        const thumbBase64 = await generateThumbnail(filePath, format);
        if (thumbBase64) {
          thumbnailRef = CryptoService.generateSecureId('thumb');
          await EncryptedStorageService.saveFile(
            thumbnailRef,
            Buffer.from(thumbBase64, 'base64'),
          );
        }

        // Destructure format out of options so spreading options cannot override
        // the already-inferred format with undefined (which would violate NOT NULL).
        const { format: _optFormat, ...restOptions } = options ?? {};
        const doc: DocumentInsert = {
          category,
          title,
          fileRef,
          format,
          thumbnailRef,
          ...restOptions,
        };

        result = await DocumentRepository.insertDocument(doc);
      } catch (err) {
        await EncryptedStorageService.deleteFile(fileRef).catch(() => {});
        if (thumbnailRef) {
          await EncryptedStorageService.deleteFile(thumbnailRef).catch(() => {});
        }
        throw err;
      }

      safeAsync(KitHistoryService.recordVaultChange(), 'recordVaultChange');
      safeAsync(CloudBackupService.autoBackupIfEnabled(), 'autoBackupIfEnabled');
      safeAsync(AnalyticsService.trackEvent(AnalyticsService.Events.DOCUMENT_ADDED, { category, source: 'file' }), 'trackEvent:document_added');
      return result;
    } finally {
      resolve();
    }
  }

  /**
   * Import from base64 (document scanner with base64 response).
   */
  static async importFromBase64(
    base64: string,
    category: DocumentCategory,
    title: string,
    formatOrOptions?: 'jpeg' | 'png' | Partial<DocumentInsert>,
  ): Promise<Document> {
    const release = importLock;
    let resolve!: () => void;
    importLock = new Promise<void>((r) => {
      resolve = r;
    });
    await release;
    try {
      const isOptionsObj = typeof formatOrOptions === 'object';
      const format: 'jpeg' | 'png' = isOptionsObj
        ? (formatOrOptions?.format === 'png' ? 'png' : 'jpeg')
        : (formatOrOptions ?? 'jpeg');
      const { format: _f, ...extraOptions } = isOptionsObj ? (formatOrOptions ?? {}) : {};

      const content = Buffer.from(base64, 'base64');

      if (content.length > MAX_SINGLE_DOCUMENT_SIZE_BYTES) {
        throw new Error(
          `File too large. Maximum size is ${MAX_SINGLE_DOCUMENT_SIZE_BYTES / 1024 / 1024}MB`,
        );
      }

      await assertVaultCapacity(content.length);

      const fileRef = CryptoService.generateSecureId('doc');

      await EncryptedStorageService.initializeVault();
      await EncryptedStorageService.saveFile(fileRef, content);

      let thumbnailRef: string | null = null;
      let result: Document;
      try {
        {
          const tempPath = `${cacheDirectory}thumb_src_${Date.now()}.${format}`;
          try {
            await writeAsStringAsync(tempPath, base64, {
              encoding: EncodingType.Base64,
            });
            const thumbBase64 = await generateThumbnail(tempPath, format);
            if (thumbBase64) {
              thumbnailRef = CryptoService.generateSecureId('thumb');
              await EncryptedStorageService.saveFile(
                thumbnailRef,
                Buffer.from(thumbBase64, 'base64'),
              );
            }
          } finally {
            await deleteAsync(tempPath, { idempotent: true }).catch(() => {});
          }
        }

        result = await DocumentRepository.insertDocument({
          category,
          title,
          fileRef,
          format,
          thumbnailRef,
          ...extraOptions,
        });
      } catch (err) {
        await EncryptedStorageService.deleteFile(fileRef).catch(() => {});
        if (thumbnailRef) {
          await EncryptedStorageService.deleteFile(thumbnailRef).catch(() => {});
        }
        throw err;
      }

      safeAsync(KitHistoryService.recordVaultChange(), 'recordVaultChange');
      safeAsync(CloudBackupService.autoBackupIfEnabled(), 'autoBackupIfEnabled');
      safeAsync(AnalyticsService.trackEvent(AnalyticsService.Events.DOCUMENT_SCANNED, { category }), 'trackEvent:document_scanned');
      return result;
    } finally {
      resolve();
    }
  }

  static async getDocumentContent(doc: Document): Promise<Buffer> {
    return EncryptedStorageService.readFile(doc.fileRef);
  }

  /**
   * Get decrypted thumbnail content, or null if no thumbnail exists.
   */
  static async getThumbnailContent(
    doc: Document,
  ): Promise<string | null> {
    if (!doc.thumbnailRef) return null;
    try {
      const buf = await EncryptedStorageService.readFile(doc.thumbnailRef);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  static async getAllDocuments(): Promise<Document[]> {
    return DocumentRepository.getAllDocuments();
  }

  static async getDocumentsByCategory(
    category: string,
  ): Promise<Document[]> {
    return DocumentRepository.getDocumentsByCategory(category);
  }

  static async getDocumentById(id: string): Promise<Document | null> {
    return DocumentRepository.getDocumentById(id);
  }

  static async updateDocument(
    id: string,
    updates: Parameters<typeof DocumentRepository.updateDocument>[1],
  ): Promise<void> {
    await DocumentRepository.updateDocument(id, updates);
    safeAsync(KitHistoryService.recordVaultChange(), 'recordVaultChange');
    safeAsync(CloudBackupService.autoBackupIfEnabled(), 'autoBackupIfEnabled');
  }

  static async deleteDocument(id: string): Promise<void> {
    const doc = await DocumentRepository.getDocumentById(id);
    const fileRef = doc?.fileRef;
    const thumbnailRef = doc?.thumbnailRef;
    await DocumentRepository.deleteDocument(id);
    if (fileRef) {
      await EncryptedStorageService.deleteFile(fileRef);
    }
    if (thumbnailRef) {
      await EncryptedStorageService.deleteFile(thumbnailRef).catch(() => {});
    }
    safeAsync(KitHistoryService.recordVaultChange(), 'recordVaultChange');
    safeAsync(CloudBackupService.autoBackupIfEnabled(), 'autoBackupIfEnabled');
    safeAsync(AnalyticsService.trackEvent(AnalyticsService.Events.DOCUMENT_DELETED), 'trackEvent:document_deleted');
  }

  static async getDocumentCountByCategory(): Promise<
    Record<string, number>
  > {
    return DocumentRepository.getDocumentCountByCategory();
  }

  /**
   * Returns total vault storage used in bytes.
   */
  static async getVaultSizeBytes(): Promise<number> {
    return EncryptedStorageService.getVaultSizeBytes();
  }

  /**
   * Validates integrity of a single document's encrypted file.
   * Returns true if decryption succeeds (GCM auth tag valid).
   */
  static async validateDocumentIntegrity(
    doc: Document,
  ): Promise<boolean> {
    return EncryptedStorageService.validateFileIntegrity(doc.fileRef);
  }

  /**
   * Scans all documents for corruption. Returns IDs of corrupted docs.
   */
  static async findCorruptedDocuments(): Promise<string[]> {
    const docs = await this.getAllDocuments();
    const corrupted: string[] = [];
    for (const doc of docs) {
      const exists = await EncryptedStorageService.fileExists(doc.fileRef);
      if (!exists) {
        corrupted.push(doc.id);
        continue;
      }
      const valid = await EncryptedStorageService.validateFileIntegrity(
        doc.fileRef,
      );
      if (!valid) corrupted.push(doc.id);
    }
    return corrupted;
  }
}

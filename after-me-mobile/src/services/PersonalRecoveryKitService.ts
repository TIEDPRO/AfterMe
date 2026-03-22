/**
 * Personal Recovery Kit — generates a recovery .afterme file for the user's own
 * device loss scenario. Reuses the FamilyKit encryption infrastructure but with
 * personal-recovery branding, storage recommendations, and a simpler flow.
 *
 * Unlike the Family Kit (for sharing with loved ones), the Personal Recovery Kit
 * is intended for the user themselves — printed QR stored in a safe, USB backup,
 * or deposited with a solicitor.
 */
import JSZip from 'jszip';
import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import QuickCrypto from 'react-native-quick-crypto';
import { CryptoService } from '../core/crypto/CryptoService';
import { EncryptedStorageService } from '../core/storage/EncryptedStorageService';
import * as DocumentRepository from '../db/DocumentRepository';
import { CATEGORY_LABELS } from '../models/DocumentCategory';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY_LENGTH = 48;
const EXPORT_DOC_LIMIT = 100;
const EXPORT_SIZE_LIMIT_BYTES = 200 * 1024 * 1024;
const SALT_SIZE = 32;
const RECOVERY_KIT_KEY = 'afterme_personal_recovery_kit';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function generateAccessKey(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_~!@#$%^&*';
  const charsetLen = charset.length;
  const maxUnbiased = 256 - (256 % charsetLen);
  const result: string[] = [];
  while (result.length < ACCESS_KEY_LENGTH) {
    const bytes = Buffer.from(QuickCrypto.randomBytes(ACCESS_KEY_LENGTH * 2));
    for (let i = 0; i < bytes.length && result.length < ACCESS_KEY_LENGTH; i++) {
      if (bytes[i] < maxUnbiased) {
        result.push(charset[bytes[i] % charsetLen]);
      }
    }
  }
  return result.join('');
}

function generateReadme(documentCount: number, categories: string[]): string {
  return [
    '═══════════════════════════════════════════════════════════════',
    '               AFTER ME — PERSONAL RECOVERY KIT',
    '═══════════════════════════════════════════════════════════════',
    '',
    'This is YOUR personal vault backup. If you lose your device,',
    'use this file and your printed QR code to restore your vault.',
    '',
    '───────────────────────────────────────────────────────────────',
    'HOW TO RESTORE YOUR VAULT',
    '───────────────────────────────────────────────────────────────',
    '',
    '  1. Install After Me on your new device',
    '  2. On the Welcome screen, tap "Restore My Vault"',
    '  3. Scan the QR code from your printed Recovery Card',
    '  4. Select this .afterme file when prompted',
    '  5. Your documents will be decrypted and restored',
    '',
    '───────────────────────────────────────────────────────────────',
    'ABOUT THIS BACKUP',
    '───────────────────────────────────────────────────────────────',
    '',
    `  Documents:   ${documentCount}`,
    `  Categories:  ${categories.join(', ')}`,
    `  Created:     ${new Date().toISOString()}`,
    `  Format:      .afterme v1.0`,
    `  Encryption:  AES-256-GCM`,
    '',
    '───────────────────────────────────────────────────────────────',
    'STORAGE RECOMMENDATIONS',
    '───────────────────────────────────────────────────────────────',
    '',
    '  • Print the QR Recovery Card and store separately from this file',
    '  • Keep this file on a USB drive in a fireproof safe',
    '  • Consider giving a copy to your solicitor or estate attorney',
    '  • Store a copy in a safety deposit box',
    '  • Update this kit whenever you add or remove documents',
    '  • NEVER store the QR code and .afterme file together digitally',
    '',
    '═══════════════════════════════════════════════════════════════',
  ].join('\n');
}

export interface RecoveryKitResult {
  filePath: string;
  accessKey: string;
  documentCount: number;
}

export class PersonalRecoveryKitService {
  static async generateKit(
    onProgress?: (current: number, total: number) => void,
  ): Promise<RecoveryKitResult> {
    const docs = await DocumentRepository.getAllDocuments();

    if (docs.length === 0) {
      throw new Error('Cannot create a Recovery Kit with an empty vault. Add documents first.');
    }

    if (docs.length > EXPORT_DOC_LIMIT) {
      throw new Error(
        `Your vault has ${docs.length} documents which exceeds the export limit of ${EXPORT_DOC_LIMIT}. ` +
        'Please reduce the number of documents before generating a Recovery Kit.',
      );
    }

    const accessKey = generateAccessKey();
    const cek = CryptoService.generateKey();

    const vaultPayload: { documents: Record<string, unknown>[] } = {
      documents: [],
    };

    let totalPayloadBytes = 0;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      onProgress?.(i + 1, docs.length);
      const content = await EncryptedStorageService.readFile(doc.fileRef);
      totalPayloadBytes += content.length;
      if (totalPayloadBytes > EXPORT_SIZE_LIMIT_BYTES) {
        throw new Error(
          'The vault is too large to export in a single kit. Total file size exceeds ' +
          `${EXPORT_SIZE_LIMIT_BYTES / 1024 / 1024}MB. Remove larger documents and try again.`,
        );
      }
      vaultPayload.documents.push({
        id: doc.id,
        category: CATEGORY_LABELS[doc.category],
        title: doc.title,
        file_data: content.toString('base64'),
        mime_type:
          doc.format === 'pdf' ? 'application/pdf' :
          doc.format === 'png' ? 'image/png' : 'image/jpeg',
        created_at: doc.createdAt,
        document_date: doc.documentDate,
        expiry_date: doc.expiryDate,
        provider_name: doc.providerName,
      });
    }

    const vaultJson = Buffer.from(JSON.stringify(vaultPayload), 'utf8');
    vaultPayload.documents.length = 0;
    (vaultPayload as any).documents = null;

    const vaultEnc = CryptoService.encrypt(vaultJson, cek);

    const salt = Buffer.from(QuickCrypto.randomBytes(SALT_SIZE));
    const kek = CryptoService.deriveKey(accessKey, salt);
    const wrappedCek = CryptoService.encrypt(cek, kek);
    const keyEnc = Buffer.concat([salt, wrappedCek]);

    const usedCategories = [...new Set(docs.map((d) => d.category))];

    const readme = generateReadme(
      docs.length,
      usedCategories.map((c) => CATEGORY_LABELS[c]),
    );

    const manifest = JSON.stringify({
      version: '1.0',
      app_version: APP_VERSION,
      type: 'personal_recovery',
      created_at: new Date().toISOString(),
      document_count: docs.length,
      categories: usedCategories.map((c) => CATEGORY_LABELS[c]),
      encryption_algo: 'AES-256-GCM',
      kdf_algo: 'PBKDF2-HMAC-SHA256',
    }, null, 2);

    const zip = new JSZip();
    zip.file('README.txt', readme);
    zip.file('manifest.json', manifest);
    zip.file('vault.enc', vaultEnc);
    zip.file('key.enc', keyEnc);

    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    const filePath = `${cacheDirectory}personal-recovery-${Date.now()}.afterme`;
    await writeAsStringAsync(filePath, zipBase64, { encoding: EncodingType.Base64 });

    await AsyncStorage.setItem(RECOVERY_KIT_KEY, JSON.stringify({
      createdAt: new Date().toISOString(),
      documentCount: docs.length,
    }));

    return { filePath, accessKey, documentCount: docs.length };
  }

  static async getLastKitInfo(): Promise<{ createdAt: string; documentCount: number } | null> {
    const raw = await AsyncStorage.getItem(RECOVERY_KIT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static async hasCreatedKit(): Promise<boolean> {
    const info = await this.getLastKitInfo();
    return info !== null;
  }
}

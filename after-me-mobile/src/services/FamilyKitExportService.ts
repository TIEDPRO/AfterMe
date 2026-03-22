/**
 * Family Kit export — generates .afterme files with encrypted vault contents.
 * Produces: README.txt, manifest.json, key.enc, vault.enc inside a ZIP.
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
import { CATEGORY_LABELS, type DocumentCategory } from '../models/DocumentCategory';
import { KitHistoryService } from './KitHistoryService';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const EXPORT_DOC_LIMIT = 100;
const EXPORT_SIZE_LIMIT_BYTES = 200 * 1024 * 1024; // 200 MB in-memory ceiling

const ACCESS_KEY_LENGTH = 48;
const SALT_SIZE = 32;

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

function generateReadme(ownerName: string | null, documentCount: number, categories: string[], emergencyContact: string | null): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    AFTER ME — FAMILY KIT',
    '═══════════════════════════════════════════════════════════════',
    '',
    'This file was created with After Me, a secure document vault',
    'for preserving important documents for your loved ones.',
    '',
    '⚠  THIS FILE CAN BE OPENED WITHOUT THE AFTER ME APP  ⚠',
    '',
    'The .afterme format is an open standard. You can always',
    'recover the contents using freely available tools.',
    '',
    '───────────────────────────────────────────────────────────────',
    'HOW TO ACCESS THIS VAULT',
    '───────────────────────────────────────────────────────────────',
    '',
    '  Option 1: After Me App (easiest)',
    '    1. Download the After Me app',
    '    2. Choose "I Have a Legacy Kit"',
    '    3. Scan the QR code from your printed Family Kit',
    '    4. Select this .afterme file when prompted',
    '',
    '  Option 2: Open-Source Decoder (no app needed)',
    '    1. Visit: https://afterme.app/decoder',
    '    2. Or use the Python decoder: github.com/afterme-app/decoder',
    '    3. Provide the Access Key (from the QR code)',
    '    4. The decoder will extract all documents',
    '',
    '  Option 3: Manual Recovery (technical)',
    '    1. Unzip this .afterme file',
    '    2. Read the format specification at:',
    '       https://afterme.app/format-spec',
    '    3. Use PBKDF2-HMAC-SHA256 (600,000 iterations)',
    '       with the Access Key and salt from key.enc',
    '    4. Decrypt key.enc to get the Content Encryption Key',
    '    5. Decrypt vault.enc with AES-256-GCM',
    '',
    '───────────────────────────────────────────────────────────────',
    'ABOUT THIS KIT',
    '───────────────────────────────────────────────────────────────',
    '',
  ];

  if (ownerName) {
    lines.push(`  Prepared by: ${ownerName}`);
  }
  lines.push(`  Documents:   ${documentCount}`);
  lines.push(`  Categories:  ${categories.join(', ')}`);
  lines.push(`  Created:     ${new Date().toISOString()}`);
  lines.push(`  Format:      .afterme v1.0`);
  lines.push(`  Encryption:  AES-256-GCM`);

  if (emergencyContact) {
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('EMERGENCY CONTACT');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push(`  ${emergencyContact}`);
  }

  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('IMPORTANT');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('  • Keep this file and the QR code in separate locations');
  lines.push('  • Both are needed to access the vault');
  lines.push('  • Store in a fireproof safe, safety deposit box, or');
  lines.push('    with a trusted solicitor / estate attorney');
  lines.push('  • Consider giving copies to multiple trusted people');
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

function generateManifest(
  ownerName: string | null,
  documentCount: number,
  categories: DocumentCategory[],
  kitVersion: number,
): string {
  return JSON.stringify(
    {
      version: '1.0',
      app_version: APP_VERSION,
      created_at: new Date().toISOString(),
      vault_id: CryptoService.generateSecureId('vault'),
      owner_name: ownerName ?? null,
      document_count: documentCount,
      categories: categories.map((c) => CATEGORY_LABELS[c]),
      kit_version: kitVersion,
      encryption_algo: 'AES-256-GCM',
      kdf_algo: 'PBKDF2-HMAC-SHA256',
    },
    null,
    2,
  );
}

export interface KitGenerationResult {
  filePath: string;
  accessKey: string;
  documentCount: number;
  kitVersion: number;
}

export class FamilyKitExportService {
  /**
   * Generate a complete .afterme Family Kit file.
   * Returns the file path, access key, and document count.
   */
  static async generateKit(
    ownerName: string | null = null,
    emergencyContact: string | null = null,
    onProgress?: (current: number, total: number) => void,
  ): Promise<KitGenerationResult> {
    const docs = await DocumentRepository.getAllDocuments();

    if (docs.length === 0) {
      throw new Error('Cannot create a Family Kit with an empty vault. Add documents first.');
    }

    if (docs.length > EXPORT_DOC_LIMIT) {
      throw new Error(
        `Your vault has ${docs.length} documents which exceeds the export limit of ${EXPORT_DOC_LIMIT}. ` +
        'Please reduce the number of documents before generating a Family Kit.',
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
    const kitVersion = await KitHistoryService.getNextKitVersion();

    const readme = generateReadme(
      ownerName,
      docs.length,
      usedCategories.map((c) => CATEGORY_LABELS[c]),
      emergencyContact,
    );
    const manifest = generateManifest(ownerName, docs.length, usedCategories, kitVersion);

    const zip = new JSZip();
    zip.file('README.txt', readme);
    zip.file('manifest.json', manifest);
    zip.file('vault.enc', vaultEnc);
    zip.file('key.enc', keyEnc);

    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    const filePath = `${cacheDirectory}family-kit-${Date.now()}.afterme`;
    await writeAsStringAsync(filePath, zipBase64, { encoding: EncodingType.Base64 });

    await KitHistoryService.recordKitGeneration(kitVersion, docs.length, usedCategories);

    return { filePath, accessKey, documentCount: docs.length, kitVersion };
  }

  /**
   * Validate a generated kit by attempting to decrypt it with the access key.
   */
  static async validateKit(filePath: string, accessKey: string): Promise<boolean> {
    try {
      const { readAsStringAsync, EncodingType: FsEncoding } = await import('expo-file-system/legacy');
      const base64 = await readAsStringAsync(filePath, { encoding: FsEncoding.Base64 });
      const zip = await JSZip.loadAsync(base64, { base64: true });

      const keyEncFile = zip.file('key.enc');
      const vaultEncFile = zip.file('vault.enc');
      const readmeFile = zip.file('README.txt');
      const manifestFile = zip.file('manifest.json');

      if (!keyEncFile || !vaultEncFile || !readmeFile || !manifestFile) return false;

      const keyEncBuf = Buffer.from(await keyEncFile.async('arraybuffer'));
      const vaultEncBuf = Buffer.from(await vaultEncFile.async('arraybuffer'));

      const salt = keyEncBuf.subarray(0, SALT_SIZE);
      const wrappedCek = keyEncBuf.subarray(SALT_SIZE);
      const kek = CryptoService.deriveKey(accessKey, salt);
      const cek = CryptoService.decrypt(wrappedCek, kek);
      const vaultRaw = CryptoService.decrypt(vaultEncBuf, cek);
      const vault = JSON.parse(vaultRaw.toString('utf8'));

      return Array.isArray(vault.documents) && vault.documents.length > 0;
    } catch {
      return false;
    }
  }
}

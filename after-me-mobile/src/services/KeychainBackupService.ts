/**
 * Keychain/Key Backup Service — cloud sync for vault key across devices.
 *
 * iOS: Uses native KeychainSync module with kSecAttrSynchronizable = true
 *      (syncs via iCloud Keychain automatically).
 * Android: Stores the vault key in Google Drive's appDataFolder as a separate
 *          encrypted file, invisible to the user.
 */
import { Platform } from 'react-native';
import { captureVaultError } from './SentryService';

let keychainSync: typeof import('keychain-sync') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  keychainSync = require('keychain-sync');
} catch {
  keychainSync = null;
}

let GoogleDriveService: typeof import('./GoogleDriveService').GoogleDriveService | null = null;
try {
  if (Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    GoogleDriveService = require('./GoogleDriveService').GoogleDriveService;
  }
} catch {
  GoogleDriveService = null;
}

const GDRIVE_KEY_FILE = 'afterme-vault-key.enc';

export const KeychainBackupService = {
  /**
   * Backs up the vault key to cloud key storage.
   * iOS: iCloud Keychain. Android: Google Drive appDataFolder.
   */
  async backupVaultKey(vaultKeyBase64: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      if (!keychainSync) return false;
      try {
        await keychainSync.setVaultKeyBackup(vaultKeyBase64);
        return true;
      } catch (e) {
        captureVaultError(e, 'KeychainBackupService:backupVaultKey:ios');
        return false;
      }
    }

    if (Platform.OS === 'android') {
      if (!GoogleDriveService) return false;
      try {
        return await GoogleDriveService.writeToGoogleDrive(GDRIVE_KEY_FILE, vaultKeyBase64);
      } catch (e) {
        captureVaultError(e, 'KeychainBackupService:backupVaultKey:android');
        return false;
      }
    }

    return false;
  },

  /**
   * Restores the vault key from cloud key storage.
   * Returns null if no backup exists.
   */
  async getBackupVaultKey(): Promise<string | null> {
    if (Platform.OS === 'ios') {
      if (!keychainSync) return null;
      try {
        return await keychainSync.getVaultKeyBackup();
      } catch {
        return null;
      }
    }

    if (Platform.OS === 'android') {
      if (!GoogleDriveService) return null;
      try {
        return await GoogleDriveService.readFromGoogleDrive(GDRIVE_KEY_FILE);
      } catch {
        return null;
      }
    }

    return null;
  },

  /**
   * Removes the cloud key backup (e.g. on vault reset).
   */
  async deleteBackup(): Promise<void> {
    if (Platform.OS === 'ios') {
      if (!keychainSync) return;
      try {
        await keychainSync.deleteVaultKeyBackup();
      } catch {}
      return;
    }

    if (Platform.OS === 'android') {
      if (!GoogleDriveService) return;
      try {
        await GoogleDriveService.deleteFromGoogleDrive(GDRIVE_KEY_FILE);
      } catch {}
    }
  },
};

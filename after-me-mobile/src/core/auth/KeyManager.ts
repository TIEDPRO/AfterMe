import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type NativeEventSubscription } from 'react-native';
import { CryptoService } from '../crypto/CryptoService';
import { captureVaultError } from '../../services/SentryService';
import { KeychainBackupService } from '../../services/KeychainBackupService';
import { EncryptedStorageService } from '../storage/EncryptedStorageService';
import * as DocumentRepository from '../../db/DocumentRepository';

const VAULT_KEY_TAG = 'com.afterme.keys.vault';
const VAULT_KEY_TAG_PENDING = 'com.afterme.keys.vault.pending';
const BIOMETRIC_PREF_KEY = 'afterme_biometric_enabled';

/**
 * In-memory vault key cache. Evicted when app goes to background.
 * Avoids repeated biometric prompts within a single foreground session.
 */
let cachedVaultKey: Buffer | null = null;
let pendingKeyPromise: Promise<Buffer> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

function ensureAppStateListener(): void {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      if (cachedVaultKey) cachedVaultKey.fill(0);
      cachedVaultKey = null;
      // pendingKeyPromise is NOT cleared here — it must resolve naturally.
      // Clearing it during 'inactive' (which fires when FaceID/system dialogs
      // appear) caused duplicate biometric prompts: the first getVaultKey()
      // triggers FaceID → app goes inactive → pendingKeyPromise wiped →
      // second caller creates a new promise → second FaceID prompt.
    }
  });
}

export class KeyManager {
  /**
   * Initializes the vault key.
   * Generates a 256-bit AES key stored in the platform's secure hardware
   * (Secure Enclave on iOS, Keystore on Android) via expo-secure-store.
   * Biometric authentication is required for every subsequent access.
   * Also backs up the vault key to iCloud Keychain for device migration (iOS).
   */
  static async initializeKeys(): Promise<void> {
    const alreadyExists = await this.isInitialized();
    if (alreadyExists) {
      captureVaultError(new Error('initializeKeys() called but vault key already exists — skipping to prevent data loss.'), 'key_management');
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    // isEnrolledAsync() can return false on physical devices if this is the
    // first call before Face ID permission is granted by the OS. We check here
    // but do NOT throw — the caller (OnboardingScreen5) already triggered
    // authenticateAsync() which grants permission and verifies enrollment.
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const useBiometrics = hasHardware && isEnrolled;

    const vaultKey = CryptoService.generateKey();

    // Use AFTER_FIRST_UNLOCK so the key is accessible after the first device
    // unlock. Avoid WHEN_PASSCODE_SET_THIS_DEVICE_ONLY on first-run because
    // combining it with requireAuthentication: true can throw a Keychain error
    // before the OS has confirmed passcode state during initial setup.
    await SecureStore.setItemAsync(VAULT_KEY_TAG, vaultKey.toString('base64'), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      requireAuthentication: useBiometrics,
      authenticationPrompt: 'Unlock your After Me vault',
    });

    if (!useBiometrics) {
      captureVaultError(new Error('Vault key stored without biometric protection — hardware or enrollment unavailable.'), 'key_management');
    }

    // Non-blocking: key init succeeds even if iCloud backup fails.
    const backedUp = await KeychainBackupService.backupVaultKey(vaultKey.toString('base64'));
    if (!backedUp) {
      captureVaultError(new Error('iCloud Keychain backup skipped — key is only on this device.'), 'key_management');
    }
  }

  /**
   * Retrieves the Vault Key. On first call per foreground session, triggers
   * the OS biometric/passcode prompt. Subsequent calls return the cached key
   * until the app is backgrounded.
   */
  static async getVaultKey(): Promise<Buffer> {
    ensureAppStateListener();

    if (cachedVaultKey) return cachedVaultKey;

    // Deduplicate concurrent biometric prompts: all callers share one promise
    if (pendingKeyPromise) return pendingKeyPromise;

    pendingKeyPromise = (async () => {
      try {
        const bioPref = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
        const requireAuth = bioPref !== 'false';

        const keyBase64 = await SecureStore.getItemAsync(VAULT_KEY_TAG, {
          requireAuthentication: requireAuth,
          authenticationPrompt: 'Unlock your After Me vault',
        });

        if (!keyBase64) {
          throw new Error('Vault Key not found. Please re-initialize.');
        }

        cachedVaultKey = Buffer.from(keyBase64, 'base64');
        return cachedVaultKey;
      } finally {
        pendingKeyPromise = null;
      }
    })();

    return pendingKeyPromise;
  }

  /**
   * Restores vault key from iCloud Keychain backup (device migration).
   * Call when isInitialized() is false but user has migrated from another device.
   */
  static async restoreFromCloudKeychain(): Promise<boolean> {
    const backupKey = await KeychainBackupService.getBackupVaultKey();
    if (!backupKey) return false;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return false;

    await SecureStore.setItemAsync(VAULT_KEY_TAG, backupKey, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      requireAuthentication: true,
      authenticationPrompt: 'Unlock your After Me vault',
    });
    return true;
  }

  static async isInitialized(): Promise<boolean> {
    const key = await SecureStore.getItemAsync(VAULT_KEY_TAG, {
      requireAuthentication: false,
    });
    return !!key;
  }

  /**
   * Rotates the vault key using two-phase commit with write-ahead journaling.
   *
   * Phase A (Prepare): writes re-encrypted files as .enc.new alongside originals.
   *   Nothing is overwritten — a crash here is fully recoverable.
   * Phase B (Commit): swaps .enc.new → .enc, promotes the pending key to primary.
   */
  static async rotateKeys(): Promise<void> {
    const oldKey = await this.getVaultKey();
    const newKey = CryptoService.generateKey();

    // Phase A — Prepare: persist the new key so it survives a crash
    await SecureStore.setItemAsync(
      VAULT_KEY_TAG_PENDING,
      newKey.toString('base64'),
      { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK },
    );

    await EncryptedStorageService.initializeVault();
    const fileRefs = await DocumentRepository.getAllFileRefs();

    for (const ref of fileRefs) {
      await EncryptedStorageService.reEncryptFileToStaging(ref, oldKey, newKey);
    }

    await DocumentRepository.reEncryptAllMetadata(oldKey, newKey);

    // Phase B — Commit: swap staged files, promote key
    await EncryptedStorageService.commitStagedFiles(fileRefs);

    const bioPref = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
    const requireAuth = bioPref !== 'false';

    await SecureStore.setItemAsync(VAULT_KEY_TAG, newKey.toString('base64'), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      requireAuthentication: requireAuth,
      authenticationPrompt: 'Unlock your After Me vault',
    });

    await SecureStore.deleteItemAsync(VAULT_KEY_TAG_PENDING);

    const backedUp = await KeychainBackupService.backupVaultKey(newKey.toString('base64'));
    if (!backedUp) {
      captureVaultError(new Error('iCloud Keychain backup skipped after key rotation.'), 'key_management');
    }

    if (cachedVaultKey) cachedVaultKey.fill(0);
    cachedVaultKey = newKey;
  }

  /**
   * Recovers from an interrupted key rotation on app startup.
   * If a pending key exists, the rotation was interrupted — roll back by
   * cleaning up staged .enc.new files and deleting the pending key.
   * The original .enc files and primary vault key remain intact.
   */
  static async recoverFromInterruptedRotation(): Promise<void> {
    const pendingKeyBase64 = await SecureStore.getItemAsync(
      VAULT_KEY_TAG_PENDING,
      { requireAuthentication: false },
    );
    if (!pendingKeyBase64) return;

    await EncryptedStorageService.cleanupStagedFiles();
    await SecureStore.deleteItemAsync(VAULT_KEY_TAG_PENDING);
    captureVaultError(new Error('Recovered from interrupted key rotation — rolled back staged files.'), 'key_management');
  }

  /**
   * Re-stores the vault key with the given biometric protection setting.
   * Must be called while the current key is still accessible (i.e. before
   * the user backgrounds the app if biometric was previously enabled).
   */
  static async setBiometricProtection(enabled: boolean): Promise<void> {
    const key = await this.getVaultKey();
    await SecureStore.deleteItemAsync(VAULT_KEY_TAG);
    await SecureStore.setItemAsync(VAULT_KEY_TAG, key.toString('base64'), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      requireAuthentication: enabled,
      authenticationPrompt: 'Unlock your After Me vault',
    });
    if (cachedVaultKey) cachedVaultKey.fill(0);
    cachedVaultKey = null;
    await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, String(enabled));
  }

  /**
   * Evict the cached key manually (e.g. settings lock-now button).
   */
  static clearCache(): void {
    if (cachedVaultKey) cachedVaultKey.fill(0);
    cachedVaultKey = null;
  }

  /** Alias for clearCache — clears the in-memory session key. */
  static clearSessionKey(): void {
    this.clearCache();
  }

  static async resetKeys(): Promise<void> {
    if (cachedVaultKey) cachedVaultKey.fill(0);
    cachedVaultKey = null;
    await SecureStore.deleteItemAsync(VAULT_KEY_TAG);
    await SecureStore.deleteItemAsync(VAULT_KEY_TAG_PENDING);
    await EncryptedStorageService.cleanupStagedFiles();
    await KeychainBackupService.deleteBackup();
  }
}

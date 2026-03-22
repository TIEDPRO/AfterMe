/**
 * Backup service — cloud encrypted backup (iCloud on iOS, Google Drive on Android).
 * Bridges onboarding preferences with the actual CloudBackupService.
 */
import { OnboardingStorage } from './OnboardingStorage';
import { CloudBackupService } from './CloudBackupService';
import { safeAsync } from '../utils/safeAsync';

export const BackupService = {
  async enableCloudBackup(): Promise<void> {
    await OnboardingStorage.setIcloudBackupEnabled(true);
    await CloudBackupService.setAutoBackupEnabled(true);

    const available = await CloudBackupService.isAvailable();
    if (available) {
      safeAsync(CloudBackupService.backupNow(), 'initialBackup');
    }
  },

  async disableCloudBackup(): Promise<void> {
    await OnboardingStorage.setIcloudBackupEnabled(false);
    await CloudBackupService.setAutoBackupEnabled(false);
  },

  async isCloudBackupEnabled(): Promise<boolean> {
    return OnboardingStorage.isIcloudBackupEnabled();
  },

  async isCloudAvailable(): Promise<boolean> {
    return CloudBackupService.isAvailable();
  },

  async backupNow(): Promise<boolean> {
    return CloudBackupService.backupNow();
  },

  async getLastBackupDate(): Promise<string | null> {
    return CloudBackupService.getLastBackupDate();
  },

  async getBackupInfo(): Promise<{ documentCount: number; createdAt: string } | null> {
    return CloudBackupService.getBackupInfo();
  },

  /** @deprecated Use enableCloudBackup() — kept for backward compatibility */
  async enableIcloudBackup(): Promise<void> {
    return this.enableCloudBackup();
  },
  /** @deprecated Use disableCloudBackup() */
  async disableIcloudBackup(): Promise<void> {
    return this.disableCloudBackup();
  },
  /** @deprecated Use isCloudBackupEnabled() */
  async isIcloudBackupEnabled(): Promise<boolean> {
    return this.isCloudBackupEnabled();
  },
  /** @deprecated Use isCloudAvailable() */
  async isIcloudAvailable(): Promise<boolean> {
    return this.isCloudAvailable();
  },
};

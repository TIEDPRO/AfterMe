import React from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { colors } from '../../../theme/colors';
import { settingsStyles as styles } from '../settingsStyles';
import { CLOUD_PROVIDER_NAME } from '../../../services/CloudBackupService';

interface BackupSectionProps {
  cloudEnabled: boolean;
  cloudAvailable: boolean;
  lastBackupDate: string | null;
  backingUp: boolean;
  restoringBackup: boolean;
  onCloudToggle: (value: boolean) => void;
  onBackupNow: () => void;
  onRestoreFromBackup: () => void;
}

export function BackupSection({
  cloudEnabled,
  cloudAvailable,
  lastBackupDate,
  backingUp,
  restoringBackup,
  onCloudToggle,
  onBackupNow,
  onRestoreFromBackup,
}: BackupSectionProps) {
  const providerName = CLOUD_PROVIDER_NAME;
  const notAvailableHint = Platform.OS === 'ios'
    ? "iCloud is not available. Make sure you're signed in to iCloud in Settings."
    : "Google Drive is not available. Make sure Google Play Services is installed and you're signed in.";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>{providerName} Backup</Text>
      <View style={styles.infoCard}>
        <View style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: cloudEnabled }}>
          <Text style={styles.rowLabel} maxFontSizeMultiplier={1.4}>Auto Backup</Text>
          <Switch
            value={cloudEnabled}
            onValueChange={onCloudToggle}
            trackColor={{ false: colors.border, true: colors.amAmber }}
            thumbColor={cloudEnabled ? colors.amBackground : colors.textMuted}
            accessibilityLabel={`${providerName} Auto Backup`}
          />
        </View>

        {!cloudAvailable && (
          <Text style={styles.backupWarning} maxFontSizeMultiplier={1.4}>
            {notAvailableHint}
          </Text>
        )}

        {lastBackupDate && (
          <Text style={styles.backupDate} maxFontSizeMultiplier={1.4}>
            Last backup: {new Date(lastBackupDate).toLocaleDateString()} at{' '}
            {new Date(lastBackupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        <View style={styles.backupActions}>
          <TouchableOpacity
            style={[styles.backupActionButton, backingUp && styles.integrityButtonDisabled]}
            onPress={onBackupNow}
            disabled={backingUp || !cloudAvailable}
            accessibilityRole="button"
            accessibilityLabel="Back up now"
          >
            {backingUp ? (
              <ActivityIndicator size="small" color={colors.amAmber} />
            ) : (
              <Text style={styles.backupActionText} maxFontSizeMultiplier={1.4}>Back Up Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backupActionButton, restoringBackup && styles.integrityButtonDisabled]}
            onPress={onRestoreFromBackup}
            disabled={restoringBackup || backingUp || !cloudAvailable}
            accessibilityRole="button"
            accessibilityLabel={`Restore from ${providerName} backup`}
          >
            {restoringBackup ? (
              <ActivityIndicator size="small" color={colors.amAmber} />
            ) : (
              <Text style={styles.backupActionText} maxFontSizeMultiplier={1.4}>Restore from Backup</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.rowHint} maxFontSizeMultiplier={1.4}>
          Backups are encrypted with your vault key. {Platform.OS === 'ios' ? 'Apple' : 'Google'} cannot read them.
        </Text>
      </View>
    </View>
  );
}

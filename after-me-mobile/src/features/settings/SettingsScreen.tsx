import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheDirectory, writeAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';
import { KeyManager } from '../../core/auth/KeyManager';
import { OnboardingStorage } from '../../services/OnboardingStorage';
import { DocumentService } from '../../services/DocumentService';
import { BackupService } from '../../services/BackupService';
import { CloudBackupService, CLOUD_PROVIDER_NAME } from '../../services/CloudBackupService';
import { KitHistoryService, type FreshnessLevel } from '../../services/KitHistoryService';
import { KitCreationWizard } from '../familykit/KitCreationWizard';
import { KitHistoryScreen } from '../familykit/KitHistoryScreen';
import { PaywallScreen, type PaywallTrigger } from '../paywall/PaywallScreen';
import { PersonalRecoveryWizard } from '../recovery/PersonalRecoveryWizard';
import { VaultSwitcherScreen } from '../vault/VaultSwitcherScreen';
import { HelpScreen } from '../help/HelpScreen';
import { useApp } from '../../context/AppContext';
import { usePurchase } from '../../context/PurchaseContext';
import { colors } from '../../theme/colors';

import { SecuritySection } from './sections/SecuritySection';
import { SubscriptionSection } from './sections/SubscriptionSection';
import { BackupSection } from './sections/BackupSection';
import { FamilyKitSection } from './sections/FamilyKitSection';
import { VaultSection } from './sections/VaultSection';
import { HelpSection } from './sections/HelpSection';
import { DeveloperSection } from './sections/DeveloperSection';
import { settingsStyles as styles } from './settingsStyles';

const BIOMETRIC_PREF_KEY = 'afterme_biometric_enabled';

export function SettingsScreen() {
  const { refreshInit, setShowPhase1, totalDocuments } = useApp();
  const { isPremium, isAnnual, isLifetime, restorePurchases: restorePurchasesFn } = usePurchase();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [vaultSizeBytes, setVaultSizeBytes] = useState<number>(0);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [corruptedIds, setCorruptedIds] = useState<string[] | null>(null);
  const [showKitWizard, setShowKitWizard] = useState(false);
  const [showKitHistory, setShowKitHistory] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger>('settings');

  const openPaywall = (trigger: PaywallTrigger = 'settings') => {
    setPaywallTrigger(trigger);
    setShowPaywall(true);
  };
  const [kitFreshness, setKitFreshness] = useState<FreshnessLevel | null>(null);
  const [kitWarning, setKitWarning] = useState<string | null>(null);
  const [icloudEnabled, setIcloudEnabled] = useState(false);
  const [icloudAvailable, setIcloudAvailable] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [showRecoveryWizard, setShowRecoveryWizard] = useState(false);
  const [showVaultSwitcher, setShowVaultSwitcher] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(BIOMETRIC_PREF_KEY).then((val) => {
      if (val !== null) setBiometricEnabled(val === 'true');
    });
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    try {
      await KeyManager.setBiometricProtection(value);
      setBiometricEnabled(value);
    } catch {
      Alert.alert('Error', 'Could not change biometric setting. Please try again.');
    }
  };

  const refreshVaultSize = useCallback(async () => {
    try {
      const size = await DocumentService.getVaultSizeBytes();
      setVaultSizeBytes(size);
    } catch {
      setVaultSizeBytes(0);
    }
  }, []);

  useEffect(() => {
    refreshVaultSize();
  }, [refreshVaultSize, totalDocuments]);

  const refreshKitStatus = useCallback(async () => {
    try {
      const [freshness, warning] = await Promise.all([
        KitHistoryService.getFreshnessScore(),
        KitHistoryService.getStaleKitWarning(),
      ]);
      setKitFreshness(freshness.level);
      setKitWarning(warning);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshKitStatus();
  }, [refreshKitStatus, totalDocuments]);

  const refreshBackupStatus = useCallback(async () => {
    try {
      const [enabled, available, lastDate] = await Promise.all([
        BackupService.isCloudBackupEnabled(),
        BackupService.isCloudAvailable(),
        BackupService.getLastBackupDate(),
      ]);
      setIcloudEnabled(enabled);
      setIcloudAvailable(available);
      setLastBackupDate(lastDate);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshBackupStatus();
  }, [refreshBackupStatus]);

  const handleCloudToggle = async (value: boolean) => {
    const previous = icloudEnabled;
    setIcloudEnabled(value);
    try {
      if (value) {
        await BackupService.enableCloudBackup();
      } else {
        await BackupService.disableCloudBackup();
      }
    } catch (e) {
      setIcloudEnabled(previous);
      Alert.alert(
        'Error',
        (e as Error).message ?? `Could not update ${CLOUD_PROVIDER_NAME} backup. Please try again.`,
      );
    }
  };

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const success = await BackupService.backupNow();
      if (success) {
        Alert.alert('Backup Complete', `Your vault has been backed up to ${CLOUD_PROVIDER_NAME}.`);
        await refreshBackupStatus();
      } else {
        Alert.alert('Backup Failed', `Could not back up to ${CLOUD_PROVIDER_NAME}. Make sure you're signed in.`);
      }
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFromBackup = () => {
    Alert.alert(
      `Restore from ${CLOUD_PROVIDER_NAME}`,
      `This will restore documents from your latest ${CLOUD_PROVIDER_NAME} backup. Existing documents will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setRestoringBackup(true);
            try {
              const result = await CloudBackupService.restore();
              if (result.success) {
                Alert.alert('Restored', `Successfully restored ${result.documentCount} document(s) from ${CLOUD_PROVIDER_NAME}.`);
                refreshInit();
              } else {
                Alert.alert('Restore Failed', `Could not restore from ${CLOUD_PROVIDER_NAME}. No backup found or decryption failed.`);
              }
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            } finally {
              setRestoringBackup(false);
            }
          },
        },
      ],
    );
  };

  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    try {
      const restored = await restorePurchasesFn();
      if (restored) {
        Alert.alert('Restored', 'Your premium access has been restored.');
      } else {
        Alert.alert('No Purchases Found', "We couldn't find any previous purchases for this account.");
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoringPurchases(false);
    }
  };

  const handleCheckIntegrity = async () => {
    setIntegrityLoading(true);
    setCorruptedIds(null);
    try {
      const ids = await DocumentService.findCorruptedDocuments();
      setCorruptedIds(ids);
      if (ids.length === 0) {
        Alert.alert('Integrity Check', 'All documents are intact.');
      } else {
        Alert.alert(
          'Integrity Check',
          `Found ${ids.length} corrupted document(s):\n\n${ids.join('\n')}`,
        );
      }
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const PLACEHOLDER_PNG =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

  const handleSeedTestDocuments = async () => {
    setLoading(true);
    try {
      const tmpPath = `${cacheDirectory}afterme_seed_doc.png`;
      await writeAsStringAsync(tmpPath, PLACEHOLDER_PNG, {
        encoding: EncodingType.Base64,
      });

      const testDocs: { category: 'identity' | 'legal' | 'finance' | 'medical' | 'property' | 'insurance'; title: string }[] = [
        { category: 'identity', title: 'Passport (Test)' },
        { category: 'legal', title: 'Last Will & Testament (Test)' },
        { category: 'finance', title: 'Bank Statement (Test)' },
        { category: 'medical', title: 'Medical Records (Test)' },
        { category: 'property', title: 'Title Deed (Test)' },
        { category: 'insurance', title: 'Life Insurance Policy (Test)' },
      ];

      for (const doc of testDocs) {
        await DocumentService.importFromFilePath(tmpPath, doc.category, doc.title, { format: 'png' });
      }

      await deleteAsync(tmpPath, { idempotent: true });
      Alert.alert('Done', `${testDocs.length} test documents added to the vault.`);
    } catch (e) {
      Alert.alert('Seed Failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetVault = () => {
    Alert.alert(
      'Reset Vault & Onboarding',
      'This will clear keys and onboarding state. You will see the full onboarding flow again. Encrypted documents will become unreadable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await OnboardingStorage.resetOnboarding();
              await KeyManager.resetKeys();
              await refreshInit();
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SecuritySection
        biometricEnabled={biometricEnabled}
        onBiometricToggle={handleBiometricToggle}
      />

      <SubscriptionSection
        isPremium={isPremium}
        isAnnual={isAnnual}
        isLifetime={isLifetime}
        restoringPurchases={restoringPurchases}
        onUpgrade={() => openPaywall('settings')}
        onLifetimeUpgrade={() => openPaywall('upgrade')}
        onRestorePurchases={handleRestorePurchases}
      />

      <BackupSection
        cloudEnabled={icloudEnabled}
        cloudAvailable={icloudAvailable}
        lastBackupDate={lastBackupDate}
        backingUp={backingUp}
        restoringBackup={restoringBackup}
        onCloudToggle={handleCloudToggle}
        onBackupNow={handleBackupNow}
        onRestoreFromBackup={handleRestoreFromBackup}
      />

      <VaultSection
        vaultSizeBytes={vaultSizeBytes}
        totalDocuments={totalDocuments}
        integrityLoading={integrityLoading}
        corruptedIds={corruptedIds}
        onCheckIntegrity={handleCheckIntegrity}
        onOpenVaultSwitcher={() => setShowVaultSwitcher(true)}
        onOpenRecoveryWizard={() => setShowRecoveryWizard(true)}
      />

      <FamilyKitSection
        isPremium={isPremium}
        kitFreshness={kitFreshness}
        kitWarning={kitWarning}
        onCreateKit={() => setShowKitWizard(true)}
        onViewHistory={() => setShowKitHistory(true)}
        onShowPaywall={() => openPaywall('family_kit')}
      />

      <HelpSection onShowHelp={() => setShowHelp(true)} />

      <DeveloperSection
        loading={loading}
        onShowPhase1={() => setShowPhase1(true)}
        onSeedTestDocuments={handleSeedTestDocuments}
        onResetVault={handleResetVault}
      />

      {/* Modals */}
      <KitCreationWizard
        visible={showKitWizard}
        onDismiss={() => {
          setShowKitWizard(false);
          refreshKitStatus();
        }}
      />

      {showKitHistory && (
        <Modal animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: colors.amBackground }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.amWhite }}>Kit History</Text>
              <TouchableOpacity onPress={() => setShowKitHistory(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 16, color: colors.amAmber }}>Done</Text>
              </TouchableOpacity>
            </View>
            <KitHistoryScreen
              onCreateKit={() => {
                setShowKitHistory(false);
                setShowKitWizard(true);
              }}
              onBack={() => setShowKitHistory(false)}
            />
          </View>
        </Modal>
      )}

      <PaywallScreen
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        trigger={paywallTrigger}
      />

      <PersonalRecoveryWizard
        visible={showRecoveryWizard}
        onDismiss={() => setShowRecoveryWizard(false)}
      />

      {showVaultSwitcher && (
        <Modal animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: colors.amBackground }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.amWhite }}>Vault Manager</Text>
              <TouchableOpacity onPress={() => setShowVaultSwitcher(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 16, color: colors.amAmber }}>Done</Text>
              </TouchableOpacity>
            </View>
            <VaultSwitcherScreen />
          </View>
        </Modal>
      )}

      {showHelp && (
        <Modal animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: colors.amBackground }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.amWhite }}>Help & FAQ</Text>
              <TouchableOpacity onPress={() => setShowHelp(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 16, color: colors.amAmber }}>Done</Text>
              </TouchableOpacity>
            </View>
            <HelpScreen />
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

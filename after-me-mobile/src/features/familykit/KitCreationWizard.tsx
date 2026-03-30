/**
 * Family Kit Creation Wizard — multi-step flow:
 * 1. Introduction & overview
 * 2. Owner name + emergency contact
 * 3. Generating kit (progress)
 * 4. Validating kit
 * 5. QR code display + Key Card
 * 6. Share/print/distribute options
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { shareAsync } from 'expo-sharing';
import { FamilyKitExportService, type KitGenerationResult } from '../../services/FamilyKitExportService';
import { PdfExportService } from '../../services/PdfExportService';
import { KitHistoryService } from '../../services/KitHistoryService';
import { useApp } from '../../context/AppContext';
import { usePurchase } from '../../context/PurchaseContext';
import { PaywallScreen } from '../paywall/PaywallScreen';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

type WizardStep = 'intro' | 'details' | 'generating' | 'validating' | 'complete' | 'distribute' | 'handoff';

interface KitCreationWizardProps {
  visible: boolean;
  onDismiss: () => void;
}

const QR_SIZE = 220;
const QR_QUIET_ZONE = 4;

export function KitCreationWizard({ visible, onDismiss }: KitCreationWizardProps) {
  const insets = useSafeAreaInsets();
  const { totalDocuments } = useApp();
  const { isPremium } = usePurchase();
  const [step, setStep] = useState<WizardStep>('intro');
  const [ownerName, setOwnerName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [result, setResult] = useState<KitGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [qrDataUri, setQrDataUri] = useState<string>('');
  const [handoffChecks, setHandoffChecks] = useState([false, false, false, false]);
  const qrRef = useRef<ViewShot>(null);

  const shouldBlockEmpty = visible && totalDocuments === 0;
  const showPaywall = visible && !isPremium;

  useEffect(() => {
    if (shouldBlockEmpty) {
      onDismiss();
      Alert.alert(
        'Add documents first',
        'Your Family Kit is an encrypted snapshot of your vault. Add at least one document before generating your kit.\n\nYou can find your kit creation option here once you have added some documents.',
        [{ text: 'OK' }],
      );
    }
  }, [shouldBlockEmpty, onDismiss]);

  const reset = useCallback(() => {
    setStep('intro');
    setOwnerName('');
    setEmergencyContact('');
    setResult(null);
    setError(null);
    setProgress({ current: 0, total: 0 });
    setQrDataUri('');
    setHandoffChecks([false, false, false, false]);
  }, []);

  const handleDismiss = useCallback(() => {
    reset();
    onDismiss();
  }, [reset, onDismiss]);

  const handleGenerate = useCallback(async () => {
    setStep('generating');
    setError(null);
    setProgress({ current: 0, total: 0 });
    try {
      const kitResult = await FamilyKitExportService.generateKit(
        ownerName.trim() || null,
        emergencyContact.trim() || null,
        (current, total) => setProgress({ current, total }),
      );

      setStep('validating');
      const valid = await FamilyKitExportService.validateKit(kitResult.filePath, kitResult.accessKey);
      if (!valid) {
        throw new Error('Kit validation failed. The generated file could not be verified. Please try again.');
      }

      setResult(kitResult);
      setStep('complete');
    } catch (e) {
      setError((e as Error).message);
      setStep('details');
    }
  }, [ownerName, emergencyContact]);

  const captureQrAsDataUri = useCallback(async (): Promise<string> => {
    if (qrDataUri) return qrDataUri;
    try {
      const uri = await captureRef(qrRef, { format: 'png', quality: 1.0 });
      const { readAsStringAsync, EncodingType: FsEnc } = await import('expo-file-system/legacy');
      const b64 = await readAsStringAsync(uri, { encoding: FsEnc.Base64 });
      const dataUri = `data:image/png;base64,${b64}`;
      setQrDataUri(dataUri);
      return dataUri;
    } catch {
      return '';
    }
  }, [qrDataUri]);

  const handleShareFile = useCallback(async () => {
    if (!result) return;
    try {
      await shareAsync(result.filePath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Share Family Kit (.afterme file)',
      });
      await KitHistoryService.recordDistribution({
        kitVersion: result.kitVersion,
        recipientLabel: 'Shared digitally',
        method: 'digital',
      });
    } catch (e) {
      Alert.alert('Share Failed', (e as Error).message);
    }
  }, [result]);

  const handlePrintPdf = useCallback(async () => {
    if (!result) return;
    try {
      const dataUri = await captureQrAsDataUri();
      await PdfExportService.shareKitPdf({
        accessKey: result.accessKey,
        ownerName: ownerName.trim() || null,
        documentCount: result.documentCount,
        kitVersion: result.kitVersion,
        qrDataUri: dataUri,
      });
      await KitHistoryService.recordDistribution({
        kitVersion: result.kitVersion,
        recipientLabel: 'Printed PDF',
        method: 'print',
      });
    } catch (e) {
      Alert.alert('PDF Generation Failed', (e as Error).message);
    }
  }, [result, ownerName, captureQrAsDataUri]);

  const handleSaveKeyCard = useCallback(async () => {
    if (!result) return;
    try {
      const uri = await captureRef(qrRef, { format: 'png', quality: 1.0 });
      await shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Save Key Card Image',
      });
    } catch (e) {
      Alert.alert('Save Failed', (e as Error).message);
    }
  }, [result]);

  const handleDistribute = useCallback(() => {
    setStep('distribute');
  }, []);

  const renderIntro = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepIndicator} maxFontSizeMultiplier={3.0} accessibilityRole="text">Step 1 of 5</Text>
      <Text style={styles.heading} maxFontSizeMultiplier={3.0} accessibilityRole="header">Create Your Family Kit</Text>
      <Text style={styles.body} maxFontSizeMultiplier={3.0}>
        A Family Kit is a secure, encrypted snapshot of your entire vault at the time you generate it
        — every document you have stored. Your loved ones can open it after you&apos;re gone (or whenever
        you plan for) using the QR card and file together.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle} maxFontSizeMultiplier={3.0}>What&apos;s Inside a Kit?</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📦</Text>
          <Text style={styles.infoText} maxFontSizeMultiplier={3.0}>
            An encrypted vault file (.afterme) containing your whole vault as it exists when you create the kit
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🔑</Text>
          <Text style={styles.infoText} maxFontSizeMultiplier={3.0}>
            A unique QR code access key (the only way to unlock the file)
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📄</Text>
          <Text style={styles.infoText} maxFontSizeMultiplier={3.0}>
            A printable PDF with instructions, the QR code, and storage tips
          </Text>
        </View>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle} maxFontSizeMultiplier={3.0}>Important</Text>
        <Text style={styles.warningBody} maxFontSizeMultiplier={3.0}>
          Store the QR code and the vault file in separate secure locations.
          Anyone with both can access your entire vault.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => setStep('details')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Continue to next step"
      >
        <Text style={styles.primaryBtnText} maxFontSizeMultiplier={3.0}>Get Started</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderDetails = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepIndicator} maxFontSizeMultiplier={3.0} accessibilityRole="text">Step 2 of 5</Text>
      <Text style={styles.heading} maxFontSizeMultiplier={3.0} accessibilityRole="header">Personalise Your Kit</Text>
      <Text style={styles.body} maxFontSizeMultiplier={3.0}>
        These details appear on the printed cover sheet and inside the README, helping
        your survivors identify the kit and know who to contact.
      </Text>

      {error && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText} maxFontSizeMultiplier={3.0}>{error}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label} maxFontSizeMultiplier={3.0}>Your Name (optional)</Text>
        <TextInput
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="e.g. John Smith"
          placeholderTextColor={colors.textMuted}
          maxFontSizeMultiplier={3.0}
          accessibilityLabel="Owner name"
        />
        <Text style={styles.hint} maxFontSizeMultiplier={3.0}>
          Appears on the cover sheet so survivors know whose kit it is.
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label} maxFontSizeMultiplier={3.0}>Emergency Contact (optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder="e.g. Jane Smith — 0412 345 678 — Solicitor at Smith & Co"
          placeholderTextColor={colors.textMuted}
          multiline
          maxFontSizeMultiplier={3.0}
          accessibilityLabel="Emergency contact"
        />
        <Text style={styles.hint} maxFontSizeMultiplier={3.0}>
          Included in the README.txt inside the .afterme file.
        </Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setStep('intro')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.secondaryBtnText} maxFontSizeMultiplier={3.0}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, { flex: 1, marginLeft: 12 }]}
          onPress={handleGenerate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Generate Family Kit"
        >
          <Text style={styles.primaryBtnText} maxFontSizeMultiplier={3.0}>Generate Kit</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderGenerating = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={colors.amAmber} />
      <Text style={styles.heading} maxFontSizeMultiplier={3.0}>Generating Your Kit</Text>
      <Text style={styles.body} maxFontSizeMultiplier={3.0}>
        Encrypting vault contents with a unique access key...{'\n'}
        This may take a moment depending on your vault size.
      </Text>
      {progress.total > 0 && (
        <Text style={styles.progressText} maxFontSizeMultiplier={3.0}>
          Processing document {progress.current} of {progress.total}…
        </Text>
      )}
    </View>
  );

  const renderValidating = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={colors.success} />
      <Text style={styles.heading} maxFontSizeMultiplier={3.0}>Verifying Kit Integrity</Text>
      <Text style={styles.body} maxFontSizeMultiplier={3.0}>
        Decrypting the generated file to confirm it can be opened...
      </Text>
    </View>
  );

  const renderComplete = () => {
    if (!result) return null;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepIndicator} maxFontSizeMultiplier={3.0} accessibilityRole="text">Step 3 of 5</Text>
        <View style={styles.successBanner} accessibilityRole="alert">
          <Text style={styles.successIcon} accessible={false}>✅</Text>
          <Text style={styles.successText} maxFontSizeMultiplier={3.0}>
            Kit Created & Verified
          </Text>
        </View>

        <Text style={styles.heading} maxFontSizeMultiplier={3.0} accessibilityRole="header">Your Access Key</Text>
        <Text style={styles.body} maxFontSizeMultiplier={3.0}>
          This QR code is the only way to unlock your Family Kit. Without it, the encrypted
          vault file cannot be decrypted by anyone — not even us.
        </Text>

        <ViewShot ref={qrRef} options={{ format: 'png', quality: 1.0 }}>
          <View style={styles.qrCard}>
            <Text style={styles.qrLabel} maxFontSizeMultiplier={3.0}>FAMILY KIT ACCESS KEY</Text>
            <QRCode
              value={result.accessKey}
              size={QR_SIZE}
              color="#2D3142"
              backgroundColor="#FFFFFF"
              ecl="H"
              quietZone={QR_QUIET_ZONE}
            />
            <View style={styles.qrMeta}>
              <Text style={styles.qrMetaText} maxFontSizeMultiplier={3.0}>
                Version {result.kitVersion} · {result.documentCount} documents · {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </ViewShot>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle} maxFontSizeMultiplier={3.0}>Never share both together</Text>
          <Text style={styles.warningBody} maxFontSizeMultiplier={3.0}>
            The QR code and the vault file should be stored in different locations.
            Anyone with both can access all your documents.
          </Text>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleSaveKeyCard}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Save QR code as image"
          >
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionLabel} maxFontSizeMultiplier={3.0}>Save Key Card</Text>
            <Text style={styles.actionHint} maxFontSizeMultiplier={3.0}>Save QR as image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleShareFile}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Share the .afterme file"
          >
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionLabel} maxFontSizeMultiplier={3.0}>Share Vault File</Text>
            <Text style={styles.actionHint} maxFontSizeMultiplier={3.0}>Send the encrypted file</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handlePrintPdf}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Generate printable PDF"
          >
            <Text style={styles.actionIcon}>🖨️</Text>
            <Text style={styles.actionLabel} maxFontSizeMultiplier={3.0}>Print PDF</Text>
            <Text style={styles.actionHint} maxFontSizeMultiplier={3.0}>Full instructions + QR</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 8 }]}
          onPress={handleDistribute}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue to distribution"
        >
          <Text style={styles.primaryBtnText} maxFontSizeMultiplier={3.0}>Next: Distribution Tips</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderDistribute = () => {
    if (!result) return null;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepIndicator} maxFontSizeMultiplier={3.0} accessibilityRole="text">Step 4 of 5</Text>
        <Text style={styles.heading} maxFontSizeMultiplier={3.0} accessibilityRole="header">Distribute Your Kit</Text>
        <Text style={styles.body} maxFontSizeMultiplier={3.0}>
          For the best protection, make sure your loved ones can actually find and use
          the kit when they need it. Here are our recommendations:
        </Text>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🏦</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={3.0}>Safety Deposit Box</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={3.0}>
              Store the printed QR code in a safety deposit box. Give the box key
              or access instructions to your executor or trusted family member.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>⚖️</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={3.0}>Solicitor / Attorney</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={3.0}>
              Include the Family Kit instructions with your will or estate plan.
              Your solicitor can hold a copy of the QR code securely.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💾</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={3.0}>USB Drive + Cloud</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={3.0}>
              Save the encrypted vault file on a USB drive and/or a trusted
              cloud service. The file is useless without the QR code key.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>👨‍👩‍👧</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={3.0}>Tell Trusted People</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={3.0}>
              Make sure at least one trusted person knows the kit exists and
              where to find the QR code and the file.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🔄</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={3.0}>Keep It Updated</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={3.0}>
              Whenever you add or update documents in your vault, regenerate the
              Family Kit. The app will remind you when your kit becomes stale.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 8 }]}
          onPress={() => setStep('handoff')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue to final confirmation"
        >
          <Text style={styles.primaryBtnText} maxFontSizeMultiplier={3.0}>Next: Confirm Handoff</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderHandoff = () => {
    const CHECKS = [
      {
        icon: '📤',
        title: 'The encrypted vault file has been sent or stored',
        detail: 'Emailed to a trusted person, saved to a shared folder (iCloud, Google Drive), or copied to a USB drive they can access.',
      },
      {
        icon: '👤',
        title: 'At least one person knows this file exists',
        detail: 'They know where to find it, and know to download the After Me app when the time comes.',
      },
      {
        icon: '🖨️',
        title: 'The QR code is stored separately from the file',
        detail: 'Printed and in a safe, with a solicitor, or in a different cloud location. Anyone who finds both can open the vault.',
      },
      {
        icon: '⚖️',
        title: 'Your executor or solicitor is aware',
        detail: 'They know about the vault and where both pieces (file + QR code) can be found.',
      },
    ];

    const allChecked = handoffChecks.every(Boolean);
    const uncheckedCount = handoffChecks.filter((c) => !c).length;

    const toggleCheck = (i: number) => {
      setHandoffChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
    };

    const handleDone = () => {
      if (!allChecked) {
        Alert.alert(
          `${uncheckedCount} item${uncheckedCount > 1 ? 's' : ''} not confirmed`,
          'Your family may not be able to access the vault if these steps aren\'t completed. Are you sure you want to close?',
          [
            { text: 'Go Back', style: 'cancel' },
            { text: 'Close Anyway', style: 'destructive', onPress: handleDismiss },
          ],
        );
      } else {
        handleDismiss();
      }
    };

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepIndicator} maxFontSizeMultiplier={3.0} accessibilityRole="text">Step 5 of 5</Text>
        <Text style={styles.heading} maxFontSizeMultiplier={3.0} accessibilityRole="header">
          Before You Close
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={3.0}>
          Your kit is ready — but it only works if your family can actually find it.
          Confirm each item below before you close.
        </Text>

        {!allChecked && (
          <View style={styles.handoffWarning}>
            <Text style={styles.handoffWarningIcon}>⚠️</Text>
            <Text style={styles.handoffWarningText} maxFontSizeMultiplier={3.0}>
              {uncheckedCount} item{uncheckedCount > 1 ? 's' : ''} still to confirm.
              Your family may not be able to open the vault without these steps.
            </Text>
          </View>
        )}

        {CHECKS.map((check, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.checkRow, handoffChecks[i] && styles.checkRowChecked]}
            onPress={() => toggleCheck(i)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: handoffChecks[i] }}
            accessibilityLabel={check.title}
          >
            <View style={[styles.checkbox, handoffChecks[i] && styles.checkboxChecked]}>
              {handoffChecks[i] && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <View style={styles.checkContent}>
              <View style={styles.checkHeader}>
                <Text style={styles.checkIcon}>{check.icon}</Text>
                <Text
                  style={[styles.checkTitle, handoffChecks[i] && styles.checkTitleDone]}
                  maxFontSizeMultiplier={3.0}
                >
                  {check.title}
                </Text>
              </View>
              <Text style={styles.checkDetail} maxFontSizeMultiplier={3.0}>
                {check.detail}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {allChecked && (
          <View style={styles.handoffSuccess}>
            <Text style={styles.handoffSuccessIcon}>✅</Text>
            <Text style={styles.handoffSuccessText} maxFontSizeMultiplier={3.0}>
              All confirmed. Your family is prepared.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 16 }, !allChecked && styles.primaryBtnWarning]}
          onPress={handleDone}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={allChecked ? 'Close wizard' : 'Close without completing all items'}
        >
          <Text style={styles.primaryBtnText} maxFontSizeMultiplier={3.0}>
            {allChecked ? 'Done — Kit is Ready' : 'Close (items incomplete)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 'intro': return renderIntro();
      case 'details': return renderDetails();
      case 'generating': return renderGenerating();
      case 'validating': return renderValidating();
      case 'complete': return renderComplete();
      case 'distribute': return renderDistribute();
      case 'handoff': return renderHandoff();
    }
  };

  if (shouldBlockEmpty) return null;

  // Premium gate: show paywall inline rather than requiring callers to guard.
  // When the user purchases inside the paywall, isPremium updates immediately
  // via PurchaseContext and the wizard renders on the next render cycle.
  if (showPaywall) {
    return (
      <PaywallScreen
        visible={showPaywall}
        onDismiss={onDismiss}
        trigger="family_kit"
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close wizard"
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText} maxFontSizeMultiplier={3.0}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={3.0}>Family Kit</Text>
          <View style={{ width: 44 }} />
        </View>
        {renderStepContent()}
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  progressText: {
    fontSize: 14,
    color: colors.amAmber,
    marginTop: 12,
    fontWeight: '500',
  },
  stepIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.amAmber,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
    marginBottom: 12,
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: colors.amCard,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: 'rgba(201,150,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,150,58,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.amAmber,
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.amCard,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: colors.amWhite,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.amAmber,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.amBackground,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  errorBanner: {
    backgroundColor: 'rgba(226,75,74,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226,75,74,0.3)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.amDanger,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  successText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#2D3142',
    marginBottom: 16,
  },
  qrMeta: {
    marginTop: 16,
    alignItems: 'center',
  },
  qrMetaText: {
    fontSize: 11,
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 58) / 3,
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.amWhite,
    textAlign: 'center',
  },
  actionHint: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 28,
    marginRight: 14,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  // Handoff checklist
  handoffWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(224,83,83,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,83,83,0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  handoffWarningIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  handoffWarningText: {
    flex: 1,
    fontSize: 13,
    color: colors.amDanger,
    lineHeight: 19,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.amCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  checkRowChecked: {
    borderColor: colors.success,
    backgroundColor: 'rgba(63,207,132,0.07)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkContent: {
    flex: 1,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkIcon: {
    fontSize: 18,
  },
  checkTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.amWhite,
    lineHeight: 20,
  },
  checkTitleDone: {
    color: colors.success,
  },
  checkDetail: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  handoffSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(63,207,132,0.10)',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  handoffSuccessIcon: {
    fontSize: 22,
  },
  handoffSuccessText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  primaryBtnWarning: {
    backgroundColor: '#6b6340',
  },
});

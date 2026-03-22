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
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

type WizardStep = 'intro' | 'details' | 'generating' | 'validating' | 'complete' | 'distribute';

interface KitCreationWizardProps {
  visible: boolean;
  onDismiss: () => void;
}

const QR_SIZE = 220;
const QR_QUIET_ZONE = 4;

export function KitCreationWizard({ visible, onDismiss }: KitCreationWizardProps) {
  const insets = useSafeAreaInsets();
  const { totalDocuments } = useApp();
  const [step, setStep] = useState<WizardStep>('intro');
  const [ownerName, setOwnerName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [result, setResult] = useState<KitGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [qrDataUri, setQrDataUri] = useState<string>('');
  const qrRef = useRef<ViewShot>(null);

  const shouldBlockEmpty = visible && totalDocuments === 0;

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
      <Text style={styles.stepIndicator} maxFontSizeMultiplier={1.4} accessibilityRole="text">Step 1 of 4</Text>
      <Text style={styles.heading} maxFontSizeMultiplier={1.4} accessibilityRole="header">Create Your Family Kit</Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.4}>
        A Family Kit is a secure, encrypted package of your vault contents that your
        loved ones can open after you&apos;re gone — or whenever they need it.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle} maxFontSizeMultiplier={1.4}>What&apos;s Inside a Kit?</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📦</Text>
          <Text style={styles.infoText} maxFontSizeMultiplier={1.4}>
            An encrypted .afterme file with all your vault documents
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🔑</Text>
          <Text style={styles.infoText} maxFontSizeMultiplier={1.4}>
            A unique QR code access key (the only way to unlock the file)
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📄</Text>
          <Text style={styles.infoText} maxFontSizeMultiplier={1.4}>
            A printable PDF with instructions, the QR code, and storage tips
          </Text>
        </View>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle} maxFontSizeMultiplier={1.4}>Important</Text>
        <Text style={styles.warningBody} maxFontSizeMultiplier={1.4}>
          Store the QR code and the .afterme file in separate secure locations.
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
        <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.4}>Get Started</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderDetails = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepIndicator} maxFontSizeMultiplier={1.4} accessibilityRole="text">Step 2 of 4</Text>
      <Text style={styles.heading} maxFontSizeMultiplier={1.4} accessibilityRole="header">Personalise Your Kit</Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.4}>
        These details appear on the printed cover sheet and inside the README, helping
        your survivors identify the kit and know who to contact.
      </Text>

      {error && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>{error}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label} maxFontSizeMultiplier={1.4}>Your Name (optional)</Text>
        <TextInput
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="e.g. John Smith"
          placeholderTextColor={colors.textMuted}
          maxFontSizeMultiplier={1.4}
          accessibilityLabel="Owner name"
        />
        <Text style={styles.hint} maxFontSizeMultiplier={1.4}>
          Appears on the cover sheet so survivors know whose kit it is.
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label} maxFontSizeMultiplier={1.4}>Emergency Contact (optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder="e.g. Jane Smith — 0412 345 678 — Solicitor at Smith & Co"
          placeholderTextColor={colors.textMuted}
          multiline
          maxFontSizeMultiplier={1.4}
          accessibilityLabel="Emergency contact"
        />
        <Text style={styles.hint} maxFontSizeMultiplier={1.4}>
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
          <Text style={styles.secondaryBtnText} maxFontSizeMultiplier={1.4}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, { flex: 1, marginLeft: 12 }]}
          onPress={handleGenerate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Generate Family Kit"
        >
          <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.4}>Generate Kit</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderGenerating = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={colors.amAmber} />
      <Text style={styles.heading} maxFontSizeMultiplier={1.4}>Generating Your Kit</Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.4}>
        Encrypting vault contents with a unique access key...{'\n'}
        This may take a moment depending on your vault size.
      </Text>
      {progress.total > 0 && (
        <Text style={styles.progressText} maxFontSizeMultiplier={1.4}>
          Processing document {progress.current} of {progress.total}…
        </Text>
      )}
    </View>
  );

  const renderValidating = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={colors.success} />
      <Text style={styles.heading} maxFontSizeMultiplier={1.4}>Verifying Kit Integrity</Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.4}>
        Decrypting the generated file to confirm it can be opened...
      </Text>
    </View>
  );

  const renderComplete = () => {
    if (!result) return null;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepIndicator} maxFontSizeMultiplier={1.4} accessibilityRole="text">Step 3 of 4</Text>
        <View style={styles.successBanner} accessibilityRole="alert">
          <Text style={styles.successIcon} accessible={false}>✅</Text>
          <Text style={styles.successText} maxFontSizeMultiplier={1.4}>
            Kit Created & Verified
          </Text>
        </View>

        <Text style={styles.heading} maxFontSizeMultiplier={1.4} accessibilityRole="header">Your Access Key</Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.4}>
          This QR code is the only way to unlock your Family Kit. Without it, the .afterme
          file cannot be decrypted by anyone — not even us.
        </Text>

        <ViewShot ref={qrRef} options={{ format: 'png', quality: 1.0 }}>
          <View style={styles.qrCard}>
            <Text style={styles.qrLabel} maxFontSizeMultiplier={1.4}>FAMILY KIT ACCESS KEY</Text>
            <QRCode
              value={result.accessKey}
              size={QR_SIZE}
              color="#2D3142"
              backgroundColor="#FFFFFF"
              ecl="H"
              quietZone={QR_QUIET_ZONE}
            />
            <View style={styles.qrMeta}>
              <Text style={styles.qrMetaText} maxFontSizeMultiplier={1.4}>
                Version {result.kitVersion} · {result.documentCount} documents · {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </ViewShot>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle} maxFontSizeMultiplier={1.4}>Never share both together</Text>
          <Text style={styles.warningBody} maxFontSizeMultiplier={1.4}>
            The QR code and the .afterme file should be stored in different locations.
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
            <Text style={styles.actionLabel} maxFontSizeMultiplier={1.4}>Save Key Card</Text>
            <Text style={styles.actionHint} maxFontSizeMultiplier={1.4}>Save QR as image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleShareFile}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Share the .afterme file"
          >
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionLabel} maxFontSizeMultiplier={1.4}>Share .afterme</Text>
            <Text style={styles.actionHint} maxFontSizeMultiplier={1.4}>Send the encrypted file</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handlePrintPdf}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Generate printable PDF"
          >
            <Text style={styles.actionIcon}>🖨️</Text>
            <Text style={styles.actionLabel} maxFontSizeMultiplier={1.4}>Print PDF</Text>
            <Text style={styles.actionHint} maxFontSizeMultiplier={1.4}>Full instructions + QR</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 8 }]}
          onPress={handleDistribute}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue to distribution"
        >
          <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.4}>Next: Distribution Tips</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderDistribute = () => {
    if (!result) return null;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepIndicator} maxFontSizeMultiplier={1.4} accessibilityRole="text">Step 4 of 4</Text>
        <Text style={styles.heading} maxFontSizeMultiplier={1.4} accessibilityRole="header">Distribute Your Kit</Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.4}>
          For the best protection, make sure your loved ones can actually find and use
          the kit when they need it. Here are our recommendations:
        </Text>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🏦</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={1.4}>Safety Deposit Box</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={1.4}>
              Store the printed QR code in a safety deposit box. Give the box key
              or access instructions to your executor or trusted family member.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>⚖️</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={1.4}>Solicitor / Attorney</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={1.4}>
              Include the Family Kit instructions with your will or estate plan.
              Your solicitor can hold a copy of the QR code securely.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💾</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={1.4}>USB Drive + Cloud</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={1.4}>
              Save the .afterme file on an encrypted USB drive and/or a trusted
              cloud service. The file is useless without the QR code key.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>👨‍👩‍👧</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={1.4}>Tell Trusted People</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={1.4}>
              Make sure at least one trusted person knows the kit exists and
              where to find the QR code and the file.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🔄</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={1.4}>Keep It Updated</Text>
            <Text style={styles.tipBody} maxFontSizeMultiplier={1.4}>
              Whenever you add or update documents in your vault, regenerate the
              Family Kit. The app will remind you when your kit becomes stale.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 8 }]}
          onPress={handleDismiss}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.4}>Done</Text>
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
    }
  };

  if (shouldBlockEmpty) return null;

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
            <Text style={styles.closeBtnText} maxFontSizeMultiplier={1.4}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.4}>Family Kit</Text>
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
});

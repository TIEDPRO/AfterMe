/**
 * Personal Recovery Kit Wizard — generates a .afterme backup for the user's
 * own device loss recovery. Produces a QR code Recovery Card for printing.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { shareAsync } from 'expo-sharing';
import { PersonalRecoveryKitService, type RecoveryKitResult } from '../../services/PersonalRecoveryKitService';
import { PdfExportService } from '../../services/PdfExportService';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

type WizardStep = 'intro' | 'generating' | 'complete' | 'distribute';

interface PersonalRecoveryWizardProps {
  visible: boolean;
  onDismiss: () => void;
}

const QR_SIZE = 220;
const QR_QUIET_ZONE = 4;

export function PersonalRecoveryWizard({ visible, onDismiss }: PersonalRecoveryWizardProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<WizardStep>('intro');
  const [result, setResult] = useState<RecoveryKitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [qrDataUri, setQrDataUri] = useState('');
  const qrRef = useRef<ViewShot>(null);

  const reset = useCallback(() => {
    setStep('intro');
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
      const kit = await PersonalRecoveryKitService.generateKit(
        (current, total) => setProgress({ current, total }),
      );
      setResult(kit);

      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      if (qrRef.current) {
        try {
          const uri = await captureRef(qrRef, { format: 'png', quality: 1.0 });
          setQrDataUri(uri);
        } catch {
          // QR capture optional
        }
      }

      setStep('complete');
    } catch (e) {
      setError((e as Error).message);
      setStep('intro');
    }
  }, []);

  const handleShareFile = useCallback(async () => {
    if (!result) return;
    try {
      await shareAsync(result.filePath, {
        mimeType: 'application/zip',
        UTI: 'public.zip-archive',
        dialogTitle: 'Save Recovery Kit',
      });
    } catch {
      Alert.alert('Share Error', 'Could not share the recovery file.');
    }
  }, [result]);

  const handlePrintPdf = useCallback(async () => {
    if (!result) return;
    try {
      let qrImage: string | undefined;
      if (qrDataUri) {
        const { readAsStringAsync, EncodingType } = await import('expo-file-system/legacy');
        const b64 = await readAsStringAsync(qrDataUri, { encoding: EncodingType.Base64 });
        qrImage = `data:image/png;base64,${b64}`;
      }
      await PdfExportService.shareKitPdf({
        accessKey: result.accessKey,
        ownerName: null,
        documentCount: result.documentCount,
        kitVersion: 1,
        qrDataUri: qrImage ?? '',
      });
    } catch {
      Alert.alert('PDF Error', 'Could not generate the recovery PDF.');
    }
  }, [result, qrDataUri]);

  const renderIntro = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.heroEmoji}>🛡️</Text>
      <Text style={styles.title} maxFontSizeMultiplier={1.4}>Personal Recovery Kit</Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
        Create a backup that lets you restore your vault if this device is lost, stolen, or damaged.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle} maxFontSizeMultiplier={1.4}>What you&apos;ll get</Text>
        <Text style={styles.infoText} maxFontSizeMultiplier={1.4}>
          1. An encrypted .afterme file containing all your documents{'\n'}
          2. A QR Recovery Card to print and store safely{'\n'}
          3. Both pieces are needed to restore — neither works alone
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle} maxFontSizeMultiplier={1.4}>Storage recommendations</Text>
        <Text style={styles.infoText} maxFontSizeMultiplier={1.4}>
          • Print the QR card — store in a fireproof safe{'\n'}
          • Save the .afterme file to a USB drive{'\n'}
          • Give a copy to your solicitor{'\n'}
          • Keep file and QR code in separate locations{'\n'}
          • Update when you add or remove documents
        </Text>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleGenerate}
        accessibilityRole="button"
        accessibilityLabel="Generate Recovery Kit"
      >
        <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.4}>Generate Recovery Kit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      >
        <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderGenerating = () => (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.amAmber} />
      <Text style={styles.generatingText} maxFontSizeMultiplier={1.4}>
        Encrypting your vault...
      </Text>
      <Text style={styles.generatingHint} maxFontSizeMultiplier={1.4}>
        This may take a moment depending on vault size
      </Text>
      {progress.total > 0 && (
        <Text style={styles.progressText} maxFontSizeMultiplier={1.4}>
          Processing document {progress.current} of {progress.total}…
        </Text>
      )}

      {result && (
        <View style={styles.hiddenQr} pointerEvents="none">
          <ViewShot ref={qrRef} options={{ format: 'png', quality: 1.0 }}>
            <View style={styles.qrCardCapture}>
              <Text style={styles.qrCardLabel}>AFTER ME — RECOVERY CARD</Text>
              <QRCode
                value={result.accessKey}
                size={QR_SIZE}
                color="#2D3142"
                backgroundColor="#FFFFFF"
                ecl="H"
                quietZone={QR_QUIET_ZONE}
              />
              <Text style={styles.qrCardHint}>Scan to restore your vault</Text>
            </View>
          </ViewShot>
        </View>
      )}
    </View>
  );

  const renderComplete = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.heroEmoji}>✅</Text>
      <Text style={styles.title} maxFontSizeMultiplier={1.4}>Recovery Kit Ready</Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
        {result?.documentCount} document{(result?.documentCount ?? 0) !== 1 ? 's' : ''} encrypted and packaged.
      </Text>

      <View style={styles.qrSection}>
        <View style={styles.qrBackground}>
          <QRCode
            value={result?.accessKey ?? ''}
            size={QR_SIZE}
            color="#2D3142"
            backgroundColor="#FFFFFF"
            ecl="H"
            quietZone={QR_QUIET_ZONE}
          />
        </View>
        <Text style={styles.qrLabel} maxFontSizeMultiplier={1.4}>
          Your Recovery QR Code
        </Text>
        <Text style={styles.qrHint} maxFontSizeMultiplier={1.4}>
          Print this and store in a safe place
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('distribute')}
        accessibilityRole="button"
        accessibilityLabel="Save and share"
      >
        <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.4}>Save & Share</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderDistribute = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.title} maxFontSizeMultiplier={1.4}>Save Your Recovery Kit</Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
        Your recovery kit has two parts. Save both to a secure location.
      </Text>

      <View style={styles.explainerCard}>
        <Text style={styles.explainerText} maxFontSizeMultiplier={1.4}>
          <Text style={styles.explainerBold}>.afterme file</Text> — Your encrypted vault data (binary file — this is normal){'\n\n'}
          <Text style={styles.explainerBold}>PDF Recovery Card</Text> — Printable instructions with your access key QR code
        </Text>
      </View>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleShareFile}
        accessibilityRole="button"
        accessibilityLabel="Save encrypted vault file"
      >
        <Text style={styles.actionIcon}>💾</Text>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle} maxFontSizeMultiplier={1.4}>Save Encrypted Vault File</Text>
          <Text style={styles.actionHint} maxFontSizeMultiplier={1.4}>
            .afterme file — save to Files, AirDrop, or USB drive
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={handlePrintPdf}
        accessibilityRole="button"
        accessibilityLabel="Save or print PDF recovery card"
      >
        <Text style={styles.actionIcon}>🖨️</Text>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle} maxFontSizeMultiplier={1.4}>Save / Print PDF Recovery Card</Text>
          <Text style={styles.actionHint} maxFontSizeMultiplier={1.4}>
            Printable PDF with QR code and recovery steps
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle} maxFontSizeMultiplier={1.4}>Important</Text>
        <Text style={styles.warningText} maxFontSizeMultiplier={1.4}>
          Store the .afterme file and QR code in separate locations. Both are needed to restore your vault. Neither works alone.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Done"
      >
        <Text style={styles.doneButtonText} maxFontSizeMultiplier={1.4}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onDismiss={handleDismiss} onRequestClose={handleDismiss}>
      <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
        {step === 'intro' && renderIntro()}
        {step === 'generating' && renderGenerating()}
        {step === 'complete' && renderComplete()}
        {step === 'distribute' && renderDistribute()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heroEmoji: {
    fontSize: 56,
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.amWhite,
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  infoCard: {
    backgroundColor: colors.amCard,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: 'rgba(226,75,74,0.15)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.amDanger,
  },
  errorText: {
    fontSize: 14,
    color: colors.amDanger,
  },
  primaryButton: {
    backgroundColor: colors.amAmber,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.amBackground,
  },
  cancelButton: {
    padding: 14,
    marginTop: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  generatingText: {
    fontSize: 18,
    color: colors.amWhite,
    marginTop: 20,
    fontWeight: '600',
  },
  generatingHint: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: colors.amAmber,
    marginTop: 12,
    fontWeight: '500',
  },
  hiddenQr: {
    position: 'absolute',
    left: -9999,
  },
  qrCardCapture: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderRadius: 12,
  },
  qrCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3142',
    marginBottom: 12,
  },
  qrCardHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrBackground: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
    marginTop: 16,
  },
  qrHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amCard,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    width: '100%',
    minHeight: 72,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
  },
  actionHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  explainerCard: {
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  explainerText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  explainerBold: {
    fontWeight: '700',
    color: colors.amWhite,
  },
  warningCard: {
    backgroundColor: 'rgba(201,150,58,0.12)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(201,150,58,0.3)',
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.amAmber,
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: colors.amAmber,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    minHeight: 56,
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.amBackground,
  },
});

/**
 * Survivor onboarding flow — emotionally sensitive import experience.
 *
 * Flow: Welcome → Scan QR → Select file → Importing → Vault intro → Support resources
 *
 * Designed for bereaved family members opening a loved one's vault.
 * Tone: warm, unhurried, respectful. No celebration animations.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera/build/Camera.types';
import * as DocumentPicker from 'expo-document-picker';
import { KeyManager } from '../../core/auth/KeyManager';
import { OnboardingStorage } from '../../services/OnboardingStorage';
import { importFamilyKit } from '../../services/FamilyKitService';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

type Step = 'welcome' | 'scan' | 'manualEntry' | 'findFile' | 'selectFile' | 'importing' | 'vaultIntro';

interface SurvivorImportScreenProps {
  mode?: 'kit' | 'restore';
  onBack?: () => void;
  onImportComplete: () => Promise<void>;
}

export function SurvivorImportScreen({ mode: _mode, onBack, onImportComplete }: SurvivorImportScreenProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('welcome');
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [manualKey, setManualKey] = useState('');
  const [showFileHelp, setShowFileHelp] = useState(false);

  const handleBarCodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanned || processing) return;
      setScanned(true);
      setProcessing(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      setAccessKey(result.data);
      setStep('findFile');
      setProcessing(false);
    },
    [scanned, processing],
  );

  const handleSelectFile = useCallback(async () => {
    if (!accessKey) return;
    setStep('importing');
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setStep('selectFile');
        return;
      }
      const fileUri = result.assets[0].uri;
      const hasKeys = await KeyManager.isInitialized();
      if (!hasKeys) {
        await KeyManager.initializeKeys();
      }
      const { documentCount } = await importFamilyKit(fileUri, accessKey);
      setImportedCount(documentCount);
      await OnboardingStorage.setHasCompletedOnboarding(true);
      setStep('vaultIntro');
    } catch (e) {
      setError((e as Error).message);
      setStep('selectFile');
    }
  }, [accessKey]);

  const handleScanAgain = useCallback(() => {
    setStep('scan');
    setAccessKey(null);
    setScanned(false);
    setError(null);
  }, []);

  const handleFinish = useCallback(async () => {
    await onImportComplete();
  }, [onImportComplete]);

  const BackButton = ({ top }: { top: number }) =>
    onBack ? (
      <Pressable
        style={[styles.backButton, { top }]}
        onPress={onBack}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backText} maxFontSizeMultiplier={3.0}>← Back</Text>
      </Pressable>
    ) : null;

  // --- Step: Emotionally sensitive welcome ---
  if (step === 'welcome') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <BackButton top={insets.top + 12} />
        <ScrollView contentContainerStyle={styles.welcomeContent}>
          <View style={styles.welcomeIconWrap}>
            <Text style={styles.welcomeIcon}>🕊️</Text>
          </View>
          <Text style={styles.welcomeTitle} maxFontSizeMultiplier={3.0}>
            Welcome
          </Text>
          <Text style={styles.welcomeBody} maxFontSizeMultiplier={3.0}>
            We understand this may be a difficult time. Someone who cared about you left an encrypted
            Family Kit so you can open what they prepared without their phone or passwords.
          </Text>
          <Text style={styles.welcomeBody} maxFontSizeMultiplier={3.0}>
            Inside, you&apos;ll find the documents they chose to include — identity papers, legal and
            financial records, and perhaps personal messages.
          </Text>
          <Text style={styles.welcomeDetail} maxFontSizeMultiplier={3.0}>
            Take your time. There&apos;s no rush.
          </Text>

          <View style={styles.welcomeSteps}>
            <View style={styles.welcomeStepRow}>
              <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
              <Text style={styles.stepText} maxFontSizeMultiplier={3.0}>
                Scan the QR code from the printed Family Kit card (camera opens next)
              </Text>
            </View>
            <View style={styles.welcomeStepRow}>
              <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
              <Text style={styles.stepText} maxFontSizeMultiplier={3.0}>
                Choose the encrypted .afterme vault file — from email, USB, or cloud storage on this device
              </Text>
            </View>
            <View style={styles.welcomeStepRow}>
              <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
              <Text style={styles.stepText} maxFontSizeMultiplier={3.0}>
                We import and decrypt the vault here; you&apos;ll protect it with this device&apos;s biometrics
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.continueButton}
            onPress={() => setStep('scan')}
            accessibilityRole="button"
            accessibilityLabel="Begin scanning the QR code"
          >
            <Text style={styles.continueButtonText} maxFontSizeMultiplier={3.0}>
              I&apos;m Ready to Begin
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // --- Step: Camera permission needed ---
  if (step === 'scan' && (!permission || !permission.granted)) {
    return (
      <View style={[styles.container, styles.centeredFull]}>
        <BackButton top={insets.top + 12} />
        {!permission ? (
          <>
            <ActivityIndicator size="large" color={colors.amAmber} />
            <Text style={styles.statusText} maxFontSizeMultiplier={3.0}>Checking camera permission…</Text>
          </>
        ) : (
          <>
            <Text style={styles.permTitle} maxFontSizeMultiplier={3.0}>Camera Access Needed</Text>
            <Text style={styles.permBody} maxFontSizeMultiplier={3.0}>
              To scan the QR code from the Family Kit, we need permission to use your camera.
            </Text>
            <Pressable
              style={styles.continueButton}
              onPress={requestPermission}
              accessibilityRole="button"
              accessibilityLabel="Allow camera access"
            >
              <Text style={styles.continueButtonText} maxFontSizeMultiplier={3.0}>Allow Camera</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  // --- Step: Where is the file? ---
  if (step === 'findFile') {
    const SCENARIOS = Platform.OS === 'ios'
      ? [
          {
            icon: '📧',
            label: 'It was emailed to me',
            howto:
              'Open the email, tap the vault file attachment (it ends in .afterme), then tap the Share icon → "Save to Files". Once saved, come back here and tap "Select File".',
          },
          {
            icon: '☁️',
            label: "It's in iCloud Drive",
            howto:
              'When you tap "Select File", the iOS Files app will open. Tap "Browse" at the bottom and choose iCloud Drive. Look for a file ending in .afterme — that\'s the vault file.',
          },
          {
            icon: '💾',
            label: "It's on a USB drive or laptop",
            howto:
              'Connect the USB drive to this device (via a Lightning or USB-C adapter). The iOS Files app will show it under "Locations". Select the file ending in .afterme from there.',
          },
          {
            icon: '⚖️',
            label: 'A solicitor or executor has it',
            howto:
              'Ask them to email it to you, or share it via a cloud link. Once you have it on this device, come back and tap "Select File".',
          },
        ]
      : [
          {
            icon: '📧',
            label: 'It was emailed to me',
            howto:
              'Open the email app, tap the vault file attachment (it ends in .afterme), then tap "Save" or "Download". Once downloaded, come back here and tap "Select File".',
          },
          {
            icon: '☁️',
            label: "It's in Google Drive",
            howto:
              'When you tap "Select File", the file picker will open. Tap "Google Drive" from the list of storage providers. Look for a file ending in .afterme — that\'s the vault file.',
          },
          {
            icon: '💾',
            label: "It's on a USB drive or device",
            howto:
              'Connect the USB drive via a USB-C adapter. Open the Files app (or Samsung My Files) and look under "USB storage". Select the file ending in .afterme from there.',
          },
          {
            icon: '⚖️',
            label: 'A solicitor or executor has it',
            howto:
              'Ask them to email it to you, or share it via a cloud link. Once you have it on this device, come back and tap "Select File".',
          },
        ];

    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <BackButton top={insets.top + 12} />
        <ScrollView contentContainerStyle={styles.findFileContent}>
          <View style={styles.findFileCheck}>
            <Text style={styles.findFileCheckIcon}>✅</Text>
            <Text style={styles.findFileCheckText} maxFontSizeMultiplier={3.0}>QR code received</Text>
          </View>

          <Text style={styles.findFileHeading} maxFontSizeMultiplier={3.0}>
            Now let&apos;s find the file
          </Text>
          <Text style={styles.findFileIntro} maxFontSizeMultiplier={3.0}>
            The encrypted vault file is what holds the documents. The QR code you just
            scanned is the key that unlocks it. Both are needed.{'\n\n'}
            Where was the file stored?
          </Text>

          {SCENARIOS.map((s, i) => (
            <View key={i} style={styles.scenarioCard}>
              <View style={styles.scenarioHeader}>
                <Text style={styles.scenarioIcon}>{s.icon}</Text>
                <Text style={styles.scenarioLabel} maxFontSizeMultiplier={3.0}>{s.label}</Text>
              </View>
              <View style={styles.scenarioHowto}>
                <Text style={styles.scenarioHowtoLabel} maxFontSizeMultiplier={3.0}>What to do:</Text>
                <Text style={styles.scenarioHowtoText} maxFontSizeMultiplier={3.0}>{s.howto}</Text>
              </View>
            </View>
          ))}

          <View style={styles.findFileNotSure}>
            <Text style={styles.findFileNotSureIcon}>❓</Text>
            <Text style={styles.findFileNotSureText} maxFontSizeMultiplier={3.0}>
              Not sure where it is? Contact the person who set up the vault, or ask the estate
              solicitor. The file may also be with the printed Family Kit paperwork.
            </Text>
          </View>

          <View style={styles.findFileDivider} />

          <Text style={styles.findFileReady} maxFontSizeMultiplier={3.0}>
            Once the vault file is accessible on this device, tap below:
          </Text>

          <Pressable
            style={styles.continueButton}
            onPress={() => setStep('selectFile')}
            accessibilityRole="button"
            accessibilityLabel="Select the Family Kit file"
          >
            <Text style={styles.continueButtonText} maxFontSizeMultiplier={3.0}>
              Select Vault File
            </Text>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={handleScanAgain}
            accessibilityRole="button"
            accessibilityLabel="Scan QR code again"
          >
            <Text style={styles.linkText} maxFontSizeMultiplier={3.0}>
              Scan a different QR code
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // --- Step: Select file + importing ---
  if (step === 'selectFile' || step === 'importing') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <BackButton top={insets.top + 12} />
        <ScrollView contentContainerStyle={styles.selectContent}>
          <Text style={styles.selectIcon}>✅</Text>
          <Text style={styles.selectTitle} maxFontSizeMultiplier={3.0}>QR Code Received</Text>
          <Text style={styles.selectBody} maxFontSizeMultiplier={3.0}>
            Now select the encrypted vault file. It may be on a USB drive, in an email
            attachment, or in cloud storage like iCloud Drive or Google Drive.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle} maxFontSizeMultiplier={3.0}>Something went wrong</Text>
              <Text style={styles.errorText} maxFontSizeMultiplier={3.0}>{error}</Text>
              <Text style={styles.errorHint} maxFontSizeMultiplier={3.0}>
                Check that you have the correct vault file and try again.
                If the problem persists, the file or QR code may be damaged.
              </Text>
            </View>
          )}

          {step === 'importing' ? (
            <View style={styles.importingBox}>
              <ActivityIndicator size="large" color={colors.amAmber} />
              <Text style={styles.importingTitle} maxFontSizeMultiplier={3.0}>Importing Vault</Text>
              <Text style={styles.importingBody} maxFontSizeMultiplier={3.0}>
                Decrypting and importing documents…{'\n'}
                This may take a moment.
              </Text>
            </View>
          ) : (
            <View style={styles.fileActionsContainer}>
              <Pressable
                style={styles.continueButton}
                onPress={handleSelectFile}
                accessibilityRole="button"
                accessibilityLabel="Select Family Kit file"
              >
                <Text style={styles.continueButtonText} maxFontSizeMultiplier={3.0}>
                  Select Vault File
                </Text>
              </Pressable>

              <Pressable
                style={styles.helpButton}
                onPress={() => setShowFileHelp(true)}
                accessibilityRole="button"
                accessibilityLabel="Need help finding the file?"
              >
                <Text style={styles.helpButtonIcon}>ℹ️</Text>
                <Text style={styles.helpButtonText} maxFontSizeMultiplier={3.0}>
                  Need help finding the file?
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={styles.linkButton}
            onPress={handleScanAgain}
            disabled={step === 'importing'}
            accessibilityRole="button"
            accessibilityLabel="Scan QR code again"
          >
            <Text style={[styles.linkText, step === 'importing' && { opacity: 0.4 }]} maxFontSizeMultiplier={3.0}>
              Scan a different QR code
            </Text>
          </Pressable>
        </ScrollView>

        <Modal
          visible={showFileHelp}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFileHelp(false)}
        >
          <View style={styles.helpOverlay}>
            <View style={[styles.helpCard, { paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.helpHeader}>
                <Text style={styles.helpTitle} maxFontSizeMultiplier={3.0}>Finding the vault file</Text>
                <Pressable
                  onPress={() => setShowFileHelp(false)}
                  style={styles.helpClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close help"
                  hitSlop={12}
                >
                  <Text style={styles.helpCloseText} maxFontSizeMultiplier={3.0}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.helpIntro} maxFontSizeMultiplier={3.0}>
                {Platform.OS === 'ios'
                  ? 'When you tap "Select Vault File", the iOS Files app will open. Look for a file ending in .afterme:'
                  : 'When you tap "Select Vault File", the file picker will open. Look for a file ending in .afterme:'}
              </Text>

              <View style={styles.helpStepList}>
                <View style={styles.helpStep}>
                  <Text style={styles.helpStepNum}>1</Text>
                  <Text style={styles.helpStepText} maxFontSizeMultiplier={3.0}>
                    {Platform.OS === 'ios'
                      ? <>Tap <Text style={styles.helpBold}>Browse</Text> at the bottom right.</>
                      : <>Tap the <Text style={styles.helpBold}>menu icon</Text> or <Text style={styles.helpBold}>storage provider</Text> on the left.</>}
                  </Text>
                </View>
                <View style={styles.helpStep}>
                  <Text style={styles.helpStepNum}>2</Text>
                  <Text style={styles.helpStepText} maxFontSizeMultiplier={3.0}>
                    {Platform.OS === 'ios'
                      ? <>Check <Text style={styles.helpBold}>iCloud Drive</Text> or <Text style={styles.helpBold}>On My iPhone</Text>.</>
                      : <>Check <Text style={styles.helpBold}>Google Drive</Text>, <Text style={styles.helpBold}>Downloads</Text>, or <Text style={styles.helpBold}>Internal Storage</Text>.</>}
                  </Text>
                </View>
                <View style={styles.helpStep}>
                  <Text style={styles.helpStepNum}>3</Text>
                  <Text style={styles.helpStepText} maxFontSizeMultiplier={3.0}>
                    Look for a file ending in <Text style={styles.helpBold}>.afterme</Text>. It looks like a blank document icon.
                  </Text>
                </View>
              </View>

              <View style={styles.helpNote}>
                <Text style={styles.helpNoteIcon}>💡</Text>
                <Text style={styles.helpNoteText} maxFontSizeMultiplier={3.0}>
                  {Platform.OS === 'ios'
                    ? 'If the file was emailed to you, go to the email, tap the attachment, choose "Share", and tap "Save to Files" first.'
                    : 'If the file was emailed to you, go to the email, tap the attachment, and choose "Download" or "Save to device" first.'}
                </Text>
              </View>

              <Pressable
                style={styles.helpGotItBtn}
                onPress={() => setShowFileHelp(false)}
              >
                <Text style={styles.helpGotItText} maxFontSizeMultiplier={3.0}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- Step: Vault intro (after successful import) ---
  if (step === 'vaultIntro') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView contentContainerStyle={styles.vaultIntroContent}>
          <Text style={styles.vaultIntroIcon}>📋</Text>
          <Text style={styles.vaultIntroTitle} maxFontSizeMultiplier={3.0}>
            Vault Imported Successfully
          </Text>
          <Text style={styles.vaultIntroBody} maxFontSizeMultiplier={3.0}>
            {importedCount} {importedCount === 1 ? 'document has' : 'documents have'} been
            securely imported to this device.
          </Text>

          <View style={styles.vaultInfoCard}>
            <Text style={styles.vaultInfoTitle} maxFontSizeMultiplier={3.0}>What Happens Next</Text>
            <View style={styles.vaultInfoRow}>
              <Text style={styles.vaultInfoBullet}>🔒</Text>
              <Text style={styles.vaultInfoText} maxFontSizeMultiplier={3.0}>
                All documents are encrypted on this device. They never leave your phone.
              </Text>
            </View>
            <View style={styles.vaultInfoRow}>
              <Text style={styles.vaultInfoBullet}>📁</Text>
              <Text style={styles.vaultInfoText} maxFontSizeMultiplier={3.0}>
                Browse documents by category — identity, legal, finance, medical, and more.
              </Text>
            </View>
            <View style={styles.vaultInfoRow}>
              <Text style={styles.vaultInfoBullet}>🔐</Text>
              <Text style={styles.vaultInfoText} maxFontSizeMultiplier={3.0}>
                {Platform.OS === 'ios'
                  ? 'Face ID or Touch ID protects access to the vault each time you open the app.'
                  : 'Your fingerprint or face unlock protects access to the vault each time you open the app.'}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.continueButton}
            onPress={handleFinish}
            accessibilityRole="button"
            accessibilityLabel="Open the vault"
          >
            <Text style={styles.continueButtonText} maxFontSizeMultiplier={3.0}>Open the Vault</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // --- Step: Manual key entry ---
  if (step === 'manualEntry') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <BackButton top={insets.top + 12} />
        <ScrollView contentContainerStyle={styles.selectContent}>
          <Text style={styles.selectTitle} maxFontSizeMultiplier={3.0}>Enter Access Key</Text>
          <Text style={styles.selectBody} maxFontSizeMultiplier={3.0}>
            Type or paste the access key from your printed Family Kit.
            It&apos;s the long text string below the QR code.
          </Text>
          <TextInput
            style={styles.manualKeyInput}
            value={manualKey}
            onChangeText={setManualKey}
            placeholder="Paste or type access key here…"
            placeholderTextColor={colors.textMuted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            maxFontSizeMultiplier={3.0}
          />
          <Pressable
            style={[styles.continueButton, !manualKey.trim() && { opacity: 0.5 }]}
            onPress={() => {
              if (manualKey.trim()) {
                setAccessKey(manualKey.trim());
                setStep('findFile');
              }
            }}
            disabled={!manualKey.trim()}
            accessibilityRole="button"
            accessibilityLabel="Continue with entered key"
          >
            <Text style={styles.continueButtonText} maxFontSizeMultiplier={3.0}>Continue</Text>
          </Pressable>
          <Pressable
            style={styles.linkButton}
            onPress={() => { setManualKey(''); setStep('scan'); }}
            accessibilityRole="button"
            accessibilityLabel="Try scanning instead"
          >
            <Text style={styles.linkText} maxFontSizeMultiplier={3.0}>Try scanning instead</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // --- Step: QR Scanner ---
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <BackButton top={insets.top + 12} />
        <View style={styles.frameArea}>
          <Text style={styles.instructionText} maxFontSizeMultiplier={3.0}>
            Point your camera at the QR code{'\n'}on the Family Kit
          </Text>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint} maxFontSizeMultiplier={3.0}>
            The QR code is on the printed sheet inside the kit
          </Text>
          <Pressable
            style={styles.manualEntryLink}
            onPress={() => setStep('manualEntry')}
            accessibilityRole="button"
            accessibilityLabel="Enter key manually instead of scanning"
          >
            <Text style={styles.manualEntryText} maxFontSizeMultiplier={3.0}>
              QR code damaged? Enter key manually
            </Text>
          </Pressable>
        </View>
        {scanned && processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={colors.amAmber} />
            <Text style={styles.processingText} maxFontSizeMultiplier={3.0}>Reading QR code…</Text>
          </View>
        )}
      </View>
    </View>
  );
}


const { width, height } = Dimensions.get('window');
const FRAME_SIZE = Math.min(width, height) * 0.65;
const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  centeredFull: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  // Welcome
  welcomeContent: {
    padding: 28,
    paddingTop: 72,
    alignItems: 'center',
  },
  welcomeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201,150,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeIcon: {
    fontSize: 36,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.amWhite,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: SERIF_FONT,
  },
  welcomeBody: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  welcomeDetail: {
    fontSize: 15,
    color: colors.amAmber,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 28,
  },
  welcomeSteps: {
    alignSelf: 'stretch',
    marginBottom: 28,
  },
  welcomeStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingLeft: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.amAmber,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.amBackground,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: colors.amWhite,
    lineHeight: 21,
  },

  // Camera
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  frameArea: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: colors.amWhite,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.amAmber,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: colors.amAmber,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.amAmber,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: colors.amAmber,
  },
  scanHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45,49,66,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.amWhite,
  },

  // Select file
  selectContent: {
    padding: 28,
    paddingTop: 72,
    alignItems: 'center',
  },
  selectIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  selectTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.amWhite,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: SERIF_FONT,
  },
  selectBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  errorBox: {
    backgroundColor: 'rgba(226,75,74,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226,75,74,0.25)',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.amDanger,
    marginBottom: 4,
  },
  errorText: {
    color: colors.amDanger,
    fontSize: 14,
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  importingBox: {
    alignItems: 'center',
    marginVertical: 24,
  },
  importingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.amWhite,
  },
  importingBody: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Vault intro
  vaultIntroContent: {
    padding: 28,
    paddingTop: 72,
    alignItems: 'center',
  },
  vaultIntroIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  vaultIntroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.amWhite,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: SERIF_FONT,
  },
  vaultIntroBody: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 24,
  },
  vaultInfoCard: {
    backgroundColor: colors.amCard,
    borderRadius: 14,
    padding: 20,
    alignSelf: 'stretch',
    marginBottom: 28,
  },
  vaultInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 16,
  },
  vaultInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  vaultInfoBullet: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 1,
  },
  vaultInfoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Shared
  continueButton: {
    backgroundColor: colors.amAmber,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 4,
    minHeight: 56,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.amBackground,
  },
  linkButton: {
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  linkText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  permTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.amWhite,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: SERIF_FONT,
  },
  permBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 12,
    zIndex: 9999,
    minHeight: 44,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.amAmber,
  },
  manualKeyInput: {
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.amWhite,
    minHeight: 100,
    textAlignVertical: 'top',
    alignSelf: 'stretch',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  manualEntryLink: {
    marginTop: 20,
    padding: 12,
    minHeight: 44,
  },
  manualEntryText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
  fileActionsContainer: {
    alignSelf: 'stretch',
    gap: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 56,
  },
  helpButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  helpButtonText: {
    fontSize: 16,
    color: colors.amWhite,
    fontWeight: '500',
  },
  helpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  helpCard: {
    backgroundColor: colors.amCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
  },
  helpClose: {
    padding: 4,
  },
  helpCloseText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  helpIntro: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  helpStepList: {
    gap: 16,
    marginBottom: 24,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helpStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(201,150,58,0.2)',
    color: colors.amAmber,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '700',
    fontSize: 13,
    marginRight: 12,
    marginTop: 2,
  },
  helpStepText: {
    flex: 1,
    fontSize: 15,
    color: colors.amWhite,
    lineHeight: 22,
  },
  helpBold: {
    fontWeight: '600',
    color: colors.amAmber,
  },
  helpNote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  helpNoteIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  helpNoteText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  helpGotItBtn: {
    backgroundColor: colors.amAmber,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  helpGotItText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amBackground,
  },

  // findFile step
  findFileContent: {
    padding: 24,
    paddingTop: 68,
  },
  findFileCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  findFileCheckIcon: {
    fontSize: 22,
  },
  findFileCheckText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
  },
  findFileHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
    marginBottom: 12,
  },
  findFileIntro: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 23,
    marginBottom: 20,
  },
  scenarioCard: {
    backgroundColor: colors.amCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  scenarioIcon: {
    fontSize: 22,
  },
  scenarioLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.amWhite,
    flex: 1,
  },
  scenarioHowto: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  scenarioHowtoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amAmber,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scenarioHowtoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  findFileNotSure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(201,150,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,150,58,0.20)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  findFileNotSureIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  findFileNotSureText: {
    flex: 1,
    fontSize: 13,
    color: colors.amAmber,
    lineHeight: 20,
  },
  findFileDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 18,
  },
  findFileReady: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
});

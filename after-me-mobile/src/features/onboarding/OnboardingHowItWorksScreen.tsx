/**
 * Onboarding — "How your family will access this"
 * Inserted after Screen 4 (QR reveal), before the legal disclaimer.
 * Explains the three access paths clearly before the user sets up biometrics.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLOUD_PROVIDER_NAME } from '../../services/CloudBackupService';
import { onboardingStyles } from './shared/onboardingStyles';
import { SERIF_FONT } from '../../theme/fonts';

interface OnboardingHowItWorksScreenProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function OnboardingHowItWorksScreen({ onContinue, onBack }: OnboardingHowItWorksScreenProps) {
  const insets = useSafeAreaInsets();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(12)).current;
  const path1Opacity = useRef(new Animated.Value(0)).current;
  const path1Y = useRef(new Animated.Value(16)).current;
  const path2Opacity = useRef(new Animated.Value(0)).current;
  const path2Y = useRef(new Animated.Value(16)).current;
  const path3Opacity = useRef(new Animated.Value(0)).current;
  const path3Y = useRef(new Animated.Value(16)).current;
  const noteOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(path1Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(path1Y, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(path2Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(path2Y, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(path3Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(path3Y, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      Animated.timing(noteOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(ctaOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {onBack && (
        <Pressable
          style={styles.backButton}
          onPress={onBack}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.4}>Before you set up</Text>
          <Text style={styles.headline} maxFontSizeMultiplier={1.3}>
            How your family{'\n'}will access this
          </Text>
          <Text style={styles.subhead} maxFontSizeMultiplier={1.4}>
            After Me is built around a simple idea: your loved ones
            should be able to access what you leave them — without
            needing your phone, your password, or your account.
          </Text>
          <Text style={styles.subhead} maxFontSizeMultiplier={1.4}>
            Here&apos;s how it works in practice.
          </Text>
        </Animated.View>

        {/* Path 1 — Family Kit */}
        <Animated.View style={[styles.pathCard, styles.pathCardPrimary, { opacity: path1Opacity, transform: [{ translateY: path1Y }] }]}>
          <View style={styles.pathBadgeRow}>
            <View style={styles.pathBadgePrimary}>
              <Text style={styles.pathBadgePrimaryText}>Recommended</Text>
            </View>
          </View>
          <Text style={styles.pathTitle} maxFontSizeMultiplier={1.4}>Family Kit</Text>
          <Text style={styles.pathBody} maxFontSizeMultiplier={1.4}>
            You create a Family Kit inside the app. It produces two things:
            a printed QR Key Card (give to a trusted person today) and an
            encrypted .afterme file (store on USB, iCloud Drive, or email to yourself).
          </Text>
          <Text style={styles.pathBody} maxFontSizeMultiplier={1.4}>
            When the time comes, your loved one downloads After Me, scans
            the QR card, and selects the file. The vault opens on their
            device — no account, no password, no access to your Apple ID needed.
          </Text>
          <View style={styles.pathRequires}>
            <Text style={styles.pathRequiresText} maxFontSizeMultiplier={1.4}>
              Requires: QR card + .afterme file
            </Text>
          </View>
        </Animated.View>

        {/* Path 2 — Cloud backup (personal recovery only) */}
        <Animated.View style={[styles.pathCard, { opacity: path2Opacity, transform: [{ translateY: path2Y }] }]}>
          <View style={styles.pathBadgeRow}>
            <View style={styles.pathBadgeSecondary}>
              <Text style={styles.pathBadgeSecondaryText}>For your own recovery</Text>
            </View>
          </View>
          <Text style={styles.pathTitle} maxFontSizeMultiplier={1.4}>{CLOUD_PROVIDER_NAME} Backup</Text>
          <Text style={styles.pathBody} maxFontSizeMultiplier={1.4}>
            An encrypted copy of your vault is stored in your personal
            {' '}{CLOUD_PROVIDER_NAME} account. Useful if you lose or replace this phone —
            you can restore your own vault on a new device.
          </Text>
          <View style={styles.pathWarning}>
            <Text style={styles.pathWarningText} maxFontSizeMultiplier={1.4}>
              This does not give your family access. Accessing
              another person&apos;s cloud account after death is a complex
              legal process that can take weeks.
            </Text>
          </View>
        </Animated.View>

        {/* Path 3 — No preparation */}
        <Animated.View style={[styles.pathCard, styles.pathCardDanger, { opacity: path3Opacity, transform: [{ translateY: path3Y }] }]}>
          <Text style={styles.pathTitle} maxFontSizeMultiplier={1.4}>No preparation</Text>
          <Text style={styles.pathBody} maxFontSizeMultiplier={1.4}>
            If no Family Kit or backup exists, the vault is permanently
            inaccessible to everyone — including you if you lose this device.
            This is not a policy: it is the architecture. No one can recover it.
          </Text>
        </Animated.View>

        {/* Bottom note */}
        <Animated.View style={[styles.note, { opacity: noteOpacity }]}>
          <Text style={styles.noteText} maxFontSizeMultiplier={1.4}>
            You&apos;ll set up your Family Kit right after finishing this setup.
            It takes about two minutes.
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={{ opacity: ctaOpacity }}>
          <Pressable
            style={styles.ctaButton}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue setup"
          >
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.4}>I understand — continue</Text>
          </Pressable>
        </Animated.View>

        {/* Progress dots — position 5 of 8 */}
        <View style={[onboardingStyles.dotsRow, { justifyContent: 'center', paddingBottom: 8 }]}>
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotActive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D3142',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: '#C9963A',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontFamily: SERIF_FONT,
    fontSize: 28,
    fontWeight: '700',
    color: '#FAF9F6',
    lineHeight: 34,
    marginBottom: 16,
  },
  subhead: {
    fontSize: 15,
    color: 'rgba(250,249,246,0.6)',
    lineHeight: 23,
    marginBottom: 8,
  },

  // Path cards
  pathCard: {
    backgroundColor: '#1E2235',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(250,249,246,0.1)',
  },
  pathCardPrimary: {
    borderColor: 'rgba(201,150,58,0.35)',
  },
  pathCardDanger: {
    borderColor: 'rgba(226,75,74,0.2)',
  },
  pathBadgeRow: {
    marginBottom: 8,
  },
  pathBadgePrimary: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,150,58,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pathBadgePrimaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C9963A',
    letterSpacing: 0.4,
  },
  pathBadgeSecondary: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(250,249,246,0.07)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pathBadgeSecondaryText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(250,249,246,0.4)',
    letterSpacing: 0.4,
  },
  pathTitle: {
    fontFamily: SERIF_FONT,
    fontSize: 17,
    fontWeight: '700',
    color: '#FAF9F6',
    marginBottom: 8,
  },
  pathBody: {
    fontSize: 14,
    color: 'rgba(250,249,246,0.55)',
    lineHeight: 21,
    marginBottom: 8,
  },
  pathRequires: {
    marginTop: 4,
    backgroundColor: 'rgba(201,150,58,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  pathRequiresText: {
    fontSize: 12,
    color: '#C9963A',
    fontWeight: '500',
  },
  pathWarning: {
    backgroundColor: 'rgba(226,75,74,0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  pathWarningText: {
    fontSize: 12,
    color: 'rgba(226,75,74,0.8)',
    lineHeight: 18,
  },

  // Note
  note: {
    backgroundColor: 'rgba(201,150,58,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    marginTop: 4,
  },
  noteText: {
    fontSize: 13,
    color: '#C9963A',
    lineHeight: 19,
    textAlign: 'center',
  },

  // CTA
  ctaButton: {
    backgroundColor: '#C9963A',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 28,
    minHeight: 56,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3142',
  },

  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    padding: 12,
    zIndex: 9999,
    minHeight: 44,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#C9963A',
  },
});

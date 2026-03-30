/**
 * Legal Disclaimer — mandatory acceptance before app usage.
 * Per implementation plan Phase 5. Placed after Screen 4 (Magic Moment), before Biometric Setup.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

const DISCLAIMER_ACCEPTED_KEY = 'afterme_disclaimer_accepted_at';

interface LegalDisclaimerScreenProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function LegalDisclaimerScreen({ onContinue, onBack }: LegalDisclaimerScreenProps) {
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = React.useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
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
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Important information</Text>
          <Text style={styles.disclaimer}>
            After Me is not a substitute for professional legal or financial advice, and it is not a
            will or grant of probate authority. The app helps you organise and store important documents
            so loved ones can access them when needed.
          </Text>
          <Text style={styles.disclaimer}>
            We recommend consulting solicitors, financial advisers, or other qualified professionals
            for estate planning, wills, and legal matters.
          </Text>
          <Text style={styles.sensitive}>
            This app may contain sensitive content related to estate planning and end-of-life
            matters. Your data is encrypted and never leaves your device unless you explicitly share
            it via a Family Kit.
          </Text>
          <Text style={styles.privacy}>
            We process only what is necessary to operate the app. Document content is encrypted and
            we cannot access it.{' '}
            <Text
              style={styles.privacyLink}
              onPress={() => Linking.openURL('https://myafterme.co.uk/privacy')}
              accessibilityRole="link"
              accessibilityLabel="View Privacy Policy"
            >
              View our Privacy Policy
            </Text>
            .
          </Text>
          <Pressable
            style={[styles.checkboxRow, accepted && styles.checkboxRowChecked]}
            onPress={() => setAccepted((a) => !a)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="I understand and accept"
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>I understand and accept</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 }]}>
        <Pressable
          onPress={async () => {
            await AsyncStorage.setItem(DISCLAIMER_ACCEPTED_KEY, new Date().toISOString());
            onContinue();
          }}
          style={[styles.button, !accepted && styles.buttonDisabled]}
          disabled={!accepted}
          accessibilityLabel="Continue"
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
      {/* Progress dots — position 6 of 8 */}
      <View style={[styles.dotsSection, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotInactive]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.amWhite,
    marginBottom: 20,
  },
  disclaimer: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  sensitive: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 16,
  },
  privacy: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: 28,
  },
  privacyLink: {
    color: colors.amAmber,
    textDecorationLine: 'underline',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  checkboxRowChecked: {},
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.amAmber,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: colors.amAmber,
  },
  checkmark: {
    color: colors.amBackground,
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 17,
    color: colors.amWhite,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    backgroundColor: colors.amAmber,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.amBackground,
  },
  dotsSection: {
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.amAmber,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(250,249,246,0.22)',
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
    color: colors.amAmber,
  },
});

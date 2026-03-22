/**
 * Onboarding Screen 2: "The Privacy Promise"
 * Follows Screen 1 in the onboarding flow.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { onboardingStyles } from './shared/onboardingStyles';
import { SERIF_FONT } from '../../theme/fonts';

interface OnboardingScreen2Props {
  onContinue: () => void;
  onBack?: () => void;
}

export function OnboardingScreen2({ onContinue, onBack }: OnboardingScreen2Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const circleSize = width * 0.8;
  const circleCenterFromTop = height * 0.35;

  const circleOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.7)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(12)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyY = useRef(new Animated.Value(8)).current;
  const pill1Opacity = useRef(new Animated.Value(0)).current;
  const pill1Y = useRef(new Animated.Value(8)).current;
  const pill2Opacity = useRef(new Animated.Value(0)).current;
  const pill2Y = useRef(new Animated.Value(8)).current;
  const pill3Opacity = useRef(new Animated.Value(0)).current;
  const pill3Y = useRef(new Animated.Value(8)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(12)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const circleAnim = Animated.timing(circleOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });

    const iconAnim = Animated.spring(iconScale, {
      toValue: 1,
      delay: 100,
      useNativeDriver: true,
      speed: 2,
      bounciness: 4,
    });

    const headlineAnim = Animated.parallel([
      Animated.timing(headlineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headlineY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    const bodyAnim = Animated.parallel([
      Animated.timing(bodyOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(bodyY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    const pill1Anim = Animated.parallel([
      Animated.timing(pill1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(pill1Y, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);
    const pill2Anim = Animated.parallel([
      Animated.timing(pill2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(pill2Y, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);
    const pill3Anim = Animated.parallel([
      Animated.timing(pill3Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(pill3Y, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    const buttonAnim = Animated.parallel([
      Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(buttonY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    const dotsAnim = Animated.timing(dotsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });

    Animated.sequence([
      circleAnim,
      Animated.parallel([
        iconAnim,
        Animated.sequence([Animated.delay(100), headlineAnim]),
      ]),
      Animated.delay(100),
      bodyAnim,
      Animated.delay(50),
      Animated.parallel([
        Animated.sequence([Animated.delay(0), pill1Anim]),
        Animated.sequence([Animated.delay(50), pill2Anim]),
        Animated.sequence([Animated.delay(100), pill3Anim]),
      ]),
      Animated.delay(50),
      buttonAnim,
      Animated.delay(100),
      dotsAnim,
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[onboardingStyles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
      {/* Top section — illustration area */}
      <View style={[styles.illustrationSection, { height: '45%' }]}>
        <Animated.View
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              top: circleCenterFromTop - circleSize / 2,
            },
            { opacity: circleOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              top: circleCenterFromTop - 80,
              opacity: circleOpacity,
              transform: [{ scale: iconScale }],
            },
          ]}
          accessible
          accessibilityLabel="App icon illustration with envelope and key"
        >
          <View style={styles.iconRect}>
            <Ionicons
              name="mail-open"
              size={36}
              color="rgba(250,249,246,0.7)"
              style={styles.envelopeIcon}
            />
            <View style={styles.keyBadge}>
              <Ionicons name="key" size={12} color="#1E2235" />
            </View>
          </View>
          <View style={styles.encryptedRow}>
            <Ionicons
              name="lock-closed"
              size={14}
              color="rgba(250,249,246,0.35)"
              style={styles.lockIcon}
            />
            <Text style={styles.encryptedText}>Encrypted on this device</Text>
          </View>
        </Animated.View>
      </View>

      {/* Headline text block */}
      <View style={styles.headlineSection}>
        <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineY }] }}>
          <Text style={styles.headlineLine1} maxFontSizeMultiplier={1.5}>
            Everything stays
          </Text>
          <Text style={styles.headlineLine2} maxFontSizeMultiplier={1.5}>
            on your phone.
          </Text>
        </Animated.View>
        <View style={styles.headlineSpacer} />
        <Animated.View style={{ opacity: bodyOpacity, transform: [{ translateY: bodyY }] }}>
          <Text style={styles.bodyCopy} maxFontSizeMultiplier={1.5}>
            No cloud. No server. Not even us.{'\n'}
            AES-256 encrypted. Secure Enclave protected.{'\n'}
            Only you hold the key.
          </Text>
        </Animated.View>

        {/* Trust pillars row */}
        <View style={styles.pillsRow}>
          <Animated.View style={{ opacity: pill1Opacity, transform: [{ translateY: pill1Y }] }}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>AES-256</Text>
            </View>
          </Animated.View>
          <Animated.View style={{ opacity: pill2Opacity, transform: [{ translateY: pill2Y }] }}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Secure Enclave</Text>
            </View>
          </Animated.View>
          <Animated.View style={{ opacity: pill3Opacity, transform: [{ translateY: pill3Y }] }}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Zero knowledge</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={styles.spacer} />

      {/* Primary CTA button */}
      <Animated.View style={[styles.buttonSection, { opacity: buttonOpacity, transform: [{ translateY: buttonY }] }]}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [onboardingStyles.ctaButton, pressed && onboardingStyles.ctaButtonPressed]}
          accessible
          accessibilityLabel="Got it. Your documents never leave this device"
          accessibilityRole="button"
        >
          <Text style={styles.ctaLine1} maxFontSizeMultiplier={1.5}>
            Got it
          </Text>
          <Text style={styles.ctaLine2} maxFontSizeMultiplier={1.5}>
            Your documents never leave this device
          </Text>
        </Pressable>
      </Animated.View>

      {/* Progress dots — position 2 of 8 */}
      <Animated.View style={[styles.dotsSection, { opacity: dotsOpacity }]}>
        <View style={onboardingStyles.dotsRow}>
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotActive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  illustrationSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    backgroundColor: '#252840',
    alignSelf: 'center',
  },
  iconWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  iconRect: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#1E2235',
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeIcon: {
    marginBottom: 4,
  },
  keyBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C9963A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  encryptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  lockIcon: {
    marginRight: 2,
  },
  encryptedText: {
    fontSize: 11,
    color: 'rgba(250,249,246,0.35)',
  },
  headlineSection: {
    alignItems: 'center',
  },
  headlineLine1: {
    fontFamily: SERIF_FONT,
    fontSize: 28,
    fontWeight: '700',
    color: '#FAF9F6',
    textAlign: 'center',
    lineHeight: 34,
  },
  headlineLine2: {
    fontFamily: SERIF_FONT,
    fontSize: 28,
    fontWeight: '700',
    color: '#C9963A',
    textAlign: 'center',
    lineHeight: 34,
    marginTop: 2,
  },
  headlineSpacer: {
    height: 16,
  },
  bodyCopy: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(250,249,246,0.52)',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 0,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    backgroundColor: '#1E2235',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    color: '#C9963A',
  },
  spacer: {
    flex: 1,
  },
  buttonSection: {
    width: '100%',
    paddingBottom: 8,
  },
  ctaLine1: {
    fontFamily: SERIF_FONT,
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3142',
  },
  ctaLine2: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(45,49,66,0.65)',
    marginTop: 2,
  },
  dotsSection: {
    paddingBottom: 20,
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

/**
 * Onboarding Screen 5: "Biometric Setup"
 * First action screen — user interacts with Face ID / Touch ID.
 * Per spec: lock icon, ring animation, success state, error handling.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { KeyManager } from '../../core/auth/KeyManager';
import { colors } from '../../theme/colors';
import { onboardingStyles } from './shared/onboardingStyles';
import { SERIF_FONT } from '../../theme/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface OnboardingScreen5Props {
  onContinue: () => void;
  onBack?: () => void;
}

const RING_DIAMETER = 100;
const RING_STROKE = 2;
const RING_R = (RING_DIAMETER - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

export function OnboardingScreen5({ onContinue, onBack }: OnboardingScreen5Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const circleSize = width * 0.8;
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'passcode'>('face');

  const circleOpacity = useRef(new Animated.Value(0)).current;
  const lockScale = useRef(new Animated.Value(0.6)).current;
  const ringTrim = useRef(new Animated.Value(0)).current;
  const lockColor = useRef(new Animated.Value(1)).current; // 1 = white, 0 = amber
  const ringFill = useRef(new Animated.Value(0)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(12)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyY = useRef(new Animated.Value(8)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaY = useRef(new Animated.Value(12)).current;
  const passcodeOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    };
  }, []);

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      } else {
        setBiometricType('passcode');
      }
    });
  }, []);

  useEffect(() => {
    // All animations use useNativeDriver: false to avoid a crash on physical
    // devices when mixing native-driver and JS-driver animations in the same
    // Animated.parallel / Animated.sequence tree. The SVG strokeDashoffset
    // animation (ringTrim) requires useNativeDriver: false, so all siblings
    // must also use false to keep the animation tree consistent.
    const circleAnim = Animated.timing(circleOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    });
    const lockAnim = Animated.timing(lockScale, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    });
    const ringDrawAnim = Animated.timing(ringTrim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    });
    const headlineAnim = Animated.parallel([
      Animated.timing(headlineOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(headlineY, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]);
    const bodyAnim = Animated.parallel([
      Animated.timing(bodyOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(bodyY, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]);
    const ctaAnim = Animated.parallel([
      Animated.timing(ctaOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(ctaY, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]);
    const passcodeAnim = Animated.timing(passcodeOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    });

    Animated.sequence([
      circleAnim,
      Animated.parallel([
        Animated.sequence([Animated.delay(100), lockAnim]),
        Animated.sequence([Animated.delay(200), ringDrawAnim]),
      ]),
      Animated.sequence([Animated.delay(300), headlineAnim]),
      Animated.sequence([Animated.delay(400), bodyAnim]),
      Animated.sequence([Animated.delay(500), ctaAnim]),
      Animated.sequence([Animated.delay(600), passcodeAnim]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runErrorAnimation = () => {
    setError(true);
    Animated.sequence([
      Animated.timing(ringScale, { toValue: 1.05, duration: 100, useNativeDriver: false }),
      Animated.timing(ringScale, { toValue: 1, duration: 100, useNativeDriver: false }),
    ]).start(() => setError(false));
  };

  const runSuccessAnimation = () => {
    setAuthenticated(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.timing(lockColor, { toValue: 0, duration: 300, useNativeDriver: false }),
      Animated.timing(ringFill, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();

    continueTimerRef.current = setTimeout(() => {
      onContinue();
    }, 600);
  };

  /**
   * Shared helper: initializes vault keys and advances to the next screen.
   * Called after successful authentication or when no auth is available.
   */
  const finalizeKeySetup = async () => {
    const hasKeys = await KeyManager.isInitialized();
    if (!hasKeys) {
      await KeyManager.initializeKeys();
    }
    runSuccessAnimation();
  };

  const handlePrimaryCTA = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // No biometric hardware at all (some emulators) — skip auth entirely.
      // KeyManager will store the key without requireAuthentication.
      if (!hasHardware) {
        await finalizeKeySetup();
        return;
      }

      // Hardware present but nothing enrolled (Android emulator without a
      // configured fingerprint, or fresh device with no PIN set).
      // On Android, calling authenticateAsync() in this state throws a
      // native exception instead of returning { success: false }, which
      // causes an app crash. Skip the prompt and set up the vault anyway.
      // On Android only: skip auth when nothing is enrolled to prevent a native
      // crash. On iOS we always proceed to authenticateAsync() even when
      // isEnrolled=false because that call is what triggers the Face ID
      // permission dialog before the OS considers biometrics "enrolled".
      if (Platform.OS === 'android' && !isEnrolled) {
        await finalizeKeySetup();
        return;
      }

      // Normal path: biometrics present and enrolled.
      // On physical iOS, isEnrolledAsync() may return false before Face ID
      // permission is granted, so calling authenticateAsync() first is
      // required — the OS requests permission before proceeding.
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometrics to protect your vault',
        disableDeviceFallback: false,
        cancelLabel: 'Use passcode',
      });

      if (!authResult.success) {
        runErrorAnimation();
        return;
      }

      await finalizeKeySetup();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Biometric setup error:', msg);
      // Last-resort fallback — never leave the user permanently stuck.
      try {
        await finalizeKeySetup();
      } catch {
        runErrorAnimation();
      }
    }
  };

  const handlePasscodeFallback = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // If no credentials are configured on this device (emulator or fresh
      // device with no PIN), skip the prompt and initialize keys directly.
      if (!hasHardware || !isEnrolled) {
        await finalizeKeySetup();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to secure your vault',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await finalizeKeySetup();
      } else {
        runErrorAnimation();
      }
    } catch {
      // On emulator, authenticateAsync can throw instead of returning failure.
      // Fall through to finalizeKeySetup so the user is never stuck.
      try {
        await finalizeKeySetup();
      } catch {
        runErrorAnimation();
      }
    }
  };

  const ringStrokeOffset = ringTrim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  const ctaLabel =
    biometricType === 'face'
      ? 'Enable Face ID'
      : biometricType === 'fingerprint'
        ? Platform.OS === 'android' ? 'Enable Fingerprint' : 'Enable Touch ID'
        : 'Set up passcode';

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
      <View style={styles.content}>
        {/* Top section — illustration */}
        <View style={[styles.illustrationSection, { marginTop: '15%' }]}>
          <View style={[styles.circleBg, { width: circleSize, height: circleSize }]}>
            <Animated.View style={[{ opacity: circleOpacity }, { transform: [{ scale: ringScale }] }]}>
              <View style={styles.ringWrapper}>
                <Svg width={RING_DIAMETER} height={RING_DIAMETER} style={styles.ringSvg}>
                  <AnimatedCircle
                    cx={RING_DIAMETER / 2}
                    cy={RING_DIAMETER / 2}
                    r={RING_R}
                    fill="none"
                    stroke={error ? colors.amDanger : authenticated ? colors.amAmber : 'rgba(201,150,58,0.5)'}
                    strokeWidth={RING_STROKE}
                    strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                    strokeDashoffset={ringStrokeOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${RING_DIAMETER / 2} ${RING_DIAMETER / 2})`}
                  />
                </Svg>
                <Animated.View
                  style={[
                    styles.lockWrapper,
                    {
                      transform: [{ scale: lockScale }],
                    },
                  ]}
                >
                  <Ionicons
                    name={authenticated ? 'lock-open' : 'lock-closed'}
                    size={64}
                    color={authenticated ? colors.amAmber : 'rgba(250,249,246,0.75)'}
                  />
                </Animated.View>
              </View>
              <View style={styles.separator} />
              <Text style={styles.biometricLabel}>Biometric lock</Text>
            </Animated.View>
          </View>
        </View>

        {/* Headline */}
        <Animated.View
          style={[
            styles.headlineBlock,
            { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
          ]}
        >
          <Text style={styles.headline1}>Your vault needs</Text>
          <Text style={styles.headline2}>a guardian.</Text>
        </Animated.View>

        {/* Body */}
        <Animated.View
          style={[
            styles.bodyBlock,
            { opacity: bodyOpacity, transform: [{ translateY: bodyY }] },
          ]}
        >
          <Text style={styles.bodyText}>
            {Platform.OS === 'android'
              ? 'After Me uses your fingerprint or biometrics.'
              : 'After Me uses Face ID or Touch ID.'}{'\n'}
            No passwords to remember or forget.{'\n'}
            Nobody else can open your vault.
          </Text>
        </Animated.View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={{ opacity: ctaOpacity, transform: [{ translateY: ctaY }] }}>
          <Pressable
            style={styles.ctaButton}
            onPress={handlePrimaryCTA}
            disabled={authenticated}
            accessibilityLabel={ctaLabel}
          >
            <Text style={styles.ctaPrimary}>{ctaLabel}</Text>
            <Text style={styles.ctaSecondary}>
              {error ? 'Try again — tap to authenticate' : 'Recommended — keeps your vault private'}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.passcodeRow, { opacity: passcodeOpacity }]}>
          <Pressable onPress={handlePasscodeFallback} style={styles.passcodeTouchable}>
            <Text style={styles.passcodeText}>Use passcode instead</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Progress dots — position 7 of 8 */}
      <View style={[styles.dotsSection, { paddingBottom: insets.bottom + 12 }]}>
        <View style={[onboardingStyles.dotsRow, { justifyContent: 'center' }]}>
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, { width: 20, backgroundColor: colors.amAmber }]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
  },
  illustrationSection: {
    alignItems: 'center',
  },
  circleBg: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.amDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  lockWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 80,
    height: 0.5,
    backgroundColor: 'rgba(250,249,246,0.15)',
    marginTop: 8,
  },
  biometricLabel: {
    fontSize: 12,
    color: 'rgba(250,249,246,0.38)',
    marginTop: 8,
  },
  headlineBlock: {
    alignItems: 'center',
    marginTop: 24,
  },
  headline1: {
    fontFamily: SERIF_FONT,
    fontSize: 28,
    fontWeight: '700',
    color: colors.amWhite,
  },
  headline2: {
    fontFamily: SERIF_FONT,
    fontSize: 28,
    fontWeight: '700',
    color: colors.amAmber,
  },
  bodyBlock: {
    paddingHorizontal: 32,
    marginTop: 16,
    alignItems: 'center',
  },
  bodyText: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(250,249,246,0.52)',
    lineHeight: 24,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 0,
  },
  ctaButton: {
    backgroundColor: colors.amAmber,
    height: 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaPrimary: {
    fontFamily: SERIF_FONT,
    fontSize: 18,
    fontWeight: '700',
    color: colors.amBackground,
  },
  ctaSecondary: {
    fontSize: 12,
    color: 'rgba(45,49,66,0.65)',
    marginTop: 4,
  },
  passcodeRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  passcodeTouchable: {
    padding: 8,
  },
  passcodeText: {
    fontSize: 14,
    color: 'rgba(250,249,246,0.38)',
    textDecorationLine: 'underline',
  },
  dotsSection: {
    paddingTop: 12,
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

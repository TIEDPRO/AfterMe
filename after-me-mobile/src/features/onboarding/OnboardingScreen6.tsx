/**
 * Onboarding Screen 6: "The Safety Net"
 * Final screen after biometric setup. Three choices: iCloud backup, create kit, or defer.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { BackupService } from '../../services/BackupService';
import { OnboardingStorage } from '../../services/OnboardingStorage';
import { CLOUD_PROVIDER_NAME } from '../../services/CloudBackupService';
import { KeyManager } from '../../core/auth/KeyManager';
import { onboardingStyles } from './shared/onboardingStyles';
import { SERIF_FONT } from '../../theme/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type SafetyNetChoice = 'icloud' | 'kit' | 'defer';

interface OnboardingScreen6Props {
  onComplete: (choice: SafetyNetChoice) => Promise<void>;
  onBack?: () => void;
}

const RING_SIZE = 80;
const RING_STROKE = 2.5;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

export function OnboardingScreen6({ onComplete, onBack }: OnboardingScreen6Props) {
  const insets = useSafeAreaInsets();
  const horizPad = 32;
  const [processing, setProcessing] = useState(false);

  const ringTrim = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0.8)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(8)).current;
  const subheadOpacity = useRef(new Animated.Value(0)).current;
  const subheadY = useRef(new Animated.Value(8)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyY = useRef(new Animated.Value(8)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1Y = useRef(new Animated.Value(20)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(20)).current;
  const deferOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ringAnim = Animated.timing(ringTrim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    });

    // ringTrim animates SVG strokeDashoffset (non-native); keep the whole sequence
    // on useNativeDriver: false to avoid mixing drivers (see OnboardingScreen5).
    const checkmarkAnim = Animated.parallel([
      Animated.timing(checkmarkOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(checkmarkScale, {
        toValue: 1,
        useNativeDriver: false,
        speed: 2,
        bounciness: 4,
      }),
    ]);

    const headlineAnim = Animated.parallel([
      Animated.timing(headlineOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(headlineY, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]);
    const subheadAnim = Animated.parallel([
      Animated.timing(subheadOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(subheadY, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]);
    const bodyAnim = Animated.parallel([
      Animated.timing(bodyOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(bodyY, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]);

    const card1YSpring = Animated.spring(card1Y, {
      toValue: 0,
      useNativeDriver: false,
      speed: 0.5,
      bounciness: 0.8,
    });
    const card1Anim = Animated.parallel([
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(card1Opacity, { toValue: 1, duration: 450, useNativeDriver: false }),
      ]),
      Animated.sequence([Animated.delay(700), card1YSpring]),
    ]);

    const card2YSpring = Animated.spring(card2Y, {
      toValue: 0,
      useNativeDriver: false,
      speed: 0.5,
      bounciness: 0.8,
    });
    const card2Anim = Animated.parallel([
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(card2Opacity, { toValue: 1, duration: 450, useNativeDriver: false }),
      ]),
      Animated.sequence([Animated.delay(800), card2YSpring]),
    ]);

    const deferAnim = Animated.timing(deferOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    });

    const dotsAnim = Animated.timing(dotsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    });

    const hapticTimer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 700);

    Animated.sequence([
      ringAnim,
      Animated.delay(400),
      checkmarkAnim,
      Animated.delay(100),
      headlineAnim,
      Animated.delay(100),
      subheadAnim,
      Animated.delay(50),
      bodyAnim,
      Animated.delay(50),
      Animated.parallel([
        Animated.sequence([Animated.delay(200), card1Anim]),
        Animated.sequence([Animated.delay(250), card2Anim]),
      ]),
      Animated.sequence([Animated.delay(200), deferAnim]),
      Animated.delay(50),
      dotsAnim,
    ]).start();

    return () => clearTimeout(hapticTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStrokeOffset = ringTrim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  const completeOnboarding = async (choice: SafetyNetChoice) => {
    setProcessing(true);
    try {
      const hasKeys = await KeyManager.isInitialized();
      if (!hasKeys) {
        await KeyManager.initializeKeys();
      }

      if (choice === 'icloud') {
        await OnboardingStorage.setIcloudBackupEnabled(true);
        await BackupService.enableIcloudBackup();
      } else if (choice === 'defer') {
        await OnboardingStorage.setSafetyNetDeferred(true);
        await OnboardingStorage.setSafetyNetDeferredDate(new Date().toISOString());
      } else if (choice === 'kit') {
        await OnboardingStorage.setShowFamilyKitCreationImmediately(true);
      }

      await OnboardingStorage.setHasCompletedOnboarding(true);
      await onComplete(choice);
    } catch (e) {
      console.error('Failed to complete onboarding choice:', e);
    } finally {
      setProcessing(false);
    }
  };

  const handleChoice = async (choice: SafetyNetChoice) => {
    if (choice === 'defer') {
      Alert.alert(
        'Are you sure?',
        'Without a safety net, your vault contents could be permanently lost if this device is lost, stolen, or damaged.\n\nYou can set one up later in Settings.',
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Continue without safety net',
            style: 'destructive',
            onPress: () => completeOnboarding('defer'),
          },
        ],
      );
      return;
    }
    await completeOnboarding(choice);
  };

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
        {/* Top section — completion confirmation */}
        <View style={styles.topSection}>
          <View style={styles.checkmarkWrapper}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                fill="none"
                stroke="rgba(201,150,58,0.7)"
                strokeWidth={RING_STROKE}
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={ringStrokeOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <Animated.View
              style={[
                styles.checkmarkInner,
                {
                  opacity: checkmarkOpacity,
                  transform: [{ scale: checkmarkScale }],
                },
              ]}
            >
              <Ionicons name="checkmark" size={32} color="#C9963A" />
            </Animated.View>
          </View>

          <View style={styles.headlineGap} />
          <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineY }] }}>
            <Text style={styles.headline}>One last step.</Text>
          </Animated.View>
          <View style={styles.subheadGap} />
          <Animated.View style={{ opacity: subheadOpacity, transform: [{ translateY: subheadY }] }}>
            <Text style={styles.subhead}>Two very different things.</Text>
          </Animated.View>
          <View style={styles.bodyGap} />
          <Animated.View
            style={[
              styles.bodyWrap,
              { paddingHorizontal: horizPad, opacity: bodyOpacity, transform: [{ translateY: bodyY }] },
            ]}
          >
            <Text style={styles.bodyCopy}>
              A Family Kit gives your loved ones access.{'\n'}
              {CLOUD_PROVIDER_NAME} Backup protects you if you lose this device.{'\n'}
              They are not the same thing.
            </Text>
          </Animated.View>
        </View>

        {/* Choice cards */}
        <View style={[styles.cardsSection, { paddingHorizontal: horizPad }]}>
          {/* Card 1 — Family Kit (ESSENTIAL for family access) */}
          <Animated.View
            style={{
              opacity: card1Opacity,
              transform: [{ translateY: card1Y }],
            }}
          >
            <Pressable
              onPress={() => handleChoice('kit')}
              disabled={processing}
              style={({ pressed }) => [
                styles.card,
                styles.cardRecommended,
                { opacity: processing ? 0.5 : 1 },
                pressed && styles.cardPressed,
              ]}
              accessible
              accessibilityLabel="I will create a Family Kit. Your family only way in. Set up after adding your first document."
              accessibilityRole="button"
            >
              <View style={styles.cardAccentBar} />
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>For your family</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardPrimary}>I&apos;ll create a Family Kit</Text>
                <Text style={styles.cardSecondary}>
                  Your family&apos;s only way in.{'\n'}Set up after you&apos;ve added your first document.
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          <View style={styles.cardGap} />

          {/* Card 2 — Cloud backup (iCloud on iOS, Google Drive on Android) */}
          <Animated.View
            style={{
              opacity: card2Opacity,
              transform: [{ translateY: card2Y }],
            }}
          >
            <Pressable
              onPress={() => handleChoice('icloud')}
              disabled={processing}
              style={({ pressed }) => [
                styles.card,
                styles.cardKit,
                { opacity: processing ? 0.5 : 1 },
                pressed && styles.cardPressedKit,
              ]}
              accessible
              accessibilityLabel={`Enable ${CLOUD_PROVIDER_NAME} Backup. For you only. Does not give your family access to this vault.`}
              accessibilityRole="button"
            >
              <View style={styles.cardBadgeSecondary}>
                <Text style={styles.cardBadgeSecondaryText}>For you only</Text>
              </View>
              <View style={styles.cardContentKit}>
                <Text style={styles.cardPrimary}>Enable {CLOUD_PROVIDER_NAME} Backup</Text>
                <Text style={styles.cardSecondary}>
                  If YOU lose this device. Does not give{'\n'}your family access to the vault.
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>

        {/* Defer option */}
        <Animated.View style={[styles.deferSection, { opacity: deferOpacity }]}>
          <Pressable
            onPress={() => handleChoice('defer')}
            disabled={processing}
            style={[styles.deferTouchable, { opacity: processing ? 0.5 : 1 }]}
            accessible
            accessibilityLabel="Set this up later"
            accessibilityRole="button"
          >
            <Text style={styles.deferText}>Set this up later</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Progress dots — position 8 of 8 */}
      <View style={[styles.dotsSection, { paddingBottom: insets.bottom + 20 }]}>
        <View style={onboardingStyles.dotsRow}>
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotActive]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D3142',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  topSection: {
    minHeight: '35%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  checkmarkWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  checkmarkInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineGap: { height: 16 },
  headline: {
    fontFamily: SERIF_FONT,
    fontSize: 22,
    fontWeight: '700',
    color: '#FAF9F6',
    textAlign: 'center',
  },
  subheadGap: { height: 8 },
  subhead: {
    fontFamily: SERIF_FONT,
    fontSize: 22,
    fontWeight: '700',
    color: '#C9963A',
    textAlign: 'center',
  },
  bodyGap: { height: 10 },
  bodyWrap: {
    alignItems: 'center',
  },
  bodyCopy: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(250,249,246,0.48)',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsSection: {
    marginTop: 24,
    gap: 12,
  },
  card: {
    minHeight: 76,
    borderRadius: 14,
    backgroundColor: '#1E2235',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingLeft: 16,
    paddingVertical: 14,
  },
  cardRecommended: {
    borderWidth: 1.5,
    borderColor: 'rgba(201,150,58,0.5)',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: 'rgba(201,150,58,0.9)',
  },
  cardKit: {
    borderWidth: 1,
    borderColor: 'rgba(250,249,246,0.18)',
  },
  cardPressedKit: {
    transform: [{ scale: 0.98 }],
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 3,
    backgroundColor: 'rgba(201,150,58,0.7)',
    borderRadius: 1.5,
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(201,150,58,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#C9963A',
  },
  cardContent: {
    paddingRight: 92,
  },
  cardContentKit: {
    paddingRight: 72,
  },
  cardBadgeSecondary: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(250,249,246,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardBadgeSecondaryText: {
    fontFamily: 'System',
    fontSize: 10,
    color: 'rgba(250,249,246,0.4)',
  },
  cardPrimary: {
    fontFamily: SERIF_FONT,
    fontSize: 16,
    fontWeight: '700',
    color: '#FAF9F6',
  },
  cardSecondary: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(250,249,246,0.48)',
    marginTop: 4,
  },
  cardGap: { height: 12 },
  deferSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  deferTouchable: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deferText: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(250,249,246,0.24)',
  },
  dotsSection: {
    paddingHorizontal: 32,
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
    color: '#C9963A',
  },
});

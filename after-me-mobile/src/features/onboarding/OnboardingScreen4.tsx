/**
 * Onboarding Screen 4: "The Magic Moment"
 * The emotional centrepiece — QR Family Kit reveal.
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
import { onboardingStyles } from './shared/onboardingStyles';
import { SERIF_FONT } from '../../theme/fonts';

/**
 * Decorative QR-like pattern — NOT a real scannable QR code.
 * Flat list of cells: { w, h, opacity } for staggered render.
 */
const QR_DATA_CELLS: { w: number; h: number; opacity: number }[] = [
  { w: 10, h: 8, opacity: 0.45 }, { w: 8, h: 8, opacity: 0.6 }, { w: 8, h: 8, opacity: 0.35 }, { w: 10, h: 8, opacity: 0.5 }, { w: 8, h: 8, opacity: 0.4 },
  { w: 8, h: 8, opacity: 0.55 }, { w: 12, h: 8, opacity: 0.3 }, { w: 8, h: 8, opacity: 0.65 }, { w: 8, h: 8, opacity: 0.45 }, { w: 10, h: 8, opacity: 0.5 },
  { w: 10, h: 8, opacity: 0.4 }, { w: 8, h: 8, opacity: 0.55 }, { w: 10, h: 8, opacity: 0.35 }, { w: 8, h: 8, opacity: 0.6 }, { w: 8, h: 8, opacity: 0.45 },
  { w: 8, h: 8, opacity: 0.5 }, { w: 10, h: 8, opacity: 0.4 }, { w: 8, h: 8, opacity: 0.7 }, { w: 12, h: 8, opacity: 0.3 }, { w: 8, h: 8, opacity: 0.55 },
  { w: 8, h: 8, opacity: 0.45 }, { w: 8, h: 8, opacity: 0.6 }, { w: 8, h: 8, opacity: 0.4 }, { w: 10, h: 8, opacity: 0.5 }, { w: 10, h: 8, opacity: 0.35 },
];

interface OnboardingScreen4Props {
  onContinue: () => void;
  onBack?: () => void;
}

export function OnboardingScreen4({ onContinue, onBack }: OnboardingScreen4Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const circleSize = width * 0.8;
  const circleCenterFromTop = height * 0.35;

  const circleOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(0.85)).current;
  const cellAnims = useRef<Animated.Value[]>(
    QR_DATA_CELLS.map(() => new Animated.Value(0))
  ).current;
  const cornerAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(12)).current;
  const body1Opacity = useRef(new Animated.Value(0)).current;
  const body2Opacity = useRef(new Animated.Value(0)).current;
  const body3Opacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(12)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const circleAnim = Animated.timing(circleOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });

    const containerAnim = Animated.parallel([
      Animated.timing(containerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(containerScale, {
        toValue: 1,
        delay: 100,
        useNativeDriver: true,
        speed: 1.67,
        bounciness: 2,
      }),
    ]);

    const cellStagger = Animated.stagger(
      20,
      cellAnims.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true })
      )
    );

    const cornerAnim = Animated.parallel(
      cornerAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 2,
          bounciness: 6,
        })
      )
    );

    const labelAnim = Animated.timing(labelOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });

    const headlineAnim = Animated.parallel([
      Animated.timing(headlineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headlineY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    const bodyAnim = Animated.stagger(80, [
      Animated.timing(body1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(body2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(body3Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
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
      Animated.sequence([Animated.delay(100), containerAnim]),
      Animated.sequence([
        Animated.delay(200),
        cellStagger,
      ]),
      Animated.sequence([
        Animated.delay(50),
        cornerAnim,
      ]),
      Animated.sequence([
        Animated.delay(250),
        labelAnim,
      ]),
      Animated.sequence([
        Animated.delay(50),
        headlineAnim,
      ]),
      Animated.sequence([
        Animated.delay(100),
        bodyAnim,
      ]),
      Animated.sequence([
        Animated.delay(50),
        buttonAnim,
      ]),
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
      {/* Top section — illustration */}
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
            styles.qrWrapper,
            {
              top: circleCenterFromTop - 95,
              opacity: containerOpacity,
              transform: [{ scale: containerScale }],
            },
          ]}
          accessible
          accessibilityLabel="QR code illustration for family vault"
        >
          <View style={styles.qrContainer}>
            {/* Corner anchor blocks — appear last with bounce */}
            <Animated.View
              style={[
                styles.cornerBlock,
                styles.cornerTL,
                { opacity: cornerAnims[0], transform: [{ scale: cornerAnims[0].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
              ]}
            >
              <View style={styles.cornerInner} />
            </Animated.View>
            <Animated.View
              style={[
                styles.cornerBlock,
                styles.cornerTR,
                { opacity: cornerAnims[1], transform: [{ scale: cornerAnims[1].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
              ]}
            >
              <View style={styles.cornerInner} />
            </Animated.View>
            <Animated.View
              style={[
                styles.cornerBlock,
                styles.cornerBL,
                { opacity: cornerAnims[2], transform: [{ scale: cornerAnims[2].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
              ]}
            >
              <View style={styles.cornerInner} />
            </Animated.View>

            {/* Data cells — centre area, decorative only */}
            <View style={styles.dataGrid}>
              {[0, 1, 2, 3, 4].map((rowIdx) => (
                <View key={rowIdx} style={styles.dataRow}>
                  {QR_DATA_CELLS.slice(rowIdx * 5, rowIdx * 5 + 5).map((cell, colIdx) => {
                    const idx = rowIdx * 5 + colIdx;
                    const anim = cellAnims[idx];
                    return (
                      <Animated.View
                        key={idx}
                        style={[
                          styles.dataCell,
                          {
                            width: cell.w,
                            height: cell.h,
                            backgroundColor: `rgba(201,150,58,${cell.opacity})`,
                            opacity: anim,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <Animated.View style={[styles.scanLabelRow, { opacity: labelOpacity }]}>
            <Text style={styles.scanLabel}>Scan to open family vault</Text>
            <View style={styles.amberLine} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Headline text block */}
      <View style={styles.headlineSection}>
        <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineY }] }}>
          <Text style={styles.headlineLine1} maxFontSizeMultiplier={1.5}>
            One QR code.
          </Text>
          <Text style={styles.headlineLine2} maxFontSizeMultiplier={1.5}>
            Your family is sorted.
          </Text>
        </Animated.View>
        <View style={styles.headlineSpacer} />
        <Animated.View style={styles.bodySection}>
          <Animated.Text style={[styles.bodyCopy, { opacity: body1Opacity }]} maxFontSizeMultiplier={1.5}>
            Print it. Save it. Give it to someone you trust.
          </Animated.Text>
          <Animated.Text style={[styles.bodyCopy, { opacity: body2Opacity }]} maxFontSizeMultiplier={1.5}>
            They scan it. Everything opens instantly.
          </Animated.Text>
          <Animated.Text style={[styles.bodyCopy, styles.bodyLast, { opacity: body3Opacity }]} maxFontSizeMultiplier={1.5}>
            No account. No password. No fuss.
          </Animated.Text>
        </Animated.View>
      </View>

      <View style={styles.spacer} />

      {/* Primary CTA button */}
      <Animated.View style={[styles.buttonSection, { opacity: buttonOpacity, transform: [{ translateY: buttonY }] }]}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [onboardingStyles.ctaButton, pressed && onboardingStyles.ctaButtonPressed]}
          accessible
          accessibilityLabel="That's brilliant. I'll create my Family Kit when ready"
          accessibilityRole="button"
        >
          <Text style={styles.ctaLine1} maxFontSizeMultiplier={1.5}>
            That&apos;s brilliant
          </Text>
          <Text style={styles.ctaLine2} maxFontSizeMultiplier={1.5}>
            I&apos;ll create my Family Kit when ready
          </Text>
        </Pressable>
      </Animated.View>

      {/* Progress dots — position 4 of 8 */}
      <Animated.View style={[styles.dotsSection, { opacity: dotsOpacity }]}>
        <View style={onboardingStyles.dotsRow}>
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotInactive]} />
          <View style={[onboardingStyles.dot, onboardingStyles.dotActive]} />
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
  qrWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  qrContainer: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#1E2235',
    overflow: 'hidden',
  },
  cornerBlock: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(201,150,58,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerInner: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#1E2235',
  },
  cornerTL: { top: 4, left: 4 },
  cornerTR: { top: 4, right: 4 },
  cornerBL: { bottom: 4, left: 4 },
  dataGrid: {
    position: 'absolute',
    top: 36,
    left: 36,
    right: 36,
    bottom: 36,
    gap: 4,
  },
  dataRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  dataCell: {
    borderRadius: 2,
  },
  scanLabelRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  scanLabel: {
    fontSize: 11,
    color: 'rgba(250,249,246,0.32)',
  },
  amberLine: {
    width: 80,
    height: 1.5,
    backgroundColor: 'rgba(201,150,58,0.35)',
    marginTop: 8,
    borderRadius: 1,
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
  bodySection: {
    alignItems: 'center',
  },
  bodyCopy: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(250,249,246,0.52)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 6,
  },
  bodyLast: {
    marginBottom: 0,
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

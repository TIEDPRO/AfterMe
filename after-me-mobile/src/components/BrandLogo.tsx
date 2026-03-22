/**
 * After Me brand logo (icon + wordmark) from afterme-brand-assets
 * variant: 'light' for light backgrounds, 'dark' for dark/slate backgrounds
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import Svg, { Rect, Path, Circle, Line } from 'react-native-svg';
import { SERIF_FONT } from '../theme/fonts';

interface BrandLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  variant?: 'light' | 'dark';
  style?: ViewStyle;
}

const SIZES = {
  small: { icon: 40, fontSize: 22 },
  medium: { icon: 56, fontSize: 28 },
  large: { icon: 72, fontSize: 36 },
};

export function BrandLogo({ size = 'medium', showTagline = false, variant = 'light', style }: BrandLogoProps) {
  const { icon: iconSize, fontSize } = SIZES[size];
  const iconBg = variant === 'dark' ? '#1E2235' : '#2D3142';
  const afterColor = variant === 'dark' ? '#FAF9F6' : '#2D3142';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 136 136">
          <Rect x="0" y="0" width="136" height="136" rx="30" fill={iconBg} />
          <Rect
            x="28"
            y="33"
            width="80"
            height="56"
            rx="7"
            fill="none"
            stroke="#FAF9F6"
            strokeWidth="4"
          />
          <Path
            d="M28 45 L68 68 L108 45"
            fill="none"
            stroke="#FAF9F6"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx="98" cy="65" r="20" fill="#C9963A" />
          <Circle cx="98" cy="65" r="10" fill="none" stroke="#2D3142" strokeWidth="3" />
          <Line x1="98" y1="70" x2="98" y2="80" stroke="#2D3142" strokeWidth="3" strokeLinecap="round" />
          <Line x1="98" y1="76" x2="104" y2="76" stroke="#2D3142" strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
        <View style={styles.wordmark}>
          <Text style={[styles.after, { fontSize, color: afterColor }]}>after</Text>
          <Text style={[styles.me, { fontSize }]}>me</Text>
        </View>
      </View>
      {showTagline && (
        <Text style={styles.tagline}>YOUR LEGACY. THEIR PEACE OF MIND.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  after: {
    fontFamily: SERIF_FONT,
    fontWeight: '700',
    letterSpacing: -1,
  },
  me: {
    fontFamily: SERIF_FONT,
    fontWeight: '700',
    color: '#C9963A',
    letterSpacing: -1,
    marginLeft: 4,
  },
  tagline: {
    fontFamily: SERIF_FONT,
    fontSize: 11,
    color: '#2D3142',
    opacity: 0.38,
    letterSpacing: 2,
    marginTop: 6,
  },
});

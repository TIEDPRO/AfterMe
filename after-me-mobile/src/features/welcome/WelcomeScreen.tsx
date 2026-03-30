import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { colors } from '../../theme/colors';

interface WelcomeScreenProps {
  onPlanningLegacy: () => void;
  onHaveKit: () => void;
  onRestoreVault?: () => void;
}

export function WelcomeScreen({ onPlanningLegacy, onHaveKit, onRestoreVault }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.radialCircle} />
      <View style={styles.content}>
        <BrandLogo size="large" variant="dark" />
        <Text style={styles.tagline}>Your legacy. Their peace of mind.</Text>
        <Text style={styles.subTagline}>
          Encrypted vault on your device — when the time comes, your plan can reach the right people without your passwords.
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onPlanningLegacy}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Start My Legacy Vault"
        >
          <Text style={styles.primaryButtonText} maxFontSizeMultiplier={3.0}>Start My Legacy Vault</Text>
        </TouchableOpacity>

        <View style={styles.secondaryGroup}>
          <Text style={styles.secondaryDivider}>Already have a vault?</Text>
          <View style={styles.secondaryLinks}>
            <TouchableOpacity
              onPress={onHaveKit}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Open a Family Vault"
            >
              <Text style={styles.secondaryLinkText} maxFontSizeMultiplier={3.0}>Open Family Vault</Text>
            </TouchableOpacity>

            {onRestoreVault && (
              <>
                <Text style={styles.secondaryLinkSep}>·</Text>
                <TouchableOpacity
                  onPress={onRestoreVault}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Restore My Vault"
                >
                  <Text style={styles.secondaryLinkText} maxFontSizeMultiplier={3.0}>Restore My Vault</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <Text style={styles.footer}>Your documents never leave this device</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
    padding: 24,
    justifyContent: 'space-between',
  },
  radialCircle: {
    position: 'absolute',
    top: '-20%',
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.amDeep,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 17,
    color: colors.amWhite,
    opacity: 0.45,
    marginTop: 12,
  },
  subTagline: {
    fontSize: 14,
    color: colors.amWhite,
    opacity: 0.38,
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
    maxWidth: 340,
  },
  buttons: {
    gap: 20,
    alignItems: 'stretch',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.amAmber,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 64,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.amBackground,
    textAlign: 'center',
  },
  secondaryGroup: {
    alignItems: 'center',
    gap: 6,
  },
  secondaryDivider: {
    fontSize: 12,
    color: colors.amWhite,
    opacity: 0.3,
    letterSpacing: 0.3,
  },
  secondaryLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.amWhite,
    opacity: 0.55,
  },
  secondaryLinkSep: {
    fontSize: 14,
    color: colors.amWhite,
    opacity: 0.2,
  },
  footer: {
    fontSize: 11,
    color: colors.amWhite,
    opacity: 0.2,
    marginTop: 8,
    textAlign: 'center',
  },
});

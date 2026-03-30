import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../../theme/colors';
import { settingsStyles as styles } from '../settingsStyles';

interface SubscriptionSectionProps {
  isPremium: boolean;
  isAnnual: boolean;
  isLifetime: boolean;
  restoringPurchases: boolean;
  onUpgrade: () => void;
  onLifetimeUpgrade: () => void;
  onRestorePurchases: () => void;
}

export function SubscriptionSection({
  isPremium,
  isAnnual,
  isLifetime,
  restoringPurchases,
  onUpgrade,
  onLifetimeUpgrade,
  onRestorePurchases,
}: SubscriptionSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={3.0}>Subscription</Text>
      <View style={styles.infoCard}>
        {isLifetime && (
          <View style={styles.lifetimeMemberPill} accessibilityRole="text">
            <Text style={styles.lifetimeMemberPillText} maxFontSizeMultiplier={1.3}>
              Lifetime member
            </Text>
          </View>
        )}
        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionLabel} maxFontSizeMultiplier={3.0}>Status</Text>
          <Text style={[styles.subscriptionValue, { color: isPremium ? colors.success : colors.amAmber }]} maxFontSizeMultiplier={3.0}>
            {isPremium ? 'Premium' : 'Free'}
          </Text>
        </View>
        {!isPremium && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onUpgrade}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Premium"
          >
            <Text style={styles.upgradeButtonText} maxFontSizeMultiplier={3.0}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}

        {isAnnual && (
          <TouchableOpacity
            style={styles.lifetimeUpgradeCard}
            onPress={onLifetimeUpgrade}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Switch to lifetime — pay once, never again"
          >
            <View style={styles.lifetimeUpgradeTop}>
              <View style={styles.lifetimeUpgradeBadge}>
                <Text style={styles.lifetimeUpgradeBadgeText}>UPGRADE AVAILABLE</Text>
              </View>
            </View>
            <Text style={styles.lifetimeUpgradeTitle} maxFontSizeMultiplier={1.3}>
              Switch to Lifetime
            </Text>
            <Text style={styles.lifetimeUpgradeBody} maxFontSizeMultiplier={1.3}>
              Pay once. Then never again — including for your family after you&apos;re gone.
            </Text>
            <Text style={styles.lifetimeUpgradeCTA} maxFontSizeMultiplier={1.3}>
              See offer →
            </Text>
          </TouchableOpacity>
        )}

        {isPremium && (
          <View style={styles.premiumBadgeRow}>
            <Text style={styles.premiumBadgeIcon}>✓</Text>
            <Text style={styles.premiumBadgeLabel} maxFontSizeMultiplier={1.3}>
              {isLifetime ? 'Lifetime access — no renewals, ever' : 'Annual subscription active'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.restorePurchasesButton}
          onPress={onRestorePurchases}
          disabled={restoringPurchases}
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
        >
          {restoringPurchases ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={styles.restorePurchasesText} maxFontSizeMultiplier={3.0}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

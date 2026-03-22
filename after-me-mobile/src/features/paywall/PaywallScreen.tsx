/**
 * Paywall screen — shown when a free-tier user hits a premium gate,
 * or when an annual subscriber is offered the lifetime upgrade.
 *
 * Layout strategy (per pricing doc):
 *  - Lifetime is the HERO product — shown first, larger, amber border always on.
 *  - Annual is the secondary "start smaller" option below it.
 *  - Break-even calculation is shown explicitly so users don't have to do maths.
 *  - "No renewal risk at death" framing is unique to After Me and must be visible.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePurchase } from '../../context/PurchaseContext';
import { PurchaseService } from '../../services/PurchaseService';
import {
  PRODUCT_IDS,
  PREMIUM_FEATURES_LIFETIME,
  PREMIUM_FEATURES_ANNUAL,
  FREE_TIER_DOCUMENT_LIMIT,
  ANNUAL_DISPLAY_PRICE,
  LIFETIME_DISPLAY_PRICE,
  UPGRADE_FROM_ANNUAL_PRICE,
  BREAK_EVEN_YEARS,
} from '../../constants/products';
import { AnalyticsService } from '../../services/AnalyticsService';
import { safeAsync } from '../../utils/safeAsync';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

export type PaywallTrigger =
  | 'document_limit'
  | 'family_kit'
  | 'settings'
  | 'backup'
  | 'upgrade';     // annual → lifetime upgrade path

interface PaywallScreenProps {
  visible: boolean;
  onDismiss: () => void;
  trigger?: PaywallTrigger;
}

type ProductInfo = {
  id: string;
  displayName: string;
  displayPrice: string;
  price: number;
};

const TRIGGER_HEADLINE: Record<PaywallTrigger, string> = {
  document_limit: `You've reached the free limit of ${FREE_TIER_DOCUMENT_LIMIT} documents.`,
  family_kit:     'Family Kit requires After Me Premium.',
  backup:         'Encrypted backup requires After Me Premium.',
  settings:       'Unlock the full After Me experience.',
  upgrade:        'Switch to lifetime. Pay once. Never again.',
};

const TRIGGER_SUB: Record<PaywallTrigger, string> = {
  document_limit: 'Upgrade to store unlimited documents and protect everything that matters.',
  family_kit:     'Create a Family Kit so your loved ones can access your vault when it matters most.',
  backup:         'Back up your encrypted vault to iCloud. Recoverable only by you.',
  settings:       'Everything your family needs. Protected forever.',
  upgrade:        'Annual subscribers who switch to lifetime save money every year — and remove one more thing for their family to manage.',
};

export function PaywallScreen({ visible, onDismiss, trigger = 'settings' }: PaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const { purchaseProduct, restorePurchases, isPremium } = usePurchase();

  const isUpgradeFlow = trigger === 'upgrade';

  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>(PRODUCT_IDS.PREMIUM_LIFETIME);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      fadeAnim.setValue(0);
      return;
    }

    safeAsync(AnalyticsService.trackEvent(AnalyticsService.Events.PAYWALL_SHOWN, { trigger }), 'trackEvent:paywall_shown');

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    (async () => {
      setLoadingProducts(true);
      const fetched = await PurchaseService.getProducts();

      // Sort: lifetime first, always
      const sorted = [...fetched].sort((a, b) => {
        if (a.id === PRODUCT_IDS.PREMIUM_LIFETIME) return -1;
        if (b.id === PRODUCT_IDS.PREMIUM_LIFETIME) return 1;
        return 0;
      });

      setProducts(sorted);
      setSelectedProduct(PRODUCT_IDS.PREMIUM_LIFETIME);
      setLoadingProducts(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, trigger]);

  useEffect(() => {
    if (isPremium && visible && !isUpgradeFlow) onDismiss();
  }, [isPremium, visible, onDismiss, isUpgradeFlow]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const result = await purchaseProduct(selectedProduct);
      if (result === 'success') {
        onDismiss();
      } else if (result === 'cancelled') {
        // user cancelled — do nothing
      } else if (result === 'pending') {
        Alert.alert('Purchase Pending', 'Your purchase is being processed. You\'ll get access once confirmed.');
      } else {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not complete purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('Restored', 'Your premium access has been restored.');
        onDismiss();
      } else {
        Alert.alert(
          'No Purchases Found',
          Platform.OS === 'android'
            ? "We couldn't find any previous purchases for this Google account."
            : "We couldn't find any previous purchases for this Apple ID.",
        );
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const lifetimePrice  = products.find((p) => p.id === PRODUCT_IDS.PREMIUM_LIFETIME)?.displayPrice  ?? LIFETIME_DISPLAY_PRICE;
  const annualPrice    = products.find((p) => p.id === PRODUCT_IDS.PREMIUM_ANNUAL)?.displayPrice     ?? ANNUAL_DISPLAY_PRICE;
  const upgradePrice   = isUpgradeFlow ? UPGRADE_FROM_ANNUAL_PRICE : lifetimePrice;

  const numericAnnual = parseFloat(annualPrice.replace(/[^0-9.]/g, ''));
  const annualFirstDigit = annualPrice.search(/\d/);
  const currencySymbol =
    annualFirstDigit > 0 ? annualPrice.slice(0, annualFirstDigit).trim() : '';
  const annualThreeYearDisplay =
    Number.isFinite(numericAnnual) && !Number.isNaN(numericAnnual)
      ? `${currencySymbol}${(numericAnnual * 3).toFixed(2)}`
      : null;
  const numericLifetime = parseFloat(lifetimePrice.replace(/[^0-9.]/g, ''));
  const breakEvenYearsDisplay =
    Number.isFinite(numericAnnual) &&
    numericAnnual > 0 &&
    Number.isFinite(numericLifetime) &&
    !Number.isNaN(numericLifetime)
      ? (numericLifetime / numericAnnual).toFixed(1)
      : null;

  const ctaLabel = isUpgradeFlow
    ? `Switch to Lifetime — ${upgradePrice}`
    : selectedProduct === PRODUCT_IDS.PREMIUM_LIFETIME
      ? `Get Lifetime — ${lifetimePrice}`
      : `Start Annual — ${annualPrice}/yr`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Close */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={20}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>

            {/* Hero */}
            <View style={styles.heroSection}>
              <View style={styles.heroIconWrap}>
                <Text style={styles.heroEmoji}>🔐</Text>
              </View>
              <Text style={styles.heroTitle} maxFontSizeMultiplier={1.3}>
                {isUpgradeFlow ? 'Upgrade to Lifetime' : 'After Me Premium'}
              </Text>
              <Text style={styles.heroSub} maxFontSizeMultiplier={1.3}>
                {TRIGGER_HEADLINE[trigger]}
              </Text>
              <Text style={styles.heroBody} maxFontSizeMultiplier={1.3}>
                {TRIGGER_SUB[trigger]}
              </Text>
            </View>

            {/* Death-risk callout — unique to After Me */}
            {!isUpgradeFlow && (
              <View style={styles.deathRiskCard}>
                <Text style={styles.deathRiskIcon}>⚠️</Text>
                <Text style={styles.deathRiskText} maxFontSizeMultiplier={1.2}>
                  With an annual plan, your family may need to manage a renewal after you&apos;re gone.
                  {' '}<Text style={styles.deathRiskEmphasis}>With lifetime, they never will.</Text>
                </Text>
              </View>
            )}

            {/* Products */}
            {loadingProducts ? (
              <ActivityIndicator size="large" color={colors.amAmber} style={styles.loader} />
            ) : products.length === 0 ? (
              <View style={styles.unavailableCard}>
                <Text style={styles.unavailableText} maxFontSizeMultiplier={1.3}>
                  {'Products are temporarily unavailable. Please try again later.'}
                </Text>
              </View>
            ) : isUpgradeFlow ? (
              /* Upgrade flow: single lifetime card */
              <View style={styles.upgradeCard}>
                <View style={styles.upgradeBadgeRow}>
                  <View style={styles.heroProductBadge}>
                    <Text style={styles.heroProductBadgeText}>LIFETIME ACCESS</Text>
                  </View>
                </View>
                <Text style={styles.upgradePrice} maxFontSizeMultiplier={1.2}>{upgradePrice}</Text>
                <Text style={styles.upgradePriceSub} maxFontSizeMultiplier={1.2}>
                  one-time · then never again
                </Text>
                <View style={styles.divider} />
                {PREMIUM_FEATURES_LIFETIME.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText} maxFontSizeMultiplier={1.3}>{f}</Text>
                  </View>
                ))}
              </View>
            ) : (
              /* Normal flow: lifetime hero + annual secondary */
              <View style={styles.productsSection}>
                {/* ── LIFETIME HERO ── */}
                <TouchableOpacity
                  style={[
                    styles.productCard,
                    styles.lifetimeCard,
                    selectedProduct === PRODUCT_IDS.PREMIUM_LIFETIME && styles.lifetimeCardSelected,
                  ]}
                  onPress={() => setSelectedProduct(PRODUCT_IDS.PREMIUM_LIFETIME)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedProduct === PRODUCT_IDS.PREMIUM_LIFETIME }}
                  accessibilityLabel={`Lifetime ${lifetimePrice}, one time`}
                >
                  <View style={styles.productCardTop}>
                    <View style={styles.heroProductBadge}>
                      <Text style={styles.heroProductBadgeText}>BEST VALUE · RECOMMENDED</Text>
                    </View>
                    <View style={[styles.radioOuter, selectedProduct === PRODUCT_IDS.PREMIUM_LIFETIME && styles.radioOuterSelected]}>
                      {selectedProduct === PRODUCT_IDS.PREMIUM_LIFETIME && <View style={styles.radioInner} />}
                    </View>
                  </View>

                  <Text style={styles.lifetimeName} maxFontSizeMultiplier={1.2}>
                    Lifetime
                  </Text>
                  <Text style={styles.lifetimePrice} maxFontSizeMultiplier={1.1}>
                    {lifetimePrice}
                  </Text>
                  <Text style={styles.lifetimePriceSub} maxFontSizeMultiplier={1.2}>
                    Pay once. Then never again.
                  </Text>

                  <View style={styles.divider} />

                  {PREMIUM_FEATURES_LIFETIME.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={styles.featureCheck}>✓</Text>
                      <Text style={styles.featureText} maxFontSizeMultiplier={1.3}>{f}</Text>
                    </View>
                  ))}
                </TouchableOpacity>

                {/* ── BREAK-EVEN MATHS ── */}
                <View style={styles.mathsCard}>
                  <Text style={styles.mathsText} maxFontSizeMultiplier={1.2}>
                    Annual × 3 years ={' '}
                    <Text style={styles.mathsNum}>
                      {annualThreeYearDisplay ?? `${annualPrice} × 3`}
                    </Text>
                    {'  '}·{'  '}
                    Lifetime = <Text style={styles.mathsNum}>{lifetimePrice}</Text>
                    {'  '}·{'  '}
                    <Text style={styles.mathsEmphasis}>
                      {breakEvenYearsDisplay != null
                        ? `Break even in ~${breakEvenYearsDisplay} years`
                        : `Break even in under ${BREAK_EVEN_YEARS} years`}
                    </Text>
                  </Text>
                </View>

                {/* ── ANNUAL SECONDARY ── */}
                <TouchableOpacity
                  style={[
                    styles.productCard,
                    styles.annualCard,
                    selectedProduct === PRODUCT_IDS.PREMIUM_ANNUAL && styles.annualCardSelected,
                  ]}
                  onPress={() => setSelectedProduct(PRODUCT_IDS.PREMIUM_ANNUAL)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedProduct === PRODUCT_IDS.PREMIUM_ANNUAL }}
                  accessibilityLabel={`Annual ${annualPrice} per year, cancel any time`}
                >
                  <View style={styles.productCardTop}>
                    <Text style={styles.annualName} maxFontSizeMultiplier={1.2}>Annual — start smaller</Text>
                    <View style={[styles.radioOuter, selectedProduct === PRODUCT_IDS.PREMIUM_ANNUAL && styles.radioOuterSelected]}>
                      {selectedProduct === PRODUCT_IDS.PREMIUM_ANNUAL && <View style={styles.radioInner} />}
                    </View>
                  </View>

                  <Text style={styles.annualPrice} maxFontSizeMultiplier={1.1}>
                    {annualPrice}<Text style={styles.annualPricePeriod}> / year</Text>
                  </Text>
                  <Text style={styles.annualPriceSub} maxFontSizeMultiplier={1.2}>
                    Cancel any time · data always exportable
                  </Text>

                  <View style={styles.divider} />

                  {PREMIUM_FEATURES_ANNUAL.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={[styles.featureCheck, { color: colors.textMuted }]}>✓</Text>
                      <Text style={[styles.featureText, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.3}>{f}</Text>
                    </View>
                  ))}

                  <View style={styles.annualUpgradeHint}>
                    <Text style={styles.annualUpgradeHintText} maxFontSizeMultiplier={1.2}>
                      Annual subscribers can upgrade to lifetime at any time from Settings.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer CTA */}
          <View style={styles.footer}>
            {(products.length > 0 || isUpgradeFlow) && (
              <TouchableOpacity
                style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
                onPress={handlePurchase}
                disabled={purchasing || restoring}
                accessibilityRole="button"
                accessibilityLabel={ctaLabel}
              >
                {purchasing ? (
                  <ActivityIndicator color={colors.amBackground} />
                ) : (
                  <Text style={styles.purchaseButtonText} maxFontSizeMultiplier={1.2}>
                    {ctaLabel}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {!isUpgradeFlow && (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={purchasing || restoring}
                accessibilityRole="button"
                accessibilityLabel="Restore previous purchases"
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Text style={styles.restoreText} maxFontSizeMultiplier={1.2}>Restore Purchases</Text>
                )}
              </TouchableOpacity>
            )}

            <Text style={styles.legalText} maxFontSizeMultiplier={1.1}>
              {selectedProduct === PRODUCT_IDS.PREMIUM_LIFETIME || isUpgradeFlow
                ? 'One-time payment. No subscription. No renewal. Ever.'
                : Platform.OS === 'android'
                    ? 'Subscription renews automatically. Cancel in Google Play Settings any time.'
                    : 'Subscription renews automatically. Cancel in App Store Settings any time.'}
              {'\n'}Your data remains exportable and readable, subscription or not.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: colors.amAmber,
    fontWeight: '500',
  },

  // ── Hero ──
  heroSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.amCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  heroEmoji: {
    fontSize: 38,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.amAmber,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  heroBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // ── Death-risk callout ──
  deathRiskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(201,150,58,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,150,58,0.3)',
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  deathRiskIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  deathRiskText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  deathRiskEmphasis: {
    color: colors.amAmber,
    fontWeight: '600',
  },

  loader: {
    marginVertical: 48,
  },
  unavailableCard: {
    backgroundColor: colors.amCard,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Products ──
  productsSection: {
    gap: 0,
  },
  productCard: {
    backgroundColor: colors.amCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  productCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  // Lifetime hero
  lifetimeCard: {
    borderColor: colors.amAmber,
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  lifetimeCardSelected: {
    backgroundColor: 'rgba(201,150,58,0.06)',
  },
  heroProductBadge: {
    backgroundColor: colors.amAmber,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroProductBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.amBackground,
    letterSpacing: 0.5,
  },
  lifetimeName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.amWhite,
    letterSpacing: -0.3,
  },
  lifetimePrice: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.amAmber,
    letterSpacing: -1,
    marginTop: 4,
  },
  lifetimePriceSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },

  // Break-even maths strip
  mathsCard: {
    backgroundColor: colors.amDeep,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.amAmber,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mathsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  mathsNum: {
    color: colors.amWhite,
    fontWeight: '600',
  },
  mathsEmphasis: {
    color: colors.amAmber,
    fontWeight: '700',
  },

  // Annual secondary
  annualCard: {
    borderColor: colors.border,
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  annualCardSelected: {
    borderColor: colors.amAmber,
  },
  annualName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  annualPrice: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.amWhite,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  annualPricePeriod: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textMuted,
  },
  annualPriceSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  annualUpgradeHint: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.amDeep,
    borderRadius: 8,
  },
  annualUpgradeHintText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Shared feature rows
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  featureCheck: {
    fontSize: 14,
    color: colors.amAmber,
    fontWeight: '700',
    marginTop: 1,
    width: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.amWhite,
    lineHeight: 20,
  },

  // Upgrade flow single card
  upgradeCard: {
    backgroundColor: colors.amCard,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: colors.amAmber,
  },
  upgradeBadgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  upgradePrice: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.amAmber,
    letterSpacing: -1,
  },
  upgradePriceSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },

  // Radios
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.amAmber,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.amAmber,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  purchaseButton: {
    backgroundColor: colors.amAmber,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.amBackground,
    letterSpacing: -0.2,
  },
  restoreButton: {
    padding: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  restoreText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  legalText: {
    fontSize: 11,
    color: 'rgba(250,249,246,0.28)',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 6,
    marginBottom: 4,
  },
});

/**
 * In-App Purchase product identifiers, pricing display, and free tier limits.
 * Product IDs must match exactly what is configured in App Store Connect (iOS)
 * and Google Play Console (Android).
 */

export const PRODUCT_IDS = {
  PREMIUM_LIFETIME: 'com.afterme.app.premium.lifetime',
  PREMIUM_ANNUAL:   'com.afterme.app.premium.annual',
} as const;

export const ALL_PRODUCT_IDS = [
  PRODUCT_IDS.PREMIUM_LIFETIME,
  PRODUCT_IDS.PREMIUM_ANNUAL,
] as const;

/** Fallback display prices used when StoreKit products are unavailable (e.g. simulator). */
export const FALLBACK_PRICES = {
  [PRODUCT_IDS.PREMIUM_LIFETIME]: '£79.99',
  [PRODUCT_IDS.PREMIUM_ANNUAL]:   '£34.99',
} as const;

/**
 * Free tier: 5 documents, read-only after trial.
 * This is a conversion funnel — not a revenue tier.
 * Users with 5 documents stored will pay to add more.
 */
export const FREE_TIER_DOCUMENT_LIMIT = 5;

export const PREMIUM_FEATURES_LIFETIME = [
  'Unlimited documents — stored forever',
  'Family Kit creation & unlimited updates',
  'All future features included — no upgrade fees',
  'No renewal risk at death — your family inherits access, not the invoice',
  'Open format guarantee — your data is yours, permanently',
  'Priority support',
] as const;

export const PREMIUM_FEATURES_ANNUAL = [
  'Unlimited document storage',
  'Family Kit creation & updates',
  'All 8 document categories',
  'Cancel any time — data always exportable',
] as const;

/** Shared feature list for contexts where a single list is needed. */
export const PREMIUM_FEATURES = [
  'Unlimited document storage',
  'Family Kit creation & sharing',
  'All future features included',
  'Priority support',
] as const;

/** Break-even display: annual × years ≈ lifetime. Keep in sync with actual prices. */
export const BREAK_EVEN_YEARS = 2.3;
export const ANNUAL_DISPLAY_PRICE = '£34.99';
export const LIFETIME_DISPLAY_PRICE = '£79.99';
export const UPGRADE_FROM_ANNUAL_PRICE = '£54.99';

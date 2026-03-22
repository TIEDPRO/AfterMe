/**
 * Purchase service wrapping the native StoreKit module.
 * Handles product fetching, purchases, entitlement checks, and restores.
 * Falls back gracefully on Android (no StoreKit) and in dev/simulator.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ALL_PRODUCT_IDS } from '../constants/products';
import { CryptoService } from '../core/crypto/CryptoService';
import { AnalyticsService } from './AnalyticsService';
import { safeAsync } from '../utils/safeAsync';

const PREMIUM_CACHE_KEY = 'afterme_premium_status';
const CACHE_HMAC_KEY = 'afterme_premium_hmac';
const ACTIVE_PRODUCT_KEY = 'afterme_active_product_id';

async function signCache(value: string): Promise<void> {
  await SecureStore.setItemAsync(CACHE_HMAC_KEY, CryptoService.generateSecureId(value));
}

async function verifyCachedPremium(): Promise<boolean> {
  const cached = await SecureStore.getItemAsync(PREMIUM_CACHE_KEY);
  if (cached !== 'true') return false;
  const hmac = await SecureStore.getItemAsync(CACHE_HMAC_KEY);
  return hmac !== null && hmac.startsWith('true_');
}

type Product = {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
};

type PurchaseResult = {
  status: 'success' | 'cancelled' | 'pending' | 'unknown';
  transactionId?: string;
};

let StoreKit: {
  getProducts: (ids: string[]) => Promise<Product[]>;
  purchase: (id: string) => Promise<PurchaseResult>;
  getPurchasedProducts: () => Promise<string[]>;
  restore: () => Promise<void>;
} | null = null;

try {
  // StoreKit module handles iOS (StoreKit 2) and Android (Google Play Billing)
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    StoreKit = require('../../modules/storekit');
  }
} catch {
  StoreKit = null;
}

export class PurchaseService {
  private static cachedProducts: Product[] | null = null;
  private static cachedProductsAt: number = 0;
  private static CACHE_TTL_MS = 3_600_000; // 1 hour

  static isStoreKitAvailable(): boolean {
    return StoreKit !== null;
  }

  static async getProducts(): Promise<Product[]> {
    if (!StoreKit) return [];
    if (this.cachedProducts && Date.now() - this.cachedProductsAt < this.CACHE_TTL_MS) {
      return this.cachedProducts;
    }

    try {
      const products = await StoreKit.getProducts([...ALL_PRODUCT_IDS]);
      this.cachedProducts = products;
      this.cachedProductsAt = Date.now();
      return products;
    } catch {
      return [];
    }
  }

  static async purchase(productId: string): Promise<PurchaseResult> {
    if (!StoreKit) {
      return { status: 'unknown' };
    }

    safeAsync(AnalyticsService.trackEvent(AnalyticsService.Events.PURCHASE_STARTED, { productId }), 'trackEvent:purchase_started');

    try {
      const result = await StoreKit.purchase(productId);

      if (result.status === 'success') {
        await SecureStore.setItemAsync(PREMIUM_CACHE_KEY, 'true');
        await SecureStore.setItemAsync(ACTIVE_PRODUCT_KEY, productId);
        await signCache('true');
        safeAsync(AnalyticsService.trackEvent(AnalyticsService.Events.PURCHASE_COMPLETED, { productId }), 'trackEvent:purchase_completed');
      }

      return result;
    } catch {
      return { status: 'unknown' };
    }
  }

  static async checkEntitlements(): Promise<boolean> {
    if (!StoreKit) {
      return verifyCachedPremium();
    }

    try {
      const purchased = await StoreKit.getPurchasedProducts();
      const isPremium = ALL_PRODUCT_IDS.some((id) => purchased.includes(id));
      await SecureStore.setItemAsync(PREMIUM_CACHE_KEY, isPremium ? 'true' : 'false');
      await signCache(isPremium ? 'true' : 'false');
      const activeId = ALL_PRODUCT_IDS.find((id) => purchased.includes(id)) ?? null;
      await SecureStore.setItemAsync(ACTIVE_PRODUCT_KEY, activeId ?? '');
      return isPremium;
    } catch {
      return verifyCachedPremium();
    }
  }

  /** Returns the product ID that granted premium (lifetime or annual), or null if free. */
  static async getActiveProductId(): Promise<string | null> {
    if (!StoreKit) {
      const cached = await SecureStore.getItemAsync(ACTIVE_PRODUCT_KEY);
      return cached || null;
    }
    try {
      const purchased = await StoreKit.getPurchasedProducts();
      return ALL_PRODUCT_IDS.find((id) => purchased.includes(id)) ?? null;
    } catch {
      const cached = await SecureStore.getItemAsync(ACTIVE_PRODUCT_KEY);
      return cached || null;
    }
  }

  static async restorePurchases(): Promise<boolean> {
    if (!StoreKit) return false;

    try {
      await StoreKit.restore();
      return await this.checkEntitlements();
    } catch {
      return false;
    }
  }

  static clearCache(): void {
    this.cachedProducts = null;
    this.cachedProductsAt = 0;
  }
}

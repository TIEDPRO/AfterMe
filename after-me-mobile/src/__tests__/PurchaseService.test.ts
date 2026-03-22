import * as SecureStore from 'expo-secure-store';
import { PurchaseService } from '../services/PurchaseService';

jest.mock('../core/crypto/CryptoService', () => ({
  CryptoService: {
    generateSecureId: jest.fn((prefix: string) => `${prefix}_mock_hmac_123`),
  },
}));

jest.mock('../services/AnalyticsService', () => ({
  AnalyticsService: {
    trackEvent: jest.fn(() => Promise.resolve()),
    Events: {
      PURCHASE_STARTED: 'purchase_started',
      PURCHASE_COMPLETED: 'purchase_completed',
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const StoreKit = require('../../modules/storekit');

describe('PurchaseService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await SecureStore.deleteItemAsync('afterme_premium_status');
    await SecureStore.deleteItemAsync('afterme_premium_hmac');
    await SecureStore.deleteItemAsync('afterme_active_product_id');
    PurchaseService.clearCache();
  });

  describe('isStoreKitAvailable', () => {
    it('returns a boolean', () => {
      const result = PurchaseService.isStoreKitAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getProducts', () => {
    it('returns empty array when StoreKit unavailable', async () => {
      const products = await PurchaseService.getProducts();
      expect(products).toEqual([]);
    });

    it('returns empty array when StoreKit.getProducts throws', async () => {
      StoreKit.getProducts.mockRejectedValueOnce(new Error('network timeout'));
      const products = await PurchaseService.getProducts();
      expect(products).toEqual([]);
    });

    it('caches results on second call', async () => {
      const mockProducts = [{ id: 'com.afterme.app.premium.lifetime', displayName: 'Premium', description: 'Lifetime', displayPrice: '£79.99', price: 79.99 }];
      StoreKit.getProducts.mockResolvedValue(mockProducts);

      const first = await PurchaseService.getProducts();
      const second = await PurchaseService.getProducts();

      expect(first).toEqual(mockProducts);
      expect(second).toEqual(mockProducts);
      expect(StoreKit.getProducts).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkEntitlements', () => {
    it('returns false by default (no purchase, no cache)', async () => {
      const isPremium = await PurchaseService.checkEntitlements();
      expect(isPremium).toBe(false);
    });

    it('rejects tampered cache without HMAC (Fix 23)', async () => {
      await SecureStore.setItemAsync('afterme_premium_status', 'true');
      const isPremium = await PurchaseService.checkEntitlements();
      expect(isPremium).toBe(false);
    });

    it('returns true with valid HMAC cache', async () => {
      StoreKit.getPurchasedProducts.mockRejectedValueOnce(new Error('unavailable'));
      await SecureStore.setItemAsync('afterme_premium_status', 'true');
      await SecureStore.setItemAsync('afterme_premium_hmac', 'true_mock_hmac_123');

      const result = await PurchaseService.checkEntitlements();
      expect(result).toBe(true);
    });

    it('uses getPurchasedProducts when StoreKit is available', async () => {
      StoreKit.getPurchasedProducts.mockResolvedValueOnce(['com.afterme.app.premium.lifetime']);

      const result = await PurchaseService.checkEntitlements();
      expect(result).toBe(true);
      expect(StoreKit.getPurchasedProducts).toHaveBeenCalled();
    });
  });

  describe('purchase (Fix 24)', () => {
    it('wraps purchase in try/catch and returns result', async () => {
      const result = await PurchaseService.purchase('com.afterme.app.premium.lifetime');
      expect(['success', 'unknown', 'cancelled', 'pending']).toContain(result.status);
    });

    it('sets PREMIUM_CACHE_KEY, ACTIVE_PRODUCT_KEY, and HMAC on success', async () => {
      const productId = 'com.afterme.app.premium.lifetime';
      const result = await PurchaseService.purchase(productId);

      expect(result.status).toBe('success');
      expect(await SecureStore.getItemAsync('afterme_premium_status')).toBe('true');
      expect(await SecureStore.getItemAsync('afterme_active_product_id')).toBe(productId);
      expect(await SecureStore.getItemAsync('afterme_premium_hmac')).toBe('true_mock_hmac_123');
    });

    it('returns unknown when StoreKit throws', async () => {
      StoreKit.purchase.mockRejectedValueOnce(new Error('Network error'));

      const result = await PurchaseService.purchase('com.afterme.app.premium.lifetime');
      expect(result.status).toBe('unknown');
    });
  });

  describe('restorePurchases', () => {
    it('returns false when StoreKit unavailable', async () => {
      const result = await PurchaseService.restorePurchases();
      expect(result).toBe(false);
    });

    it('returns false when restore throws', async () => {
      StoreKit.restore.mockRejectedValueOnce(new Error('restore failed'));
      const result = await PurchaseService.restorePurchases();
      expect(result).toBe(false);
    });

    it('calls restore then checkEntitlements', async () => {
      StoreKit.getPurchasedProducts.mockResolvedValueOnce(['com.afterme.app.premium.lifetime']);

      const result = await PurchaseService.restorePurchases();
      expect(StoreKit.restore).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('getActiveProductId', () => {
    it('returns null when no purchase exists', async () => {
      const id = await PurchaseService.getActiveProductId();
      expect(id).toBeNull();
    });

    it('returns matching product from StoreKit getPurchasedProducts', async () => {
      StoreKit.getPurchasedProducts.mockResolvedValueOnce(['com.afterme.app.premium.annual']);
      const id = await PurchaseService.getActiveProductId();
      expect(id).toBe('com.afterme.app.premium.annual');
    });

    it('returns null when no matching product found in purchased list', async () => {
      StoreKit.getPurchasedProducts.mockResolvedValueOnce(['com.other.product']);
      const id = await PurchaseService.getActiveProductId();
      expect(id).toBeNull();
    });

    it('returns cached value from AsyncStorage on StoreKit failure', async () => {
      StoreKit.getPurchasedProducts.mockRejectedValueOnce(new Error('fail'));
      await SecureStore.setItemAsync('afterme_active_product_id', 'com.afterme.app.premium.lifetime');

      const id = await PurchaseService.getActiveProductId();
      expect(id).toBe('com.afterme.app.premium.lifetime');
    });
  });

  describe('clearCache', () => {
    it('clears cached products', () => {
      PurchaseService.clearCache();
      // should not throw
    });

    it('causes next getProducts to re-fetch', async () => {
      const mockProducts = [{ id: 'com.afterme.app.premium.lifetime', displayName: 'Premium', description: 'Lifetime', displayPrice: '£79.99', price: 79.99 }];
      StoreKit.getProducts.mockResolvedValue(mockProducts);

      await PurchaseService.getProducts();
      PurchaseService.clearCache();
      await PurchaseService.getProducts();

      expect(StoreKit.getProducts).toHaveBeenCalledTimes(2);
    });
  });
});

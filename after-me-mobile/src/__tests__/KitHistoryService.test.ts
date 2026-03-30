import AsyncStorage from '@react-native-async-storage/async-storage';
import { KitHistoryService } from '../services/KitHistoryService';

jest.mock('../core/crypto/CryptoService', () => ({
  __esModule: true,
  CryptoService: {
    generateSecureId: jest.fn((prefix: string) => `${prefix}_mock123`),
  },
}));

describe('KitHistoryService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('getNextKitVersion', () => {
    it('starts at 1', async () => {
      const v = await KitHistoryService.getNextKitVersion();
      expect(v).toBe(1);
    });

    it('increments each call', async () => {
      const v1 = await KitHistoryService.getNextKitVersion();
      const v2 = await KitHistoryService.getNextKitVersion();
      const v3 = await KitHistoryService.getNextKitVersion();
      expect(v1).toBe(1);
      expect(v2).toBe(2);
      expect(v3).toBe(3);
    });
  });

  describe('recordKitGeneration / getHistory', () => {
    it('records and retrieves kit history', async () => {
      await KitHistoryService.recordKitGeneration(1, 5, ['identity', 'legal']);
      const history = await KitHistoryService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe(1);
      expect(history[0].documentCount).toBe(5);
      expect(history[0].categories).toEqual(['identity', 'legal']);
    });

    it('accumulates multiple entries', async () => {
      await KitHistoryService.recordKitGeneration(1, 3, ['identity']);
      await KitHistoryService.recordKitGeneration(2, 7, ['identity', 'legal']);
      const history = await KitHistoryService.getHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('getLatestKit', () => {
    it('returns null when no kits exist', async () => {
      const latest = await KitHistoryService.getLatestKit();
      expect(latest).toBeNull();
    });

    it('returns the most recent entry', async () => {
      await KitHistoryService.recordKitGeneration(1, 3, ['identity']);
      await KitHistoryService.recordKitGeneration(2, 5, ['legal']);
      const latest = await KitHistoryService.getLatestKit();
      expect(latest?.version).toBe(2);
    });
  });

  describe('getFreshnessScore', () => {
    it('returns critical when no kit exists', async () => {
      const score = await KitHistoryService.getFreshnessScore();
      expect(score.level).toBe('critical');
      expect(score.kitVersion).toBeNull();
    });

    it('returns fresh for recently created kit', async () => {
      await KitHistoryService.recordKitGeneration(1, 5, ['identity']);
      const score = await KitHistoryService.getFreshnessScore();
      expect(score.level).toBe('fresh');
      expect(score.daysSinceKit).toBe(0);
    });

    it('detects vault changes since kit creation', async () => {
      await KitHistoryService.recordKitGeneration(1, 5, ['identity']);
      // Small delay to ensure vault change timestamp is after kit creation
      await new Promise((r) => setTimeout(r, 10));
      await KitHistoryService.recordVaultChange();
      const score = await KitHistoryService.getFreshnessScore();
      expect(score.vaultChangedSinceKit).toBe(true);
    });
  });

  describe('getStaleKitWarning', () => {
    it('returns null for fresh kit', async () => {
      await KitHistoryService.recordKitGeneration(1, 5, ['identity']);
      const warning = await KitHistoryService.getStaleKitWarning();
      expect(warning).toBeNull();
    });

    it('returns warning when no kit exists', async () => {
      const warning = await KitHistoryService.getStaleKitWarning();
      expect(warning).toContain("haven't created");
    });
  });

  describe('distribution tracking', () => {
    it('returns empty distributions by default', async () => {
      const dists = await KitHistoryService.getDistributions();
      expect(dists).toEqual([]);
    });

    it('getDistributionsForVersion returns empty for non-existent version', async () => {
      const dists = await KitHistoryService.getDistributionsForVersion(99);
      expect(dists).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('removes all kit data', async () => {
      await KitHistoryService.recordKitGeneration(1, 3, ['identity']);
      await KitHistoryService.recordVaultChange();
      await KitHistoryService.clearHistory();
      expect(await KitHistoryService.getHistory()).toEqual([]);
      expect(await KitHistoryService.getLatestKit()).toBeNull();
    });

    it('removes version counter so next version starts at 1 again', async () => {
      await KitHistoryService.getNextKitVersion();
      await KitHistoryService.getNextKitVersion();
      await KitHistoryService.clearHistory();
      const nextVersion = await KitHistoryService.getNextKitVersion();
      expect(nextVersion).toBe(1);
    });

    it('removes distribution history', async () => {
      await AsyncStorage.setItem('familyKit:distributions', JSON.stringify([{
        id: 'dist_abc',
        kitVersion: 1,
        recipientLabel: 'Spouse',
        method: 'print',
        distributedAt: new Date().toISOString(),
      }]));
      const before = await KitHistoryService.getDistributions();
      expect(before).toHaveLength(1);

      await KitHistoryService.clearHistory();
      const dists = await KitHistoryService.getDistributions();
      expect(dists).toEqual([]);
    });
  });

  describe('getHistory with corrupted data', () => {
    it('returns empty array when storage contains corrupted JSON', async () => {
      await AsyncStorage.setItem('familyKit:history', '{not valid json!!!');
      const history = await KitHistoryService.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getStaleKitWarning messages', () => {
    it('returns vault-changed message when vault changed since kit', async () => {
      await KitHistoryService.recordKitGeneration(1, 5, ['identity']);
      await new Promise((r) => setTimeout(r, 10));
      await KitHistoryService.recordVaultChange();
      const warning = await KitHistoryService.getStaleKitWarning();
      expect(warning).toContain('outdated');
      expect(warning).toContain('v1');
    });

    it('returns aging message for kit older than 30 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      const historyEntry = {
        version: 2,
        createdAt: oldDate.toISOString(),
        documentCount: 3,
        categories: ['identity'],
      };
      await AsyncStorage.setItem('familyKit:history', JSON.stringify([historyEntry]));

      const expectedDays = Math.floor(
        (Date.now() - oldDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const warning = await KitHistoryService.getStaleKitWarning();
      expect(warning).not.toBeNull();
      expect(warning).toContain('v2');
      expect(warning).toContain(String(expectedDays));
    });

    it('returns critical message for kit older than 180 days without vault changes', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200);
      const historyEntry = {
        version: 3,
        createdAt: oldDate.toISOString(),
        documentCount: 5,
        categories: ['identity', 'legal'],
      };
      await AsyncStorage.setItem('familyKit:history', JSON.stringify([historyEntry]));

      const warning = await KitHistoryService.getStaleKitWarning();
      expect(warning).not.toBeNull();
      expect(warning).toContain('v3');
      expect(warning).toContain('200');
      expect(warning).toContain('Consider refreshing');
    });
  });
});

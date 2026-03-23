import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AppProvider, useApp } from '../context/AppContext';
import { DocumentService } from '../services/DocumentService';
import { KeyManager } from '../core/auth/KeyManager';
import { OnboardingStorage } from '../services/OnboardingStorage';
import { BackupService } from '../services/BackupService';
import { KitHistoryService } from '../services/KitHistoryService';
import { migrateDatesToPlaintext } from '../db/DocumentRepository';

jest.mock('../services/DocumentService', () => ({
  DocumentService: {
    getDocumentCountByCategory: jest.fn(() => Promise.resolve({ identity: 2 })),
    getAllDocuments: jest.fn(() =>
      Promise.resolve([
        { id: '1', expiryDate: null },
        { id: '2', expiryDate: '2099-01-01' },
      ]),
    ),
  },
}));

jest.mock('../core/auth/KeyManager', () => ({
  KeyManager: {
    isInitialized: jest.fn(() => Promise.resolve(true)),
    recoverFromInterruptedRotation: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../services/OnboardingStorage', () => ({
  OnboardingStorage: {
    hasCompletedOnboarding: jest.fn(() => Promise.resolve(true)),
    isSafetyNetDeferred: jest.fn(() => Promise.resolve(false)),
    getShowFamilyKitCreationImmediately: jest.fn(() => Promise.resolve(false)),
    clearShowFamilyKitCreationImmediately: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../services/BackupService', () => ({
  BackupService: {
    isIcloudBackupEnabled: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock('../services/KitHistoryService', () => ({
  KitHistoryService: {
    getFreshnessScore: jest.fn(() =>
      Promise.resolve({ kitVersion: 1, daysSince: 5 }),
    ),
  },
}));

jest.mock('../db/DocumentRepository', () => ({
  migrateDatesToPlaintext: jest.fn(() => Promise.resolve()),
}));

jest.mock('../features/Phase1VerificationScreen', () => ({
  Phase1VerificationScreen: () => null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  (KeyManager.isInitialized as jest.Mock).mockResolvedValue(true);
  (KeyManager.recoverFromInterruptedRotation as jest.Mock).mockResolvedValue(
    undefined,
  );
  (OnboardingStorage.hasCompletedOnboarding as jest.Mock).mockResolvedValue(
    true,
  );
  (OnboardingStorage.isSafetyNetDeferred as jest.Mock).mockResolvedValue(false);
  (
    OnboardingStorage.getShowFamilyKitCreationImmediately as jest.Mock
  ).mockResolvedValue(false);
  (BackupService.isIcloudBackupEnabled as jest.Mock).mockResolvedValue(true);
  (KitHistoryService.getFreshnessScore as jest.Mock).mockResolvedValue({
    kitVersion: 1,
    daysSince: 5,
  });
  (DocumentService.getDocumentCountByCategory as jest.Mock).mockResolvedValue({
    identity: 2,
  });
  (DocumentService.getAllDocuments as jest.Mock).mockResolvedValue([
    { id: '1', expiryDate: null },
    { id: '2', expiryDate: '2099-01-01' },
  ]);
  (migrateDatesToPlaintext as jest.Mock).mockResolvedValue(undefined);
});

describe('AppContext', () => {
  it('initializes with default state (isInitialized: null)', () => {
    (KeyManager.recoverFromInterruptedRotation as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.isInitialized).toBeNull();
    expect(result.current.hasCompletedOnboarding).toBe(false);
    expect(result.current.totalDocuments).toBe(0);
    expect(result.current.expiringSoonCount).toBe(0);
    expect(result.current.categoryFilter).toBeNull();
    expect(result.current.hasSafetyNet).toBe(false);
  });

  it('isInitialized becomes true after initialization when KeyManager.isInitialized returns true', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });
    expect(KeyManager.recoverFromInterruptedRotation).toHaveBeenCalled();
    expect(migrateDatesToPlaintext).toHaveBeenCalled();
  });

  it('initialLoadDone becomes true after refreshInit completes', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.initialLoadDone).toBe(true);
    });
  });

  it('migrateDatesToPlaintext is skipped when hasKeys but not storageCompleted', async () => {
    (KeyManager.isInitialized as jest.Mock).mockResolvedValue(true);
    (OnboardingStorage.hasCompletedOnboarding as jest.Mock).mockResolvedValue(false);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).not.toBeNull();
    });
    expect(migrateDatesToPlaintext).not.toHaveBeenCalled();
  });

  it('hasCompletedOnboarding becomes true only when storageCompleted is true', async () => {
    (KeyManager.isInitialized as jest.Mock).mockResolvedValue(false);
    (OnboardingStorage.hasCompletedOnboarding as jest.Mock).mockResolvedValue(
      true,
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).not.toBeNull();
    });
    expect(result.current.hasCompletedOnboarding).toBe(true);
  });

  it('hasCompletedOnboarding is false when hasKeys is true but storageCompleted is false (reinstall scenario)', async () => {
    (KeyManager.isInitialized as jest.Mock).mockResolvedValue(true);
    (OnboardingStorage.hasCompletedOnboarding as jest.Mock).mockResolvedValue(
      false,
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).not.toBeNull();
    });
    expect(result.current.hasCompletedOnboarding).toBe(false);
  });

  it('hasSafetyNet is true when icloudEnabled is true (Fix 6 regression)', async () => {
    (BackupService.isIcloudBackupEnabled as jest.Mock).mockResolvedValue(true);
    (KitHistoryService.getFreshnessScore as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).not.toBeNull();
    });
    expect(result.current.hasSafetyNet).toBe(true);
  });

  it('hasSafetyNet is true when kit has been created', async () => {
    (BackupService.isIcloudBackupEnabled as jest.Mock).mockResolvedValue(false);
    (KitHistoryService.getFreshnessScore as jest.Mock).mockResolvedValue({
      kitVersion: 1,
      daysSince: 5,
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).not.toBeNull();
    });
    expect(result.current.hasSafetyNet).toBe(true);
  });

  it('hasSafetyNet is false when neither icloud nor kit exist', async () => {
    (BackupService.isIcloudBackupEnabled as jest.Mock).mockResolvedValue(false);
    (KitHistoryService.getFreshnessScore as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).not.toBeNull();
    });
    expect(result.current.hasSafetyNet).toBe(false);
  });

  it('refreshDocuments updates totalDocuments and documentCountByCategory', async () => {
    (DocumentService.getDocumentCountByCategory as jest.Mock).mockResolvedValue(
      { legal: 3, finance: 1 },
    );
    (DocumentService.getAllDocuments as jest.Mock).mockResolvedValue([
      { id: '1', expiryDate: null },
      { id: '2', expiryDate: null },
      { id: '3', expiryDate: null },
      { id: '4', expiryDate: null },
    ]);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.totalDocuments).toBe(4);
    });
    expect(result.current.documentCountByCategory).toEqual({
      legal: 3,
      finance: 1,
    });
  });

  it('expiringSoonCount only counts docs within 90-day window with 30-day lower bound (Fix 50 regression)', async () => {
    const now = new Date();
    const ms = (days: number) => days * 86_400_000;
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    const in30Days = toDateStr(new Date(now.getTime() + ms(30)));
    const in100Days = toDateStr(new Date(now.getTime() + ms(100)));
    const ago10Days = toDateStr(new Date(now.getTime() - ms(10)));
    const ago60Days = toDateStr(new Date(now.getTime() - ms(60)));

    (DocumentService.getAllDocuments as jest.Mock).mockResolvedValue([
      { id: '1', expiryDate: null },
      { id: '2', expiryDate: in30Days },
      { id: '3', expiryDate: in100Days },
      { id: '4', expiryDate: ago10Days },
      { id: '5', expiryDate: ago60Days },
    ]);

    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.totalDocuments).toBe(5);
    });
    expect(result.current.expiringSoonCount).toBe(2);
  });

  it('setCategoryFilter updates categoryFilter state', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });
    act(() => {
      result.current.setCategoryFilter('legal');
    });
    expect(result.current.categoryFilter).toBe('legal');
  });

  it('dismissFamilyKitCreationPrompt clears the flag', async () => {
    (
      OnboardingStorage.getShowFamilyKitCreationImmediately as jest.Mock
    ).mockResolvedValue(true);
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.showFamilyKitCreationImmediately).toBe(true);
    });
    await act(async () => {
      await result.current.dismissFamilyKitCreationPrompt();
    });
    expect(result.current.showFamilyKitCreationImmediately).toBe(false);
    expect(
      OnboardingStorage.clearShowFamilyKitCreationImmediately,
    ).toHaveBeenCalled();
  });

  it('refreshDocuments handles errors gracefully — resets counts to 0', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.totalDocuments).toBe(2);
    });

    (DocumentService.getAllDocuments as jest.Mock).mockRejectedValue(
      new Error('DB error'),
    );

    await act(async () => {
      await result.current.refreshDocuments();
    });

    expect(result.current.totalDocuments).toBe(0);
    expect(result.current.expiringSoonCount).toBe(0);
    expect(result.current.documentCountByCategory).toEqual({});
  });

  it('refreshInit handles error gracefully — sets isInitialized to false', async () => {
    (KeyManager.recoverFromInterruptedRotation as jest.Mock).mockRejectedValue(
      new Error('rotation error'),
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(false);
    });
    expect(result.current.hasCompletedOnboarding).toBe(false);
  });

  it('isInitialized is false when KeyManager.isInitialized returns false', async () => {
    (KeyManager.isInitialized as jest.Mock).mockResolvedValue(false);
    (OnboardingStorage.hasCompletedOnboarding as jest.Mock).mockResolvedValue(
      false,
    );
    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(false);
    });
  });

  it('useApp throws when used outside AppProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useApp())).toThrow(
      'useApp must be used within AppProvider',
    );
    spy.mockRestore();
  });
});

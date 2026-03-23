import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-native';
import { DocumentService } from '../services/DocumentService';
import { Phase1VerificationScreen } from '../features/Phase1VerificationScreen';
import { KeyManager } from '../core/auth/KeyManager';
import { OnboardingStorage } from '../services/OnboardingStorage';
import { BackupService } from '../services/BackupService';
import { KitHistoryService } from '../services/KitHistoryService';
import { migrateDatesToPlaintext } from '../db/DocumentRepository';
import type { DocumentCategory } from '../models/DocumentCategory';

type AppState = {
  isInitialized: boolean | null;
  hasCompletedOnboarding: boolean;
  initialLoadDone: boolean;
  documentCountByCategory: Record<string, number>;
  totalDocuments: number;
  expiringSoonCount: number;
  categoryFilter: DocumentCategory | null;
  hasSafetyNet: boolean;
  safetyNetDeferred: boolean;
  showFamilyKitCreationImmediately: boolean;
};

type AppContextValue = AppState & {
  refreshDocuments: () => Promise<void>;
  refreshInit: () => Promise<void>;
  setCategoryFilter: (cat: DocumentCategory | null) => void;
  dismissFamilyKitCreationPrompt: () => Promise<void>;
  setShowPhase1: (show: boolean) => void;
};

const defaultState: AppState = {
  isInitialized: null,
  hasCompletedOnboarding: false,
  initialLoadDone: false,
  documentCountByCategory: {},
  totalDocuments: 0,
  expiringSoonCount: 0,
  categoryFilter: null,
  hasSafetyNet: false,
  safetyNetDeferred: false,
  showFamilyKitCreationImmediately: false,
};

const AppContext = createContext<AppContextValue | null>(null);

const EXPIRY_DAYS_THRESHOLD = 90;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [showPhase1, setShowPhase1] = useState(false);

  const refreshDocuments = useCallback(async () => {
    try {
      const [counts, docs] = await Promise.all([
        DocumentService.getDocumentCountByCategory(),
        DocumentService.getAllDocuments(),
      ]);

      const now = new Date();
      const threshold = new Date(now.getTime() + EXPIRY_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const lowerBound = thirtyDaysAgo.toISOString().split('T')[0];
      const expiringSoon = docs.filter((d) => {
        if (!d.expiryDate) return false;
        const exp = new Date(d.expiryDate);
        const expDayStr = d.expiryDate.split('T')[0];
        return exp <= threshold && expDayStr >= lowerBound;
      }).length;

      const total = docs.length;

      setState((prev) => ({
        ...prev,
        documentCountByCategory: counts,
        totalDocuments: total,
        expiringSoonCount: expiringSoon,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        documentCountByCategory: {},
        totalDocuments: 0,
        expiringSoonCount: 0,
      }));
    }
  }, []);

  const refreshInit = useCallback(async () => {
    try {
      await KeyManager.recoverFromInterruptedRotation();

      const [hasKeys, storageCompleted, icloudEnabled, safetyNetDeferred, showFamilyKit, kitFreshness] =
        await Promise.all([
          KeyManager.isInitialized(),
          OnboardingStorage.hasCompletedOnboarding(),
          BackupService.isIcloudBackupEnabled(),
          OnboardingStorage.isSafetyNetDeferred(),
          OnboardingStorage.getShowFamilyKitCreationImmediately(),
          KitHistoryService.getFreshnessScore().catch(() => null),
        ]);
      const hasCompletedOnboarding = storageCompleted;
      const hasKitBeenCreated = kitFreshness !== null && kitFreshness.kitVersion !== null;
      const hasSafetyNet = icloudEnabled || hasKitBeenCreated;

      if (hasKeys && hasCompletedOnboarding) {
        await migrateDatesToPlaintext();
        await refreshDocuments();
      }

      setState((prev) => ({
        ...prev,
        isInitialized: hasKeys,
        hasCompletedOnboarding,
        initialLoadDone: true,
        hasSafetyNet,
        safetyNetDeferred,
        showFamilyKitCreationImmediately: showFamilyKit,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isInitialized: false,
        hasCompletedOnboarding: false,
      }));
    }
  }, [refreshDocuments]);

  const dismissFamilyKitCreationPrompt = useCallback(async () => {
    await OnboardingStorage.clearShowFamilyKitCreationImmediately();
    setState((prev) => ({ ...prev, showFamilyKitCreationImmediately: false }));
  }, []);

  useEffect(() => {
    refreshInit();
  }, [refreshInit]);

  const setCategoryFilter = useCallback((cat: DocumentCategory | null) => {
    setState((prev) => ({ ...prev, categoryFilter: cat }));
  }, []);

  const value: AppContextValue = {
    ...state,
    refreshDocuments,
    refreshInit,
    setCategoryFilter,
    dismissFamilyKitCreationPrompt,
    setShowPhase1,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <Modal
        visible={showPhase1}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPhase1(false)}
      >
        <Phase1VerificationScreen onBack={() => setShowPhase1(false)} />
      </Modal>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

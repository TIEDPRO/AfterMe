/**
 * Privacy-safe analytics service — tracks anonymized usage events locally.
 * No PII is collected. Events are stored in AsyncStorage for beta diagnostics.
 * Can be extended to send to a backend in the future.
 *
 * Events are batched in memory and flushed to AsyncStorage periodically
 * or when the batch reaches BATCH_SIZE to reduce I/O overhead.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeAsync } from '../utils/safeAsync';

const ANALYTICS_KEY = 'afterme_analytics_events';
const MAX_EVENTS = 500;

type AnalyticsEvent = {
  name: string;
  timestamp: string;
  properties?: Record<string, string | number | boolean>;
};

export class AnalyticsService {
  private static pendingEvents: AnalyticsEvent[] = [];
  private static flushTimer: ReturnType<typeof setTimeout> | null = null;
  private static FLUSH_INTERVAL_MS = 10_000;
  private static BATCH_SIZE = 20;

  static async trackEvent(
    name: string,
    properties?: Record<string, string | number | boolean>,
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        name,
        timestamp: new Date().toISOString(),
        properties,
      };

      this.pendingEvents.push(event);

      if (this.pendingEvents.length >= this.BATCH_SIZE) {
        await this.flush();
      } else {
        this.scheduleFlush();
      }
    } catch {
      // analytics failures are always silent
    }
  }

  private static scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      safeAsync(this.flush(), 'analyticsFlush');
    }, this.FLUSH_INTERVAL_MS);
  }

  static async flush(): Promise<void> {
    if (this.pendingEvents.length === 0) return;
    const batch = this.pendingEvents.splice(0);
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    try {
      const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
      const stored: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
      const merged = stored.concat(batch);
      if (merged.length > MAX_EVENTS) {
        merged.splice(0, merged.length - MAX_EVENTS);
      }
      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(merged));
    } catch {
      // On failure, re-queue so events aren't lost
      this.pendingEvents.unshift(...batch);
    }
  }

  static async getEvents(): Promise<AnalyticsEvent[]> {
    await this.flush();
    try {
      const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static async getEventsSummary(): Promise<Record<string, number>> {
    const events = await this.getEvents();
    const summary: Record<string, number> = {};
    for (const event of events) {
      summary[event.name] = (summary[event.name] || 0) + 1;
    }
    return summary;
  }

  static async clearEvents(): Promise<void> {
    this.pendingEvents = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await AsyncStorage.removeItem(ANALYTICS_KEY);
  }

  // Pre-defined safe event names
  static Events = {
    APP_OPENED: 'app_opened',
    DOCUMENT_ADDED: 'document_added',
    DOCUMENT_DELETED: 'document_deleted',
    DOCUMENT_SCANNED: 'document_scanned',
    KIT_CREATED: 'kit_created',
    KIT_SHARED: 'kit_shared',
    BACKUP_COMPLETED: 'backup_completed',
    BACKUP_RESTORED: 'backup_restored',
    PURCHASE_STARTED: 'purchase_started',
    PURCHASE_COMPLETED: 'purchase_completed',
    PAYWALL_SHOWN: 'paywall_shown',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    SURVIVOR_FLOW_STARTED: 'survivor_flow_started',
    INTEGRITY_CHECK_RUN: 'integrity_check_run',
  } as const;
}

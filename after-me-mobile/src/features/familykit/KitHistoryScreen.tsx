/**
 * Kit history, version tracking, freshness alerts, and distribution log.
 * Accessible from Settings or the stale-kit warning banner.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KitHistoryService, type KitHistoryEntry, type KitDistributionEntry, type FreshnessLevel } from '../../services/KitHistoryService';
import { ReadinessChecklistCard } from '../dashboard/ReadinessChecklistCard';
import { CATEGORY_ICONS, CATEGORY_LABELS, type DocumentCategory } from '../../models/DocumentCategory';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

interface KitHistoryScreenProps {
  onCreateKit: () => void;
  onBack?: () => void;
}

const FRESHNESS_CONFIG: Record<FreshnessLevel, { color: string; icon: string; label: string }> = {
  fresh: { color: colors.success, icon: '🟢', label: 'Up to Date' },
  aging: { color: colors.amAmber, icon: '🟡', label: 'Getting Older' },
  stale: { color: '#FF9500', icon: '🟠', label: 'Needs Update' },
  critical: { color: colors.amDanger, icon: '🔴', label: 'Action Required' },
};

export function KitHistoryScreen({ onCreateKit, onBack }: KitHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<KitHistoryEntry[]>([]);
  const [distributions, setDistributions] = useState<KitDistributionEntry[]>([]);
  const [freshness, setFreshness] = useState<{
    level: FreshnessLevel;
    daysSinceKit: number;
    vaultChangedSinceKit: boolean;
    kitVersion: number | null;
  } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [readinessRefreshKey, setReadinessRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [h, d, f, w] = await Promise.all([
        KitHistoryService.getHistory(),
        KitHistoryService.getDistributions(),
        KitHistoryService.getFreshnessScore(),
        KitHistoryService.getStaleKitWarning(),
      ]);
      setHistory(h.reverse());
      setDistributions(d.reverse());
      setFreshness(f);
      setWarning(w);
      setReadinessRefreshKey((k) => k + 1);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.amAmber} />
      </View>
    );
  }

  const cfg = freshness ? FRESHNESS_CONFIG[freshness.level] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {onBack && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backText} maxFontSizeMultiplier={3.0}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={3.0}>Family Kit History</Text>
          <View style={{ width: 60 }} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.amAmber} />}
      >
        <ReadinessChecklistCard
          variant="compact"
          refreshKey={readinessRefreshKey}
          onPressCreateKit={onCreateKit}
        />
        {/* Freshness banner */}
        {cfg && freshness && (
          <View style={[styles.freshnessCard, { borderColor: cfg.color }]}>
            <View style={styles.freshnessRow}>
              <Text style={styles.freshnessIcon}>{cfg.icon}</Text>
              <View style={styles.freshnessContent}>
                <Text style={[styles.freshnessLabel, { color: cfg.color }]} maxFontSizeMultiplier={3.0}>
                  {cfg.label}
                </Text>
                {freshness.kitVersion && (
                  <Text style={styles.freshnessDetail} maxFontSizeMultiplier={3.0}>
                    Kit v{freshness.kitVersion} · {freshness.daysSinceKit > 0 ? `${freshness.daysSinceKit} days old` : 'Created today'}
                  </Text>
                )}
              </View>
            </View>
            {warning && (
              <Text style={styles.freshnessWarning} maxFontSizeMultiplier={3.0}>{warning}</Text>
            )}
            {freshness.level !== 'fresh' && (
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: cfg.color }]}
                onPress={onCreateKit}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Create new kit"
              >
                <Text style={styles.refreshBtnText} maxFontSizeMultiplier={3.0}>
                  {freshness.kitVersion ? 'Regenerate Kit' : 'Create First Kit'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* No kits yet */}
        {history.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={3.0}>No Family Kits Yet</Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={3.0}>
              Create your first Family Kit to share your vault with loved ones.
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={onCreateKit}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create Family Kit"
            >
              <Text style={styles.createBtnText} maxFontSizeMultiplier={3.0}>Create Family Kit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Version history */}
        {history.length > 0 && (
          <>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={3.0}>Kit Versions</Text>
            {history.map((entry) => {
              const dists = distributions.filter((d) => d.kitVersion === entry.version);
              return (
                <View key={entry.version} style={styles.versionCard}>
                  <View style={styles.versionHeader}>
                    <Text style={styles.versionLabel} maxFontSizeMultiplier={3.0}>
                      Version {entry.version}
                    </Text>
                    <Text style={styles.versionDate} maxFontSizeMultiplier={3.0}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.versionDetail} maxFontSizeMultiplier={3.0}>
                    {entry.documentCount} documents · {entry.categories.map((c) =>
                      `${CATEGORY_ICONS[c as DocumentCategory] ?? ''} ${CATEGORY_LABELS[c as DocumentCategory] ?? c}`
                    ).join(', ')}
                  </Text>
                  {dists.length > 0 && (
                    <View style={styles.distList}>
                      <Text style={styles.distTitle} maxFontSizeMultiplier={3.0}>
                        Distributed {dists.length}×:
                      </Text>
                      {dists.map((d) => (
                        <Text key={d.id} style={styles.distItem} maxFontSizeMultiplier={3.0}>
                          • {d.recipientLabel} ({d.method}) — {new Date(d.distributedAt).toLocaleDateString()}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Distribution log */}
        {distributions.length > 0 && (
          <>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={3.0}>Distribution Log</Text>
            {distributions.map((d) => (
              <View key={d.id} style={styles.distCard}>
                <View style={styles.distCardRow}>
                  <Text style={styles.distCardMethod} maxFontSizeMultiplier={3.0}>
                    {d.method === 'print' ? '🖨️' : d.method === 'digital' ? '📤' : d.method === 'airdrop' ? '📡' : '📋'}
                    {'  '}{d.recipientLabel}
                  </Text>
                  <Text style={styles.distCardDate} maxFontSizeMultiplier={3.0}>
                    v{d.kitVersion}
                  </Text>
                </View>
                <Text style={styles.distCardMeta} maxFontSizeMultiplier={3.0}>
                  {d.method} · {new Date(d.distributedAt).toLocaleDateString()}
                  {d.notes ? ` · ${d.notes}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
  },
  backBtn: {
    width: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.amAmber,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  freshnessCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    backgroundColor: colors.amCard,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freshnessIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  freshnessContent: {
    flex: 1,
  },
  freshnessLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  freshnessDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  freshnessWarning: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 19,
  },
  refreshBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
    minHeight: 44,
  },
  refreshBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: colors.amCard,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createBtn: {
    backgroundColor: colors.amAmber,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minHeight: 48,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amBackground,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
    marginBottom: 12,
    marginTop: 8,
  },
  versionCard: {
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  versionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.amWhite,
  },
  versionDate: {
    fontSize: 13,
    color: colors.textMuted,
  },
  versionDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  distList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  distTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  distItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  distCard: {
    backgroundColor: colors.amCard,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  distCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distCardMethod: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.amWhite,
  },
  distCardDate: {
    fontSize: 12,
    color: colors.amAmber,
    fontWeight: '600',
  },
  distCardMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});

/**
 * Local readiness checklist — documents, Family Kit, personal recovery, optional cloud backup.
 * No server calls; state is derived from vault + AsyncStorage-backed services.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useApp } from '../../context/AppContext';
import { KitHistoryService } from '../../services/KitHistoryService';
import { PersonalRecoveryKitService } from '../../services/PersonalRecoveryKitService';
import { BackupService } from '../../services/BackupService';
import { AnalyticsService } from '../../services/AnalyticsService';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

type Props = {
  /** Bump when parent refreshes (e.g. pull-to-refresh) so we reload kit/recovery flags */
  refreshKey?: number;
  onPressCreateKit?: () => void;
  variant?: 'full' | 'compact';
};

export function ReadinessChecklistCard({
  refreshKey = 0,
  onPressCreateKit,
  variant = 'full',
}: Props) {
  const { totalDocuments } = useApp();
  const [hasFamilyKit, setHasFamilyKit] = useState(false);
  const [hasRecoveryKit, setHasRecoveryKit] = useState(false);
  const [cloudOn, setCloudOn] = useState(false);

  const load = useCallback(async () => {
    try {
      const [latest, recovery, cloud] = await Promise.all([
        KitHistoryService.getLatestKit(),
        PersonalRecoveryKitService.hasCreatedKit(),
        BackupService.isCloudBackupEnabled(),
      ]);
      setHasFamilyKit(latest !== null);
      setHasRecoveryKit(recovery);
      setCloudOn(cloud);
    } catch {
      // keep prior state
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey, totalDocuments]);

  const docsOk = totalDocuments > 0;
  const coreDone = docsOk && hasFamilyKit && hasRecoveryKit;
  const allDone = coreDone && cloudOn;
  const loggedCoreRef = useRef(false);

  useEffect(() => {
    if (coreDone && !loggedCoreRef.current) {
      loggedCoreRef.current = true;
      AnalyticsService.trackEvent('readiness_core_complete', {
        cloud_backup: cloudOn,
      });
    }
  }, [coreDone, cloudOn]);

  const compact = variant === 'compact';

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title} maxFontSizeMultiplier={3.0}>
        {compact ? 'Readiness' : 'Your readiness checklist'}
      </Text>
      {!compact && (
        <Text style={styles.subtitle} maxFontSizeMultiplier={3.0}>
          Local checks only — everything stays on your device.
        </Text>
      )}

      <CheckRow ok={docsOk} label="At least one document in your vault" />
      <CheckRow
        ok={hasFamilyKit}
        label="Family Kit generated at least once"
        actionLabel={!hasFamilyKit && onPressCreateKit ? 'Create kit' : undefined}
        onAction={!hasFamilyKit ? onPressCreateKit : undefined}
      />
      <CheckRow
        ok={hasRecoveryKit}
        label="Personal Recovery Kit created (Settings → Personal Recovery)"
      />
      <CheckRow ok={cloudOn} label={`${Platform.OS === 'ios' ? 'iCloud' : 'Google'} backup enabled (optional)`} />

      {allDone ? (
        <Text style={styles.doneHint} maxFontSizeMultiplier={3.0}>
          You&apos;re in great shape. Regenerate kits when your vault changes.
        </Text>
      ) : (
        <Text style={styles.hint} maxFontSizeMultiplier={3.0}>
          {coreDone
            ? 'Optional: turn on cloud backup in Settings if you want this device protected too.'
            : 'Complete the items above so your plan can reach the right people when it matters.'}
        </Text>
      )}
    </View>
  );
}

function CheckRow({
  ok,
  label,
  actionLabel,
  onAction,
}: {
  ok: boolean;
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.checkIcon} maxFontSizeMultiplier={3.0}>
        {ok ? '✓' : '○'}
      </Text>
      <Text style={[styles.rowLabel, ok && styles.rowLabelDone]} maxFontSizeMultiplier={3.0}>
        {label}
      </Text>
      {actionLabel && onAction && !ok && (
        <TouchableOpacity onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={styles.actionLink} maxFontSizeMultiplier={3.0}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  cardCompact: {
    marginBottom: 12,
    padding: 14,
  },
  title: {
    fontFamily: SERIF_FONT,
    fontSize: 17,
    fontWeight: '700',
    color: colors.amWhite,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  checkIcon: {
    fontSize: 16,
    color: colors.amAmber,
    width: 22,
    marginTop: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    minWidth: '60%',
  },
  rowLabelDone: {
    color: colors.textMuted,
  },
  actionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.amAmber,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  doneHint: {
    fontSize: 12,
    color: colors.success,
    marginTop: 4,
    lineHeight: 17,
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../../context/AppContext';
import {
  DOCUMENT_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  TARGET_DOCS_PER_CATEGORY,
  type DocumentCategory,
} from '../../models/DocumentCategory';
import { KitHistoryService, type FreshnessLevel } from '../../services/KitHistoryService';
import { KitCreationWizard } from '../familykit/KitCreationWizard';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

const RING_SIZE = 48;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TOTAL_TARGET = DOCUMENT_CATEGORIES.length * TARGET_DOCS_PER_CATEGORY;

function ProgressRing({
  progress,
  color,
  count,
}: {
  progress: number;
  color: string;
  count: number;
}) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset = RING_CIRCUMFERENCE * (1 - clamped);

  return (
    <View style={ringStyles.container} accessibilityLabel={`${Math.round(clamped * 100)}% complete`}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.amDeep}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <Text style={ringStyles.countText}>{count}</Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '700',
    color: colors.amWhite,
  },
});

function CategoryCard({
  category,
  count,
  onPress,
}: {
  category: DocumentCategory;
  count: number;
  onPress: () => void;
}) {
  const progress = Math.min(count / TARGET_DOCS_PER_CATEGORY, 1);
  const isComplete = progress >= 1;
  const catColor = isComplete ? colors.success : CATEGORY_COLORS[category];

  return (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${CATEGORY_LABELS[category]}, ${count} of ${TARGET_DOCS_PER_CATEGORY} documents`}
      accessibilityHint="Opens this category in the document library"
    >
      <View style={styles.cardTop}>
        <Text style={styles.categoryIcon}>{CATEGORY_ICONS[category]}</Text>
        <ProgressRing progress={progress} color={catColor} count={count} />
      </View>
      <Text
        style={[styles.categoryName, { fontFamily: SERIF_FONT }]}
        maxFontSizeMultiplier={1.4}
      >
        {CATEGORY_LABELS[category]}
      </Text>
      <Text style={styles.categoryDesc} numberOfLines={2} maxFontSizeMultiplier={1.4}>
        {CATEGORY_DESCRIPTIONS[category]}
      </Text>
      <Text style={styles.categoryHint} maxFontSizeMultiplier={1.4}>
        {isComplete ? '✓ Complete' : `${count} of ${TARGET_DOCS_PER_CATEGORY} key documents`}
      </Text>
    </TouchableOpacity>
  );
}

function OverallCompletenessRing({ totalDocuments }: { totalDocuments: number }) {
  const progress = Math.min(totalDocuments / TOTAL_TARGET, 1);
  const percent = Math.round(progress * 100);
  const ringSize = 80;
  const strokeW = 6;
  const radius = (ringSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.overallRing} accessibilityLabel={`Vault ${percent}% complete, ${totalDocuments} of ${TOTAL_TARGET} documents`}>
      <Svg width={ringSize} height={ringSize}>
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke={colors.amDeep}
          strokeWidth={strokeW}
          fill="none"
        />
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke={progress >= 1 ? colors.success : colors.amAmber}
          strokeWidth={strokeW}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${ringSize / 2}, ${ringSize / 2}`}
        />
      </Svg>
      <Text style={styles.overallPercent}>{percent}%</Text>
    </View>
  );
}

export function VaultDashboardScreen({
  onCategoryPress,
  onDocumentsPress,
}: {
  onCategoryPress: (category: DocumentCategory) => void;
  onDocumentsPress: () => void;
}) {
  const {
    documentCountByCategory,
    totalDocuments,
    expiringSoonCount,
    refreshDocuments,
    hasSafetyNet,
    safetyNetDeferred,
    showFamilyKitCreationImmediately,
    dismissFamilyKitCreationPrompt,
  } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);
  const [kitWizardVisible, setKitWizardVisible] = useState(false);
  const [kitWarning, setKitWarning] = useState<string | null>(null);
  const [kitFreshness, setKitFreshness] = useState<FreshnessLevel | null>(null);

  const refreshKitStatus = useCallback(async () => {
    try {
      const [freshness, warning] = await Promise.all([
        KitHistoryService.getFreshnessScore(),
        KitHistoryService.getStaleKitWarning(),
      ]);
      setKitFreshness(freshness.level);
      setKitWarning(warning);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshKitStatus();
  }, [refreshKitStatus, totalDocuments]);

  useEffect(() => {
    if (showFamilyKitCreationImmediately) {
      dismissFamilyKitCreationPrompt();
      // Only open the wizard if the user has documents — the wizard blocks on an empty vault.
      // If vault is empty, the dashboard nudge card will guide them to add documents first.
      if (totalDocuments > 0) {
        setKitWizardVisible(true);
      }
    }
  }, [showFamilyKitCreationImmediately, dismissFamilyKitCreationPrompt, totalDocuments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshDocuments(), refreshKitStatus()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {!hasSafetyNet && (
        <TouchableOpacity
          style={[
            styles.safetyNetBanner,
            safetyNetDeferred && styles.safetyNetBannerDeferred,
          ]}
          onPress={() => setKitWizardVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Set up safety net"
          accessibilityHint="Opens the Family Kit creation wizard"
        >
          <Text style={styles.safetyNetTitle} maxFontSizeMultiplier={1.4}>
            {safetyNetDeferred
              ? "You chose to remind me later — set up your safety net"
              : "No safety net yet"}
          </Text>
          <Text style={styles.safetyNetText} maxFontSizeMultiplier={1.4}>
            {safetyNetDeferred
              ? "Create a Family Kit or enable cloud backup to protect your vault"
              : "Create a Family Kit or enable backup to protect your vault"}
          </Text>
        </TouchableOpacity>
      )}

      {kitWarning && kitFreshness !== 'fresh' && (
        <TouchableOpacity
          style={[styles.kitBanner, {
            borderColor: kitFreshness === 'critical' ? colors.amDanger :
                         kitFreshness === 'stale' ? '#FF9500' : colors.amAmber,
          }]}
          onPress={() => setKitWizardVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Update Family Kit"
          accessibilityHint="Opens the Family Kit creation wizard to regenerate your kit"
        >
          <Text style={styles.kitBannerIcon}>
            {kitFreshness === 'critical' ? '🔴' : kitFreshness === 'stale' ? '🟠' : '🟡'}
          </Text>
          <View style={styles.kitBannerContent}>
            <Text style={styles.kitBannerTitle} maxFontSizeMultiplier={1.4}>
              {kitFreshness === 'critical' ? 'Kit Action Required' : 'Kit Needs Update'}
            </Text>
            <Text style={styles.kitBannerText} maxFontSizeMultiplier={1.4} numberOfLines={2}>
              {kitWarning}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <KitCreationWizard
        visible={kitWizardVisible}
        onDismiss={() => {
          setKitWizardVisible(false);
          refreshKitStatus();
        }}
      />

      {expiringSoonCount > 0 && (
        <TouchableOpacity
          style={styles.expiryBanner}
          onPress={onDocumentsPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Keep It Current: ${expiringSoonCount} document${expiringSoonCount > 1 ? 's' : ''} need attention`}
          accessibilityHint="Tap to view documents needing attention"
        >
          <Text style={styles.expiryIcon}>⏰</Text>
          <View style={styles.expiryContent}>
            <Text style={styles.expiryTitle} maxFontSizeMultiplier={1.4}>Keep It Current</Text>
            <Text style={styles.expiryText} maxFontSizeMultiplier={1.4}>
              {expiringSoonCount} document{expiringSoonCount > 1 ? 's' : ''} need attention
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.summaryRow}>
        <OverallCompletenessRing totalDocuments={totalDocuments} />
        <View style={styles.summaryText}>
          <Text
            style={[styles.summaryTitle, { fontFamily: SERIF_FONT }]}
            maxFontSizeMultiplier={1.4}
            accessibilityRole="header"
          >
            Your Vault
          </Text>
          <Text style={styles.summaryCount} maxFontSizeMultiplier={1.4} accessibilityRole="text">
            {totalDocuments} of {TOTAL_TARGET} key documents
          </Text>
          <Text style={styles.summaryPercent} maxFontSizeMultiplier={1.4} accessibilityRole="text">
            {totalDocuments >= TOTAL_TARGET ? 'Vault complete!' : `${Math.round((totalDocuments / TOTAL_TARGET) * 100)}% complete`}
          </Text>
        </View>
      </View>

      <View style={styles.categoryGrid}>
        {DOCUMENT_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            count={documentCountByCategory[cat] ?? 0}
            onPress={() => onCategoryPress(cat)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={onDocumentsPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="View All Documents"
        accessibilityHint="Opens the document library"
      >
        <Text style={styles.viewAllText} maxFontSizeMultiplier={1.4}>View All Documents</Text>
        <Text style={styles.viewAllHint} maxFontSizeMultiplier={1.4}>Open Document Library</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  safetyNetBanner: {
    backgroundColor: colors.amAmber,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  safetyNetBannerDeferred: {
    backgroundColor: colors.amAmber,
  },
  safetyNetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
  },
  safetyNetText: {
    fontSize: 14,
    color: 'rgba(250,249,246,0.95)',
    marginTop: 4,
  },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amCard,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    minHeight: 56,
  },
  expiryIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  expiryContent: {
    flex: 1,
  },
  expiryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
  },
  expiryText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  overallRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallPercent: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '800',
    color: colors.amWhite,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.amWhite,
  },
  summaryCount: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryPercent: {
    fontSize: 13,
    color: colors.amAmber,
    fontWeight: '600',
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.amCard,
    padding: 16,
    borderRadius: 12,
    minHeight: 140,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
  },
  categoryDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  categoryHint: {
    fontSize: 12,
    color: colors.amAmber,
    marginTop: 6,
    fontWeight: '500',
  },
  viewAllButton: {
    backgroundColor: colors.amAmber,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
  },
  viewAllText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.amBackground,
  },
  viewAllHint: {
    fontSize: 13,
    color: 'rgba(45,49,66,0.9)',
    marginTop: 4,
  },
  kitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amCard,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    minHeight: 56,
  },
  kitBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  kitBannerContent: {
    flex: 1,
  },
  kitBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.amWhite,
  },
  kitBannerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
});

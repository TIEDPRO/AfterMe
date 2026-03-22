import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { DocumentService } from '../../services/DocumentService';
import { useApp } from '../../context/AppContext';
import type { Document } from '../../models/Document';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_TEMPLATES,
} from '../../models/DocumentCategory';
import { AddDocumentModal } from './AddDocumentModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { PaywallScreen } from '../paywall/PaywallScreen';
import { ActionSheet, showActionSheet, type ActionSheetOption } from '../../components/ActionSheet';

type SortMode = 'newest' | 'oldest' | 'name';

export function DocumentLibraryScreen() {
  const { categoryFilter, setCategoryFilter, refreshDocuments } = useApp();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string | null>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [renameDoc, setRenameDoc] = useState<Document | null>(null);
  const [renameText, setRenameText] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoadError(null);
    try {
      const docs = categoryFilter
        ? await DocumentService.getDocumentsByCategory(categoryFilter)
        : await DocumentService.getAllDocuments();
      setDocuments(docs);

      if (categoryFilter && docs.length === 0) {
        setCategoryFilter(null);
      }

      refreshDocuments();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load documents';
      setLoadError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, setCategoryFilter, refreshDocuments]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          CATEGORY_LABELS[d.category].toLowerCase().includes(q) ||
          (d.providerName && d.providerName.toLowerCase().includes(q)),
      );
    }
    const sorted = [...result];
    if (sortMode === 'newest') {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (sortMode === 'name') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [documents, searchQuery, sortMode]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const updateThumbnailCache = useCallback((id: string, uri: string | null) => {
    setThumbnailCache((prev) => ({ ...prev, [id]: uri }));
  }, []);

  const [actionSheetDoc, setActionSheetDoc] = useState<Document | null>(null);

  const handleLongPress = (doc: Document) => {
    const options: ActionSheetOption[] = [
      { label: 'Rename', onPress: () => handleRename(doc) },
      { label: 'Delete', onPress: () => confirmDelete(doc), destructive: true },
    ];

    if (Platform.OS === 'ios') {
      showActionSheet(doc.title, options, () => {});
    } else {
      setActionSheetDoc(doc);
    }
  };

  const handleRename = (doc: Document) => {
    setRenameText(doc.title);
    setRenameDoc(doc);
  };

  const executeRename = async () => {
    if (!renameDoc) return;
    try {
      const newName = renameText.trim();
      if (newName && newName !== renameDoc.title) {
        await DocumentService.updateDocument(renameDoc.id, { title: newName });
        await loadDocuments();
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setRenameDoc(null);
    }
  };

  const confirmDelete = (doc: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DocumentService.deleteDocument(doc.id);
              await loadDocuments();
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ],
    );
  };

  const cycleSortMode = () => {
    const modes: SortMode[] = ['newest', 'oldest', 'name'];
    const next = modes[(modes.indexOf(sortMode) + 1) % modes.length];
    setSortMode(next);
  };

  const sortLabel = sortMode === 'newest' ? 'Newest' : sortMode === 'oldest' ? 'Oldest' : 'A–Z';

  const renderGridItem = ({ item }: { item: Document }) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() => setViewerDoc(item)}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${CATEGORY_LABELS[item.category]}${item.expiryDate ? `, expires ${formatDate(item.expiryDate)}` : ''}`}
      accessibilityHint="Tap to view, long press for options"
    >
      <View style={styles.gridThumbnail}>
        <DocumentThumbnail
          doc={item}
          cachedUri={thumbnailCache[item.id]}
          onCacheUpdate={updateThumbnailCache}
        />
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridTitle} numberOfLines={2} maxFontSizeMultiplier={1.4}>
          {item.title}
        </Text>
        <Text style={styles.gridCategory} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
        </Text>
        {item.expiryDate && (
          <Text style={styles.gridExpiry} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            Expires: {formatDate(item.expiryDate)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const categoryEmptyState = categoryFilter ? (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon} accessible={false}>{CATEGORY_ICONS[categoryFilter]}</Text>
      <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
        No {CATEGORY_LABELS[categoryFilter]} documents yet
      </Text>
      <Text style={styles.emptyDesc} maxFontSizeMultiplier={1.4}>
        {CATEGORY_DESCRIPTIONS[categoryFilter]}
      </Text>
      <Text style={styles.emptyHint} maxFontSizeMultiplier={1.4}>
        Start with:
      </Text>
      <View style={styles.templateList}>
        {CATEGORY_TEMPLATES[categoryFilter].slice(0, 3).map((t) => (
          <View key={t} style={styles.templateChip}>
            <Text style={styles.templateChipText} maxFontSizeMultiplier={1.4}>{t}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => setAddModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Add your first ${CATEGORY_LABELS[categoryFilter]} document`}
        accessibilityHint="Opens the document import screen"
      >
        <Text style={styles.addFirstButtonText} maxFontSizeMultiplier={1.4}>
          Add Your First Document
        </Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon} accessible={false}>📁</Text>
      <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>No documents yet</Text>
      <Text style={styles.emptyHint} maxFontSizeMultiplier={1.4}>
        Your vault is empty. Start by scanning or importing your most important document.
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => setAddModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Add your first document"
        accessibilityHint="Opens the document import screen"
      >
        <Text style={styles.addFirstButtonText} maxFontSizeMultiplier={1.4}>
          Add Your First Document
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.title, { fontFamily: SERIF_FONT }]}
            maxFontSizeMultiplier={1.4}
            accessibilityRole="header"
          >
            Documents
          </Text>
          {categoryFilter && (
            <TouchableOpacity
              onPress={() => setCategoryFilter(null)}
              style={styles.filterBadge}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${CATEGORY_LABELS[categoryFilter]}. Tap to clear.`}
            >
              <Text style={styles.filterBadgeText} maxFontSizeMultiplier={1.4}>
                {CATEGORY_ICONS[categoryFilter]} {CATEGORY_LABELS[categoryFilter]} ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search documents"
            maxFontSizeMultiplier={1.4}
          />
          <TouchableOpacity
            style={styles.sortButton}
            onPress={cycleSortMode}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sortLabel}. Tap to change.`}
          >
            <Text style={styles.sortButtonText} maxFontSizeMultiplier={1.4}>{sortLabel}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle} maxFontSizeMultiplier={1.4} accessibilityRole="text">
          {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
          {categoryFilter ? ` in ${CATEGORY_LABELS[categoryFilter]}` : ' in vault'}
        </Text>
      </View>

      {loadError ? (
        <View style={styles.error}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle} maxFontSizeMultiplier={1.4}>Could not load documents</Text>
          <Text style={styles.errorMessage} maxFontSizeMultiplier={1.4}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadDocuments}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.retryButtonText} maxFontSizeMultiplier={1.4}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.amAmber} />
        </View>
      ) : filteredDocs.length === 0 && !searchQuery ? (
        categoryEmptyState
      ) : filteredDocs.length === 0 && searchQuery ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon} accessible={false}>🔍</Text>
          <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>No results</Text>
          <Text style={styles.emptyHint} maxFontSizeMultiplier={1.4}>
            No documents matching &ldquo;{searchQuery}&rdquo;
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amAmber} />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddModalVisible(true)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Add document"
        accessibilityHint="Scan or import a new document"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddDocumentModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onDocumentAdded={loadDocuments}
        onShowPaywall={() => setPaywallVisible(true)}
      />

      <PaywallScreen
        visible={paywallVisible}
        onDismiss={() => setPaywallVisible(false)}
        trigger="document_limit"
      />

      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          visible={!!viewerDoc}
          onClose={() => setViewerDoc(null)}
          onDocumentUpdated={loadDocuments}
        />
      )}

      <Modal visible={!!renameDoc} transparent animationType="fade">
        <View style={styles.renameOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle} maxFontSizeMultiplier={1.4}>Rename Document</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={executeRename}
              accessibilityLabel="New document name"
              maxFontSizeMultiplier={1.4}
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameCancelBtn}
                onPress={() => setRenameDoc(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel rename"
              >
                <Text style={styles.renameCancelText} maxFontSizeMultiplier={1.4}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.renameConfirmBtn}
                onPress={executeRename}
                accessibilityRole="button"
                accessibilityLabel="Confirm rename"
              >
                <Text style={styles.renameConfirmText} maxFontSizeMultiplier={1.4}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'android' && (
        <ActionSheet
          visible={!!actionSheetDoc}
          title={actionSheetDoc?.title}
          options={actionSheetDoc ? [
            { label: 'Rename', onPress: () => handleRename(actionSheetDoc) },
            { label: 'Delete', onPress: () => confirmDelete(actionSheetDoc), destructive: true },
          ] : []}
          onCancel={() => setActionSheetDoc(null)}
        />
      )}
    </SafeAreaView>
  );
}

function DocumentThumbnail({
  doc,
  cachedUri,
  onCacheUpdate,
}: {
  doc: Document;
  cachedUri: string | null | undefined;
  onCacheUpdate: (id: string, uri: string | null) => void;
}) {
  useEffect(() => {
    if (doc.format === 'pdf') {
      onCacheUpdate(doc.id, null);
      return;
    }
    if (cachedUri !== undefined) return;

    let cancelled = false;
    DocumentService.getThumbnailContent(doc)
      .then((uri) => {
        if (!cancelled) onCacheUpdate(doc.id, uri);
      })
      .catch(() => {
        if (!cancelled) onCacheUpdate(doc.id, null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, doc.format, cachedUri, onCacheUpdate]);

  const showImage = cachedUri && doc.format !== 'pdf';

  return (
    <View style={styles.thumbnailPlaceholder}>
      {showImage ? (
        <Image
          source={{ uri: cachedUri }}
          style={styles.thumbnailImage}
          resizeMode="cover"
          accessibilityLabel={`Thumbnail for ${doc.title}`}
        />
      ) : (
        <>
          <Text style={styles.thumbnailIcon}>{doc.format === 'pdf' ? '📄' : '🖼️'}</Text>
          <Text style={styles.thumbnailFormat}>{doc.format.toUpperCase()}</Text>
        </>
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterBadge: {
    backgroundColor: colors.amCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.amWhite,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.amWhite,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.amCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.amWhite,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  sortButton: {
    backgroundColor: colors.amCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.amAmber,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  list: {
    padding: 12,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: colors.amCard,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gridThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: colors.amDeep,
  },
  gridInfo: {
    padding: 10,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.amWhite,
    lineHeight: 18,
  },
  gridCategory: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  gridExpiry: {
    fontSize: 11,
    color: colors.amAmber,
    marginTop: 4,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.amDeep,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailIcon: {
    fontSize: 28,
  },
  thumbnailFormat: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  templateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  templateChip: {
    backgroundColor: colors.amCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateChipText: {
    fontSize: 13,
    color: colors.amWhite,
  },
  addFirstButton: {
    backgroundColor: colors.amAmber,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  addFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amBackground,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.amAmber,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amBackground,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.amAmber,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: colors.amBackground,
    fontWeight: '300',
    lineHeight: 36,
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  renameCard: {
    backgroundColor: colors.amCard,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 16,
  },
  renameInput: {
    backgroundColor: colors.amBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.amWhite,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    marginBottom: 20,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  renameCancelBtn: {
    flex: 1,
    backgroundColor: colors.amBackground,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
  },
  renameConfirmBtn: {
    flex: 1,
    backgroundColor: colors.amAmber,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  renameConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amBackground,
  },
});

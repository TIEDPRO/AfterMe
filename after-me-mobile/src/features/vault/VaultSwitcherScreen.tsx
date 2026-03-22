/**
 * Vault Switcher — allows users to create, rename, delete, and switch between vaults.
 * Premium feature gated by PurchaseContext.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VaultManager, type VaultInfo } from '../../services/VaultManager';
import { captureVaultError } from '../../services/SentryService';
import { colors } from '../../theme/colors';
import { SERIF_FONT } from '../../theme/fonts';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface VaultSwitcherScreenProps {
  onVaultChanged?: () => void;
}

export function VaultSwitcherScreen({ onVaultChanged }: VaultSwitcherScreenProps) {
  const insets = useSafeAreaInsets();
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [activeVaultId, setActiveVaultId] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState<string | null>(null);
  const [modalText, setModalText] = useState('');

  const loadVaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, activeId] = await Promise.all([
        VaultManager.getAllVaults(),
        VaultManager.getActiveVaultId(),
      ]);
      setVaults(all);
      setActiveVaultId(activeId);
    } catch (err) {
      setError('Failed to load vaults. Please try again.');
      captureVaultError(err, 'loadVaults');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVaults();
  }, [loadVaults]);

  const handleSwitch = useCallback(async (vaultId: string) => {
    try {
      await VaultManager.setActiveVault(vaultId);
      setActiveVaultId(vaultId);
      onVaultChanged?.();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  }, [onVaultChanged]);

  const handleCreate = useCallback(async () => {
    const name = modalText.trim();
    if (!name) return;
    try {
      await VaultManager.createVault(name);
      setShowCreateModal(false);
      setModalText('');
      loadVaults();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  }, [modalText, loadVaults]);

  const handleRename = useCallback(async () => {
    const name = modalText.trim();
    if (!name || !showRenameModal) return;
    try {
      await VaultManager.renameVault(showRenameModal, name);
      setShowRenameModal(null);
      setModalText('');
      loadVaults();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  }, [modalText, showRenameModal, loadVaults]);

  const handleDelete = useCallback((vault: VaultInfo) => {
    if (vault.isDefault) {
      Alert.alert('Cannot Delete', 'The default vault cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete Vault',
      `Are you sure you want to delete "${vault.name}"? This will permanently delete all ${vault.documentCount} documents in this vault.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const wasActive = vault.id === activeVaultId;
              await VaultManager.deleteVault(vault.id);
              if (wasActive) {
                setActiveVaultId('default');
              }
              await loadVaults();
              onVaultChanged?.();
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ],
    );
  }, [activeVaultId, loadVaults, onVaultChanged]);

  const renderVault = ({ item }: { item: VaultInfo }) => {
    const isActive = item.id === activeVaultId;
    return (
      <TouchableOpacity
        style={[styles.vaultCard, isActive && styles.activeVaultCard]}
        onPress={() => handleSwitch(item.id)}
        onLongPress={() => {
          if (!item.isDefault) {
            setShowRenameModal(item.id);
            setModalText(item.name);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${isActive ? ', active' : ''}`}
        accessibilityHint="Tap to switch, long press to rename"
      >
        <View style={styles.vaultHeader}>
          <View style={styles.vaultNameRow}>
            <Text style={styles.vaultName} maxFontSizeMultiplier={1.4}>{item.name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          {!item.isDefault && (
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Text style={styles.deleteIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.vaultStats}>
          <Text style={styles.vaultStat} maxFontSizeMultiplier={1.4}>
            {item.documentCount} document{item.documentCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.vaultStatDot}>·</Text>
          <Text style={styles.vaultStat} maxFontSizeMultiplier={1.4}>
            {formatSize(item.sizeBytes)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderInputModal = (
    title: string,
    placeholder: string,
    onSubmit: () => void,
    visible: boolean,
    onClose: () => void,
  ) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle} maxFontSizeMultiplier={1.4}>{title}</Text>
          <TextInput
            style={styles.modalInput}
            value={modalText}
            onChangeText={setModalText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoFocus
            maxLength={50}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel={placeholder}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => { setModalText(''); onClose(); }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCancelText} maxFontSizeMultiplier={1.4}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, !modalText.trim() && styles.modalSubmitDisabled]}
              onPress={onSubmit}
              disabled={!modalText.trim()}
              accessibilityRole="button"
              accessibilityLabel={title.includes('Create') ? 'Create vault' : 'Rename vault'}
            >
              <Text style={styles.modalSubmitText} maxFontSizeMultiplier={1.4}>
                {title.includes('Create') ? 'Create' : 'Rename'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.amAmber} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadVaults}
          accessibilityRole="button"
          accessibilityLabel="Retry loading vaults"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        data={vaults}
        keyExtractor={(item) => item.id}
        renderItem={renderVault}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.headerText} maxFontSizeMultiplier={1.4}>
            Manage your vaults. Each vault has separate encryption and storage.
          </Text>
        }
        ListFooterComponent={
          vaults.length < 5 ? (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => { setModalText(''); setShowCreateModal(true); }}
              accessibilityRole="button"
              accessibilityLabel="Create new vault"
            >
              <Text style={styles.createIcon}>+</Text>
              <Text style={styles.createText} maxFontSizeMultiplier={1.4}>Create New Vault</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.limitText} maxFontSizeMultiplier={1.4}>
              Maximum of 5 vaults reached
            </Text>
          )
        }
      />

      {renderInputModal(
        'Create Vault',
        'Vault name',
        handleCreate,
        showCreateModal,
        () => setShowCreateModal(false),
      )}

      {renderInputModal(
        'Rename Vault',
        'New name',
        handleRename,
        !!showRenameModal,
        () => setShowRenameModal(null),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  headerText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  vaultCard: {
    backgroundColor: colors.amCard,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeVaultCard: {
    borderColor: colors.amAmber,
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  vaultName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.amWhite,
    fontFamily: SERIF_FONT,
  },
  activeBadge: {
    backgroundColor: colors.amAmber,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amBackground,
  },
  defaultBadge: {
    backgroundColor: 'rgba(250,249,246,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  deleteIcon: {
    fontSize: 18,
    color: colors.amDanger,
    padding: 4,
  },
  vaultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  vaultStat: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  vaultStatDot: {
    fontSize: 14,
    color: colors.textMuted,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(250,249,246,0.15)',
    borderStyle: 'dashed',
    padding: 18,
    marginTop: 4,
    minHeight: 56,
    gap: 8,
  },
  createIcon: {
    fontSize: 24,
    color: colors.amAmber,
    fontWeight: '300',
  },
  createText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amAmber,
  },
  limitText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.amCard,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.amWhite,
    marginBottom: 16,
    fontFamily: SERIF_FONT,
  },
  modalInput: {
    backgroundColor: colors.amBackground,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.amWhite,
    minHeight: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalSubmitButton: {
    backgroundColor: colors.amAmber,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalSubmitDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.amBackground,
  },
  errorText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: colors.amAmber,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amBackground,
  },
});

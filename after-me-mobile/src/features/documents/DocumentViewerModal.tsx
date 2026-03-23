import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { DatePickerField } from '../../components/DatePickerField';
import { cacheDirectory, documentDirectory, writeAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';
import { PdfView } from '@kishannareshpal/expo-pdf';
import { DocumentService } from '../../services/DocumentService';
import type { Document } from '../../models/Document';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../models/DocumentCategory';
import { colors } from '../../theme/colors';

interface DocumentViewerModalProps {
  document: Document;
  visible: boolean;
  onClose: () => void;
  onDocumentUpdated?: () => void;
}

export function DocumentViewerModal({
  document,
  visible,
  onClose,
  onDocumentUpdated,
}: DocumentViewerModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [contentUri, setContentUri] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({
    title: '',
    documentDate: '',
    expiryDate: '',
    providerName: '',
    locationOfOriginal: '',
  });
  const [savedOverrides, setSavedOverrides] = useState<Partial<Document> | null>(null);
  const tempPdfRef = useRef<string | null>(null);
  const tempImageRef = useRef<string | null>(null);

  const displayDoc = savedOverrides ? { ...document, ...savedOverrides } : document;

  const resetEditForm = () => {
    setEditValues({
      title: displayDoc.title,
      documentDate: displayDoc.documentDate ?? '',
      expiryDate: displayDoc.expiryDate ?? '',
      providerName: displayDoc.providerName ?? '',
      locationOfOriginal: displayDoc.locationOfOriginal ?? '',
    });
  };

  useEffect(() => {
    if (!visible || !document) return;

    let cancelled = false;
    setLoading(true);
    setContentUri(null);
    setPdfUri(null);
    setDecryptError(null);
    setPdfError(null);
    setImageError(null);
    setIsEditing(false);
    setSavedOverrides(null);

    const cleanupTempFile = async (path: string | null) => {
      if (path) {
        try {
          await deleteAsync(path, { idempotent: true });
        } catch {}
      }
    };

    DocumentService.getDocumentContent(document)
      .then(async (buf) => {
        if (cancelled) return;
        if (document.format === 'pdf') {
          try {
            const base64 = buf.toString('base64');
            const tempDir = cacheDirectory ?? documentDirectory ?? '';
            const tempPath = `${tempDir}temp-pdf-${document.id}.pdf`;
            await writeAsStringAsync(tempPath, base64, { encoding: EncodingType.Base64 });
            tempPdfRef.current = tempPath;
            if (!cancelled) setPdfUri(tempPath);
          } catch (e) {
            if (!cancelled) setPdfError((e as Error).message);
          }
        } else {
          try {
            const base64Content = buf.toString('base64');
            const baseDir = cacheDirectory ?? documentDirectory ?? '';
            const tempPath = `${baseDir}viewer_${document.id}.${document.format}`;
            await writeAsStringAsync(tempPath, base64Content, { encoding: EncodingType.Base64 });
            tempImageRef.current = tempPath;
            if (!cancelled) setContentUri(tempPath);
          } catch (e) {
            if (!cancelled) setImageError((e as Error).message);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not decrypt document.';
          setDecryptError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      cleanupTempFile(tempPdfRef.current);
      tempPdfRef.current = null;
      cleanupTempFile(tempImageRef.current);
      tempImageRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, document?.id]);

  useEffect(() => {
    if (visible && document) {
      resetEditForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, document, isEditing]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const handleStartEdit = () => {
    resetEditForm();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!document?.id) return;
    setSaving(true);
    try {
      const updates: Parameters<typeof DocumentService.updateDocument>[1] = {
        title: editValues.title.trim() || document.title,
        documentDate: editValues.documentDate || null,
        expiryDate: editValues.expiryDate || null,
        providerName: editValues.providerName.trim() || null,
        locationOfOriginal: editValues.locationOfOriginal.trim() || null,
      };
      await DocumentService.updateDocument(document.id, updates);
      setSavedOverrides(updates);
      setIsEditing(false);
      onDocumentUpdated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${displayDoc.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DocumentService.deleteDocument(document.id);
              onDocumentUpdated?.();
              onClose();
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ],
    );
  };

  const handleImageError = () => {
    setImageError('Could not load image.');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Done, close viewer"
          >
            <Text style={styles.headerButtonText} maxFontSizeMultiplier={1.4}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {isEditing ? 'Edit Document' : displayDoc.title}
          </Text>
          {isEditing ? (
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={[styles.headerButton, styles.cancelButton]}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.headerButton, styles.saveButton]}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.amAmber} />
                ) : (
                  <Text style={styles.saveText} maxFontSizeMultiplier={1.4}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleStartEdit}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Edit document metadata"
            >
              <Text style={styles.editText} maxFontSizeMultiplier={1.4}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.amAmber} />
              <Text style={styles.loadingText} maxFontSizeMultiplier={1.4}>Decrypting...</Text>
            </View>
          ) : decryptError ? (
            <View style={styles.errorBlock} accessibilityRole="alert">
              <Text style={styles.errorIcon} accessible={false}>⚠️</Text>
              <Text style={styles.errorTitle} maxFontSizeMultiplier={1.4}>Could Not Decrypt Document</Text>
              <Text style={styles.errorMessage} maxFontSizeMultiplier={1.4}>{decryptError}</Text>
              <Text style={styles.errorHint} maxFontSizeMultiplier={1.4}>
                The document may be corrupted or the decryption key is unavailable.
              </Text>
            </View>
          ) : document.format === 'pdf' && pdfUri ? (
            <View style={[styles.pdfContainer, { height: windowWidth * 1.4 }]}>
              <PdfView
                uri={pdfUri}
                style={styles.pdfView}
                fitMode="width"
                pagingEnabled
                onError={(e) => setPdfError(e.message)}
              />
            </View>
          ) : document.format === 'pdf' && (pdfError || (!pdfUri && !loading)) ? (
            <View style={styles.pdfPlaceholder}>
              <Text style={styles.pdfIcon} accessible={false}>📄</Text>
              <Text style={styles.pdfTitle} maxFontSizeMultiplier={1.4}>{displayDoc.title}</Text>
              <Text style={styles.pdfHint} maxFontSizeMultiplier={1.4}>
                {pdfError ? `Could not display PDF: ${pdfError}` : 'Document is stored securely in your vault.'}
              </Text>
            </View>
          ) : document.format !== 'pdf' && imageError ? (
            <View style={styles.pdfPlaceholder}>
              <Text style={styles.pdfIcon} accessible={false}>🖼️</Text>
              <Text style={styles.pdfTitle} maxFontSizeMultiplier={1.4}>{displayDoc.title}</Text>
              <Text style={styles.pdfHint} maxFontSizeMultiplier={1.4}>{imageError}</Text>
            </View>
          ) : contentUri && !imageError ? (
            <Image
              source={{ uri: contentUri }}
              style={[styles.image, { width: windowWidth - 32, height: windowWidth * 1.3 }]}
              resizeMode="contain"
              onError={handleImageError}
              accessibilityLabel={`Document image: ${displayDoc.title}`}
            />
          ) : null}

          <View style={styles.metadata}>
            {isEditing ? (
              <>
                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={editValues.title}
                  onChangeText={(t) => setEditValues((v) => ({ ...v, title: t }))}
                  placeholder="Document title"
                  placeholderTextColor={colors.textMuted}
                  editable={!saving}
                  accessibilityLabel="Document title"
                  maxFontSizeMultiplier={1.4}
                />
                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Document Date</Text>
                <DatePickerField
                  label=""
                  value={editValues.documentDate || null}
                  onChange={(d) => setEditValues((v) => ({ ...v, documentDate: d ?? '' }))}
                  placeholder="Select date"
                  disabled={saving}
                />
                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Expiry Date</Text>
                <DatePickerField
                  label=""
                  value={editValues.expiryDate || null}
                  onChange={(d) => setEditValues((v) => ({ ...v, expiryDate: d ?? '' }))}
                  placeholder="Select date"
                  disabled={saving}
                />
                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Provider/Issuer</Text>
                <TextInput
                  style={styles.input}
                  value={editValues.providerName}
                  onChangeText={(t) => setEditValues((v) => ({ ...v, providerName: t }))}
                  placeholder="Provider or issuer name"
                  placeholderTextColor={colors.textMuted}
                  editable={!saving}
                  accessibilityLabel="Provider or issuer"
                  maxFontSizeMultiplier={1.4}
                />
                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Location of Original</Text>
                <TextInput
                  style={styles.input}
                  value={editValues.locationOfOriginal}
                  onChangeText={(t) => setEditValues((v) => ({ ...v, locationOfOriginal: t }))}
                  placeholder="Physical location of original"
                  placeholderTextColor={colors.textMuted}
                  editable={!saving}
                  accessibilityLabel="Location of original document"
                  maxFontSizeMultiplier={1.4}
                />
              </>
            ) : (
              <>
                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Category</Text>
                <Text style={styles.metaValue} maxFontSizeMultiplier={1.4}>
                  {CATEGORY_ICONS[displayDoc.category]} {CATEGORY_LABELS[displayDoc.category]}
                </Text>

                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Document Date</Text>
                <Text style={styles.metaValue} maxFontSizeMultiplier={1.4}>{formatDate(displayDoc.documentDate)}</Text>

                <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Expiry Date</Text>
                <Text style={[styles.metaValue, displayDoc.expiryDate && styles.expiryHighlight]} maxFontSizeMultiplier={1.4}>
                  {formatDate(displayDoc.expiryDate)}
                </Text>

                {displayDoc.providerName && (
                  <>
                    <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Provider/Issuer</Text>
                    <Text style={styles.metaValue} maxFontSizeMultiplier={1.4}>{displayDoc.providerName}</Text>
                  </>
                )}

                {displayDoc.locationOfOriginal && (
                  <>
                    <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Location of Original</Text>
                    <Text style={styles.metaValue} maxFontSizeMultiplier={1.4}>{displayDoc.locationOfOriginal}</Text>
                  </>
                )}

                <View style={styles.historySection}>
                  <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Created</Text>
                  <Text style={styles.metaValue} maxFontSizeMultiplier={1.4}>{formatDate(document.createdAt)}</Text>
                  <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Last Updated</Text>
                  <Text style={styles.metaValue} maxFontSizeMultiplier={1.4}>{formatDate(document.updatedAt)}</Text>
                  <Text style={styles.metaLabel} maxFontSizeMultiplier={1.4}>Format</Text>
                  <Text style={styles.metaValue} maxFontSizeMultiplier={1.4}>{document.format.toUpperCase()}</Text>
                </View>
              </>
            )}
          </View>

          {!isEditing && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete this document"
              accessibilityHint="Permanently removes this document from your vault"
            >
              <Text style={styles.deleteButtonText} maxFontSizeMultiplier={1.4}>Delete Document</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.amBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.amBackground,
    minHeight: 52,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginRight: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 4,
  },
  saveButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 17,
    color: colors.amAmber,
    fontWeight: '600',
  },
  editText: {
    fontSize: 17,
    color: colors.amAmber,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 17,
    color: colors.textMuted,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 17,
    color: colors.amAmber,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.amWhite,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loading: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textMuted,
  },
  errorBlock: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.amCard,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.amDanger,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    opacity: 0.8,
  },
  image: {
    borderRadius: 8,
    backgroundColor: colors.amDeep,
  },
  pdfContainer: {
    backgroundColor: colors.amDeep,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  pdfView: {
    flex: 1,
  },
  pdfPlaceholder: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.amCard,
    borderRadius: 12,
    marginBottom: 24,
  },
  pdfIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.amWhite,
    marginBottom: 8,
  },
  pdfHint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  metadata: {
    backgroundColor: colors.amCard,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    color: colors.amWhite,
  },
  expiryHighlight: {
    color: colors.amAmber,
    fontWeight: '500',
  },
  historySection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    fontSize: 15,
    color: colors.amWhite,
    backgroundColor: colors.amBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    minHeight: 44,
  },
  deleteButton: {
    marginTop: 24,
    backgroundColor: colors.amCard,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.amDanger,
    minHeight: 52,
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amDanger,
  },
});

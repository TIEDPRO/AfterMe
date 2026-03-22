import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { DocumentService } from '../../services/DocumentService';
import {
  DOCUMENT_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  type DocumentCategory,
} from '../../models/DocumentCategory';
import { usePurchase } from '../../context/PurchaseContext';
import { FREE_TIER_DOCUMENT_LIMIT } from '../../constants/products';
import { colors } from '../../theme/colors';

interface AddDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onDocumentAdded: () => void;
  onShowPaywall?: () => void;
}

type Step = 'source' | 'category';

export function AddDocumentModal({
  visible,
  onClose,
  onDocumentAdded,
  onShowPaywall,
}: AddDocumentModalProps) {
  const { canAddDocument, documentsRemaining, isPremium } = usePurchase();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);
  const [step, setStep] = useState<Step>('source');
  const [pendingSource, setPendingSource] = useState<'scan' | 'files' | 'photos' | null>(null);
  const [scanTitle, setScanTitle] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [documentDateError, setDocumentDateError] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryDateError, setExpiryDateError] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const reset = () => {
    setLoading(false);
    setSelectedCategory(null);
    setStep('source');
    setPendingSource(null);
    setScanTitle('');
    setDocumentDate('');
    setDocumentDateError('');
    setExpiryDate('');
    setExpiryDateError('');
    setCategorySearch('');
  };

  const validateDateField = (value: string): string => {
    if (!value.trim()) return '';
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return 'Use DD/MM/YYYY format';
    const [, dd, mm, yyyy] = match;
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    const year = parseInt(yyyy, 10);
    if (month < 1 || month > 12) return 'Invalid month';
    if (day < 1 || day > 31) return 'Invalid day';
    if (year < 1900 || year > 2100) return 'Invalid year';
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return 'Invalid date';
    }
    return '';
  };

  const toIsoDate = (ddmmyyyy: string): string | null => {
    const match = ddmmyyyy.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${match[2]}-${match[1]}`;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const showCategoryPicker = (source: 'scan' | 'files' | 'photos') => {
    if (!canAddDocument) {
      onShowPaywall?.();
      handleClose();
      return;
    }
    setPendingSource(source);
    setStep('category');
  };

  const executeImport = async () => {
    if (!selectedCategory || !pendingSource) return;

    const dateOptions: { documentDate?: string; expiryDate?: string } = {};
    const docDateIso = toIsoDate(documentDate);
    const expDateIso = toIsoDate(expiryDate);
    if (docDateIso) dateOptions.documentDate = docDateIso;
    if (expDateIso) dateOptions.expiryDate = expDateIso;

    try {
      setLoading(true);

      if (pendingSource === 'scan') {
        const result = await DocumentScanner.scanDocument({
          croppedImageQuality: 90,
        });

        if (result.status === 'cancel') {
          setLoading(false);
          return;
        }

        if (!result.scannedImages?.length) {
          Alert.alert('Error', 'No images were scanned.');
          setLoading(false);
          return;
        }

        const baseName = scanTitle.trim() || 'Scanned Document';
        const isMultiPage = result.scannedImages.length > 1;

        for (let i = 0; i < result.scannedImages.length; i++) {
          const img = result.scannedImages[i];
          const isFileUri =
            typeof img === 'string' &&
            (img.startsWith('file://') ||
              img.startsWith('/') ||
              img.startsWith('content://') ||
              img.startsWith('ph://'));
          const isBase64 = typeof img === 'string' && !isFileUri;
          const title = isMultiPage
            ? `${baseName} — Page ${i + 1} of ${result.scannedImages.length}`
            : baseName;

          if (isBase64) {
            await DocumentService.importFromBase64(img, selectedCategory, title, dateOptions);
          } else {
            await DocumentService.importFromFilePath(
              img as string,
              selectedCategory,
              title,
              dateOptions,
            );
          }
        }
      } else if (pendingSource === 'files') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          setLoading(false);
          return;
        }

        const file = result.assets[0];
        await DocumentService.importFromFilePath(
          file.uri,
          selectedCategory,
          file.name || 'Imported Document',
          {
            format: file.mimeType?.includes('pdf')
              ? 'pdf'
              : file.mimeType?.includes('png')
                ? 'png'
                : 'jpeg',
            ...dateOptions,
          },
        );
      } else if (pendingSource === 'photos') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.9,
        });

        if (result.canceled) {
          setLoading(false);
          return;
        }

        const asset = result.assets[0];
        await DocumentService.importFromFilePath(
          asset.uri,
          selectedCategory,
          'Photo from Library',
          dateOptions,
        );
      }

      onDocumentAdded();
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      Alert.alert('Import Error', msg, [
        { text: 'Cancel', style: 'cancel', onPress: handleClose },
        { text: 'Retry', onPress: () => setLoading(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryConfirm = () => {
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please choose a category for your document.');
      return;
    }
    const docErr = validateDateField(documentDate);
    const expErr = validateDateField(expiryDate);
    if (docErr || expErr) {
      setDocumentDateError(docErr);
      setExpiryDateError(expErr);
      return;
    }
    executeImport();
  };

  if (step === 'category') {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">Choose Category</Text>
            <Text style={styles.subtitle}>
              {pendingSource === 'scan'
                ? 'Select category for scanned document'
                : 'Select category for imported document'}
            </Text>

            {pendingSource === 'scan' && (
              <TextInput
                style={styles.titleInput}
                placeholder="Document title (optional)"
                placeholderTextColor={colors.textMuted}
                value={scanTitle}
                onChangeText={setScanTitle}
                maxLength={120}
                accessibilityLabel="Document title"
              />
            )}

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <TextInput
                  style={[styles.dateInput, documentDateError ? styles.dateInputError : null]}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.textMuted}
                  value={documentDate}
                  onChangeText={(t) => { setDocumentDate(t); setDocumentDateError(''); }}
                  onBlur={() => setDocumentDateError(validateDateField(documentDate))}
                  keyboardType="numeric"
                  maxLength={10}
                  accessibilityLabel="Document date"
                />
                <Text style={styles.dateLabel} maxFontSizeMultiplier={1.4}>Document Date</Text>
                {documentDateError ? (
                  <Text style={styles.dateError} maxFontSizeMultiplier={1.4}>{documentDateError}</Text>
                ) : null}
              </View>
              <View style={styles.dateField}>
                <TextInput
                  style={[styles.dateInput, expiryDateError ? styles.dateInputError : null]}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.textMuted}
                  value={expiryDate}
                  onChangeText={(t) => { setExpiryDate(t); setExpiryDateError(''); }}
                  onBlur={() => setExpiryDateError(validateDateField(expiryDate))}
                  keyboardType="numeric"
                  maxLength={10}
                  accessibilityLabel="Expiry date"
                />
                <Text style={styles.dateLabel} maxFontSizeMultiplier={1.4}>Expiry Date</Text>
                {expiryDateError ? (
                  <Text style={styles.dateError} maxFontSizeMultiplier={1.4}>{expiryDateError}</Text>
                ) : null}
              </View>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search categories…"
              placeholderTextColor={colors.textMuted}
              value={categorySearch}
              onChangeText={setCategorySearch}
              autoCorrect={false}
              clearButtonMode="while-editing"
              accessibilityLabel="Search categories"
            />

            <ScrollView style={styles.categoryList}>
              {DOCUMENT_CATEGORIES.filter((cat) => {
                if (!categorySearch.trim()) return true;
                const q = categorySearch.toLowerCase();
                return (
                  CATEGORY_LABELS[cat].toLowerCase().includes(q) ||
                  CATEGORY_DESCRIPTIONS[cat].toLowerCase().includes(q)
                );
              }).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={`${CATEGORY_LABELS[cat]}: ${CATEGORY_DESCRIPTIONS[cat]}`}
                  accessibilityState={{ selected: selectedCategory === cat }}
                >
                  <View style={styles.categoryRow}>
                    <Text style={styles.categoryIcon}>{CATEGORY_ICONS[cat]}</Text>
                    <View style={styles.categoryTextCol}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          selectedCategory === cat && styles.categoryLabelSelected,
                        ]}
                        maxFontSizeMultiplier={1.4}
                      >
                        {CATEGORY_LABELS[cat]}
                      </Text>
                      <Text style={styles.categoryDescription} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                        {CATEGORY_DESCRIPTIONS[cat]}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.secondaryButtonText} maxFontSizeMultiplier={1.4}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, !selectedCategory && styles.primaryButtonDisabled]}
                onPress={handleCategoryConfirm}
                disabled={!selectedCategory || loading}
                accessibilityRole="button"
                accessibilityLabel={pendingSource === 'scan' ? 'Scan Document' : 'Import document'}
              >
                {loading ? (
                  <ActivityIndicator color={colors.amBackground} />
                ) : (
                  <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.4}>
                    {pendingSource === 'scan' ? 'Scan Document' : 'Import'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">Add Document</Text>
          <Text style={styles.subtitle}>Choose how to add your document</Text>

          {!isPremium && (
            <View
              style={styles.freeTierBanner}
              accessibilityRole="text"
              accessibilityLabel={canAddDocument
                ? `${documentsRemaining} of ${FREE_TIER_DOCUMENT_LIMIT} free documents remaining`
                : `Free limit reached, ${FREE_TIER_DOCUMENT_LIMIT} documents. Upgrade to add more.`}
            >
              <Text style={styles.freeTierText} maxFontSizeMultiplier={1.4}>
                {canAddDocument
                  ? `${documentsRemaining} of ${FREE_TIER_DOCUMENT_LIMIT} free documents remaining`
                  : `Free limit reached (${FREE_TIER_DOCUMENT_LIMIT} documents). Upgrade to add more.`}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => showCategoryPicker('scan')}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Scan with Camera"
            accessibilityHint="Opens camera with auto edge-detect, crop, and enhance"
          >
            <Text style={styles.optionIcon}>📷</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel} maxFontSizeMultiplier={1.4}>Scan with Camera</Text>
              <Text style={styles.optionHint} maxFontSizeMultiplier={1.4}>Auto edge-detect, crop, and enhance</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => showCategoryPicker('files')}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Pick from Files"
            accessibilityHint="Import PDF, JPEG, or PNG from Files or cloud storage"
          >
            <Text style={styles.optionIcon}>📁</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel} maxFontSizeMultiplier={1.4}>Pick from Files</Text>
              <Text style={styles.optionHint} maxFontSizeMultiplier={1.4}>PDF, JPEG, or PNG from Files or cloud</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => showCategoryPicker('photos')}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Pick from Photos"
            accessibilityHint="Import image from Photo Library"
          >
            <Text style={styles.optionIcon}>🖼️</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel} maxFontSizeMultiplier={1.4}>Pick from Photos</Text>
              <Text style={styles.optionHint} maxFontSizeMultiplier={1.4}>Import from Photo Library</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText} maxFontSizeMultiplier={1.4}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.amBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.amWhite,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 24,
  },
  titleInput: {
    backgroundColor: colors.amCard,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.amWhite,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    backgroundColor: colors.amCard,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.amWhite,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateInputError: {
    borderColor: colors.amDanger,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  dateError: {
    fontSize: 11,
    color: colors.amDanger,
    marginTop: 2,
  },
  searchInput: {
    backgroundColor: colors.amCard,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.amWhite,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.amCard,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 60,
  },
  optionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amWhite,
  },
  optionHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  categoryList: {
    maxHeight: 240,
    marginBottom: 16,
  },
  categoryButton: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.amCard,
    minHeight: 52,
    justifyContent: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: colors.amCard,
    borderWidth: 2,
    borderColor: colors.amAmber,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryTextCol: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    color: colors.amWhite,
  },
  categoryLabelSelected: {
    fontWeight: '600',
    color: colors.amWhite,
  },
  categoryDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.amAmber,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.amBackground,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.amCard,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.amWhite,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    padding: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  freeTierBanner: {
    backgroundColor: 'rgba(201,150,58,0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,150,58,0.3)',
  },
  freeTierText: {
    fontSize: 13,
    color: colors.amAmber,
    textAlign: 'center',
    fontWeight: '500',
  },
});

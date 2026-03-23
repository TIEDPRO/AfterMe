/**
 * DatePickerField — tappable date field that opens a native calendar picker.
 * Displays the selected date as DD/MM/YYYY. Stores as ISO (YYYY-MM-DD) internally.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';

interface DatePickerFieldProps {
  label: string;
  value: string | null;
  onChange: (isoDate: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

function isoToDate(iso: string | null): Date {
  if (!iso) return new Date();
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function dateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplay(iso: string | null): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handlePress = () => {
    if (!disabled) setShowPicker(true);
  };

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (_event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      onChange(dateToIso(selectedDate));
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }
    }
  };

  const handleClear = () => {
    onChange(null);
    setShowPicker(false);
  };

  const handleDoneIOS = () => {
    setShowPicker(false);
  };

  const displayText = formatDisplay(value);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayText || 'not set'}. Tap to select date.`}
        disabled={disabled}
      >
        <Text style={[styles.fieldText, !displayText && styles.placeholder]} maxFontSizeMultiplier={1.4}>
          {displayText || placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
          >
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>{label}</Text>

      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.iosPickerContainer}>
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity onPress={handleClear} accessibilityRole="button" accessibilityLabel="Clear date">
              <Text style={styles.iosHeaderClear}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDoneIOS} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={styles.iosHeaderDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={isoToDate(value)}
            mode="date"
            display="spinner"
            onChange={handleChange}
            themeVariant="dark"
            textColor={colors.amWhite}
          />
        </View>
      )}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={isoToDate(value)}
          mode="date"
          display="calendar"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  field: {
    backgroundColor: colors.amCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldText: {
    fontSize: 15,
    color: colors.amWhite,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  clearButton: {
    fontSize: 14,
    color: colors.textMuted,
    paddingLeft: 8,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  iosPickerContainer: {
    backgroundColor: colors.amCard,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iosHeaderClear: {
    fontSize: 15,
    color: colors.textMuted,
  },
  iosHeaderDone: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.amAmber,
  },
});

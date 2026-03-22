/**
 * Cross-platform action sheet.
 * iOS: delegates to native ActionSheetIOS for system-native feel.
 * Android: renders a custom bottom sheet modal with slide-up animation.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  ActionSheetIOS,
  Platform,
} from 'react-native';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onCancel: () => void;
}

export function showActionSheet(
  title: string | undefined,
  options: ActionSheetOption[],
  onCancel: () => void,
): void {
  if (Platform.OS === 'ios') {
    const labels = [...options.map((o) => o.label), 'Cancel'];
    const destructiveIndex = options.findIndex((o) => o.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: labels,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        cancelButtonIndex: labels.length - 1,
      },
      (index) => {
        if (index < options.length) {
          options[index].onPress();
        } else {
          onCancel();
        }
      },
    );
  }
}

export function ActionSheet({ visible, title, options, onCancel }: ActionSheetProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 4 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onCancel());
  };

  if (Platform.OS === 'ios') return null;

  const screenHeight = Dimensions.get('window').height;
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.4, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {title ? (
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>{title}</Text>
          ) : null}

          {options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.option, i === 0 && !title && styles.optionFirst]}
              onPress={() => {
                handleClose();
                setTimeout(() => opt.onPress(), 200);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
            >
              <Text style={[styles.optionText, opt.destructive && styles.destructiveText]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.cancelSeparator} />
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1E2235',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(250,249,246,0.5)',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(250,249,246,0.1)',
    marginBottom: 4,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(250,249,246,0.06)',
  },
  optionFirst: {
    paddingTop: 12,
  },
  optionText: {
    fontSize: 17,
    color: '#FAF9F6',
    textAlign: 'center',
  },
  destructiveText: {
    color: '#E24B4A',
  },
  cancelSeparator: {
    height: 8,
  },
  cancelButton: {
    paddingVertical: 16,
    backgroundColor: 'rgba(250,249,246,0.06)',
    borderRadius: 14,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#C9963A',
    textAlign: 'center',
  },
});

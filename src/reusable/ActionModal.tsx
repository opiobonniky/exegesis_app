// src/reusable/ActionModal.tsx
import React, { useContext, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../constants/theme';
import { AppContext } from '../common/AppContext';

export type ModalSeverity = 'success' | 'error' | 'warning' | 'info';

interface ActionModalProps {
  visible: boolean;
  title: string;
  message: string;
  severity?: ModalSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
  extraLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onExtra?: () => void;
  showCancel?: boolean; // Explicit control (default: !!onCancel && !!cancelLabel)
  closeOnBackdrop?: boolean; // Whether tapping outside closes modal
  confirmButtonColor?: string; // Optional override
}

export default function ActionModal({
  visible,
  title,
  message,
  severity = 'info',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  extraLabel,
  onConfirm,
  onCancel,
  onExtra,
  showCancel: propShowCancel,
  closeOnBackdrop = true,
  confirmButtonColor,
}: ActionModalProps) {
  const app = useContext(AppContext);
  if (!app) return null;

  const COLORS = useMemo(() => getColors(app.isDark), [app.isDark]);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 140,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getSeverityStyles = () => {
    switch (severity) {
      case 'success':
        return { accent: COLORS.success, bg: `${COLORS.success}15` };
      case 'error':
        return { accent: COLORS.error, bg: `${COLORS.error}15` };
      case 'warning':
        return { accent: '#F59E0B', bg: '#FEF3C715' };
      case 'info':
      default:
        return { accent: COLORS.primary, bg: `${COLORS.primary}15` };
    }
  };

  const { accent, bg } = getSeverityStyles();
  const finalConfirmColor = confirmButtonColor || accent;

  const hasCancel =
    propShowCancel ?? (Boolean(onCancel) && Boolean(cancelLabel));

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      if (hasCancel && onCancel) {
        onCancel();
      } else {
        onConfirm(); // fallback to confirm if no cancel
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel || onConfirm}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: COLORS.surface,
                  transform: [{ scale: scaleAnim }],
                  borderColor: `${accent}40`,
                  borderWidth: 1,
                },
              ]}
            >
              {/* Icon / Emoji */}
              <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
                <Text style={[styles.icon, { color: accent }]}>
                  {severity === 'success'
                    ? '✓'
                    : severity === 'error'
                      ? '✕'
                      : severity === 'warning'
                        ? '⚠'
                        : 'ℹ'}
                </Text>
              </View>

              {/* Title & Message */}
              <View style={styles.content}>
                <Text
                  style={[styles.title, { color: COLORS.text }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {title}
                </Text>

                <Text style={[styles.message, { color: COLORS.textSecondary }]}>
                  {message}
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                {hasCancel && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      { borderColor: COLORS.border },
                    ]}
                    onPress={onCancel}
                    accessibilityLabel={cancelLabel}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[styles.cancelText, { color: COLORS.text }]}
                      numberOfLines={1}
                    >
                      {cancelLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {extraLabel && onExtra && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      { borderColor: COLORS.border },
                    ]}
                    onPress={onExtra}
                    accessibilityLabel={extraLabel}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[styles.cancelText, { color: COLORS.text }]}
                      numberOfLines={1}
                    >
                      {extraLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: finalConfirmColor },
                  ]}
                  onPress={onConfirm}
                  accessibilityLabel={confirmLabel}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmText} numberOfLines={1}>
                    {confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'ios' ? 340 : 320,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  icon: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  singleButtonRow: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  confirmButton: {
    // background set inline
  },
  cancelButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  confirmText: {
    color: 'white',
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  cancelText: {
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
});

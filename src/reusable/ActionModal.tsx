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
  showCancel?: boolean;
  closeOnBackdrop?: boolean;
  confirmButtonColor?: string;
}

const severityTheme = {
  success: { icon: '✓' },
  error: { icon: '✕' },
  warning: { icon: '!' },
  info: { icon: 'i' },
};

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

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 220,
          friction: 20,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getSeverityColors = () => {
    switch (severity) {
      case 'success':
        return { accent: COLORS.success, tint: `${COLORS.success}15`, bar: COLORS.success };
      case 'error':
        return { accent: COLORS.error, tint: `${COLORS.error}15`, bar: COLORS.error };
      case 'warning':
        return { accent: COLORS.warning, tint: `${COLORS.warning}15`, bar: COLORS.warning };
      case 'info':
      default:
        return { accent: COLORS.primary, tint: `${COLORS.primary}15`, bar: COLORS.primary };
    }
  };

  const { accent, tint, bar } = getSeverityColors();
  const finalConfirmColor = confirmButtonColor || accent;

  const hasCancel =
    propShowCancel ?? (Boolean(onCancel) && Boolean(cancelLabel));
  const hasExtra = Boolean(extraLabel && onExtra);
  const buttonCount = 1 + (hasCancel ? 1 : 0) + (hasExtra ? 1 : 0);

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      if (hasCancel && onCancel) {
        onCancel();
      } else {
        onConfirm();
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
          <Animated.View
            style={[styles.backdrop, { backgroundColor: COLORS.overlay, opacity: fadeAnim }]}
          />

          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: COLORS.surface,
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                  shadowColor: COLORS.shadowColor,
                },
              ]}
            >
              {/* Severity Bar */}
              <View style={[styles.severityBar, { backgroundColor: bar }]} />

              {/* Body */}
              <View style={styles.body}>
                {/* Icon */}
                <View style={[styles.iconRing, { borderColor: `${accent}40` }]}>
                  <View style={[styles.iconFill, { backgroundColor: tint }]}>
                    <Text style={[styles.iconText, { color: accent }]}>
                      {severityTheme[severity].icon}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text
                  style={[styles.title, { color: COLORS.text }]}
                  numberOfLines={2}
                >
                  {title}
                </Text>

                {/* Message */}
                {message ? (
                  <Text style={[styles.message, { color: COLORS.textSecondary }]}>
                    {message}
                  </Text>
                ) : null}
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: COLORS.border }]} />

              {/* Buttons */}
              <View
                style={[
                  styles.buttonRow,
                  { marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
                  buttonCount === 1 && styles.buttonRowSingle,
                ]}
              >
                {hasCancel && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.outlinedButton,
                      { borderColor: `${COLORS.text}25` },
                    ]}
                    onPress={onCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.outlinedText, { color: COLORS.textSecondary }]} numberOfLines={1}>
                      {cancelLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {hasExtra && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.outlinedButton,
                      { borderColor: `${COLORS.text}25` },
                    ]}
                    onPress={onExtra}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.outlinedText, { color: COLORS.textSecondary }]} numberOfLines={1}>
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
                  activeOpacity={0.85}
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
    padding: SPACING.xxl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'ios' ? 310 : 290,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  severityBar: {
    height: 4,
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconFill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.15,
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: Platform.OS === 'ios' ? 10 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  outlinedButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmText: {
    color: 'white',
    fontWeight: '600',
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  outlinedText: {
    fontWeight: '600',
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.3,
  },
});

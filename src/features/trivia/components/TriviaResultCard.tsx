import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { CheckCircle2, XCircle, Lightbulb, X } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../../constants/theme';
import { TriviaAnswerResult } from '../services/triviaApi';

interface Props {
  result: TriviaAnswerResult;
  isRtl: boolean;
  isDark?: boolean;
  onDismiss?: () => void;
}

export default function TriviaResultCard({
  result,
  isRtl,
  isDark = false,
  onDismiss,
}: Props) {
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  const handleDismiss = useCallback(() => {
    // Light haptic feedback on dismiss
    try {
      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } catch {
      // Haptic not supported — silently continue
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  }, [fadeAnim, scaleAnim, onDismiss]);

  const accentColor = result.isCorrect ? COLORS.success : COLORS.error;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: accentColor,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Close button */}
      <TouchableOpacity
        style={[
          styles.closeButton,
          isRtl && { right: 'auto', left: SPACING.sm },
        ]}
        onPress={handleDismiss}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={16} color={COLORS.muted} />
      </TouchableOpacity>

      {/* Icon + Result header */}
      <View style={[styles.header, isRtl && { flexDirection: 'row-reverse' }]}>
        <View
          style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}
        >
          {result.isCorrect ? (
            <CheckCircle2 size={20} color={COLORS.success} />
          ) : (
            <XCircle size={20} color={COLORS.error} />
          )}
        </View>
        <View style={[styles.headerText, isRtl && { alignItems: 'flex-end' }]}>
          <Text style={[styles.title, { color: accentColor }]}>
            {result.isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
          {!result.isCorrect && (
            <Text
              style={[styles.correctAnswer, isRtl && { textAlign: 'right' }]}
            >
              {result.correctAnswerText}
            </Text>
          )}
        </View>
      </View>

      {/* Explanation */}
      {result.explanation && (
        <View
          style={[
            styles.explanationBox,
            isRtl && { flexDirection: 'row-reverse' },
          ]}
        >
          <Lightbulb size={14} color={COLORS.info} />
          <Text
            style={[
              styles.explanationText,
              isRtl && { textAlign: 'right', writingDirection: 'rtl', flex: 1 },
            ]}
          >
            {result.explanation}
          </Text>
        </View>
      )}

      {/* Dismiss button */}
      <TouchableOpacity
        style={[styles.dismissBtn, { backgroundColor: accentColor }]}
        onPress={handleDismiss}
        activeOpacity={0.85}
      >
        <Text style={styles.dismissBtnText}>Continue</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.sm,
      borderWidth: 1.5,
      marginBottom: SPACING.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: 6,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: FONT_SIZES.md,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    correctAnswer: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      fontWeight: '600',
      marginTop: 1,
    },
    explanationBox: {
      flexDirection: 'row',
      gap: SPACING.sm,
      padding: 8,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: `${COLORS.info}10`,
      alignItems: 'flex-start',
    },
    explanationText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      lineHeight: 18,
    },
    closeButton: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      zIndex: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${COLORS.border}40`,
    },
    dismissBtn: {
      marginTop: SPACING.sm,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderRadius: BORDER_RADIUS.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.sm,
      fontWeight: '800',
    },
  });

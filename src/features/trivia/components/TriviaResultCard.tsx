import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { TriviaAnswerResult } from '../services/triviaApi';

interface Props {
  result: TriviaAnswerResult;
  isRtl: boolean;
  isDark?: boolean;
}

export default function TriviaResultCard({ result, isRtl, isDark = false }: Props) {
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

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
      {/* Icon + Result header */}
      <View style={[styles.header, isRtl && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
          {result.isCorrect ? (
            <CheckCircle2 size={28} color={COLORS.success} />
          ) : (
            <XCircle size={28} color={COLORS.error} />
          )}
        </View>
        <View style={[styles.headerText, isRtl && { alignItems: 'flex-end' }]}>
          <Text style={[styles.title, { color: accentColor }]}>
            {result.isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
          {!result.isCorrect && (
            <Text style={[styles.correctAnswer, isRtl && { textAlign: 'right' }]}>
              Answer: {result.correctAnswerText}
            </Text>
          )}
        </View>
      </View>

      {/* Explanation */}
      {result.explanation && (
        <View style={[styles.explanationBox, isRtl && { flexDirection: 'row-reverse' }]}>
          <Lightbulb size={16} color={COLORS.info} />
          <Text style={[styles.explanationText, isRtl && { textAlign: 'right', writingDirection: 'rtl', flex: 1 }]}>
            {result.explanation}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 2,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  correctAnswer: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  explanationBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.info}10`,
    alignItems: 'flex-start',
  },
  explanationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

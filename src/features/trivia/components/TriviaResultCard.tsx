import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react-native';
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
  onNext?: () => void;
}

export default function TriviaResultCard({
  result,
  isRtl,
  isDark = false,
  onNext,
}: Props) {
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [exiting, setExiting] = useState(false);
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

  const handleNext = useCallback(() => {
    if (exiting) return;
    setExiting(true);
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
      onNext?.();
    });
  }, [exiting, fadeAnim, scaleAnim, onNext]);

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
      {/* Icon + Result + Continue row */}
      <View style={[styles.row, isRtl && { flexDirection: 'row-reverse' }]}>
        <View
          style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}
        >
          {result.isCorrect ? (
            <CheckCircle2 size={14} color={COLORS.success} />
          ) : (
            <XCircle size={14} color={COLORS.error} />
          )}
        </View>
        <View style={[styles.textWrap, isRtl && { alignItems: 'flex-end' }]}>
          <Text style={[styles.title, { color: accentColor }]}>
            {result.isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
          {!result.isCorrect && (
            <Text style={[styles.correctAnswer, isRtl && { textAlign: 'right' }]}>
              {result.correctAnswerText}
            </Text>
          )}
          {result.explanation && (
            <View style={[styles.explanationRow, isRtl && { flexDirection: 'row-reverse' }]}>
              <Lightbulb size={11} color={COLORS.info} />
              <Text style={[styles.explanationText, isRtl && { textAlign: 'right', flex: 1 }]}>
                {result.explanation}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: accentColor }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderWidth: 1,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    correctAnswer: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontWeight: '600',
      marginTop: 0,
    },
    explanationRow: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'flex-start',
      marginTop: 2,
    },
    explanationText: {
      fontSize: 11,
      color: COLORS.textSecondary,
      lineHeight: 15,
    },
    nextBtn: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: BORDER_RADIUS.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
  });

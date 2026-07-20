import React, { useMemo } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, X, BookOpen, ExternalLink } from 'lucide-react-native';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../../constants/theme';
import { parseOptions, TriviaQuestionResponse } from '../services/triviaApi';

interface Props {
  question: TriviaQuestionResponse;
  selectedAnswer: number | null;
  disabled: boolean;
  loading?: boolean;
  isRtl: boolean;
  isDark?: boolean;
  correctAnswerIndex?: number | null;
  onSelect: (index: number) => void;
  onReferencePress?: (
    bookName: string,
    chapter: number,
    verseNumber?: number | null,
  ) => void;
}

export default function TriviaQuestionCard({
  question,
  selectedAnswer,
  disabled,
  loading = false,
  isRtl,
  isDark = false,
  correctAnswerIndex,
  onSelect,
  onReferencePress,
}: Props) {
  const options = useMemo(
    () => parseOptions(question.optionsJson),
    [question.optionsJson],
  );
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.card}>
      {/* Category + Difficulty badge */}
      <View style={[styles.metaRow, isRtl && { flexDirection: 'row-reverse' }]}>
        {question.category && (
          <View
            style={[styles.badge, { backgroundColor: `${COLORS.accent}18` }]}
          >
            <Text style={[styles.badgeText, { color: COLORS.accent }]}>
              {question.category.toUpperCase()}
            </Text>
          </View>
        )}
        {question.difficulty && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  question.difficulty === 'easy'
                    ? `${COLORS.success}18`
                    : question.difficulty === 'hard'
                      ? `${COLORS.error}18`
                      : `${COLORS.info}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    question.difficulty === 'easy'
                      ? COLORS.success
                      : question.difficulty === 'hard'
                        ? COLORS.error
                        : COLORS.info,
                },
              ]}
            >
              {question.difficulty.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Question text */}
      <View style={styles.questionBlock}>
        <Text
          style={[
            styles.questionLabel,
            isRtl && { textAlign: 'right', writingDirection: 'rtl' },
          ]}
        >
          Question
        </Text>
        <Text
          style={[
            styles.questionText,
            isRtl && { textAlign: 'right', writingDirection: 'rtl' },
          ]}
        >
          {question.question}
        </Text>
      </View>

      {/* Scripture reference — tappable compact strip */}
      {question.bookName && (
        <TouchableOpacity
          style={[
            styles.referenceRow,
            isRtl && { flexDirection: 'row-reverse' },
          ]}
          activeOpacity={0.7}
          onPress={() =>
            onReferencePress?.(
              question.bookName!,
              question.chapter ?? 1,
              question.verseNumber,
            )
          }
        >
          <View style={styles.referenceIconWrap}>
            <BookOpen size={14} color={COLORS.accent} />
          </View>
          <View style={styles.referenceTextWrap}>
            <Text style={styles.referenceLabel}>Read passage</Text>
            <Text
              style={[styles.referenceText, isRtl && { textAlign: 'right' }]}
            >
              {question.bookName} {question.chapter ?? ''}
              {question.verseNumber ? `:${question.verseNumber}` : ''}
            </Text>
          </View>
          <ExternalLink size={14} color={COLORS.accent} />
        </TouchableOpacity>
      )}

      {/* Options */}
      <View style={styles.optionsContainer}>
        <Text
          style={[
            styles.optionsLabel,
            isRtl && { textAlign: 'right', writingDirection: 'rtl' },
          ]}
        >
          Choose an answer
        </Text>
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrectAnswer =
            disabled &&
            correctAnswerIndex != null &&
            correctAnswerIndex === index;
          const isWrongSelection =
            disabled &&
            isSelected &&
            correctAnswerIndex != null &&
            !isCorrectAnswer;

          let optionBorderColor = COLORS.border;
          let optionBgColor = COLORS.surface;
          let letterBgColor = COLORS.cardBackground;
          let letterTextColor = COLORS.muted;
          let optionTextColor = COLORS.text;
          let isDimmed = false;

          if (disabled) {
            if (isCorrectAnswer) {
              optionBorderColor = COLORS.success;
              optionBgColor = `${COLORS.success}10`;
              letterBgColor = COLORS.success;
              letterTextColor = '#FFFFFF';
              optionTextColor = COLORS.success;
            } else if (isWrongSelection) {
              optionBorderColor = COLORS.error;
              optionBgColor = `${COLORS.error}10`;
              letterBgColor = COLORS.error;
              letterTextColor = '#FFFFFF';
              optionTextColor = COLORS.error;
            } else if (isSelected && correctAnswerIndex == null) {
              optionBorderColor = COLORS.accent;
              optionBgColor = `${COLORS.accent}10`;
              letterBgColor = COLORS.accent;
              letterTextColor = '#FFFFFF';
            } else {
              isDimmed = true;
            }
          } else if (isSelected) {
            optionBorderColor = COLORS.accent;
            optionBgColor = `${COLORS.accent}10`;
            letterBgColor = COLORS.accent;
            letterTextColor = '#FFFFFF';
          }

          let statusIcon = null;
          if (disabled) {
            if (isCorrectAnswer) {
              statusIcon = (
                <Check size={18} color={COLORS.success} strokeWidth={3} />
              );
            } else if (isWrongSelection) {
              statusIcon = <X size={18} color={COLORS.error} strokeWidth={3} />;
            }
          }

          const optionLetters = isRtl ? 'א,ב,ג,ד,ה,ו,ז,ח' : 'A,B,C,D,E,F,G,H';
          const letter = optionLetters.split(',')[index] || `${index + 1}`;
          const showLoader = loading && isSelected;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                {
                  borderColor: optionBorderColor,
                  backgroundColor: optionBgColor,
                  opacity: isDimmed ? 0.4 : 1,
                },
              ]}
              activeOpacity={0.7}
              disabled={disabled || loading}
              onPress={() => onSelect(index)}
            >
              <View
                style={[
                  styles.optionLetter,
                  {
                    backgroundColor: letterBgColor,
                    borderColor: optionBorderColor,
                  },
                ]}
              >
                {showLoader ? (
                  <ActivityIndicator size="small" color={letterTextColor} />
                ) : (
                  <Text
                    style={[styles.optionLetterText, { color: letterTextColor }]}
                  >
                    {letter}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.optionText,
                  { color: optionTextColor },
                  isRtl && {
                    textAlign: 'right',
                    writingDirection: 'rtl',
                    flex: 1,
                  },
                ]}
                numberOfLines={3}
              >
                {option}
              </Text>
              {statusIcon && (
                <View style={styles.statusIconContainer}>{statusIcon}</View>
              )}
              {showLoader && (
                <View style={styles.statusIconContainer}>
                  <ActivityIndicator size="small" color={optionTextColor} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    card: {
      width: '100%',
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 2,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: SPACING.sm,
    },
    badge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.round,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    questionBlock: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: `${COLORS.accent}0D`,
      borderWidth: 1,
      borderColor: `${COLORS.accent}22`,
      marginBottom: SPACING.md,
    },
    questionLabel: {
      fontSize: 10,
      color: COLORS.accent,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    questionText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      color: COLORS.text,
      lineHeight: 26,
    },
    referenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
      paddingVertical: 8,
      paddingHorizontal: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: `${COLORS.accent}20`,
      backgroundColor: `${COLORS.accent}08`,
    },
    referenceIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${COLORS.accent}14`,
    },
    referenceTextWrap: {
      flex: 1,
      gap: 1,
    },
    referenceLabel: {
      fontSize: 10,
      color: COLORS.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    referenceText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.accent,
      fontWeight: '900',
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    optionsLabel: {
      width: '100%',
      fontSize: 11,
      color: COLORS.muted,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      marginBottom: 2,
    },
    option: {
      position: 'relative',
      width: '48%',
      minHeight: 96,
      justifyContent: 'space-between',
      padding: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      gap: SPACING.sm,
    },
    optionLetter: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    optionLetterText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '900',
      color: COLORS.muted,
    },
    optionText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      fontWeight: '700',
      lineHeight: 18,
    },
    statusIconContainer: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

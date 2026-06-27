import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, X, BookOpen, ExternalLink } from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { parseOptions, TriviaQuestionResponse } from '../services/triviaApi';

interface Props {
  question: TriviaQuestionResponse;
  selectedAnswer: number | null;
  disabled: boolean;
  isRtl: boolean;
  isDark?: boolean;
  correctAnswerIndex?: number | null;
  onSelect: (index: number) => void;
  onReferencePress?: (bookName: string, chapter: number, verseNumber?: number | null) => void;
}

export default function TriviaQuestionCard({ question, selectedAnswer, disabled, isRtl, isDark = false, correctAnswerIndex, onSelect, onReferencePress }: Props) {
  const options = useMemo(() => parseOptions(question.optionsJson), [question.optionsJson]);
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      {/* Category + Difficulty badge */}
      <View style={[styles.metaRow, isRtl && { flexDirection: 'row-reverse' }]}>
        {question.category && (
          <View style={[styles.badge, { backgroundColor: `${COLORS.accent}18` }]}>
            <Text style={[styles.badgeText, { color: COLORS.accent }]}>
              {question.category.toUpperCase()}
            </Text>
          </View>
        )}
        {question.difficulty && (
          <View style={[styles.badge, {
            backgroundColor:
              question.difficulty === 'easy' ? `${COLORS.success}18` :
              question.difficulty === 'hard' ? `${COLORS.error}18` :
              `${COLORS.info}18`,
          }]}>
            <Text style={[styles.badgeText, {
              color:
                question.difficulty === 'easy' ? COLORS.success :
                question.difficulty === 'hard' ? COLORS.error :
                COLORS.info,
            }]}>
              {question.difficulty.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Question text */}
      <Text style={[styles.questionText, isRtl && { textAlign: 'right', writingDirection: 'rtl' }]}>
        {question.question}
      </Text>

      {/* Scripture reference — tappable */}
      {question.bookName && (
        <TouchableOpacity
          style={[styles.referenceRow, isRtl && { flexDirection: 'row-reverse' }]}
          activeOpacity={0.7}
          onPress={() => onReferencePress?.(
            question.bookName!,
            question.chapter ?? 1,
            question.verseNumber,
          )}
        >
          <View style={[styles.referenceIcon, { backgroundColor: `${COLORS.accent}15` }]}>
            <BookOpen size={14} color={COLORS.accent} />
          </View>
          <Text style={[styles.referenceText, isRtl && { textAlign: 'right' }]}>
            {question.bookName} {question.chapter ?? ''}{question.verseNumber ? `:${question.verseNumber}` : ''}
          </Text>
          <ExternalLink size={14} color={COLORS.accent} />
        </TouchableOpacity>
      )}

      {/* Options */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrectAnswer = disabled && correctAnswerIndex != null && correctAnswerIndex === index;
          const isWrongSelection = disabled && isSelected && correctAnswerIndex != null && !isCorrectAnswer;

          let optionBorderColor = COLORS.border;
          let optionBgColor = COLORS.cardBackground;
          let letterBgColor = COLORS.cardBackground;
          let letterTextColor = COLORS.muted;
          let optionTextColor = COLORS.text;
          let isDimmed = false;

          if (disabled) {
            if (isCorrectAnswer) {
              // Correct answer — green highlight
              optionBorderColor = COLORS.success;
              optionBgColor = `${COLORS.success}12`;
              letterBgColor = COLORS.success;
              letterTextColor = '#FFFFFF';
              optionTextColor = COLORS.success;
            } else if (isWrongSelection) {
              // Wrong selection — red highlight
              optionBorderColor = COLORS.error;
              optionBgColor = `${COLORS.error}12`;
              letterBgColor = COLORS.error;
              letterTextColor = '#FFFFFF';
              optionTextColor = COLORS.error;
            } else if (isSelected && correctAnswerIndex == null) {
              // Selected but no correct answer known (fallback)
              optionBorderColor = COLORS.accent;
              optionBgColor = `${COLORS.accent}10`;
              letterBgColor = COLORS.accent;
              letterTextColor = '#FFFFFF';
            } else {
              // Non-selected, non-correct — dim
              isDimmed = true;
            }
          } else if (isSelected) {
            // Before submitting — show selection accent
            optionBorderColor = COLORS.accent;
            optionBgColor = `${COLORS.accent}10`;
            letterBgColor = COLORS.accent;
            letterTextColor = '#FFFFFF';
          }

          // Determine if we should show a checkmark or X icon
          let statusIcon = null;
          if (disabled) {
            if (isCorrectAnswer) {
              statusIcon = <Check size={16} color={COLORS.success} strokeWidth={3} />;
            } else if (isWrongSelection) {
              statusIcon = <X size={16} color={COLORS.error} strokeWidth={3} />;
            }
          }

          const optionLetters = isRtl ? 'א,ב,ג,ד,ה,ו,ז,ח' : 'A,B,C,D,E,F,G,H';
          const letter = optionLetters.split(',')[index] || `${index + 1}`;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                {
                  borderColor: optionBorderColor,
                  backgroundColor: optionBgColor,
                  opacity: isDimmed ? 0.45 : 1,
                },
                isRtl && { flexDirection: 'row-reverse' },
              ]}
              activeOpacity={0.7}
              disabled={disabled}
              onPress={() => onSelect(index)}
            >
              <View style={[
                styles.optionLetter,
                { backgroundColor: letterBgColor, borderColor: optionBorderColor },
              ]}>
                <Text style={[
                  styles.optionLetterText,
                  { color: letterTextColor },
                ]}>
                  {letter}
                </Text>
              </View>
              <Text style={[
                styles.optionText,
                { color: optionTextColor },
                isRtl && { textAlign: 'right', writingDirection: 'rtl', flex: 1 },
              ]}>
                {option}
              </Text>
              {statusIcon && (
                <View style={styles.statusIconContainer}>
                  {statusIcon}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 26,
    marginBottom: SPACING.sm,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.accent}20`,
    backgroundColor: `${COLORS.accent}08`,
  },
  referenceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    fontWeight: '700',
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    gap: SPACING.md,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionLetterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.muted,
  },
  optionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  statusIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
  },
});

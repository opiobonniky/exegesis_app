import React, { useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Play, RotateCcw, PartyPopper, BookOpen, BookMarked } from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import ActionHeader from '../../reusable/ActionHeader';
import { route } from '../../component/navigations/routes';
import { useTrivia } from './hooks/useTrivia';
import TriviaQuestionCard from './components/TriviaQuestionCard';
import TriviaResultCard from './components/TriviaResultCard';

export default function TriviaScreen() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const { language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const {
    phase,
    question,
    selectedAnswer,
    result,
    score,
    stats,
    loading,
    error,
    difficulty,
    totalCount,
    fetchQuestion,
    answer,
    nextQuestion,
    fetchStats,
    reset,
    setDifficulty,
  } = useTrivia();

  // Track reset count to trigger refetch via effect
  const resetCountRef = useRef(0);
  const prevDifficultyRef = useRef(difficulty);

  // Fetch first question + stats on mount
  useEffect(() => {
    fetchQuestion();
    fetchStats();
  }, [fetchQuestion, fetchStats]);

  // Re-fetch question after reset
  useEffect(() => {
    if (resetCountRef.current > 0) {
      fetchQuestion();
    }
  }, [resetCountRef.current, fetchQuestion]);

  // Re-fetch question when difficulty filter changes
  useEffect(() => {
    if (prevDifficultyRef.current !== difficulty) {
      prevDifficultyRef.current = difficulty;
      fetchQuestion();
    }
  }, [difficulty, fetchQuestion]);

  const handleSelect = useCallback((index: number) => {
    if (selectedAnswer !== null) return; // already answered
    answer(index);
  }, [answer, selectedAnswer]);

  const handleNext = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  const handleReset = useCallback(() => {
    reset();
    resetCountRef.current += 1;
  }, [reset]);

  const handleReferencePress = useCallback((
    bookName: string,
    chapter: number,
    verseNumber?: number | null,
  ) => {
    navigation.navigate(route.bible, {
      bookName,
      chapter,
      verseNumber: verseNumber ?? 1,
    });
  }, [navigation]);

  const scoreBadge = score.total > 0 ? (
    <View style={[styles.headerScoreBadge, { backgroundColor: `${COLORS.accent}18` }]}>
      <Text style={[styles.headerScoreText, { color: COLORS.accent }]}>
        {score.correct}/{score.total}
      </Text>
    </View>
  ) : undefined;

  return (
    <View style={styles.container}>
      {/* ── ActionHeader ── */}
      <ActionHeader
        mode="standard"
        title="Bible Trivia"
        subtitle={difficulty ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} questions` : undefined}
        onPress={() => navigation.goBack()}
        rightComponent={scoreBadge}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Difficulty filter chips */}
        <View style={[styles.filterRow, isRtl && { flexDirection: 'row-reverse' }]}>
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => {
            const isActive = d === 'all' ? difficulty === null : difficulty === d;
            const chipColors =
              d === 'easy'
                ? { bg: `${COLORS.success}18`, text: COLORS.success }
                : d === 'hard'
                  ? { bg: `${COLORS.error}18`, text: COLORS.error }
                  : d === 'medium'
                    ? { bg: `${COLORS.info}18`, text: COLORS.info }
                    : { bg: `${COLORS.accent}15`, text: COLORS.accent };

            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.filterChip,
                  { borderColor: COLORS.border },
                  isActive && {
                    backgroundColor: chipColors.bg,
                    borderColor: chipColors.text,
                  },
                  !isActive && { backgroundColor: COLORS.cardBackground },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setDifficulty(d === 'all' ? null : d);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: COLORS.muted },
                    isActive && { color: chipColors.text, fontWeight: '700' },
                  ]}
                >
                  {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Progress indicator: Question X of Y */}
        {totalCount > 0 && (
          <View style={[styles.progressRow, isRtl && { flexDirection: 'row-reverse' }]}>
            <View style={styles.progressLabelWrap}>
              <Text style={[styles.progressLabel, isRtl && { textAlign: 'right' }]}>
                Question {score.total + 1} of {totalCount}
              </Text>
              {difficulty && (
                <Text style={[styles.progressDifficulty, isRtl && { textAlign: 'right' }]}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
              )}
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: COLORS.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: COLORS.accent,
                    width: `${(score.total / totalCount) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Loading state */}
        {loading && !question && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={[styles.loadingText, isRtl && { textAlign: 'right' }]}>
              Loading question...
            </Text>
          </View>
        )}

        {/* Error state */}
        {error && (
          <View style={styles.centerState}>
            <Text style={[styles.errorText, isRtl && { textAlign: 'right' }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: COLORS.accent }]}
              onPress={fetchQuestion}
              activeOpacity={0.8}
            >
              <RotateCcw size={14} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Playing phase */}
        {phase === 'playing' && question && (
          <>
            {/* Read the Passage suggestion — helps users who aren't sure */}
            {question.bookName && (
              <TouchableOpacity
                style={[styles.suggestionCard, isRtl && { flexDirection: 'row-reverse' }]}
                activeOpacity={0.8}
                onPress={() => handleReferencePress(
                  question.bookName!,
                  question.chapter ?? 1,
                  question.verseNumber,
                )}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: `${COLORS.accent}18` }]}>
                  <BookMarked size={18} color={COLORS.accent} />
                </View>
                <View style={styles.suggestionTextWrap}>
                  <Text style={[styles.suggestionTitle, isRtl && { textAlign: 'right' }]}>
                    Read the Passage
                  </Text>
                  <Text style={[styles.suggestionDesc, isRtl && { textAlign: 'right' }]}>
                    {question.bookName} {question.chapter ?? ''}{question.verseNumber ? `:${question.verseNumber}` : ''} — Open in Bible Reader
                  </Text>
                </View>
                <BookOpen size={16} color={COLORS.accent} />
              </TouchableOpacity>
            )}

            <TriviaQuestionCard
              question={question}
              selectedAnswer={selectedAnswer}
              disabled={false}
              isRtl={isRtl}
              isDark={isDark}
              onSelect={handleSelect}
              onReferencePress={handleReferencePress}
            />
          </>
        )}

        {/* Answered phase */}
        {phase === 'answered' && question && result && (
          <>
            <TriviaQuestionCard
              question={question}
              selectedAnswer={selectedAnswer}
              disabled={true}
              isRtl={isRtl}
              isDark={isDark}
              correctAnswerIndex={result?.correctAnswer}
              onSelect={() => {}}
              onReferencePress={handleReferencePress}
            />
            <TriviaResultCard result={result} isRtl={isRtl} isDark={isDark} />

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: COLORS.accent }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.nextBtnText}>Next Question</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Finished phase — no more questions available */}
        {phase === 'finished' && (
          <View style={styles.finishedContainer}>
            <View style={[styles.finishedIcon, { backgroundColor: `${COLORS.accent}18` }]}>
              <PartyPopper size={40} color={COLORS.accent} />
            </View>
            <Text style={[styles.finishedTitle, isRtl && { textAlign: 'right', writingDirection: 'rtl' }]}>
              All Questions Completed!
            </Text>
            <Text style={[styles.finishedSubtitle, isRtl && { textAlign: 'right' }]}>
              You've answered every available question. Come back later for more!
            </Text>

            {/* Final score */}
            <View style={[styles.finalScoreCard, { backgroundColor: COLORS.cardBackground }]}>
              <Text style={[styles.finalScoreLabel, isRtl && { textAlign: 'right' }]}>
                Final Score
              </Text>
              <Text style={[styles.finalScoreValue, { color: COLORS.accent }]}>
                {score.correct}/{score.total}
              </Text>
              <Text style={[styles.finalScorePercent, isRtl && { textAlign: 'right' }]}>
                {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
              </Text>
            </View>

            {/* Lifetime stats */}
            {stats && stats.totalAnswered > score.total && (
              <View style={[styles.lifetimeStats, isRtl && { flexDirection: 'row-reverse' }]}>
                <BookOpen size={14} color={COLORS.muted} />
                <Text style={[styles.lifetimeText, isRtl && { textAlign: 'right', writingDirection: 'rtl' }]}>
                  Lifetime: {stats.correct}/{stats.totalAnswered} ({stats.percentage}%)
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: COLORS.accent }]}
              onPress={handleReset}
              activeOpacity={0.85}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.resetBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state before first load */}
        {!loading && !question && phase !== 'finished' && !error && (
          <View style={styles.centerState}>
            <BookOpen size={40} color={COLORS.muted} />
            <Text style={[styles.emptyTitle, isRtl && { textAlign: 'right' }]}>
              No questions available
            </Text>
            <Text style={[styles.emptyDesc, isRtl && { textAlign: 'right' }]}>
              Check back later for new trivia questions!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    // ── Header score badge (used by ActionHeader rightComponent) ──
    headerScoreBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: BORDER_RADIUS.round,
    },
    headerScoreText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
    },

    // ── Read the Passage suggestion card ──
    suggestionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: `${COLORS.accent}25`,
      backgroundColor: `${COLORS.accent}08`,
      marginBottom: SPACING.sm,
    },
    suggestionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestionTextWrap: {
      flex: 1,
    },
    suggestionTitle: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: COLORS.accent,
    },
    suggestionDesc: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '500',
      marginTop: 1,
    },

    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACING.md,
      paddingBottom: 80,
    },

    // Difficulty filter chips
    filterRow: {
      flexDirection: 'row',
      gap: 6,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xs,
    },
    filterChip: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.round,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
    },

    // ── Progress indicator ──
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
    },
    progressLabelWrap: {
      flex: 1,
    },
    progressLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      color: COLORS.text,
    },
    progressDifficulty: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '500',
      color: COLORS.muted,
      marginTop: 1,
    },
    progressBarBg: {
      width: 60,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },

    // Loading / Error / Empty
    centerState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: SPACING.sm,
    },
    loadingText: {
      color: COLORS.muted,
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },
    errorText: {
      color: COLORS.error,
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
      textAlign: 'center',
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.round,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
    },
    emptyTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.text,
      marginTop: SPACING.xs,
    },
    emptyDesc: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Next button
    nextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.lg,
    },
    nextBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
    },

    // Finished state
    finishedContainer: {
      alignItems: 'center',
      paddingTop: SPACING.xxl,
      gap: SPACING.sm,
    },
    finishedIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    finishedTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '900',
      color: COLORS.text,
      textAlign: 'center',
    },
    finishedSubtitle: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: SPACING.lg,
    },
    finalScoreCard: {
      width: '100%',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      gap: 2,
    },
    finalScoreLabel: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    finalScoreValue: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '900',
    },
    finalScorePercent: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      fontWeight: '600',
    },
    lifetimeStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    lifetimeText: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '600',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.round,
      marginTop: SPACING.sm,
    },
    resetBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
  });

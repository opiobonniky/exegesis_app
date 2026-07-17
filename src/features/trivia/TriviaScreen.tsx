import React, {
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Play,
  RotateCcw,
  PartyPopper,
  BookOpen,
  Zap,
  Award,
  Target,
  Sparkles,
} from 'lucide-react-native';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  useLanguage,
  isRtlLanguage,
} from '../../component/language-translation/LanguageProvider';
import ActionHeader from '../../reusable/ActionHeader';
import { route } from '../../component/navigations/routes';
import { useTrivia, DifficultyFilter } from './hooks/useTrivia';
import TriviaQuestionCard from './components/TriviaQuestionCard';
import TriviaResultCard from './components/TriviaResultCard';
import ConfettiOverlay from './components/ConfettiOverlay';
import MilestoneOverlay from './components/MilestoneOverlay';

const MILESTONE_THRESHOLDS = [3, 5, 10, 25];

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
    streak,
    fetchQuestion,
    answer,
    nextQuestion,
    fetchStats,
    reset,
    setDifficulty,
    startQuiz,
  } = useTrivia();

  const prevDifficultyRef = useRef(difficulty);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Re-fetch question when difficulty filter changes (only during game)
  useEffect(() => {
    if (prevDifficultyRef.current !== difficulty && phase !== 'plan') {
      prevDifficultyRef.current = difficulty;
      fetchQuestion();
    }
    if (phase === 'plan') {
      prevDifficultyRef.current = difficulty;
    }
  }, [difficulty, fetchQuestion, phase]);

  const handleSelect = useCallback(
    (index: number) => {
      if (selectedAnswer !== null) return; // already answered
      answer(index);
    },
    [answer, selectedAnswer],
  );

  const handleNext = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleStart = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  const handleReferencePress = useCallback(
    (bookName: string, chapter: number, verseNumber?: number | null) => {
      navigation.navigate(route.bible, {
        bookName,
        chapter,
        verseNumber: verseNumber ?? 1,
      });
    },
    [navigation],
  );

  // ── Result dismissed state — user must close result card before Next appears ──
  const [resultDismissed, setResultDismissed] = useState(false);
  const nextBtnOpacity = useRef(new Animated.Value(0)).current;

  const handleDismissResult = useCallback(() => {
    setResultDismissed(true);
    // Animate the Next button in — aligned with result card's 200ms dismiss
    Animated.timing(nextBtnOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [nextBtnOpacity]);

  // Reset dismissed state + animation when a new question loads
  useEffect(() => {
    if (phase === 'playing') {
      setResultDismissed(false);
      nextBtnOpacity.setValue(0);
    }
  }, [phase, nextBtnOpacity]);

  // ── Confetti state — show on streak >= 3 ──
  const [showConfetti, setShowConfetti] = useState(false);
  const prevStreakRef = useRef(0);

  useEffect(() => {
    if (
      streak >= 3 &&
      prevStreakRef.current < 3 &&
      phase === 'answered' &&
      result?.isCorrect
    ) {
      setShowConfetti(true);
    }
    prevStreakRef.current = streak;
  }, [streak, phase, result]);

  const handleConfettiFinish = useCallback(() => setShowConfetti(false), []);

  // ── Milestone celebration state ──
  const [showMilestone, setShowMilestone] = useState(false);
  const prevTotalRef = useRef(0);

  // Trigger milestone when score.total hits 3, 5, 10, or 25
  useEffect(() => {
    const current = score.total;
    const prev = prevTotalRef.current;
    if (
      current > 0 &&
      current !== prev &&
      MILESTONE_THRESHOLDS.includes(current) &&
      phase === 'answered'
    ) {
      setShowMilestone(true);
    }
    prevTotalRef.current = current;
  }, [score.total, phase]);

  const handleMilestoneFinish = useCallback(() => setShowMilestone(false), []);

  const scoreBadge =
    score.total > 0 ? (
      <View
        style={[
          styles.headerScoreBadge,
          { backgroundColor: `${COLORS.accent}18` },
        ]}
      >
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
        subtitle={
          difficulty
            ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} questions`
            : undefined
        }
        onPress={() => navigation.goBack()}
        rightComponent={scoreBadge}
      />

      {/* Confetti celebration overlay */}
      <ConfettiOverlay visible={showConfetti} onFinish={handleConfettiFinish} />

      {/* Milestone celebration overlay */}
      <MilestoneOverlay
        visible={showMilestone}
        total={score.total}
        correct={score.correct}
        percentage={
          score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0
        }
        onFinish={handleMilestoneFinish}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {phase === 'plan' ? (
          /* ══════════════════════════════════════════════
              PLAN SCREEN — Landing page before quiz
             ══════════════════════════════════════════════ */
          <View style={styles.planContainer}>
            {/* Header section */}
            <View style={styles.planHeader}>
              <View
                style={[
                  styles.planIconCircle,
                  { backgroundColor: `${COLORS.accent}15` },
                ]}
              >
                <BookOpen size={32} color={COLORS.accent} />
              </View>
              <Text style={[styles.planTitle, isRtl && { textAlign: 'right' }]}>
                Bible Knowledge Quiz
              </Text>
              <Text
                style={[styles.planSubtitle, isRtl && { textAlign: 'right' }]}
              >
                Test your knowledge of the Scriptures with fun trivia questions!
              </Text>
            </View>

            {/* Stats card (or empty state) */}
            {stats && stats.totalAnswered > 0 ? (
              <View
                style={[
                  styles.statsCard,
                  { backgroundColor: COLORS.cardBackground },
                ]}
              >
                <View
                  style={[
                    styles.statsCardHeader,
                    isRtl && { flexDirection: 'row-reverse' },
                  ]}
                >
                  <Award size={16} color={COLORS.accent} />
                  <Text style={styles.statsCardTitle}>Your Performance</Text>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: COLORS.success }]}>
                      {stats.correct}
                    </Text>
                    <Text style={styles.statLabel}>Correct</Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: COLORS.border },
                    ]}
                  />
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: COLORS.text }]}>
                      {stats.totalAnswered}
                    </Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: COLORS.border },
                    ]}
                  />
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: COLORS.accent }]}>
                      {stats.percentage}%
                    </Text>
                    <Text style={styles.statLabel}>Accuracy</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.statsCard,
                  styles.statsCardEmpty,
                  { backgroundColor: COLORS.cardBackground },
                ]}
              >
                <Award size={28} color={COLORS.muted} />
                <Text style={styles.statsEmptyTitle}>No stats yet</Text>
                <Text style={styles.statsEmptyDesc}>
                  Complete your first quiz to see your performance here!
                </Text>
              </View>
            )}

            {/* Difficulty Selection */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionEyebrow}>Question Level</Text>
                <Text style={styles.sectionTitle}>Choose your challenge</Text>
              </View>
              <Text style={styles.sectionHint}>Tap one</Text>
            </View>

            <View style={styles.difficultyCards}>
              {(
                [
                  {
                    value: null as DifficultyFilter,
                    label: 'All',
                    desc: 'Mixed levels',
                    icon: Target,
                    color: COLORS.accent,
                  },
                  {
                    value: 'easy' as DifficultyFilter,
                    label: 'Easy',
                    desc: 'Beginner',
                    icon: Sparkles,
                    color: COLORS.success,
                  },
                  {
                    value: 'medium' as DifficultyFilter,
                    label: 'Medium',
                    desc: 'Balanced',
                    icon: BookOpen,
                    color: COLORS.info,
                  },
                  {
                    value: 'hard' as DifficultyFilter,
                    label: 'Hard',
                    desc: 'Expert',
                    icon: Zap,
                    color: COLORS.error,
                  },
                ] as const
              ).map(opt => {
                const IconComp = opt.icon;
                const isSelected = difficulty === opt.value;

                return (
                    <TouchableOpacity
                    key={opt.value ?? 'all'}
                    style={[
                      styles.difficultyCard,
                      {
                        borderColor: isSelected ? opt.color : COLORS.border,
                        backgroundColor: isSelected
                          ? `${opt.color}12`
                          : COLORS.cardBackground,
                        elevation: 0,
                      },
                      isRtl && { flexDirection: 'row-reverse' },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setDifficulty(opt.value)}
                  >
                    <View style={styles.diffTopRow}>
                      <View
                        style={[
                          styles.diffIconCircle,
                          {
                            backgroundColor: isSelected
                              ? opt.color
                              : `${opt.color}14`,
                            borderColor: isSelected
                              ? opt.color
                              : `${opt.color}35`,
                          },
                        ]}
                      >
                        <IconComp
                          size={17}
                          color={isSelected ? '#FFFFFF' : opt.color}
                        />
                      </View>
                      {isSelected ? (
                        <View
                          style={[
                            styles.selectedDot,
                            { backgroundColor: opt.color },
                          ]}
                        />
                      ) : null}
                    </View>
                    <View style={styles.diffTextWrap}>
                      <Text
                        style={[
                          styles.diffTitle,
                          { color: isSelected ? opt.color : COLORS.text },
                          isRtl && { textAlign: 'right' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.diffDesc,
                          isRtl && { textAlign: 'right' },
                        ]}
                      >
                        {opt.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Start Quiz Button */}
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: COLORS.accent }]}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startBtnText}>Start Quiz</Text>
            </TouchableOpacity>

            {/* Tip footer */}
            <Text style={styles.planTip}>
              Questions are drawn from across the Bible. You can also tap a
              scripture reference to read the passage before answering.
            </Text>
          </View>
        ) : (
          /* ══════════════════════════════════════════════
              GAME SCREEN — Playing / Answered / Finished
             ══════════════════════════════════════════════ */
          <>
            {/* Difficulty filter chips */}
            <View style={styles.gameTopCard}>
              <Text style={styles.gameFilterLabel}>Difficulty</Text>
              <View
                style={[
                  styles.filterRow,
                  isRtl && { flexDirection: 'row-reverse' },
                ]}
              >
                {(['all', 'easy', 'medium', 'hard'] as const).map(d => {
                  const isActive =
                    d === 'all' ? difficulty === null : difficulty === d;
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
                        isActive && { backgroundColor: chipColors.text },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setDifficulty(d === 'all' ? null : d);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: isActive ? '#FFFFFF' : COLORS.muted },
                          isActive && {
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {d === 'all'
                          ? 'All'
                          : d.charAt(0).toUpperCase() + d.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Progress indicator: Question X of Y — full width bar */}
            {totalCount > 0 && (
              <View
                style={[
                  styles.progressRow,
                  isRtl && { flexDirection: 'row-reverse' },
                ]}
              >
                <View style={styles.progressLabelWrap}>
                  <Text
                    style={[
                      styles.progressLabel,
                      isRtl && { textAlign: 'right' },
                    ]}
                  >
                    Question {score.total + 1} of {totalCount}
                  </Text>
                  <Text
                    style={[
                      styles.progressDifficulty,
                      isRtl && { textAlign: 'right' },
                    ]}
                  >
                    {difficulty
                      ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                      : 'All'}
                  </Text>
                </View>
                <Text
                  style={[styles.progressPercent, { color: COLORS.accent }]}
                >
                  {Math.round((score.total / totalCount) * 100)}%
                </Text>
              </View>
            )}
            {totalCount > 0 && (
              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: COLORS.border },
                ]}
              >
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
            )}

            {/* Loading state */}
            {loading && !question && (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text
                  style={[styles.loadingText, isRtl && { textAlign: 'right' }]}
                >
                  Loading question...
                </Text>
              </View>
            )}

            {/* Error state */}
            {error && (
              <View style={styles.centerState}>
                <Text
                  style={[styles.errorText, isRtl && { textAlign: 'right' }]}
                >
                  {error}
                </Text>
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
              <View style={styles.questionOuter}>
                <TriviaQuestionCard
                  question={question}
                  selectedAnswer={selectedAnswer}
                  disabled={false}
                  isRtl={isRtl}
                  isDark={isDark}
                  onSelect={handleSelect}
                  onReferencePress={handleReferencePress}
                />
                {/* Compact hint below options */}
                <View style={styles.playingSpacer}>
                  <View
                    style={[
                      styles.tapHint,
                      isRtl && { flexDirection: 'row-reverse' },
                    ]}
                  >
                    <Target size={14} color={COLORS.muted} />
                    <Text
                      style={[
                        styles.tapHintText,
                        isRtl && { textAlign: 'right' },
                      ]}
                    >
                      Tap an option to answer
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Answered phase */}
            {phase === 'answered' && question && result && (
              <>
                <View style={styles.questionOuter}>
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
                </View>
                {/* Streak badge */}
                {streak >= 2 && (
                  <View
                    style={[
                      styles.streakBadge,
                      isRtl && { flexDirection: 'row-reverse' },
                    ]}
                  >
                    <Zap
                      size={16}
                      color={streak >= 3 ? COLORS.warning : COLORS.accent}
                      fill={streak >= 3 ? COLORS.warning : 'transparent'}
                    />
                    <Text
                      style={[
                        styles.streakText,
                        {
                          color: streak >= 3 ? COLORS.warning : COLORS.accent,
                        },
                      ]}
                    >
                      {streak} in a row{streak >= 3 ? ' 🔥' : ''}
                    </Text>
                  </View>
                )}

                {/* Result card — must be dismissed before Next appears */}
                {!resultDismissed && (
                  <TriviaResultCard
                    result={result}
                    isRtl={isRtl}
                    isDark={isDark}
                    onDismiss={handleDismissResult}
                  />
                )}

                {/* Next button — fades in after result is dismissed */}
                {resultDismissed && (
                  <Animated.View style={{ opacity: nextBtnOpacity }}>
                    <TouchableOpacity
                      style={[
                        styles.nextBtn,
                        { backgroundColor: COLORS.accent },
                      ]}
                      onPress={handleNext}
                      activeOpacity={0.85}
                    >
                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.nextBtnText}>Next Question</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </>
            )}

            {/* Finished phase */}
            {phase === 'finished' && (
              <View style={styles.finishedContainer}>
                <View
                  style={[
                    styles.finishedIcon,
                    { backgroundColor: `${COLORS.accent}18` },
                  ]}
                >
                  <PartyPopper size={40} color={COLORS.accent} />
                </View>
                <Text
                  style={[
                    styles.finishedTitle,
                    isRtl && { textAlign: 'right', writingDirection: 'rtl' },
                  ]}
                >
                  All Questions Completed!
                </Text>
                <Text
                  style={[
                    styles.finishedSubtitle,
                    isRtl && { textAlign: 'right' },
                  ]}
                >
                  You've answered every available question. Come back later for
                  more!
                </Text>

                {/* Final score */}
                <View
                  style={[
                    styles.finalScoreCard,
                    { backgroundColor: COLORS.cardBackground },
                  ]}
                >
                  <Text
                    style={[
                      styles.finalScoreLabel,
                      isRtl && { textAlign: 'right' },
                    ]}
                  >
                    Final Score
                  </Text>
                  <Text
                    style={[styles.finalScoreValue, { color: COLORS.accent }]}
                  >
                    {score.correct}/{score.total}
                  </Text>
                  <Text
                    style={[
                      styles.finalScorePercent,
                      isRtl && { textAlign: 'right' },
                    ]}
                  >
                    {score.total > 0
                      ? Math.round((score.correct / score.total) * 100)
                      : 0}
                    %
                  </Text>
                </View>

                {/* Lifetime stats */}
                {stats && stats.totalAnswered > score.total && (
                  <View
                    style={[
                      styles.lifetimeStats,
                      isRtl && { flexDirection: 'row-reverse' },
                    ]}
                  >
                    <BookOpen size={14} color={COLORS.muted} />
                    <Text
                      style={[
                        styles.lifetimeText,
                        isRtl && {
                          textAlign: 'right',
                          writingDirection: 'rtl',
                        },
                      ]}
                    >
                      Lifetime: {stats.correct}/{stats.totalAnswered} (
                      {stats.percentage}%)
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
          </>
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

    // ── Question outer wrapper ──
    questionOuter: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
    },

    // ── Extra spacer + tap hint for the playing phase ──
    playingSpacer: {
      marginTop: 6,
      paddingBottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tapHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: `${COLORS.border}20`,
    },
    tapHintText: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '600',
    },

    scrollView: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: SPACING.md,
      paddingBottom: 64,
    },

    gameTopCard: {
      padding: 6,
      marginTop: SPACING.sm,
      marginBottom: SPACING.md,
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    gameFilterLabel: {
      paddingHorizontal: SPACING.sm,
      paddingTop: 2,
      paddingBottom: 6,
      color: COLORS.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },

    // ── Difficulty filter segmented control ──
    filterRow: {
      flexDirection: 'row',
      gap: 6,
    },
    filterChip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: COLORS.surface,
    },
    filterChipText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '800',
    },

    // ── Progress indicator (compact) ──
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
      marginTop: SPACING.xs,
    },
    progressLabelWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    progressLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.text,
    },
    progressDifficulty: {
      fontSize: 10,
      fontWeight: '500',
      color: COLORS.muted,
    },
    progressPercent: {
      fontSize: 10,
      fontWeight: '800',
    },
    progressBarTrack: {
      width: '100%',
      height: 7,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: SPACING.lg,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
    },

    // Loading / Error / Empty
    centerState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
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
      marginBottom: SPACING.md,
    },
    nextBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
    },

    // ── PLAN SCREEN ──
    planContainer: {
      flex: 1,
      paddingTop: SPACING.md,
    },
    planHeader: {
      alignItems: 'center',
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.lg,
    },
    planIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    planTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '900',
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    planSubtitle: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: SPACING.sm,
    },

    // ── Stats card ──
    statsCard: {
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    statsCardEmpty: {
      alignItems: 'center',
      gap: SPACING.xs,
      paddingVertical: SPACING.lg,
    },
    statsCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    statsCardTitle: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
      color: COLORS.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '900',
    },
    statLabel: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '600',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 36,
    },
    statsEmptyTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: COLORS.text,
      marginTop: SPACING.xs,
    },
    statsEmptyDesc: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: SPACING.sm,
    },

    // ── Difficulty selection cards ──
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: SPACING.sm,
    },
    sectionEyebrow: {
      color: COLORS.accent,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.9,
      marginBottom: 2,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '900',
      color: COLORS.text,
    },
    sectionHint: {
      color: COLORS.muted,
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      paddingBottom: 2,
    },
    difficultyCards: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    difficultyCard: {
      width: '48.5%',
      minHeight: 116,
      justifyContent: 'space-between',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    diffTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    diffIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    selectedDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    diffTextWrap: {
      gap: 3,
    },
    diffTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '900',
    },
    diffDesc: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '700',
      lineHeight: 16,
    },

    // ── Start Quiz button ──
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.lg,
      borderRadius: BORDER_RADIUS.xl,
      marginTop: 'auto',
      marginBottom: SPACING.md,
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    startBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
    },
    planTip: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      textAlign: 'center',
      lineHeight: 17,
      paddingHorizontal: SPACING.sm,
      paddingBottom: SPACING.lg,
    },

    // ── Streak badge ──
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 6,
      paddingVertical: 6,
      paddingHorizontal: SPACING.md,
      borderRadius: BORDER_RADIUS.round,
      backgroundColor: `${COLORS.accent}10`,
      alignSelf: 'center',
    },
    streakText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '800',
    },

    // Finished state
    finishedContainer: {
      alignItems: 'center',
      paddingTop: SPACING.lg,
      gap: SPACING.sm,
    },
    finishedIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
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
      lineHeight: 18,
      paddingHorizontal: SPACING.sm,
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

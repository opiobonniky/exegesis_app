// src/screens/reading-plans/DailyReadingScreen.tsx
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING } from '../../constants/theme';
import {
  BookOpen,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  XCircle,
  Star,
  RotateCcw,
  SkipForward,
} from 'lucide-react-native';
import ActionModal from '../../reusable/ActionModal';
import ActionHeader from '../../reusable/ActionHeader';
import { sendPostRequest } from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import { route } from '../../component/navigations/routes';
import {
  scheduleDailyReminder,
  isPlanNotificationsEnabled,
  scheduleStreakAtRiskReminder,
  isAtRiskReminderEnabled,
  getAtRiskReminderTime,
} from './planNotificationService';

const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Chapter {
  book: string;
  chapter: number;
}
interface QuizQuestion {
  questionId: number;
  question: string;
  options: string[];
  correctAnswer: number | null;
  explanation: string | null;
  userAnswer: number | null;
  isCorrect: boolean | null;
  numberAttempt?: number;
}
interface DailyAssignment {
  day: number;
  title: string;
  chapters: Chapter[];
  reflectionQuestions?: string[];
  quizQuestions?: QuizQuestion[];
  completed: boolean;
}

// ─────────────────────────────────────────────
// Performance helper
// ─────────────────────────────────────────────
const getQuizPerformance = (correct: number, total: number) => {
  if (total === 0)
    return { label: 'Complete!', emoji: '📖', color: '#6366F1', passed: false };
  const pct = (correct / total) * 100;
  if (correct === 0)
    return {
      label: 'Keep Going!',
      emoji: '💪',
      color: '#F59E0B',
      passed: false,
    };
  if (pct < 50)
    return {
      label: 'Good Effort!',
      emoji: '🌱',
      color: '#F97316',
      passed: false,
    };
  if (pct < 70)
    return {
      label: 'Almost There!',
      emoji: '🔥',
      color: '#EAB308',
      passed: false,
    };
  if (pct < 100)
    return { label: 'Well Done!', emoji: '⭐', color: '#10B981', passed: true };
  return {
    label: 'Perfect Score!',
    emoji: '🏆',
    color: '#6366F1',
    passed: true,
  };
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
const SectionHeading = ({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) => (
  <View style={shStyles.row}>
    <View style={[shStyles.accent, { backgroundColor: color }]} />
    <View style={shStyles.iconWrap}>{icon}</View>
    <Text style={shStyles.text}>{title}</Text>
  </View>
);
const shStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  accent: { width: 3, height: 20, borderRadius: 2, marginRight: 10 },
  iconWrap: { marginRight: 7 },
  text: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6B7280',
  },
});

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function DailyReadingScreen() {
  const routes = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isDark } = useContext(AppContext)!;
  const C = getColors(isDark);
  const { planId, day } = routes.params;

  // ── core state ────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<DailyAssignment | null>(null);
  const [notYetAdded, setNotYetAdded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [planTitle, setPlanTitle] = useState('Reading Plan');
  const [totalDays, setTotalDays] = useState(0);

  // ── shimmer ───────────────────────────────────
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  // ── quiz state ────────────────────────────────
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const submittedIds = useRef<Set<number>>(new Set());

  const [modal, setModal] = useState<{
    status: boolean;
    title: string;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ status: false, title: '', message: '', severity: 'info' });

  // ── effects ───────────────────────────────────
  useEffect(() => {
    loadData();
  }, [day]);
  useEffect(() => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setIsReviewing(false);
    setQuizDone(false);
    setCorrectCount(0);
    submittedIds.current = new Set();
    setNotYetAdded(false);
  }, [day]);

  // ── data ──────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      // First load assignment to get completion status
      await loadAssignment();
      // Then load plan info with completion status
      await loadPlanInfo(isCompleted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanInfo = async (completed: boolean = false) => {
    try {
      const r = await sendPostRequest('reading-plans', 'get-all', {});
      if (r?.returnCode === 200 && Array.isArray(r.returnData)) {
        const meta = r.returnData.find((p: any) => p.planId === planId);
        if (meta) {
          setPlanTitle(meta.title || 'Reading Plan');
          setTotalDays(meta.totalDays || 0);

          // Schedule daily reminder for this plan
          const planEnabled = await isPlanNotificationsEnabled();
          if (planEnabled) {
            await scheduleDailyReminder(
              planId,
              meta.title || 'Reading Plan',
              day,
            );
          }

          // Schedule at-risk reminder if enabled
          const atRiskEnabled = await isAtRiskReminderEnabled();
          if (atRiskEnabled && !completed) {
            const { h, m } = await getAtRiskReminderTime();
            await scheduleStreakAtRiskReminder(
              planId,
              meta.title || 'Reading Plan',
              meta.currentStreak ?? 0,
              h,
              m,
            );
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAssignment = async () => {
    try {
      const r = await sendPostRequest('reading-plans', 'daily-assignment', {
        planId,
        dayNumber: day,
      });

      console.log('Daily assignment response:', JSON.stringify(r));
      const { returnCode, returnData, returnMessage } = r;
      if (returnCode === 200 && returnData) {
        setNotYetAdded(false);
        setAssignment(returnData);
        setIsCompleted(returnData.completed ?? false);
        if (Array.isArray(returnData.quizQuestions)) {
          returnData.quizQuestions.forEach((q: QuizQuestion) => {
            if (q.userAnswer !== null) submittedIds.current.add(q.questionId);
          });
          const total = returnData.quizQuestions.length;
          const answered = returnData.quizQuestions.filter(
            (q: QuizQuestion) => q.isCorrect !== null,
          );
          if (total > 0 && answered.length === total) {
            setCorrectCount(
              answered.filter((q: QuizQuestion) => q.isCorrect === true).length,
            );
            setQuizDone(true);
          }
        }
      } else if (returnCode === 404) {
        setNotYetAdded(true);
        setAssignment(null);
      } else {
        showToast('error', returnMessage || 'Failed to load daily assignment');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'daily assignment: Failed to load');
    }
  };

  // ── completion ────────────────────────────────
  const markComplete = async () => {
    if (isCompleted) return;
    try {
      const r = await sendPostRequest('reading-plans', 'complete-day', {
        planId,
        dayNumber: day,
      });
      if (r.returnCode === 200) {
        setIsCompleted(true);
        loadData();
        showToast('success', `🎉 Day Complete! Day ${day} marked as done!`);
      } else showToast('error', `Error: ${r.returnMessage || 'Failed'}`);
    } catch (e: any) {
      showToast('error', `Error: ${e.message}`);
    }
  };

  // ── day nav ───────────────────────────────────
  const navigateDay = (dir: 'prev' | 'next') => {
    if (dir === 'next' && !isCompleted) {
      showToast('error', "Complete today's reading first.");
      return;
    }
    const nd = dir === 'prev' ? day - 1 : day + 1;
    if (nd >= 1 && nd <= totalDays) navigation.setParams({ day: nd });
  };

  // ── quiz: jump to a specific question index ───
  // Used by tappable dots AND the skip button
  const jumpToQuestion = (idx: number) => {
    if (!assignment?.quizQuestions) return;
    const targetQ = assignment.quizQuestions[idx];

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setCurrentQ(idx);

      if (targetQ.userAnswer !== null && targetQ.userAnswer !== undefined) {
        // Already answered → show in review mode
        setSelected(targetQ.userAnswer);
        setShowResult(true);
        setIsReviewing(true);
      } else {
        // Unanswered → fresh mode
        setSelected(null);
        setShowResult(false);
        setIsReviewing(false);
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    });
  };

  // ── quiz: select answer ────────────────────────
  const handleSelect = (idx: number) => {
    if (isReviewing) {
      // Exit review → unlock resubmit with chosen option
      setIsReviewing(false);
      setShowResult(false);
      setSelected(idx);
      return;
    }
    if (!showResult) setSelected(idx);
  };

  // ── quiz: submit ───────────────────────────────
  const handleSubmit = async () => {
    if (selected === null || !assignment?.quizQuestions || isSubmitting) return;
    const q = assignment.quizQuestions[currentQ];

    // Same answer guard — just show result without re-POSTing
    if (q.userAnswer !== null && q.userAnswer === selected) {
      setShowResult(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPostRequest('reading-plans', 'submit-answer', {
        planId,
        dayNumber: day,
        questionId: q.questionId,
        userAnswer: selected,
      });
      if (res?.returnCode === 200 && res.returnData) {
        const { isCorrect, correctAnswer, explanation, numberAttempt } =
          res.returnData;
        if (isCorrect) setCorrectCount(p => p + 1);
        submittedIds.current.add(q.questionId);
        setAssignment(prev => {
          if (!prev?.quizQuestions) return prev;
          const qs = [...prev.quizQuestions];
          qs[currentQ] = {
            ...qs[currentQ],
            correctAnswer: correctAnswer ?? qs[currentQ].correctAnswer,
            explanation: explanation ?? qs[currentQ].explanation,
            userAnswer: selected,
            isCorrect,
            numberAttempt: numberAttempt ?? qs[currentQ].numberAttempt ?? 0,
          };
          return { ...prev, quizQuestions: qs };
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      setShowResult(true);
    }
  };

  // ── quiz: next ─────────────────────────────────
  const handleNext = () => {
    if (!assignment?.quizQuestions) return;
    if (currentQ < assignment.quizQuestions.length - 1) {
      jumpToQuestion(currentQ + 1);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(() => {
        setQuizDone(true);
        setIsReviewing(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  // ── quiz: retry (enter review) ─────────────────
  const retryQuiz = () => {
    const already =
      assignment?.quizQuestions?.filter(q => q.isCorrect === true).length ?? 0;
    setCorrectCount(already);
    setQuizDone(false);
    jumpToQuestion(0); // jumpToQuestion sets isReviewing correctly
  };

  // ── derived ───────────────────────────────────
  const hasQuiz =
    Array.isArray(assignment?.quizQuestions) &&
    assignment!.quizQuestions!.length > 0;
  const quizTotal = hasQuiz ? assignment!.quizQuestions!.length : 0;
  const activeQ =
    hasQuiz && !quizDone ? assignment!.quizQuestions![currentQ] : null;
  const canMarkComplete = !isCompleted && (!hasQuiz || quizDone);
  const accuracyPct =
    quizTotal > 0 ? Math.round((correctCount / quizTotal) * 100) : 0;
  const perf = getQuizPerformance(correctCount, quizTotal);
  const canGoPrev = day > 1;
  const canGoNext = totalDays > 0 && day < totalDays;

  // ── skeleton ──────────────────────────────────
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });
  const Sk = ({
    w,
    h,
    r = 8,
    style,
  }: {
    w: number | string;
    h: number;
    r?: number;
    style?: any;
  }) => (
    <Animated.View
      style={[
        {
          width: w as any,
          height: h,
          borderRadius: r,
          backgroundColor: isDark ? '#374151' : '#D1D5DB',
          opacity: shimmerOpacity,
        },
        style,
      ]}
    />
  );

  // ─────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────

  // ── Day info strip — sits below ActionHeader ──────────────────────────────
  const renderDayStrip = () => (
    <View
      style={[
        s.dayStrip,
        { backgroundColor: C.cardBackground, borderBottomColor: C.border },
      ]}
    >
      {/* Day pill */}
      <View
        style={[
          s.dayPill,
          { backgroundColor: C.primary + '18', borderColor: C.primary + '35' },
        ]}
      >
        <Text style={[s.dayPillText, { color: C.primary }]}>
          Day {day}
          {totalDays > 0 ? ` / ${totalDays}` : ''}
        </Text>
      </View>

      {/* Progress bar */}
      {!loading && totalDays > 0 && (
        <View style={s.stripProgress}>
          <View style={[s.stripTrack, { backgroundColor: C.border }]}>
            <View
              style={[
                s.stripFill,
                {
                  width: `${Math.round(((day - 1) / totalDays) * 100)}%`,
                  backgroundColor: C.primary,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Complete button */}
      <TouchableOpacity
        style={[
          s.completeBtn,
          isCompleted
            ? {
                backgroundColor: C.success + '25',
                borderColor: C.success + '50',
              }
            : { backgroundColor: C.border, borderColor: C.border },
        ]}
        activeOpacity={canMarkComplete ? 0.7 : 1}
        onPress={canMarkComplete ? markComplete : undefined}
      >
        {isCompleted ? (
          <CheckCircle size={18} color={C.success} />
        ) : (
          <Circle size={18} color={C.muted} />
        )}
        <Text
          style={[
            s.completeBtnText,
            { color: isCompleted ? C.success : C.muted },
          ]}
        >
          {isCompleted ? 'Done' : 'Mark Done'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSkeletonBody = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}
    >
      <View
        style={[s.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
      >
        <Sk w={120} h={12} r={6} style={{ marginBottom: 16 }} />
        {[1, 2].map(i => (
          <View
            key={i}
            style={[
              s.chapterRow,
              { borderColor: isDark ? '#374151' : '#E5E7EB', marginBottom: 10 },
            ]}
          >
            <Sk w={42} h={42} r={12} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Sk w="55%" h={14} r={6} style={{ marginBottom: 7 }} />
              <Sk w="35%" h={10} r={6} />
            </View>
            <Sk w={28} h={28} r={8} />
          </View>
        ))}
      </View>
      <View
        style={[s.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
      >
        <Sk w={160} h={12} r={6} style={{ marginBottom: 16 }} />
        <Sk w="90%" h={16} r={6} style={{ marginBottom: 8 }} />
        <Sk w="70%" h={16} r={6} style={{ marginBottom: 20 }} />
        {[1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[
              s.answerRow,
              { borderColor: isDark ? '#374151' : '#E5E7EB', marginBottom: 10 },
            ]}
          >
            <Sk w={36} h={36} r={10} />
            <Sk w="60%" h={13} r={6} style={{ marginLeft: 12 }} />
          </View>
        ))}
        <Sk w="100%" h={50} r={14} style={{ marginTop: 16 }} />
      </View>
    </ScrollView>
  );

  const renderNotYetAdded = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}
    >
      <View
        style={[
          s.card,
          {
            backgroundColor: C.cardBackground,
            alignItems: 'center',
            paddingVertical: 48,
          },
        ]}
      >
        <View
          style={[s.emptyIconCircle, { backgroundColor: C.primary + '18' }]}
        >
          <BookOpen size={36} color={C.primary} />
        </View>
        <Text style={[s.emptyTitle, { color: C.text }]}>Coming Soon</Text>
        <Text style={[s.emptySubtitle, { color: C.textSecondary }]}>
          Day {day}'s reading assignment hasn't been added yet.{'\n'}Check back
          soon!
        </Text>
      </View>
      {renderDayNav()}
    </ScrollView>
  );

  const renderDayNav = () => (
    <View style={s.navRow}>
      <TouchableOpacity
        style={[
          s.navBtn,
          { backgroundColor: C.cardBackground },
          !canGoPrev && s.navBtnDisabled,
        ]}
        onPress={() => navigateDay('prev')}
        disabled={!canGoPrev}
      >
        <ChevronLeft size={18} color={C.text} />
        <Text style={[s.navBtnText, { color: C.text }]}>Previous</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          s.navBtn,
          { backgroundColor: C.cardBackground },
          !canGoNext && s.navBtnDisabled,
        ]}
        onPress={() => navigateDay('next')}
        disabled={!canGoNext}
      >
        <Text style={[s.navBtnText, { color: C.text }]}>Next</Text>
        <ChevronRight size={18} color={C.text} />
      </TouchableOpacity>
    </View>
  );

  // ── loading / not-added gates ─────────────────
  if (loading || notYetAdded || !assignment) {
    return (
      <View style={[s.container, { backgroundColor: C.background }]}>
        <ActionHeader
          title={loading ? 'Loading…' : `Day ${day}`}
          subtitle={planTitle}
          onPress={() => navigation.goBack()}
        />
        {renderDayStrip()}
        {loading ? (
          renderSkeletonBody()
        ) : notYetAdded ? (
          renderNotYetAdded()
        ) : (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: C.text, fontSize: 15 }}>
              Assignment not found
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: C.background }]}>
      <ActionHeader
        title={assignment.title || `Day ${day}`}
        subtitle={planTitle}
        onPress={() => navigation.goBack()}
      />
      {renderDayStrip()}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
      >
        {/* ── Chapters ─────────────────────── */}
        <View style={[s.card, { backgroundColor: C.cardBackground }]}>
          <SectionHeading
            icon={<BookOpen size={14} color={C.primary} />}
            title="Today's Reading"
            color={C.primary}
          />
          {assignment.chapters.map((ch, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                s.chapterRow,
                { borderColor: isDark ? '#2D3748' : '#EEF0F3' },
              ]}
              onPress={() =>
                navigation.navigate(route.bible, {
                  bookName: ch.book,
                  chapter: ch.chapter,
                  reflectionQuestions: assignment?.reflectionQuestions ?? [],
                  dayTitle: assignment?.title ?? `Day ${day}`,
                  planTitle: planTitle,
                })
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  s.chapterIconBox,
                  { backgroundColor: C.primary + '18' },
                ]}
              >
                <BookOpen size={18} color={C.primary} />
              </View>
              <View style={s.chapterMeta}>
                <Text style={[s.chapterName, { color: C.text }]}>
                  {ch.book} {ch.chapter}
                </Text>
                <Text style={[s.chapterHint, { color: C.textSecondary }]}>
                  Tap to read
                </Text>
              </View>
              <View
                style={[
                  s.chapterArrow,
                  { backgroundColor: isDark ? '#2D3748' : '#F3F4F6' },
                ]}
              >
                <ChevronRight size={15} color={C.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Reflection Questions (no-quiz) ── */}
        {!hasQuiz &&
          Array.isArray(assignment.reflectionQuestions) &&
          assignment.reflectionQuestions.length > 0 && (
            <View style={[s.card, { backgroundColor: C.cardBackground }]}>
              <SectionHeading
                icon={<Lightbulb size={14} color="#F59E0B" />}
                title="Reflection Questions"
                color="#F59E0B"
              />
              {assignment.reflectionQuestions.map((q, idx) => (
                <View
                  key={idx}
                  style={[
                    s.reflectionRow,
                    {
                      borderLeftColor: C.primary + '60',
                      backgroundColor: isDark ? '#1A2332' : '#F8FAFF',
                    },
                  ]}
                >
                  <View
                    style={[s.reflectionNum, { backgroundColor: C.primary }]}
                  >
                    <Text style={s.reflectionNumText}>{idx + 1}</Text>
                  </View>
                  <Text style={[s.reflectionText, { color: C.text }]}>{q}</Text>
                </View>
              ))}
            </View>
          )}

        {/* ══════════════════════════════════════
            QUIZ — one question at a time
        ══════════════════════════════════════ */}
        {hasQuiz && !quizDone && activeQ && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[s.card, { backgroundColor: C.cardBackground }]}>
              {/* ── Review banner ── */}
              {isReviewing && (
                <View
                  style={[
                    s.reviewBanner,
                    {
                      backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
                      borderColor: isDark ? '#3B82F6' : '#BFDBFE',
                    },
                  ]}
                >
                  <RotateCcw size={14} color="#3B82F6" />
                  <Text style={s.reviewBannerText}>
                    Review mode — tap a dot to jump, or tap an option to retry
                  </Text>
                </View>
              )}

              <SectionHeading
                icon={<Star size={14} color="#6366F1" />}
                title="Knowledge Check"
                color="#6366F1"
              />

              {/* ── Progress row with tappable dots ── */}
              <View style={s.quizMeta}>
                <Text style={[s.quizMetaText, { color: C.textSecondary }]}>
                  Question {currentQ + 1} of {quizTotal}
                </Text>

                {/* Dots — always tappable in review mode */}
                <View style={s.dotRow}>
                  {assignment.quizQuestions!.map((q, i) => {
                    const done = q.userAnswer !== null;
                    const current = i === currentQ;
                    const correct = q.isCorrect === true;
                    const wrong = q.isCorrect === false;

                    const dotStyle = [
                      s.dot,
                      current && !done && s.dotActive,
                      done && correct && s.dotCorrect,
                      done && wrong && s.dotWrong,
                      current && done && s.dotActiveDone,
                    ];

                    // In review mode every dot is tappable; outside review only future dots make sense
                    const tappable =
                      isReviewing || (!showResult && i !== currentQ);

                    return tappable ? (
                      <TouchableOpacity
                        key={i}
                        style={[dotStyle, s.dotTappable]}
                        onPress={() => jumpToQuestion(i)}
                        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                        activeOpacity={0.6}
                      />
                    ) : (
                      <View key={i} style={dotStyle} />
                    );
                  })}
                </View>
              </View>

              {/* Progress bar */}
              <View
                style={[
                  s.progressTrack,
                  { backgroundColor: isDark ? '#2D3748' : '#EEF0F3' },
                ]}
              >
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${Math.round((submittedIds.current.size / quizTotal) * 100)}%`,
                      backgroundColor: C.primary,
                    },
                  ]}
                />
              </View>

              {/* Question text */}
              <Text style={[s.questionText, { color: C.text }]}>
                {activeQ.question}
              </Text>

              {/* Options */}
              <View style={s.optionsWrap}>
                {activeQ.options.map((opt, idx) => {
                  const isSel = selected === idx;
                  const isCorrect = showResult && activeQ.correctAnswer === idx;
                  const isWrong = showResult && isSel && !isCorrect;

                  const borderCol = isCorrect
                    ? '#10B981'
                    : isWrong
                      ? '#EF4444'
                      : isSel && !showResult
                        ? C.primary
                        : isDark
                          ? '#2D3748'
                          : '#E5E7EB';
                  const bgCol = isCorrect
                    ? isDark
                      ? '#064E3B'
                      : '#D1FAE5'
                    : isWrong
                      ? isDark
                        ? '#450A0A'
                        : '#FEE2E2'
                      : isSel && !showResult
                        ? C.primary + '14'
                        : 'transparent';
                  const textCol = isCorrect
                    ? '#10B981'
                    : isWrong
                      ? '#EF4444'
                      : C.text;
                  const badgeBg = isCorrect
                    ? '#10B981'
                    : isWrong
                      ? '#EF4444'
                      : isSel && !showResult
                        ? C.primary
                        : isDark
                          ? '#2D3748'
                          : '#F3F4F6';

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        s.answerRow,
                        { borderColor: borderCol, backgroundColor: bgCol },
                        isReviewing && isSel && s.answerRowReview,
                      ]}
                      onPress={() => handleSelect(idx)}
                      // Remove disabled — all logic lives in handleSelect
                      activeOpacity={0.75}
                    >
                      <View
                        style={[s.answerBadge, { backgroundColor: badgeBg }]}
                      >
                        {showResult && isCorrect ? (
                          <CheckCircle size={16} color="white" />
                        ) : showResult && isWrong ? (
                          <XCircle size={16} color="white" />
                        ) : (
                          <Text
                            style={[
                              s.answerLetter,
                              {
                                color:
                                  isSel && !showResult
                                    ? 'white'
                                    : C.textSecondary,
                              },
                            ]}
                          >
                            {String.fromCharCode(65 + idx)}
                          </Text>
                        )}
                      </View>
                      <Text style={[s.answerText, { color: textCol }]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Explanation */}
              {showResult && activeQ.explanation ? (
                <View
                  style={[
                    s.explanationBox,
                    {
                      backgroundColor:
                        selected === activeQ.correctAnswer
                          ? isDark
                            ? '#064E3B'
                            : '#ECFDF5'
                          : isDark
                            ? '#450A0A'
                            : '#FEF2F2',
                      borderLeftColor:
                        selected === activeQ.correctAnswer
                          ? '#10B981'
                          : '#EF4444',
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.explanationLabel,
                      {
                        color:
                          selected === activeQ.correctAnswer
                            ? '#10B981'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {selected === activeQ.correctAnswer
                      ? '✓ Correct'
                      : '✗ Incorrect'}
                  </Text>
                  <Text
                    style={[
                      s.explanationText,
                      { color: isDark ? '#D1FAE5' : '#374151' },
                    ]}
                  >
                    {activeQ.explanation}
                  </Text>
                </View>
              ) : null}

              {/* ── Action buttons ── */}
              {isReviewing ? (
                // REVIEW MODE: skip this question OR go to next
                <View style={s.reviewActions}>
                  {/* Skip button — jumps to next unanswered or next question */}
                  {(() => {
                    // Find the next question index to skip to (wraps to results if last)
                    const skipTarget =
                      currentQ < quizTotal - 1 ? currentQ + 1 : null;

                    return (
                      <View style={s.reviewBtnRow}>
                        {/* Skip always visible in review mode */}
                        <TouchableOpacity
                          style={[
                            s.skipBtn,
                            { borderColor: isDark ? '#374151' : '#E5E7EB' },
                          ]}
                          onPress={() => {
                            if (skipTarget !== null) {
                              jumpToQuestion(skipTarget);
                            } else {
                              // Last question — skip straight to results
                              Animated.timing(fadeAnim, {
                                toValue: 0,
                                duration: 140,
                                useNativeDriver: true,
                              }).start(() => {
                                setQuizDone(true);
                                setIsReviewing(false);
                                Animated.timing(fadeAnim, {
                                  toValue: 1,
                                  duration: 140,
                                  useNativeDriver: true,
                                }).start();
                              });
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <SkipForward size={15} color={C.textSecondary} />
                          <Text
                            style={[s.skipBtnText, { color: C.textSecondary }]}
                          >
                            Skip
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            s.actionBtn,
                            s.actionBtnFlex,
                            { backgroundColor: C.primary },
                          ]}
                          onPress={handleNext}
                          activeOpacity={0.8}
                        >
                          <Text style={s.actionBtnText}>
                            {currentQ < quizTotal - 1
                              ? 'Next Question'
                              : 'See Results'}
                          </Text>
                          <ChevronRight size={18} color="white" />
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              ) : !showResult ? (
                // FRESH / RESUBMIT: Submit (+ Skip if this is a resubmit attempt)
                <View>
                  {assignment.quizQuestions![currentQ].userAnswer !== null && (
                    // Already answered before — show Skip so user can move on without resubmitting
                    <View style={[s.reviewBtnRow, { marginTop: 14 }]}>
                      <TouchableOpacity
                        style={[
                          s.skipBtn,
                          { borderColor: isDark ? '#374151' : '#E5E7EB' },
                        ]}
                        onPress={() => {
                          if (currentQ < quizTotal - 1) {
                            jumpToQuestion(currentQ + 1);
                          } else {
                            Animated.timing(fadeAnim, {
                              toValue: 0,
                              duration: 140,
                              useNativeDriver: true,
                            }).start(() => {
                              setQuizDone(true);
                              setIsReviewing(false);
                              Animated.timing(fadeAnim, {
                                toValue: 1,
                                duration: 140,
                                useNativeDriver: true,
                              }).start();
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <SkipForward size={15} color={C.textSecondary} />
                        <Text
                          style={[s.skipBtnText, { color: C.textSecondary }]}
                        >
                          Skip
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          s.actionBtn,
                          s.actionBtnFlex,
                          {
                            backgroundColor:
                              selected !== null && !isSubmitting
                                ? C.primary
                                : isDark
                                  ? '#374151'
                                  : '#D1D5DB',
                            marginTop: 0,
                          },
                        ]}
                        onPress={handleSubmit}
                        disabled={selected === null || isSubmitting}
                        activeOpacity={0.8}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={s.actionBtnText}>Resubmit Answer</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {assignment.quizQuestions![currentQ].userAnswer === null && (
                    // First time answering — no skip, just Submit
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        {
                          backgroundColor:
                            selected !== null && !isSubmitting
                              ? C.primary
                              : isDark
                                ? '#374151'
                                : '#D1D5DB',
                        },
                      ]}
                      onPress={handleSubmit}
                      disabled={selected === null || isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={s.actionBtnText}>Submit Answer</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // RESULT SHOWN: Next / See Results
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.primary }]}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <Text style={s.actionBtnText}>
                    {currentQ < quizTotal - 1 ? 'Next Question' : 'See Results'}
                  </Text>
                  <ChevronRight size={18} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════
            QUIZ RESULTS
        ══════════════════════════════════════ */}
        {hasQuiz && quizDone && (
          <View style={[s.card, { backgroundColor: C.cardBackground }]}>
            <SectionHeading
              icon={<Star size={14} color={perf.color} />}
              title="Your Results"
              color={perf.color}
            />

            {/* Score ring */}
            <View style={s.scoreBlock}>
              <View
                style={[s.scoreRingOuter, { borderColor: perf.color + '30' }]}
              >
                <View style={[s.scoreRingInner, { borderColor: perf.color }]}>
                  <Text style={s.scoreEmoji}>{perf.emoji}</Text>
                  <Text style={[s.scoreNum, { color: perf.color }]}>
                    {correctCount}/{quizTotal}
                  </Text>
                  <Text style={[s.scorePct, { color: C.textSecondary }]}>
                    {accuracyPct}%
                  </Text>
                </View>
              </View>
              <Text style={[s.scoreLabel, { color: C.text }]}>
                {perf.label}
              </Text>
              <Text style={[s.scoreSubtitle, { color: C.textSecondary }]}>
                {correctCount === 0
                  ? "Don't worry — re-read the passages and try again."
                  : accuracyPct < 50
                    ? 'A solid start! Review the chapters to deepen your understanding.'
                    : accuracyPct < 70
                      ? "You're close! A quick re-read will push you over the line."
                      : accuracyPct < 100
                        ? 'Great understanding of the reading. Keep the momentum going!'
                        : 'Flawless! Outstanding grasp of this passage.'}
              </Text>
            </View>

            {/* Per-question summary — tappable rows to jump directly */}
            <View
              style={[
                s.summaryBox,
                {
                  backgroundColor: isDark ? '#111827' : '#F9FAFB',
                  borderColor: isDark ? '#2D3748' : '#EEF0F3',
                },
              ]}
            >
              {assignment.quizQuestions!.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.summaryRow,
                    idx < assignment.quizQuestions!.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#2D3748' : '#EEF0F3',
                    },
                  ]}
                  onPress={() => {
                    setCorrectCount(
                      assignment.quizQuestions!.filter(
                        qq => qq.isCorrect === true,
                      ).length,
                    );
                    setQuizDone(false);
                    jumpToQuestion(idx);
                  }}
                  activeOpacity={0.65}
                >
                  <View
                    style={[
                      s.summaryDot,
                      q.isCorrect === true && s.summaryDotOk,
                      q.isCorrect === false && s.summaryDotBad,
                    ]}
                  />
                  <Text
                    style={[s.summaryText, { color: C.textSecondary }]}
                    numberOfLines={2}
                  >
                    Q{idx + 1}: {q.question}
                  </Text>
                  <View style={s.summaryRight}>
                    <Text style={[s.summaryAttempts, { color: C.muted }]}>
                      ×{q.numberAttempt ?? 0}
                    </Text>
                    <ChevronRight size={13} color={C.muted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Review & Retry */}
            <TouchableOpacity
              style={[s.outlineBtn, { borderColor: C.primary }]}
              onPress={retryQuiz}
              activeOpacity={0.7}
            >
              <View style={s.outlineBtnInner}>
                <RotateCcw size={16} color={C.primary} />
                <Text style={[s.outlineBtnText, { color: C.primary }]}>
                  Review & Retry Answers
                </Text>
              </View>
            </TouchableOpacity>

            {canMarkComplete && (
              <TouchableOpacity
                style={[
                  s.actionBtn,
                  { backgroundColor: C.primary, marginTop: 10 },
                ]}
                onPress={markComplete}
                activeOpacity={0.8}
              >
                <CheckCircle size={20} color="white" />
                <Text style={s.actionBtnText}>Mark Day {day} Complete</Text>
              </TouchableOpacity>
            )}

            {isCompleted && (
              <View style={s.completedBadge}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={s.completedBadgeText}>Day {day} completed ✓</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Mark Complete (no-quiz) ─── */}
        {canMarkComplete && !hasQuiz && (
          <TouchableOpacity
            style={[
              s.actionBtn,
              { backgroundColor: C.primary, marginBottom: 10 },
            ]}
            onPress={markComplete}
            activeOpacity={0.8}
          >
            <CheckCircle size={20} color="white" />
            <Text style={s.actionBtnText}>Mark Day {day} Complete</Text>
          </TouchableOpacity>
        )}
        {isCompleted && !hasQuiz && (
          <View style={s.completedBadge}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={s.completedBadgeText}>Day {day} completed ✓</Text>
          </View>
        )}

        {renderDayNav()}
      </ScrollView>

      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal.severity}
        onConfirm={() => setModal(p => ({ ...p, status: false }))}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },

  // ── Day strip (sits below ActionHeader) ───────────────────────────────────
  dayStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  stripProgress: {
    flex: 1,
  },
  stripTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stripFill: {
    height: '100%',
    borderRadius: 2,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Card
  card: {
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },

  // Chapter
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  chapterIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterMeta: { flex: 1, marginLeft: 14 },
  chapterName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  chapterHint: { fontSize: 12 },
  chapterArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Reflection
  reflectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  reflectionNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  reflectionNumText: { fontSize: 13, fontWeight: '800', color: 'white' },
  reflectionText: { flex: 1, fontSize: 15, lineHeight: 23 },

  // Quiz meta
  quizMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizMetaText: { fontSize: 12, fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotTappable: { width: 12, height: 12, borderRadius: 6 }, // slightly larger hit target when interactive
  dotActive: { backgroundColor: '#6366F1', width: 22 },
  dotActiveDone: { width: 22 },
  dotCorrect: { backgroundColor: '#10B981' },
  dotWrong: { backgroundColor: '#EF4444' },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 18,
  },

  // Review banner
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  reviewBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    lineHeight: 17,
  },

  // Answers
  optionsWrap: { gap: 8, marginBottom: 4 },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  answerRowReview: { opacity: 0.85 },
  answerBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  answerLetter: { fontSize: 14, fontWeight: '800' },
  answerText: { flex: 1, fontSize: 15, lineHeight: 21 },

  // Explanation
  explanationBox: {
    marginTop: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderRadius: 10,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  explanationText: { fontSize: 14, lineHeight: 21 },

  // Review actions
  reviewActions: { marginTop: 14 },
  reviewBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  skipBtnText: { fontSize: 14, fontWeight: '700' },
  actionBtnFlex: { flex: 1, marginTop: 0 },

  // Buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    marginTop: 14,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: 'white' },
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  outlineBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outlineBtnText: { fontSize: 15, fontWeight: '700' },

  // Score ring
  scoreBlock: { alignItems: 'center', paddingVertical: 8, marginBottom: 20 },
  scoreRingOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreRingInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreEmoji: { fontSize: 32, marginBottom: 2 },
  scoreNum: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  scorePct: { fontSize: 13, fontWeight: '600' },
  scoreLabel: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  scoreSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 10,
  },

  // Summary
  summaryBox: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
    flexShrink: 0,
  },
  summaryDotOk: { backgroundColor: '#10B981' },
  summaryDotBad: { backgroundColor: '#EF4444' },
  summaryText: { flex: 1, fontSize: 13, lineHeight: 18 },
  summaryRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryAttempts: { fontSize: 11, fontWeight: '700' },

  // Completed
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
  },
  completedBadgeText: { fontSize: 14, fontWeight: '700', color: '#065F46' },

  // Nav
  navRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: 14, fontWeight: '700' },

  // Empty
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});

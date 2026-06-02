// src/screens/reading-plans/DailyReadingScreen.tsx
import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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
  PlayCircle,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';
import ActionModal from '../../reusable/ActionModal';
import { sendPostRequest } from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import { route } from '../../component/navigations/routes';
import LinearGradient from 'react-native-linear-gradient';
import ProgressCircle from './ProgressCircle';
import {
  scheduleDailyReminder,
  isPlanNotificationsEnabled,
  scheduleStreakAtRiskReminder,
  isAtRiskReminderEnabled,
  getAtRiskReminderTime,
} from './planNotificationService';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';

const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Chapter {
  book: string;
  startChapter: number;
  endChapter: number;
  /** @deprecated use startChapter/endChapter instead */
  chapter?: number;
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
const getQuizPerformance = (correct: number, total: number, rp?: any) => {
  if (total === 0)
    return { label: rp?.dailyReadingScoreComplete || 'Complete!', emoji: '\uD83D\uDCD6', color: '#6366F1', passed: false };
  const pct = (correct / total) * 100;
  if (correct === 0)
    return {
      label: rp?.dailyReadingScoreKeepGoing || 'Keep Going!',
      emoji: '\uD83D\uDCAA',
      color: '#F59E0B',
      passed: false,
    };
  if (pct < 50)
    return {
      label: rp?.dailyReadingScoreGoodEffort || 'Good Effort!',
      emoji: '\uD83C\uDF31',
      color: '#F97316',
      passed: false,
    };
  if (pct < 70)
    return {
      label: rp?.dailyReadingScoreAlmostThere || 'Almost There!',
      emoji: '\uD83D\uDD25',
      color: '#EAB308',
      passed: false,
    };
  if (pct < 100)
    return { label: rp?.dailyReadingScoreWellDone || 'Well Done!', emoji: '\u2B50', color: '#10B981', passed: true };
  return {
    label: rp?.dailyReadingScorePerfect || 'Perfect Score!',
    emoji: '\uD83C\uDFC6',
    color: '#6366F1',
    passed: true,
  };
};

// ─────────────────────────────────────────────
// Confetti Component
// ─────────────────────────────────────────────
interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  animX: Animated.Value;
  animY: Animated.Value;
  animRotate: Animated.Value;
  animOpacity: Animated.Value;
}
const CONFETTI_COLORS = [
  '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899',
  '#6366F1', '#14B8A6', '#F97316', '#84CC16',
];

const CONFETTI_PIECES = 25;

const Confetti = () => {
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const newPieces: ConfettiPiece[] = Array.from({ length: CONFETTI_PIECES }, (_, i) => ({
      id: i,
      x: Math.random() * SW,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      animX: new Animated.Value(0),
      animY: new Animated.Value(-20),
      animRotate: new Animated.Value(0),
      animOpacity: new Animated.Value(1),
    }));

    piecesRef.current = newPieces;
    setPieces(newPieces);

    // Start all animations with staggered delays
    const animations = newPieces.map((p, i) =>
      Animated.parallel([
        Animated.timing(p.animY, {
          toValue: 400 + Math.random() * 300,
          duration: 1500 + Math.random() * 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.animX, {
            toValue: (Math.random() - 0.5) * 150,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.animX, {
            toValue: (Math.random() - 0.5) * 100,
            duration: 700,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.animRotate, {
          toValue: Math.random() > 0.5 ? 360 : -360,
          duration: 1500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1000 + Math.random() * 500),
          Animated.timing(p.animOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    Animated.stagger(40, animations).start();

    return () => {
      piecesRef.current.forEach((p) => {
        p.animX.stopAnimation();
        p.animY.stopAnimation();
        p.animRotate.stopAnimation();
        p.animOpacity.stopAnimation();
      });
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            {
              position: 'absolute',
              left: p.x,
              width: p.size,
              height: p.size * 0.6,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity: p.animOpacity,
              transform: [
                { translateX: p.animX },
                { translateY: p.animY },
                { rotate: p.animRotate.interpolate({
                  inputRange: [-360, 0, 360],
                  outputRange: ['-360deg', '0deg', '360deg'],
                })},
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
const SectionHeading = ({
  icon,
  title,
  color,
  isRtl,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  isRtl?: boolean;
}) => (
  <View style={[shStyles.row, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
    <View style={[shStyles.accent, { backgroundColor: color, marginRight: isRtl ? 0 : 10, marginLeft: isRtl ? 10 : 0 }]} />
    <View style={[shStyles.iconWrap, { marginRight: isRtl ? 0 : 7, marginLeft: isRtl ? 7 : 0 }]}>{icon}</View>
    <Text style={[shStyles.text, { textAlign: isRtl ? 'right' : 'left' }]}>{title}</Text>
  </View>
);
const shStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  accent: { width: 3, height: 20, borderRadius: 2 },
  iconWrap: {},
  text: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6B7280',
    flex: 1,
  },
});

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function DailyReadingScreen() {
  const routes = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isDark } = useContext(AppContext)!;
  const { translations, language } = useLanguage();
  const rp = translations?.readingPlan;
  const isRtl = isRtlLanguage(language);
  const C = getColors(isDark);
  const { planId, day, totalDays: initialTotalDays } = routes.params;

  // ── core state ────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<DailyAssignment | null>(null);
  const [notYetAdded, setNotYetAdded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [planTitle, setPlanTitle] = useState(rp?.bpTitle || 'Reading Plan');
  const [totalDays, setTotalDays] = useState(initialTotalDays || 0);

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
  const submittedIds = useRef<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [autoNavigateTimer, setAutoNavigateTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [ponderedReflections, setPonderedReflections] = useState<Set<number>>(new Set());
  const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState<number | null>(null);

  // ── animation refs ────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const optionsEnterAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const optionScaleAnims = useRef<Animated.Value[]>([]);
  const scoreRingAnim = useRef(new Animated.Value(0)).current;
  const autoAdvanceBarAnim = useRef(new Animated.Value(1)).current;

  const [modal, setModal] = useState<{
    status: boolean;
    title: string;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ status: false, title: '', message: '', severity: 'info' });

  // ── effects ───────────────────────────────────
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  // Cleanup auto-advance timer
  useEffect(() => {
    return () => {
      if (autoNavigateTimer) clearTimeout(autoNavigateTimer);
    };
  }, [autoNavigateTimer]);

  // Animate score ring when quiz is done
  useEffect(() => {
    if (quizDone && hasQuiz) {
      scoreRingAnim.setValue(0);
      Animated.timing(scoreRingAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      // Show confetti for high scores
      const pct = quizTotal > 0 ? (correctCount / quizTotal) * 100 : 0;
      if (pct >= 70) {
        const t = setTimeout(() => setShowConfetti(true), 300);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizDone]);

  // ── data ──────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      await loadAssignment();
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
      if (r?.returnCode === 200) {
        const plansList = Array.isArray(r.returnData)
          ? r.returnData
          : r.returnData?.plans || [];
        const meta = plansList.find((p: any) => p.planId === planId);
        if (meta) {
          setPlanTitle(meta.title || rp?.bpTitle || 'Reading Plan');
          setTotalDays(meta.totalDays || 0);

          const planEnabled = await isPlanNotificationsEnabled();
          if (planEnabled) {
            await scheduleDailyReminder(planId, meta.title || 'Reading Plan', day);
          }

          const atRiskEnabled = await isAtRiskReminderEnabled();
          if (atRiskEnabled && !completed) {
            const { h, m } = await getAtRiskReminderTime();
            await scheduleStreakAtRiskReminder(
              planId, meta.title || 'Reading Plan',
              meta.currentStreak ?? 0, h, m,
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

        // Always start fresh
        setCurrentQ(0);
        setSelected(null);
        setShowResult(false);
        setIsReviewing(false);
        setQuizDone(false);
        setCorrectCount(0);
        submittedIds.current = new Set();
        setShowConfetti(false);
        setLastAnswerCorrect(null);
        setRevealedCorrectAnswer(null);
        setAutoNavigateTimer((prev) => {
          if (prev) clearTimeout(prev);
          return null;
        });

        // Initialize option animations for the first question
        if (
          Array.isArray(returnData.quizQuestions) &&
          returnData.quizQuestions.length > 0
        ) {
          optionScaleAnims.current = returnData.quizQuestions[0].options.map(
            () => new Animated.Value(1),
          );
        } else {
          optionScaleAnims.current = [];
        }

        if (
          Array.isArray(returnData.quizQuestions) &&
          returnData.quizQuestions.length > 0
        ) {
          const newSubmitted = new Set<number>();
          returnData.quizQuestions.forEach((q: QuizQuestion) => {
            if (q.userAnswer !== null) {
              newSubmitted.add(q.questionId);
            }
          });
          submittedIds.current = newSubmitted;
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
  const [showNextDayPrompt, setShowNextDayPrompt] = useState(false);

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
        const msg = (rp?.dailyReadingDayCompleteText || '\uD83C\uDF89 Day Complete! Day {day} marked as done!').replace('{day}', String(day));
        showToast('success', msg);
        if (day < totalDays) {
          setShowNextDayPrompt(true);
        }
      } else showToast('error', `Error: ${r.returnMessage || 'Failed'}`);
    } catch (e: any) {
      showToast('error', `Error: ${e.message}`);
    }
  };

  // ── day nav ───────────────────────────────────
  const navigateDay = (dir: 'prev' | 'next') => {
    if (dir === 'next' && !isCompleted) {
      showToast('error', rp?.dailyReadingNotAddedYet || "Complete today's reading first.");
      return;
    }
    const nd = dir === 'prev' ? day - 1 : day + 1;
    if (nd >= 1 && nd <= totalDays) {
      navigation.replace(route.dailyReading, {
        planId,
        day: nd,
        planTitle,
        totalDays,
      });
    }
  };

  const handleOpenBible = (book: string, chapter: number) => {
    sendPostRequest('bible', 'add-read-history', {
      bookName: book,
      chapter,
      verseNumber: 1,
    }).catch(console.error);

    const params: Record<string, any> = {
      bookName: book,
      chapter,
    };

    // Pass reflection questions and plan context if available
    if (
      Array.isArray(assignment?.reflectionQuestions) &&
      assignment!.reflectionQuestions.length > 0
    ) {
      params.reflectionQuestions = assignment!.reflectionQuestions;
      params.planTitle = planTitle;
      params.dayTitle = assignment!.title || `${rp?.dailyReadingDayLabel || 'Day'} ${day}`;
      params.planId = planId;
      params.day = day;
    }

    navigation.navigate(route.bible, params);
  };

  // ── quiz: jump to a specific question index ───
  const jumpToQuestion = (idx: number) => {
    if (!assignment?.quizQuestions) return;
    const targetQ = assignment.quizQuestions[idx];

    // Reset animation refs
    optionsEnterAnim.setValue(0);
    optionScaleAnims.current = targetQ.options.map(() => new Animated.Value(1));

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCurrentQ(idx);
      setRevealedCorrectAnswer(targetQ.correctAnswer);

      if (targetQ.userAnswer !== null && targetQ.userAnswer !== undefined) {
        setSelected(targetQ.userAnswer);
        setShowResult(true);
        setIsReviewing(true);
      } else {
        setSelected(null);
        setShowResult(false);
        setIsReviewing(false);
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        // Staggered entrance for options
        Animated.stagger(
          60,
          optionScaleAnims.current.map((anim) =>
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
          ),
        ).start();
      });
    });
  };

  // ── quiz: select answer ────────────────────────
  const handleSelect = (idx: number) => {
    if (isReviewing) {
      setIsReviewing(false);
      setShowResult(false);
      setSelected(idx);
      return;
    }
    if (!showResult) {
      setSelected(idx);
      // Spring animation on selection
      const anim = optionScaleAnims.current[idx];
      if (anim) {
        Animated.sequence([
          Animated.spring(anim, {
            toValue: 1.03,
            tension: 150,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.spring(anim, {
            toValue: 1,
            tension: 100,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // ── quiz: submit ───────────────────────────────
  const handleSubmit = async () => {
    if (selected === null || !assignment?.quizQuestions || isSubmitting) return;
    const q = assignment.quizQuestions[currentQ];

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
        setLastAnswerCorrect(isCorrect);

        if (isCorrect) {
          setCorrectCount((p) => p + 1);
          // Show confetti on correct!
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
        } else {
          // Shake animation on wrong answer
          Animated.sequence([
            Animated.timing(shakeAnim, {
              toValue: 10,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: -10,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 8,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: -8,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 0,
              duration: 60,
              useNativeDriver: true,
            }),
          ]).start();
        }

        setRevealedCorrectAnswer(correctAnswer ?? q.correctAnswer);
        submittedIds.current.add(q.questionId);
        setAssignment((prev) => {
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

        // Auto-advance on correct answers
        if (isCorrect && currentQ < assignment.quizQuestions.length - 1) {
          autoAdvanceBarAnim.setValue(1);
          Animated.timing(autoAdvanceBarAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();

          const timer = setTimeout(() => {
            setShowResult(false);
            setSelected(null);
            setCurrentQ((q) => q + 1);
            setLastAnswerCorrect(null);
            setRevealedCorrectAnswer(null);
          }, 2500);
          setAutoNavigateTimer(timer);
        }
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
    // Cancel any auto-advance
    if (autoNavigateTimer) {
      clearTimeout(autoNavigateTimer);
      setAutoNavigateTimer(null);
    }
    setShowConfetti(false);

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

  // ── quiz: retry ─────────────────
  const retryQuiz = () => {
    const already =
      assignment?.quizQuestions?.filter((q) => q.isCorrect === true).length ?? 0;
    setCorrectCount(already);
    setQuizDone(false);
    setShowConfetti(false);
    jumpToQuestion(0);
  };

  // ── Cancel auto-advance ────────────────────────
  const cancelAutoNavigate = () => {
    if (autoNavigateTimer) {
      clearTimeout(autoNavigateTimer);
      setAutoNavigateTimer(null);
    }
    autoAdvanceBarAnim.setValue(0);
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
  const perf = getQuizPerformance(correctCount, quizTotal, rp);
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

  const renderDayStrip = () => (
    <View
      style={[
        s.dayStrip,
        { backgroundColor: C.cardBackground, borderBottomColor: C.border, flexDirection: isRtl ? 'row-reverse' : 'row' },
      ]}
    >
      <View
        style={[
          s.dayPill,
          { backgroundColor: C.primary + '18', borderColor: C.primary + '35' },
        ]}
      >
        <Text style={[s.dayPillText, { color: C.primary }]}>
          {(rp?.dailyReadingDayLabel || 'Day') + ' ' + day}
          {totalDays > 0 ? ' / ' + totalDays : ''}
        </Text>
      </View>

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

      <TouchableOpacity
        style={[
          s.completeBtn,
          { flexDirection: isRtl ? 'row-reverse' : 'row' },
          isCompleted
            ? { backgroundColor: C.success + '25', borderColor: C.success + '50' }
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
          {isCompleted ? (rp?.dailyReadingDoneLabel || 'Done') : (rp?.dailyReadingMarkDone || 'Mark Done')}
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
      <View style={[s.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Sk w={120} h={12} r={6} style={{ marginBottom: 16 }} />
        {[1, 2].map((i) => (
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
      <View style={[s.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Sk w={160} h={12} r={6} style={{ marginBottom: 16 }} />
        <Sk w="90%" h={16} r={6} style={{ marginBottom: 8 }} />
        <Sk w="70%" h={16} r={6} style={{ marginBottom: 20 }} />
        {[1, 2, 3, 4].map((i) => (
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
        <View style={[s.emptyIconCircle, { backgroundColor: C.primary + '18' }]}>
          <BookOpen size={36} color={C.primary} />
        </View>
        <Text style={[s.emptyTitle, { color: C.text }]}>
          {rp?.dailyReadingComingSoon || 'Coming Soon'}
        </Text>
        <Text style={[s.emptySubtitle, { color: C.textSecondary }]}>
          {(rp?.dailyReadingNotAddedYet || "Day {day}'s reading assignment hasn't been added yet.\nCheck back soon!").replace('{day}', String(day))}
        </Text>
      </View>
      {renderDayNav()}
    </ScrollView>
  );

  const renderDayNav = () => (
    <View style={[s.navRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <TouchableOpacity
        style={[
          s.navBtn,
          { backgroundColor: C.cardBackground, flexDirection: isRtl ? 'row-reverse' : 'row' },
          !canGoPrev && s.navBtnDisabled,
        ]}
        onPress={() => navigateDay('prev')}
        disabled={!canGoPrev}
      >
        {isRtl ? <ChevronRight size={18} color={C.text} /> : <ChevronLeft size={18} color={C.text} />}
        <Text style={[s.navBtnText, { color: C.text }]}>
          {rp?.dailyReadingPrevious || 'Previous'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          s.navBtn,
          { backgroundColor: C.cardBackground, flexDirection: isRtl ? 'row-reverse' : 'row' },
          !canGoNext && s.navBtnDisabled,
        ]}
        onPress={() => navigateDay('next')}
        disabled={!canGoNext}
      >
        <Text style={[s.navBtnText, { color: C.text }]}>
          {rp?.dailyReadingNext || 'Next'}
        </Text>
        {isRtl ? <ChevronLeft size={18} color={C.text} /> : <ChevronRight size={18} color={C.text} />}
      </TouchableOpacity>
    </View>
  );

  // ── loading / not-added gates ─────────────────
  if (loading || notYetAdded || !assignment) {
    return (
      <View style={[s.container, { backgroundColor: C.background }]}>
        <LinearGradient
          colors={isDark ? ['#1A202C', '#111827'] : ['#F8FAFF', '#F1F5F9']}
          style={s.modernHeader}
        >
          <View style={[s.headerTopRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={s.headerBackBtn}
            >
              {isRtl ? <ChevronRight size={24} color={C.text} /> : <ChevronLeft size={24} color={C.text} />}
            </TouchableOpacity>
            <Text
              style={[s.headerPlanTitle, { color: C.text, textAlign: isRtl ? 'right' : 'center' }]}
              numberOfLines={1}
            >
              {loading ? (rp?.dailyReadingLoading || 'Loading...') : planTitle}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {loading ? (
          renderSkeletonBody()
        ) : notYetAdded ? (
          renderNotYetAdded()
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: C.text, fontSize: 15 }}>
              {rp?.dailyReadingNotAddedYet || 'Assignment not found'}
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
      <LinearGradient
        colors={isDark ? ['#1A202C', '#111827'] : ['#F8FAFF', '#F1F5F9']}
        style={s.modernHeader}
      >
        <View style={[s.headerTopRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.headerBackBtn}
          >
            {isRtl ? <ChevronRight size={24} color={C.text} /> : <ChevronLeft size={24} color={C.text} />}
          </TouchableOpacity>
          <Text
            style={[s.headerPlanTitle, { color: C.text, textAlign: isRtl ? 'right' : 'center' }]}
            numberOfLines={1}
          >
            {planTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[s.headerDayRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View style={[s.headerDayCol, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
            <Text style={[s.headerDayLabel, { color: C.muted }]}>
              {(rp?.dailyReadingCurrentProgress || 'CURRENT PROGRESS').toUpperCase()}
            </Text>
            <Text style={[s.headerDayValue, { color: C.text }]}>
              {(rp?.dailyReadingDayLabel || 'Day') + ' ' + day + ' ' + (rp?.bpOfLabel || 'of') + ' ' + totalDays}
            </Text>
          </View>
          <View
            style={[
              s.headerStatusPill,
              {
                backgroundColor: isCompleted
                  ? C.success + '20'
                  : C.primary + '15',
                borderColor: isCompleted ? C.success + '30' : C.primary + '25',
              },
            ]}
          >
            <Text
              style={[
                s.headerStatusText,
                { color: isCompleted ? C.success : C.primary },
              ]}
            >
              {isCompleted
                ? (rp?.dailyReadingCompleted || 'COMPLETED')
                : (rp?.dailyReadingInProgress || 'IN PROGRESS')}
            </Text>
          </View>
        </View>

        <View
          style={[
            s.headerProgressTrack,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.05)',
            },
          ]}
        >
          <View
            style={[
              s.headerProgressFill,
              {
                width: `${(day / totalDays) * 100}%`,
                backgroundColor: isCompleted ? C.success : C.primary,
              },
            ]}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
      >
        {/* ── Assignment intro ── */}
        <View style={[s.assignmentIntro, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
          <Text style={[s.assignmentTitle, { color: C.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {assignment.title || `${rp?.dailyReadingDayLabel || 'Reading for Day'} ${day}`}
          </Text>
          {assignment.chapters && (
            <View style={[s.assignmentMetaRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <View style={[s.assignmentBadge, { backgroundColor: C.primary + '10' }]}>
                <BookOpen size={12} color={C.primary} />
                <Text style={[s.assignmentBadgeText, { color: C.primary }]}>
                  {(rp?.dailyReadingChaptersCount || '{count} chapters').replace('{count}', String(assignment.chapters.length))}
                </Text>
              </View>
              {hasQuiz && (
                <View style={[s.assignmentBadge, { backgroundColor: '#8b5cf615' }]}>
                  <HelpCircle size={12} color="#8b5cf6" />
                  <Text style={[s.assignmentBadgeText, { color: '#8b5cf6' }]}>
                    {(rp?.dailyReadingQuizCount || '{count} questions').replace('{count}', String(quizTotal))}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Chapters ─────────────────────── */}
        <View style={[s.card, { backgroundColor: C.cardBackground }]}>
          <SectionHeading
            icon={<BookOpen size={16} color={C.primary} />}
            title={rp?.dailyReadingScripturePassages || 'Scripture Passages'}
            color={C.primary}
            isRtl={isRtl}
          />
          <View style={s.chaptersList}>
            {assignment.chapters.map((ch, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  s.modernChapterCard,
                  {
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  },
                ]}
                onPress={() => handleOpenBible(ch.book, ch.startChapter)}
                activeOpacity={0.7}
              >
                <View style={[s.chapterIconCircle, { backgroundColor: C.primary, marginRight: isRtl ? 0 : 15, marginLeft: isRtl ? 15 : 0 }]}>
                  <PlayCircle size={20} color="#fff" />
                </View>
                <View style={s.chapterInfoBody}>
                  <Text style={[s.chapterBookName, { color: C.text, textAlign: isRtl ? 'right' : 'left' }]}>
                    {ch.book}
                  </Text>
                  <Text style={[s.chapterNumberLabel, { color: C.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                    {(rp?.dailyReadingChapterLabel || 'Chapter {chapter}')
                      .replace('{chapter}', String(ch.startChapter === ch.endChapter ? ch.startChapter : `${ch.startChapter}\u2013${ch.endChapter}`))}
                  </Text>
                </View>
                <View style={[s.readCta, { backgroundColor: C.primary + '15' }]}>
                  <Text style={[s.readCtaText, { color: C.primary }]}>
                    {rp?.dailyReadingRead || 'READ'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Reflection Questions ── */}
        {!hasQuiz &&
          Array.isArray(assignment.reflectionQuestions) &&
          assignment.reflectionQuestions.length > 0 && (
            <View style={[s.card, { backgroundColor: C.cardBackground }]}>
              <SectionHeading
                icon={<MessageSquare size={16} color="#f59e0b" />}
                title={rp?.dailyReadingPersonalReflection || 'Personal Reflection'}
                color="#f59e0b"
                isRtl={isRtl}
              />
              <Text style={[s.reflectionSubtitle, { color: C.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {rp?.dailyReadingReflectionSubtitle || "Take a moment to meditate on these questions as you read today's scripture."}
              </Text>
              {assignment.reflectionQuestions.map((q, idx) => {
                const isPondered = ponderedReflections.has(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => {
                      const next = new Set(ponderedReflections);
                      if (isPondered) next.delete(idx);
                      else next.add(idx);
                      setPonderedReflections(next);
                    }}
                    style={[
                      s.modernReflectionRow,
                      {
                        flexDirection: isRtl ? 'row-reverse' : 'row',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderColor: isPondered ? '#f59e0b40' : 'transparent',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={[s.reflectionContentRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                      <View
                        style={[
                          s.reflectionIconBox,
                          {
                            backgroundColor: isPondered ? '#f59e0b' : '#f59e0b20',
                            marginRight: isRtl ? 0 : 12,
                            marginLeft: isRtl ? 12 : 0,
                          },
                        ]}
                      >
                        {isPondered ? (
                          <CheckCircle2 size={16} color="#fff" />
                        ) : (
                          <Lightbulb size={16} color="#f59e0b" />
                        )}
                      </View>
                      <Text
                        style={[
                          s.reflectionBodyText,
                          {
                            color: C.text,
                            opacity: isPondered ? 0.6 : 1,
                            textDecorationLine: isPondered ? 'line-through' : 'none',
                            textAlign: isRtl ? 'right' : 'left',
                          },
                        ]}
                      >
                        {q}
                      </Text>
                    </View>
                    {!isPondered && (
                      <View style={s.ponderAction}>
                        <Text style={[s.ponderActionText, { color: '#f59e0b' }]}>
                          {rp?.dailyReadingPonder || 'PONDER'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

        {/* ══════════════════════════════════════
            QUIZ — one question at a time
        ══════════════════════════════════════ */}
        {hasQuiz && !quizDone && activeQ && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[s.card, { backgroundColor: C.cardBackground }]}>
              {/* Confetti overlay */}
              {showConfetti && <Confetti />}

              {/* ── Review banner ── */}
              {isReviewing && (
                <View
                  style={[
                    s.reviewBanner,
                    {
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
                      borderColor: isDark ? '#3B82F6' : '#BFDBFE',
                    },
                  ]}
                >
                  <RotateCcw size={14} color="#3B82F6" />
                  <Text style={[s.reviewBannerText, { textAlign: isRtl ? 'right' : 'left' }]}>
                    {rp?.dailyReadingReviewMode || 'Review mode \u2014 tap a dot to jump, or tap an option to retry'}
                  </Text>
                </View>
              )}

              {/* Auto-advance banner */}
              {autoNavigateTimer && lastAnswerCorrect && (
                <View
                  style={[
                    s.autoAdvanceBanner,
                    {
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                      borderColor: isDark ? '#10B98140' : '#A7F3D0',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.autoAdvanceText, { color: isDark ? '#6EE7B7' : '#065F46', textAlign: isRtl ? 'right' : 'left' }]}>
                      {(rp?.dailyReadingAutoAdvance || '\u2713 Correct! Next question in a moment\u2026')}
                    </Text>
                    <View
                      style={[s.autoAdvanceTrack, { backgroundColor: isDark ? '#065F46' : '#D1FAE5' }]}
                    >
                      <Animated.View
                        style={[
                          s.autoAdvanceFill,
                          {
                            backgroundColor: '#10B981',
                            width: autoAdvanceBarAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <TouchableOpacity onPress={cancelAutoNavigate} style={s.autoAdvanceCancel}>
                    <Text style={[s.autoAdvanceCancelText, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                      {rp?.dailyReadingCancel || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <SectionHeading
                icon={<Star size={14} color="#6366F1" />}
                title={rp?.dailyReadingKnowledgeCheck || 'Knowledge Check'}
                color="#6366F1"
                isRtl={isRtl}
              />

              {/* ── Progress row ── */}
              <View style={[s.quizMeta, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[s.quizMetaText, { color: C.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
                  {(rp?.dailyReadingQuestionOf || 'Question {current} of {total}')
                    .replace('{current}', String(currentQ + 1))
                    .replace('{total}', String(quizTotal))}
                </Text>
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
              <Text style={[s.questionText, { color: C.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {activeQ.question}
              </Text>

              {/* Options with staggered entrance */}
              <Animated.View
                style={{
                  transform: [{ translateX: shakeAnim }],
                }}
              >
                <View style={s.optionsWrap}>
                  {activeQ.options.map((opt, idx) => {
                    const isSel = selected === idx;
                    const correctIdx = revealedCorrectAnswer ?? activeQ.correctAnswer;
                    const isCorrect = showResult && correctIdx === idx;
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
                      ? isDark ? '#064E3B' : '#D1FAE5'
                      : isWrong
                        ? isDark ? '#450A0A' : '#FEE2E2'
                        : isSel && !showResult
                          ? C.primary + '14'
                          : 'transparent';
                    const textCol = isCorrect ? '#10B981' : isWrong ? '#EF4444' : C.text;
                    const badgeBg = isCorrect
                      ? '#10B981'
                      : isWrong
                        ? '#EF4444'
                        : isSel && !showResult
                          ? C.primary
                          : isDark ? '#2D3748' : '#F3F4F6';

                    const scaleAnim = optionScaleAnims.current[idx] || new Animated.Value(1);

                    return (
                      <Animated.View
                        key={idx}
                        style={{ transform: [{ scale: scaleAnim }] }}
                      >
                        <TouchableOpacity
                          style={[
                            s.answerRow,
                            {
                              flexDirection: isRtl ? 'row-reverse' : 'row',
                              borderColor: borderCol,
                              backgroundColor: bgCol,
                            },
                            isReviewing && isSel && s.answerRowReview,
                          ]}
                          onPress={() => handleSelect(idx)}
                          activeOpacity={0.75}
                        >
                          <View style={[s.answerBadge, { backgroundColor: badgeBg, marginRight: isRtl ? 0 : 12, marginLeft: isRtl ? 12 : 0 }]}>
                            {showResult && isCorrect ? (
                              <CheckCircle size={16} color="white" />
                            ) : showResult && isWrong ? (
                              <XCircle size={16} color="white" />
                            ) : (
                              <Text
                                style={[
                                  s.answerLetter,
                                  {
                                    color: isSel && !showResult ? 'white' : C.textSecondary,
                                  },
                                ]}
                              >
                                {String.fromCharCode(65 + idx)}
                              </Text>
                            )}
                          </View>
                          <Text style={[s.answerText, { color: textCol, textAlign: isRtl ? 'right' : 'left' }]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Explanation */}
              {showResult && activeQ.explanation ? (
                <View
                  style={[
                    s.explanationBox,
                    {
                      backgroundColor:
                        selected === (revealedCorrectAnswer ?? activeQ.correctAnswer)
                          ? isDark ? '#064E3B' : '#ECFDF5'
                          : isDark ? '#450A0A' : '#FEF2F2',
                      borderLeftColor:
                        selected === (revealedCorrectAnswer ?? activeQ.correctAnswer)
                          ? '#10B981' : '#EF4444',
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.explanationLabel,
                      {
                        color:
                          selected === (revealedCorrectAnswer ?? activeQ.correctAnswer)
                            ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    {selected === (revealedCorrectAnswer ?? activeQ.correctAnswer)
                      ? (rp?.dailyReadingCorrectLabel || '\u2713 Correct')
                      : (rp?.dailyReadingIncorrectLabel || '\u2717 Incorrect')}
                  </Text>
                  <Text
                    style={[s.explanationText, { color: isDark ? '#D1FAE5' : '#374151', textAlign: isRtl ? 'right' : 'left' }]}
                  >
                    {activeQ.explanation}
                  </Text>
                </View>
              ) : null}

              {/* ── Action buttons ── */}
              {isReviewing ? (
                // REVIEW MODE
                <View style={s.reviewActions}>
                  {(() => {
                    const skipTarget = currentQ < quizTotal - 1 ? currentQ + 1 : null;
                    return (
                      <View style={[s.reviewBtnRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity
                          style={[s.skipBtn, { flexDirection: isRtl ? 'row-reverse' : 'row', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                          onPress={() => {
                            if (skipTarget !== null) {
                              jumpToQuestion(skipTarget);
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
                          <Text style={[s.skipBtnText, { color: C.textSecondary }]}>
                            {rp?.dailyReadingSkip || 'Skip'}
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
                              ? (rp?.dailyReadingNextQuestion || 'Next Question')
                              : (rp?.dailyReadingSeeResults || 'See Results')}
                          </Text>
                          <ChevronRight size={18} color="white" />
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              ) : !showResult ? (
                // FRESH / RESUBMIT
                <View>
                  {assignment.quizQuestions![currentQ].userAnswer !== null && (
                    <View style={[s.reviewBtnRow, { flexDirection: isRtl ? 'row-reverse' : 'row', marginTop: 14 }]}>
                      <TouchableOpacity
                        style={[s.skipBtn, { flexDirection: isRtl ? 'row-reverse' : 'row', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
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
                        <Text style={[s.skipBtnText, { color: C.textSecondary }]}>
                          {rp?.dailyReadingSkip || 'Skip'}
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
                                : isDark ? '#374151' : '#D1D5DB',
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
                          <Text style={s.actionBtnText}>
                            {(rp?.dailyReadingUpdateAnswer || 'Update Answer')}
                            {assignment.quizQuestions![currentQ].numberAttempt
                              ? ` (${rp?.dailyReadingTryLabel || 'Try'} ${assignment.quizQuestions![currentQ].numberAttempt! + 1})`
                              : ''}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {assignment.quizQuestions![currentQ].userAnswer === null && (
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        {
                          backgroundColor:
                            selected !== null && !isSubmitting
                              ? C.primary
                              : isDark ? '#374151' : '#D1D5DB',
                        },
                      ]}
                      onPress={handleSubmit}
                      disabled={selected === null || isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={s.actionBtnText}>
                          {rp?.dailyReadingSubmitAnswer || 'Submit Answer'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // RESULT SHOWN
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.primary }]}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <Text style={s.actionBtnText}>
                    {currentQ < quizTotal - 1
                      ? (rp?.dailyReadingNextQuestion || 'Next Question')
                      : (rp?.dailyReadingSeeResults || 'See Results')}
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
            {/* Confetti overlay */}
            {showConfetti && <Confetti />}

            <SectionHeading
              icon={<Star size={14} color={perf.color} />}
              title={rp?.dailyReadingYourResults || 'Your Results'}
              color={perf.color}
              isRtl={isRtl}
            />

            {/* Score ring */}
            <View style={s.scoreBlock}>
              <View style={[s.scoreRingOuter, { borderColor: perf.color + '30' }]}>
                <ProgressCircle
                  percent={accuracyPct}
                  size={160}
                  strokeWidth={12}
                  color={perf.color}
                  backgroundColor={isDark ? '#2D3748' : '#E5E7EB'}
                />
                <View style={s.scoreOverlay}>
                  <Text style={s.scoreEmoji}>{perf.emoji}</Text>
                  <Text style={[s.scoreNum, { color: perf.color }]}>
                    {correctCount}/{quizTotal}
                  </Text>
                  <Text style={[s.scorePct, { color: C.textSecondary }]}>
                    {accuracyPct}%
                  </Text>
                </View>
              </View>

              {/* Perfect score celebration */}
              {accuracyPct === 100 && (
                <View style={[s.perfectScoreRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <Sparkles size={16} color="#6366F1" />
                  <Text style={[s.perfectScoreText, { color: '#6366F1' }]}>
                    {rp?.dailyReadingScorePerfect || 'Perfect Score! Amazing!'}
                  </Text>
                  <Sparkles size={16} color="#6366F1" />
                </View>
              )}

              <Text style={[s.scoreLabel, { color: C.text, textAlign: 'center' }]}>
                {perf.label}
              </Text>
              <Text style={[s.scoreSubtitle, { color: C.textSecondary, textAlign: isRtl ? 'right' : 'center' }]}>
                {correctCount === 0
                  ? (rp?.dailyReadingScoreDescriptionZero || "Don't worry \u2014 re-read the passages and try again.")
                  : accuracyPct < 50
                    ? (rp?.dailyReadingScoreDescriptionLow || 'A solid start! Review the chapters to deepen your understanding.')
                    : accuracyPct < 70
                      ? (rp?.dailyReadingScoreDescriptionMedium || "You're close! A quick re-read will push you over the line.")
                      : accuracyPct < 100
                        ? (rp?.dailyReadingScoreDescriptionHigh || 'Great understanding of the reading. Keep the momentum going!')
                        : (rp?.dailyReadingScoreDescriptionPerfect || 'Flawless! Outstanding grasp of this passage.')}
              </Text>
            </View>

            {/* Score badges */}
            <View style={[s.scoreBadgesRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <View style={[s.scoreBadge, { backgroundColor: isDark ? '#064E3B30' : '#D1FAE5', borderColor: isDark ? '#10B98140' : '#A7F3D0' }]}>
                <CheckCircle size={14} color="#10B981" />
                <Text style={[s.scoreBadgeText, { color: '#10B981' }]}>
                  {correctCount} {rp?.dailyReadingCorrect || 'Correct'}
                </Text>
              </View>
              <View style={[s.scoreBadge, { backgroundColor: isDark ? '#450A0A30' : '#FEE2E2', borderColor: isDark ? '#EF444440' : '#FECACA' }]}>
                <XCircle size={14} color="#EF4444" />
                <Text style={[s.scoreBadgeText, { color: '#EF4444' }]}>
                  {quizTotal - correctCount} {rp?.dailyReadingWrong || 'Wrong'}
                </Text>
              </View>
            </View>

            {/* Per-question summary */}
            <View
              style={[
                s.summaryBox,
                {
                  backgroundColor: isDark ? '#111827' : '#F9FAFB',
                  borderColor: isDark ? '#2D3748' : '#EEF0F3',
                },
              ]}
            >
              <View style={[s.summaryHeader, { borderBottomColor: isDark ? '#2D3748' : '#EEF0F3' }]}>
                <Text style={[s.summaryHeaderText, { color: C.muted }]}>
                  {rp?.dailyReadingQuestionSummary || 'Question Summary'}
                </Text>
              </View>
              <View style={s.summaryScroll}>
                {assignment.quizQuestions!.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      s.summaryRow,
                      { flexDirection: isRtl ? 'row-reverse' : 'row' },
                      idx < assignment.quizQuestions!.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? '#2D3748' : '#EEF0F3',
                      },
                    ]}
                    onPress={() => {
                      setCorrectCount(
                        assignment.quizQuestions!.filter((qq) => qq.isCorrect === true).length,
                      );
                      setShowConfetti(false);
                      setQuizDone(false);
                      setIsReviewing(true);
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
                      style={[s.summaryText, { color: C.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}
                      numberOfLines={2}
                    >
                      Q{idx + 1}: {q.question}
                    </Text>
                    <View style={[s.summaryRight, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                      {q.numberAttempt && q.numberAttempt > 1 && (
                        <Text style={[s.summaryAttempts, { color: '#F59E0B' }]}>
                          {q.numberAttempt} {rp?.dailyReadingTryLabel || 'tries'}
                        </Text>
                      )}
                      <ChevronRight size={13} color={C.muted} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Review & Retry */}
            <TouchableOpacity
              style={[s.outlineBtn, { borderColor: C.primary }]}
              onPress={() => {
                setShowConfetti(false);
                retryQuiz();
              }}
              activeOpacity={0.7}
            >
              <View style={[s.outlineBtnInner, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <RotateCcw size={16} color={C.primary} />
                <Text style={[s.outlineBtnText, { color: C.primary }]}>
                  {rp?.dailyReadingReviewRetry || 'Review & Retry Answers'}
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
                <Text style={s.actionBtnText}>
                  {(rp?.dailyReadingMarkDayComplete || 'Mark Day {day} Complete').replace('{day}', String(day))}
                </Text>
              </TouchableOpacity>
            )}

            {isCompleted && (
              <View style={s.completedBadge}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={s.completedBadgeText}>
                  {(rp?.dailyReadingDayCompleteText || 'Day {day} completed \u2713').replace('{day}', String(day))}
                </Text>
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
            <Text style={s.actionBtnText}>
              {(rp?.dailyReadingMarkDayComplete || 'Mark Day {day} Complete').replace('{day}', String(day))}
            </Text>
          </TouchableOpacity>
        )}
        {isCompleted && !hasQuiz && (
          <View style={s.completedBadge}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={s.completedBadgeText}>
              {(rp?.dailyReadingDayCompleteText || 'Day {day} completed \u2713').replace('{day}', String(day))}
            </Text>
          </View>
        )}

        {renderDayNav()}
      </ScrollView>

      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal.severity}
        onConfirm={() => setModal((p) => ({ ...p, status: false }))}
      />

      {/* Next day prompt */}
      <ActionModal
        visible={showNextDayPrompt}
        title={(rp?.dailyReadingCompleteDayTitle || 'Day {day} Complete! \uD83C\uDF89').replace('{day}', String(day))}
        message={rp?.dailyReadingCompleteDayMessage || 'Would you like to proceed to the next day or finish for now?'}
        severity="success"
        confirmLabel={rp?.dailyReadingConfirmNext || 'Next Day'}
        cancelLabel={rp?.dailyReadingConfirmFinish || 'Finish'}
        onConfirm={() => {
          setShowNextDayPrompt(false);
          navigation.replace(route.dailyReading, {
            planId,
            day: day + 1,
            planTitle,
            totalDays,
          });
        }}
        onCancel={() => setShowNextDayPrompt(false)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },

  // ── Day strip ─────────────────────────────────
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
  stripProgress: { flex: 1 },
  stripTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  stripFill: { height: '100%', borderRadius: 2 },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  completeBtnText: { fontSize: 12, fontWeight: '700' },

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

  // Auto-advance
  autoAdvanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  autoAdvanceText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  autoAdvanceTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  autoAdvanceFill: {
    height: '100%',
    borderRadius: 2,
  },
  autoAdvanceCancel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  autoAdvanceCancelText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Quiz meta
  quizMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizMetaText: { fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  scoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreEmoji: { fontSize: 24, marginBottom: 2 },
  scoreNum: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  scorePct: { fontSize: 13, fontWeight: '600' },
  scoreLabel: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  scoreSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 10,
  },

  // Score badges
  scoreBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Perfect score
  perfectScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  perfectScoreText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Summary
  summaryBox: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
  },
  summaryHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  summaryHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryScroll: {},
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
  summaryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryAttempts: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },

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

  // Modern Headers
  modernHeader: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlanTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerDayCol: { flex: 1 },
  headerDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerDayValue: { fontSize: 22, fontWeight: '900' },
  headerStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerStatusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  headerProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  headerProgressFill: { height: '100%', borderRadius: 3 },
  assignmentIntro: { marginBottom: 25 },
  assignmentTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
    marginBottom: 10,
  },
  assignmentMetaRow: { flexDirection: 'row', gap: 8 },
  assignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  assignmentBadgeText: { fontSize: 11, fontWeight: '800' },

  // Chapters List
  chaptersList: { gap: 12, marginTop: 5 },
  modernChapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 18,
  },
  chapterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  chapterInfoBody: { flex: 1 },
  chapterBookName: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  chapterNumberLabel: { fontSize: 13, fontWeight: '600' },
  readCta: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  readCtaText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  // Reflections
  reflectionSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 15 },
  modernReflectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
  },
  reflectionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  reflectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reflectionBodyText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
  },
  ponderAction: { paddingHorizontal: 10, paddingVertical: 5 },
  ponderActionText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});

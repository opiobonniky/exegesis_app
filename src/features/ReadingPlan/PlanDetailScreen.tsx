// src/screens/reading-plans/PlanDetailScreen.tsx
import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { AppContext } from '../../common/AppContext';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  BarChart2,
  CalendarDays,
  List,
  Target,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { sendPostRequest } from '../../services/api';
import ActionHeader from '../../reusable/ActionHeader';
import { useLanguage } from '../../component/language-translation/LanguageProvider';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CAL_CELL = Math.floor((SCREEN_W - SPACING.md * 2 - 32 - 6 * 4) / 7);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Chapter {
  book: string;
  chapter: number;
}

interface QuizQuestion {
  questionId: number;
  question: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number | null;
  isCorrect: boolean | null;
  numberAttempt: number;
}

interface DayAssignment {
  day: number;
  title: string;
  chapters: Chapter[];
  completed?: boolean;
  reflectionQuestions?: string[];
  quizQuestions?: QuizQuestion[];
}

interface PlanDetail {
  plan_id: string;
  title: string;
  description: string;
  total_days: number;
  questions_enabled: boolean;
  category: string;
  difficulty: string;
  start_date: string | null;
  completed_days_json: string | null;
  completed_days_count: number;
  last_completed_date: string | null;
  streak: number;
  is_completed: boolean;
  completion_percentage: number;
  days_since_last_activity: number | null;
  days_since_started: number | null;
  avg_days_per_completion: number | null;
  estimated_days_to_complete: number | null;
  total_quiz_questions: number;
  user_answered_questions: number;
  user_correct_answers: number;
  quiz_accuracy_percentage: number;
  total_assignments: number;
}

interface CalCell {
  date: number;
  planDay: number | null;
  isCompleted: boolean;
  isToday: boolean;
  isPlanDay: boolean;
}

type TabKey = 'list' | 'calendar' | 'stats';
type Palette = ReturnType<typeof makePalette>;

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────
function makePalette(isDark: boolean) {
  return {
    bg: isDark ? '#080D18' : '#F4F6FF',
    surface: isDark ? '#0E1525' : '#FFFFFF',
    card: isDark ? '#121C2E' : '#FFFFFF',
    cardB: isDark ? '#172035' : '#F0F3FF',
    gold: '#C9963A',
    goldL: '#E8B85C',
    goldGlow: isDark ? 'rgba(201,150,58,0.14)' : 'rgba(201,150,58,0.1)',
    blue: isDark ? '#3B6FD4' : '#1A3F7A',
    blueL: isDark ? '#5A8EF5' : '#2D5BBF',
    blueGlow: isDark ? 'rgba(59,111,212,0.18)' : 'rgba(26,63,122,0.1)',
    green: '#1FAD6A',
    greenL: '#2FCE82',
    greenGlow: 'rgba(31,173,106,0.14)',
    red: '#E05050',
    text: isDark ? '#DDE4F0' : '#0F1724',
    textSub: isDark ? '#7E92B0' : '#374151',
    textMuted: isDark ? '#3D5070' : '#6B7280',
    border: isDark ? '#1A2B42' : '#D1D9EC',
    gradH: (isDark
      ? ['#0D1829', '#080D18']
      : ['#1A3F7A', '#0D2654']) as string[],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildCalCells(
  startDateStr: string,
  totalDays: number,
  completedSet: Set<number>,
  today: Date,
): { cells: (CalCell | null)[]; year: number; month: number } {
  const start = new Date(startDateStr);
  const year = start.getFullYear();
  const month = start.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const dayToDate: Record<string, number> = {};
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + d - 1);
    dayToDate[`${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`] = d;
  }

  const cells: (CalCell | null)[] = Array(startWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const planDay = dayToDate[`${year}-${month}-${d}`] ?? null;
    cells.push({
      date: d,
      planDay,
      isCompleted: planDay !== null && completedSet.has(planDay),
      isToday:
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear(),
      isPlanDay: planDay !== null,
    });
  }
  return { cells, year, month };
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString('en-US', opts);

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function quizStats(questions: QuizQuestion[]) {
  const correct = questions.filter(q => q.isCorrect).length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, pct };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — shown in the list while assignments are still loading
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonBox({
  w,
  h,
  P,
  style,
}: {
  w?: number | string;
  h: number;
  P: Palette;
  style?: any;
}) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[
        {
          width: w ?? '100%',
          height: h,
          borderRadius: 8,
          backgroundColor: P.border,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

function SkeletonDayCard({ P }: { P: Palette }) {
  return (
    <View
      style={[
        S.dayCard,
        {
          backgroundColor: P.card,
          borderColor: P.border,
          marginBottom: SPACING.sm,
        },
      ]}
    >
      <SkeletonBox w={40} h={40} P={P} style={{ borderRadius: 11 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox w="65%" h={13} P={P} />
        <SkeletonBox w="42%" h={10} P={P} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable UI primitives
// ─────────────────────────────────────────────────────────────────────────────
function Bar({
  pct,
  color,
  h = 5,
}: {
  pct: number;
  color: string;
  h?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  return (
    <View
      style={{
        height: h,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: h / 2,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: h,
          borderRadius: h / 2,
          backgroundColor: color,
          width: anim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

function Arc({
  pct,
  size,
  stroke,
  color,
  track,
  children,
}: {
  pct: number;
  size: number;
  stroke: number;
  color: string;
  track: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <SvgCircle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <SvgCircle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * pct) / 100}
        />
      </Svg>
      <View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Card({
  children,
  style,
  P,
}: {
  children: React.ReactNode;
  style?: any;
  P: Palette;
}) {
  return (
    <View
      style={[
        S.card,
        { backgroundColor: P.card, borderColor: P.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionHead({ label, P }: { label: string; P: Palette }) {
  return (
    <Text
      style={[S.sectionHead, { color: P.gold, borderBottomColor: P.border }]}
    >
      {label}
    </Text>
  );
}

function Pill({
  label,
  color,
  bg,
  border,
  size = 10,
}: {
  label: string;
  color: string;
  bg: string;
  border: string;
  size?: number;
}) {
  return (
    <View style={[S.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[S.pillText, { color, fontSize: size }]}>{label}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  color,
  subColor,
  borderColor,
  last,
}: {
  label: string;
  value: string;
  color: string;
  subColor: string;
  borderColor: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        S.infoRow,
        !last && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
    >
      <Text style={{ fontSize: 12, color: subColor }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color }}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function PlanDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isDark } = useContext(AppContext)!;
  const { translations, language } = useLanguage();
  const rp = translations?.readingPlan;
  const isRtl = language === 'ar';
  const P = useMemo(() => makePalette(isDark), [isDark]);

  const { planId, initialTab } = route.params ?? {};

  const [planLoading, setPlanLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  const [planDetail, setPlanDetail] = useState<PlanDetail | null>(null);
  const [assignments, setAssignments] = useState<DayAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? 'list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPlanDetail();
    fetchAssignments();
  }, []);

  async function fetchPlanDetail() {
    try {
      const res = await sendPostRequest('reading-plans', 'plan-detail', {
        planId,
      });
      if (res.returnCode === 200 && res.returnData) {
        setPlanDetail(res.returnData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPlanLoading(false);
    }
  }

  async function fetchAssignments() {
    try {
      const res = await sendPostRequest('reading-plans', 'all-assignments', {
        planId,
      });
      if (res?.returnCode === 200 && Array.isArray(res.returnData)) {
        setAssignments(
          res.returnData
            .filter((r: any) => typeof r?.day === 'number')
            .map((r: any) => ({
              day: r.day,
              title: r.title || '',
              chapters: r.chapters || [],
              completed: r.completed || false,
              reflectionQuestions: r.reflectionQuestions || [],
              quizQuestions: r.quizQuestions || [],
            })),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAssignmentsLoading(false);
    }
  }

  useEffect(() => {
    const open = selectedDay !== null;
    if (open) {
      Animated.spring(drawerAnim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedDay]);

  const completedDays = useMemo<number[]>(() => {
    try {
      return JSON.parse(planDetail?.completed_days_json ?? '[]');
    } catch {
      return [];
    }
  }, [planDetail?.completed_days_json]);

  const completedSet = useMemo(() => new Set(completedDays), [completedDays]);
  const today = useMemo(() => new Date(), []);

  const currentDay = useMemo(() => {
    if (!planDetail?.start_date) return 1;
    const diff = Math.floor(
      (today.getTime() - new Date(planDetail.start_date).getTime()) / 86400000,
    );
    return Math.min(diff + 1, planDetail.total_days);
  }, [planDetail, today]);

  const calData = useMemo(
    () =>
      planDetail?.start_date
        ? buildCalCells(
            planDetail.start_date,
            planDetail.total_days,
            completedSet,
            today,
          )
        : null,
    [planDetail, completedSet, today],
  );

  const selectedAssignment = useMemo(
    () =>
      selectedDay
        ? (assignments.find(a => a.day === selectedDay) ?? null)
        : null,
    [selectedDay, assignments],
  );

  // ── Guards ──
  if (planLoading)
    return (
      <View style={[S.centered, { backgroundColor: P.bg }]}>
        <ActivityIndicator size="large" color={P.gold} />
      </View>
    );

  if (!planDetail)
    return (
      <View style={[S.centered, { backgroundColor: P.bg }]}>
        <Text style={{ color: P.text }}>{rp?.planDetailPlanNotFound || 'Plan not found'}</Text>
      </View>
    );

  // ── Computed ──
  const pct = Math.round(planDetail.completion_percentage);
  const total = planDetail.total_days;
  const remaining = Math.max(total - completedDays.length, 0);
  const diffColor =
    ({ easy: P.green, medium: P.gold, hard: P.red } as Record<string, string>)[
      planDetail.difficulty
    ] ?? P.gold;

  const milestones = [25, 50, 75, 100].map(m => {
    const day = Math.floor((total * m) / 100);
    return { pct: m, day, achieved: completedDays.length >= day };
  });

  const drawerY = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H * 0.65, 0],
  });

  // ─────────────────────────────────────────────────────────────────────
  // TAB: Days
  // ─────────────────────────────────────────────────────────────────────
  const renderDayItem = ({ item: day }: { item: number }) => {
    if (assignmentsLoading) return <SkeletonDayCard P={P} />;

    const a = assignments.find(x => x.day === day);
    const isDone = completedSet.has(day);
    const isToday = day === currentDay;
    const isFutr = day > currentDay;
    const isSel = selectedDay === day;
    const { correct, total: qTotal } = quizStats(a?.quizQuestions ?? []);

    return (
      <TouchableOpacity
        onPress={() => !isFutr && setSelectedDay(isSel ? null : day)}
        disabled={isFutr}
        activeOpacity={0.75}
        style={[
          S.dayCard,
          { backgroundColor: P.card, borderColor: P.border,
            flexDirection: isRtl ? 'row-reverse' : 'row',
          },
          isDone && { borderColor: P.green + '44', backgroundColor: P.cardB },
          isToday && { borderColor: P.blue + '77' },
          isSel && { borderColor: P.goldL + '88' },
          isFutr && { opacity: 0.38 },
        ]}
      >
        <View
          style={[
            S.dayBadge,
            {
              backgroundColor: isDone
                ? P.green + '1E'
                : isToday
                  ? P.blue + '1E'
                  : P.surface,
            },
          ]}
        >
          {isDone ? (
            <CheckCircle2 size={20} color={P.greenL} />
          ) : (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: isToday ? P.blueL : isFutr ? P.textMuted : P.textSub,
              }}
            >
              {day}
            </Text>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 3,
            }}
          >
            <Text
              style={[S.dayTitle, { color: isFutr ? P.textMuted : P.text, textAlign: isRtl ? 'right' : 'left' }]}
              numberOfLines={1}
            >
              {a?.title ?? `${rp?.planDetailDayLabel?.replace('{day}', String(day)) || `Day ${day}`}`}
            </Text>
            {isToday && (
              <Pill
                label={rp?.planDetailToday || 'TODAY'}
                color={P.blueL}
                bg={P.blueGlow}
                border={P.blue + '44'}
                size={9}
              />
            )}
          </View>
          <Text style={{ fontSize: 11, color: P.textMuted, textAlign: isRtl ? 'right' : 'left' }} numberOfLines={1}>
            {(a?.chapters ?? [])
              .map(ch => `${ch.book} ${ch.chapter}`)
              .join(' · ')}
          </Text>
        </View>

        {isDone && qTotal > 0 && (
          <View style={{ alignItems: 'flex-end', marginLeft: isRtl ? 0 : 8, marginRight: isRtl ? 8 : 0 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: correct === qTotal ? P.greenL : P.gold,
              }}
            >
              {correct}/{qTotal}
            </Text>
            <Text
              style={{ fontSize: 9, color: P.textMuted, letterSpacing: 0.5 }}
            >
              {rp?.planDetailQuizLabel || 'QUIZ'}
            </Text>
          </View>
        )}
        {!isDone && !isFutr && (
          isRtl
            ? <ChevronLeft size={16} color={P.textMuted} style={{ marginRight: 8 }} />
            : <ChevronLeft size={16} color={P.textMuted} style={{ transform: [{ rotate: '180deg' }], marginLeft: 8 }} />
        )}
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // TAB: Calendar
  // ─────────────────────────────────────────────────────────────────────
  const renderCalendar = () => {
    if (!calData) return null;
    const { cells, year, month } = calData;
    const weeks: (CalCell | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
      >
        <Card P={P} style={{ padding: 0, overflow: 'hidden' }}>
          <LinearGradient
            colors={P.gradH}
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: SPACING.lg,
              paddingBottom: SPACING.xl,
            }}
          >
            <View style={{ alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: '800',
                  color: '#fff',
                  letterSpacing: -0.5,
                }}
              >
                {MONTHS[month]}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 2,
                }}
              >
                {year}
              </Text>
            </View>
            <Arc
              pct={pct}
              size={58}
              stroke={5}
              color={P.goldL}
              track="rgba(255,255,255,0.12)"
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: P.goldL }}>
                {pct}%
              </Text>
            </Arc>
          </LinearGradient>

          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              gap: 6,
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.md,
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                label: rp?.planDetailCompleted || 'Completed',
                color: P.greenL,
                bg: P.greenGlow,
                border: P.green + '44',
              },
              { label: rp?.planDetailToday || 'Today', color: '#fff', bg: P.blue, border: P.blueL },
              {
                label: rp?.planDetailUpcoming || 'Upcoming',
                color: P.goldL,
                bg: P.gold + '18',
                border: P.gold + '44',
              },
            ].map((l, i) => (
              <Pill key={i} {...l} />
            ))}
          </View>

          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              paddingHorizontal: SPACING.lg,
              paddingBottom: 4,
            }}
          >
            {DAY_HEADERS.map((d, i) => (
              <Text
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: '700',
                  color: P.textMuted,
                }}
              >
                {d}
              </Text>
            ))}
          </View>

          <View
            style={{
              paddingHorizontal: SPACING.md,
              paddingBottom: SPACING.md,
              gap: 4,
            }}
          >
            {weeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: isRtl ? 'row-reverse' : 'row', gap: 4 }}>
                {week.map((cell, di) => {
                  if (!cell)
                    return (
                      <View
                        key={`e${wi}${di}`}
                        style={{ width: CAL_CELL, height: CAL_CELL }}
                      />
                    );
                  const { date, planDay, isCompleted, isToday, isPlanDay } =
                    cell;
                  const isSel = selectedDay === planDay;
                  let bg = 'transparent',
                    nc = P.textMuted,
                    bc = 'transparent',
                    bw = 0;
                  if (isPlanDay && !isCompleted && !isToday) {
                    bg = P.gold + '14';
                    nc = P.goldL;
                    bc = P.gold + '40';
                    bw = 1;
                  }
                  if (isCompleted) {
                    bg = P.green + '20';
                    nc = P.greenL;
                    bc = P.green + '50';
                    bw = 1;
                  }
                  if (isToday) {
                    bg = P.blue;
                    nc = '#fff';
                    bc = P.blueL;
                    bw = 2;
                  }
                  if (isSel && !isToday) {
                    bc = P.goldL;
                    bw = 2;
                  }
                  return (
                    <TouchableOpacity
                      key={`${wi}${di}`}
                      onPress={() =>
                        planDay && setSelectedDay(isSel ? null : planDay)
                      }
                      disabled={!planDay}
                      activeOpacity={0.65}
                      style={{
                        width: CAL_CELL,
                        height: CAL_CELL,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: bg,
                        borderColor: bc,
                        borderWidth: bw,
                        borderRadius: 10,
                        shadowColor: isCompleted
                          ? P.green
                          : isToday
                            ? P.blue
                            : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4,
                        shadowRadius: 5,
                        elevation: isCompleted || isToday ? 3 : 0,
                      }}
                    >
                      {isCompleted && (
                        <View
                          style={{ position: 'absolute', top: 3, right: 3 }}
                        >
                          <CheckCircle2
                            size={9}
                            color={P.greenL}
                            strokeWidth={2.5}
                          />
                        </View>
                      )}
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isPlanDay || isToday ? '800' : '400',
                          color: nc,
                        }}
                      >
                        {date}
                      </Text>
                      {isPlanDay && planDay !== null && (
                        <Text
                          style={{
                            fontSize: 7,
                            fontWeight: '700',
                            color: isToday
                              ? 'rgba(255,255,255,0.6)'
                              : isCompleted
                                ? P.green + 'CC'
                                : P.gold + 'AA',
                          }}
                        >
                          D{planDay}
                        </Text>
                      )}
                      {isPlanDay && !isCompleted && (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isToday
                              ? 'rgba(255,255,255,0.75)'
                              : P.goldL,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Card>

        <Card
          P={P}
          style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 14 }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: isRtl ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 11, color: P.textSub }}>
                {(rp?.planDetailStarted || 'Started') + ' '}
                {fmt(planDetail.start_date!, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: P.goldL }}>
                {pct}%
              </Text>
            </View>
            <Bar pct={pct} color={P.blue} />
          </View>
          {(planDetail.estimated_days_to_complete ?? 0) > 0 && (
            <View
              style={[
                S.estBadge,
                { backgroundColor: P.blueGlow, borderColor: P.blue + '40' },
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: P.blueL,
                  textAlign: 'center',
                }}
              >
                {(rp?.planDetailEstLeft || '~{count}d\nleft').replace('{count}', String(planDetail.estimated_days_to_complete))}
              </Text>
            </View>
          )}
        </Card>

        <Card P={P} style={{ padding: 0, overflow: 'hidden' }}>
          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              padding: SPACING.lg,
            }}
          >
            <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: P.text,
                  letterSpacing: -0.2,
                  textAlign: isRtl ? 'right' : 'left',
                }}
              >
                {rp?.planDetailReadingSchedule || 'Reading Schedule'}
              </Text>
              <Text style={{ fontSize: 11, color: P.textMuted, marginTop: 2, textAlign: isRtl ? 'right' : 'left' }}>
                {(rp?.planDetailSessionsComplete || '{done} of {total} sessions complete')
                  .replace('{done}', String(completedDays.length))
                  .replace('{total}', String(total))}
              </Text>
            </View>
            <View
              style={[
                S.streakBadge,
                {
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  backgroundColor: P.gold + '18',
                  borderColor: P.gold + '40',
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <View style={{ alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: P.goldL,
                    lineHeight: 16,
                  }}
                >
                  {planDetail.streak}
                </Text>
                <Text
                  style={{ fontSize: 9, color: P.gold, letterSpacing: 0.5 }}
                >
                  {(rp?.planDetailStreak || 'STREAK').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Skeleton timeline while assignments load */}
          {assignmentsLoading ? (
            <View
              style={{
                paddingHorizontal: SPACING.lg,
                paddingBottom: SPACING.lg,
                gap: 16,
              }}
            >
              {[1, 2, 3, 4].map(i => (
                <View
                  key={i}
                  style={{
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <SkeletonBox
                    w={28}
                    h={28}
                    P={P}
                    style={{ borderRadius: 14, flexShrink: 0 }}
                  />
                  <View style={{ flex: 1, gap: 7 }}>
                    <SkeletonBox w="40%" h={10} P={P} />
                    <SkeletonBox w="70%" h={13} P={P} />
                    <SkeletonBox w="50%" h={10} P={P} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            assignments.map((a, idx) => {
              const planDate = new Date(planDetail.start_date!);
              planDate.setDate(planDate.getDate() + a.day - 1);
              const isLast = idx === assignments.length - 1;
              const isDone = completedSet.has(a.day);
              const isActive = a.day === currentDay;
              const isFutr = a.day > currentDay;
              const {
                correct,
                total: qTotal,
                pct: qPct,
              } = quizStats(a.quizQuestions ?? []);
              const nodeColor = isDone
                ? P.greenL
                : isActive
                  ? P.blueL
                  : P.textMuted;
              return (
                <TouchableOpacity
                  key={a.day}
                  activeOpacity={0.75}
                  onPress={() =>
                    setSelectedDay(selectedDay === a.day ? null : a.day)
                  }
                  style={[
                    {
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      paddingLeft: SPACING.lg,
                      paddingRight: SPACING.lg,
                      paddingTop: 12,
                    },
                    isDone && { backgroundColor: P.green + '08' },
                    isActive && { backgroundColor: P.blue + '0A' },
                  ]}
                >
                  <View
                    style={{
                      width: 28,
                      alignItems: 'center',
                      marginRight: isRtl ? 0 : 12,
                      marginLeft: isRtl ? 12 : 0,
                      flexShrink: 0,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDone
                          ? P.green + '22'
                          : isActive
                            ? P.blue + '22'
                            : P.surface,
                        borderWidth: 1.5,
                        borderColor: nodeColor + '88',
                        zIndex: 2,
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2
                          size={12}
                          color={nodeColor}
                          strokeWidth={2.5}
                        />
                      ) : isActive ? (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: nodeColor,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: P.textMuted + '60',
                          }}
                        />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={{
                          width: 1.5,
                          flex: 1,
                          marginTop: 3,
                          minHeight: 12,
                          backgroundColor: isDone ? P.green + '40' : P.border,
                        }}
                      />
                    )}
                  </View>
                  <View style={[{ flex: 1 }, !isLast && { paddingBottom: 14 }]}>
                    <View
                      style={{
                        flexDirection: isRtl ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: isDone
                            ? P.green
                            : isActive
                              ? P.blueL
                              : P.textMuted,
                        }}
                      >
                        {planDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      {isActive && !isDone && (
                        <Pill
                          label={rp?.planDetailToday || 'TODAY'}
                          color={P.blueL}
                          bg={P.blueGlow}
                          border={P.blue + '55'}
                          size={8}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        lineHeight: 19,
                        color: isFutr ? P.textMuted : P.text,
                        opacity: isFutr ? 0.6 : 1,
                        textAlign: isRtl ? 'right' : 'left',
                      }}
                    >
                      {a.title}
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: P.textMuted, marginTop: 2, textAlign: isRtl ? 'right' : 'left' }}
                      numberOfLines={1}
                    >
                      {(a.chapters ?? [])
                        .map(ch => `${ch.book} ${ch.chapter}`)
                        .join(' · ')}
                    </Text>
                    {isDone && qTotal > 0 && (
                      <View style={{ marginTop: 7 }}>
                        <View
                          style={[
                            S.quizBadge,
                            {
                              backgroundColor:
                                qPct === 100 ? P.green + '18' : P.gold + '14',
                              borderColor:
                                qPct === 100 ? P.green + '44' : P.gold + '44',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: qPct === 100 ? P.greenL : P.goldL,
                            }}
                          >
                            {correct}/{qTotal} {rp?.planDetailCorrect || 'correct'} · {qPct}%
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: SPACING.md }} />
        </Card>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // TAB: Stats
  // ─────────────────────────────────────────────────────────────────────
  const renderStats = () => {
    const completedAssignments = assignments.filter(a =>
      completedSet.has(a.day),
    );

    const activityData = [
      {
        label: rp?.planDetailStarted || 'Started',
        value: fmt(planDetail.start_date!, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      },
      {
        label: rp?.planDetailDaysElapsed || 'Days Elapsed',
        value: `${planDetail.days_since_started ?? 0} ${rp?.planDetailDaysLabel || 'days'}`,
      },
      {
        label: rp?.planDetailLastSession || 'Last Session',
        value: planDetail.last_completed_date
          ? fmt(planDetail.last_completed_date, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
      },
      {
        label: rp?.planDetailDaysInactive || 'Days Inactive',
        value: `${planDetail.days_since_last_activity ?? 0} ${rp?.planDetailDaysLabel || 'days'}`,
      },
      {
        label: rp?.planDetailAvgPace || 'Avg Pace',
        value: `${planDetail.avg_days_per_completion ?? '—'} ${rp?.planDetailDaysLabel || 'days'}/session`,
      },
      {
        label: rp?.planDetailEstToFinish || 'Est. to Finish',
        value:
          (planDetail.estimated_days_to_complete ?? 0) > 0
            ? (rp?.planDetailEstLeft || '~{count}d left').replace('{count}', String(planDetail.estimated_days_to_complete))
            : (rp?.planDetailAlmostDone || 'Almost done! 🎉'),
      },
    ];

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
      >
        <Card P={P}>
          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 20,
              marginBottom: SPACING.lg,
            }}
          >
            <Arc pct={pct} size={96} stroke={8} color={P.gold} track={P.border}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: P.goldL,
                  lineHeight: 22,
                }}
              >
                {pct}%
              </Text>
              <Text style={{ fontSize: 9, color: P.textMuted, textAlign: 'center' }}>
                {rp?.planDetailDone || 'done'}
              </Text>
            </Arc>
            <View style={{ flex: 1 }}>
              {[
                {
                  label: rp?.planDetailCompleted || 'Completed',
                  value: `${completedDays.length} / ${total} ${rp?.planDetailDaysLabel || 'days'}`,
                  color: P.text,
                },
                {
                  label: rp?.planDetailRemaining || 'Remaining',
                  value: `${remaining} ${rp?.planDetailDaysLabel || 'days'}`,
                  color: remaining === 0 ? P.greenL : P.gold,
                },
                {
                  label: rp?.planDetailStreak || 'Streak',
                  value: `🔥 ${planDetail.streak} ${rp?.planDetailDaysLabel || 'day'}${planDetail.streak !== 1 ? 's' : ''}`,
                  color: '#D8B4FE',
                },
              ].map((row, i, arr) => (
                <View
                  key={i}
                  style={[
                    S.infoRow,
                    i < arr.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: P.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, color: P.textSub }}>
                    {row.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: row.color,
                    }}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Bar pct={pct} color={P.gold} h={6} />
        </Card>

        {planDetail.questions_enabled &&
          planDetail.user_answered_questions > 0 &&
          (() => {
            const acc = Math.round(planDetail.quiz_accuracy_percentage);
            const accColor = acc >= 80 ? P.greenL : acc >= 50 ? P.gold : P.red;
            return (
              <Card P={P}>
                <SectionHead label={rp?.planDetailQuizPerformance || 'Quiz Performance'} P={P} />
                <View
                  style={{
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 18,
                    marginBottom: SPACING.lg,
                  }}
                >
                  <Arc
                    pct={planDetail.quiz_accuracy_percentage}
                    size={80}
                    stroke={7}
                    color={accColor}
                    track={P.border}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        color: accColor,
                      }}
                    >
                      {acc}%
                    </Text>
                  </Arc>
                  <View style={{ flex: 1 }}>
                    <InfoRow
                      label={rp?.planDetailCorrect || 'Correct'}
                      value={`${planDetail.user_correct_answers} / ${planDetail.user_answered_questions}`}
                      color={P.greenL}
                      subColor={P.textSub}
                      borderColor={P.border}
                    />
                    <InfoRow
                      label={(rp?.planDetailQuizResults || 'Quiz Results').split(' ')[0] || 'Answered'}
                      value={String(planDetail.user_answered_questions)}
                      color={P.text}
                      subColor={P.textSub}
                      borderColor={P.border}
                    />
                    <InfoRow
                      label={rp?.planDetailTotalQuestions || 'Total Qs'}
                      value={String(planDetail.total_quiz_questions)}
                      color={P.text}
                      subColor={P.textSub}
                      borderColor={P.border}
                      last
                    />
                  </View>
                </View>
                {completedAssignments.length > 0 && (
                  <>
                    <Text
                      style={{
                        fontSize: 11,
                        color: P.textMuted,
                        marginBottom: SPACING.sm,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        textAlign: isRtl ? 'right' : 'left',
                      }}
                    >
                      {rp?.planDetailByDay || 'By Day'}
                    </Text>
                    {completedAssignments.map(a => {
                      const {
                        correct,
                        total: qt,
                        pct: qp,
                      } = quizStats(a.quizQuestions ?? []);
                      if (qt === 0) return null;
                      const bc =
                        qp === 100 ? P.greenL : qp >= 50 ? P.gold : P.red;
                      return (
                        <View key={a.day} style={{ marginBottom: 10 }}>
                          <View
                            style={{
                              flexDirection: isRtl ? 'row-reverse' : 'row',
                              justifyContent: 'space-between',
                              marginBottom: 5,
                            }}
                          >
                            <Text
                              style={{ fontSize: 11, color: P.textSub, textAlign: isRtl ? 'right' : 'left' }}
                              numberOfLines={1}
                            >
                              {(rp?.planDetailDayLabel || 'Day {day}').replace('{day}', String(a.day))} — {a.title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: bc,
                              }}
                            >
                              {correct}/{qt}
                            </Text>
                          </View>
                          <Bar pct={qp} color={bc} h={4} />
                        </View>
                      );
                    })}
                  </>
                )}
              </Card>
            );
          })()}

        <Card P={P}>
          <SectionHead label={rp?.planDetailMilestones || 'Milestones'} P={P} />
          {milestones.map((m, i) => (
            <View
              key={m.pct}
              style={[
                S.infoRow,
                i < milestones.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: P.border,
                },
              ]}
            >
              <View
                style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}
              >
                <View
                  style={[
                    S.milestoneIcon,
                    { backgroundColor: m.achieved ? P.greenGlow : P.surface },
                  ]}
                >
                  {m.achieved ? (
                    <CheckCircle2 size={18} color={P.greenL} />
                  ) : (
                    <Target size={18} color={P.textMuted} />
                  )}
                </View>
                <View style={{ alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: m.achieved ? P.text : P.textMuted,
                      textAlign: isRtl ? 'right' : 'left',
                    }}
                  >
                    {m.pct}% — {(rp?.planDetailDayLabel || 'Day {day}').replace('{day}', String(m.day))}
                  </Text>
                  <Text style={{ fontSize: 11, color: P.textMuted, textAlign: isRtl ? 'right' : 'left' }}>
                    {rp?.planDetailOfLabel || 'of'} {total} {rp?.planDetailDaysLabel || 'days'}
                  </Text>
                </View>
              </View>
              {m.achieved ? (
                <Pill
                  label={rp?.planDetailDone || '✓ Done'}
                  color={P.greenL}
                  bg={P.greenGlow}
                  border={P.green + '44'}
                />
              ) : (
                <Text style={{ fontSize: 11, color: P.textMuted }}>
                  {(rp?.planDetailToGo || '{count} to go').replace('{count}', String(Math.max(m.day - completedDays.length, 0)))}
                </Text>
              )}
            </View>
          ))}
        </Card>

        <Card P={P}>
          <SectionHead label={rp?.planDetailActivity || 'Activity'} P={P} />
          {activityData.map((row, i) => (
            <InfoRow
              key={i}
              {...row}
              last={i === activityData.length - 1}
              color={P.text}
              subColor={P.textSub}
              borderColor={P.border}
            />
          ))}
        </Card>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // Drawer
  // ─────────────────────────────────────────────────────────────────────
  const renderDrawer = () => {
    if (!selectedDay || !selectedAssignment) return null;
    const isDone = completedSet.has(selectedDay);
    const {
      chapters,
      quizQuestions = [],
      reflectionQuestions = [],
    } = selectedAssignment;

    return (
      <Modal
        transparent
        animationType="none"
        visible
        onRequestClose={() => setSelectedDay(null)}
      >
        <TouchableOpacity
          style={S.drawerBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedDay(null)}
        />
        <Animated.View
          style={[
            S.drawer,
            {
              backgroundColor: P.surface,
              transform: [{ translateY: drawerY }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setSelectedDay(null)}
            style={{ alignItems: 'center', paddingVertical: 8 }}
          >
            <View style={[S.drawerHandle, { backgroundColor: P.border }]} />
          </TouchableOpacity>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={[S.drawerHeader, { borderBottomColor: P.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: P.textMuted,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 3,
                    textAlign: isRtl ? 'right' : 'left',
                  }}
                >
                  {(rp?.planDetailDayLabel || 'Day {day}').replace('{day}', String(selectedDay))}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: P.text,
                    lineHeight: 24,
                    textAlign: isRtl ? 'right' : 'left',
                  }}
                >
                  {selectedAssignment.title}
                </Text>
              </View>
              <Pill
                label={isDone ? (rp?.planDetailDone || '✓ Done') : (rp?.planDetailInProgress || 'In Progress')}
                color={isDone ? P.greenL : P.blueL}
                bg={isDone ? P.greenGlow : P.blueGlow}
                border={(isDone ? P.green : P.blue) + '44'}
                size={11}
              />
            </View>

            <View style={S.drawerSection}>
              <Text style={[S.drawerSecTitle, { color: P.textMuted, textAlign: isRtl ? 'right' : 'left' }]}>
                {rp?.planDetailChapters || 'Chapters'}
              </Text>
              <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                {chapters.map((ch, i) => (
                  <View
                    key={i}
                    style={[
                      S.chapterPill,
                      {
                        flexDirection: isRtl ? 'row-reverse' : 'row',
                        backgroundColor: P.gold + '14',
                        borderColor: P.gold + '33',
                      },
                    ]}
                  >
                    <BookOpen size={12} color={P.goldL} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: P.goldL,
                      }}
                    >
                      {ch.book} {ch.chapter}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {quizQuestions.length > 0 && (
              <View style={S.drawerSection}>
                <Text style={[S.drawerSecTitle, { color: P.textMuted, textAlign: isRtl ? 'right' : 'left' }]}>
                  {rp?.planDetailQuizResults || 'Quiz Results'}
                </Text>
                {quizQuestions.map(q => {
                  const answered = q.isCorrect !== null;
                  return (
                    <View
                      key={q.questionId}
                      style={[
                        S.quizCard,
                        {
                          backgroundColor: !answered
                            ? P.surface
                            : q.isCorrect
                              ? P.greenGlow
                              : 'rgba(224,80,80,0.1)',
                          borderColor: !answered
                            ? P.border
                            : (q.isCorrect ? P.green : P.red) + '44',
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: isRtl ? 'row-reverse' : 'row',
                          gap: 8,
                          marginBottom: 5,
                        }}
                      >
                        {answered ? (
                          q.isCorrect ? (
                            <CheckCircle2 size={15} color={P.greenL} />
                          ) : (
                            <Circle size={15} color={P.red} />
                          )
                        ) : (
                          <HelpCircle size={15} color={P.textMuted} />
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: P.text,
                            flex: 1,
                            textAlign: isRtl ? 'right' : 'left',
                          }}
                        >
                          {q.question}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          paddingLeft: isRtl ? 0 : 23,
                          paddingRight: isRtl ? 23 : 0,
                          color: !answered
                            ? P.textMuted
                            : q.isCorrect
                              ? P.greenL
                              : P.red,
                          textAlign: isRtl ? 'right' : 'left',
                        }}
                      >
                        {!answered
                          ? (rp?.planDetailNotAnswered || 'Not answered yet')
                          : q.isCorrect
                            ? (rp?.planDetailCorrect || 'Correct')
                            : `${rp?.planDetailIncorrect || 'Incorrect'} — "${q.options[q.correctAnswer]}"`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {reflectionQuestions.length > 0 && (
              <View style={S.drawerSection}>
                <Text style={[S.drawerSecTitle, { color: P.textMuted, textAlign: isRtl ? 'right' : 'left' }]}>
                  {rp?.planDetailReflection || 'Reflection'}
                </Text>
                {reflectionQuestions.map((q, i) => (
                  <View
                    key={i}
                    style={[
                      S.reflectionRow,
                      { borderLeftColor: P.gold + '66' },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: P.textSub,
                        fontStyle: 'italic',
                        lineHeight: 18,
                        textAlign: isRtl ? 'right' : 'left',
                      }}
                    >
                      {q}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!isDone && (
              <TouchableOpacity
                style={[S.readBtn, { backgroundColor: P.blue, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  setSelectedDay(null);
                  navigation.navigate('DailyReading', {
                    planId,
                    day: selectedDay,
                    totalDays: planDetail.total_days,
                  });
                }}
                activeOpacity={0.85}
              >
                <BookOpen size={16} color="white" />
                <Text
                  style={{ fontSize: 14, fontWeight: '700', color: 'white' }}
                >
                  {rp?.planDetailStartReading || 'Start Reading'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // Root render
  // ─────────────────────────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'list', label: rp?.planDetailDays || 'Days', Icon: List },
    { key: 'calendar', label: rp?.planDetailCalendar || 'Calendar', Icon: CalendarDays },
    { key: 'stats', label: rp?.planDetailStats || 'Stats', Icon: BarChart2 },
  ];

  return (
    <View style={[S.container, { backgroundColor: P.bg }]}>
      <StatusBar barStyle="light-content" />

      <ActionHeader
        title={planDetail.title}
        subtitle={planDetail.description}
        onPress={() => navigation.goBack()}
      />

      {/* ── Stats strip ── */}
      <View
        style={[
          S.statsStrip,
          { backgroundColor: P.surface, borderBottomColor: P.border },
        ]}
      >
        <View style={[S.statsProgressRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View style={[S.statsTrack, { backgroundColor: P.border }]}>
            <Animated.View
              style={[
                S.statsFill,
                {
                  width: `${pct}%` as any,
                  backgroundColor: P.gold,
                },
              ]}
            />
          </View>
          <Text style={[S.statsPct, { color: P.gold }]}>{pct}%</Text>
        </View>

        <View style={[S.chipsRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          {[
            { num: `${completedDays.length}/${total}`, label: rp?.planDetailDaysDone || 'Days Done' },
            { num: `🔥 ${planDetail.streak}`, label: rp?.planDetailStreak || 'Streak' },
            {
              num: `${Math.round(planDetail.quiz_accuracy_percentage)}%`,
              label: rp?.planDetailQuiz || 'Quiz',
            },
            { num: planDetail.difficulty, label: rp?.planDetailLevel || 'Level' },
          ].map((chip, i, arr) => (
            <React.Fragment key={i}>
              <View style={S.chip}>
                <Text style={[S.chipNum, { color: P.text }]}>{chip.num}</Text>
                <Text style={[S.chipLabel, { color: P.textMuted }]}>
                  {chip.label}
                </Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[S.chipDivider, { backgroundColor: P.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View
        style={[
          S.tabs,
          { backgroundColor: P.surface, borderBottomColor: P.border },
        ]}
      >
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.7}
              style={[
                S.tabBtn,
                active && { borderBottomWidth: 2, borderBottomColor: P.gold },
              ]}
            >
              <Icon size={15} color={active ? P.gold : P.textMuted} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: active ? P.gold : P.textMuted,
                  marginTop: 2,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'list' && (
          <FlatList
            data={Array.from({ length: total }, (_, i) => i + 1)}
            renderItem={renderDayItem}
            keyExtractor={String}
            contentContainerStyle={{
              padding: SPACING.md,
              paddingBottom: SPACING.xxxl,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
        {activeTab === 'calendar' && (
          <View
            style={{
              flex: 1,
              paddingHorizontal: SPACING.md,
              paddingTop: SPACING.md,
            }}
          >
            {renderCalendar()}
          </View>
        )}
        {activeTab === 'stats' && (
          <View
            style={{
              flex: 1,
              paddingHorizontal: SPACING.md,
              paddingTop: SPACING.md,
            }}
          >
            {renderStats()}
          </View>
        )}
      </View>

      {renderDrawer()}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stylesheet
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsStrip: {
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  statsProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.sm,
  },
  statsTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  statsFill: {
    height: '100%',
    borderRadius: 2,
  },
  statsPct: {
    fontSize: 12,
    fontWeight: '700',
    width: 34,
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flex: 1,
    alignItems: 'center',
  },
  chipNum: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  chipDivider: {
    width: 1,
    height: 24,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sectionHead: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  pillText: { fontWeight: '700', letterSpacing: 0.5 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayTitle: { fontSize: 14, fontWeight: '600' },
  milestoneIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 52,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quizBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.75,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerHandle: { width: 36, height: 4, borderRadius: 2 },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
  },
  drawerSection: { marginBottom: SPACING.lg },
  drawerSecTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  chapterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  quizCard: { borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1 },
  reflectionRow: { borderLeftWidth: 2, paddingLeft: 12, marginBottom: 8 },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
});

// src/screens/reading-plans/BibleReadingPlansScreen.tsx
import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../../common/AppContext';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import {
  BookOpen,
  Flame,
  ChevronRight,
  Play,
  Eye,
  CheckCircle,
  LayoutList,
  TrendingUp,
  Trash2,
  Trophy,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import BottomTab from '../../component/navigations/BottomTab';
import ProgressCircle from './ProgressCircle';
import { sendPostRequest } from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import { displayCustomTestNotification } from '../../utilits/firebaseService';
import ActionModal from '../../reusable/ActionModal';
import ActionHeader from '../../reusable/ActionHeader';

// ─────────────────────────────────────────────────────────────────────────────

interface ReadingPlan {
  planId: string;
  title: string;
  description: string;
  totalDays: number;
  questionsEnabled: boolean;
  category: string;
  difficulty: string;
  isActive: boolean;
}

interface UserProgress {
  planId: string;
  startDate: string;
  completedDaysJson: string;
  lastCompletedDate: string | null;
  streak: number;
  isCompleted: boolean;
  completedDate: string | null;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Beginner',
  medium: 'Intermediate',
  hard: 'Advanced',
};

const DIFFICULTY_COLOR: Record<string, { light: string; dark: string }> = {
  easy: { light: '#059669', dark: '#34D399' },
  medium: { light: '#D97706', dark: '#FBBF24' },
  hard: { light: '#DC2626', dark: '#F87171' },
};

type Tab = 'progress' | 'browse';

// ─────────────────────────────────────────────────────────────────────────────

export default function BibleReadingPlan() {
  const navigation = useNavigation<any>();
  const { isDark } = useContext(AppContext)!;
  const C = getColors(isDark);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);

  // All started plans (active + completed)
  const [myPlans, setMyPlans] = useState<ReadingPlan[]>([]);
  // Only in-progress — used for tab badge
  const [activePlans, setActivePlans] = useState<ReadingPlan[]>([]);

  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>(
    {},
  );
  const [refreshing, setRefreshing] = useState(false);

  const [startPlanModalVisible, setStartPlanModalVisible] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<ReadingPlan | null>(null);
  const [removePlanModalVisible, setRemovePlanModalVisible] = useState(false);
  const [planToRemove, setPlanToRemove] = useState<ReadingPlan | null>(null);

  // ── API ───────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await getAllReadingPlans();
    } finally {
      setRefreshing(false);
    }
  };

  const loadData = async (load: boolean = true) => {
    setLoading(load);
    try {
      await getAllReadingPlans();
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const getAllReadingPlans = async () => {
    try {
      const response = await sendPostRequest('reading-plans', 'get-all', {});
      const { returnData, returnCode, returnMessage } = response;

      if (returnCode === 200) {
        setPlans(returnData);
        console.log('Reading Plans Response here:', JSON.stringify(response));

        const buildCompletedDaysJson = (p: any): string => {
          if (p.completedDaysJson) return p.completedDaysJson;
          if (typeof p.progress === 'number' && p.progress > 0)
            return JSON.stringify(
              Array.from({ length: p.progress }, (_, i) => i + 1),
            );
          return '[]';
        };

        // All started plans — both active AND completed
        const started = returnData.filter((p: any) => p.started);
        setMyPlans(started);

        // Only in-progress — for badge count
        setActivePlans(
          returnData.filter((p: any) => p.started && !p.completed),
        );

        const progressArray: UserProgress[] = started.map((p: any) => ({
          planId: p.planId,
          startDate: p.startDate || new Date().toISOString(),
          completedDaysJson: buildCompletedDaysJson(p),
          lastCompletedDate: p.lastCompletedDate || null,
          streak: p.streak || 0,
          isCompleted: p.completed || false,
          completedDate: p.completedDate || null,
        }));

        setUserProgress(progressArray);

        const map: Record<string, UserProgress> = {};
        progressArray.forEach(pr => (map[pr.planId] = pr));
        setProgressMap(map);
      } else {
        console.warn('Failed to load reading plans:', returnMessage);
      }
    } catch (err) {
      console.error('Failed to load reading plans', err);
    }
  };

  const startPlan = async (plan: ReadingPlan) => {
    try {
      const response = await sendPostRequest('reading-plans', 'start', {
        planId: plan.planId,
      });
      const { returnCode, returnMessage } = response;
      if (returnCode === 200) {
        showToast('success', 'Reading plan started successfully!');
        setTimeout(() => {
          displayCustomTestNotification(
            'Reading Plan Started',
            `You have started "${plan.title}". Let's build that habit!`,
          );
        }, 500);
        await loadData();
        setActiveTab('progress');
      } else {
        showToast('error', returnMessage || 'Failed to start reading plan');
      }
    } catch (error) {
      console.error('Error starting plan:', error);
      showToast('error', 'Failed to start reading plan');
    }
  };

  const removePlan = async (plan: ReadingPlan) => {
    try {
      const response = await sendPostRequest('reading-plans', 'remove', {
        planId: plan.planId,
      });
      const { returnCode, returnMessage } = response;
      if (returnCode === 200) {
        showToast('success', 'Reading plan removed.');
        await loadData(false);
      } else {
        showToast('error', returnMessage || 'Failed to remove reading plan');
      }
    } catch (error) {
      console.error('Error removing plan:', error);
      showToast('error', 'Failed to remove reading plan');
    }
  };

  const getCompletedDays = (pr: UserProgress): number[] => {
    try {
      return pr.completedDaysJson ? JSON.parse(pr.completedDaysJson) : [];
    } catch {
      return [];
    }
  };

  // ── Tab: My Progress ──────────────────────────────────────────────────────────

  const renderProgressTab = () => {
    if (!myPlans.length) {
      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
        >
          <View
            style={[
              s.emptyBox,
              { backgroundColor: C.cardBackground, borderColor: C.border },
            ]}
          >
            <View style={[s.emptyIcon, { backgroundColor: C.primary + '15' }]}>
              <BookOpen size={26} color={C.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: C.text }]}>
              No active plan yet
            </Text>
            <Text style={[s.emptySub, { color: C.muted }]}>
              Head over to Browse Plans and start your first reading plan.
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: C.primary }]}
              onPress={() => setActiveTab('browse')}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBtnText}>Browse Plans</Text>
              <ChevronRight size={15} color="white" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    const inProgress = myPlans.filter(p => !progressMap[p.planId]?.isCompleted);
    const completed = myPlans.filter(p => progressMap[p.planId]?.isCompleted);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* In-progress plans */}
        {inProgress.map(plan => {
          const pr = progressMap[plan.planId];
          const done = pr ? getCompletedDays(pr) : [];
          const pct = Math.round((done.length / plan.totalDays) * 100);
          const streak = pr?.streak || 0;
          const nextDay =
            done.length > 0
              ? Math.min(Math.max(...done) + 1, plan.totalDays)
              : 1;
          const lastDay = done.length > 0 ? Math.max(...done) : null;

          return (
            <ActivePlanCard
              key={plan.planId}
              plan={plan}
              pct={pct}
              done={done.length}
              streak={streak}
              nextDay={nextDay}
              lastDay={lastDay}
              isCompleted={false}
              C={C}
              isDark={isDark}
              onRead={() =>
                navigation.navigate(route.dailyReading, {
                  planId: plan.planId,
                  day: nextDay,
                })
              }
              onSummary={() =>
                navigation.navigate(route.planDetail, { planId: plan.planId })
              }
              onRemove={() => {
                setPlanToRemove(plan);
                setRemovePlanModalVisible(true);
              }}
            />
          );
        })}

        {/* Completed plans section */}
        {completed.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Trophy size={14} color="#10B981" />
              <Text style={[s.sectionHeaderText, { color: C.muted }]}>
                Completed Plans
              </Text>
            </View>

            {completed.map(plan => {
              const pr = progressMap[plan.planId];
              const done = pr ? getCompletedDays(pr) : [];
              const streak = pr?.streak || 0;
              const lastDay =
                done.length > 0 ? Math.max(...done) : plan.totalDays;

              return (
                <ActivePlanCard
                  key={plan.planId}
                  plan={plan}
                  pct={100}
                  done={done.length || plan.totalDays}
                  streak={streak}
                  nextDay={1}
                  lastDay={lastDay}
                  isCompleted={true}
                  C={C}
                  isDark={isDark}
                  onRead={() =>
                    navigation.navigate(route.dailyReading, {
                      planId: plan.planId,
                      day: 1,
                    })
                  }
                  onSummary={() =>
                    navigation.navigate(route.planDetail, {
                      planId: plan.planId,
                    })
                  }
                  onRemove={() => {
                    setPlanToRemove(plan);
                    setRemovePlanModalVisible(true);
                  }}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    );
  };

  // ── Tab: Browse Plans ─────────────────────────────────────────────────────────

  const renderBrowseTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.scroll}
    >
      <Text style={[s.browseHint, { color: C.muted }]}>
        Choose a plan that fits your spiritual journey
      </Text>

      {plans.map(plan => {
        const pr = userProgress.find(p => p.planId === plan.planId);
        const hasStarted = !!pr;
        const isCompleted = pr?.isCompleted || false;
        const isActive = activePlans.some(p => p.planId === plan.planId);
        const done = pr ? getCompletedDays(pr) : [];
        const pct = hasStarted
          ? Math.round((done.length / plan.totalDays) * 100)
          : 0;

        return (
          <BrowsePlanCard
            key={plan.planId}
            plan={plan}
            isActive={isActive}
            hasStarted={hasStarted}
            isCompleted={isCompleted}
            done={done.length}
            pct={pct}
            C={C}
            isDark={isDark}
            onPress={() => {
              if (hasStarted) {
                navigation.navigate(route.planDetail, { planId: plan.planId });
              } else {
                setPendingPlan(plan);
                setStartPlanModalVisible(true);
              }
            }}
          />
        );
      })}
    </ScrollView>
  );

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      <ActionHeader
        title="Reading Plans"
        subtitle="Build a daily Bible habit"
      />

      {/* Tab row — sits flush below the header */}
      <View
        style={[
          s.tabRow,
          { backgroundColor: C.cardBackground, borderBottomColor: C.border },
        ]}
      >
        <TabButton
          label="My Progress"
          icon={
            <TrendingUp
              size={14}
              color={activeTab === 'progress' ? C.primary : C.muted}
            />
          }
          active={activeTab === 'progress'}
          badge={activePlans.length || undefined}
          onPress={() => setActiveTab('progress')}
          C={C}
        />
        <TabButton
          label="Browse Plans"
          icon={
            <LayoutList
              size={14}
              color={activeTab === 'browse' ? C.primary : C.muted}
            />
          }
          active={activeTab === 'browse'}
          onPress={() => setActiveTab('browse')}
          C={C}
        />
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[s.loaderText, { color: C.muted }]}>Loading…</Text>
        </View>
      ) : (
        <View style={s.content}>
          {activeTab === 'progress' ? renderProgressTab() : renderBrowseTab()}
        </View>
      )}

      <ActionModal
        visible={startPlanModalVisible}
        title="Start Reading Plan"
        message={
          pendingPlan
            ? `Do you want to start "${pendingPlan.title}"? This will set your daily reading schedule and track your progress.`
            : 'Are you sure you want to start this reading plan?'
        }
        severity="info"
        confirmLabel="Start Plan"
        onCancel={() => {
          setStartPlanModalVisible(false);
          setPendingPlan(null);
        }}
        onConfirm={async () => {
          if (!pendingPlan) return;
          setStartPlanModalVisible(false);
          const plan = pendingPlan;
          setPendingPlan(null);
          await startPlan(plan);
        }}
      />

      <ActionModal
        visible={removePlanModalVisible}
        title="Remove Plan"
        message={
          planToRemove
            ? `Are you sure you want to remove "${planToRemove.title}"? Your progress will be lost.`
            : 'Are you sure you want to remove this plan?'
        }
        severity="warning"
        confirmLabel="Remove"
        cancelLabel="Keep It"
        onCancel={() => {
          setRemovePlanModalVisible(false);
          setPlanToRemove(null);
        }}
        onConfirm={async () => {
          if (!planToRemove) return;
          setRemovePlanModalVisible(false);
          const plan = planToRemove;
          setPlanToRemove(null);
          await removePlan(plan);
        }}
      />

      <BottomTab activeTab="Plan" setActiveTab={() => {}} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TabButton({
  label,
  icon,
  active,
  badge,
  onPress,
  C,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number;
  onPress: () => void;
  C: ReturnType<typeof getColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        s.tabBtn,
        active && [s.tabBtnActive, { borderBottomColor: C.primary }],
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {icon}
      <Text style={[s.tabBtnText, { color: active ? C.primary : C.muted }]}>
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View style={[s.tabBadge, { backgroundColor: C.primary }]}>
          <Text style={[s.tabBadgeText, { color: C.white }]}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ActivePlanCard({
  plan,
  pct,
  done,
  streak,
  nextDay,
  lastDay,
  isCompleted,
  C,
  isDark,
  onRead,
  onSummary,
  onRemove,
}: {
  plan: ReadingPlan;
  pct: number;
  done: number;
  streak: number;
  nextDay: number;
  lastDay: number | null;
  isCompleted: boolean;
  C: ReturnType<typeof getColors>;
  isDark: boolean;
  onRead: () => void;
  onSummary: () => void;
  onRemove: () => void;
}) {
  const accentColor = isCompleted ? '#10B981' : C.primary;

  return (
    <View
      style={[
        s.activeCard,
        { backgroundColor: C.cardBackground, borderColor: accentColor + '55' },
      ]}
    >
      <View style={[s.activeStripe, { backgroundColor: accentColor }]} />

      <View style={s.activeTop}>
        <View style={s.activeTitleWrap}>
          <View style={s.activeTitleRow}>
            <Text
              style={[s.activePlanTitle, { color: C.text }]}
              numberOfLines={2}
            >
              {plan.title}
            </Text>
            {isCompleted && (
              <View style={s.completedPill}>
                <Trophy size={10} color="#10B981" />
                <Text style={s.completedPillText}>Done</Text>
              </View>
            )}
          </View>
          <Text style={[s.activePlanSub, { color: C.muted }]}>
            {done} of {plan.totalDays} days done
          </Text>
          <TouchableOpacity
            style={[
              s.removeBtn,
              {
                backgroundColor: C.error + '18',
                borderColor: C.error + '45',
                marginTop: SPACING.sm,
              },
            ]}
            onPress={onRemove}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Trash2 size={14} color={C.error} />
          </TouchableOpacity>
        </View>
        <View style={s.activeTopRight}>
          <ProgressCircle
            percent={pct}
            color={accentColor}
            backgroundColor={C.border}
            size={68}
          />
        </View>
      </View>

      <View style={[s.activeBarTrack, { backgroundColor: C.border }]}>
        <View
          style={[
            s.activeBarFill,
            { width: `${pct}%`, backgroundColor: accentColor },
          ]}
        />
      </View>
      <Text
        style={[s.activeBarLabel, { color: C.muted, marginBottom: SPACING.lg }]}
      >
        {pct}% complete
      </Text>

      <View
        style={[
          s.statsRow,
          { backgroundColor: isDark ? C.border + 'AA' : C.border + '60' },
        ]}
      >
        <StatChip
          icon={<Flame size={13} color={C.warning} />}
          value={`${streak}d`}
          label="Streak"
          C={C}
        />
        <View style={[s.statsDivider, { backgroundColor: C.border }]} />
        <StatChip
          icon={<CheckCircle size={13} color={C.success} />}
          value={String(done)}
          label="Done"
          C={C}
        />
        <View style={[s.statsDivider, { backgroundColor: C.border }]} />
        <StatChip
          icon={<BookOpen size={13} color={C.muted} />}
          value={lastDay ? `Day ${lastDay}` : '—'}
          label="Last read"
          C={C}
        />
      </View>

      {isCompleted ? (
        // Completed: View Summary + Revisit side by side
        <View style={s.ctaRow}>
          <TouchableOpacity
            style={[s.ctaOutline, s.ctaHalf, { borderColor: accentColor }]}
            onPress={onSummary}
            activeOpacity={0.8}
          >
            <Eye size={15} color={accentColor} />
            <Text style={[s.ctaOutlineText, { color: accentColor }]}>
              Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.ctaSolid,
              s.ctaHalf,
              {
                backgroundColor: accentColor + '18',
                borderColor: accentColor + '55',
                borderWidth: 1,
              },
            ]}
            onPress={onRead}
            activeOpacity={0.8}
          >
            <Play size={14} color={accentColor} fill={accentColor} />
            <Text style={[s.ctaSolidText, { color: accentColor }]}>
              Revisit
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // In-progress: Continue reading
        <TouchableOpacity
          style={[
            s.ctaSolid,
            {
              backgroundColor: C.background + '80',
              borderColor: C.primary + '80',
            },
          ]}
          onPress={onRead}
          activeOpacity={0.85}
        >
          <Play size={14} color={C.text} fill={C.text} />
          <Text style={[s.ctaSolidText, { color: C.text }]}>
            {done === 0 ? 'Begin Day 1' : `Continue · Day ${nextDay}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatChip({
  icon,
  value,
  label,
  C,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  C: ReturnType<typeof getColors>;
}) {
  return (
    <View style={s.statChip}>
      {icon}
      <Text style={[s.statChipValue, { color: C.text }]}>{value}</Text>
      <Text style={[s.statChipLabel, { color: C.muted }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BrowsePlanCard({
  plan,
  isActive,
  hasStarted,
  isCompleted,
  done,
  pct,
  C,
  isDark,
  onPress,
}: {
  plan: ReadingPlan;
  isActive: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  done: number;
  pct: number;
  C: ReturnType<typeof getColors>;
  isDark: boolean;
  onPress: () => void;
}) {
  const diffColor =
    DIFFICULTY_COLOR[plan.difficulty]?.[isDark ? 'dark' : 'light'] ?? C.muted;

  return (
    <TouchableOpacity
      style={[
        s.browseCard,
        {
          backgroundColor: C.cardBackground,
          borderColor: isActive || isCompleted ? C.primary + '55' : C.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {(isActive || isCompleted) && (
        <View
          style={[
            s.browseStripe,
            { backgroundColor: isCompleted ? '#10B981' : C.primary },
          ]}
        />
      )}

      <View style={s.browseRow}>
        <View
          style={[
            s.browseIconBox,
            {
              backgroundColor:
                C.primary + (isActive || isCompleted ? '20' : '12'),
            },
          ]}
        >
          <BookOpen size={17} color={C.primary} />
        </View>

        <View style={s.browseText}>
          <View style={s.browseTitleRow}>
            <Text style={[s.browseTitle, { color: C.text }]} numberOfLines={1}>
              {plan.title}
            </Text>
            {isCompleted && (
              <View style={[s.activePill, { backgroundColor: '#10B981' }]}>
                <Text style={s.activePillText}>✓ Done</Text>
              </View>
            )}
            {isActive && !isCompleted && (
              <View style={[s.activePill, { backgroundColor: C.primary }]}>
                <Text style={s.activePillText}>Active</Text>
              </View>
            )}
          </View>

          <Text style={[s.browseDesc, { color: C.muted }]} numberOfLines={2}>
            {plan.description}
          </Text>

          <View style={s.browseMeta}>
            <Text style={[s.metaItem, { color: C.muted }]}>
              {plan.totalDays} days
            </Text>
            <Text style={[s.metaDot, { color: C.muted }]}>·</Text>
            <Text style={[s.metaItem, { color: diffColor }]}>
              {DIFFICULTY_LABEL[plan.difficulty] ?? plan.difficulty}
            </Text>
            {plan.questionsEnabled && (
              <>
                <Text style={[s.metaDot, { color: C.muted }]}>·</Text>
                <Text style={[s.metaItem, { color: C.muted }]}>Q&A</Text>
              </>
            )}
          </View>

          {hasStarted && (
            <View style={s.browseProgress}>
              <View
                style={[s.browseProgressTrack, { backgroundColor: C.border }]}
              >
                <View
                  style={[
                    s.browseProgressFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: isCompleted ? '#10B981' : C.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[s.browseProgressLabel, { color: C.muted }]}>
                {done}/{plan.totalDays} · {pct}%
              </Text>
            </View>
          )}
        </View>

        <ChevronRight size={17} color={C.muted} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, marginBottom: 80 },

  // ── Tab row ────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md + 2,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  tabBtnTextActive: {},
  tabBtnTextInactive: {},
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800' },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loaderText: { fontSize: FONT_SIZES.sm },

  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 32,
  },
  scrollEmpty: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 32,
    flex: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  browseHint: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },

  emptyBox: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', marginBottom: 6 },
  emptySub: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyBtnText: { color: 'white', fontSize: FONT_SIZES.sm, fontWeight: '700' },

  activeCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  activeStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  activeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  activeTitleWrap: { flex: 1, marginRight: SPACING.md },
  activeTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  activeTopRight: { alignItems: 'center', gap: SPACING.sm },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePlanTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
    flex: 1,
  },
  activePlanSub: { fontSize: FONT_SIZES.sm },

  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B98118',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 2,
    flexShrink: 0,
  },
  completedPillText: { fontSize: 10, fontWeight: '800', color: '#10B981' },

  activeBarTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  activeBarFill: { height: '100%', borderRadius: 2 },
  activeBarLabel: { fontSize: FONT_SIZES.xs },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statsDivider: { width: 1, height: 28, marginHorizontal: SPACING.md },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statChipValue: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  statChipLabel: { fontSize: FONT_SIZES.xs },

  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaHalf: { flex: 1 },
  ctaSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md + 3,
  },
  ctaSolidText: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  ctaOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md + 3,
    borderWidth: 1.5,
  },
  ctaOutlineText: { fontSize: FONT_SIZES.md, fontWeight: '700' },

  browseCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  browseStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  browseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  browseIconBox: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  browseText: { flex: 1 },
  browseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 3,
  },
  browseTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', flex: 1 },
  activePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  activePillText: { color: 'white', fontSize: 10, fontWeight: '800' },
  browseDesc: { fontSize: FONT_SIZES.sm, lineHeight: 19, marginBottom: 7 },
  browseMeta: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { fontSize: 12, fontWeight: '500' },
  metaDot: { marginHorizontal: 5, fontSize: 12 },
  browseProgress: { marginTop: 8 },
  browseProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  browseProgressFill: { height: '100%', borderRadius: 2 },
  browseProgressLabel: { fontSize: 11, fontWeight: '500' },
});

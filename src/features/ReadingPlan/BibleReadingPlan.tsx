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
import { cacheAllPlans, getCachedAllPlans, cacheUserPlans, getCachedUserPlans } from './readingPlanCache';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';

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
  const { translations, language } = useLanguage();
  const rp = translations?.readingPlan;
  const isRtl = isRtlLanguage(language);
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
      // Fetch both all plans AND user's started plans (like web does)
      const [allResponse, userResponse] = await Promise.all([
        sendPostRequest('reading-plans', 'get-all', {}),
        sendPostRequest('reading-plans', 'get-user-plans', {}),
      ]);

      console.log('Get All Reading Plans response:', JSON.stringify(allResponse));
      console.log('Get User Plans response:', JSON.stringify(userResponse));
      
      const { returnData, returnCode, returnMessage } = allResponse;

      if (returnCode === 200) {
        const plans = returnData.plans || [];
        setPlans(plans);
        cacheAllPlans(plans);
        
        // Build user progress from get-user-plans response
        let userProgressMap: Record<string, UserProgress> = {};
        let startedPlans: ReadingPlan[] = [];
        
        if (userResponse.returnCode === 200 && Array.isArray(userResponse.returnData)) {
          const userPlansData = userResponse.returnData;
          
          userPlansData.forEach((up: any) => {
            const plan = plans.find((p: any) => p.planId === up.planId);
            if (plan) {
              // Mark this plan as started
              startedPlans.push({ ...plan, isStarted: true });
              
              // Build progress map
              userProgressMap[up.planId] = {
                planId: up.planId,
                startDate: up.startDate || new Date().toISOString(),
                completedDaysJson: JSON.stringify(Array.from({ length: up.completedDays || 0 }, (_, i) => i + 1)),
                lastCompletedDate: up.lastCompletedDate || null,
                streak: up.streak || 0,
                isCompleted: up.isCompleted || false,
                completedDate: up.completedDate || null,
              };
            }
          });
        }
        
        setMyPlans(startedPlans);

        // Active (in-progress) plans - not completed
        const active = startedPlans.filter((p: any) => !userProgressMap[p.planId]?.isCompleted);
        setActivePlans(active);

        setUserProgress(Object.values(userProgressMap));
        setProgressMap(userProgressMap);
        cacheUserPlans({ startedPlans, userProgressMap, active });
      } else {
        console.warn('Failed to load reading plans:', returnMessage);
      }
    } catch (err) {
      console.error('Failed to load reading plans', err);
      // Offline fallback
      try {
        const cached = await getCachedAllPlans();
        if (cached) setPlans(cached);
        const cachedUser = await getCachedUserPlans();
        if (cachedUser) {
          setMyPlans(cachedUser.startedPlans);
          setActivePlans(cachedUser.active);
          setProgressMap(cachedUser.userProgressMap);
          setUserProgress(Object.values(cachedUser.userProgressMap));
        }
      } catch {}
    }
  };

  const startPlan = async (plan: ReadingPlan) => {
    try {
      const response = await sendPostRequest('reading-plans', 'start', {
        planId: plan.planId,
      }, undefined, true);

      console.log('Start Plan response:', JSON.stringify(response));
      const { returnCode, returnMessage, returnData } = response;
      if (returnCode === 200) {
        // Check if this is new or existing progress
        if (returnMessage && returnMessage.includes('already')) {
          showToast('info', 'You have existing progress in this plan.');
        } else {
          showToast('success', 'Reading plan started successfully!');
          setTimeout(() => {
            displayCustomTestNotification(
              'Reading Plan Started',
              `You have started "${plan.title}". Let's build that habit!`,
            );
          }, 500);
        }
        await loadData();
        setActiveTab('progress');
      } else if (returnCode === 202) {
        showToast('success', 'Reading plan will start when online');
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
      }, undefined, true);
      const { returnCode, returnMessage } = response;
      if (returnCode === 200) {
        showToast('success', 'Reading plan removed.');
        await loadData(false);
      } else if (returnCode === 202) {
        showToast('success', 'Will remove plan when online');
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
              {rp?.bpNoActivePlan || 'No active plan yet'}
            </Text>
            <Text style={[s.emptySub, { color: C.muted }]}>
              {rp?.bpNoActivePlanSub || 'Head over to Browse Plans and start your first reading plan.'}
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: C.primary }]}
              onPress={() => setActiveTab('browse')}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBtnText}>{rp?.bpBrowsePlans || 'Browse Plans'}</Text>
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
              isRtl={isRtl}
              rp={rp}
              onRead={() =>
                navigation.navigate(route.dailyReading, {
                  planId: plan.planId,
                  day: nextDay,
                  totalDays: plan.totalDays,
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
                {rp?.bpCompletedPlans || 'Completed Plans'}
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
                  isRtl={isRtl}
                  rp={rp}
                  onRead={() =>
                    navigation.navigate(route.dailyReading, {
                      planId: plan.planId,
                      day: 1,
                      totalDays: plan.totalDays,
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
        {rp?.bpBrowseHint || 'Choose a plan that fits your spiritual journey'}
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
            isRtl={isRtl}
            rp={rp}
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
        title={rp?.bpTitle || 'Reading Plans'}
        subtitle={rp?.bpSubtitle || 'Build a daily Bible habit'}
        onPress={()=>navigation.goBack()}
      />

      {/* Tab row — sits flush below the header */}
      <View
        style={[
          s.tabRow,
          { backgroundColor: C.cardBackground, borderBottomColor: C.border },
        ]}
      >
        <TabButton
          label={rp?.bpTabProgress || 'My Progress'}
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
          isRtl={isRtl}
        />
        <TabButton
          label={rp?.bpTabBrowse || 'Browse Plans'}
          icon={
            <LayoutList
              size={14}
              color={activeTab === 'browse' ? C.primary : C.muted}
            />
          }
          active={activeTab === 'browse'}
          onPress={() => setActiveTab('browse')}
          C={C}
          isRtl={isRtl}
        />
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[s.loaderText, { color: C.muted }]}>
            {rp?.bpLoading || 'Loading\u2026'}
          </Text>
        </View>
      ) : (
        <View style={s.content}>
          {activeTab === 'progress' ? renderProgressTab() : renderBrowseTab()}
        </View>
      )}

      <ActionModal
        visible={startPlanModalVisible}
        title={rp?.bpStartPlanTitle || 'Start Reading Plan'}
        message={
          pendingPlan
            ? (rp?.bpStartPlanMessage || 'Do you want to start "{title}"? This will set your daily reading schedule and track your progress.').replace('{title}', pendingPlan.title)
            : (rp?.bpStartPlanMessage || 'Are you sure you want to start this reading plan?')
        }
        severity="info"
        confirmLabel={rp?.bpStartPlanConfirm || 'Start Plan'}
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
        title={rp?.bpRemovePlanTitle || 'Remove Plan'}
        message={
          planToRemove
            ? (rp?.bpRemovePlanMessage || 'Are you sure you want to remove "{title}"? Your progress will be lost.').replace('{title}', planToRemove.title)
            : 'Are you sure you want to remove this plan?'
        }
        severity="warning"
        confirmLabel={rp?.bpRemoveConfirm || 'Remove'}
        cancelLabel={rp?.bpKeepIt || 'Keep It'}
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
  isRtl,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number;
  onPress: () => void;
  C: ReturnType<typeof getColors>;
  isRtl?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        s.tabBtn,
        { flexDirection: isRtl ? 'row-reverse' : 'row' },
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
  isRtl,
  rp,
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
  isRtl?: boolean;
  rp: any;
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

      <View style={[s.activeTop, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[s.activeTitleWrap, isRtl ? { marginLeft: SPACING.md, marginRight: 0 } : { marginRight: SPACING.md }]}>
          <View style={[s.activeTitleRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text
              style={[s.activePlanTitle, { color: C.text, textAlign: isRtl ? 'right' : 'left' }]}
              numberOfLines={2}
            >
              {plan.title}
            </Text>
            {isCompleted && (
              <View style={s.completedPill}>
                <Trophy size={10} color="#10B981" />
                <Text style={s.completedPillText}>{rp?.bpDone || 'Done'}</Text>
              </View>
            )}
          </View>
          <Text style={[s.activePlanSub, { color: C.muted, textAlign: isRtl ? 'right' : 'left' }]}>
            {(rp?.bpDaysDone || '{done} of {total} days done')
              .replace('{done}', String(done))
              .replace('{total}', String(plan.totalDays))}
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
        {pct}% {rp?.bpComplete || 'complete'}
      </Text>

      <View
        style={[
          s.statsRow,
          { flexDirection: isRtl ? 'row-reverse' : 'row', backgroundColor: isDark ? C.border + 'AA' : C.border + '60' },
        ]}
      >
        <StatChip
          icon={<Flame size={13} color={C.warning} />}
          value={`${streak}d`}
          label={rp?.bpStreak || 'Streak'}
          C={C}
          isRtl={isRtl}
        />
        <View style={[s.statsDivider, { backgroundColor: C.border }]} />
        <StatChip
          icon={<CheckCircle size={13} color={C.success} />}
          value={String(done)}
          label={rp?.bpDone || 'Done'}
          C={C}
          isRtl={isRtl}
        />
        <View style={[s.statsDivider, { backgroundColor: C.border }]} />
        <StatChip
          icon={<BookOpen size={13} color={C.muted} />}
          value={lastDay ? `${rp?.bpDaysLabel || 'Day'} ${lastDay}` : '\u2014'}
          label={rp?.bpLastRead || 'Last read'}
          C={C}
          isRtl={isRtl}
        />
      </View>

      {isCompleted ? (
        // Completed: View Summary + Revisit side by side
        <View style={[s.ctaRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[s.ctaOutline, s.ctaHalf, { borderColor: accentColor }]}
            onPress={onSummary}
            activeOpacity={0.8}
          >
            <Eye size={15} color={accentColor} />
            <Text style={[s.ctaOutlineText, { color: accentColor }]}>
              {rp?.bpSummary || 'Summary'}
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
              {rp?.bpRevisit || 'Revisit'}
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
            {done === 0
              ? `${(rp?.bpBeginDay || 'Begin Day {day}').replace('{day}', '1')}`
              : `${rp?.bpContinue || 'Continue'} \u00B7 ${rp?.bpDaysLabel || 'Day'} ${nextDay}`}
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
  isRtl,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  C: ReturnType<typeof getColors>;
  isRtl?: boolean;
}) {
  return (
    <View style={[s.statChip, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
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
  isRtl,
  rp,
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
  isRtl?: boolean;
  rp: any;
  onPress: () => void;
}) {
  const diffColor =
    DIFFICULTY_COLOR[plan.difficulty]?.[isDark ? 'dark' : 'light'] ?? C.muted;

  const difficultyLabel: Record<string, string> = {
    easy: rp?.bpDifficultyEasy || 'Beginner',
    medium: rp?.bpDifficultyMedium || 'Intermediate',
    hard: rp?.bpDifficultyHard || 'Advanced',
  };

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

      <View style={[s.browseRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
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
          <View style={[s.browseTitleRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[s.browseTitle, { color: C.text, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
              {plan.title}
            </Text>
            {isCompleted && (
              <View style={[s.activePill, { backgroundColor: '#10B981' }]}>
                <Text style={s.activePillText}>{rp?.bpDone || '\u2713 Done'}</Text>
              </View>
            )}
            {isActive && !isCompleted && (
              <View style={[s.activePill, { backgroundColor: C.primary }]}>
                <Text style={s.activePillText}>{rp?.bpActive || 'Active'}</Text>
              </View>
            )}
          </View>

          <Text style={[s.browseDesc, { color: C.muted, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>
            {plan.description}
          </Text>

          <View style={[s.browseMeta, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[s.metaItem, { color: C.muted }]}>
              {plan.totalDays} {rp?.bpDaysLabel || 'days'}
            </Text>
            <Text style={[s.metaDot, { color: C.muted }]}>·</Text>
            <Text style={[s.metaItem, { color: diffColor }]}>
              {difficultyLabel[plan.difficulty] ?? plan.difficulty}
            </Text>
            {plan.questionsEnabled && (
              <>
                <Text style={[s.metaDot, { color: C.muted }]}>·</Text>
                <Text style={[s.metaItem, { color: C.muted }]}>
                  {rp?.bpQALabel || 'Q&A'}
                </Text>
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
              <Text style={[s.browseProgressLabel, { color: C.muted, textAlign: isRtl ? 'right' : 'left' }]}>
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
  activeTitleWrap: { flex: 1 },
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

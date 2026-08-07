import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { route } from '../../component/navigations/routes';
import { sendPostRequest } from '../../services/api';
import ActionHeader from '../../reusable/ActionHeader';
import {
  BookOpen,
  Play,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  FileText,
  Brain,
  Heart,
  Eye,
  Ear,
  Search,
  Clock,
  ChevronRight,
  Library,
  Target,
  BookMarked,
} from 'lucide-react-native';
import { STAGE_DESC, STAGE_TIME } from './constants';

export default function LabHomeScreen() {
  const navigation = useNavigation<any>();
  const navRoute = useRoute<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const userInfo = app?.userInfo;

  const [activeSession, setActiveSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // The stage passed from the active study that we were just on — used to
  // highlight the "recently passed" stage on the Lab home.
  const recentStage =
    (navRoute?.params?.stage as string) || activeSession?.currentStage || '';

  const loadData = useCallback(async () => {
    if (!userInfo) {
      setLoading(false);
      return;
    }
    try {
      const [currentRes, historyRes] = await Promise.all([
        sendPostRequest('exegesis', 'current', {}),
        sendPostRequest('exegesis', 'history', { page: 0, pageSize: 10 }),
      ]);

      if (currentRes.returnCode === 200) {
        setActiveSession(currentRes.returnData);
      }
      if (historyRes.returnCode === 200 && historyRes.returnData) {
        setHistory(historyRes.returnData.data || []);
      }
    } catch (e) {
      console.error('Failed to load lab data:', e);
    } finally {
      setLoading(false);
    }
  }, [userInfo]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(useCallback(() => {
    if (userInfo) loadData();
  }, [loadData, userInfo]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const stageIcons: Record<string, any> = {
    look: Eye,
    listen: Ear,
    learn: Brain,
    abide: Heart,
    apply: Target,
  };

  const stageLabels: Record<string, string> = {
    look: 'Look',
    listen: 'Listen',
    learn: 'Learn',
    abide: 'Abide',
    apply: 'Apply',
  };

  const goToStudy = (session: any) => {
    navigation.navigate(route.bibleStudy, {
      sessionId: session.id,
      stage: session.currentStage,
      passageRef: session.passageRef,
      bookName: session.bookName,
      chapter: session.chapter,
      verseStart: session.verseStart?.toString(),
      verseEnd: session.verseEnd?.toString(),
    });
  };

  return (
    <View style={styles.container}>
      <ActionHeader
        mode='standard'
        title="Exegesis Lab"
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* ── Hero / Start New Study ── */}
        <View style={[styles.heroCard, { backgroundColor: COLORS.primary }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <BookOpen size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.heroEyebrow}>DEEP BIBLE STUDY</Text>
          </View>
          <Text style={styles.heroTitle}>Exegesis Lab</Text>
          <Text style={styles.heroSubtitle}>
            Journey through Scripture with a proven 5-step method — look, listen, learn, abide, and apply.
          </Text>
          <TouchableOpacity
            style={styles.heroBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(route.bibleStudy, {})}
          >
            <Play size={16} color={COLORS.primary} />
            <Text style={styles.heroBtnText}>Start New Study</Text>
            <ArrowRight size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Active Session Banner ── */}
        {activeSession && !activeSession.completed && (
          <TouchableOpacity
            style={[styles.activeCard, { backgroundColor: COLORS.accent }]}
            activeOpacity={0.85}
            onPress={() => goToStudy(activeSession)}
          >
            <View style={styles.activeCardTop}>
              <View style={styles.activeCardTag}>
                <Sparkles size={12} color="#FFFFFF" />
                <Text style={styles.activeCardTagText}>IN PROGRESS</Text>
              </View>
              <View style={styles.activeCardPlay}>
                <Play size={14} color={COLORS.accent} />
              </View>
            </View>
            <Text style={styles.activeCardRef}>{activeSession.passageRef}</Text>
            <View style={styles.activeCardBottom}>
              <View style={styles.activeCardStageWrap}>
                <Clock size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.activeCardStage}>
                  Current: {stageLabels[recentStage] || recentStage || stageLabels[activeSession.currentStage] || activeSession.currentStage}
                </Text>
              </View>
              <Text style={styles.activeCardCta}>Continue Study</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── The 5-Step Journey ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>The 5-Step Journey</Text>
          <Text style={[styles.sectionSubtitle, { color: COLORS.muted }]}>
            A guided method for understanding God's Word
          </Text>
        </View>
        <View style={styles.stepsList}>
          {(['look', 'listen', 'learn', 'abide', 'apply'] as const).map((step, idx) => {
            const StageIcon = stageIcons[step];
            const isCurrent = recentStage === step;
            return (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepIconBadge, {
                  backgroundColor: isCurrent ? `${COLORS.accent}22` : `${COLORS.primary}15`,
                }]}>
                  <StageIcon size={20} color={isCurrent ? COLORS.accent : COLORS.primary} />
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[styles.stepNum, { color: isCurrent ? COLORS.accent : COLORS.primary }]}>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.stepName, { color: COLORS.text }]}>{stageLabels[step]}</Text>
                    {isCurrent && (
                      <View style={[styles.recentBadge, { backgroundColor: `${COLORS.accent}18` }]}>
                        <Text style={[styles.recentBadgeText, { color: COLORS.accent }]}>You're here</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.stepDesc, { color: COLORS.textSecondary }]}>
                    {STAGE_DESC[step]}
                  </Text>
                </View>
                <View style={[styles.stepTime, { backgroundColor: `${COLORS.accent}15` }]}>
                  <Clock size={10} color={COLORS.accent} />
                  <Text style={[styles.stepTimeText, { color: COLORS.accent }]}>{STAGE_TIME[step]}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Previous Studies ── */}
        {history.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Previous Studies</Text>
              <Text style={[styles.sectionSubtitle, { color: COLORS.muted }]}>Continue where you left off</Text>
            </View>
            {history.map((session: any) => {
              const isActive = !session.completed;
              const statusLabel = isActive
                ? `At ${stageLabels[session.currentStage] || session.currentStage}`
                : (session.currentStage === 'completed' ? 'Completed' : 'Abandoned');
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.historyCard,
                    { backgroundColor: COLORS.surface },
                    isActive && { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => goToStudy(session)}
                >
                  <View style={[styles.historyIcon, {
                    backgroundColor: isActive ? `${COLORS.accent}20` : `${COLORS.success}20`,
                  }]}>
                    {isActive ? (
                      <Play size={16} color={COLORS.accent} />
                    ) : (
                      <CheckCircle2 size={16} color={COLORS.success} />
                    )}
                  </View>
                  <View style={styles.historyBody}>
                    <Text style={[styles.historyRef, { color: COLORS.text }]}>{session.passageRef}</Text>
                    <View style={styles.historyMeta}>
                      <Text style={[styles.historyDate, { color: COLORS.muted }]}>
                        {new Date(session.updatedOn || session.createdOn).toLocaleDateString()}
                      </Text>
                      <View style={[styles.statusBadge, {
                        backgroundColor: isActive ? `${COLORS.accent}15` : `${COLORS.success}15`,
                      }]}>
                        <Text style={[styles.statusBadgeText, {
                          color: isActive ? COLORS.accent : COLORS.success,
                        }]}>{statusLabel}</Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={18} color={COLORS.muted} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Empty state ── */}
        {!activeSession && history.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${COLORS.primary}10` }]}>
              <FileText size={34} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No studies yet</Text>
            <Text style={[styles.emptyDesc, { color: COLORS.muted }]}>
              Start your first Exegesis Lab study to begin the 5-step journey through Scripture.
            </Text>
          </View>
        )}

        {/* ── Tools ── */}
        <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Study Tools</Text>
        </View>
        <TouchableOpacity
          style={[styles.toolCard, { backgroundColor: COLORS.surface }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(route.strongsDictionary)}
        >
          <View style={[styles.toolIcon, { backgroundColor: `${COLORS.primary}15` }]}>
            <Search size={20} color={COLORS.primary} />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: COLORS.text }]}>Strong's Dictionary</Text>
            <Text style={[styles.toolSubtitle, { color: COLORS.muted }]}>
              Search, browse, and study Strong's Concordance entries
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolCard, { backgroundColor: COLORS.surface }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(route.studyBible, { initialTab: 'strongs' })}
        >
          <View style={[styles.toolIcon, { backgroundColor: `${COLORS.accent}20` }]}>
            <BookMarked size={20} color={COLORS.accent} />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: COLORS.text }]}>Study Bible</Text>
            <Text style={[styles.toolSubtitle, { color: COLORS.muted }]}>
              Open the Bible reader with study resources
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <View style={[styles.toolCard, { backgroundColor: COLORS.surface }]}>
          <View style={[styles.toolIcon, { backgroundColor: `${COLORS.primary}10` }]}>
            <Library size={20} color={COLORS.primary} />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: COLORS.text }]}>Challenge Library</Text>
            <Text style={[styles.toolSubtitle, { color: COLORS.muted }]}>
              Practical challenges to live out the Word
            </Text>
          </View>
          <Text style={[styles.comingSoon, { color: COLORS.muted }]}>Soon</Text>
        </View>
      </ScrollView>
      )}

    </View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 100, paddingHorizontal: SPACING.lg },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ── Hero ─────────────────────────────────────────────────────────────────
    heroCard: {
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      marginTop: SPACING.lg,
      marginBottom: SPACING.md,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    heroIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroEyebrow: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.xxxl,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: FONT_SIZES.sm,
      lineHeight: 20,
      marginTop: SPACING.xs,
      marginBottom: SPACING.lg,
    },
    heroBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      backgroundColor: COLORS.white,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.round,
      alignSelf: 'flex-start',
      paddingHorizontal: SPACING.xl,
    },
    heroBtnText: {
      color: COLORS.primary,
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
    },

    // ── Active session ───────────────────────────────────────────────────────
    activeCard: {
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    activeCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    activeCardTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: BORDER_RADIUS.round,
    },
    activeCardTagText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
    },
    activeCardPlay: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeCardRef: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.xxl,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginBottom: SPACING.md,
    },
    activeCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    activeCardStageWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    activeCardStage: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: FONT_SIZES.sm,
      fontWeight: '700',
    },
    activeCardCta: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.sm,
      fontWeight: '800',
      textDecorationLine: 'underline',
    },

    // ── Sections ─────────────────────────────────────────────────────────────
    sectionHeader: {
      marginBottom: SPACING.md,
      marginTop: SPACING.sm,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
    },
    sectionSubtitle: {
      fontSize: FONT_SIZES.xs,
      marginTop: 2,
    },

    // ── 5-Step journey ───────────────────────────────────────────────────────
    stepsList: {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.xs,
      marginBottom: SPACING.xl,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      position: 'relative',
    },
    stepIconBadge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    stepBody: { flex: 1 },
    stepTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    stepNum: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '900',
      letterSpacing: 1,
    },
    stepName: {
      fontSize: FONT_SIZES.md,
      fontWeight: '800',
    },
    stepDesc: {
      fontSize: FONT_SIZES.xs,
      marginTop: 2,
    },
    stepTime: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: BORDER_RADIUS.round,
      marginLeft: SPACING.sm,
    },
    stepTimeText: {
      fontSize: 9,
      fontWeight: '800',
    },
    recentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.round,
      marginLeft: SPACING.xs,
    },
    recentBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },

    // ── History ──────────────────────────────────────────────────────────────
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    historyIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    historyBody: { flex: 1 },
    historyRef: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
    historyMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: 4,
    },
    historyDate: {
      fontSize: FONT_SIZES.xs,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },

    // ── Empty state ──────────────────────────────────────────────────────────
    emptyState: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.lg,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    emptyTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      marginBottom: SPACING.xs,
    },
    emptyDesc: {
      fontSize: FONT_SIZES.sm,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: SPACING.xl,
    },

    // ── Tools ────────────────────────────────────────────────────────────────
    toolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    toolIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    toolBody: { flex: 1 },
    toolTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },
    toolSubtitle: {
      fontSize: FONT_SIZES.xs,
      marginTop: 2,
      lineHeight: 16,
    },
    comingSoon: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '700',
      fontStyle: 'italic',
    },
  });

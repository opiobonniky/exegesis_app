import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { route } from '../../component/navigations/routes';
import { sendPostRequest } from '../../services/api';
import ActionHeader from '../../reusable/ActionHeader';
import BottomTab from '../../component/navigations/BottomTab';
import {
  BookOpen,
  Play,
  ArrowRight,
  Clock,
  CheckCircle2,
  BookMarked,
  Sparkles,
  FileText,
  Brain,
  Heart,
  Eye,
  Ear,
} from 'lucide-react-native';

export default function LabHomeScreen() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const userInfo = app?.userInfo;

  const [activeSession, setActiveSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  };

  const stageLabels: Record<string, string> = {
    look: 'Look',
    listen: 'Listen',
    learn: 'Learn',
    abide: 'Abide',
    completed: 'Completed',
    abandoned: 'Abandoned',
  };

  const stageDescriptions: Record<string, string> = {
    look: 'Observe what the text says',
    listen: 'Dwell in the Word',
    learn: 'Understand the context',
    abide: 'Apply and journal',
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActionHeader
        mode='standard'
        title="Exegesis Lab"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* ── Active Session Banner ── */}
        {activeSession && !activeSession.completed && (
          <TouchableOpacity
            style={[styles.activeCard, { backgroundColor: COLORS.accent }]}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('LabFlow', {
                sessionId: activeSession.id,
                stage: activeSession.currentStage,
                passageRef: activeSession.passageRef,
                bookName: activeSession.bookName,
                chapter: activeSession.chapter,
                verseStart: activeSession.verseStart?.toString(),
                verseEnd: activeSession.verseEnd?.toString(),
              })
            }
          >
            <View style={[styles.activeCardInner, styles.activeCardTop]}>
              <Sparkles size={20} color="#FFFFFF" />
              <Text style={styles.activeCardTitle}>Continue Study</Text>
            </View>
            <Text style={styles.activeCardRef}>{activeSession.passageRef}</Text>
            <View style={[styles.activeCardInner, styles.activeCardBottom]}>
              <Text style={styles.activeCardStage}>
                Current: {stageLabels[activeSession.currentStage] || activeSession.currentStage}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Start New Study ── */}
        <TouchableOpacity
          style={[styles.newStudyCard, { backgroundColor: COLORS.cardBackground }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LabFlow', {})}
        >
          <View style={[styles.newStudyIcon, { backgroundColor: `${COLORS.accent}20` }]}>
            <BookOpen size={28} color={COLORS.accent} />
          </View>
          <Text style={[styles.newStudyTitle, { color: COLORS.text }]}>Start New Study</Text>
          <Text style={[styles.newStudySubtitle, { color: COLORS.textSecondary }]}>
            Choose a passage and begin the 4-step journey
          </Text>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: COLORS.accent }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('LabFlow', {})}
          >
            <Play size={16} color="#FFFFFF" />
            <Text style={styles.startBtnText}>Begin</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* ── The Four Steps ── */}
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>The Four Steps</Text>
        <View style={styles.stepsRow}>
          {(['look', 'listen', 'learn', 'abide'] as const).map((step, idx) => {
            const StageIcon = stageIcons[step];
            return (
              <View key={step} style={[styles.stepCard, { backgroundColor: COLORS.cardBackground }]}>
                <View style={[styles.stepNumber, { backgroundColor: COLORS.accent }]}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <StageIcon size={22} color={COLORS.accent} style={styles.stepIcon} />
                <Text style={[styles.stepName, { color: COLORS.text }]}>{stageLabels[step]}</Text>
                <Text style={[styles.stepDesc, { color: COLORS.textSecondary }]}>
                  {stageDescriptions[step]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Previous Studies (includes in-progress) ── */}
        {history.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Previous Studies</Text>
            {history.map((session: any) => {
              const isActive = !session.completed;
              const stageLabels: Record<string, string> = {
                look: 'Observing',
                listen: 'Listening',
                learn: 'Learning',
                abide: 'Reflecting',
                completed: 'Completed',
                abandoned: 'Abandoned',
              };
              const statusLabel = isActive
                ? (stageLabels[session.currentStage] || session.currentStage)
                : (session.currentStage === 'completed' ? 'Completed' : 'Abandoned');
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.historyCard,
                    { backgroundColor: COLORS.cardBackground },
                    isActive && { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('LabFlow', {
                    sessionId: session.id,
                    stage: session.currentStage,
                    passageRef: session.passageRef,
                    bookName: session.bookName,
                    chapter: session.chapter?.toString(),
                    verseStart: session.verseStart?.toString(),
                    verseEnd: session.verseEnd?.toString(),
                  })}
                >
                  <View style={styles.historyLeft}>
                    {isActive ? (
                      <Play size={16} color={COLORS.accent} />
                    ) : (
                      <CheckCircle2 size={16} color={COLORS.success} />
                    )}
                    <View style={{ marginLeft: SPACING.sm }}>
                      <Text style={[styles.historyRef, { color: COLORS.text }]}>{session.passageRef}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
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
                  </View>
                  <ArrowRight size={16} color={COLORS.muted} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Empty state ── */}
        {!activeSession && history.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={48} color={COLORS.muted} />
            <Text style={[styles.emptyTitle, { color: COLORS.textSecondary }]}>
              No studies yet
            </Text>
            <Text style={[styles.emptyDesc, { color: COLORS.muted }]}>
              Start your first Exegesis Lab study to begin the 4-step journey through Scripture.
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomTab activeTab="lab" setActiveTab={() => {}} />
    </View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 100, paddingHorizontal: SPACING.lg },

    // Active session
    activeCard: {
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      marginTop: SPACING.lg,
      marginBottom: SPACING.md,
    },
    activeCardTop: {
      marginBottom: SPACING.sm,
    },
    activeCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    activeCardTitle: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      marginLeft: SPACING.sm,
    },
    activeCardRef: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.xxl,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginBottom: SPACING.sm,
    },
    activeCardBottom: {},
    activeCardStage: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: FONT_SIZES.sm,
      fontWeight: '600',
    },

    // New study
    newStudyCard: {
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    newStudyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    newStudyTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '800',
      marginBottom: SPACING.xs,
    },
    newStudySubtitle: {
      fontSize: FONT_SIZES.sm,
      textAlign: 'center',
      marginBottom: SPACING.lg,
      lineHeight: 20,
    },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.round,
    },
    startBtnText: {
      color: '#FFFFFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
    },

    // Steps
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      marginBottom: SPACING.md,
      marginTop: SPACING.sm,
    },
    stepsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.xl,
    },
    stepCard: {
      width: '48%',
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      alignItems: 'center',
      position: 'relative',
    },
    stepNumber: {
      position: 'absolute',
      top: -6,
      left: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    stepIcon: { marginBottom: SPACING.sm, marginTop: SPACING.xs },
    stepName: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      marginBottom: 2,
    },
    stepDesc: {
      fontSize: FONT_SIZES.xs,
      textAlign: 'center',
      lineHeight: 16,
    },

    // History
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    historyRef: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
    },
    historyDate: {
      fontSize: FONT_SIZES.xs,
      marginTop: 1,
    },

    // Status badges
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },

    // Empty
    emptyState: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl * 2,
    },
    emptyTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      marginTop: SPACING.lg,
      marginBottom: SPACING.xs,
    },
    emptyDesc: {
      fontSize: FONT_SIZES.sm,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: SPACING.xl,
    },
  });

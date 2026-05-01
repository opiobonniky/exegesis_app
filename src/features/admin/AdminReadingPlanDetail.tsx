import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAdminPlanStats, AdminPlanStats } from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  Users,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  AlertTriangle,
  Calendar,
  Layers,
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  BarChart,
  BookOpen,
  Search,
  Flame,
  HelpCircle,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';
import { Svg, Rect, G, Text as SvgText, Path } from 'react-native-svg';
import { Image, TextInput } from 'react-native';

const { width } = Dimensions.get('window');

// ── Simple Custom Line Chart ────────────────────────────────────────────────
const SimpleLineChart = ({ data, color, height = 120 }: any) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d: any) => d.count), 5);
  const chartWidth = width - 64;
  const points = data
    .map((d: any, i: number) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = height - (d.count / max) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ height, width: chartWidth, marginTop: 10 }}>
      <Svg height={height} width={chartWidth}>
        <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth="3" />
        {data.map((d: any, i: number) => (
          <G key={i}>
            <Rect
              x={(i / (data.length - 1)) * chartWidth - 2}
              y={height - (d.count / max) * height - 2}
              width="4"
              height="4"
              fill={color}
            />
          </G>
        ))}
      </Svg>
    </View>
  );
};

const AdminReadingPlanDetail: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { planId } = route.params;

  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const colors = getColors(isDark);

  const [stats, setStats] = useState<AdminPlanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const filteredUsers = (stats?.users || []).filter(u => {
    const term = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term)
    );
  });

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminPlanStats(planId);
      setStats(data);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!stats) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {stats.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Enrolled"
            value={stats.totalEnrollments.toString()}
            icon={<Users size={20} color={colors.primary} />}
            colors={colors}
          />
          <StatCard
            title="Quiz (C/W)"
            value={`${stats.totalQuizCorrect} / ${stats.totalQuizWrong}`}
            icon={<HelpCircle size={20} color={colors.primary} />}
            colors={colors}
          />
          <StatCard
            title="Global Accuracy"
            value={`${stats.globalQuizAccuracy}%`}
            icon={<TrendingUp size={20} color="#8b5cf6" />}
            colors={colors}
          />
          <StatCard
            title="In Progress"
            value={stats.inProgressEnrollments.toString()}
            icon={<Activity size={20} color="#f59e0b" />}
            colors={colors}
          />
        </View>

        {/* User Progress Details */}
        <View
          style={[styles.section, { backgroundColor: colors.cardBackground }]}
        >
          <View style={styles.sectionHeader}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              User Progress Details
            </Text>
          </View>

          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
              },
            ]}
          >
            <Search size={16} color={colors.muted} />
            <TextInput
              placeholder="Search users..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
              value={userSearch}
              onChangeText={setUserSearch}
            />
          </View>

          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <View key={user.userId} style={styles.userRow}>
                <View style={styles.userInfoCol}>
                  <View style={styles.userAvatarRow}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      {user.photo ? (
                        <Image
                          source={{ uri: user.photo.replace(/[`\s]/g, '') }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.avatarInitial,
                            { color: colors.muted },
                          ]}
                        >
                          {user.name.charAt(0)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.nameEmailCol}>
                      <Text
                        style={[styles.userNameText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>
                      <Text
                        style={[styles.userEmailText, { color: colors.muted }]}
                        numberOfLines={1}
                      >
                        {user.email}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.userMetricsRow}>
                    <View style={styles.metricGroup}>
                      <Text
                        style={[styles.metricLabel, { color: colors.muted }]}
                      >
                        PROGRESS
                      </Text>
                      <View style={styles.miniProgressTrack}>
                        <View
                          style={[
                            styles.miniProgressFill,
                            {
                              width: `${user.completionPercentage}%`,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.metricValue, { color: colors.text }]}
                      >
                        {user.completedDaysCount}/{stats.totalDays}d
                      </Text>
                    </View>

                    <View style={styles.metricGroup}>
                      <Text
                        style={[styles.metricLabel, { color: colors.muted }]}
                      >
                        QUIZ (C/W)
                      </Text>
                      <View style={styles.quizCountsRow}>
                        <Text
                          style={[
                            styles.correctCount,
                            { color: colors.success },
                          ]}
                        >
                          {user.quizStats.correct}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 10 }}>
                          /
                        </Text>
                        <Text style={[styles.wrongCount, { color: '#ef4444' }]}>
                          {user.quizStats.wrong}
                        </Text>
                      </View>
                      <Text
                        style={[styles.metricValue, { color: colors.muted }]}
                      >
                        {user.quizStats.accuracy}% acc
                      </Text>
                    </View>

                    <View style={styles.metricGroup}>
                      <Text
                        style={[styles.metricLabel, { color: colors.muted }]}
                      >
                        STREAK
                      </Text>
                      <View style={styles.streakPill}>
                        <Flame size={10} color="#f97316" />
                        <Text style={styles.streakText}>{user.streak}d</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statusFooter}>
                    <Text
                      style={[styles.lastActivityText, { color: colors.muted }]}
                    >
                      Last:{' '}
                      {user.lastActivity
                        ? new Date(user.lastActivity).toLocaleDateString()
                        : 'Never'}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            user.status === 'completed'
                              ? '#dcfce7'
                              : user.status === 'inprogress'
                                ? '#e0f2fe'
                                : '#f1f5f9',
                          borderColor:
                            user.status === 'completed'
                              ? '#86efac'
                              : user.status === 'inprogress'
                                ? '#7dd3fc'
                                : '#e2e8f0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              user.status === 'completed'
                                ? '#15803d'
                                : user.status === 'inprogress'
                                  ? '#0369a1'
                                  : '#475569',
                          },
                        ]}
                      >
                        {user.status === 'completed'
                          ? 'Done'
                          : user.status === 'inprogress'
                            ? 'In Progress'
                            : 'Started'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {userSearch.trim()
                  ? `No users matching "${userSearch}"`
                  : 'No users enrolled yet.'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Enrollment Trend Graph ────────────────────────────────────── */}
        <View
          style={[styles.section, { backgroundColor: colors.cardBackground }]}
        >
          <View style={styles.sectionHeader}>
            <BarChart size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Enrollment Trend (14d)
            </Text>
          </View>
          <SimpleLineChart
            data={stats.enrollmentTrend}
            color={colors.primary}
          />
          <View style={styles.trendLabels}>
            <Text style={[styles.trendDate, { color: colors.muted }]}>
              {stats.enrollmentTrend[0]?.date}
            </Text>
            <Text style={[styles.trendDate, { color: colors.muted }]}>
              {stats.enrollmentTrend[stats.enrollmentTrend.length - 1]?.date}
            </Text>
          </View>
        </View>

        {/* Quiz Performance */}
        <View
          style={[styles.section, { backgroundColor: colors.cardBackground }]}
        >
          <View style={styles.sectionHeader}>
            <BrainCircuit size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Quiz Performance
            </Text>
          </View>
          <View style={styles.quizStatsRow}>
            <View style={styles.quizStatItem}>
              <Text style={[styles.quizStatValue, { color: colors.text }]}>
                {stats.totalQuizAnswers}
              </Text>
              <Text style={[styles.quizStatLabel, { color: colors.muted }]}>
                Total Answers
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.quizStatItem}>
              <Text
                style={[
                  styles.quizStatValue,
                  {
                    color:
                      stats.globalQuizAccuracy > 70
                        ? colors.success
                        : '#f59e0b',
                  },
                ]}
              >
                {stats.globalQuizAccuracy}%
              </Text>
              <Text style={[styles.quizStatLabel, { color: colors.muted }]}>
                Global Accuracy
              </Text>
            </View>
          </View>
        </View>

        {/* Most Difficult Questions */}
        {stats.difficultQuestions.length > 0 && (
          <View
            style={[styles.section, { backgroundColor: colors.cardBackground }]}
          >
            <View style={styles.sectionHeader}>
              <AlertTriangle size={20} color="#ef4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Most Difficult Questions
              </Text>
            </View>
            {stats.difficultQuestions.map((q, index) => (
              <View
                key={q.id}
                style={[
                  styles.questionCard,
                  index !== stats.difficultQuestions.length - 1 &&
                    styles.borderBottom,
                ]}
              >
                <View style={styles.questionHeader}>
                  <Text style={[styles.dayLabel, { color: colors.muted }]}>
                    Day {q.dayNumber}
                  </Text>
                  <Text style={[styles.accuracyLabel, { color: '#ef4444' }]}>
                    {q.accuracy}% Correct
                  </Text>
                </View>
                <Text style={[styles.questionText, { color: colors.text }]}>
                  {q.question}
                </Text>
                <Text style={[styles.answerCount, { color: colors.muted }]}>
                  {q.totalAnswers} answers
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Plan Structure */}
        <View
          style={[styles.section, { backgroundColor: colors.cardBackground }]}
        >
          <View style={styles.sectionHeader}>
            <Layers size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Plan Structure & Verses
            </Text>
          </View>

          {stats.structure.map(day => (
            <View key={day.day} style={styles.dayContainer}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() =>
                  setExpandedDay(expandedDay === day.day ? null : day.day)
                }
              >
                <View style={styles.dayTitleGroup}>
                  <Text style={[styles.dayNumber, { color: colors.primary }]}>
                    Day {day.day}
                  </Text>
                  <Text
                    style={[styles.dayTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {day.title || 'Untitled'}
                  </Text>
                </View>
                {expandedDay === day.day ? (
                  <ChevronUp size={18} color={colors.muted} />
                ) : (
                  <ChevronDown size={18} color={colors.muted} />
                )}
              </TouchableOpacity>

              {expandedDay === day.day && (
                <View style={styles.dayDetails}>
                  {day.chapters.map((ch: any, idx: number) => (
                    <View
                      key={idx}
                      style={[
                        styles.chapterBadge,
                        { backgroundColor: `${colors.primary}10` },
                      ]}
                    >
                      <BookOpen size={12} color={colors.primary} />
                      <Text
                        style={[styles.chapterText, { color: colors.primary }]}
                      >
                        {ch.book} {ch.chapter}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const StatCard = ({ title, value, icon, colors }: any) => (
  <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
    <View style={styles.statIcon}>{icon}</View>
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statTitle, { color: colors.muted }]}>{title}</Text>
  </View>
);

const InfoRow = ({ icon, label, value, colors }: any) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabelGroup}>
      {icon}
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 32 - 12) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  quizStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  quizStatItem: {
    alignItems: 'center',
  },
  quizStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  quizStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  questionCard: {
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  accuracyLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  answerCount: {
    fontSize: 10,
    marginTop: 4,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendDate: {
    fontSize: 10,
    fontWeight: '600',
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  dayContainer: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  dayTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dayDetails: {
    padding: 12,
    paddingTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chapterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chapterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    padding: 0,
  },
  userRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  userInfoCol: {
    gap: 12,
  },
  userAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameEmailCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 11,
  },
  userMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricGroup: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  miniProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  quizCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  correctCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  wrongCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lastActivityText: {
    fontSize: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export default AdminReadingPlanDetail;

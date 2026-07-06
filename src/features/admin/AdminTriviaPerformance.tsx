import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Activity,
  BarChart3,
  ChevronLeft,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import {
  getTriviaAdminOverview,
  getTriviaUserPerformanceList,
  getTriviaQuestionPerformance,
  TriviaAdminOverview,
  TriviaUserPerformance,
  TriviaQuestionPerformance,
} from '../trivia/services/triviaApi';

type Tab = 'overview' | 'users' | 'questions';

export default function AdminTriviaPerformance() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = createStyles(COLORS);

  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<TriviaAdminOverview | null>(null);
  const [users, setUsers] = useState<TriviaUserPerformance[]>([]);
  const [questions, setQuestions] = useState<TriviaQuestionPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [overviewData, userData, questionData] = await Promise.all([
        getTriviaAdminOverview(),
        getTriviaUserPerformanceList({
          search: search.trim() || undefined,
          pageSize: 100,
        }),
        getTriviaQuestionPerformance({ pageSize: 100 }),
      ]);
      setOverview(overviewData);
      setUsers(userData.data || []);
      setQuestions(questionData.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const card = (
    icon: React.ReactNode,
    label: string,
    value: string | number,
  ) => (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderUser = ({ item }: { item: TriviaUserPerformance }) => (
    <TouchableOpacity
      style={styles.listCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('AdminTriviaUserDetail', { userId: item.userId })
      }
    >
      <View style={styles.listCardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(
              (item.firstName || '')[0] + (item.lastName || '')[0]
            ).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>
            {[item.firstName, item.lastName].filter(Boolean).join(' ') ||
              'Unknown'}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <Text
          style={[
            styles.percentage,
            {
              color:
                item.percentage >= 60
                  ? COLORS.success
                  : item.percentage >= 40
                    ? COLORS.accent
                    : COLORS.error,
            },
          ]}
        >
          {item.percentage}%
        </Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.statDetail}>{item.totalAnswered} answered</Text>
        <Text style={styles.statDetail}>{item.correct} correct</Text>
        <Text style={styles.statDetail}>{item.incorrect} incorrect</Text>
      </View>
    </TouchableOpacity>
  );

  const renderQuestion = ({ item }: { item: TriviaQuestionPerformance }) => (
    <View style={styles.listCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText} numberOfLines={2}>
          {item.question}
        </Text>
        <Text
          style={[
            styles.percentage,
            {
              color:
                item.percentage >= 60
                  ? COLORS.success
                  : item.percentage >= 40
                    ? COLORS.accent
                    : COLORS.error,
            },
          ]}
        >
          {item.percentage}%
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaChip}>{item.difficulty || 'medium'}</Text>
        <Text style={styles.metaChip}>{item.category || 'general'}</Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.statDetail}>{item.timesAnswered} answers</Text>
        <Text style={styles.statDetail}>{item.timesCorrect} correct</Text>
        <Text style={styles.statDetail}>{item.timesIncorrect} incorrect</Text>
      </View>
    </View>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'questions', label: 'Questions' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={app?.isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trivia Performance</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabRow}>
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <>
          {tab === 'overview' && overview && (
            <FlatList
              data={[]}
              renderItem={null}
              keyExtractor={() => 'dummy'}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary}
                />
              }
              ListHeaderComponent={
                <View style={styles.overviewContent}>
                  <View style={styles.grid2}>
                    {card(
                      <Users size={22} color={COLORS.primary} />,
                      'Participants',
                      overview.totalParticipants,
                    )}
                    {card(
                      <Activity size={22} color={COLORS.primary} />,
                      'Total Answers',
                      overview.totalAnswers,
                    )}
                  </View>
                  <View style={styles.grid2}>
                    {card(
                      <TrendingUp size={22} color={COLORS.primary} />,
                      'Avg Score',
                      `${overview.averageScore}%`,
                    )}
                    {card(
                      <BarChart3 size={22} color={COLORS.primary} />,
                      'Active Today',
                      overview.dailyActiveParticipants,
                    )}
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>By Difficulty</Text>
                    {Object.entries(overview.difficultyBreakdown).length ===
                    0 ? (
                      <Text style={styles.emptyText}>No data yet</Text>
                    ) : (
                      Object.entries(overview.difficultyBreakdown).map(
                        ([diff, data]) => (
                          <View key={diff} style={styles.diffRow}>
                            <Text style={styles.diffLabel}>{diff}</Text>
                            <View style={styles.diffBar}>
                              <View
                                style={[
                                  styles.diffFill,
                                  {
                                    width:
                                      data.total > 0
                                        ? `${(data.correct / data.total) * 100}%`
                                        : '0%',
                                    backgroundColor:
                                      diff === 'easy'
                                        ? COLORS.success
                                        : diff === 'hard'
                                          ? COLORS.error
                                          : COLORS.accent,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.diffStat}>
                              {data.correct}/{data.total}
                            </Text>
                          </View>
                        ),
                      )
                    )}
                  </View>
                </View>
              }
              contentContainerStyle={styles.scroll}
            />
          )}

          {tab === 'users' && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchBox}>
                <Search size={16} color={COLORS.muted} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={loadAll}
                  placeholder="Search users..."
                  placeholderTextColor={COLORS.muted}
                  returnKeyType="search"
                />
              </View>
              <FlatList
                data={users}
                renderItem={renderUser}
                keyExtractor={item => item.userId}
                contentContainerStyle={
                  users.length ? styles.list : styles.emptyList
                }
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.primary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Users size={44} color={COLORS.muted} />
                    <Text style={styles.emptyTitle}>No Participants</Text>
                    <Text style={styles.emptyText}>
                      No users have answered any trivia questions yet.
                    </Text>
                  </View>
                }
              />
            </View>
          )}

          {tab === 'questions' && (
            <FlatList
              data={questions}
              renderItem={renderQuestion}
              keyExtractor={item => String(item.questionId)}
              contentContainerStyle={
                questions.length ? styles.list : styles.emptyList
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <BarChart3 size={44} color={COLORS.muted} />
                  <Text style={styles.emptyTitle}>No Question Data</Text>
                  <Text style={styles.emptyText}>
                    Questions need to be answered before stats appear.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingBottom: 32 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 10,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    headerButton: { padding: 8 },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
    tabRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
    tabTextActive: { color: '#fff' },
    overviewContent: { padding: 16, gap: 12 },
    grid2: { flexDirection: 'row', gap: 12 },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    statIcon: { marginBottom: 10 },
    statValue: {
      color: COLORS.text,
      fontSize: 24,
      fontWeight: '900',
    },
    statLabel: {
      color: COLORS.muted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    section: { marginTop: 4 },
    sectionTitle: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 12,
    },
    diffRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    diffLabel: {
      width: 60,
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    diffBar: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.border,
      overflow: 'hidden',
    },
    diffFill: { height: 8, borderRadius: 4 },
    diffStat: {
      color: COLORS.muted,
      fontSize: 12,
      fontWeight: '600',
      width: 50,
      textAlign: 'right',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardBackground,
    },
    searchInput: {
      flex: 1,
      color: COLORS.text,
      paddingVertical: 11,
      fontSize: 14,
    },
    list: { padding: 16, paddingTop: 0 },
    emptyList: { flexGrow: 1, padding: 16 },
    listCard: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    listCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    userName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
    userEmail: { color: COLORS.muted, fontSize: 12 },
    percentage: { fontSize: 18, fontWeight: '900' },
    statsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    statDetail: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
    questionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    questionText: {
      flex: 1,
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '800',
    },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    metaChip: {
      color: COLORS.primary,
      backgroundColor: `${COLORS.primary}14`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
    emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  });

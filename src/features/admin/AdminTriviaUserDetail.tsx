import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CheckCircle2, ChevronLeft, XCircle } from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import {
  getTriviaUserPerformanceDetail,
  TriviaUserPerformanceDetail,
} from '../trivia/services/triviaApi';

export default function AdminTriviaUserDetail() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params || {};
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = createStyles(COLORS);

  const [detail, setDetail] = useState<TriviaUserPerformanceDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getTriviaUserPerformanceDetail(userId);
      setDetail(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={app?.isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!detail) {
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
          <Text style={styles.headerTitle}>User Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </View>
    );
  }

  const { user, stats, answers } = detail;

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
        <Text style={styles.headerTitle}>User Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={answers}
        renderItem={({ item }) => (
          <View style={styles.answerCard}>
            <View style={styles.answerHeader}>
              {item.isCorrect ? (
                <CheckCircle2 size={16} color={COLORS.success} />
              ) : (
                <XCircle size={16} color={COLORS.error} />
              )}
              <Text style={styles.answerQuestion} numberOfLines={2}>
                {item.question}
              </Text>
            </View>
            <View style={styles.answerMeta}>
              <Text style={styles.answerMetaChip}>
                {item.difficulty || 'medium'}
              </Text>
              <Text style={styles.answerMetaChip}>
                {item.category || 'general'}
              </Text>
              <Text style={styles.answerDate}>
                {item.answeredOn
                  ? new Date(item.answeredOn).toLocaleDateString()
                  : ''}
              </Text>
            </View>
          </View>
        )}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={answers.length ? styles.list : styles.emptyList}
        ListHeaderComponent={
          <View>
            <View
              style={[
                styles.userCard,
                { borderBottomWidth: 1, borderBottomColor: COLORS.border },
              ]}
            >
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {(
                    (user.firstName || '')[0] + (user.lastName || '')[0]
                  ).toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.userName}>
                {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                  'Unknown'}
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.memberSince}>
                Member since{' '}
                {user.createdOn
                  ? new Date(user.createdOn).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalAnswered}</Text>
                <Text style={styles.statLabel}>Answered</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {stats.correct}
                </Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>
                  {stats.incorrect}
                </Text>
                <Text style={styles.statLabel}>Incorrect</Text>
              </View>
              <View style={styles.statCard}>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        stats.percentage >= 60
                          ? COLORS.success
                          : stats.percentage >= 40
                            ? COLORS.accent
                            : COLORS.error,
                    },
                  ]}
                >
                  {stats.percentage}%
                </Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>

            {answers.length > 0 && (
              <Text style={styles.sectionTitle}>
                Answer History ({answers.length})
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Answers Yet</Text>
            <Text style={styles.emptyText}>
              This user hasn't answered any trivia questions.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    list: { padding: 16, paddingTop: 0 },
    emptyList: { flexGrow: 1, padding: 16 },
    userCard: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    avatarLarge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
    userName: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
    userEmail: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
    memberSince: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    statCard: {
      width: '47%',
      backgroundColor: COLORS.cardBackground,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
    },
    statValue: { fontSize: 26, fontWeight: '900', color: COLORS.text },
    statLabel: {
      color: COLORS.muted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    sectionTitle: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 10,
      paddingHorizontal: 16,
    },
    answerCard: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
    },
    answerHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    answerQuestion: {
      flex: 1,
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '700',
    },
    answerMeta: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
      alignItems: 'center',
    },
    answerMetaChip: {
      color: COLORS.primary,
      backgroundColor: `${COLORS.primary}14`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    answerDate: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: '600',
      marginLeft: 'auto',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 40,
    },
    emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
    emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  });

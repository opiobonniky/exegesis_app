import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  CheckCircle2,
  ChevronLeft,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { route } from '../../component/navigations/routes';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import {
  deleteTriviaQuestion,
  getAllTriviaQuestions,
  TriviaQuestionResponse,
} from '../trivia/services/triviaApi';

const FILTERS = ['all', 'easy', 'medium', 'hard'] as const;

export default function AdminTriviaManager() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = createStyles(COLORS);
  const [items, setItems] = useState<TriviaQuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<(typeof FILTERS)[number]>('all');

  const load = useCallback(async () => {
    try {
      const res = await getAllTriviaQuestions({
        page: 0,
        pageSize: 100,
        search: search.trim() || undefined,
        difficulty: difficulty === 'all' ? null : difficulty,
      });
      setItems(res.data || []);
    } catch {
      showToast('error', 'Failed to load trivia questions');
    } finally {
      setLoading(false);
    }
  }, [difficulty, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmDelete = (item: TriviaQuestionResponse) => {
    Alert.alert('Delete Trivia Question', `Delete "${item.question}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTriviaQuestion(item.id);
            setItems(prev => prev.filter(q => q.id !== item.id));
            showToast('success', 'Trivia question deleted');
          } catch {
            showToast('error', 'Failed to delete trivia question');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: TriviaQuestionResponse }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <HelpCircle size={17} color={COLORS.primary} />
          <Text style={styles.question} numberOfLines={2}>
            {item.question}
          </Text>
        </View>
        {item.isActive === false ? (
          <XCircle size={16} color={COLORS.muted} />
        ) : (
          <CheckCircle2 size={16} color={COLORS.success} />
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaChip}>{item.difficulty || 'medium'}</Text>
        <Text style={styles.metaChip}>{item.category || 'general'}</Text>
        {item.bookName ? (
          <Text style={styles.referenceChip}>
            {item.bookName} {item.chapter ?? ''}
            {item.verseNumber ? `:${item.verseNumber}` : ''}
          </Text>
        ) : null}
      </View>

      {item.explanation ? (
        <Text style={styles.preview} numberOfLines={2}>
          {item.explanation}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.answerText}>
          Answer: {(item.correctAnswer ?? 0) + 1}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              navigation.navigate('EditTriviaQuestion', { question: item })
            }
          >
            <Pencil size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => confirmDelete(item)}
          >
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Bible Trivia</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate(route.adminTriviaPerformance)}
          >
            <TrendingUp size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('AddTriviaQuestion')}
          >
            <Plus size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            placeholder="Search questions"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filters}>
          {FILTERS.map(filter => {
            const active = difficulty === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setDifficulty(filter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <HelpCircle size={44} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No Trivia Questions</Text>
              <Text style={styles.emptyText}>
                Tap + to add the first question.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

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
    headerActions: { flexDirection: 'row', gap: 4 },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
    toolbar: { padding: 16, gap: 10 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    filters: { flexDirection: 'row', gap: 8 },
    filterChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    filterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
    filterTextActive: { color: '#fff' },
    list: { padding: 16, paddingTop: 0 },
    emptyList: { flexGrow: 1, padding: 16 },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
    },
    titleRow: { flex: 1, flexDirection: 'row', gap: 8 },
    question: {
      flex: 1,
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 20,
    },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    metaChip: {
      color: COLORS.primary,
      backgroundColor: `${COLORS.primary}14`,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    referenceChip: {
      color: COLORS.accent,
      backgroundColor: `${COLORS.accent}14`,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 11,
      fontWeight: '800',
    },
    preview: {
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 10,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    answerText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 8 },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
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

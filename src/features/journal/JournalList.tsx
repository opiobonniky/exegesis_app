/**
 * JournalList.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User journal entries list screen
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { FONT_SIZES, SPACING } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { route } from '../../component/navigations/routes';
import {
  getAllJournalEntries,
  JournalEntry,
  JournalStats,
  getJournalStats,
  toggleJournalFavorite,
  deleteJournalEntry,
} from '../../services/api';
import {
  Search,
  Plus,
  Star,
  StarOff,
  BookOpen,
  Calendar,
  ChevronRight,
  Trash2,
  Loader2,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'study', label: 'Study' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'gratitude', label: 'Gratitude' },
  { value: 'reflection', label: 'Reflection' },
  { value: 'application', label: 'Application' },
];

const JournalList = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async (pageNum = 0, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 0) setLoading(true);

      const payload: any = { page: pageNum, pageSize: 20 };
      if (search) payload.search = search;
      if (category !== 'all') payload.category = category;

      const res = await getAllJournalEntries(payload);
      if (res.returnCode === 200 && res.returnData) {
        if (pageNum === 0) {
          setEntries(res.returnData.entries || []);
        } else {
          setEntries(prev => [...prev, ...(res.returnData.entries || [])]);
        }
        setHasMore(res.returnData.hasNext || false);
      }
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      showToast('error', 'Failed to load journal entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, category]);

  const fetchStats = async () => {
    try {
      const res = await getJournalStats();
      if (res.returnCode === 200 && res.returnData) {
        setStats(res.returnData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchEntries(0);
    fetchStats();
  }, [category]);

  const handleRefresh = () => {
    setPage(0);
    fetchEntries(0, true);
    fetchStats();
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchEntries(nextPage);
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      const res = await toggleJournalFavorite(id);
      if (res.returnCode === 200) {
        setEntries(prev =>
          prev.map(entry =>
            entry.id === id
              ? { ...entry, isFavorite: !entry.isFavorite }
              : entry
          )
        );
      }
    } catch (error) {
      showToast('error', 'Failed to update favorite');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteJournalEntry(id);
      if (res.returnCode === 200) {
        setEntries(prev => prev.filter(entry => entry.id !== id));
        showToast('success', 'Entry deleted');
      }
    } catch (error) {
      showToast('error', 'Failed to delete entry');
    }
  };

  const handleEntryPress = (entry: JournalEntry) => {
    navigation.navigate(route.journalDetail, { entryId: entry.id });
  };

  const handleCreateNew = () => {
    navigation.navigate(route.journalEntry, {});
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      study: '#3B82F6',
      prayer: '#8B5CF6',
      gratitude: '#F59E0B',
      reflection: '#10B981',
      application: '#EF4444',
      general: '#6B7280',
    };
    return colors[cat] || colors.general;
  };

  const renderEntry = ({ item }: { item: JournalEntry }) => (
    <TouchableOpacity
      style={[styles.entryCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
      onPress={() => handleEntryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <View style={styles.entryMeta}>
          {item.category && (
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                {item.category}
              </Text>
            </View>
          )}
          {item.bookName && (
            <View style={styles.scriptureRef}>
              <BookOpen size={12} color={COLORS.textSecondary} />
              <Text style={[styles.scriptureText, { color: COLORS.textSecondary }]}>
                {item.bookName} {item.chapter}:{item.verseNumber}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => handleToggleFavorite(item.id)}>
          {item.isFavorite ? (
            <Star size={20} color="#F59E0B" fill="#F59E0B" />
          ) : (
            <Star size={20} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      {item.title && (
        <Text style={[styles.entryTitle, { color: COLORS.text }]} numberOfLines={1}>
          {item.title}
        </Text>
      )}

      <Text style={[styles.entryContent, { color: COLORS.textSecondary }]} numberOfLines={3}>
        {item.content}
      </Text>

      <View style={styles.entryFooter}>
        <View style={styles.dateRow}>
          <Calendar size={12} color={COLORS.textMuted} />
          <Text style={[styles.dateText, { color: COLORS.textMuted }]}>
            {formatDate(item.createdOn)}
          </Text>
        </View>
        <ChevronRight size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  const renderStats = () => {
    if (!stats) return null;
    return (
      <View style={[styles.statsContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.totalEntries}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.favoriteCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Favorites</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.entriesThisWeek}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>This Week</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.surface }]}>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>My Journal</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: COLORS.primary }]}
          onPress={handleCreateNew}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Search size={18} color={COLORS.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.text }]}
            placeholder="Search entries..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchEntries(0)}
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: category === item.value ? COLORS.primary : COLORS.surface,
                  borderColor: category === item.value ? COLORS.primary : COLORS.border,
                },
              ]}
              onPress={() => {
                setCategory(item.value);
                setPage(0);
              }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: category === item.value ? '#FFFFFF' : COLORS.text },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Entries List */}
      <FlatList
        data={entries}
        keyExtractor={item => item.id.toString()}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <Loader2 size={32} color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={COLORS.textMuted} />
              <Text style={[styles.emptyText, { color: COLORS.textMuted }]}>
                No journal entries yet
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: COLORS.primary }]}
                onPress={handleCreateNew}
              >
                <Text style={styles.emptyButtonText}>Create First Entry</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
  },
  categoryContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  entryCard: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  scriptureRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scriptureText: {
    fontSize: FONT_SIZES.xs,
  },
  entryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  entryContent: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
  emptyButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
});

export default JournalList;
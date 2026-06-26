/**
 * JournalList.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User journal entries list screen
 * Enhanced with mood display, debounced search, swipe-to-delete,
 * relative time, verse preview, and better empty state.
 */

import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Animated,
  Alert,
  Platform,
  ActionSheetIOS,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
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
import { getVerseText } from '../../utilits/bibleUtils';
import {
  Search,
  Plus,
  Star,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  PenLine,
  MessageSquareQuote,
  Clock,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';
import BottomTab from '../../component/navigations/BottomTab';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all' },
  { value: 'general' },
  { value: 'study' },
  { value: 'prayer' },
  { value: 'gratitude' },
  { value: 'reflection' },
  { value: 'application' },
];

const getCategoryLabel = (value: string, jc: any): string => {
  const labels: Record<string, string> = {
    all: jc?.categoryAll || 'All',
    general: jc?.categoryGeneral || 'General',
    study: jc?.categoryStudy || 'Study',
    prayer: jc?.categoryPrayer || 'Prayer',
    gratitude: jc?.categoryGratitude || 'Gratitude',
    reflection: jc?.categoryReflection || 'Reflection',
    application: jc?.categoryApplication || 'Application',
  };
  return labels[value] || value;
};

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  grateful: '🙏',
  peaceful: '🕊️',
  thoughtful: '🤔',
  motivated: '💪',
  hopeful: '🌟',
  challenged: '🧗',
  blessed: '✨',
};

const CATEGORY_COLORS: Record<string, string> = {
  study: '#3B82F6',
  prayer: '#8B5CF6',
  gratitude: '#F59E0B',
  reflection: '#10B981',
  application: '#EF4444',
  general: '#6B7280',
};

// ── Relative time helper ─────────────────────────────────────────────────────

const getRelativeTime = (dateStr: string, jc: any, language: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return jc?.justNow || 'Just now';
  if (diffMins < 60) return (jc?.minutesAgo || '{count}m ago').replace('{count}', String(diffMins));
  if (diffHours < 24) return (jc?.hoursAgo || '{count}h ago').replace('{count}', String(diffHours));
  if (diffDays === 1) return jc?.yesterdayLabel || 'Yesterday';
  if (diffDays < 7) return (jc?.daysAgo || '{count}d ago').replace('{count}', String(diffDays));

  const locale = language === 'ar' ? 'ar-SA' : language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getFormattedDate = (dateStr: string, language: string): string => {
  const date = new Date(dateStr);
  const locale = language === 'ar' ? 'ar-SA' : language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ── Empty state component ────────────────────────────────────────────────────

const EmptyState = ({
  hasSearch,
  currentCategory,
  onCreateNew,
  colors,
  jc,
}: {
  hasSearch: boolean;
  currentCategory: string;
  onCreateNew: () => void;
  colors: ReturnType<typeof getColors>;
  jc: any;
}) => {
  const hasCategoryFilter = currentCategory !== 'all';
  let title = jc?.noEntries || 'No journal entries yet';
  let subtitle =
    jc?.noEntriesSubtitle || 'Start writing your first journal entry to track your spiritual journey.';
  let icon = <BookOpen size={48} color={colors.muted} />;

  if (hasSearch && hasCategoryFilter) {
    title = jc?.noEntries || 'No matching entries';
    subtitle = jc?.noEntriesSubtitle || 'Try adjusting your search or clearing the category filter.';
    icon = <Search size={48} color={colors.muted} />;
  } else if (hasSearch) {
    title = jc?.noEntries || 'No results found';
    subtitle = jc?.noEntriesSubtitle || 'Try a different search term.';
    icon = <Search size={48} color={colors.muted} />;
  } else if (hasCategoryFilter) {
    title = `No ${getCategoryLabel(currentCategory, jc) || currentCategory} entries`;
    subtitle = jc?.noEntriesSubtitle || 'Try selecting a different category.';
    icon = <PenLine size={48} color={colors.muted} />;
  }

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}
      >
        {icon}
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {subtitle}
      </Text>
      {!hasSearch && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={onCreateNew}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>{jc?.createFirstEntry || 'Create First Entry'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Swipeable delete action ──────────────────────────────────────────────────

const DeleteAction = ({
  progress,
  dragX,
  colors,
  jc,
}: {
  progress: Animated.AnimatedInterpolation<number>;
  dragX: Animated.AnimatedInterpolation<number>;
  colors: ReturnType<typeof getColors>;
  jc: any;
}) => {
  const scale = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.deleteAction,
        {
          backgroundColor: '#DC2626',
          transform: [{ scale }],
        },
      ]}
    >
      <Trash2 size={22} color="#FFFFFF" />
      <Text style={styles.deleteActionText}>{jc?.deleteAction || 'Delete'}</Text>
    </Animated.View>
  );
};

// ── Verse preview snippet ───────────────────────────────────────────────────

const VersePreview = ({
  bookName,
  chapter,
  verseNumber,
  colors,
}: {
  bookName: string;
  chapter: number;
  verseNumber: number;
  colors: ReturnType<typeof getColors>;
}) => {
  const verseText = useMemo(() => {
    try {
      return getVerseText(bookName, chapter, verseNumber);
    } catch {
      return null;
    }
  }, [bookName, chapter, verseNumber]);

  if (!verseText) return null;

  return (
    <View
      style={[
        styles.versePreview,
        {
          backgroundColor: colors.primary + '10',
          borderLeftColor: colors.primary + '40',
        },
      ]}
    >
      <MessageSquareQuote
        size={12}
        color={colors.primary + '60'}
        style={styles.verseQuoteIcon}
      />
      <Text
        style={[styles.versePreviewText, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        "{verseText}"
      </Text>
    </View>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const JournalList = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const jc = translations?.journal;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced search ──────────────────────────────────────────────────────
  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchDebounced(text);
    }, 400);
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchEntries = useCallback(
    async (pageNum = 0, refresh = false) => {
      try {
        if (refresh) setRefreshing(true);
        else if (pageNum === 0) setLoading(true);

        const payload: any = { page: pageNum, pageSize: 20 };
        if (searchDebounced) payload.search = searchDebounced;
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
        showToast('error', jc?.failedToLoadEntry || 'Failed to load journal entries');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchDebounced, category, jc],
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await getJournalStats();
      if (res.returnCode === 200 && res.returnData) {
        setStats(res.returnData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchEntries(0);
    fetchStats();
  }, [category, searchDebounced, fetchEntries, fetchStats]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setPage(0);
    fetchEntries(0, true);
    fetchStats();
  }, [fetchEntries, fetchStats]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchEntries(nextPage);
    }
  }, [hasMore, loading, page, fetchEntries]);

  const handleToggleFavorite = useCallback(async (id: number) => {
    try {
      const res = await toggleJournalFavorite(id);
      if (res.returnCode === 200) {
        setEntries(prev =>
          prev.map(entry =>
            entry.id === id
              ? { ...entry, isFavorite: !entry.isFavorite }
              : entry,
          ),
        );
      }
    } catch (error) {
      showToast('error', jc?.failedToUpdateFavorite || 'Failed to update favorite');
    }
  }, [jc]);

  // ── Delete with confirmation ──────────────────────────────────────────────
  const confirmDelete = useCallback((entry: JournalEntry) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [(translations?.bible?.cancel || 'Cancel'), (jc?.deleteAction || 'Delete')],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: jc?.deleteConfirmTitle || 'Delete Journal Entry',
          message: entry.title
            ? (jc?.deleteConfirmMessageWithTitle || 'Are you sure you want to delete "{title}"?').replace('{title}', entry.title)
            : (jc?.deleteConfirmMessage || 'Are you sure you want to delete this entry?'),
        },
        buttonIndex => {
          if (buttonIndex === 1) handleDelete(entry.id);
        },
      );
    } else {
      Alert.alert(
        jc?.deleteConfirmTitle || 'Delete Journal Entry',
        entry.title
          ? (jc?.deleteConfirmMessageWithTitle || 'Are you sure you want to delete "{title}"?').replace('{title}', entry.title) + '\n\n' + (jc?.deleteAction || 'This action cannot be undone.')
          : (jc?.deleteConfirmMessage || 'Are you sure you want to delete this entry?') + '\n\n' + (jc?.deleteAction || 'This action cannot be undone.'),
        [
          { text: translations?.bible?.cancel || 'Cancel', style: 'cancel' },
          {
            text: jc?.deleteAction || 'Delete',
            style: 'destructive',
            onPress: () => handleDelete(entry.id),
          },
        ],
      );
    }
  }, [jc, translations]);

  const handleDelete = useCallback(async (id: number) => {
    setDeletingId(id);
    try {
      const res = await deleteJournalEntry(id);
      if (res.returnCode === 200) {
        setEntries(prev => prev.filter(entry => entry.id !== id));
        showToast('success', jc?.entryDeleted || 'Entry deleted');
      }
    } catch (error) {
      showToast('error', jc?.failedToDeleteEntry || 'Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  }, [jc]);

  const handleEntryPress = useCallback(
    (entry: JournalEntry) => {
      navigation.navigate(route.journalDetail, { entryId: entry.id });
    },
    [navigation],
  );

  const handleCreateNew = useCallback(() => {
    navigation.navigate(route.journalEntry, {});
  }, [navigation]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const getCategoryColor = (cat: string) =>
    CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;

  // ── Render entry card ─────────────────────────────────────────────────────
  const renderEntry = ({ item }: { item: JournalEntry }) => {
    const moodEmoji = item.mood ? MOOD_EMOJIS[item.mood] : null;

    return (
      <Swipeable
        renderRightActions={(progress, dragX) => (
          <DeleteAction progress={progress} dragX={dragX} colors={COLORS} jc={jc} />
        )}
        onSwipeableOpen={() => confirmDelete(item)}
        overshootRight={false}
        rightThreshold={40}
      >
        <TouchableOpacity
          style={[
            styles.entryCard,
            {
              backgroundColor: COLORS.cardBackground,
              borderColor: COLORS.border,
            },
          ]}
          onPress={() => handleEntryPress(item)}
          activeOpacity={0.7}
        >
          {/* Top row: category + mood + favorite */}
          <View style={[styles.entryHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.entryMeta, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              {!!item.category && (
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor(item.category) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: getCategoryColor(item.category) },
                    ]}
                  >
                    {getCategoryLabel(item.category, jc)}
                  </Text>
                </View>
              )}
              {!!moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
            </View>
            <View style={styles.headerActions}>
              {item.isFavorite === true && (
                <Star
                  size={14}
                  color="#F59E0B"
                  fill="#F59E0B"
                  style={[styles.favoriteIndicator, { [isRtl ? 'marginLeft' : 'marginRight']: 2 }]}
                />
              )}
              <TouchableOpacity
                onPress={() => handleToggleFavorite(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {item.isFavorite ? (
                  <Star size={18} color="#F59E0B" fill="#F59E0B" />
                ) : (
                  <Star size={18} color={COLORS.muted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          {!!item.title && (
            <Text
              style={[styles.entryTitle, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}
              numberOfLines={1}
            >
              {String(item.title)}
            </Text>
          )}

          {/* Content preview */}
          <Text
            style={[styles.entryContent, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}
            numberOfLines={3}
          >
            {String(item.content ?? '')}
          </Text>

          {/* Verse preview */}
          {!!item.bookName &&
            item.chapter != null &&
            item.verseNumber != null && (
              <VersePreview
                bookName={item.bookName}
                chapter={item.chapter}
                verseNumber={item.verseNumber}
                colors={COLORS}
              />
            )}

          {/* Footer: date + scripture reference */}
          {!!item.bookName && (
            <View style={[styles.scriptureRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <BookOpen size={12} color={COLORS.muted} />
              <Text style={[styles.scriptureText, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {`${String(item.bookName ?? '')} ${String(item.chapter ?? '')}:${String(item.verseNumber ?? '')}`}
              </Text>
            </View>
          )}

          {/* Footer: date and chevron */}
          <View style={styles.entryFooter}>
            <View style={[styles.dateRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Clock size={12} color={COLORS.muted} />
              <Text style={[styles.dateText, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {getRelativeTime(item.createdOn, jc, language)}
              </Text>
              <Text style={[styles.dateSeparator, { color: COLORS.muted }]}>
                ·
              </Text>
              <Text style={[styles.dateFull, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {getFormattedDate(item.createdOn, language)}
              </Text>
            </View>
            {isRtl ? <ChevronLeft size={16} color={COLORS.muted} /> : <ChevronRight size={16} color={COLORS.muted} />}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // ── Stats bar ─────────────────────────────────────────────────────────────
  const renderStats = () => {
    if (!stats) return null;
    return (
      <View
        style={[
          styles.statsContainer,
          { backgroundColor: COLORS.surface, borderColor: COLORS.border },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {stats.totalEntries}
          </Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>
            {jc?.totalEntries || 'Total'}
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: COLORS.border }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {stats.favoriteCount}
          </Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>
            {jc?.favoritesCount || 'Favorites'}
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: COLORS.border }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {stats.entriesThisWeek}
          </Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>
            {jc?.entriesThisWeek || 'This Week'}
          </Text>
        </View>
      </View>
    );
  };

  const hasActiveFilters = search.length > 0 || category !== 'all';

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: COLORS.surface,
              borderBottomColor: COLORS.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            {isRtl ? <ChevronRight size={24} color={COLORS.text} /> : <ChevronLeft size={24} color={COLORS.text} />}
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.headerTitle, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
              {jc?.myJournal || 'My Journal'}
            </Text>
            {stats && (
              <Text
                style={[styles.headerSubtitle, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}
              >
                {stats.totalEntries}{' '}
                {stats.totalEntries === 1 ? (jc?.entryLabel || 'entry') : (jc?.entriesLabel || 'entries')} ·{' '}
                {stats.entriesThisWeek} {jc?.thisWeekLabel || 'this week'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: COLORS.primary }]}
            onPress={handleCreateNew}
            activeOpacity={0.8}
          >
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: COLORS.surface, borderColor: COLORS.border, flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            <Search size={16} color={COLORS.muted} />
            <TextInput
              style={[styles.searchInput, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}
              placeholder={jc?.searchEntriesPlaceholder || 'Search entries...'}
              placeholderTextColor={COLORS.muted}
              value={search}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setSearchDebounced('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View
                  style={[
                    styles.clearButton,
                    { backgroundColor: COLORS.muted + '30' },
                  ]}
                >
                  <Text
                    style={[styles.clearButtonText, { color: COLORS.muted }]}
                  >
                    ✕
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Category Filter */}
        <View style={styles.categoryContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={item => item.value}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      category === item.value ? COLORS.primary : COLORS.surface,
                    borderColor:
                      category === item.value ? COLORS.primary : COLORS.border,
                  },
                ]}
                onPress={() => {
                  setCategory(item.value);
                  setPage(0);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: category === item.value ? '#FFFFFF' : COLORS.text,
                    },
                  ]}
                >
                  {getCategoryLabel(item.value, jc)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
        {/* Stats */}
        {!hasActiveFilters && renderStats()}
        {/* Entries List */}
        <FlatList
          data={entries}
          keyExtractor={item => item.id.toString()}
          renderItem={renderEntry}
          contentContainerStyle={[
            styles.listContent,
            entries.length === 0 && !loading
              ? styles.listContentEmpty
              : undefined,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
              progressBackgroundColor={COLORS.surface}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <EmptyState
                hasSearch={search.length > 0}
                currentCategory={category}
                onCreateNew={handleCreateNew}
                colors={COLORS}
                jc={jc}
              />
            )
          }
          ListFooterComponent={
            hasMore && entries.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />
        <BottomTab activeTab="Journal" setActiveTab={tab => console.log(tab)} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: SPACING.sm,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryContainer: {
    paddingVertical: SPACING.sm,
  },
  categoryList: {
    paddingHorizontal: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
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
    marginVertical: 4,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  entryCard: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
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
    gap: SPACING.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteIndicator: {
    marginRight: 2,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moodEmoji: {
    fontSize: 16,
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
  versePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
  },
  verseQuoteIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  versePreviewText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  scriptureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  scriptureText: {
    fontSize: FONT_SIZES.xs,
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
    flex: 1,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: FONT_SIZES.xs,
    marginHorizontal: 2,
  },
  dateFull: {
    fontSize: FONT_SIZES.xs,
    flex: 1,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
    gap: 4,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl + 20,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl + 20,
  },
  footerLoader: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
});

export default JournalList;

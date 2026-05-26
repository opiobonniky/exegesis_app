import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Clock, History, TimerIcon, Trash2 } from 'lucide-react-native';

import { useLanguage } from '../../component/language-translation/LanguageProvider';
import { sendPostRequest } from '../../services/api';
import {
  getColors,
  createThemeStyles,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import { route } from '../../component/navigations/routes';
import ActionHeader from '../../reusable/ActionHeader';
import ActionModal from '../../reusable/ActionModal';
import { formatWhatsAppTime, getVerseText } from '../../utilits/bibleUtils';
import { AppContext } from '../../common/AppContext';
import { showToast } from '../../helpers/Toash.helper';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ReadHistoryItem {
  id: number;
  bookName: string;
  chapter: number;
  lastVerse?: number;
  readAt: string;
}

interface DeleteModalState {
  visible: boolean;
  type: 'single' | 'all' | null;
  itemId?: number;
  itemName?: string;
}

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDateHeader = (dateKey: string, bc?: any) => {
  const date = new Date(dateKey);
  const now = new Date();
  const yest = new Date();
  yest.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return bc?.today || 'Today';
  if (date.toDateString() === yest.toDateString()) return bc?.yesterday || 'Yesterday';

  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const normaliseItem = (item: any): ReadHistoryItem => ({
  id: item.id,
  bookName: item.bookName,
  chapter: item.chapter,
  lastVerse: item.verseNumber,
  readAt: item.updatedOn || item.createdOn,
});

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton shimmer
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard({ COLORS }: { COLORS: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        elevation: 2,
      }}
    >
      <View
        style={{
          backgroundColor: COLORS.muted,
          borderRadius: 4,
          height: 16,
          width: '55%',
          marginBottom: SPACING.sm,
        }}
      />
      <View
        style={{
          backgroundColor: COLORS.muted,
          borderRadius: 4,
          height: 12,
          width: '35%',
        }}
      />
    </Animated.View>
  );
}

function SkeletonSection({ COLORS }: { COLORS: any }) {
  return (
    <View style={{ marginBottom: SPACING.xxl }}>
      <View
        style={{
          backgroundColor: COLORS.muted,
          borderRadius: 4,
          height: 10,
          width: 70,
          marginBottom: SPACING.md,
          opacity: 0.4,
        }}
      />
      {[1, 2, 3, 4, 5].map(k => (
        <SkeletonCard key={k} COLORS={COLORS} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the flat list data (date headers + items interleaved)
// ─────────────────────────────────────────────────────────────────────────────
type ListRow =
  | { type: 'header'; dateKey: string }
  | { type: 'item'; item: ReadHistoryItem };

function buildListData(items: ReadHistoryItem[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastDate = '';

  items.forEach(item => {
    const dateKey = new Date(item.readAt).toISOString().slice(0, 10);
    if (dateKey !== lastDate) {
      rows.push({ type: 'header', dateKey });
      lastDate = dateKey;
    }
    rows.push({ type: 'item', item });
  });

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ReadHistory() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ✅ NEW
  const [loadingMore, setLoadingMore] = useState(false);
  const [history, setHistory] = useState<ReadHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    visible: false,
    type: null,
  });

  const { language, translations } = useLanguage();
  const isRtl = language === 'ar';
  const bc = translations?.bible;

  if (!app) return null;
  const { isDark } = app;
  const COLORS = getColors(isDark);
  const themeStyle = createThemeStyles(COLORS);

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (pageIndex: number, replace = false) => {
      // ✅ keep skeleton ONLY for first load
      if (pageIndex === 0 && !refreshing && replace) setInitialLoading(true);
      else if (pageIndex === 0 && replace) setRefreshing(true);
      else setLoadingMore(true);

      try {
        const response = await sendPostRequest('bible', 'get-read-history', {
          page: pageIndex,
          pageSize: PAGE_SIZE,
        });

        if (response.returnCode === 200 && response.returnData) {
          const { readHistories: content, totalCount: totalElements } =
            response.returnData;

          const normalised: ReadHistoryItem[] = (content || [])
            .map(normaliseItem)
            .sort(
              (a: ReadHistoryItem, b: ReadHistoryItem) =>
                new Date(b.readAt).getTime() - new Date(a.readAt).getTime(),
            );

          setHistory(prev => (replace ? normalised : [...prev, ...normalised]));
          setHasMore(false);
          setTotalCount(totalElements);
          setPage(pageIndex);
        }
      } catch (e: any) {
        showToast('error', e.message || 'Failed to load read history');
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [refreshing],
  );

  useEffect(() => {
    fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = () => {
    // ✅ don’t paginate while refreshing
    if (!loadingMore && !refreshing && hasMore) {
      fetchPage(page + 1);
    }
  };

  // ✅ Pull-to-refresh
  const onRefresh = useCallback(() => {
    if (loadingMore) return;
    // reset paging state and reload page 0
    setHasMore(true);
    fetchPage(0, true);
  }, [fetchPage, loadingMore]);

  // ── delete ───────────────────────────────────────────────────────────────
  const handleDeleteSingle = async (historyId: number) => {
    try {
      const response = await sendPostRequest('bible', 'delete-read-history', {
        readHistoryIds: [historyId],
      });
      if (response.returnCode === 200) {
        setHistory(prev => prev.filter(item => item.id !== historyId));
        setTotalCount(prev => Math.max(0, prev - 1));
        showToast('success', response.returnMessage || (bc?.historyItemsDeleted || '{count} history items deleted').replace('{count}', '1'));
        fetchPage(0, true); // Refresh to ensure pagination integrity
      } else {
        showToast(
          'error',
          response.returnMessage || 'Failed to delete history item',
        );
      }
    } catch (e: any) {
      showToast('error', e.message || 'Error deleting history item');
    }
  };

  const handleClearAll = async () => {
    try {
      const allIds = history.map(item => item.id);
      const response = await sendPostRequest('bible', 'delete-read-history', {
        readHistoryIds: allIds,
      });
      if (response.returnCode === 200) {
        setHistory([]);
        setTotalCount(0);
        setHasMore(false);
        showToast('success', (bc?.historyItemsDeleted || '{count} history items deleted').replace('{count}', String(allIds.length)));
        fetchPage(0, true); // Refresh to ensure pagination integrity
      } else {
        showToast('error', response.returnMessage || 'Failed to clear history');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Error clearing history');
    }
  };

  const confirmDelete = async () => {
    setDeleteModal({ visible: false, type: null });
    if (deleteModal.type === 'single' && deleteModal.itemId) {
      await handleDeleteSingle(deleteModal.itemId);
    } else if (deleteModal.type === 'all') {
      await handleClearAll();
    }
  };

  // ── list data ─────────────────────────────────────────────────────────────
  const listData = useMemo(() => buildListData(history), [history]);

  // ── styles ────────────────────────────────────────────────────────────────
  const S = {
    dateTitle: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '700' as const,
      color: COLORS.muted,
      marginBottom: SPACING.md,
      marginTop: SPACING.sm,
      textTransform: 'uppercase' as const,
      textAlign: isRtl ? 'right' as const : 'left' as const,
    },
    historyCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      flexDirection: (isRtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    cardContent: { flex: 1 },
    cardHeader: {
      flexDirection: (isRtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: SPACING.xs,
    },
    bookText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700' as const,
      color: COLORS.text,
      textAlign: isRtl ? 'right' as const : 'left' as const,
    },
    timeText: { fontSize: FONT_SIZES.sm, color: COLORS.muted },
    chapterText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.textSecondary,
      textAlign: isRtl ? 'right' as const : 'left' as const,
    },
    deleteButton: { padding: SPACING.sm, marginLeft: isRtl ? 0 : SPACING.md, marginRight: isRtl ? SPACING.md : 0 },
    clearAllButton: {
      backgroundColor: COLORS.error,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
      alignItems: 'center' as const,
    },
    clearAllText: {
      color: '#FFF',
      fontSize: FONT_SIZES.md,
      fontWeight: '700' as const,
    },
    emptyContainer: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: SPACING.xxxl,
    },
    emptyTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700' as const,
      color: COLORS.text,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    emptyText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.muted,
      textAlign: 'center' as const,
    },
    footerLoader: {
      paddingVertical: SPACING.xl,
      alignItems: 'center' as const,
    },
  };

  // ── render row ────────────────────────────────────────────────────────────
  const renderRow = ({ item: row }: { item: ListRow }) => {
    if (row.type === 'header') {
      return <Text style={S.dateTitle}>{formatDateHeader(row.dateKey, bc)}</Text>;
    }

    const { item } = row;
    return (
      <View style={S.historyCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={S.cardContent}
          onPress={() =>
            navigation.navigate(route.bible, {
              bookName: item.bookName,
              chapter: item.chapter,
              verse: item.lastVerse || 1,
            })
          }
        >
          <View style={S.cardHeader}>
            <Text style={S.bookText}>{item.bookName}</Text>
            <Text style={S.timeText}>{formatWhatsAppTime(item.readAt)}</Text>
          </View>
          <Text style={S.chapterText}>
            {bc?.chapter || 'Chapter'} {item.chapter}
            {item.lastVerse ? `:${item.lastVerse}` : ''}
            {item.lastVerse
              ? ` • ${getVerseText(item.bookName, item.chapter, item.lastVerse)}`
              : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={S.deleteButton}
          onPress={() =>
            setDeleteModal({
              visible: true,
              type: 'single',
              itemId: item.id,
              itemName: `${item.bookName} ${item.chapter}`,
            })
          }
          activeOpacity={0.6}
        >
          <Trash2 size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const ListHeader =
    history.length > 0 ? (
      <TouchableOpacity
        style={S.clearAllButton}
        onPress={() => setDeleteModal({ visible: true, type: 'all' })}
        activeOpacity={0.8}
      >
        <Text style={S.clearAllText}>
          {(bc?.clearHistoryButton || 'clear {count} items of {total} history items')
            .replace('{count}', String(history.length))
            .replace('{total}', String(totalCount))}
        </Text>
      </TouchableOpacity>
    ) : null;

  const ListFooter = loadingMore ? (
    <View style={S.footerLoader}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  ) : null;

  const EmptyComponent = (
    <View style={S.emptyContainer}>
      <Clock size={48} color={COLORS.muted} />
      <Text style={S.emptyTitle}>{bc?.noHistory || 'No Reading History'}</Text>
      <Text style={S.emptyText}>
        {bc?.noHistorySubtitle || 'Start reading and your history will appear here'}
      </Text>
    </View>
  );

  return (
    <View style={themeStyle.container}>
      <ActionHeader
        title={bc?.readingHistory || 'Reading History'}
        onPress={() => navigation.goBack()}
        rightComponent={<History size={30} color={COLORS.text} />}
      />

      {initialLoading ? (
        <View style={{ padding: SPACING.lg }}>
          <SkeletonSection COLORS={COLORS} />
          <SkeletonSection COLORS={COLORS} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(row, index) =>
            row.type === 'header'
              ? `header-${row.dateKey}`
              : `item-${row.item.id}-${index}`
          }
          renderItem={renderRow}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={EmptyComponent}
          contentContainerStyle={{
            padding: SPACING.lg,
            paddingBottom: SPACING.xxxl,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ActionModal
        visible={deleteModal.visible}
        title={
          deleteModal.type === 'all'
            ? `${history.length} ${bc?.readingHistory || 'History Items'}`
            : (bc?.deleteHistoryItem || 'Delete History Item?')
        }
        message={
          deleteModal.type === 'all'
            ? (bc?.deleteAllConfirm || 'This will permanently delete {count} reading history items. This action cannot be undone.')
              .replace('{count}', String(history.length))
            : (bc?.deleteSingleConfirm || 'Are you sure you want to delete "{name}" from your reading history?')
              .replace('{name}', deleteModal.itemName || '')
        }
        severity="warning"
        confirmLabel={bc?.delete || 'Delete'}
        cancelLabel={bc?.cancel || 'Cancel'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ visible: false, type: null })}
      />
    </View>
  );
}

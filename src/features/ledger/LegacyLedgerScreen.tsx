/**
 * LegacyLedgerScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The Legacy Ledger — user's study archive.
 * Enhanced from JournalList.tsx with:
 *   - "Legacy Ledger" branding
 *   - Public/private filter + badge
 *   - "Exegesis Lab" source badge
 *   - Strong's word filter
 *   - Bulk export (.txt/.json)
 *   - Date range + book filters
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
  Share,
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
  getPublicJournalEntries,
  JournalEntry,
  JournalStats,
  getJournalStats,
  toggleJournalFavorite,
  deleteJournalEntry,
  exportAllJournalEntries,
} from '../../services/api';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  cacheJournalEntry,
  cacheJournalEntryList,
  getCachedJournalEntryList,
} from '../../services/journalCache';
import { useConnectivity } from '../../providers/ConnectivityProvider';
import { getVerseText } from '../../utilits/bibleUtils';
import {
  Search,
  Plus,
  Star,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Trash2,
  PenLine,
  MessageSquareQuote,
  Clock,
  BookText,
  Download,
  Users,
  Globe,
  Calendar,
  X,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';
import BottomTab from '../../component/navigations/BottomTab';
import DatePickerInput from '../../reusable/DatePickerInput';

// atob is available in Hermes (React Native 0.70+) via the global scope
declare const atob: (input: string) => string;

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all' },
  { value: 'study' },
  { value: 'prayer' },
  { value: 'gratitude' },
  { value: 'reflection' },
  { value: 'application' },
  { value: 'general' },
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
  isDiscover,
}: {
  hasSearch: boolean;
  currentCategory: string;
  onCreateNew: () => void;
  colors: ReturnType<typeof getColors>;
  jc: any;
  isDiscover?: boolean;
}) => {
  const hasCategoryFilter = currentCategory !== 'all';
  let title = jc?.noEntries || 'No journal entries yet';
  let subtitle = jc?.noEntriesSubtitle || 'Complete an Exegesis Lab session or write a journal entry.';
  let icon = <BookText size={48} color={colors.muted} />;

  if (isDiscover && !hasSearch && !hasCategoryFilter) {
    title = 'No community entries yet';
    subtitle = 'Entries from other users will appear here once people start sharing.';
    icon = <Globe size={48} color={colors.muted} />;
  } else if (hasSearch && hasCategoryFilter) {
    title = jc?.noEntries || 'No matching entries';
    subtitle = jc?.noEntriesSubtitle || 'Try adjusting your search or clearing filters.';
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
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
        {icon}
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
              {!hasSearch && !isDiscover && (
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
      style={[styles.deleteAction, { backgroundColor: '#DC2626', transform: [{ scale }] }]}
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
        { backgroundColor: colors.primary + '10', borderLeftColor: colors.primary + '40' },
      ]}
    >
      <MessageSquareQuote size={12} color={colors.primary + '60'} style={styles.verseQuoteIcon} />
      <Text style={[styles.versePreviewText, { color: colors.textSecondary }]} numberOfLines={2}>
        "{verseText}"
      </Text>
    </View>
  );
};

// ── Export Modal Content ─────────────────────────────────────────────────────

const ExportModal = ({
  onClose,
  colors,
  jc,
}: {
  onClose: () => void;
  colors: ReturnType<typeof getColors>;
  jc: any;
}) => {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'txt' | 'json' | 'pdf'>('txt');

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportAllJournalEntries(format);
      if (res.returnCode === 200 && res.returnData) {
        const data = res.returnData!;

        if (format === 'pdf') {
          const filename = data.filename || 'legacy-ledger-export.pdf';
          const pdfPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;
          await ReactNativeBlobUtil.fs.writeFile(pdfPath, data.content!, 'base64');
          if (Platform.OS === 'android') {
            await (ReactNativeBlobUtil.fs as any).actionViewIntent(pdfPath, 'application/pdf');
          } else {
            await Share.share({
              url: `file://${pdfPath}`,
              title: filename,
            });
          }
        } else {
          const decoded = decodeURIComponent(escape(atob(data.content || '')));
          await Share.share({
            message: decoded,
            title: data.filename || 'legacy-ledger-export',
          });
        }
        showToast('success', `Exported ${data.entryCount} entries`);
        onClose();
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.exportModal, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.exportModalTitle, { color: colors.text }]}>
        {jc?.exportLabel || 'Export Legacy Ledger'}
      </Text>
      <Text style={[styles.exportModalSubtitle, { color: colors.textSecondary }]}>
        {jc?.exportSubtitle || 'Choose a format to export all your entries.'}
      </Text>

      {/* Format selector */}
      <View style={styles.exportFormatRow}>
        <TouchableOpacity
          style={[
            styles.exportFormatBtn,
            {
              backgroundColor: format === 'txt' ? colors.primary : colors.surface,
              borderColor: format === 'txt' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFormat('txt')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.exportFormatText,
              { color: format === 'txt' ? '#FFFFFF' : colors.text },
            ]}
          >
            .txt
          </Text>
          <Text
            style={[
              styles.exportFormatDesc,
              { color: format === 'txt' ? '#FFFFFFCC' : colors.textSecondary },
            ]}
          >
            {jc?.txtFormat || 'Plain Text'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.exportFormatBtn,
            {
              backgroundColor: format === 'json' ? colors.primary : colors.surface,
              borderColor: format === 'json' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFormat('json')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.exportFormatText,
              { color: format === 'json' ? '#FFFFFF' : colors.text },
            ]}
          >
            .json
          </Text>
          <Text
            style={[
              styles.exportFormatDesc,
              { color: format === 'json' ? '#FFFFFFCC' : colors.textSecondary },
            ]}
          >
            {jc?.jsonFormat || 'Structured Data'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.exportFormatBtn,
            {
              backgroundColor: format === 'pdf' ? colors.primary : colors.surface,
              borderColor: format === 'pdf' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFormat('pdf')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.exportFormatText,
              { color: format === 'pdf' ? '#FFFFFF' : colors.text },
            ]}
          >
            .pdf
          </Text>
          <Text
            style={[
              styles.exportFormatDesc,
              { color: format === 'pdf' ? '#FFFFFFCC' : colors.textSecondary },
            ]}
          >
            {jc?.pdfFormat || 'Formatted Document'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.exportActions}>
        <TouchableOpacity
          style={[styles.exportCancelBtn, { borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.exportCancelText, { color: colors.text }]}>
            {jc?.cancelLabel || 'Cancel'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportSubmitBtn, { backgroundColor: colors.primary, opacity: exporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.8}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Download size={16} color="#FFFFFF" />
              <Text style={styles.exportSubmitText}>
                {jc?.exportAction || 'Export'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LegacyLedgerScreen = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const jc = translations?.journal;
  const { isOnline } = useConnectivity();

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
  const [viewMode, setViewMode] = useState<'my' | 'discover'>('my');
  const [showExportModal, setShowExportModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchDebounced(text);
    }, 400);
  }, []);

  const fetchEntries = useCallback(
    async (pageNum = 0, refresh = false) => {
      const filterKey = `${searchDebounced || ''}_${category}_${startDate}_${endDate}`;
      try {
        if (refresh) setRefreshing(true);
        else if (pageNum === 0) setLoading(true);

        const payload: any = { page: pageNum, pageSize: 20 };
        if (searchDebounced) payload.search = searchDebounced;
        if (category !== 'all') payload.category = category;
        if (startDate) payload.startDate = startDate;
        if (endDate) payload.endDate = endDate;

        if (viewMode === 'discover') {
          const res = await getPublicJournalEntries(payload);
          if (res.returnCode === 200 && res.returnData) {
            const entriesData = res.returnData;
            if (pageNum === 0) setEntries(entriesData.entries || []);
            else setEntries(prev => [...prev, ...(entriesData.entries || [])]);
            setHasMore(entriesData.hasNext || false);
            if (pageNum === 0 && entriesData.entries) {
              entriesData.entries.forEach(e => cacheJournalEntry(e));
            }
          }
        } else {
          const res = await getAllJournalEntries(payload);
          if (res.returnCode === 200 && res.returnData) {
            const entriesData = res.returnData;
            if (pageNum === 0) setEntries(entriesData.entries || []);
            else setEntries(prev => [...prev, ...(entriesData.entries || [])]);
            setHasMore(entriesData.hasNext || false);
            if (pageNum === 0 && entriesData.entries) {
              entriesData.entries.forEach(e => cacheJournalEntry(e));
              cacheJournalEntryList(entriesData.entries, pageNum, filterKey);
            }
          }
        }
      } catch (error) {
        if (pageNum === 0) {
          const cached = await getCachedJournalEntryList(0, filterKey);
          if (cached) {
            setEntries(cached);
            showToast('info', 'Showing cached entries');
          } else {
            showToast('error', jc?.failedToLoadEntry || 'Failed to load entries');
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchDebounced, category, viewMode, startDate, endDate, jc],
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await getJournalStats();
      if (res.returnCode === 200 && res.returnData) setStats(res.returnData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchEntries(0);
    if (viewMode === 'my') fetchStats();
  }, [category, searchDebounced, viewMode, fetchEntries, fetchStats]);

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
            entry.id === id ? { ...entry, isFavorite: !entry.isFavorite } : entry,
          ),
        );
      }
    } catch (error) {
      showToast('error', jc?.failedToUpdateFavorite || 'Failed to update favorite');
    }
  }, [jc]);

  const confirmDelete = useCallback((entry: JournalEntry) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [(translations?.bible?.cancel || 'Cancel'), (jc?.deleteAction || 'Delete')],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: jc?.deleteConfirmTitle || 'Delete Entry',
          message: entry.title
            ? (jc?.deleteConfirmMessageWithTitle || 'Delete "{title}"?').replace('{title}', entry.title)
            : (jc?.deleteConfirmMessage || 'Delete this entry?'),
        },
        buttonIndex => {
          if (buttonIndex === 1) handleDelete(entry.id);
        },
      );
    } else {
      Alert.alert(
        jc?.deleteConfirmTitle || 'Delete Entry',
        (entry.title
          ? (jc?.deleteConfirmMessageWithTitle || 'Delete "{title}"?').replace('{title}', entry.title)
          : (jc?.deleteConfirmMessage || 'Delete this entry?')) + '\n\n' + 'This cannot be undone.',
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

  const handleEntryPress = useCallback((entry: JournalEntry) => {
    navigation.navigate(route.ledgerDetail, { entryId: entry.id });
  }, [navigation]);

  const handleCreateNew = useCallback(() => {
    navigation.navigate(route.ledgerEntry, {});
  }, [navigation]);

  const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;

  const renderEntry = ({ item }: { item: JournalEntry & { user?: { id: string; firstName: string; lastName: string; username: string } } }) => {
    const moodEmoji = item.mood ? MOOD_EMOJIS[item.mood] : null;
    const isDiscover = viewMode === 'discover';
    const author = item.user;

    return (
      <Swipeable
        renderRightActions={isDiscover ? undefined : (progress, dragX) => <DeleteAction progress={progress} dragX={dragX} colors={COLORS} jc={jc} />}
        onSwipeableOpen={isDiscover ? undefined : () => confirmDelete(item)}
        overshootRight={false}
        rightThreshold={40}
      >
        <TouchableOpacity
          style={[styles.entryCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
          onPress={() => handleEntryPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.entryHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.entryMeta, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              {!!item.category && (
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                  <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                    {getCategoryLabel(item.category, jc)}
                  </Text>
                </View>
              )}
              {!!moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
              {isDiscover && author && (
                <View style={[styles.authorBadge, { backgroundColor: '#8B5CF620' }]}>
                  <Users size={10} color="#8B5CF6" />
                  <Text style={[styles.authorBadgeText, { color: '#8B5CF6' }]} numberOfLines={1}>
                    {author.firstName || author.username || 'Anonymous'}
                  </Text>
                </View>
              )}
              {item.source === 'exegesis-lab' && (
                <View style={[styles.sourceBadge, { backgroundColor: '#3B82F620' }]}>
                  <BookText size={10} color="#3B82F6" />
                  <Text style={[styles.sourceBadgeText, { color: '#3B82F6' }]}>Lab</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {!isDiscover && item.isFavorite === true && (
                <Star size={14} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 2 }} />
              )}
              {!isDiscover && (
                <TouchableOpacity onPress={() => handleToggleFavorite(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {item.isFavorite ? (
                    <Star size={18} color="#F59E0B" fill="#F59E0B" />
                  ) : (
                    <Star size={18} color={COLORS.muted} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!!item.title && (
            <Text style={[styles.entryTitle, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
              {String(item.title)}
            </Text>
          )}

          <Text style={[styles.entryContent, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={3}>
            {String(item.content ?? '')}
          </Text>

          {!!item.bookName && item.chapter != null && item.verseNumber != null && (
            <VersePreview bookName={item.bookName} chapter={item.chapter} verseNumber={item.verseNumber} colors={COLORS} />
          )}

          {!!item.bookName && (
            <View style={[styles.scriptureRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <BookOpen size={12} color={COLORS.muted} />
              <Text style={[styles.scriptureText, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {`${String(item.bookName ?? '')} ${String(item.chapter ?? '')}:${String(item.verseNumber ?? '')}`}
              </Text>
            </View>
          )}

          <View style={styles.entryFooter}>
            <View style={[styles.dateRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Clock size={12} color={COLORS.muted} />
              <Text style={[styles.dateText, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {getRelativeTime(item.createdOn, jc, language)}
              </Text>
              <Text style={[styles.dateSeparator, { color: COLORS.muted }]}>·</Text>
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

  const renderStats = () => {
    if (!stats) return null;
    return (
      <View style={[styles.statsContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.totalEntries}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{jc?.totalEntries || 'Total'}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: COLORS.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.favoriteCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{jc?.favoritesCount || 'Favorites'}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: COLORS.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.entriesThisWeek}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{jc?.entriesThisWeek || 'This Week'}</Text>
        </View>
      </View>
    );
  };

  const hasActiveFilters = search.length > 0 || category !== 'all' || startDate.length > 0 || endDate.length > 0;

  const renderExportModal = () => {
    if (!showExportModal) return null;
    return (
      <View style={styles.exportOverlay}>
        <TouchableOpacity style={styles.exportOverlayBg} activeOpacity={1} onPress={() => setShowExportModal(false)} />
        <ExportModal onClose={() => setShowExportModal(false)} colors={COLORS} jc={jc} />
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.backButton} activeOpacity={0.7}>
            {isRtl ? <ChevronRight size={24} color={COLORS.text} /> : <ChevronLeft size={24} color={COLORS.text} />}
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.headerTitle, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
              Legacy Ledger
            </Text>
            {stats && (
              <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
                {stats.totalEntries} {stats.totalEntries === 1 ? 'entry' : 'entries'} · {stats.entriesThisWeek} this week
              </Text>
            )}
          </View>
          {viewMode === 'my' && (
            <TouchableOpacity style={[styles.exportHeaderBtn, { borderColor: COLORS.border }]} onPress={() => setShowExportModal(true)} activeOpacity={0.7}>
              <Download size={18} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {viewMode === 'my' && (
            <TouchableOpacity style={[styles.addButton, { backgroundColor: COLORS.primary }]} onPress={handleCreateNew} activeOpacity={0.8}>
              <Plus size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Segment Control ── */}
        <View style={[styles.segmentContainer, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'my' ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
            onPress={() => setViewMode('my')}
            activeOpacity={0.7}
          >
            <BookText size={14} color={viewMode === 'my' ? '#FFFFFF' : COLORS.text} />
            <Text style={[styles.segmentBtnText, { color: viewMode === 'my' ? '#FFFFFF' : COLORS.text }]}>My Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'discover' ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
            onPress={() => setViewMode('discover')}
            activeOpacity={0.7}
          >
            <Globe size={14} color={viewMode === 'discover' ? '#FFFFFF' : COLORS.text} />
            <Text style={[styles.segmentBtnText, { color: viewMode === 'discover' ? '#FFFFFF' : COLORS.text }]}>Community</Text>
          </TouchableOpacity>
        </View>

        {/* ── Offline Banner ── */}
        {isOnline === false && (
          <View style={[styles.offlineBanner, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.offlineBannerText}>
              You are offline — showing cached content
            </Text>
          </View>
        )}

        {/* ── Search Bar ── */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: COLORS.surface, borderColor: COLORS.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
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
              <TouchableOpacity onPress={() => { setSearch(''); setSearchDebounced(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={[styles.clearButton, { backgroundColor: COLORS.muted + '30' }]}>
                  <Text style={[styles.clearButtonText, { color: COLORS.muted }]}>✕</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Category filter ── */}
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
                    backgroundColor: category === item.value ? COLORS.primary : COLORS.surface,
                    borderColor: category === item.value ? COLORS.primary : COLORS.border,
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
                    { color: category === item.value ? '#FFFFFF' : COLORS.text },
                  ]}
                >
                  {getCategoryLabel(item.value, jc)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ── Date Range Filter ── */}
        {viewMode === 'my' && (
          <View style={styles.dateFilterContainer}>
            <View style={styles.dateFilterRow}>
              <TouchableOpacity
                style={[
                  styles.dateFilterChip,
                  {
                    backgroundColor: startDate ? COLORS.primary + '15' : COLORS.surface,
                    borderColor: startDate ? COLORS.primary : COLORS.border,
                  },
                ]}
                onPress={() => setShowStartDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={12} color={startDate ? COLORS.primary : COLORS.muted} />
                <Text
                  style={[
                    styles.dateFilterChipText,
                    { color: startDate ? COLORS.primary : COLORS.muted },
                  ]}
                  numberOfLines={1}
                >
                  {startDate
                    ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : (jc?.startDateLabel || 'Start Date')}
                </Text>
                {startDate && (
                  <TouchableOpacity
                    onPress={() => { setStartDate(''); setPage(0); }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <X size={12} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <Text style={[styles.dateFilterSeparator, { color: COLORS.muted }]}>→</Text>

              <TouchableOpacity
                style={[
                  styles.dateFilterChip,
                  {
                    backgroundColor: endDate ? COLORS.primary + '15' : COLORS.surface,
                    borderColor: endDate ? COLORS.primary : COLORS.border,
                  },
                ]}
                onPress={() => setShowEndDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={12} color={endDate ? COLORS.primary : COLORS.muted} />
                <Text
                  style={[
                    styles.dateFilterChipText,
                    { color: endDate ? COLORS.primary : COLORS.muted },
                  ]}
                  numberOfLines={1}
                >
                  {endDate
                    ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : (jc?.endDateLabel || 'End Date')}
                </Text>
                {endDate && (
                  <TouchableOpacity
                    onPress={() => { setEndDate(''); setPage(0); }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <X size={12} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {(startDate || endDate) && (
                <TouchableOpacity
                  style={styles.dateFilterClearBtn}
                  onPress={() => { setStartDate(''); setEndDate(''); setPage(0); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateFilterClearText, { color: COLORS.error || '#EF4444' }]}>
                    {jc?.clearFilterLabel || 'Clear'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Date Pickers (hidden modals) ── */}
        {showStartDatePicker && (
          <View style={styles.datePickerModalWrapper}>
            <TouchableOpacity style={styles.datePickerOverlay} activeOpacity={1} onPress={() => setShowStartDatePicker(false)} />
            <View style={[styles.datePickerModal, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
              <DatePickerInput
                value={startDate}
                placeholder={jc?.startDateLabel || 'Start Date'}
                onChangeDate={(date) => { setStartDate(date); setShowStartDatePicker(false); setPage(0); }}
                maximumDate={endDate ? new Date(endDate + 'T00:00:00') : new Date()}
              />
              <TouchableOpacity
                style={[styles.datePickerCancelBtn, { borderColor: COLORS.border }]}
                onPress={() => setShowStartDatePicker(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.datePickerCancelText, { color: COLORS.text }]}>
                  {translations?.bible?.cancel || 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {showEndDatePicker && (
          <View style={styles.datePickerModalWrapper}>
            <TouchableOpacity style={styles.datePickerOverlay} activeOpacity={1} onPress={() => setShowEndDatePicker(false)} />
            <View style={[styles.datePickerModal, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
              <DatePickerInput
                value={endDate}
                placeholder={jc?.endDateLabel || 'End Date'}
                onChangeDate={(date) => { setEndDate(date); setShowEndDatePicker(false); setPage(0); }}
                minimumDate={startDate ? new Date(startDate + 'T00:00:00') : undefined}
                maximumDate={new Date()}
              />
              <TouchableOpacity
                style={[styles.datePickerCancelBtn, { borderColor: COLORS.border }]}
                onPress={() => setShowEndDatePicker(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.datePickerCancelText, { color: COLORS.text }]}>
                  {translations?.bible?.cancel || 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Stats (my entries only) ── */}
        {viewMode === 'my' && !hasActiveFilters && renderStats()}

        {/* ── Entries List ── */}
        <FlatList
          key={viewMode}
          data={entries}
          keyExtractor={item => item.id.toString()}
          renderItem={renderEntry}
          contentContainerStyle={[
            styles.listContent,
            entries.length === 0 && !loading ? styles.listContentEmpty : undefined,
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
                isDiscover={viewMode === 'discover'}
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

        {/* ── Export modal ── */}
        {renderExportModal()}
      </SafeAreaView>

      <BottomTab activeTab="ledger" setActiveTab={tab => console.log(tab)} />
    </GestureHandlerRootView>
  );
};  // ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // ── Segment Control ──
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  segmentBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600' },

  // ── Author badge (discover mode) ──
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 120,
  },
  authorBadgeText: { fontSize: 9, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { marginRight: SPACING.sm },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700' },
  headerSubtitle: { fontSize: FONT_SIZES.xs, marginTop: 2 },
  exportHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
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
  searchContainer: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs, paddingBottom: 0 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.md, paddingVertical: Platform.OS === 'ios' ? 4 : 0 },
  clearButton: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 12, fontWeight: '700' },

  // ── Category filter ──
  categoryContainer: { paddingVertical: SPACING.xs },
  categoryList: { paddingHorizontal: SPACING.md },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: FONT_SIZES.sm, fontWeight: '600' },

  // ── Stats ──
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 1 },
  statDivider: { width: 1, marginVertical: 4 },

  // ── List ──
  listContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 120 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },

  // ── Entry card ──
  entryCard: { padding: SPACING.md, borderRadius: 12, marginBottom: SPACING.sm, borderWidth: 1 },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  moodEmoji: { fontSize: 16 },

  // ── Privacy badge ──
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privacyBadgeText: { fontSize: 9, fontWeight: '700' },

  // ── Source badge ──
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sourceBadgeText: { fontSize: 9, fontWeight: '700' },

  entryTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', marginBottom: SPACING.xs },
  entryContent: { fontSize: FONT_SIZES.sm, lineHeight: 20, marginBottom: SPACING.sm },
  versePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
  },
  verseQuoteIcon: { marginRight: 6, marginTop: 2 },
  versePreviewText: { flex: 1, fontSize: FONT_SIZES.xs, fontStyle: 'italic', lineHeight: 16 },
  scriptureRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm },
  scriptureText: { fontSize: FONT_SIZES.xs },
  entryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  dateText: { fontSize: FONT_SIZES.xs, fontWeight: '500' },
  dateSeparator: { fontSize: FONT_SIZES.xs, marginHorizontal: 2 },
  dateFull: { fontSize: FONT_SIZES.xs, flex: 1 },

  // ── Date Range Filter ──
  dateFilterContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateFilterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateFilterChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    flex: 1,
  },
  dateFilterSeparator: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  dateFilterClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateFilterClearText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  datePickerModalWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  datePickerModal: {
    width: '85%',
    maxWidth: 360,
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  datePickerCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  datePickerCancelText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // ── Delete action ──
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 12, marginBottom: SPACING.sm, marginLeft: SPACING.sm, gap: 4 },
  deleteActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // ── Empty state ──
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxl + 20, paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: FONT_SIZES.sm, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.sm },
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
  emptyButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: FONT_SIZES.sm },

  // ── Loading ──
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxl + 20 },
  footerLoader: { alignItems: 'center', paddingVertical: SPACING.md },

  // ── Export modal ──
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  exportOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  exportModal: {
    width: '85%',
    maxWidth: 360,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  exportModalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  exportModalSubtitle: { fontSize: FONT_SIZES.sm, textAlign: 'center', marginBottom: SPACING.lg },
  exportFormatRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  exportFormatBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  exportFormatText: { fontSize: FONT_SIZES.lg, fontWeight: '700' },
  exportFormatDesc: { fontSize: FONT_SIZES.xs, marginTop: 2 },
  exportActions: { flexDirection: 'row', gap: SPACING.md },
  exportCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportCancelText: { fontSize: FONT_SIZES.sm, fontWeight: '600' },
  exportSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exportSubmitText: { color: '#FFFFFF', fontWeight: '600', fontSize: FONT_SIZES.sm },
  offlineBanner: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LegacyLedgerScreen;

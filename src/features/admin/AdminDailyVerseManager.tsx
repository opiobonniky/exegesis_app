import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getAllDailyVerses,
  deleteDailyVerse,
  DailyVerse,
} from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  Plus,
  CheckCircle2,
  Trash2,
  Pencil,
  Sun,
  Book,
  Calendar,
  Lightbulb,
  XCircle,
  Search,
  Filter,
  X,
  ChevronDown,
  RotateCcw,
} from 'lucide-react-native';
import { getVerseText, getChaptersForBook, getVersesForChapter } from '../../utilits/bibleUtils';
import { getVersionById } from '../../assets/bibleVersion/json/bibleVersions';
import BottomTab from '../../component/navigations/BottomTab';
import { showToast } from '../../helpers/Toash.helper';
import DatePickerInput from '../../reusable/DatePickerInput';

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes',
  'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const TESTAMENTS = [
  { value: 'Old', label: 'Old Testament' },
  { value: 'New', label: 'New Testament' },
];

export interface ExtendedDailyVerse extends DailyVerse {
  creatorName?: string;
}

const getTheme = (isDark: boolean) => {
  const colors = getColors(isDark);
  return {
    bg: colors.background,
    surface: colors.surface,
    cardBackground: colors.cardBackground,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    muted: colors.muted,
    primary: colors.primary,
    success: colors.success,
    error: colors.error,
  };
};

const AdminDailyVerseManager: React.FC = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = getTheme(isDark);
  const styles = getStyles(theme);

  const [verses, setVerses] = useState<ExtendedDailyVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('adminVerse');

  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [chapterPickerVisible, setChapterPickerVisible] = useState(false);
  const [versePickerVisible, setVersePickerVisible] = useState(false);
  const [testament, setTestament] = useState('');
  const [bookSearch, setBookSearch] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = useCallback(async (filters: Record<string, any>) => {
    setLoading(true);
    try {
      const response = await getAllDailyVerses(0, 50, filters);
      setVerses((response.content as ExtendedDailyVerse[]) || []);
    } catch (error) {
      console.error('Failed to fetch daily verses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const hasActiveFilter = bookName || chapter || verseNumber || startDate || endDate;
    if (!hasActiveFilter) return;
    debounceRef.current = setTimeout(() => {
      const filters: Record<string, any> = {};
      if (bookName.trim()) filters.bookName = bookName.trim();
      if (chapter.trim()) filters.chapter = parseInt(chapter.trim(), 10);
      if (verseNumber.trim()) filters.verseNumber = parseInt(verseNumber.trim(), 10);
      if (startDate.trim()) filters.startDate = startDate.trim();
      if (endDate.trim()) filters.endDate = endDate.trim();
      doFetch(filters);
      setShowFilters(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookName, chapter, verseNumber, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      const filters: Record<string, any> = {};
      if (bookName.trim()) filters.bookName = bookName.trim();
      if (chapter.trim()) filters.chapter = parseInt(chapter.trim(), 10);
      if (verseNumber.trim()) filters.verseNumber = parseInt(verseNumber.trim(), 10);
      if (startDate.trim()) filters.startDate = startDate.trim();
      if (endDate.trim()) filters.endDate = endDate.trim();
      doFetch(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const filters: Record<string, any> = {};
    if (bookName.trim()) filters.bookName = bookName.trim();
    if (chapter.trim()) filters.chapter = parseInt(chapter.trim(), 10);
    if (verseNumber.trim()) filters.verseNumber = parseInt(verseNumber.trim(), 10);
    if (startDate.trim()) filters.startDate = startDate.trim();
    if (endDate.trim()) filters.endDate = endDate.trim();
    await doFetch(filters);
    setRefreshing(false);
  }, [bookName, chapter, verseNumber, startDate, endDate, doFetch]);

  const resetFilters = useCallback(() => {
    setBookName('');
    setChapter('');
    setVerseNumber('');
    setStartDate('');
    setEndDate('');
    setTestament('');
    setBookSearch('');
  }, []);

  const books = testament
    ? TESTAMENTS.find(t => t.value === testament)?.value === 'Old'
      ? BIBLE_BOOKS.slice(0, 39)
      : BIBLE_BOOKS.slice(39)
    : BIBLE_BOOKS;

  const filteredBooks = bookSearch
    ? books.filter((b: string) => b.toLowerCase().includes(bookSearch.toLowerCase()))
    : books;

  const chapterList = bookName ? getChaptersForBook(bookName) : [];
  const verseList = (bookName && chapter)
    ? Object.keys(getVersesForChapter(bookName, parseInt(chapter))).map(Number)
    : [];

  const selectBook = (book: string) => {
    if (book !== bookName) { setChapter(''); setVerseNumber(''); }
    setBookName(book);
    setBookPickerVisible(false);
    setBookSearch('');
  };

  const selectChapter = (ch: number) => {
    if (ch !== parseInt(chapter)) setVerseNumber('');
    setChapter(String(ch));
    setChapterPickerVisible(false);
  };

  const selectVerse = (vs: number) => {
    setVerseNumber(String(vs));
    setVersePickerVisible(false);
  };

  const handleAddPress = () => navigation.navigate('AddDailyVerse');

  const handleEditPress = (verse: DailyVerse) => {
    navigation.navigate('EditDailyVerse', { verse });
  };

  const handleDelete = (verse: DailyVerse) => {
    Alert.alert('Delete Verse', 'Are you sure you want to delete this daily verse?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDailyVerse(verse.id);
            setVerses(prev => prev.filter(v => v.id !== verse.id));
            showToast('success', 'Verse deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete verse');
          }
        },
      },
    ]);
  };

  const renderVerse = ({ item }: { item: ExtendedDailyVerse }) => {
    const formattedDate = item.displayDate && typeof item.displayDate === 'string'
      ? new Date(item.displayDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    return (
      <View style={[styles.verseCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={[styles.verseAccentBar, { backgroundColor: theme.primary }]} />
        <View style={styles.verseCardInner}>
          <View style={styles.verseHeader}>
            <View style={styles.verseRef}>
              <Book size={14} color={theme.primary} />
              <Text style={[styles.verseRefText, { color: theme.text }]}>
                {item.bookName} {item.chapter}:{item.verseNumber}
              </Text>
              {item.bibleVersion && (
                <View style={[styles.versionBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.versionText, { color: theme.primary }]}>{item.bibleVersion}</Text>
                </View>
              )}
            </View>
            <View style={styles.verseActions}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${theme.primary}10` }]} onPress={() => handleEditPress(item)}>
                <Pencil size={12} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${theme.error}10` }]} onPress={() => handleDelete(item)}>
                <Trash2 size={12} color={theme.error} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.verseContentContainer}>
            <Text style={styles.openQuote}>"</Text>
            <Text style={[styles.verseText, { color: theme.textSecondary }]}>
              {getVerseText(item.bookName, item.chapter, item.verseNumber, item.bibleVersion ? getVersionById(item.bibleVersion).load() : undefined) || '—'}
              "
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            {item.isPublished ? (
              <View style={[styles.statusBadge, { backgroundColor: `${theme.success}15` }]}>
                <CheckCircle2 size={10} color={theme.success} />
                <Text style={[styles.statusText, { color: theme.success }]}>Published</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: `${theme.error}15` }]}>
                <XCircle size={10} color={theme.error} />
                <Text style={[styles.statusText, { color: theme.error }]}>Draft</Text>
              </View>
            )}
            <View style={styles.dateRow}>
              <Calendar size={10} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{formattedDate}</Text>
            </View>
          </View>

          {item.explanation && (
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? '#ffffff08' : '#f0f9ff' }]}>
              <View style={styles.sectionHeader}>
                <Lightbulb size={12} color={theme.primary} />
                <Text style={[styles.sectionLabel, { color: theme.primary }]}>EXPLANATION</Text>
              </View>
              <Text style={[styles.sectionText, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.explanation.length > 80 ? item.explanation.substring(0, 80) + '...' : item.explanation}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Sun size={48} color={theme.muted} />
      <Text style={[styles.emptyText, { color: theme.muted }]}>No daily verses found</Text>
      <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.primary }]} onPress={handleAddPress}>
        <Text style={styles.emptyButtonText}>Add First Verse</Text>
      </TouchableOpacity>
    </View>
  );

  const activeFilterCount = [bookName, chapter, verseNumber, startDate, endDate].filter(Boolean).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sun size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Daily Verses</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleAddPress}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.filterToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setShowFilters(prev => !prev)}
      >
        <Filter size={14} color={theme.primary} />
        <Text style={[styles.filterToggleText, { color: theme.textSecondary }]}>
          {showFilters ? 'Hide Filters' : 'Search & Filter'}
        </Text>
        {activeFilterCount > 0 && (
          <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {showFilters && (
        <View style={[styles.filterBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.filterRow}>
            <View style={styles.filterBlock}>
              <View style={styles.filterLabelRow}>
                <Text style={[styles.filterLabel, { color: theme.muted }]}>Book</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={resetFilters} style={styles.resetLink}>
                    <RotateCcw size={12} color={theme.primary} />
                    <Text style={[styles.resetLinkText, { color: theme.primary }]}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border }]}
                onPress={() => { setBookSearch(''); setBookPickerVisible(true); }}
              >
                <Book size={14} color={theme.muted} />
                <Text style={[styles.selectorText, { color: bookName ? theme.text : theme.muted }]} numberOfLines={1}>
                  {bookName || 'All Books'}
                </Text>
                <ChevronDown size={12} color={theme.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted }]}>Chapter</Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border, opacity: bookName ? 1 : 0.4 }]}
                onPress={() => bookName && setChapterPickerVisible(true)}
                disabled={!bookName}
              >
                <Text style={[styles.selectorText, { color: chapter ? theme.text : theme.muted }]}>
                  {chapter || 'Any'}
                </Text>
                <ChevronDown size={12} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted }]}>Verse</Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border, opacity: bookName && chapter ? 1 : 0.4 }]}
                onPress={() => bookName && chapter && setVersePickerVisible(true)}
                disabled={!bookName || !chapter}
              >
                <Text style={[styles.selectorText, { color: verseNumber ? theme.text : theme.muted }]}>
                  {verseNumber || 'Any'}
                </Text>
                <ChevronDown size={12} color={theme.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted }]}>From</Text>
              <DatePickerInput
                value={startDate}
                placeholder="Start date"
                onChangeDate={setStartDate}
                maximumDate={new Date(2100, 0, 1)}
              />
            </View>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted }]}>To</Text>
              <DatePickerInput
                value={endDate}
                placeholder="End date"
                onChangeDate={setEndDate}
                maximumDate={new Date(2100, 0, 1)}
              />
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <FlatList
            data={verses}
            renderItem={renderVerse}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={renderEmpty}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.list}
          />
          <View style={styles.bottomPadding}>
            <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />
          </View>
        </>
      )}

      {/* Book Picker Modal */}
      <Modal visible={bookPickerVisible} transparent animationType="slide" onRequestClose={() => { setBookPickerVisible(false); setBookSearch(''); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Book</Text>
              <TouchableOpacity onPress={() => { setBookPickerVisible(false); setBookSearch(''); }}>
                <X size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.testamentRow}>
              {TESTAMENTS.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.testamentTab, testament === t.value && { backgroundColor: theme.primary + '20', borderColor: theme.primary }, { borderColor: theme.border }]}
                  onPress={() => setTestament(prev => prev === t.value ? '' : t.value)}
                >
                  <Text style={[styles.testamentTabText, { color: testament === t.value ? theme.primary : theme.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Search size={18} color={theme.muted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search book..."
                placeholderTextColor={theme.muted}
                value={bookSearch}
                onChangeText={setBookSearch}
                autoFocus
              />
              {bookSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBookSearch('')}>
                  <X size={16} color={theme.muted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredBooks}
              keyExtractor={item => item}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, bookName === item && { backgroundColor: theme.primary + '15' }]}
                  onPress={() => selectBook(item)}
                >
                  <Text style={[styles.pickerItemText, { color: bookName === item ? theme.primary : theme.text }]}>
                    {item}
                  </Text>
                  {bookName === item && <CheckCircle2 size={16} color={theme.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Chapter Picker Modal */}
      <Modal visible={chapterPickerVisible} transparent animationType="slide" onRequestClose={() => setChapterPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Chapter — {bookName}</Text>
              <TouchableOpacity onPress={() => setChapterPickerVisible(false)}>
                <X size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.gridList}>
              {chapterList.map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.gridItem, chapter === String(ch) && { backgroundColor: theme.primary + '20', borderColor: theme.primary }, { borderColor: theme.border }]}
                  onPress={() => selectChapter(ch)}
                >
                  <Text style={[styles.gridItemText, { color: chapter === String(ch) ? theme.primary : theme.text }]}>
                    {ch}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Verse Picker Modal */}
      <Modal visible={versePickerVisible} transparent animationType="slide" onRequestClose={() => setVersePickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Verse — {bookName} {chapter}</Text>
              <TouchableOpacity onPress={() => setVersePickerVisible(false)}>
                <X size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.gridList}>
              {verseList.map(vs => (
                <TouchableOpacity
                  key={vs}
                  style={[styles.gridItem, verseNumber === String(vs) && { backgroundColor: theme.primary + '20', borderColor: theme.primary }, { borderColor: theme.border }]}
                  onPress={() => selectVerse(vs)}
                >
                  <Text style={[styles.gridItemText, { color: verseNumber === String(vs) ? theme.primary : theme.text }]}>
                    {vs}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 18, fontWeight: '700' },
    addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 12 },
    verseCard: { borderRadius: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
    verseAccentBar: { height: 4, width: '100%' },
    verseCardInner: { padding: 16 },
    verseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    verseRef: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
    verseRefText: { fontSize: 13, fontWeight: '700' },
    versionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    versionText: { fontSize: 9, fontWeight: '700' },
    verseActions: { flexDirection: 'row', gap: 6 },
    verseContentContainer: { marginTop: 4, marginBottom: 8 },
    openQuote: { fontSize: 48, lineHeight: 36, color: theme.primary, opacity: 0.25, fontStyle: 'italic', marginBottom: -8 },
    verseText: { fontSize: 14, fontStyle: 'italic', lineHeight: 22, color: theme.textSecondary },
    divider: { height: 1, backgroundColor: theme.border, marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    statusText: { fontSize: 10, fontWeight: '600' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 10, fontWeight: '500' },
    sectionContainer: { padding: 10, borderRadius: 8, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    sectionText: { fontSize: 11, lineHeight: 16 },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    actionButtonText: { fontSize: 11, fontWeight: '600' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 15, marginTop: 12, marginBottom: 16 },
    emptyButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    emptyButtonText: { color: '#fff', fontWeight: '600' },
    bottomPadding: { height: 80 },

    filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    filterToggleText: { fontSize: 13, fontWeight: '600' },
    filterBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    filterBar: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterBlock: { flexDirection: 'column', gap: 4 },
    filterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    filterLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    resetLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    resetLinkText: { fontSize: 11, fontWeight: '600' },
    selectorButton: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
    selectorText: { flex: 1, fontSize: 13 },
    dateInput: { flex: 1, height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 13 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { maxHeight: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
    modalTitleBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    modalTitle: { fontSize: 16, fontWeight: '700' },
    testamentRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    testamentTab: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
    testamentTabText: { fontSize: 12, fontWeight: '600' },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, padding: 0 },
    pickerList: { maxHeight: 400 },
    pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
    pickerItemText: { fontSize: 15, fontWeight: '500' },
    gridList: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
    gridItem: { width: '18%', aspectRatio: 1.3, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    gridItemText: { fontSize: 14, fontWeight: '600' },
  });

export default AdminDailyVerseManager;

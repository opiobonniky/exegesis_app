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
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getAllDailyVerses,
  deleteDailyVerse,
  DailyVerse,
} from '../../services/adminApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  ChevronLeft,
  ChevronRight,
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
import { ALL_BOOKS } from '../../constants/bibleBooks';
import DatePickerInput from '../../reusable/DatePickerInput';

const BIBLE_BOOKS = ALL_BOOKS;

export interface ExtendedDailyVerse extends DailyVerse {
  creatorName?: string;
}

const localeMap: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  ar: 'ar-SA',
};

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
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const ac = translations?.admin;
  const bible = translations?.bible;
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
      console.log('Fetched daily verses:', response);
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

  const oldTestamentCount = 39;
  const books = testament
    ? testament === 'Old'
      ? BIBLE_BOOKS.slice(0, oldTestamentCount)
      : BIBLE_BOOKS.slice(oldTestamentCount)
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
    Alert.alert(
      ac?.dvManagerDeleteTitle || 'Delete Verse',
      ac?.dvManagerDeleteMessage || 'Are you sure you want to delete this daily verse?',
      [
        { text: bible?.cancel || 'Cancel', style: 'cancel' as const },
        {
          text: ac?.dvManagerDelete || 'Delete',
          style: 'destructive' as const,
          onPress: async () => {
            try {
              await deleteDailyVerse(verse.id);
              setVerses(prev => prev.filter(v => v.id !== verse.id));
              showToast('success', ac?.dvManagerVerseDeleted || 'Verse deleted successfully');
            } catch (error) {
              showToast('error', ac?.dvManagerFailedDelete || 'Failed to delete verse');
            }
          },
        },
      ],
    );
  };

  const locale = localeMap[language] || 'en-US';

  const renderVerse = ({ item }: { item: ExtendedDailyVerse }) => {
    const formattedDate = item.displayDate && typeof item.displayDate === 'string'
      ? new Date(item.displayDate).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    return (
      <View style={[styles.verseCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={[styles.verseAccentBar, { backgroundColor: theme.primary }]} />
        <View style={styles.verseCardInner}>
          <View style={[styles.verseHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.verseRef, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Book size={14} color={theme.primary} />
              <Text style={[styles.verseRefText, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {item.bookName} {item.chapter}:{item.verseNumber}
              </Text>
              {item.bibleVersion && (
                <View style={[styles.versionBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.versionText, { color: theme.primary }]}>{item.bibleVersion}</Text>
                </View>
              )}
            </View>
            <View style={[styles.verseActions, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${theme.primary}10` }]} onPress={() => handleEditPress(item)}>
                <Pencil size={12} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${theme.error}10` }]} onPress={() => handleDelete(item)}>
                <Trash2 size={12} color={theme.error} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.verseContentContainer}>
            <Text style={[styles.openQuote, { textAlign: isRtl ? 'right' : 'left' }]}>"</Text>
            <Text style={[styles.verseText, { color: theme.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
              {getVerseText(item.bookName, item.chapter, item.verseNumber, item.bibleVersion ? getVersionById(item.bibleVersion).load() : undefined) || '—'}
              "
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={[styles.infoRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {item.isPublished ? (
              <View style={[styles.statusBadge, { backgroundColor: `${theme.success}15`, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <CheckCircle2 size={10} color={theme.success} />
                <Text style={[styles.statusText, { color: theme.success }]}>{ac?.dvManagerPublished || 'Published'}</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: `${theme.error}15`, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <XCircle size={10} color={theme.error} />
                <Text style={[styles.statusText, { color: theme.error }]}>{ac?.dvManagerDraft || 'Draft'}</Text>
              </View>
            )}
            <View style={[styles.dateRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Calendar size={10} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{formattedDate}</Text>
            </View>
          </View>

          {item.explanation && (
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? '#ffffff08' : '#f0f9ff' }]}>
              <View style={[styles.sectionHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Lightbulb size={12} color={theme.primary} />
                <Text style={[styles.sectionLabel, { color: theme.primary }]}>{ac?.dvManagerExplanation || 'EXPLANATION'}</Text>
              </View>
              <Text style={[styles.sectionText, { color: theme.textSecondary, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>
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
      <Text style={[styles.emptyText, { color: theme.muted }]}>{ac?.dvManagerNoVerses || 'No daily verses found'}</Text>
      <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.primary }]} onPress={handleAddPress}>
        <Text style={styles.emptyButtonText}>{ac?.dvManagerAddFirst || 'Add First Verse'}</Text>
      </TouchableOpacity>
    </View>
  );

  const activeFilterCount = [bookName, chapter, verseNumber, startDate, endDate].filter(Boolean).length;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          {isRtl ? <ChevronRight size={20} color={theme.primary} /> : <ChevronLeft size={20} color={theme.primary} />}
        </TouchableOpacity>
        <View style={[styles.headerTitle, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Sun size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.dvManagerTitle || 'Daily Verses'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          onPress={handleAddPress}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>{ac?.dvManagerAdd || 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.filterToggle, { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
        onPress={() => setShowFilters(prev => !prev)}
      >
        <Filter size={14} color={theme.primary} />
        <Text style={[styles.filterToggleText, { color: theme.textSecondary }]}>
          {showFilters ? (ac?.dvManagerHideFilters || 'Hide Filters') : (ac?.dvManagerSearchFilter || 'Search & Filter')}
        </Text>
        {activeFilterCount > 0 && (
          <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {showFilters && (
        <View style={[styles.filterBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.filterRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={styles.filterBlock}>
              <View style={[styles.filterLabelRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.filterLabel, { color: theme.muted }]}>{ac?.dvManagerBookLabel || 'Book'}</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={resetFilters} style={[styles.resetLink, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <RotateCcw size={12} color={theme.primary} />
                    <Text style={[styles.resetLinkText, { color: theme.primary }]}>{ac?.dvManagerReset || 'Reset'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                onPress={() => { setBookSearch(''); setBookPickerVisible(true); }}
              >
                <Book size={14} color={theme.muted} />
                <Text style={[styles.selectorText, { color: bookName ? theme.text : theme.muted, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
                  {bookName || (ac?.dvManagerAllBooks || 'All Books')}
                </Text>
                <ChevronDown size={12} color={theme.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.filterRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.dvManagerChapterLabel || 'Chapter'}</Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border, opacity: bookName ? 1 : 0.4, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                onPress={() => bookName && setChapterPickerVisible(true)}
                disabled={!bookName}
              >
                <Text style={[styles.selectorText, { color: chapter ? theme.text : theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                  {chapter || (ac?.dvManagerAny || 'Any')}
                </Text>
                <ChevronDown size={12} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.dvManagerVerseLabel || 'Verse'}</Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border, opacity: bookName && chapter ? 1 : 0.4, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                onPress={() => bookName && chapter && setVersePickerVisible(true)}
                disabled={!bookName || !chapter}
              >
                <Text style={[styles.selectorText, { color: verseNumber ? theme.text : theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                  {verseNumber || (ac?.dvManagerAny || 'Any')}
                </Text>
                <ChevronDown size={12} color={theme.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.filterRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.dvManagerFromLabel || 'From'}</Text>
              <DatePickerInput
                value={startDate}
                placeholder={ac?.dvManagerStartDate || 'Start date'}
                onChangeDate={setStartDate}
                maximumDate={new Date(2100, 0, 1)}
              />
            </View>
            <View style={[styles.filterBlock, { flex: 1 }]}>
              <Text style={[styles.filterLabel, { color: theme.muted, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.dvManagerToLabel || 'To'}</Text>
              <DatePickerInput
                value={endDate}
                placeholder={ac?.dvManagerEndDate || 'End date'}
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
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{ac?.dvManagerSelectBook || 'Select Book'}</Text>
              <TouchableOpacity onPress={() => { setBookPickerVisible(false); setBookSearch(''); }}>
                <X size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.testamentRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.testamentTab, testament === 'Old' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }, { borderColor: theme.border }]}
                onPress={() => setTestament(prev => prev === 'Old' ? '' : 'Old')}
              >
                <Text style={[styles.testamentTabText, { color: testament === 'Old' ? theme.primary : theme.textSecondary }]}>
                  {bible?.oldTestament || 'Old Testament'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.testamentTab, testament === 'New' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }, { borderColor: theme.border }]}
                onPress={() => setTestament(prev => prev === 'New' ? '' : 'New')}
              >
                <Text style={[styles.testamentTabText, { color: testament === 'New' ? theme.primary : theme.textSecondary }]}>
                  {bible?.newTestament || 'New Testament'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Search size={18} color={theme.muted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}
                placeholder={ac?.dvManagerSearchBooks || 'Search book...'}
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
                  style={[styles.pickerItem, bookName === item && { backgroundColor: theme.primary + '15' }, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                  onPress={() => selectBook(item)}
                >
                  <Text style={[styles.pickerItemText, { color: bookName === item ? theme.primary : theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
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
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {(ac?.dvManagerSelectChapter || 'Select Chapter — {bookName}').replace('{bookName}', bookName)}
              </Text>
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
                  <Text style={[styles.gridItemText, { color: chapter === String(ch) ? theme.primary : theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
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
            <View style={[styles.modalTitleBar, { borderBottomColor: theme.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {(ac?.dvManagerSelectVerse || 'Select Verse — {bookName} {chapter}').replace('{bookName}', bookName).replace('{chapter}', chapter)}
              </Text>
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
                  <Text style={[styles.gridItemText, { color: verseNumber === String(vs) ? theme.primary : theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                    {vs}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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

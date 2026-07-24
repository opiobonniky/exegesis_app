import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  BookText,
  LibraryBig,
  ArrowLeft,
  ChevronDown,
  Search,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import WordStudyBottomSheet from '../bible/components/WordStudyBottomSheet';
import { getStrongsEntry, StrongsEntry } from '../../services/strongsService';
import {
  useStrongsDictionary,
  DictionaryMode,
  LANG_FILTERS,
} from './hooks/useStrongsDictionary';
import type { StrongsWordEntry } from './services/strongsDictionaryApi';
import ModeTabs from './components/ModeTabs';
import InlineBookPicker from './components/InlineBookPicker';
import WordCard from './components/WordCard';
import VerseWordCard from './components/VerseWordCard';
import BottomTab from '../../component/navigations/BottomTab';

export default function StrongsDictionaryScreen() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const isDark = app?.isDark ?? false;
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const hook = useStrongsDictionary();

  const [bookPickerExpanded, setBookPickerExpanded] = useState(false);
  const [detailEntry, setDetailEntry] = useState<StrongsEntry | null>(null);
  const [detailEntryLoading, setDetailEntryLoading] = useState(false);
  const [expandedVerseKey, setExpandedVerseKey] = useState<string | null>(null);

  const filteredSearchResults = useMemo(() => {
    if (hook.langFilter === 'all') return hook.results;
    return hook.results.filter(r => r.language === hook.langFilter);
  }, [hook.results, hook.langFilter]);

  const filteredBrowseResults = useMemo(() => {
    if (hook.langFilter === 'all') return hook.browseWords;
    return hook.browseWords.filter(r => r.language === hook.langFilter);
  }, [hook.browseWords, hook.langFilter]);

  const searchCount =
    hook.langFilter === 'all' ? hook.resultTotal : filteredSearchResults.length;
  const browseCount =
    hook.langFilter === 'all' ? hook.browseTotal : filteredBrowseResults.length;

  // ── Debounced auto-fetch on search typing ──

  const initialSearchDone = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (initialSearchDone.current) return;
    if (hook.mode === 'search' && !hook.searched) {
      initialSearchDone.current = true;
      hook.setSearchQuery('love');
      hook.executeSearch('love');
    }
  }, [hook.mode, hook.searched, hook.executeSearch, hook.setSearchQuery]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (hook.searchQuery.trim().length < 2) return;
    searchTimerRef.current = setTimeout(() => {
      hook.executeSearch(hook.searchQuery);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [hook.searchQuery, hook.executeSearch]);

  // ── Debounced auto-fetch on verse input change ──

  const verseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (verseTimerRef.current) clearTimeout(verseTimerRef.current);
    if (!hook.verseBook || !hook.verseChapter) return;
    const ch = Number(hook.verseChapter);
    if (!ch) return;
    setExpandedVerseKey(null);
    verseTimerRef.current = setTimeout(() => {
      hook.loadVerseWords(
        hook.verseBook,
        ch,
        hook.verseNum ? Number(hook.verseNum) : undefined,
      );
    }, 500);
    return () => {
      if (verseTimerRef.current) clearTimeout(verseTimerRef.current);
    };
  }, [hook.verseBook, hook.verseChapter, hook.verseNum]);

  const openDetail = useCallback(
    async (word: StrongsWordEntry) => {
      hook.openWordDetail(word);
      setDetailEntryLoading(true);
      setDetailEntry(null);
      try {
        const res = await getStrongsEntry(word.strongsId);
        if (res.returnCode === 200 && res.returnData) {
          setDetailEntry(res.returnData);
        }
      } catch {
      } finally {
        setDetailEntryLoading(false);
      }
    },
    [hook],
  );

  const handleModeSelect = useCallback(
    (mode: DictionaryMode) => {
      setBookPickerExpanded(false);
      hook.switchMode(mode);
      if (mode === 'browse') {
        const book = hook.selectedBook || 'Genesis';
        hook.setSelectedBook(book);
        hook.loadBookWords(book, 0, false);
      }
      if (mode === 'search' && !hook.searched && !hook.results.length) {
        hook.setSearchQuery('love');
        hook.executeSearch('love');
      }
    },
    [hook],
  );

  const handleSelectBrowseBook = useCallback(
    (book: string) => {
      hook.setSelectedBook(book);
      hook.loadBookWords(book, 0, false);
      setBookPickerExpanded(false);
    },
    [hook],
  );

  const handleSelectVerseBook = useCallback(
    (book: string) => {
      hook.setVerseBook(book);
      setBookPickerExpanded(false);
    },
    [hook],
  );

  const handleVerseWordToggle = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedVerseKey(prev => (prev === key ? null : key));
  }, []);

  // ── Search mode ──

  const renderSearchMode = () => (
    <View style={styles.section}>
      <View style={styles.searchBox}>
        <Search size={20} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          value={hook.searchQuery}
          onChangeText={hook.setSearchQuery}
          onSubmitEditing={() => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            hook.executeSearch(hook.searchQuery);
          }}
          placeholder="Search word or Strong's number"
          placeholderTextColor={COLORS.muted}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {hook.searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => hook.setSearchQuery('')}>
            <View style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {LANG_FILTERS.map(lf => (
          <TouchableOpacity
            key={lf.key}
            style={[
              styles.filterChip,
              hook.langFilter === lf.key && styles.filterChipActive,
            ]}
            onPress={() => hook.setLangFilter(lf.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                hook.langFilter === lf.key && styles.filterChipTextActive,
              ]}
            >
              {lf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {hook.searchLoading && !hook.results.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <View style={styles.resultsSection}>
          {filteredSearchResults.length > 0 && (
            <Text style={[styles.resultsCount, { color: COLORS.muted }]}>
              {searchCount} result{searchCount !== 1 ? 's' : ''} for "{hook.searchQuery}"
            </Text>
          )}
          <FlatList
            data={filteredSearchResults}
            keyExtractor={item => item.strongsId}
            renderItem={({ item, index }) => (
              <View>
                {index > 0 && <View style={[styles.divider, { backgroundColor: COLORS.border }]} />}
                <WordCard item={item} onPress={openDetail} colors={COLORS} />
              </View>
            )}
            contentContainerStyle={
              filteredSearchResults.length
                ? styles.listContent
                : styles.emptyList
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <BookOpen size={40} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>No entries found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              </View>
            }
            ListFooterComponent={
              hook.searchHasNext && !hook.searchLoading ? (
                <LoadMoreButton
                  onPress={hook.loadMoreSearch}
                  loading={hook.searchLoading}
                  label={`Load more (${hook.results.length} of ${hook.resultTotal})`}
                  colors={COLORS}
                />
              ) : hook.searchLoading && hook.results.length > 0 ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );

  // ── Browse mode ──

  const renderBrowseMode = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.pillButton}
        onPress={() => setBookPickerExpanded(prev => !prev)}
      >
        <BookOpen size={20} color={COLORS.primary} />
        <Text style={styles.pillButtonText}>
          {hook.selectedBook || 'Select a Book'}
        </Text>
        <View
          style={[styles.pillBadge, { backgroundColor: COLORS.primary + '12' }]}
        >
          <Text style={[styles.pillBadgeText, { color: COLORS.primary }]}>
            {hook.browseWords.length > 0 ? `${hook.browseTotal}` : 'Books'}
          </Text>
        </View>
        <ChevronDown size={18} color={COLORS.muted} />
      </TouchableOpacity>

      {bookPickerExpanded && (
        <InlineBookPicker
          mode="browse"
          selectedBook={hook.selectedBook}
          onSelectBrowse={handleSelectBrowseBook}
          onSelectVerse={handleSelectVerseBook}
          colors={COLORS}
        />
      )}

      <View style={styles.filterRow}>
        {LANG_FILTERS.map(lf => (
          <TouchableOpacity
            key={lf.key}
            style={[
              styles.filterChip,
              hook.langFilter === lf.key && styles.filterChipActive,
            ]}
            onPress={() => hook.setLangFilter(lf.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                hook.langFilter === lf.key && styles.filterChipTextActive,
              ]}
            >
              {lf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {hook.browseLoading && !hook.browseWords.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : hook.browseLoaded && !hook.browseWords.length ? (
        <View style={styles.emptyState}>
          <BookOpen size={40} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No words for this book</Text>
          <Text style={styles.emptySubtext}>
            This book may not have Strong's data loaded yet
          </Text>
        </View>
      ) : !hook.selectedBook ? (
        <View style={styles.emptyState}>
          <LibraryBig size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Select a Book</Text>
          <Text style={styles.emptySubtext}>
            Choose a Bible book to browse all Strong's words in it
          </Text>
        </View>
      ) : (
        <SectionHeader
          count={browseCount}
          label="unique words"
          subtitle={hook.selectedBook}
          colors={COLORS}
        >
          <FlatList
            data={filteredBrowseResults}
            keyExtractor={item => item.strongsId}
            renderItem={({ item }) => (
              <WordCard item={item} onPress={openDetail} colors={COLORS} />
            )}
            contentContainerStyle={styles.listContent}
            onEndReached={hook.loadMoreBrowse}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              hook.browseHasNext && !hook.browseLoading ? (
                <LoadMoreButton
                  onPress={hook.loadMoreBrowse}
                  loading={hook.browseLoading}
                  label={`Load more (${hook.browseWords.length} of ${hook.browseTotal})`}
                  colors={COLORS}
                />
              ) : hook.browseLoading && hook.browseWords.length > 0 ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        </SectionHeader>
      )}
    </View>
  );

  // ── Verse mode ──

  const renderVerseMode = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.pillButton}
        onPress={() => setBookPickerExpanded(prev => !prev)}
      >
        <BookOpen size={20} color={COLORS.primary} />
        <Text style={styles.pillButtonText} numberOfLines={1}>
          {hook.verseBook || 'Select Book'}
        </Text>
        <ChevronDown size={18} color={COLORS.muted} />
      </TouchableOpacity>

      {bookPickerExpanded && (
        <InlineBookPicker
          mode="verse"
          verseBook={hook.verseBook}
          onSelectBrowse={handleSelectBrowseBook}
          onSelectVerse={handleSelectVerseBook}
          colors={COLORS}
        />
      )}

      <View style={styles.verseInputRow}>
        <TextInput
          style={[styles.verseInputField, { flex: 1 }]}
          value={hook.verseChapter}
          onChangeText={hook.setVerseChapter}
          placeholder="Chapter"
          placeholderTextColor={COLORS.muted}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.verseInputField, { flex: 1 }]}
          value={hook.verseNum}
          onChangeText={hook.setVerseNum}
          placeholder="Verse"
          placeholderTextColor={COLORS.muted}
          keyboardType="number-pad"
        />
        <TouchableOpacity
          style={styles.goButton}
          onPress={() => {
            if (verseTimerRef.current) clearTimeout(verseTimerRef.current);
            const ch = Number(hook.verseChapter);
            const vs = Number(hook.verseNum);
            if (!hook.verseBook || !ch) {
              showToast('error', 'Enter book and chapter');
              return;
            }
            hook.loadVerseWords(hook.verseBook, ch, vs || undefined);
          }}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {hook.verseWordsLoading && !hook.verseWords.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : hook.verseWordsLoaded && !hook.verseWords.length ? (
        <View style={styles.emptyState}>
          <BookText size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No Strong's words found</Text>
          <Text style={styles.emptySubtext}>
            This verse may not have Strong's data loaded yet
          </Text>
        </View>
      ) : hook.verseWordsLoaded ? (
        <SectionHeader
          count={hook.verseWords.length}
          label="unique words"
          subtitle={`${hook.verseBook} ${hook.verseChapter}:${hook.verseNum || 'all'}`}
          colors={COLORS}
        >
          <FlatList
            data={hook.verseWords}
            keyExtractor={(item, idx) =>
              `${item.strongsId}_${item.wordOrder}_${idx}`
            }
            renderItem={({ item, index }) => {
              const key = `${item.strongsId}_${item.wordOrder}_${index}`;
              return (
                <VerseWordCard
                  item={item}
                  isExpanded={expandedVerseKey === key}
                  onToggle={() => handleVerseWordToggle(key)}
                  onOpenDetail={openDetail}
                  colors={COLORS}
                />
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </SectionHeader>
      ) : (
        <View style={styles.emptyState}>
          <BookText size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Enter a Verse Reference</Text>
          <Text style={styles.emptySubtext}>
            Select a book, enter chapter and verse to see all Strong's words
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
        >
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dictionary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ModeTabs mode={hook.mode} onSelect={handleModeSelect} colors={COLORS} />

      <View style={styles.content}>
        {hook.mode === 'search' && renderSearchMode()}
        {hook.mode === 'browse' && renderBrowseMode()}
        {hook.mode === 'verse' && renderVerseMode()}
      </View>

      <WordStudyBottomSheet
        visible={hook.detailVisible}
        word={null}
        entry={detailEntry}
        loading={detailEntryLoading}
        isDark={isDark}
        onClose={hook.closeWordDetail}
        onSearchAllUses={strongsId => {
          hook.closeWordDetail();
          hook.setSearchQuery(strongsId);
          hook.switchMode('search');
          setTimeout(() => hook.executeSearch(strongsId), 100);
        }}
      />

      <Animated.View
        style={[
          styles.bottomTabWrapper,
          {
            transform: [
              {
                translateY: tabBarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: tabBarAnimation,
          },
        ]}
      ></Animated.View>
      <BottomTab activeTab="home" setActiveTab={() => {}} />
    </SafeAreaView>
  );
}

// ── Reusable sub-components ──

function SectionHeader({
  count,
  label,
  subtitle,
  colors,
  children,
}: {
  count: number;
  label: string;
  subtitle?: string;
  colors: any;
  children: React.ReactNode;
}) {
  const s = sectionStyles(colors);
  return (
    <View style={s.wrapper}>
      <View style={s.header}>
        <View
          style={[s.countBadge, { backgroundColor: colors.primary + '12' }]}
        >
          <Text style={[s.countText, { color: colors.primary }]}>{count}</Text>
        </View>
        <Text style={s.labelText}>
          {label} {subtitle || ''}
        </Text>
      </View>
      {children}
    </View>
  );
}

function LoadMoreButton({
  onPress,
  loading,
  label,
  colors,
}: {
  onPress: () => void;
  loading: boolean;
  label: string;
  colors: any;
}) {
  const s = sectionStyles(colors);
  return (
    <TouchableOpacity style={s.loadMore} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.loadMoreText}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <ChevronDown size={16} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}

const sectionStyles = (c: any) =>
  StyleSheet.create({
    wrapper: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
      paddingTop: 6,
    },
    countBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
    },
    countText: { fontSize: 14, fontWeight: '900' },
    labelText: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
    loadMore: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      marginTop: 6,
      borderRadius: 12,
      backgroundColor: c.surface,
    },
    loadMoreText: { fontSize: 14, fontWeight: '800', color: c.primary },
  });

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1 },

    // ── Header ──

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 2,
    },
    headerBack: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
      textAlign: 'center',
    },
    headerSpacer: { width: 40 },

    // ── Section ──

    section: { flex: 1, paddingHorizontal: 20 },

    // ── Search box ──

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      height: 52,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      marginBottom: 14,
    },
    searchInput: {
      flex: 1,
      color: COLORS.text,
      fontSize: 15,
      padding: 0,
    },
    clearBtn: {
      width: 22,
      height: 22,
      borderRadius: 999,
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearBtnText: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontWeight: '700',
    },

    // ── Filter chips ──

    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    filterChip: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: COLORS.cardBackground,
    },
    filterChipActive: {
      backgroundColor: COLORS.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.textSecondary,
    },
    filterChipTextActive: { color: '#fff' },

    // ── Pill button (book selector shared with browse & verse) ──

    pillButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
      backgroundColor: COLORS.surface,
      marginBottom: 14,
    },
    pillButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
    },
    pillBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
    },
    pillBadgeText: { fontSize: 12, fontWeight: '800' },

    // ── Verse inputs ──

    verseInputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    verseInputField: {
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '700',
    },
    goButton: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Results section ──

    resultsSection: { flex: 1 },
    resultsCount: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
      paddingHorizontal: 4,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 4,
    },

    // ── Loading / empty ──

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    loadingMore: { paddingVertical: 20, alignItems: 'center' },
    listContent: { paddingBottom: 32 },
    emptyList: { flexGrow: 1, justifyContent: 'center' },

    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 30,
      gap: 12,
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: COLORS.text,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
    },
    bottomTabWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  });

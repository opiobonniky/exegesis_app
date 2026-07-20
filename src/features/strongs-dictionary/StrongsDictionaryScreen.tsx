import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  BookText,
  Hash,
  LibraryBig,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import ActionHeader from '../../reusable/ActionHeader';
import WordStudyBottomSheet from '../bible/components/WordStudyBottomSheet';
import { getStrongsEntry, StrongsEntry } from '../../services/strongsService';
import {
  useStrongsDictionary,
  DictionaryMode,
  LANG_FILTERS,
} from './hooks/useStrongsDictionary';
import type {
  StrongsWordEntry,
} from './services/strongsDictionaryApi';
import ModeTabs from './components/ModeTabs';
import SearchBar from './components/SearchBar';
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

  const filteredResults = useMemo(() => {
    if (hook.langFilter === 'all') return hook.results;
    return hook.results.filter(r => r.language === hook.langFilter);
  }, [hook.results, hook.langFilter]);

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

  const renderSearchMode = () => (
    <View style={styles.section}>
      <SearchBar
        value={hook.searchQuery}
        onChangeText={hook.setSearchQuery}
        onSubmit={() => hook.executeSearch(hook.searchQuery)}
        placeholder="Search by word or Strong's number (e.g. G26, H7225)"
        colors={COLORS}
      />

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

      {hook.searchLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={item => item.strongsId}
          renderItem={({ item }) => (
            <WordCard item={item} onPress={openDetail} colors={COLORS} />
          )}
          contentContainerStyle={
            filteredResults.length ? styles.listContent : styles.emptyList
          }
          ListEmptyComponent={
            hook.searched ? (
              <View style={styles.emptyState}>
                <BookOpen size={40} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>No Strong's entries found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term or Strong's number
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Hash size={40} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>
                  Strong's Concordance Dictionary
                </Text>
                <Text style={styles.emptySubtext}>
                  Search by English word, Strong's number (G26, H7225), or
                  original language text
                </Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderBrowseMode = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.bookSelector}
        onPress={() => setBookPickerExpanded(prev => !prev)}
      >
        <BookOpen size={16} color={COLORS.primary} />
        <Text style={styles.bookSelectorText}>
          {hook.selectedBook || 'Select a Book'}
        </Text>
        <ChevronDown size={14} color={COLORS.muted} />
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

      {!hook.selectedBook ? (
        <View style={styles.emptyState}>
          <LibraryBig size={40} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Select a Book</Text>
          <Text style={styles.emptySubtext}>
            Choose a Bible book to browse all Strong's words that appear in it
          </Text>
        </View>
      ) : hook.browseLoading && !hook.browseWords.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <>
          <View style={styles.resultMeta}>
            <Text style={styles.resultMetaText}>
              {hook.browseTotal} unique words in {hook.selectedBook}
            </Text>
          </View>
          <FlatList
            data={hook.browseWords}
            keyExtractor={item => item.strongsId}
            renderItem={({ item }) => (
              <WordCard item={item} onPress={openDetail} colors={COLORS} />
            )}
            contentContainerStyle={styles.listContent}
            onEndReached={hook.loadMoreBrowse}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              hook.browseLoading && hook.browseWords.length > 0 ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );

  const renderVerseMode = () => (
    <View style={styles.section}>
      <View style={styles.verseInputRow}>
        <TouchableOpacity
          style={[styles.verseInput, { flex: 2 }]}
          onPress={() => setBookPickerExpanded(prev => !prev)}
        >
          <BookOpen size={14} color={COLORS.primary} />
          <Text style={styles.verseInputText} numberOfLines={1}>
            {hook.verseBook || 'Book'}
          </Text>
          <ChevronDown size={12} color={COLORS.muted} />
        </TouchableOpacity>
        <TextInput
          style={[styles.verseInput, { flex: 1 }]}
          value={hook.verseChapter}
          onChangeText={hook.setVerseChapter}
          placeholder="Ch."
          placeholderTextColor={COLORS.muted}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.verseInput, { flex: 1 }]}
          value={hook.verseNum}
          onChangeText={hook.setVerseNum}
          placeholder="V."
          placeholderTextColor={COLORS.muted}
          keyboardType="number-pad"
        />
        <TouchableOpacity
          style={styles.goButton}
          onPress={() => {
            const ch = Number(hook.verseChapter);
            const vs = Number(hook.verseNum);
            if (!hook.verseBook || !ch) {
              showToast('error', 'Enter book and chapter');
              return;
            }
            hook.loadVerseWords(hook.verseBook, ch, vs || undefined);
          }}
        >
          <ArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {bookPickerExpanded && (
        <InlineBookPicker
          mode="verse"
          verseBook={hook.verseBook}
          onSelectBrowse={handleSelectBrowseBook}
          onSelectVerse={handleSelectVerseBook}
          colors={COLORS}
        />
      )}

      {hook.verseWordsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : hook.verseWordsLoaded ? (
        <FlatList
          data={hook.verseWords}
          keyExtractor={(item, idx) =>
            `${item.strongsId}_${item.wordOrder}_${idx}`
          }
          renderItem={({ item }) => (
            <VerseWordCard item={item} onPress={openDetail} colors={COLORS} />
          )}
          contentContainerStyle={
            hook.verseWords.length ? styles.listContent : styles.emptyList
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookText size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No Strong's words found</Text>
              <Text style={styles.emptySubtext}>
                This verse may not have Strong's data loaded yet
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <BookText size={40} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Enter a Verse Reference</Text>
          <Text style={styles.emptySubtext}>
            Select a book, enter chapter and verse to see all Strong's words
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ActionHeader
        title="Strong's Dictionary"
        onPress={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <ModeTabs
          mode={hook.mode}
          onSelect={handleModeSelect}
          colors={COLORS}
        />

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

      <BottomTab activeTab="lab" setActiveTab={() => {}} />
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1 },
    section: { flex: 1, paddingHorizontal: 16 },

    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    filterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.textSecondary,
    },
    filterChipTextActive: { color: '#fff' },

    bookSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 50,
      backgroundColor: COLORS.cardBackground,
      marginBottom: 12,
    },
    bookSelectorText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.text,
    },

    verseInputRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    verseInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 46,
      backgroundColor: COLORS.cardBackground,
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '600',
    },
    verseInputText: {
      flex: 1,
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '700',
    },
    goButton: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    resultMeta: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: 8,
    },
    resultMetaText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },

    listContent: { paddingBottom: 40 },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingMore: { paddingVertical: 16, alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingHorizontal: 30, gap: 8 },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: COLORS.text,
      textAlign: 'center',
      marginTop: 4,
    },
    emptySubtext: {
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
    },
  });

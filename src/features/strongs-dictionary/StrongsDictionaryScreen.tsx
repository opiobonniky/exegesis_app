import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import { getStrongsEntry, StrongsEntry } from '../../services/strongsService';
import {
  useStrongsDictionary,
  DictionaryMode,
} from './hooks/useStrongsDictionary';
import type { StrongsWordEntry } from './services/strongsDictionaryApi';
import DictionaryHeader from './components/DictionaryHeader';
import DictionaryTabs from './components/DictionaryTabs';
import StudyVerseTab from './components/StudyVerseTab';
import SearchTab from './components/SearchTab';
import BrowseTab from './components/BrowseTab';
import FavoritesTab from './components/FavoritesTab';
import WordStudyBottomSheet from '../bible/components/WordStudyBottomSheet';
import BottomTab from '../../component/navigations/BottomTab';
import { route } from '../../component/navigations/routes';

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

  const filteredSearchResults = useMemo(() => {
    if (hook.langFilter === 'all') return hook.results;
    return hook.results.filter(r => r.language === hook.langFilter);
  }, [hook.results, hook.langFilter]);

  const searchCount =
    hook.langFilter === 'all' ? hook.resultTotal : filteredSearchResults.length;

  // ── Debounced auto-fetch on search typing ──

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (hook.searchQuery.trim().length < 2) return;
    searchTimerRef.current = setTimeout(() => {
      hook.executeSearch(hook.searchQuery);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.searchQuery, hook.executeSearch]);

  const openDetail = useCallback(
    async (word: StrongsWordEntry) => {
      hook.openWordDetail();
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

  const handleSetTranslation = useCallback(
    (versionId: string) => {
      app?.setBibleVersion?.(versionId);
      showToast('success', 'Translation updated');
    },
    [app],
  );

  const translationId = app?.bibleVersionId || 'Berean';

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <DictionaryHeader
        onHistoryPress={() => navigation.navigate(route.lab)}
      />

      <DictionaryTabs
        mode={hook.mode}
        onSelect={handleModeSelect}
        colors={COLORS}
        isDark={isDark}
      />

      <View style={styles.content}>
        {/* Kept mounted (hidden when inactive) so the selected verse survives
            switching to Search/Browse and back. */}
        <View style={hook.mode === 'study' ? styles.flex : styles.hidden}>
          <StudyVerseTab
            translationId={translationId}
            onSetTranslation={handleSetTranslation}
            isDark={isDark}
            colors={COLORS}
          />
        </View>
        {hook.mode === 'search' && (
          <SearchTab
            searchQuery={hook.searchQuery}
            setSearchQuery={hook.setSearchQuery}
            langFilter={hook.langFilter}
            setLangFilter={hook.setLangFilter}
            results={filteredSearchResults}
            searchLoading={hook.searchLoading}
            searched={hook.searched}
            searchCount={searchCount}
            searchHasNext={hook.searchHasNext}
            onExecuteSearch={q => {
              if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
              hook.executeSearch(q);
            }}
            onLoadMore={hook.loadMoreSearch}
            onOpenDetail={openDetail}
            onClear={() => hook.setSearchQuery('')}
            colors={COLORS}
          />
        )}
        {hook.mode === 'browse' && (
          <BrowseTab
            selectedBook={hook.selectedBook}
            bookPickerExpanded={bookPickerExpanded}
            onToggleBookPicker={() => setBookPickerExpanded(prev => !prev)}
            onSelectBook={handleSelectBrowseBook}
            langFilter={hook.langFilter}
            setLangFilter={hook.setLangFilter}
            browseWords={hook.browseWords}
            browseLoading={hook.browseLoading}
            browseLoaded={hook.browseLoaded}
            browseTotal={hook.browseTotal}
            browseHasNext={hook.browseHasNext}
            onLoadMore={hook.loadMoreBrowse}
            onOpenDetail={openDetail}
            colors={COLORS}
          />
        )}
        {hook.mode === 'favorites' && (
          <FavoritesTab
            translationId={translationId}
            isDark={isDark}
            colors={COLORS}
          />
        )}
      </View>

      <WordStudyBottomSheet
        visible={hook.detailVisible}
        word={null}
        entry={detailEntry}
        loading={detailEntryLoading}
        isDark={isDark}
        onClose={hook.closeWordDetail}
        onSaveWord={async entry => {
          try {
            const { saveFavoriteWord } = await import(
              './services/strongsFavorites'
            );
            const saved = await saveFavoriteWord({
              strongsId: entry.strongsId,
              originalWord: entry.originalWord,
              transliteration: entry.transliteration,
              shortDefinition: entry.shortDefinition || '',
              fullDefinition: entry.fullDefinition,
              language: entry.language,
              partOfSpeech: entry.partOfSpeech,
              grammaticalCase: entry.grammaticalCase,
              gender: entry.gender,
              number: entry.number,
              usageCount: entry.usageCount,
              crossReferences: entry.crossReferences,
              adminExplanation: null,
            });
            showToast(
              saved ? 'success' : 'info',
              saved ? 'Word saved to favorites' : 'Already in favorites',
            );
          } catch {}
        }}
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
      >
        <BottomTab activeTab="studyBible" setActiveTab={() => {}} />
      </Animated.View>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, paddingTop: 6 },
    flex: { flex: 1 },
    hidden: { display: 'none' },
    bottomTabWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  });

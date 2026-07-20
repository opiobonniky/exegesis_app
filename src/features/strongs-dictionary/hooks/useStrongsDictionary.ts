import { useState, useCallback, useRef } from 'react';
import { strongsDictionaryApi, StrongsWordEntry, VerseUniqueWord } from '../services/strongsDictionaryApi';

export type DictionaryMode = 'search' | 'browse' | 'verse';

export const LANG_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Greek', label: 'Greek' },
  { key: 'Hebrew', label: 'Hebrew' },
] as const;

export type LangFilter = (typeof LANG_FILTERS)[number]['key'];

const BROWSE_PAGE_SIZE = 100;

export function useStrongsDictionary() {
  // Mode
  const [mode, setMode] = useState<DictionaryMode>('search');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<StrongsWordEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resultTotal, setResultTotal] = useState(0);

  // Browse by Book
  const [selectedBook, setSelectedBook] = useState('');
  const [browseWords, setBrowseWords] = useState<StrongsWordEntry[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(0);
  const [browseHasNext, setBrowseHasNext] = useState(false);

  // Verse mode
  const [verseBook, setVerseBook] = useState('');
  const [verseChapter, setVerseChapter] = useState('');
  const [verseNum, setVerseNum] = useState('');
  const [verseWords, setVerseWords] = useState<VerseUniqueWord[]>([]);
  const [verseWordsLoading, setVerseWordsLoading] = useState(false);
  const [verseWordsLoaded, setVerseWordsLoaded] = useState(false);
  const [verseWordsTotal, setVerseWordsTotal] = useState(0);

  // Language filter
  const [langFilter, setLangFilter] = useState<LangFilter>('all');

  // Word detail
  const [selectedWord, setSelectedWord] = useState<StrongsWordEntry | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const browseLoadingRef = useRef(false);

  // ── Search ──

  const executeSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return;
    setSearchLoading(true);
    setSearched(true);
    try {
      const res = await strongsDictionaryApi.search(query.trim(), { limit: 50, offset: 0 });
      setResults(res.data);
      setResultTotal(res.total);
    } catch {
      setResults([]);
      setResultTotal(0);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // ── Browse by Book ──

  const loadBookWords = useCallback(async (book: string, page = 0, append = false) => {
    if (!book || browseLoadingRef.current) return;
    browseLoadingRef.current = true;
    setBrowseLoading(true);
    if (!append) setBrowseLoaded(false);
    try {
      const res = await strongsDictionaryApi.getBookWords(book, {
        limit: BROWSE_PAGE_SIZE,
        offset: page * BROWSE_PAGE_SIZE,
      });
      setBrowseWords(prev => (append ? [...prev, ...res.data] : res.data));
      setBrowseTotal(res.total);
      setBrowseHasNext(res.hasNext);
      setBrowsePage(page);
    } catch {
      if (!append) {
        setBrowseWords([]);
        setBrowseTotal(0);
      }
      setBrowseHasNext(false);
    } finally {
      setBrowseLoading(false);
      setBrowseLoaded(true);
      browseLoadingRef.current = false;
    }
  }, []);

  const loadMoreBrowse = useCallback(() => {
    if (browseHasNext && !browseLoading) {
      loadBookWords(selectedBook, browsePage + 1, true);
    }
  }, [browseHasNext, browseLoading, loadBookWords, selectedBook, browsePage]);

  // ── Verse mode ──

  const loadVerseWords = useCallback(async (book: string, chapter: number, verse?: number) => {
    if (!book || !chapter) return;
    setVerseWordsLoading(true);
    setVerseWordsLoaded(false);
    try {
      const res = await strongsDictionaryApi.getVerseUniqueWords(book, chapter, verse);
      setVerseWords(res.data);
      setVerseWordsTotal(res.total);
    } catch {
      setVerseWords([]);
      setVerseWordsTotal(0);
    } finally {
      setVerseWordsLoading(false);
      setVerseWordsLoaded(true);
    }
  }, []);

  // ── Word Detail ──

  const openWordDetail = useCallback(async (word: StrongsWordEntry) => {
    setSelectedWord(word);
    setDetailVisible(true);
  }, []);

  const closeWordDetail = useCallback(() => {
    setDetailVisible(false);
    setSelectedWord(null);
  }, []);

  // ── Mode switching ──

  const switchMode = useCallback((newMode: DictionaryMode) => {
    setMode(newMode);
  }, []);

  return {
    // State
    mode,
    searchQuery,
    results,
    searchLoading,
    searched,
    resultTotal,
    selectedBook,
    browseWords,
    browseLoading,
    browseLoaded,
    browseTotal,
    browseHasNext,
    verseBook,
    verseChapter,
    verseNum,
    verseWords,
    verseWordsLoading,
    verseWordsLoaded,
    verseWordsTotal,
    langFilter,
    selectedWord,
    detailVisible,
    detailLoading,

    // Setters
    setSearchQuery,
    setSearched,
    setSelectedBook,
    setVerseBook,
    setVerseChapter,
    setVerseNum,
    setLangFilter,
    setDetailLoading,

    // Actions
    executeSearch,
    loadBookWords,
    loadMoreBrowse,
    loadVerseWords,
    openWordDetail,
    closeWordDetail,
    switchMode,
  };
}

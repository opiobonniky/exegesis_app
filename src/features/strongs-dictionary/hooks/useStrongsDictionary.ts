import { useState, useCallback, useRef } from 'react';
import { strongsDictionaryApi, StrongsWordEntry } from '../services/strongsDictionaryApi';

export type DictionaryMode = 'study' | 'search' | 'browse' | 'favorites';

export const LANG_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Greek', label: 'Greek' },
  { key: 'Hebrew', label: 'Hebrew' },
] as const;

export type LangFilter = (typeof LANG_FILTERS)[number]['key'];

const BROWSE_PAGE_SIZE = 100;

export function useStrongsDictionary() {
  // Mode — Study Verse is the design's default/selected tab
  const [mode, setMode] = useState<DictionaryMode>('study');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<StrongsWordEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resultTotal, setResultTotal] = useState(0);
  const [searchHasNext, setSearchHasNext] = useState(false);
  const searchOffsetRef = useRef(0);

  // Browse by Book
  const [selectedBook, setSelectedBook] = useState('');
  const [browseWords, setBrowseWords] = useState<StrongsWordEntry[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(0);
  const [browseHasNext, setBrowseHasNext] = useState(false);

  // Language filter
  const [langFilter, setLangFilter] = useState<LangFilter>('all');

  // Word detail
  const [detailVisible, setDetailVisible] = useState(false);

  const browseLoadingRef = useRef(false);

  // ── Search ──

  const executeSearch = useCallback(async (query: string, append = false) => {
    if (query.trim().length < 1) return;
    setSearchLoading(true);
    if (!append) setSearched(true);
    const offset = append ? searchOffsetRef.current : 0;
    try {
      const res = await strongsDictionaryApi.search(query.trim(), { limit: 50, offset });
      setResults(prev => (append ? [...prev, ...res.data] : res.data));
      setResultTotal(res.total);
      const newOffset = offset + res.data.length;
      searchOffsetRef.current = newOffset;
      setSearchHasNext(newOffset < res.total);
    } catch {
      if (!append) {
        setResults([]);
        setResultTotal(0);
      }
      setSearchHasNext(false);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const loadMoreSearch = useCallback(() => {
    if (searchHasNext && !searchLoading) {
      executeSearch(searchQuery, true);
    }
  }, [searchHasNext, searchLoading, executeSearch, searchQuery]);

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

  // ── Word Detail ──

  const openWordDetail = useCallback(() => {
    setDetailVisible(true);
  }, []);

  const closeWordDetail = useCallback(() => {
    setDetailVisible(false);
  }, []);

  // ── Mode switching ──

  const switchMode = useCallback((newMode: DictionaryMode) => {
    setMode(newMode);
  }, []);

  return {
    mode,
    searchQuery,
    results,
    searchLoading,
    searched,
    resultTotal,
    searchHasNext,
    selectedBook,
    browseWords,
    browseLoading,
    browseLoaded,
    browseTotal,
    browseHasNext,
    langFilter,
    detailVisible,

    setSearchQuery,
    setSelectedBook,
    setLangFilter,

    executeSearch,
    loadMoreSearch,
    loadBookWords,
    loadMoreBrowse,
    openWordDetail,
    closeWordDetail,
    switchMode,
  };
}

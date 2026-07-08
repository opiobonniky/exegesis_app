import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  searchApi,
  SearchResult,
  StrongsResult,
  JournalSearchResult,
  TopicResult,
  LemmaResult,
  CrossTranslationResult,
  PopularSearchItem,
  SearchScope,
} from '../../../services/searchApi';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

// ── Translations available for cross-translation search ──
// These are the 8 local translations indexed in search_index
const CROSS_TRANSLATION_OPTIONS = [
  { id: 'Berean', abbr: 'BSB', name: 'Berean Standard Bible' },
  { id: 'KJV', abbr: 'KJV', name: 'King James Version' },
  { id: 'WEB', abbr: 'WEB', name: 'World English Bible' },
  { id: 'ASV', abbr: 'ASV', name: 'American Standard Version' },
  { id: 'YLT', abbr: 'YLT', name: "Young's Literal Translation" },
  { id: 'Darby', abbr: 'DBY', name: 'Darby Translation' },
  { id: 'Webster', abbr: 'WBS', name: "Webster's Bible" },
  { id: 'BBE', abbr: 'BBE', name: 'Bible in Basic English' },
];

export function useSearch() {
  const [query, setQueryState] = useState('');
  const [scope, setScopeState] = useState<SearchScope>('bible');
  const [bookName, setBookNameState] = useState<string | undefined>(undefined);
  const [translations, setTranslationsState] = useState<string[]>([]);
  const [results, setResults] = useState<(SearchResult | StrongsResult | JournalSearchResult | TopicResult | LemmaResult | CrossTranslationResult)[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [relatedWords, setRelatedWords] = useState<LemmaResult[]>([]);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<
    PopularSearchItem[]
  >([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSearchedRef = useRef(false);
  const requestIdRef = useRef(0);
  const historyLoadedRef = useRef(false);

  // ── Load search history from AsyncStorage on mount ──
  useEffect(() => {
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    AsyncStorage.getItem(SEARCH_HISTORY_KEY).then(saved => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSearchHistory(parsed.slice(0, MAX_HISTORY_ITEMS));
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // ── Fetch popular searches from backend ──
  useEffect(() => {
    searchApi.getPopularSearches({ scope, limit: 8, days: 7 }).then(items => {
      if (items.length > 0) {
        setPopularSearches(items);
      }
    }).catch(() => {});
  }, [scope]);

  // ── Save query to history after a successful search ──
  const saveToHistory = useCallback((q: string) => {
    if (q.trim().length < 3) return;
    setSearchHistory(prev => {
      const cleaned = q.trim();
      // Remove duplicate if exists, then prepend
      const filtered = prev.filter(item => item.toLowerCase() !== cleaned.toLowerCase());
      const updated = [cleaned, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // ── Clear all search history ──
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    AsyncStorage.removeItem(SEARCH_HISTORY_KEY).catch(() => {});
  }, []);

  // ── Remove a single history item ──
  const removeHistoryItem = useCallback((item: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(i => i !== item);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      if (hasSearchedRef.current) {
        setResults([]);
        setTotal(0);
        setPage(1);
        setLoading(false);
      }
      return;
    }

    hasSearchedRef.current = true;
    const requestId = ++requestIdRef.current;

    setError(null);
    setRelatedWords([]);
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        if (scope === 'strongs') {
          const res = await searchApi.searchStrongs(trimmed, { limit: 50 });
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else if (scope === 'journal') {
          const res = await searchApi.searchJournal(trimmed, { limit: 50 });
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else if (scope === 'topics') {
          const res = await searchApi.searchTopics(trimmed, { limit: 50 });
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else if (scope === 'lemma') {
          const res = await searchApi.searchLemma(trimmed);
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else {
          // Cross-translation search when 2+ translations selected
          if (translations.length >= 2) {
            const res = await searchApi.searchCross(trimmed, {
              translations,
              bookName,
              limit: 50,
            });
            if (requestId !== requestIdRef.current) return;
            if (res.success) {
              setResults(res.data as any);
              setTotal(res.total);
            } else {
              setResults([]);
              setTotal(0);
            }
          } else {
            const res = await searchApi.search(trimmed, {
              limit: 50,
              bookName,
            });
            if (requestId !== requestIdRef.current) return;
            if (res.success) {
              setResults(res.data);
              setTotal(res.total);
            } else {
              setResults([]);
              setTotal(0);
            }
          }
        }
        setPage(1);
      } catch (e: any) {
        if (requestId !== requestIdRef.current) return;
        setError(e?.message || 'Search failed');
        setResults([]);
        setTotal(0);
      } finally {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        setSearchedOnce(true);
        // Save to search history after each successful search
        if (!error) {
          saveToHistory(query);
          // Log to popular searches backend (fire-and-forget)
          searchApi.logSearch(query.trim(), scope).catch(() => {});
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, scope, bookName, translations]);

  const search = useCallback((q: string, currentScope?: SearchScope) => {
    const activeScope = currentScope ?? scope;
    setQueryState(q);
    setScopeState(activeScope);
  }, [scope]);

  const switchScope = useCallback((newScope: SearchScope) => {
    setScopeState(newScope);
    setBookNameState(undefined);
    setRelatedWords([]);
  }, []);

  const setBookFilter = useCallback((book: string | undefined) => {
    setBookNameState(book);
  }, []);

  const setTranslations = useCallback((t: string[]) => {
    setTranslationsState(t);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || query.trim().length < 3) return;
    const nextPage = page + 1;
    setLoading(true);

    try {
      if (scope === 'strongs') {
        const res = await searchApi.searchStrongs(query.trim(), {
          limit: 50,
          offset: (nextPage - 1) * 50,
        });
        setResults(prev => [...prev, ...res.data]);
      } else if (scope === 'journal') {
        const res = await searchApi.searchJournal(query.trim(), {
          limit: 50,
          offset: (nextPage - 1) * 50,
        });
        setResults(prev => [...prev, ...res.data]);
      } else if (scope === 'topics') {
        const res = await searchApi.searchTopics(query.trim(), {
          limit: 50,
        });
        setResults(prev => [...prev, ...res.data]);
      } else {
        // Cross-translation load more
        if (translations.length >= 2) {
          const res = await searchApi.searchCross(query.trim(), {
            translations,
            bookName,
            limit: 50,
            offset: (nextPage - 1) * 50,
          });
          if (res.success) {
            setResults(prev => [...prev, ...res.data as any]);
          }
        } else {
          const res = await searchApi.search(query.trim(), {
            limit: 50,
            offset: (nextPage - 1) * 50,
            bookName,
          });
          if (res.success) {
            setResults(prev => [...prev, ...res.data]);
          }
        }
      }
      setPage(nextPage);
    } catch (e: any) {
      setError(e?.message || 'Load more failed');
    } finally {
      setLoading(false);
    }
  }, [loading, query, scope, page, bookName, translations]);

  const loadRelatedWords = useCallback(async (strongsId: string) => {
    try {
      const words = await searchApi.searchRelatedWords(strongsId);
      setRelatedWords(words);
    } catch {
      setRelatedWords([]);
    }
  }, []);

  const clearQuery = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQueryState('');
    setResults([]);
    setTotal(0);
    setPage(1);
    setError(null);
    setRelatedWords([]);
  }, []);

  const searchImmediate = useCallback((q: string, currentScope?: SearchScope) => {
    const activeScope = currentScope ?? scope;
    setQueryState(q);
    setScopeState(activeScope);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (trimmed.length < 3) return;
    const requestId = ++requestIdRef.current;
    setError(null);
    setRelatedWords([]);
    setLoading(true);
    const doSearch = async () => {
      try {
        if (activeScope === 'strongs') {
          const res = await searchApi.searchStrongs(trimmed, { limit: 50 });
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else if (activeScope === 'journal') {
          const res = await searchApi.searchJournal(trimmed, { limit: 50 });
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else if (activeScope === 'topics') {
          const res = await searchApi.searchTopics(trimmed, { limit: 50 });
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else if (activeScope === 'lemma') {
          const res = await searchApi.searchLemma(trimmed);
          if (requestId !== requestIdRef.current) return;
          setResults(res.data);
          setTotal(res.total);
        } else {
          if (translations.length >= 2) {
            const res = await searchApi.searchCross(trimmed, {
              translations,
              limit: 50,
            });
            if (requestId !== requestIdRef.current) return;
            if (res.success) {
              setResults(res.data as any);
              setTotal(res.total);
            } else {
              setResults([]);
              setTotal(0);
            }
          } else {
            const res = await searchApi.search(trimmed, { limit: 50 });
            if (requestId !== requestIdRef.current) return;
            if (res.success) {
              setResults(res.data);
              setTotal(res.total);
            } else {
              setResults([]);
              setTotal(0);
            }
          }
        }
        setPage(1);
      } catch (e: any) {
        if (requestId !== requestIdRef.current) return;
        setError(e?.message || 'Search failed');
        setResults([]);
        setTotal(0);
      } finally {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        setSearchedOnce(true);
        // Save to search history after immediate search
        if (!error) {
          saveToHistory(q);
          searchApi.logSearch(q.trim(), activeScope).catch(() => {});
        }
      }
    };
    doSearch();
  }, [scope]);    return {
    query,
    setQuery: search,
    searchImmediate,
    scope,
    switchScope,
    bookName,
    setBookFilter,
    translations,
    setTranslations,
    results,
    loading,
    total,
    error,
    loadMore,
    clearQuery,
    searchedOnce,
    relatedWords,
    loadRelatedWords,
    searchHistory,
    clearHistory,
    removeHistoryItem,
    popularSearches,
    CROSS_TRANSLATION_OPTIONS,
  };
}

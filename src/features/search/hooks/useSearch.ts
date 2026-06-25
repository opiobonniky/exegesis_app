import { useState, useCallback, useRef, useEffect } from 'react';
import {
  searchApi,
  SearchResult,
  StrongsResult,
  JournalSearchResult,
  TopicResult,
  LemmaResult,
  SearchScope,
} from '../../../services/searchApi';

export function useSearch() {
  const [query, setQueryState] = useState('');
  const [scope, setScopeState] = useState<SearchScope>('bible');
  const [bookName, setBookNameState] = useState<string | undefined>(undefined);
  const [results, setResults] = useState<(SearchResult | StrongsResult | JournalSearchResult | TopicResult | LemmaResult)[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [relatedWords, setRelatedWords] = useState<LemmaResult[]>([]);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSearchedRef = useRef(false);

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

    setError(null);
    setRelatedWords([]);
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        if (scope === 'strongs') {
          const res = await searchApi.searchStrongs(trimmed, { limit: 50 });
          setResults(res.data);
          setTotal(res.total);
        } else if (scope === 'journal') {
          const res = await searchApi.searchJournal(trimmed, { limit: 50 });
          setResults(res.data);
          setTotal(res.total);
        } else if (scope === 'topics') {
          const res = await searchApi.searchTopics(trimmed, { limit: 50 });
          setResults(res.data);
          setTotal(res.total);
        } else if (scope === 'lemma') {
          const res = await searchApi.searchLemma(trimmed);
          setResults(res.data);
          setTotal(res.total);
        } else {
          const res = await searchApi.search(trimmed, {
            limit: 50,
            bookName,
          });
          if (res.success) {
            setResults(res.data);
            setTotal(res.total);
          } else {
            setResults([]);
            setTotal(0);
          }
        }
        setPage(1);
      } catch (e: any) {
        setError(e?.message || 'Search failed');
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
        setSearchedOnce(true);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, scope, bookName]);

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
        const res = await searchApi.search(query.trim(), {
          limit: 50,
          offset: (nextPage - 1) * 50,
          bookName,
        });
        if (res.success) {
          setResults(prev => [...prev, ...res.data]);
        }
      }
      setPage(nextPage);
    } catch (e: any) {
      setError(e?.message || 'Load more failed');
    } finally {
      setLoading(false);
    }
  }, [loading, query, scope, page, bookName]);

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

  return {
    query,
    setQuery: search,
    scope,
    switchScope,
    bookName,
    setBookFilter,
    results,
    loading,
    total,
    error,
    loadMore,
    clearQuery,
    relatedWords,
    loadRelatedWords,
  };
}

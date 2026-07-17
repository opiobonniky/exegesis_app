import { api, sendPostRequest } from './api';
import { getStrongsEntry } from './strongsService';
import { getAllJournalEntries } from './api';

export interface SearchResult {
  book_number: number;
  book_name: string;
  chapter: number;
  verse: number;
  verse_text: string;
  rank?: number;
  headline?: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  total: number;
  page: number;
  limit: number;
  data: SearchResult[];
}

export interface StrongsResult {
  id: string;
  strongsId: string;
  originalWord: string | null;
  transliteration: string | null;
  shortDefinition: string;
  language: string;
  usageCount: number | null;
}

export interface JournalSearchResult {
  id: number;
  title: string;
  content: string;
  bookName?: string;
  chapter?: number;
  verseNumber?: number;
  tags?: string;
  createdAt: string;
}

export interface TopicResult {
  id: number;
  topicName: string;
  description: string | null;
  verseRefs: string | null;
}

export interface LemmaResult {
  strongsId: string;
  originalWord: string | null;
  transliteration: string | null;
  shortDefinition: string;
  language: string;
  usageCount: number | null;
}

export interface CrossTranslationResult {
  translation: string;
  translationAbbr: string;
  book_number: number;
  book_name: string;
  chapter: number;
  verse: number;
  verse_text: string;
  rank: number;
}

export interface CrossTranslationResponse {
  success: boolean;
  query: string;
  total: number;
  page: number;
  limit: number;
  data: CrossTranslationResult[];
}

export interface PopularSearchItem {
  query: string;
  scope: SearchScope;
  count: number;
}

export type SearchScope = 'bible' | 'strongs' | 'journal' | 'topics' | 'lemma';

export const searchApi = {
  search: async (
    query: string,
    options?: {
      translation?: string;
      bookName?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<SearchResponse> => {
    const translationId = options?.translation || 'Berean';
    const response = await sendPostRequest('translations', `${translationId}/search-fts`, {
      query,
      bookName: options?.bookName || undefined,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    });
    if (response.returnCode === 200 && response.returnData) {
      const rd = response.returnData as any;
      return {
        success: true,
        query: rd.query || query,
        total: rd.total ?? 0,
        page: rd.page ?? 1,
        limit: rd.limit ?? 50,
        data: rd.data || [],
      };
    }
    return { success: false, query, total: 0, page: 1, limit: 50, data: [] };
  },

  searchStrongs: async (
    query: string,
    _options?: { limit?: number; offset?: number },
  ): Promise<{ data: StrongsResult[]; total: number }> => {
    try {
      const response = await api.get('/strongs/search', {
        params: { q: query, limit: _options?.limit ?? 50, offset: _options?.offset ?? 0 },
      });
      const body = response.data as any;
      if (body?.returnCode === 200 && body?.returnData) {
        return { data: body.returnData.data, total: body.returnData.total };
      }
      return { data: [], total: 0 };
    } catch {
      const cleanId = query.trim().toUpperCase();
      if (cleanId.startsWith('G') || cleanId.startsWith('H')) {
        const entry = await getStrongsEntry(cleanId);
        if (entry.returnCode === 200 && entry.returnData) {
          const d = entry.returnData;
          return {
            data: [{
              id: cleanId,
              strongsId: cleanId,
              originalWord: d.originalWord,
              transliteration: d.transliteration,
              shortDefinition: d.shortDefinition || '',
              language: d.language,
              usageCount: d.usageCount,
            }],
            total: 1,
          };
        }
      }
      return { data: [], total: 0 };
    }
  },

  searchJournal: async (
    query: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ data: JournalSearchResult[]; total: number }> => {
    const pageSize = options?.limit ?? 50;
    const page = ((options?.offset ?? 0) / pageSize) + 1;
    const res = await getAllJournalEntries({ search: query, page, pageSize });
    if (res.returnCode === 200 && res.returnData) {
      return {
        data: (res.returnData.entries ?? []).map((e: any) => ({
          id: e.id,
          title: e.title || '',
          content: e.content || e.reflection || '',
          bookName: e.bookName,
          chapter: e.chapter,
          verseNumber: e.verseNumber,
          tags: e.tags,
          createdAt: e.createdAt || '',
        })),
        total: (res.returnData as any).totalCount ?? res.returnData.entries.length,
      };
    }
    return { data: [], total: 0 };
  },

  searchTopics: async (
    query: string,
    options?: { limit?: number },
  ): Promise<{ data: TopicResult[]; total: number }> => {
    try {
      const response = await api.get('/strongs/topics/search', {
        params: { q: query, limit: options?.limit ?? 50 },
      });
      const body = response.data as any;
      if (body?.returnCode === 200 && body?.returnData) {
        return { data: body.returnData.data, total: body.returnData.total };
      }
      return { data: [], total: 0 };
    } catch {
      return { data: [], total: 0 };
    }
  },

  searchLemma: async (
    query: string,
  ): Promise<{ data: LemmaResult[]; total: number }> => {
    try {
      const response = await api.get('/strongs/search', {
        params: { q: query, limit: 50 },
      });
      const body = response.data as any;
      if (body?.returnCode === 200 && body?.returnData) {
        return { data: body.returnData.data, total: body.returnData.total };
      }
      return { data: [], total: 0 };
    } catch {
      return { data: [], total: 0 };
    }
  },

  searchCross: async (
    query: string,
    options?: {
      translations?: string[];
      bookName?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<CrossTranslationResponse> => {
    const response = await sendPostRequest('translations', 'search-cross', {
      query,
      translations: options?.translations,
      bookName: options?.bookName,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    });
    if (response.returnCode === 200 && response.returnData) {
      const rd = response.returnData as any;
      return {
        success: true,
        query: rd.query || query,
        total: rd.total ?? 0,
        page: rd.page ?? 1,
        limit: rd.limit ?? 50,
        data: rd.data || [],
      };
    }
    return { success: false, query, total: 0, page: 1, limit: 50, data: [] };
  },

  /**
   * Log a search query to the backend for popularity tracking.
   * Silently fails — never blocks the user's search.
   */
  logSearch: async (
    query: string,
    scope: SearchScope = 'bible',
  ): Promise<void> => {
    try {
      await api.post('/popular-searches/log', { query, scope });
    } catch {
      // Silently fail
    }
  },

  /**
   * Fetch popular search suggestions from the backend.
   * Returns top searches within the given scope and time window.
   */
  getPopularSearches: async (
    options?: {
      scope?: SearchScope;
      limit?: number;
      days?: number;
    },
  ): Promise<PopularSearchItem[]> => {
    try {
      const response = await api.get('/popular-searches', {
        params: {
          scope: options?.scope,
          limit: options?.limit ?? 12,
          days: options?.days ?? 7,
        },
      });
      const body = response.data as any;
      if (body?.returnCode === 200 && body?.returnData) {
        return body.returnData;
      }
      return [];
    } catch {
      return [];
    }
  },

  searchRelatedWords: async (
    strongsId: string,
  ): Promise<LemmaResult[]> => {
    try {
      const response = await api.get(`/strongs/search-related/${strongsId}`);
      const body = response.data as any;
      if (body?.returnCode === 200 && body?.returnData) {
        return body.returnData;
      }
      return [];
    } catch {
      return [];
    }
  },
};

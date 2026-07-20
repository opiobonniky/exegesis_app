import { api, GenericResponse, sendGet, sendPostRequest } from '../../../services/api';
import {
  StrongsEntry,
  StrongsVerseRef,
  getStrongsEntry as fetchStrongsEntry,
} from '../../../services/strongsService';

export interface StrongsWordEntry {
  strongsId: string;
  originalWord: string | null;
  transliteration: string | null;
  shortDefinition: string;
  fullDefinition: string | null;
  language: string;
  partOfSpeech: string | null;
  grammaticalCase: string | null;
  gender: string | null;
  number: string | null;
  usageCount: number | null;
  crossReferences: string | null;
  adminExplanation: string | null;
}

export interface StrongsSearchResponse {
  data: StrongsWordEntry[];
  total: number;
}

export interface VerseUniqueWord {
  wordOrder: number;
  surfaceText: string;
  strongsId: string | null;
  lemma: string | null;
  morphology: string | null;
  hasData: boolean;
  verseNumber: number;
  strongs: StrongsWordEntry | null;
}

export interface VerseUniqueWordsResponse {
  data: VerseUniqueWord[];
  total: number;
}

export interface BookWordsResponse {
  data: StrongsWordEntry[];
  total: number;
  hasNext: boolean;
}

export const strongsDictionaryApi = {
  search: async (
    query: string,
    options?: { limit?: number; offset?: number },
  ): Promise<StrongsSearchResponse> => {
    try {
      const res = await sendGet<StrongsSearchResponse>('strongs', 'search', {
        q: query.trim(),
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      });
      if (res.returnCode === 200 && res.returnData) {
        return res.returnData;
      }
      return { data: [], total: 0 };
    } catch {
      const cleanId = query.trim().toUpperCase();
      if (cleanId.startsWith('G') || cleanId.startsWith('H')) {
        const entry = await fetchStrongsEntry(cleanId);
        if (entry.returnCode === 200 && entry.returnData) {
          const d = entry.returnData;
          return {
            data: [{
              strongsId: cleanId,
              originalWord: d.originalWord,
              transliteration: d.transliteration,
              shortDefinition: d.shortDefinition || '',
              fullDefinition: d.fullDefinition,
              language: d.language,
              partOfSpeech: d.partOfSpeech,
              grammaticalCase: d.grammaticalCase,
              gender: d.gender,
              number: d.number,
              usageCount: d.usageCount,
              crossReferences: d.crossReferences,
              adminExplanation: null,
            }],
            total: 1,
          };
        }
      }
      return { data: [], total: 0 };
    }
  },

  getBookWords: async (
    bookName: string,
    options?: { limit?: number; offset?: number },
  ): Promise<BookWordsResponse> => {
    try {
      const res = await sendGet<BookWordsResponse>(
        'strongs',
        `book-words/${encodeURIComponent(bookName)}`,
        {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      );
      if (res.returnCode === 200 && res.returnData) {
        return res.returnData;
      }
      return { data: [], total: 0, hasNext: false };
    } catch {
      return { data: [], total: 0, hasNext: false };
    }
  },

  getVerseUniqueWords: async (
    bookName: string,
    chapter: number,
    verse?: number,
    translation?: string,
  ): Promise<VerseUniqueWordsResponse> => {
    try {
      const res = await sendPostRequest<VerseUniqueWordsResponse>(
        'strongs',
        'verse-unique-words',
        {
          bookName,
          chapter,
          ...(verse ? { verse } : {}),
          translation: translation || 'BSB',
        },
      );
      if (res.returnCode === 200 && res.returnData) {
        return res.returnData;
      }
      return { data: [], total: 0 };
    } catch {
      return { data: [], total: 0 };
    }
  },

  getVersesByStrongs: async (
    strongsId: string,
    translation?: string,
    limit?: number,
  ): Promise<StrongsVerseRef[]> => {
    try {
      const params: any = {};
      if (translation) params.translation = translation;
      if (limit) params.limit = limit;
      const response = await api.get<GenericResponse<StrongsVerseRef[]>>(
        `/strongs/${strongsId}/verses`,
        { params },
      );
      if (response.data?.returnCode === 200 && response.data?.returnData) {
        return response.data.returnData;
      }
      return [];
    } catch {
      return [];
    }
  },

  getRelatedWords: async (strongsId: string): Promise<StrongsWordEntry[]> => {
    try {
      const response = await api.get<GenericResponse<StrongsWordEntry[]>>(
        `/strongs/search-related/${strongsId}`,
      );
      if (response.data?.returnCode === 200 && response.data?.returnData) {
        return response.data.returnData;
      }
      return [];
    } catch {
      return [];
    }
  },
};

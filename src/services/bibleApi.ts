import { api } from './api';
import { checkInternetConnection } from '../utilits/checkInternet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BibleVersion, isLocalTranslation } from '../assets/bibleVersion/json/bibleVersions';

export interface Translation {
  id: string;
  name: string;
  shortName: string;
  year?: string | null;
  description: string | null;
  copyright: string | null;
  link: string | null;
}

export interface TranslationSettings {
  freeTranslationsOnly: boolean;
  defaultTranslationId: string;
}

export interface BookInfo {
  bookNumber: number;
  bookName: string;
  testament: string;
  chaptersCount: number;
  totalVerses: number;
}

export interface BookWithMaxChapter extends BookInfo {
  maxChapter: number;
}

export interface Chapter {
  chapterNumber: number;
  versesCount: number;
}

export interface BookChapterData {
  bookNumber: number;
  bookName: string;
  chapters: Chapter[];
}

export interface Verse {
  verseNumber: number;
  text: string;
}

export interface VerseData {
  bookNumber: number;
  bookName: string;
  chapterNumber: number;
  verses: Verse[];
}

export interface SearchResult {
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

const TRANSLATIONS_BASE_URL = '/translations';
const BIBLE_CACHE_KEY = 'bible_cache';

let isOnline: boolean | null = null;
let lastOnlineCheck: number = 0;
const ONLINE_CHECK_INTERVAL = 60000;

export const checkOnlineStatus = async (): Promise<boolean> => {
  const now = Date.now();
  if (isOnline !== null && now - lastOnlineCheck < ONLINE_CHECK_INTERVAL) {
    return isOnline;
  }

  lastOnlineCheck = now;

  try {
    const connected = await checkInternetConnection();
    if (!connected) {
      isOnline = false;
      return false;
    }
    try {
      await api.get('/health', { timeout: 5000 });
      isOnline = true;
      return true;
    } catch {
      isOnline = false;
      return false;
    }
  } catch {
    isOnline = false;
    return false;
  }
};

export const forceRefreshOnlineStatus = async (): Promise<boolean> => {
  lastOnlineCheck = 0;
  return checkOnlineStatus();
};

export const getOnlineStatus = (): boolean | null => isOnline;

export const mapTranslationId = (frontendId: string): string => {
  const mapping: Record<string, string> = {
    BSB: 'Berean',
    Berean: 'Berean',
    KJV: 'KJV',
    WEB: 'GW',
    ASV: 'ASV',
    YLT: 'YLT',
    DARBY: 'Darby',
    WEBSTER: 'Amplified',
    BBE: 'EASY',
    NIV: 'NIV',
    ESV: 'ESV',
    NASB: 'NASB',
    NKJ: 'NKJ',
    NLT: 'NLT',
    CSB: 'CSB',
    HCSB: 'HCSB',
    GNT: 'GNT',
    NIRV: 'NIRV',
    RSV: 'RSV',
    NRSV: 'NRSV',
    NET: 'NET',
    MEV: 'MEV',
    LSB: 'LSB',
    NASU: 'NASU',
    AmplifiedClassic: 'AmplifiedClassic',
    EASY: 'EASY',
    Passion: 'Passion',
    TL: 'TL',
    Tyndale: 'Tyndale',
    ERV: 'ERV',
  };
  return mapping[frontendId] || frontendId;
};

export const mapFrontendId = (backendId: string): string => {
  const mapping: Record<string, string> = {
    Berean: 'BSB',
    KJV: 'KJV',
    GW: 'WEB',
    ASV: 'ASV',
    YLT: 'YLT',
    Darby: 'DARBY',
    Amplified: 'WEBSTER',
    EASY: 'BBE',
    NIV: 'NIV',
    ESV: 'ESV',
    NASB: 'NASB',
    NKJ: 'NKJ',
    NLT: 'NLT',
    CSB: 'CSB',
    HCSB: 'HCSB',
    GNT: 'GNT',
    NIRV: 'NIRV',
    RSV: 'RSV',
    NRSV: 'NRSV',
    NET: 'NET',
    MEV: 'MEV',
    LSB: 'LSB',
    NASU: 'NASU',
    AmplifiedClassic: 'AMPClassic',
    Passion: 'Passion',
    TL: 'TL',
    Tyndale: 'Tyndale',
    ERV: 'ERV',
  };
  return mapping[backendId] || backendId;
};

const getCache = async (key: string): Promise<any | null> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Cache get error:', e);
  }
  return null;
};

const setCache = async (key: string, data: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Cache set error:', e);
  }
};

export const bibleApi = {
  getTranslations: async (): Promise<Translation[]> => {
    const online = await checkOnlineStatus();
    if (!online) {
      return [];
    }
    try {
      const response = await api.post(`${TRANSLATIONS_BASE_URL}/`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch translations:', error);
      return [];
    }
  },

  getTranslation: async (
    translationId: string,
  ): Promise<Translation | null> => {
    const online = await checkOnlineStatus();
    if (!online) {
      if (isLocalTranslation(translationId)) {
        const { getBibleBooks } = require('../utilits/bibleUtils');
        return getBibleBooks().map(b => ({
          bookNumber: 0,
          bookName: b.name,
          testament: b.testament,
          chaptersCount: b.chapters,
          totalVerses: b.verses,
          maxChapter: b.chapters,
        }));
      }
      return [];
    }
    try {
      const response = await api.post(
        `${TRANSLATIONS_BASE_URL}/${translationId}`,
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch translation ${translationId}:`, error);
      return null;
    }
  },

  getBooks: async (translationId: string): Promise<BookInfo[]> => {
    const backendId = mapTranslationId(translationId);
    const online = await checkOnlineStatus();
    if (!online) {
      if (isLocalTranslation(translationId)) {
        const { getBibleBooks } = require('../utilits/bibleUtils');
        const local = getBibleBooks();
        return local.map(b => ({
          bookNumber: 0,
          bookName: b.name,
          testament: b.testament,
          chaptersCount: b.chapters,
          totalVerses: b.verses,
        }));
      }
      return [];
    }
    try {
      const response = await api.post(
        `${TRANSLATIONS_BASE_URL}/${backendId}/books`,
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error(`Failed to fetch books for ${translationId}:`, error);
      if (isLocalTranslation(translationId)) {
        const { getBibleBooks } = require('../utilits/bibleUtils');
        const local = getBibleBooks();
        return local.map(b => ({
          bookNumber: 0,
          bookName: b.name,
          testament: b.testament,
          chaptersCount: b.chapters,
          totalVerses: b.verses,
        }));
      }
      return [];
    }
  },

  getBooksWithMaxChapters: async (
    translationId: string,
  ): Promise<BookWithMaxChapter[]> => {
    const backendId = mapTranslationId(translationId);
    const cacheKey = `${BIBLE_CACHE_KEY}:books:${backendId}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const online = await checkOnlineStatus();
    if (!online) {
      return [];
    }
    try {
      const response = await api.post(
        `${TRANSLATIONS_BASE_URL}/${backendId}/books-with-max`,
      );
      if (response.data.success && response.data.data) {
        await setCache(cacheKey, response.data.data);
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error(
        `Failed to fetch books with max chapters for ${translationId}:`,
        error,
      );
      return [];
    }
  },

  getChapters: async (
    translationId: string,
    bookName: string,
  ): Promise<BookChapterData | null> => {
    const backendId = mapTranslationId(translationId);
    const online = await checkOnlineStatus();
    if (!online) {
      if (isLocalTranslation(translationId)) {
        const { getChaptersForBook } = require('../utilits/bibleUtils');
        const chapters = getChaptersForBook(bookName);
        return {
          bookNumber: 0,
          bookName,
          chapters: chapters.map(c => ({
            chapterNumber: c,
            versesCount: 0,
          })),
        };
      }
      return null;
    }
    try {
      const response = await api.post(
        `${TRANSLATIONS_BASE_URL}/${backendId}/chapters`,
        {
          bookName,
        },
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch chapters for ${bookName}:`, error);
      if (isLocalTranslation(translationId)) {
        const { getChaptersForBook } = require('../utilits/bibleUtils');
        const chapters = getChaptersForBook(bookName);
        return {
          bookNumber: 0,
          bookName,
          chapters: chapters.map(c => ({
            chapterNumber: c,
            versesCount: 0,
          })),
        };
      }
      return null;
    }
  },

  getVerses: async (
    translationId: string,
    bookName: string,
    chapter: number,
  ): Promise<VerseData | null> => {
    const backendId = mapTranslationId(translationId);
    const cacheKey = `${BIBLE_CACHE_KEY}:verses:${backendId}:${bookName}:${chapter}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const online = await checkOnlineStatus();
    if (!online) {
      // Offline: fall back to local JSON bundle for local translations
      if (isLocalTranslation(translationId)) {
        return loadVersesFromLocalBundle(translationId, bookName, chapter);
      }
      return null;
    }
    try {
      const response = await api.post(
        `${TRANSLATIONS_BASE_URL}/${backendId}/verses`,
        {
          bookName,
          chapter,
        },
      );
      if (response.data.success && response.data.data) {
        await setCache(cacheKey, response.data.data);
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(
        `Failed to fetch verses for ${bookName} ${chapter}:`,
        error,
      );
      // If API fails but we have a local version, use it
      if (isLocalTranslation(translationId)) {
        return loadVersesFromLocalBundle(translationId, bookName, chapter);
      }
      return null;
    }
  },

  getVerse: async (
    translationId: string,
    bookName: string,
    chapter: number,
    verseNumber: number,
  ): Promise<Verse | null> => {
    const backendId = mapTranslationId(translationId);
    const online = await checkOnlineStatus();
    if (!online) {
      if (isLocalTranslation(translationId)) {
        const { getVerseText } = require('../utilits/bibleUtils');
        const text = getVerseText(bookName, chapter, verseNumber);
        if (text) return { verseNumber, text };
      }
      return null;
    }
    try {
      const response = await api.post(
        `${TRANSLATIONS_BASE_URL}/${backendId}/verse`,
        {
          bookName,
          chapter,
          verseNumber,
        },
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(
        `Failed to fetch verse ${bookName} ${chapter}:${verseNumber}:`,
        error,
      );
      if (isLocalTranslation(translationId)) {
        const { getVerseText } = require('../utilits/bibleUtils');
        const text = getVerseText(bookName, chapter, verseNumber);
        if (text) return { verseNumber, text };
      }
      return null;
    }
  },

  search: async (
    translationId: string,
    query: string,
    limit: number = 50,
  ): Promise<SearchResult[]> => {
    const backendId = mapTranslationId(translationId);
    const online = await checkOnlineStatus();
    if (!online) {
      if (isLocalTranslation(translationId)) {
        const { searchVerses } = require('../utilits/bibleUtils');
        return searchVerses(query, limit).map(r => ({
          bookNumber: 0,
          bookName: r.book,
          chapter: r.chapter,
          verse: r.verse,
          text: r.text,
        }));
      }
      return [];
    }
    try {
      const response = await api.post(
        `${TRANSLATIONS_BASE_URL}/${backendId}/search`,
        {
          query,
          limit,
        },
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error(`Search failed for ${translationId}:`, error);
      if (isLocalTranslation(translationId)) {
        const { searchVerses } = require('../utilits/bibleUtils');
        return searchVerses(query, limit).map(r => ({
          bookNumber: 0,
          bookName: r.book,
          chapter: r.chapter,
          verse: r.verse,
          text: r.text,
        }));
      }
      return [];
    }
  },

  getAvailableTranslations: async (): Promise<Translation[]> => {
    const online = await checkOnlineStatus();
    if (!online) {
      const {
        BIBLE_VERSIONS,
      } = require('../assets/bibleVersion/json/bibleVersions');
      return BIBLE_VERSIONS.map((v: Translation) => ({
        id: v.id,
        name: v.name,
        shortName: v.shortName,
        description: v.description,
        year: v.year,
        copyright: v.copyright,
        link: v.link,
      }));
    }
    try {
      const response = await api.post(`${TRANSLATIONS_BASE_URL}/`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch translations:', error);
      return [];
    }
  },

  getAvailableTranslationsWithMapping: async (): Promise<
    Array<{
      id: string;
      frontendId: string;
      backendId: string;
      name: string;
      shortName: string;
      year?: string | null;
      description: string | null;
      link: string | null;
      copyright: string | null;
    }>
  > => {
    const online = await checkOnlineStatus();

    if (online) {
      try {
        const response = await api.post(`${TRANSLATIONS_BASE_URL}/`);

        if (response.data.success && response.data.data) {
          return response.data.data.map((t: Translation) => {
            const backendId = t.id;
            const frontendId = mapFrontendId(backendId);
            return {
              id: frontendId,
              frontendId,
              backendId,
              name: t.name,
              shortName: t.shortName,
              year: t.year,
              description: t.description,
              link: t.link,
              copyright: t.copyright,
            };
          });
        }
      } catch (error) {
        console.error('Failed to fetch translations:', error);
      }
    }

    const {
      BIBLE_VERSIONS,
    } = require('../assets/bibleVersion/json/bibleVersions');
    return BIBLE_VERSIONS.map((v: BibleVersion) => ({
      id: v.id,
      frontendId: v.id,
      backendId: mapTranslationId(v.id),
      name: v.name,
      shortName: v.abbreviation,
      year: String(v.year),
      description: v.description,
      link: null,
      copyright: null,
    }));
  },

  getTranslationSettings: async (): Promise<TranslationSettings> => {
    try {
      const response = await api.get(`${TRANSLATIONS_BASE_URL}/settings`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to fetch translation settings:', error);
    }
    return { freeTranslationsOnly: false, defaultTranslationId: 'Berean' };
  },
};

export default bibleApi;

// ─── Local bundle helper (offline fallback) ────────────────────────────────

const VERSION_FILE_MAP: Record<string, { id: string; load: () => Record<string, string> }> = {};

const getVersionData = (translationId: string): Record<string, string> | null => {
  try {
    if (!VERSION_FILE_MAP[translationId]) {
      const { BIBLE_VERSIONS } = require('../assets/bibleVersion/json/bibleVersions');
      const found = BIBLE_VERSIONS.find((v: any) => v.id === translationId);
      if (found) {
        VERSION_FILE_MAP[translationId] = found;
      } else {
        return null;
      }
    }
    return VERSION_FILE_MAP[translationId].load();
  } catch {
    return null;
  }
};

const loadVersesFromLocalBundle = (
  translationId: string,
  bookName: string,
  chapter: number,
): VerseData | null => {
  const data = getVersionData(translationId);
  if (!data) return null;

  const prefix = `${bookName} ${chapter}:`;
  const verses: Verse[] = [];

  // Find all verses for this chapter by matching the prefix
  for (const key of Object.keys(data)) {
    if (key.startsWith(prefix)) {
      const verseStr = key.slice(prefix.length);
      const verseNumber = parseInt(verseStr, 10);
      if (!isNaN(verseNumber)) {
        verses.push({ verseNumber, text: data[key] });
      }
    }
  }

  if (verses.length === 0) return null;

  verses.sort((a, b) => a.verseNumber - b.verseNumber);

  return {
    bookNumber: 0, // Unknown from local bundle
    bookName,
    chapterNumber: chapter,
    verses,
  };
};

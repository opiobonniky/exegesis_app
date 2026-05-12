import { checkInternetConnection } from '../utilits/checkInternet';
import { api, GenericResponse } from './api';
import {
  BIBLE_VERSIONS,
  getVersionById,
  DEFAULT_VERSION_ID,
} from '../assets/bibleVersion/json/bibleVersions';

/**
 * Bible Service that switches between local data and backend API based on connectivity
 */

interface BackendTranslation {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  year: number | null;
  copyright: string | null;
  link: string | null;
}

interface BackendBook {
  bookNumber: number;
  bookName: string;
  testament: string;
  chaptersCount: number;
  totalVerses: number;
}

interface BackendChapterInfo {
  bookNumber: number;
  bookName: string;
  chapters: Array<{
    chapterNumber: number;
    versesCount: number;
  }>;
}

interface BackendVerse {
  verseNumber: number;
  text: string;
}

interface BackendVersesResponse {
  bookNumber: number;
  bookName: string;
  chapterNumber: number;
  verses: BackendVerse[];
}

interface BackendSearchResult {
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Check if we should use backend (online) or local data (offline)
 */
export const shouldUseBackend = async (): Promise<boolean> => {
  try {
    console.log('Checking internet connection...');
    const isConnected = await checkInternetConnection();
    console.log('Internet connected:', isConnected);
    
    if (!isConnected) return false;

    // Additionally, we can try a quick ping to the backend to make sure it's reachable
    try {
      console.log('Checking backend health at /health...');
      const healthResponse = await api.get('/health', { timeout: 3000 });
      console.log('Backend health response:', healthResponse.status);
      return true;
    } catch (error: any) {
      console.log('Backend not reachable:', error?.message || 'unknown error');
      // Backend is not reachable, fall back to local
      return false;
    }
  } catch (error: any) {
    console.error('Error checking internet connection:', error?.message || error);
    return false; // Fail safe - use local data
  }
};

/**
 * Get all available Bible translations
 * Uses backend when online, falls back to local versions when offline
 */
export const getAvailableTranslations = async (): Promise<
  (
    | BackendTranslation
    | {
        id: string;
        name: string;
        abbreviation: string;
        description: string;
        year: number;
      }
  )[]
> => {
  const useBackend = await shouldUseBackend();
  console.log('getAvailableTranslations: useBackend =', useBackend);

  if (useBackend) {
    try {
      console.log('Fetching translations from backend API...');
      const response = await api.post<GenericResponse<BackendTranslation[]>>(
        '/translations',
        {},
      );

      console.log('Backend response status:', response.status);
      console.log('Backend response data:', response.data);

      if (response.data.returnCode === 200 && response.data.returnData) {
        console.log('Translations from backend:', response.data.returnData.length);
        return response.data.returnData.map((trans: BackendTranslation) => ({
          id: trans.id,
          name: trans.name,
          shortName: trans.shortName,
          description: trans.description,
          year: trans.year,
          copyright: trans.copyright,
          link: trans.link,
        }));
      } else {
        console.log('Backend response not successful:', response.data);
      }
    } catch (error: any) {
      console.error(
        'Failed to fetch translations from backend, falling back to local:',
        error?.message || error,
      );
      // Fall back to local
    }
  } else {
    console.log('Not using backend, using local translations');
  }

  // Fallback to local versions
  console.log('Using local BIBLE_VERSIONS:', BIBLE_VERSIONS.length);
  return BIBLE_VERSIONS.map(version => ({
    id: version.id,
    name: version.name,
    abbreviation: version.abbreviation,
    description: version.description,
    year: version.year,
  }));
};

/**
 * Get a specific translation by ID
 */
export const getTranslationById = async (
  translationId: string,
): Promise<BackendTranslation | null> => {
  const useBackend = await shouldUseBackend();

  if (useBackend) {
    try {
      const response = await api.post<GenericResponse<BackendTranslation>>(
        `/translations/${translationId}`,
        {},
      );
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
    } catch (error) {
      console.error(
        `Failed to fetch translation ${translationId} from backend, falling back to local:`,
        error,
      );
      // Fall back to local
    }
  }

  // Fallback to local version
  const localVersion = getVersionById(translationId);
  if (localVersion) {
    return {
      id: localVersion.id,
      name: localVersion.name,
      shortName: localVersion.abbreviation,
      description: localVersion.description,
      year: localVersion.year,
      copyright: null,
      link: null,
    };
  }

  return null;
};

/**
 * Get books for a specific translation
 */
export const getTranslationBooks = async (
  translationId: string,
): Promise<BackendBook[]> => {
  const useBackend = await shouldUseBackend();

  if (useBackend) {
    try {
      const response = await api.post<GenericResponse<BackendBook[]>>(
        `/translations/${translationId}/books`,
        {},
      );
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
    } catch (error) {
      console.error(
        `Failed to fetch books for translation ${translationId} from backend, falling back to local:`,
        error,
      );
      // Fall back to local
    }
  }

  // Fallback to local - generate from the local JSON data
  const localVersion = getVersionById(translationId);
  if (!localVersion) return [];

  // We need to import bibleUtils dynamically to avoid circular dependencies during SSR
  // In React Native, this is fine
  const {
    getBibleBooks,
    setActiveVersion,
    getActiveVersionId,
  } = require('../utilits/bibleUtils');

  // Temporarily set the active version to get the books
  const originalActiveVersionId = getActiveVersionId();
  setActiveVersion(translationId);

  try {
    const books = getBibleBooks();
    return books.map(book => ({
      bookNumber: 0, // We don't have book numbers in local data easily
      bookName: book.name,
      testament: book.testament,
      chaptersCount: book.chapters,
      totalVerses: book.verses,
    }));
  } finally {
    // Restore original active version
    setActiveVersion(originalActiveVersionId);
  }
};

/**
 * Get chapters for a specific book in a translation
 */
export const getTranslationChapters = async (
  translationId: string,
  bookName: string,
): Promise<BackendChapterInfo | null> => {
  const useBackend = await shouldUseBackend();

  if (useBackend) {
    try {
      const response = await api.post<GenericResponse<BackendChapterInfo>>(
        `/translations/${translationId}/chapters`,
        { bookName },
      );
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
    } catch (error) {
      console.error(
        `Failed to fetch chapters for ${bookName} in translation ${translationId} from backend, falling back to local:`,
        error,
      );
      // Fall back to local
    }
  }

  // Fallback to local
  const localVersion = getVersionById(translationId);
  if (!localVersion) return null;

  // We need to import bibleUtils dynamically to avoid circular dependencies
  const {
    getChaptersForBook,
    getVersesForChapter,
    setActiveVersion,
    getActiveVersionId,
  } = require('../utilits/bibleUtils');

  // Temporarily set the active version
  const originalActiveVersionId = getActiveVersionId();
  setActiveVersion(translationId);

  try {
    const chapters = getChaptersForBook(bookName);

    return {
      bookNumber: 0, // We don't have easy access to book numbers in local utils
      bookName,
      chapters: chapters.map(chapterNum => ({
        chapterNumber: chapterNum,
        versesCount: getVersesForChapter(bookName, chapterNum).size,
      })),
    };
  } finally {
    // Restore original active version
    setActiveVersion(originalActiveVersionId);
  }
};

/**
 * Get verses for a specific chapter in a translation
 */
export const getTranslationVerses = async (
  translationId: string,
  bookName: string,
  chapterNumber: number,
): Promise<BackendVersesResponse | null> => {
  const useBackend = await shouldUseBackend();

  if (useBackend) {
    try {
      const response = await api.post<GenericResponse<BackendVersesResponse>>(
        `/translations/${translationId}/verses`,
        { bookName, chapter: chapterNumber },
      );
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
    } catch (error) {
      console.error(
        `Failed to fetch verses for ${bookName} ${chapterNumber} in translation ${translationId} from backend, falling back to local:`,
        error,
      );
      // Fall back to local
    }
  }

  // Fallback to local
  const localVersion = getVersionById(translationId);
  if (!localVersion) return null;

  // We need to import bibleUtils dynamically to avoid circular dependencies
  const {
    getVersesForChapter,
    setActiveVersion,
    getActiveVersionId,
  } = require('../utilits/bibleUtils');

  // Temporarily set the active version
  const originalActiveVersionId = getActiveVersionId();
  setActiveVersion(translationId);

  try {
    const verses = getVersesForChapter(bookName, chapterNumber);

    return {
      bookNumber: 0, // We don't have easy access to book numbers in local utils
      bookName,
      chapterNumber,
      verses: Object.entries(verses).map(([verseNumber, text]) => ({
        verseNumber: parseInt(verseNumber),
        text,
      })),
    };
  } finally {
    // Restore original active version
    setActiveVersion(originalActiveVersionId);
  }
};

/**
 * Get a specific verse by reference
 */
export const getTranslationVerseByRef = async (
  translationId: string,
  bookName: string,
  chapterNumber: number,
  verseNumber: number,
): Promise<{ verseNumber: number; text: string } | null> => {
  const useBackend = await shouldUseBackend();

  if (useBackend) {
    try {
      const response = await api.post<
        GenericResponse<{ verseNumber: number; text: string }>
      >(`/translations/${translationId}/verse`, {
        bookName,
        chapter: chapterNumber,
        verseNumber,
      });
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
    } catch (error) {
      console.error(
        `Failed to fetch verse ${bookName} ${chapterNumber}:${verseNumber} in translation ${translationId} from backend, falling back to local:`,
        error,
      );
      // Fall back to local
    }
  }

  // Fallback to local
  const localVersion = getVersionById(translationId);
  if (!localVersion) return null;

  // We need to import bibleUtils dynamically to avoid circular dependencies
  const {
    getVerseText,
    setActiveVersion,
    getActiveVersionId,
  } = require('../utilits/bibleUtils');

  // Temporarily set the active version
  const originalActiveVersionId = getActiveVersionId();
  setActiveVersion(translationId);

  try {
    const text = getVerseText(bookName, chapterNumber, verseNumber);
    if (text === null) return null;

    return {
      verseNumber,
      text,
    };
  } finally {
    // Restore original active version
    setActiveVersion(originalActiveVersionId);
  }
};

/**
 * Search for verses in a translation
 */
export const searchTranslationVerses = async (
  translationId: string,
  query: string,
  limit: number = 50,
): Promise<BackendSearchResult[]> => {
  const useBackend = await shouldUseBackend();

  if (useBackend) {
    try {
      const response = await api.post<GenericResponse<BackendSearchResult[]>>(
        `/translations/${translationId}/search`,
        { query, limit },
      );
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
    } catch (error) {
      console.error(
        `Failed to search verses in translation ${translationId} from backend, falling back to local:`,
        error,
      );
      // Fall back to local
    }
  }

  // Fallback to local
  const localVersion = getVersionById(translationId);
  if (!localVersion) return [];

  // We need to import bibleUtils dynamically to avoid circular dependencies
  const {
    searchVerses,
    setActiveVersion,
    getActiveVersionId,
  } = require('../utilits/bibleUtils');

  // Temporarily set the active version
  const originalActiveVersionId = getActiveVersionId();
  setActiveVersion(translationId);

  try {
    const results = searchVerses(query, limit);
    return results.map(result => ({
      bookNumber: 0, // We don't have easy access to book numbers in local utils
      bookName: result.book,
      chapter: result.chapter,
      verse: result.verse,
      text: result.text,
    }));
  } finally {
    // Restore original active version
    setActiveVersion(originalActiveVersionId);
  }
};

/**
 * Get verse range for a chapter
 */
export const getTranslationVerseRange = async (
  translationId: string,
  bookName: string,
  chapterNumber: number,
  startVerse: number,
  endVerse: number,
): Promise<Record<number, string> | null> => {
  // For now, we'll implement this using local data only as it's complex to do efficiently via API
  // In the future, we could optimize this by fetching multiple verses if the range is small

  // Fallback to local
  const localVersion = getVersionById(translationId);
  if (!localVersion) return null;

  // We need to import bibleUtils dynamically to avoid circular dependencies
  const {
    getVerseRange,
    setActiveVersion,
    getActiveVersionId,
  } = require('../utilits/bibleUtils');

  // Temporarily set the active version
  const originalActiveVersionId = getActiveVersionId();
  setActiveVersion(translationId);

  try {
    return getVerseRange(bookName, chapterNumber, startVerse, endVerse);
  } finally {
    // Restore original active version
    setActiveVersion(originalActiveVersionId);
  }
};

/**
 * Get book names (standardized list)
 */
export const getStandardBookNames = async (): Promise<string[]> => {
  const useBackend = await shouldUseBackend();

  if (useBackend) {
    try {
      const response = await api.get<GenericResponse<string[]>>(
        '/translations/books/names',
      );
      if (response.data.returnCode === 200 && response.data.returnData) {
        return response.data.returnData;
      }
    } catch (error) {
      console.error(
        'Failed to fetch book names from backend, falling back to hardcoded list:',
        error,
      );
      // Fall back to local
    }
  }

  // Fallback to hardcoded list (same as in bibleUtils.ts)
  return [
    'Genesis',
    'Exodus',
    'Leviticus',
    'Numbers',
    'Deuteronomy',
    'Joshua',
    'Judges',
    'Ruth',
    '1 Samuel',
    '2 Samuel',
    '1 Kings',
    '2 Kings',
    '1 Chronicles',
    '2 Chronicles',
    'Ezra',
    'Nehemiah',
    'Esther',
    'Job',
    'Psalms',
    'Proverbs',
    'Ecclesiastes',
    'Song of Solomon',
    'Isaiah',
    'Jeremiah',
    'Lamentations',
    'Ezekiel',
    'Daniel',
    'Hosea',
    'Joel',
    'Amos',
    'Obadiah',
    'Jonah',
    'Micah',
    'Nahum',
    'Habakkuk',
    'Zephaniah',
    'Haggai',
    'Zechariah',
    'Malachi',
    'Matthew',
    'Mark',
    'Luke',
    'John',
    'Acts',
    'Romans',
    '1 Corinthians',
    '2 Corinthians',
    'Galatians',
    'Ephesians',
    'Philippians',
    'Colossians',
    '1 Thessalonians',
    '2 Thessalonians',
    '1 Timothy',
    '2 Timothy',
    'Titus',
    'Philemon',
    'Hebrews',
    'James',
    '1 Peter',
    '2 Peter',
    '1 John',
    '2 John',
    '3 John',
    'Jude',
    'Revelation',
  ];
};

// Create a singleton instance for easy importing
const bibleService = {
  // Translation management
  getAvailableTranslations,
  getTranslationById,

  // Book data
  getTranslationBooks,
  getStandardBookNames,

  // Chapter data
  getTranslationChapters,

  // Verse data
  getTranslationVerses,
  getTranslationVerseByRef,
  getTranslationVerseRange,

  // Search
  searchTranslationVerses,

  // Utility to check if we're using backend
  isUsingBackend: shouldUseBackend,
};

export default bibleService;

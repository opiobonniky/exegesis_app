/**
 * bibleUtils.ts  (multi-version edition)
 *
 * All public helpers now accept an optional `versionData` parameter.
 * When omitted they fall back to the active version held in the module-level
 * cache, which is set via `setActiveVersion()`.
 *
 * Calling `setActiveVersion(id)` is the only thing needed when the user
 * switches translations – the rest of the app reacts automatically.
 */

import {
  getVersionById,
  DEFAULT_VERSION_ID,
} from '../assets/bibleVersion/json/bibleVersions';

/* ------------------------------------------------------------------ */
/*  Active-version cache                                               */
/* ------------------------------------------------------------------ */

let _activeVersionId: string = DEFAULT_VERSION_ID;
let _activeData: Record<string, string> =
  getVersionById(DEFAULT_VERSION_ID).load();

/**
 * Switch the active Bible version.
 * Call this whenever the user picks a different translation.
 * The search index is invalidated automatically.
 */
export const setActiveVersion = (versionId: string): void => {
  if (versionId === _activeVersionId) return; // nothing to do
  const version = getVersionById(versionId);
  _activeVersionId = version.id;
  _activeData = version.load();
  // invalidate the search index so it gets rebuilt for the new version
  indexBuilt = false;
  Object.keys(verseIndex).forEach(k => delete verseIndex[k]);
};

/** Returns the currently active version id */
export const getActiveVersionId = (): string => _activeVersionId;

/** Helper – resolves the verse dataset to use */
const data = (override?: Record<string, string>): Record<string, string> =>
  override ?? _activeData;

/* ------------------------------------------------------------------ */
/*  Testament list                                                     */
/* ------------------------------------------------------------------ */

export const NEW_TESTAMENT_BOOKS = [
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Book {
  name: string;
  chapters: number;
  verses: number;
  testament: 'Old' | 'New';
}

export interface VerseSearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Books                                                              */
/* ------------------------------------------------------------------ */

/**
 * Build all Bible books dynamically from the active (or supplied) dataset.
 */
export const getBibleBooks = (versionData?: Record<string, string>): Book[] => {
  const src = data(versionData);
  const bookMap: Record<string, { chapters: Set<number>; verses: number }> = {};

  Object.keys(src).forEach(key => {
    const lastSpace = key.lastIndexOf(' ');
    const book = key.substring(0, lastSpace);
    const [chapter] = key.substring(lastSpace + 1).split(':');

    if (!bookMap[book]) bookMap[book] = { chapters: new Set(), verses: 0 };
    bookMap[book].chapters.add(Number(chapter));
    bookMap[book].verses++;
  });

  return Object.keys(bookMap).map(book => ({
    name: book,
    chapters: bookMap[book].chapters.size,
    verses: bookMap[book].verses,
    testament: NEW_TESTAMENT_BOOKS.includes(book) ? 'New' : 'Old',
  }));
};

/* ------------------------------------------------------------------ */
/*  Chapter verses                                                     */
/* ------------------------------------------------------------------ */

export const getChaptersForBook = (bookName: string): number[] => {
  const chapterCounts: Record<string, number> = {
    Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
    Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
    '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
    Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150,
    Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8,
    Isaiah: 66, Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12,
    Hosea: 14, Joel: 3, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7,
    Nahum: 3, Habakkuk: 3, Zephaniah: 3, Haggai: 2, Zechariah: 14,
    Malachi: 4, Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28,
    Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6,
    Ephesians: 6, Philippians: 4, Colossians: 4, '1 Thessalonians': 5,
    '2 Thessalonians': 3, '1 Timothy': 6, '2 Timothy': 4, Titus: 3,
    Philemon: 1, Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3,
    '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22,
  };
  const count = chapterCounts[bookName] || 1;
  return Array.from({ length: count }, (_, i) => i + 1);
};

export const getVersesForChapter = (
  book: string,
  chapter: number,
  versionData?: Record<string, string>,
): Record<number, string> => {
  const src = data(versionData);
  const verses: Record<number, string> = {};

  Object.keys(src).forEach(key => {
    const lastSpace = key.lastIndexOf(' ');
    const bookName = key.substring(0, lastSpace);
    const [ch, vs] = key.substring(lastSpace + 1).split(':');

    if (bookName === book && Number(ch) === chapter) {
      verses[Number(vs)] = src[key];
    }
  });

  return verses;
};

/* ------------------------------------------------------------------ */
/*  Single verse helpers                                               */
/* ------------------------------------------------------------------ */

export const getVerseText = (
  book: string,
  chapter: number,
  verse: number,
  versionData?: Record<string, string>,
): string | null => data(versionData)[`${book} ${chapter}:${verse}`] ?? null;

export const getVerseRange = (
  book: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
  versionData?: Record<string, string>,
): Record<number, string> => {
  const src = data(versionData);
  const verses: Record<number, string> = {};

  for (let v = startVerse; v <= endVerse; v++) {
    const key = `${book} ${chapter}:${v}`;
    if (src[key]) verses[v] = src[key];
  }

  return verses;
};

/* ------------------------------------------------------------------ */
/*  Simple search                                                      */
/* ------------------------------------------------------------------ */

export const searchVerses = (
  query: string,
  limit = 100,
  versionData?: Record<string, string>,
): VerseSearchResult[] => {
  if (!query.trim()) return [];

  const src = data(versionData);
  const results: VerseSearchResult[] = [];
  const q = query.toLowerCase();

  Object.keys(src).some(key => {
    const text = src[key];
    if (text.toLowerCase().includes(q)) {
      const lastSpace = key.lastIndexOf(' ');
      const book = key.substring(0, lastSpace);
      const [chapter, verse] = key
        .substring(lastSpace + 1)
        .split(':')
        .map(Number);
      results.push({ book, chapter, verse, text });
    }
    return results.length >= limit;
  });

  return results;
};

/* ------------------------------------------------------------------ */
/*  Pre-indexed instant search                                         */
/* ------------------------------------------------------------------ */

interface IndexedVerse extends VerseSearchResult {}

const verseIndex: Record<string, IndexedVerse[]> = {};
let indexBuilt = false;

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

export const buildVerseIndex = (): void => {
  if (indexBuilt) return;

  const src = _activeData; // always index active version
  Object.keys(src).forEach(key => {
    const text = src[key];
    const lastSpace = key.lastIndexOf(' ');
    const book = key.substring(0, lastSpace);
    const [chapter, verse] = key
      .substring(lastSpace + 1)
      .split(':')
      .map(Number);

    tokenize(text).forEach(token => {
      if (!verseIndex[token]) verseIndex[token] = [];
      verseIndex[token].push({ book, chapter, verse, text });
    });
  });

  indexBuilt = true;
};

export const searchVersesIndexed = (
  query: string,
  limit = 100,
): VerseSearchResult[] => {
  if (!query.trim()) return [];

  buildVerseIndex();

  const tokens = tokenize(query);
  if (!tokens.length) return [];

  let results = verseIndex[tokens[0]] ?? [];

  for (let i = 1; i < tokens.length; i++) {
    const set = new Set(
      (verseIndex[tokens[i]] ?? []).map(
        v => `${v.book}-${v.chapter}-${v.verse}`,
      ),
    );
    results = results.filter(v => set.has(`${v.book}-${v.chapter}-${v.verse}`));
  }

  return results.slice(0, limit);
};

/* ------------------------------------------------------------------ */
/*  Date / time helpers (unchanged)                                    */
/* ------------------------------------------------------------------ */

export const formatWhatsAppTime = (dateString: string, locale: string = 'en'): string => {
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday)
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  if (isYesterday) {
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined') {
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-1, 'day');
      }
    } catch {
      // Intl.RelativeTimeFormat not supported — fall through
    }
    // Fallback: show localized weekday name (e.g. "Mercredi", "Mittwoch")
    return date.toLocaleDateString(locale, { weekday: 'long' });
  }

  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return date.toLocaleDateString(locale, { weekday: 'short' });

  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateHeader = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};


//the text for all the verse by passing book and chapter 
export const getVerseRangeText = (
  book: string,
  chapter: number,
): string => {
  const verses = getVersesForChapter(book, chapter);
  return Object.keys(verses)
    .map(v => `${v}: ${verses[Number(v)]}`)
    .join('\n');
};

/* ------------------------------------------------------------------ */
/*  Word Map for TTS word highlighting                                */
/* ------------------------------------------------------------------ */

export type WordSpan = { start: number; length: number };

/**
 * Computes a word map from verse text for TTS word highlighting.
 * Uses RAW verse text (not prepareText-cleaned) because VerseCard
 * renders the raw text. TTS wordIndex maps to words by INDEX,
 * which is identical between raw and cleaned text for the vast
 * majority of Bible verses (prepareText doesn't change word count).
 */
export const computeWordMap = (text: string): WordSpan[] => {
  if (!text) return [];
  
  const wordMap: WordSpan[] = [];
  const wordRegex = /\S+/g;
  let match;
  
  while ((match = wordRegex.exec(text)) !== null) {
    wordMap.push({
      start: match.index,
      length: match[0].length,
    });
  }
  
  return wordMap;
};

/**
 * Computes word maps for all verses in a chapter.
 * Returns a map of verseNumber -> WordSpan[]
 */
export const computeVerseWordMaps = (
  verses: Record<number, string>,
): Record<number, WordSpan[]> => {
  const wordMaps: Record<number, WordSpan[]> = {};
  
  Object.keys(verses).forEach(key => {
    const verseNum = parseInt(key, 10);
    wordMaps[verseNum] = computeWordMap(verses[verseNum]);
  });
  
  return wordMaps;
};
/**
 * verseResourcesApi.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend API service for the Verse Resources backend module.
 * Fetches commentaries, cross-references, word studies, dictionary entries,
 * interlinear data, and related topics for a specific verse.
 */

import { api, GenericResponse, sendPostRequest } from './api';

export interface CommentaryEntry {
  author: string;
  title: string;
  text: string;
}

export interface Crossref {
  ref: string;
  text: string;
}

export interface WordStudyEntry {
  word: string;
  transliteration: string;
  meaning: string;
  strongs?: string;
}

export interface DictionaryEntry {
  term: string;
  pronunciation: string;
  definition: string;
  description: string;
}

export interface InterlinearWord {
  original: string;
  strongs: string;
  transliteration: string;
  translation: string;
}

export interface TopicEntry {
  name: string;
}

export interface StudyToolWordResource {
  id: number;
  strongsId: string;
  bookName: string;
  chapter: number;
  verse: number;
  surfaceText: string;
  originalWord: string | null;
  transliteration: string | null;
  adminExplanation: string | null;
  wordOrder: number;
  strongs?: {
    strongsId: string;
    originalWord: string | null;
    transliteration: string | null;
    shortDefinition: string;
    fullDefinition: string | null;
    adminExplanation: string | null;
    language: string;
    partOfSpeech: string | null;
  } | null;
}

export interface StudyToolResource {
  id: number;
  bookName: string;
  chapter: number;
  toolType: string;
  label: string;
  description: string | null;
  verseRefs: Array<{ verse: number; excerpt?: string }>;
  strongsIds: Array<string | number> | null;
  order: number;
  studyToolWords?: StudyToolWordResource[];
}

export interface VerseResourceData {
  id: number;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  commentaries: CommentaryEntry[];
  crossReferences: Crossref[];
  wordStudies: WordStudyEntry[];
  dictionaryTerms: DictionaryEntry[];
  interlinearWords: InterlinearWord[];
  relatedTopics: TopicEntry[];
  studyTools?: StudyToolResource[];
}

/**
 * Fetch all resources for a specific verse.
 * The backend finds the best matching resource (supports verse ranges).
 */
export const getVerseResources = async (
  bookName: string,
  chapter: number,
  verseNumber: number,
): Promise<GenericResponse<VerseResourceData>> => {
  return sendPostRequest('verse-resources', 'get', {
    bookName,
    chapter,
    verseNumber,
  });
};

/**
 * Fetch resources for multiple verses in the same chapter at once.
 */
export const getMultipleVerseResources = async (
  bookName: string,
  chapter: number,
  verses: number[],
): Promise<GenericResponse<VerseResourceData[]>> => {
  return sendPostRequest('verse-resources', 'get-multiple', {
    bookName,
    chapter,
    verses,
  });
};

/**
 * Create or update a verse resource (admin only).
 */
export const upsertVerseResource = async (data: {
  id?: number;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  commentaries?: CommentaryEntry[];
  crossReferences?: Crossref[];
  wordStudies?: WordStudyEntry[];
  dictionaryTerms?: DictionaryEntry[];
  interlinearWords?: InterlinearWord[];
  relatedTopics?: TopicEntry[];
}): Promise<GenericResponse<VerseResourceData>> => {
  return sendPostRequest('verse-resources', 'upsert', data);
};

export interface TranslationComparisonEntry {
  version: string;
  abbreviation: string;
  text: string;
}

/**
 * Fetch the same verse across multiple Bible translations for comparison.
 */
export const getTranslationComparison = async (
  bookName: string,
  chapter: number,
  verseNumber: number,
): Promise<GenericResponse<TranslationComparisonEntry[]>> => {
  return sendPostRequest('verse-resources', 'compare-translations', {
    bookName,
    chapter,
    verseNumber,
  });
};

/**
 * Delete a verse resource by ID (admin only).
 */
export const deleteVerseResource = async (
  id: number,
): Promise<GenericResponse> => {
  return sendPostRequest('verse-resources', 'delete', { id });
};

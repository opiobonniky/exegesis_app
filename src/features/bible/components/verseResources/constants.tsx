import React from 'react';
import {
  MessageSquare,
  Link2,
  Search,
  Book,
  Languages,
  ListOrdered,
  Tags,
} from 'lucide-react-native';
import type { CommentaryEntry } from '../../../../services/verseResourcesApi';

// ── Fallback data ──────────────────────────────────────────────────────────

export const FALLBACK_COMMENTARIES: CommentaryEntry[] = [
  {
    author: 'Matthew Henry',
    title: "Matthew Henry's Concise Commentary",
    text: 'This passage reveals the character of God and His dealings with humanity. It invites us to consider the depth of His wisdom, the breadth of His love, and the certainty of His promises.',
  },
];

export const BOOK_PROLOGUE_PAGE_SIZE = 12;

// ── Bible book lists ───────────────────────────────────────────────────────

export const BIBLE_BOOKS_OT = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
];

export const BIBLE_BOOKS_NT = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

// ── Resource Tab definitions ──────────────────────────────────────────────

export interface ResourceTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const RESOURCE_TABS: ResourceTab[] = [
  { key: 'commentaries', label: 'Commentaries', icon: <MessageSquare size={15} strokeWidth={2.2} />, color: '#4F6EF7' },
  { key: 'crossrefs', label: 'Cross Refs', icon: <Link2 size={15} strokeWidth={2.2} />, color: '#0EA5E9' },
  { key: 'wordStudies', label: 'Word Studies', icon: <Search size={15} strokeWidth={2.2} />, color: '#8B5CF6' },
  { key: 'dictionary', label: 'Dictionary', icon: <Book size={15} strokeWidth={2.2} />, color: '#10B981' },
  { key: 'translations', label: 'Translations', icon: <Languages size={15} strokeWidth={2.2} />, color: '#F59E0B' },
  { key: 'interlinear', label: 'Interlinear', icon: <ListOrdered size={15} strokeWidth={2.2} />, color: '#EC4899' },
  { key: 'topics', label: 'Topics', icon: <Tags size={15} strokeWidth={2.2} />, color: '#6366F1' },
];

// ── Study Tool labels and colors ───────────────────────────────────────────

export const STUDY_TOOL_LABELS: Record<string, string> = {
  COMMAND: 'Command',
  PROMISE: 'Promise',
  WARNING: 'Warning',
  REPEATED_WORD: 'Repeated Word',
  TRANSITION: 'Transition',
  CONTRAST: 'Contrast',
};

export const STUDY_TOOL_COLORS: Record<string, string> = {
  COMMAND: '#4F6EF7',
  PROMISE: '#10B981',
  WARNING: '#F59E0B',
  REPEATED_WORD: '#8B5CF6',
  TRANSITION: '#0EA5E9',
  CONTRAST: '#EC4899',
};

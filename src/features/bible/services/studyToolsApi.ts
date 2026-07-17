import { sendGet, sendPostRequest } from '../../../services/api';

export interface StudyToolWordItem {
  id: number;
  studyToolId: number;
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
    adminExplanation: string | null;
    language: string;
  } | null;
}

export interface ChapterStudyToolItem {
  id: number;
  bookName: string;
  chapter: number;
  toolType: ToolType;
  label: string;
  description: string | null;
  verseRefs: Array<{ verse: number; excerpt: string }>;
  strongsIds: Array<string | number> | null;
  order: number;
  studyToolWords?: StudyToolWordItem[];
}

export type ToolType = 'COMMAND' | 'PROMISE' | 'WARNING' | 'REPEATED_WORD' | 'TRANSITION' | 'CONTRAST';

export interface StudyToolsResponse {
  COMMAND?: ChapterStudyToolItem[];
  PROMISE?: ChapterStudyToolItem[];
  WARNING?: ChapterStudyToolItem[];
  REPEATED_WORD?: ChapterStudyToolItem[];
  TRANSITION?: ChapterStudyToolItem[];
  CONTRAST?: ChapterStudyToolItem[];
}

export interface AdminStudyToolsListResponse {
  data: ChapterStudyToolItem[];
  total: number;
  hasNext: boolean;
}

export interface VerseWordItem {
  wordOrder: number;
  surfaceText: string;
  strongsId: string | null;
  lemma: string | null;
  morphology: string | null;
  hasData: boolean;
  verseNumber: number;
  strongs: {
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
  } | null;
}

export interface StrongsEntryItem {
  strongsId: string;
  originalWord: string | null;
  transliteration: string | null;
  shortDefinition: string;
  fullDefinition: string | null;
  language: string;
  usageCount: number | null;
  partOfSpeech: string | null;
  adminExplanation: string | null;
}

export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  COMMAND: 'Commands',
  PROMISE: 'Promises',
  WARNING: 'Warnings',
  REPEATED_WORD: 'Repeated Words',
  TRANSITION: 'Transitions',
  CONTRAST: 'Contrasts',
};

export const TOOL_TYPE_ICONS: Record<ToolType, string> = {
  COMMAND: 'Command',
  PROMISE: 'HeartHandshake',
  WARNING: 'AlertTriangle',
  REPEATED_WORD: 'Repeat2',
  TRANSITION: 'ArrowRightLeft',
  CONTRAST: 'ArrowLeftRight',
};

export const TOOL_TYPE_ORDER: ToolType[] = [
  'COMMAND',
  'PROMISE',
  'WARNING',
  'REPEATED_WORD',
  'TRANSITION',
  'CONTRAST',
];

export const getChapterStudyTools = async (
  bookName: string,
  chapter: number,
): Promise<StudyToolsResponse> => {
  const res = await sendPostRequest<StudyToolsResponse>('study-tools', 'chapter-study-tools', {
    bookName,
    chapter,
  });
  return res.returnData ?? {};
};

export const upsertChapterStudyTools = async (
  bookName: string,
  chapter: number,
  items: Array<{
    toolType: ToolType;
    label: string;
    description?: string | null;
    verseRefs: Array<{ verse: number; excerpt: string }>;
    strongsIds?: Array<string | number> | null;
    order?: number;
    studyToolWords?: Array<{
      strongsId: string;
      bookName?: string;
      chapter?: number;
      verse: number;
      surfaceText: string;
      originalWord?: string | null;
      transliteration?: string | null;
      adminExplanation?: string | null;
      wordOrder?: number;
    }>;
  }>,
): Promise<ChapterStudyToolItem[]> => {
  const res = await sendPostRequest<ChapterStudyToolItem[]>(
    'study-tools',
    'admin/chapter-study-tools/upsert',
    { bookName, chapter, items },
  );
  return res.returnData ?? [];
};

export const getAllAdminStudyTools = async (params?: {
  page?: number;
  pageSize?: number;
  bookName?: string;
  chapter?: number;
  toolType?: string;
  search?: string;
}): Promise<AdminStudyToolsListResponse> => {
  const res = await sendPostRequest<AdminStudyToolsListResponse>(
    'study-tools',
    'admin/chapter-study-tools/get-all',
    {
      page: params?.page ?? 0,
      pageSize: params?.pageSize ?? 50,
      ...(params?.bookName ? { bookName: params.bookName } : {}),
      ...(params?.chapter ? { chapter: params.chapter } : {}),
      ...(params?.toolType ? { toolType: params.toolType } : {}),
      ...(params?.search ? { search: params.search } : {}),
    },
  );
  return res.returnData ?? { data: [], total: 0, hasNext: false };
};

export const deleteAdminStudyTool = async (id: number): Promise<void> => {
  const res = await sendPostRequest('study-tools', 'admin/chapter-study-tools/delete', { id });
  if (res.returnCode !== 200) {
    throw new Error(res.returnMessage || 'Failed to delete study tool');
  }
};

export const getSingleTool = async (id: number): Promise<ChapterStudyToolItem | null> => {
  const res = await sendGet<ChapterStudyToolItem>('study-tools', `admin/chapter-study-tools/${id}`);
  return res.returnData ?? null;
};

export const createSingleTool = async (data: {
  bookName: string;
  chapter: number;
  toolType: ToolType;
  label: string;
  description?: string | null;
  verseRefs: Array<{ verse: number; excerpt: string }>;
  strongsIds?: Array<string | number> | null;
  order?: number;
  studyToolWords?: Array<{
    strongsId: string;
    verse: number;
    surfaceText: string;
    originalWord?: string | null;
    transliteration?: string | null;
    adminExplanation?: string | null;
    wordOrder?: number;
  }>;
}): Promise<ChapterStudyToolItem> => {
  const res = await sendPostRequest<ChapterStudyToolItem>('study-tools', 'admin/chapter-study-tools/create', data);
  return res.returnData!;
};

export const updateSingleTool = async (data: {
  id: number;
  bookName?: string;
  chapter?: number;
  toolType?: ToolType;
  label?: string;
  description?: string | null;
  verseRefs?: Array<{ verse: number; excerpt: string }>;
  strongsIds?: Array<string | number> | null;
  order?: number;
  studyToolWords?: Array<{
    strongsId: string;
    verse: number;
    surfaceText: string;
    originalWord?: string | null;
    transliteration?: string | null;
    adminExplanation?: string | null;
    wordOrder?: number;
  }>;
}): Promise<ChapterStudyToolItem> => {
  const res = await sendPostRequest<ChapterStudyToolItem>('study-tools', 'admin/chapter-study-tools/update', data);
  return res.returnData!;
};

// ── Admin Strong's Dictionary Management ─────────────────────────────────────

export const adminUpdateStrongsEntry = async (data: {
  strongsId: string;
  adminExplanation?: string | null;
  originalWord?: string | null;
  transliteration?: string | null;
  shortDefinition?: string;
  fullDefinition?: string | null;
  partOfSpeech?: string | null;
  language?: string;
}): Promise<StrongsEntryItem> => {
  const res = await sendPostRequest<StrongsEntryItem>('strongs', 'admin/update-entry', data);
  return res.returnData!;
};

export const adminListStrongsEntries = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  language?: string;
  hasAdminExplanation?: boolean;
}): Promise<{ data: StrongsEntryItem[]; total: number; hasNext: boolean }> => {
  const res = await sendPostRequest<{ data: StrongsEntryItem[]; total: number; hasNext: boolean }>(
    'strongs',
    'admin/list-entries',
    {
      page: params?.page ?? 0,
      pageSize: params?.pageSize ?? 50,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.language ? { language: params.language } : {}),
      ...(params?.hasAdminExplanation ? { hasAdminExplanation: true } : {}),
    },
  );
  return res.returnData ?? { data: [], total: 0, hasNext: false };
};

export const adminGetVerseWords = async (data: {
  bookName: string;
  chapter: number;
  verse?: number;
  translation?: string;
}): Promise<VerseWordItem[]> => {
  const res = await sendPostRequest<VerseWordItem[]>('strongs', 'admin/get-verse-words', data);
  return res.returnData ?? [];
};

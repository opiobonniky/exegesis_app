import { sendPostRequest } from '../../../services/api';

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
  const res = await sendPostRequest<StudyToolsResponse>('', 'chapter-study-tools', {
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
  }>,
): Promise<ChapterStudyToolItem[]> => {
  const res = await sendPostRequest<ChapterStudyToolItem[]>(
    '',
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
    '',
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
  const res = await sendPostRequest('', 'admin/chapter-study-tools/delete', { id });
  if (res.returnCode !== 200) {
    throw new Error(res.returnMessage || 'Failed to delete study tool');
  }
};

import { sendPostRequest } from './api';

export interface BookPrologue {
  bookName: string;
  author?: string | null;
  audience?: string | null;
  dateWritten?: string | null;
  locationWritten?: string | null;
  purpose?: string | null;
  keyTheme?: string | null;
  summary?: string | null;
  mainThemes?: string[] | null;
  christConnection?: string | null;
}

export interface AdminBookProloguesResponse {
  data: BookPrologue[];
  total: number;
  hasNext: boolean;
}

export const getBookPrologue = async (bookName: string): Promise<BookPrologue | null> => {
  try {
    const res = await sendPostRequest<BookPrologue>('book-prologues', 'get', { bookName });
    if (res.returnCode !== 200) throw new Error(res.returnMessage || 'Failed to fetch book prologue');
    return res.returnData ?? null;
  } catch (error: any) {
    if (error?.returnCode === 404) return null;
    throw error;
  }
};

export const getAllAdminBookPrologues = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<AdminBookProloguesResponse> => {
  const res = await sendPostRequest<AdminBookProloguesResponse>('book-prologues', 'admin/get-all', {
    page: params?.page ?? 0,
    pageSize: params?.pageSize ?? 50,
    search: params?.search || undefined,
  });
  if (res.returnCode !== 200) throw new Error(res.returnMessage || 'Failed to fetch book prologues');
  return res.returnData ?? { data: [], total: 0, hasNext: false };
};

export const upsertAdminBookPrologue = async (payload: BookPrologue): Promise<BookPrologue> => {
  const res = await sendPostRequest<BookPrologue>('book-prologues', 'admin/upsert', payload);
  if (res.returnCode !== 200) throw new Error(res.returnMessage || 'Failed to save book prologue');
  return res.returnData as BookPrologue;
};

export const deleteAdminBookPrologue = async (bookName: string): Promise<void> => {
  const res = await sendPostRequest('book-prologues', 'admin/delete', { bookName });
  if (res.returnCode !== 200) throw new Error(res.returnMessage || 'Failed to delete book prologue');
};

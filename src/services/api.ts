import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../helpers/Toash.helper';
import { navigationRef } from './navigationRef';
import { route } from '../component/navigations/routes';

const DEV_BACKEND_HOST = '192.168.100.128';
const DEV_BACKEND_PORT = '5001';

export interface GenericResponse<T = any> {
  returnCode: number;
  returnMessage: string;
  returnData?: T;
}

const getBaseURL = () => {
  if (__DEV__) {
  
    return `http://${DEV_BACKEND_HOST}:${DEV_BACKEND_PORT}`;
  }
  return 'https://exegesisbackend-production.up.railway.app/';
};

const BASE_URL = getBaseURL();
export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(
      '🚀 Request:',
      config.method?.toUpperCase(),
      `${config.baseURL || ''}${config.url || ''}`,
    );
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse<GenericResponse>) => response,
  async error => {
    const originalRequest = error.config;
    const url = originalRequest.url || '';

    // ── 403 — Tier gating ─────────────────────────────────────────────────
    if (error.response?.status === 403 && !originalRequest._suppress403) {
      const data = error.response.data;
      const msg = data?.returnMessage || 'Subscription required';
      showToast('warning', msg);
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(route.sower);
        }
      }, 1200);
      return Promise.reject(error);
    }

    // Skip token refresh for login/register requests - let them handle the error
    const isAuthRequest =
      url.includes('/auth/login') || url.includes('/auth/register');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          const res = await axios.post<GenericResponse>(
            `${BASE_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (res.data.returnCode === 200 && res.data.returnData) {
            const newToken = res.data.returnData.token;
            await AsyncStorage.setItem(TOKEN_KEY, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        showToast('error', 'Session Expired. Please login again.');
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Generic POST request function
 * @param controller Controller name (e.g., 'auth')
 * @param request Request name (e.g., 'login')
 * @param data Request body (default empty object)
 * @param suppressSubscriptionGate Skip the global 403 toast+navigate for this call
 * @param offlineQueue When true, network errors enqueue the mutation locally instead of failing
 * @returns GenericResponse
 */
export const sendGet = async <T = any>(
  controller: string,
  request: string,
  params: object = {},
): Promise<GenericResponse<T>> => {
  try {
    const language = (await AsyncStorage.getItem('@app:language')) || 'en';
    const response = await api.get<GenericResponse<T>>(
      `/${controller}/${request}`,
      { params: { ...params, lang: language } },
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const { returnCode, returnMessage, returnData } = error.response.data;
      const err = new Error(returnMessage || 'Request failed');
      (err as any).returnCode = returnCode;
      (err as any).returnData = returnData;
      throw err;
    }
    console.error(`❌ GET ${controller}/${request} failed`, error);
    throw error;
  }
};

export const sendPostRequest = async <T = any>(
  controller: string,
  request: string,
  data: object = {},
  suppressSubscriptionGate?: boolean,
  offlineQueue?: boolean,
): Promise<GenericResponse<T>> => {
  try {
    const language = (await AsyncStorage.getItem('@app:language')) || 'en';

    const config: any = {};
    if (suppressSubscriptionGate) {
      config._suppress403 = true;
    }

    const response = await api.post<GenericResponse<T>>(
      `/${controller}/${request}`,
      { ...data, lang: language },
      config,
    );
    return response.data;
  } catch (error: any) {
    // ── Offline queue: enqueue mutation on network error ────────────────
    if (offlineQueue && !error.response) {
      const { enqueueMutation } = await import('./syncQueue');
      await enqueueMutation(controller, request, data);
      return {
        returnCode: 202,
        returnMessage: 'Queued for sync',
        returnData: undefined,
      } as GenericResponse<T>;
    }

    if (error.response?.data) {
      const { returnCode, returnMessage, returnData } = error.response.data;
      const err = new Error(returnMessage || 'Request failed');
      (err as any).returnCode = returnCode;
      (err as any).returnData = returnData;
      throw err;
    }
    console.error(`❌ POST ${controller}/${request} failed`, error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Journal API Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: number;
  title: string | null;
  content: string;
  bookName: string | null;
  chapter: number | null;
  verseNumber: number | null;
  category: string;
  mood: string | null;
  prayers: string | null;
  gratitude: string | null;
  learnings: string | null;
  application: string | null;
  isPublished: boolean;
  isFavorite: boolean;
  strongsWords: string | null; // JSON: [{ strongsId, surfaceText, lemma }]
  strongsIds: string | null; // Comma-separated: "H7225,G26,G2889"
  source: string; // "manual" | "exegesis-lab"
  tags: string | null;
  createdOn: string;
  updatedOn: string;
}

export interface JournalPrompt {
  id: number;
  prompt: string;
  category: string;
  description: string | null;
  order: number;
  isActive: boolean;
  bookName: string | null;
  chapter: number | null;
  verseNumber: number | null;
  createdOn: string;
}

export interface JournalTemplate {
  id: number;
  name: string;
  description: string | null;
  category: string;
  promptsJson: string;
  isActive: boolean;
  isDefault: boolean;
  createdOn: string;
  prompts: JournalPrompt[]; // This will be populated on the client side after fetching promptsJson
}

export interface JournalStats {
  totalEntries: number;
  favoriteCount: number;
  categoryBreakdown: { category: string; count: number }[];
  recentEntries: {
    id: number;
    title: string;
    category: string;
    createdOn: string;
  }[];
  entriesThisMonth: number;
  entriesThisWeek: number;
}

// Journal Entry APIs
export const createJournalEntry = async (data: {
  title?: string;
  content: string;
  bookName?: string;
  chapter?: number;
  verseNumber?: number;
  category?: string;
  mood?: string;
  prayers?: string;
  gratitude?: string;
  learnings?: string;
  application?: string;
  isPublished?: boolean;
  tags?: string;
  source?: string;
  strongsWords?: string; // JSON: [{ strongsId, surfaceText, lemma }]
}): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'create', data, undefined, true);
};

export const updateJournalEntry = async (data: {
  id: number;
  title?: string;
  content?: string;
  bookName?: string;
  chapter?: number;
  verseNumber?: number;
  category?: string;
  mood?: string;
  prayers?: string;
  gratitude?: string;
  learnings?: string;
  application?: string;
  isPublished?: boolean;
  tags?: string;
  strongsWords?: string; // JSON: [{ strongsId, surfaceText, lemma }]
}): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'update', data, undefined, true);
};

export const deleteJournalEntry = async (
  id: number,
): Promise<GenericResponse> => {
  return sendPostRequest('journal', 'delete', { id }, undefined, true);
};

export const getJournalEntry = async (
  id: number,
): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'get', { id });
};

export const getAllJournalEntries = async (data: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}): Promise<
  GenericResponse<{
    entries: JournalEntry[];
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>
> => {
  return sendPostRequest('journal', 'get-all', data);
};

export const getJournalEntriesByVerse = async (data: {
  bookName: string;
  chapter: number;
  verseNumber: number;
}): Promise<GenericResponse<JournalEntry[]>> => {
  return sendPostRequest('journal', 'get-by-verse', data);
};

export const toggleJournalFavorite = async (
  id: number,
): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'toggle-favorite', { id }, undefined, true);
};

export const getJournalStats = async (): Promise<
  GenericResponse<JournalStats>
> => {
  return sendPostRequest('journal', 'stats', {});
};

// Journal Prompt APIs (Admin)
export const createJournalPrompt = async (data: {
  prompt: string;
  category?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  bookName?: string;
  chapter?: number;
  verseNumber?: number;
}): Promise<GenericResponse<JournalPrompt>> => {
  return sendPostRequest('journal', 'prompts/create', data);
};

export const updateJournalPrompt = async (data: {
  id: number;
  prompt?: string;
  category?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  bookName?: string;
  chapter?: number;
  verseNumber?: number;
}): Promise<GenericResponse<JournalPrompt>> => {
  return sendPostRequest('journal', 'prompts/update', data);
};

export const getAllJournalPrompts = async (data?: {
  category?: string;
  isActive?: boolean;
  bookName?: string;
  chapter?: number;
}): Promise<GenericResponse<JournalPrompt[]>> => {
  return sendPostRequest('journal', 'prompts/get-all', data || {});
};

export const deleteJournalPrompt = async (
  id: number,
): Promise<GenericResponse> => {
  return sendPostRequest('journal', 'prompts/delete', { id });
};

// Journal Template APIs (Admin)
export const createJournalTemplate = async (data: {
  name: string;
  description?: string;
  category?: string;
  promptsJson: string;
  isActive?: boolean;
  isDefault?: boolean;
}): Promise<GenericResponse<JournalTemplate>> => {
  return sendPostRequest('journal', 'templates/create', data);
};

export const getAllJournalTemplates = async (): Promise<
  GenericResponse<JournalTemplate[]>
> => {
  return sendPostRequest('journal', 'templates/get-all', {});
};

export const deleteJournalTemplate = async (
  id: number,
): Promise<GenericResponse> => {
  return sendPostRequest('journal', 'templates/delete', { id });
};

// Export & Search APIs
export const exportAllJournalEntries = async (
  format: 'txt' | 'json' | 'pdf' = 'txt',
): Promise<
  GenericResponse<{
    content: string;
    filename: string;
    mimeType: string;
    entryCount: number;
  }>
> => {
  return sendPostRequest('journal', 'export-all', { format });
};

export const exportOneJournalEntry = async (
  id: number,
  format: 'txt' | 'json' | 'pdf' = 'txt',
): Promise<
  GenericResponse<{
    content: string;
    filename: string;
    mimeType: string;
  }>
> => {
  return sendPostRequest('journal', 'export-one', { id, format });
};

export const getPublicJournalEntries = async (data: {
  search?: string;
  bookName?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<
  GenericResponse<{
    entries: (JournalEntry & {
      user?: {
        id: string;
        firstName: string;
        lastName: string;
        username: string;
      };
    })[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
  }>
> => {
  return sendPostRequest('journal', 'get-public', data);
};

export const searchJournalEntriesByStrongs = async (data: {
  strongsId: string;
  page?: number;
  pageSize?: number;
}): Promise<
  GenericResponse<{
    entries: JournalEntry[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }>
> => {
  return sendPostRequest('journal', 'search-by-strongs', data);
};

// Admin: Get all user journal entries
export const getAllUserJournalEntries = async (data?: {
  page?: number;
  pageSize?: number;
  userId?: string;
}): Promise<
  GenericResponse<{
    entries: JournalEntry[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> => {
  return sendPostRequest('journal', 'admin/get-all', data || {});
};

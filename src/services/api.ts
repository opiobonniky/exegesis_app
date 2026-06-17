import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../helpers/Toash.helper';
import { Platform } from 'react-native';

export interface GenericResponse<T = any> {
  returnCode: number;
  returnMessage: string;
  returnData?: T;
}

const getBaseURL = () => {
  if (__DEV__) {
    // iOS simulator: localhost works (runs on same Mac)
    // Android emulator: 10.0.2.2 is the host loopback
    // Physical device: use the Mac's actual LAN IP
    if (Platform.OS === 'ios') {
      return 'http://localhost:5001';
    }
    return 'http://192.168.100.187:5001';
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
    console.log('🚀 Request:', config.method?.toUpperCase(), config.url);
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
 * @returns GenericResponse
 */
export const sendPostRequest = async <T = any>(
  controller: string,
  request: string,
  data: object = {},
): Promise<GenericResponse<T>> => {
  try {
            const language = await AsyncStorage.getItem('@app:language') || 'en';

    const response = await api.post<GenericResponse<T>>(
      `/${controller}/${request}`,
      { ...data, lang: language },
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
  recentEntries: { id: number; title: string; category: string; createdOn: string }[];
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
}): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'create', data);
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
}): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'update', data);
};

export const deleteJournalEntry = async (id: number): Promise<GenericResponse> => {
  return sendPostRequest('journal', 'delete', { id });
};

export const getJournalEntry = async (id: number): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'get', { id });
};

export const getAllJournalEntries = async (data: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}): Promise<GenericResponse<{
  entries: JournalEntry[];
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}>> => {
  return sendPostRequest('journal', 'get-all', data);
};

export const getJournalEntriesByVerse = async (data: {
  bookName: string;
  chapter: number;
  verseNumber: number;
}): Promise<GenericResponse<JournalEntry[]>> => {
  return sendPostRequest('journal', 'get-by-verse', data);
};

export const toggleJournalFavorite = async (id: number): Promise<GenericResponse<JournalEntry>> => {
  return sendPostRequest('journal', 'toggle-favorite', { id });
};

export const getJournalStats = async (): Promise<GenericResponse<JournalStats>> => {
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

export const deleteJournalPrompt = async (id: number): Promise<GenericResponse> => {
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

export const getAllJournalTemplates = async (): Promise<GenericResponse<JournalTemplate[]>> => {
  return sendPostRequest('journal', 'templates/get-all', {});
};

export const deleteJournalTemplate = async (id: number): Promise<GenericResponse> => {
  return sendPostRequest('journal', 'templates/delete', { id });
};

// Admin: Get all user journal entries
export const getAllUserJournalEntries = async (data?: {
  page?: number;
  pageSize?: number;
  userId?: string;
}): Promise<GenericResponse<{
  entries: JournalEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>> => {
  return sendPostRequest('journal', 'admin/get-all', data || {});
};

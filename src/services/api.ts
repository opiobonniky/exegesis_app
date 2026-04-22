import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../helpers/Toash.helper';

interface GenericResponse<T = any> {
  returnCode: number;
  returnMessage: string;
  returnData?: T;
}

const getBaseURL = () => {
  if (__DEV__) {
    // For physical device on WiFi: use ur local IP (192.168.100.123)
    // For Android emulator: use 10.0.2.2
    return 'http://192.168.100.123:5001';
  } else {
    return 'https://exegesis-new.onrender.com/';
  }
};

const BASE_URL = getBaseURL();
export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';
const api: AxiosInstance = axios.create({
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
    const response = await api.post<GenericResponse<T>>(
      `/${controller}/${request}`,
      data,
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const err = new Error(
        error.response.data.returnMessage || 'Request failed',
      );
      (err as any).returnCode = error.response.data.returnCode;
      throw err;
    }
    console.error(`❌ POST ${controller}/${request} failed`, error);
    throw error;
  }
};

// Add this to your api.ts file temporarily
export const testConnection = async () => {
  const testUrls = [
    'http://192.168.100.128:7001',
    'http://10.0.2.2:7001',
    'http://localhost:7001',
  ];

  console.log('🧪 Testing network connectivity...');

  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      console.log(`✅ ${url} - SUCCESS:`, response.status);
    } catch (error: any) {
      console.log(`❌ ${url} - FAILED:`, error.message, error.code);
    }
  }
};

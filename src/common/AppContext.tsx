/**
 * AppContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global app state provider.
 *
 * Changes vs original:
 *   • Added `isGuest: boolean` and `setIsGuest` to the context type.
 *   • `setUserInfo` clears isGuest automatically when a user logs in.
 *   • `logout` clears isGuest.
 *   • Everything else is identical to the original file.
 */

import React, { createContext, useState, useEffect } from 'react';
import { Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setActiveVersion } from '../utilits/bibleUtils';
import {
  DEFAULT_VERSION_ID,
  getVersionById,
} from '../assets/bibleVersion/json/bibleVersions';
import { sendPostRequest } from '../services/api';

export interface UserInfo {
  token: string;
  tokenType: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
  userRole?: number;
  roleName?: string;
}

type AppContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  userInfo: UserInfo | null;
  setUserInfo: (user: UserInfo | null) => Promise<void>;
  firstLaunch: boolean | null;
  markLaunched: () => Promise<void>;
  logout: () => Promise<void>;
  currentBook: string;
  setCurrentBook: (book: string) => void;
  currentChapter: number;
  setCurrentChapter: (chapter: number) => void;
  /** Currently active Bible version id (e.g. 'KJV', 'WEB') */
  bibleVersionId: string;
  /** Switch to a different Bible version and persist the choice */
  setBibleVersion: (versionId: string) => Promise<void>;
  /**
   * True when the user chose "Read as Guest".
   * Cloud features (highlights, notes, favourites, history) are disabled.
   * Cleared automatically on sign-in / logout.
   */
  isGuest: boolean;
  /** True when user has admin role (userRole === 1) */
  isAdmin: boolean;
  /** Current subscription tier */
  subscriptionTier: string;
  /** Subscription expiry date */
  accessExpiresAt: string | null;
  /** Fetch latest subscription status from backend */
  fetchSubscriptionStatus: () => Promise<void>;
  /** Check if user has access to a given tier */
  hasSubscriptionAccess: (minimumTier: 'legacy_sower' | 'covenant_sower') => boolean;
};

export const AppContext = createContext<AppContextType | null>(null);

const USER_INFO_KEY = 'user_info';
const FIRST_LAUNCH_KEY = 'first_launch';
const THEME_KEY = 'theme_preference';
const BIBLE_VERSION_KEY = 'bible_version';
const BIBLE_BOOK_KEY = 'bible_current_book';
const BIBLE_CHAPTER_KEY = 'bible_current_chapter';

const DEFAULT_BOOK = 'Genesis';
const DEFAULT_CHAPTER = 1;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemDark = Appearance.getColorScheme() === 'dark';
  const [isDark, setIsDark] = useState(systemDark);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(null);
  const [firstLaunch, setFirstLaunch] = useState<boolean | null>(null);
  const [currentBook, setCurrentBookState] = useState(DEFAULT_BOOK);
  const [currentChapter, setCurrentChapterState] = useState(DEFAULT_CHAPTER);
  const [bibleVersionId, setBibleVersionId] = useState(DEFAULT_VERSION_ID);
  // ── Subscription ─────────────────────────────────────────────────────────
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);

  const TIER_ORDER: Record<string, number> = {
    free: 0,
    legacy_sower: 1,
    covenant_sower: 2,
  };

  const hasSubscriptionAccess = (minimumTier: 'legacy_sower' | 'covenant_sower'): boolean => {
    return TIER_ORDER[subscriptionTier] >= TIER_ORDER[minimumTier];
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      const res = await sendPostRequest('subscriptions', 'status', {});
      if (res.returnCode === 200 && res.returnData?.subscriptionTier) {
        setSubscriptionTier(res.returnData.subscriptionTier);
        setAccessExpiresAt(res.returnData.accessExpiresAt || null);
      }
    } catch {
      // Non-fatal — default to free
    }
  };

  // ── Guest mode ────────────────────────────────────────────────────────────
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    loadAppData();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(
      async ({ colorScheme }) => {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme === null) setIsDark(colorScheme === 'dark');
      },
    );
    return () => subscription.remove();
  }, []);

  // Re-fetch subscription status when app comes to foreground
  // so gating reflects latest Stripe webhook updates immediately
  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'active' && userInfo) {
        fetchSubscriptionStatus();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [userInfo]);

  const loadAppData = async () => {
    try {
      setLoading(true);

      // First launch
      const firstLaunchValue = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      setFirstLaunch(firstLaunchValue === null);

      // Theme
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      setIsDark(savedTheme !== null ? savedTheme === 'dark' : systemDark);

      // Bible version
      const savedVersion = await AsyncStorage.getItem(BIBLE_VERSION_KEY);
      const resolvedVersion = savedVersion
        ? getVersionById(savedVersion).id
        : DEFAULT_VERSION_ID;
      setBibleVersionId(resolvedVersion);
      setActiveVersion(resolvedVersion);

      // Restore last reading position
      const savedBook = await AsyncStorage.getItem(BIBLE_BOOK_KEY);
      if (savedBook) setCurrentBookState(savedBook);

      const savedChapter = await AsyncStorage.getItem(BIBLE_CHAPTER_KEY);
      if (savedChapter) {
        const parsed = parseInt(savedChapter, 10);
        if (!isNaN(parsed) && parsed > 0) setCurrentChapterState(parsed);
      }

      // User info
      const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
      if (userInfoStr) {
        setUserInfoState(JSON.parse(userInfoStr));
        // Fetch subscription status if logged in
        fetchSubscriptionStatus();
      }
    } catch (error) {
      console.error('❌ Error loading app data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Book & chapter setters that also persist ──────────────────────────────

  const setCurrentBook = (book: string) => {
    setCurrentBookState(book);
    AsyncStorage.setItem(BIBLE_BOOK_KEY, book).catch(err =>
      console.error('❌ Error saving current book:', err),
    );
  };

  const setCurrentChapter = (chapter: number) => {
    setCurrentChapterState(chapter);
    AsyncStorage.setItem(BIBLE_CHAPTER_KEY, String(chapter)).catch(err =>
      console.error('❌ Error saving current chapter:', err),
    );
  };

  // ── Theme ─────────────────────────────────────────────────────────────────

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem(THEME_KEY, newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('❌ Error saving theme preference:', error);
    }
  };

  // ── Bible version ─────────────────────────────────────────────────────────

  const setBibleVersion = async (versionId: string) => {
    try {
      console.log('🔄 Changing Bible version to:', versionId);
      const resolved = getVersionById(versionId).id;
      setActiveVersion(versionId);
      setBibleVersionId(versionId);
      await AsyncStorage.setItem(BIBLE_VERSION_KEY, versionId);
      console.log('✅ Bible version changed to:', versionId);
    } catch (error) {
      setBibleVersionId(DEFAULT_VERSION_ID);
      console.error('❌ Error saving Bible version:', error);
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  const markLaunched = async () => {
    try {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
      setFirstLaunch(false);
    } catch (error) {
      console.error('❌ Error marking first launch:', error);
    }
  };

  const setUserInfo = async (user: UserInfo | null) => {
    try {
      if (user) {
        await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
        await AsyncStorage.setItem('auth_token', user.token);
        // Re-fetch subscription status in case user already has a subscription
        fetchSubscriptionStatus();
      } else {
        await AsyncStorage.removeItem(USER_INFO_KEY);
        await AsyncStorage.removeItem('auth_token');
        setSubscriptionTier('free');
        setAccessExpiresAt(null);
      }
      setUserInfoState(user);
    } catch (error) {
      console.error('❌ Error saving user info:', error);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Notify backend so it can close the active session
      try {
        await sendPostRequest('auth', 'logout', {});
      } catch (backendErr) {
        // Non-fatal — always clear local state even if the request fails
        console.warn('⚠️ Backend logout call failed:', backendErr);
      }
      await AsyncStorage.multiRemove([USER_INFO_KEY, 'auth_token']);
      setUserInfoState(null);
      setIsGuest(false);
    } catch (error) {
      console.error('❌ Error during logout:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
      <AppContext.Provider
        value={{
          isDark,
          toggleTheme,
          loading,
          setLoading,
          userInfo,
          setUserInfo,
          firstLaunch,
          markLaunched,
          logout,
          currentBook,
          setCurrentBook,
          currentChapter,
          setCurrentChapter,
          bibleVersionId,
          setBibleVersion,
          isGuest,
          isAdmin: userInfo?.userRole === 1,
          subscriptionTier,
          accessExpiresAt,
          fetchSubscriptionStatus,
          hasSubscriptionAccess,
        }}
      >
      {children}
    </AppContext.Provider>
  );
};

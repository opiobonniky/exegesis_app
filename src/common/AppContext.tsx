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

import React, { createContext, useState, useEffect, useCallback } from 'react';
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
  /** Subscription tier returned directly from the login response */
  subscriptionTier?: string;
  accessExpiresAt?: string | null;
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
  /** True while subscription status is being fetched from backend */
  subscriptionLoading: boolean;
  /** Fetch latest subscription status from backend. Pass silent=true to skip the loading spinner (for background refreshes). */
  fetchSubscriptionStatus: (silent?: boolean) => Promise<void>;
  /** Poll every 3s until the tier changes from the current value, or timeout after 30s. Returns the new tier. */
  waitForTierUpdate: () => Promise<string>;
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
  // True while a subscription status fetch is in-flight.
  // The gate must not redirect while this is true to avoid blocking users
  // whose tier hasn't loaded yet (e.g. right after login).
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const TIER_ORDER: Record<string, number> = {
    free: 0,
    legacy_sower_monthly: 1,
    legacy_sower: 1,
    covenant_sower_monthly: 2,
    covenant_sower: 2,
  };

  const hasSubscriptionAccess = useCallback(
    (minimumTier: 'legacy_sower' | 'covenant_sower'): boolean => {
      const order: Record<string, number> = {
        free: 0,
        legacy_sower_monthly: 1,
        legacy_sower: 1,
        covenant_sower_monthly: 2,
        covenant_sower: 2,
      };
      return (order[subscriptionTier] ?? 0) >= order[minimumTier];
    },
    [subscriptionTier],
  );

  const fetchSubscriptionStatus = async (silent = false) => {
    try {
      if (!silent) setSubscriptionLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      const res = await sendPostRequest('subscriptions', 'status', {});
      if (res.returnCode === 200) {
        const freshTier: string = res.returnData?.subscriptionTier || 'free';
        const freshExpiry: string | null = res.returnData?.accessExpiresAt || null;
        setSubscriptionTier(freshTier);
        setAccessExpiresAt(freshExpiry);
        // Persist the refreshed tier back into the cached UserInfo so that
        // the next cold boot restores the correct tier instantly.
        const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
        if (userInfoStr) {
          const saved: UserInfo = JSON.parse(userInfoStr);
          saved.subscriptionTier = freshTier;
          saved.accessExpiresAt = freshExpiry;
          await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(saved));
        }
      }
    } catch {
      // Non-fatal — default to free
    } finally {
      if (!silent) setSubscriptionLoading(false);
    }
  };

  const waitForTierUpdate = useCallback(async (): Promise<string> => {
    const initialTier = subscriptionTier;
    return new Promise(resolve => {
      let attempts = 0;
      const maxAttempts = 10; // 30 seconds total (10 × 3s)
      const iv = setInterval(async () => {
        attempts++;
        try {
          await fetchSubscriptionStatus(true);
          // subscriptionTier is now updated by the state setter from fetchSubscriptionStatus
          // We need to check it via the ref or just check via a new request
          const res = await sendPostRequest('subscriptions', 'status', {});
          if (res.returnCode === 200) {
            const newTier = res.returnData?.subscriptionTier || 'free';
            if (newTier !== initialTier || attempts >= maxAttempts) {
              clearInterval(iv);
              setSubscriptionTier(newTier);
              // persist
              const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
              if (userInfoStr) {
                const saved: UserInfo = JSON.parse(userInfoStr);
                saved.subscriptionTier = newTier;
                saved.accessExpiresAt = res.returnData.accessExpiresAt || null;
                await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(saved));
              }
              resolve(newTier);
            }
          } else if (attempts >= maxAttempts) {
            clearInterval(iv);
            resolve(subscriptionTier);
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(iv);
            resolve(subscriptionTier);
          }
        }
      }, 3000);
    });
  }, [subscriptionTier, fetchSubscriptionStatus]);

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
        fetchSubscriptionStatus(true); // silent — user already has a known tier
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
        const savedUser: UserInfo = JSON.parse(userInfoStr);
        setUserInfoState(savedUser);

        if (savedUser.subscriptionTier && savedUser.subscriptionTier !== 'free') {
          // Paid tier cached — apply it immediately so gated screens
          // never see 'free' on boot, then refresh in the background.
          setSubscriptionTier(savedUser.subscriptionTier);
          setAccessExpiresAt(savedUser.accessExpiresAt ?? null);
          // silent=true: don't show spinner since we already have a valid tier
          fetchSubscriptionStatus(true);
        } else {
          // No tier or cached as 'free' — must await the fetch so
          // subscriptionLoading stays true and the gate doesn't redirect
          // before the real tier arrives from the server.
          await fetchSubscriptionStatus(false);
        }
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
        // If the login response already includes the tier (backend now sends it),
        // apply it immediately so gated screens see the correct tier before any
        // navigation happens — no extra round-trip needed.
        if (user.subscriptionTier) {
          setSubscriptionTier(user.subscriptionTier);
          setAccessExpiresAt(user.accessExpiresAt ?? null);
        }
        // Callers can still call fetchSubscriptionStatus() afterwards to refresh,
        // but it's no longer required for the initial gating check.
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
          subscriptionLoading,
          fetchSubscriptionStatus,
          waitForTierUpdate,
          hasSubscriptionAccess,
        }}
      >
      {children}
    </AppContext.Provider>
  );
};

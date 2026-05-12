import React, { useContext, useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { route } from './routes';
import { AppContext } from '../../common/AppContext';
import LoadingCard from '../../common/LoadingCard';

const Stack = createNativeStackNavigator();

const ANIMATIONS = [
  'slide_from_right',
  'slide_from_left',
  'slide_from_bottom',
  'fade',
] as const;

type AnimationType = (typeof ANIMATIONS)[number];

const FORCED_ANIMATIONS: Record<string, AnimationType> = {
  voiceSettings: 'slide_from_bottom',
  readingSettings: 'slide_from_bottom',
  notificationSettings: 'slide_from_bottom',
  AddDailyVerse: 'slide_from_bottom',
  EditDailyVerse: 'slide_from_bottom',
  AddDailyDevotion: 'slide_from_bottom',
  EditDailyDevotion: 'slide_from_bottom',
  CreateReadingPlan: 'slide_from_bottom',
  EditReadingPlan: 'slide_from_bottom',
  journalEntry: 'slide_from_bottom',
};

const AppNavigation = () => {
  const { firstLaunch, userInfo, loading }: any = useContext(AppContext);
  const userLoggedIn = !!userInfo;
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const animationMap = useRef<Map<string, AnimationType>>(new Map());

  const getAnimation = useCallback((screenName: string): AnimationType => {
    if (FORCED_ANIMATIONS[screenName]) return FORCED_ANIMATIONS[screenName];
    if (!animationMap.current.has(screenName)) {
      const random = ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)];
      animationMap.current.set(screenName, random);
    }
    return animationMap.current.get(screenName)!;
  }, []);

  const screenOptions = useCallback(
    ({ route: r }: any) => {
      const animation = getAnimation(r.name);
      return {
        headerShown: false,
        animation,
        animationDuration: 260,
        gestureEnabled: true,
        gestureDirection: 'horizontal' as const,
        presentation: animation === 'slide_from_bottom' ? 'modal' : 'card',
      };
    },
    [getAnimation],
  );

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      const [
        { bootstrapPlanChannels, attachPlanNotifHandlers },
        { attachDailyVerseNotifHandlers, scheduleDailyVerseReminder },
        { setupNotificationListeners },
      ] = await Promise.all([
        import('../../features/ReadingPlan/planNotificationService'),
        import('../../features/home/dailyVerseNotificationService'),
        import('../../utilits/firebaseService'),
      ]);

      bootstrapPlanChannels();

      const navigate = (screen: string, params?: Record<string, any>) => {
        navigationRef.current?.navigate(screen, params as never);
      };

      attachPlanNotifHandlers(navigate);
      attachDailyVerseNotifHandlers(navigate);
      scheduleDailyVerseReminder();
      setupNotificationListeners();
    });

    return () => task.cancel();
  }, []);

  if (loading) return <LoadingCard />;

  const isAdmin = userInfo?.userRole === 1;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="main" screenOptions={screenOptions}>
        {/* ── Initial screen ────────────────────────────────────────────── */}
        {firstLaunch ? (
          <Stack.Screen
            name={route.welcome}
            getComponent={() => require('../../features/auth/welcome').default}
          />
        ) : userLoggedIn && isAdmin ? (
          <Stack.Screen
            name={route.adminDashboard}
            getComponent={() =>
              require('../../features/admin/AdminDashboard').default
            }
          />
        ) : userLoggedIn ? (
          <Stack.Screen
            name={route.home}
            getComponent={() => require('../../features/home/Home').default}
          />
        ) : (
          <Stack.Screen
            name={route.login}
            getComponent={() => require('../../features/auth/login').default}
          />
        )}

        {/* ── Auth ──────────────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.notLogined}
          getComponent={() => require('../../features/auth/login').default}
        />
        <Stack.Screen
          name={route.guestEntry}
          getComponent={() => require('../../features/auth/GuestEntry').default}
        />
        <Stack.Screen
          name={route.register}
          getComponent={() => require('../../features/auth/Register').default}
        />
        <Stack.Screen
          name={route.googleRegister}
          getComponent={() =>
            require('../../features/auth/GoogleRegister').default
          }
        />
        <Stack.Screen
          name={route.forgotPassword}
          getComponent={() =>
            require('../../features/auth/ForgotPassword').default
          }
        />

        {/* ── Bible ─────────────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.bible}
          getComponent={() => require('../../features/bible/bible').default}
        />
        <Stack.Screen
          name={route.bibleGuest}
          getComponent={() => require('../../features/bible/bible').default}
        />
        <Stack.Screen
          name={route.bibleFirstLaunch}
          getComponent={() => require('../../features/bible/bible').default}
        />

        {/* ── Home ──────────────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.homeLogin}
          getComponent={() => require('../../features/home/Home').default}
        />

        {/* ── Main app ──────────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.Highlights}
          getComponent={() =>
            require('../../features/bible/Highlights').default
          }
        />
        <Stack.Screen
          name={route.readHistory}
          getComponent={() =>
            require('../../features/bible/ReadHistory').default
          }
        />
        <Stack.Screen
          name={route.profile}
          getComponent={() => require('../../features/Setting/Profile').default}
        />
        <Stack.Screen
          name={route.dailyDevotional}
          getComponent={() =>
            require('../../features/bible/DailyDevotional').default
          }
        />
        <Stack.Screen
          name={route.dailyVerse}
          getComponent={() =>
            require('../../features/bible/DailyVerseScreen').default
          }
        />
        <Stack.Screen
          name={route.favorites}
          getComponent={() => require('../../features/bible/Favorites').default}
        />
        <Stack.Screen
          name={route.notes}
          getComponent={() => require('../../features/bible/Notes').default}
        />
        <Stack.Screen
          name={route.editProfile}
          getComponent={() =>
            require('../../features/Setting/EditProfile').default
          }
        />
        <Stack.Screen
          name={route.extendedProfile}
          getComponent={() =>
            require('../../features/Setting/ExtendedProfile').default
          }
        />
        <Stack.Screen
          name={route.readingPlan}
          getComponent={() =>
            require('../../features/ReadingPlan/BibleReadingPlan').default
          }
        />
        <Stack.Screen
          name={route.planDetail}
          getComponent={() =>
            require('../../features/ReadingPlan/PlanDetailScreen').default
          }
        />
        <Stack.Screen
          name={route.dailyReading}
          getComponent={() =>
            require('../../features/ReadingPlan/DailyReadingScreen').default
          }
        />
        <Stack.Screen
          name={route.planBible}
          getComponent={() =>
            require('../../features/ReadingPlan/Planbiblescreen').default
          }
        />

        {/* ── Settings (modal) ──────────────────────────────────────────── */}
        <Stack.Screen
          name={route.voiceSettings}
          getComponent={() =>
            require('../../features/Setting/VoiceSettings').default
          }
        />
        <Stack.Screen
          name={route.readingSettings}
          getComponent={() =>
            require('../../features/Setting/Readingsettings').default
          }
        />
        <Stack.Screen
          name={route.notificationSettings}
          getComponent={() =>
            require('../../features/Setting/NotificationSettings').default
          }
        />

        {/* ── Admin ─────────────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.adminDashboardLogin}
          getComponent={() =>
            require('../../features/admin/AdminDashboard').default
          }
        />
        <Stack.Screen
          name={route.adminUsers}
          getComponent={() =>
            require('../../features/admin/AdminUsersPage').default
          }
        />
        <Stack.Screen
          name={route.adminActivity}
          getComponent={() =>
            require('../../features/admin/AdminActivityPage').default
          }
        />
        <Stack.Screen
          name={route.adminDailyVerse}
          getComponent={() =>
            require('../../features/admin/AdminDailyVerseManager').default
          }
        />
        <Stack.Screen
          name="AddDailyVerse"
          getComponent={() =>
            require('../../features/admin/AddDailyVerse').default
          }
        />
        <Stack.Screen
          name="EditDailyVerse"
          getComponent={() =>
            require('../../features/admin/AddDailyVerse').default
          }
        />
        <Stack.Screen
          name={route.adminDailyDevotion}
          getComponent={() =>
            require('../../features/admin/AdminDailyDevotionManager').default
          }
        />
        <Stack.Screen
          name="AddDailyDevotion"
          getComponent={() =>
            require('../../features/admin/AddDailyDevotion').default
          }
        />
        <Stack.Screen
          name="EditDailyDevotion"
          getComponent={() =>
            require('../../features/admin/AddDailyDevotion').default
          }
        />
        <Stack.Screen
          name={route.adminReadingPlans}
          getComponent={() =>
            require('../../features/admin/AdminReadingPlans').default
          }
        />
        <Stack.Screen
          name="CreateReadingPlan"
          getComponent={() =>
            require('../../features/admin/CreateReadingPlan').default
          }
        />
        <Stack.Screen
          name="EditReadingPlan"
          getComponent={() =>
            require('../../features/admin/EditReadingPlan').default
          }
        />
        <Stack.Screen
          name={route.adminReadingPlanDetail}
          getComponent={() =>
            require('../../features/admin/AdminReadingPlanDetail').default
          }
        />

        {/* ── Journal ───────────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.journal}
          getComponent={() =>
            require('../../features/journal/JournalList').default
          }
        />
        <Stack.Screen
          name={route.journalEntry}
          getComponent={() =>
            require('../../features/journal/JournalEntry').default
          }
        />
        <Stack.Screen
          name={route.journalDetail}
          getComponent={() =>
            require('../../features/journal/JournalDetail').default
          }
        />
        <Stack.Screen
          name={route.adminJournalPrompts}
          getComponent={() =>
            require('../../features/journal/AdminJournalPrompts').default
          }
        />
        <Stack.Screen
          name={route.adminJournalTemplates}
          getComponent={() =>
            require('../../features/journal/AdminJournalTemplates').default
          }
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;

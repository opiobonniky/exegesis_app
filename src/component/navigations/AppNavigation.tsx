

import React, { useContext, useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import Login from '../../features/auth/login';
import ForgotPassword from '../../features/auth/ForgotPassword';
import Register from '../../features/auth/Register';
import Welcome from '../../features/auth/welcome';
import GuestEntry from '../../features/auth/GuestEntry'; // ← NEW
import Bible from '../../features/bible/bible';
import { route } from './routes';
import { AppContext } from '../../common/AppContext';
import Highlights from '../../features/bible/Highlights';
import ReadHistory from '../../features/bible/ReadHistory';
import Profile from '../../features/Setting/Profile';
import DailyDevotional from '../../features/bible/DailyDevotional';
import Home from '../../features/home/Home';
import Favorites from '../../features/bible/Favorites';
import FullVerseExplanation from '../../features/bible/FullVerseExplanation';
import LoadingCard from '../../common/LoadingCard';
import Notes from '../../features/bible/Notes';
import EditProfile from '../../features/Setting/EditProfile';
import ExtendedProfile from '../../features/Setting/ExtendedProfile';
import BibleReadingPlan from '../../features/ReadingPlan/BibleReadingPlan';
import PlanDetailScreen from '../../features/ReadingPlan/PlanDetailScreen';
import DailyReadingScreen from '../../features/ReadingPlan/DailyReadingScreen';
import VoiceSettings from '../../features/Setting/VoiceSettings';
import {
  attachPlanNotifHandlers,
  bootstrapPlanChannels,
} from '../../features/ReadingPlan/planNotificationService';
import { setupNotificationListeners } from '../../utilits/firebaseService';
import PlanBibleScreen from '../../features/ReadingPlan/Planbiblescreen';
import ReadingSettingsScreen from '../../features/Setting/Readingsettings';
import NotificationSettings from '../../features/Setting/NotificationSettings';
import {
  attachDailyVerseNotifHandlers,
  scheduleDailyVerseReminder,
} from '../../features/home/dailyVerseNotificationService';
import AdminDashboard from '../../features/admin/AdminDashboard';
import AdminUsersPage from '../../features/admin/AdminUsersPage';
import AdminActivityPage from '../../features/admin/AdminActivityPage';
import AdminDailyVerseManager from '../../features/admin/AdminDailyVerseManager';
import AdminReadingPlans from '../../features/admin/AdminReadingPlans';

const Stack = createNativeStackNavigator();

const AppNavigation = () => {
  const { firstLaunch, userInfo, loading }: any = useContext(AppContext);
  const userLoggedIn = !!userInfo;

  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    bootstrapPlanChannels();

    const navigate = (screen: string, params?: Record<string, any>) => {
      navigationRef.current?.navigate(screen, params as never);
    };

    attachPlanNotifHandlers(navigate);
    attachDailyVerseNotifHandlers(navigate);
    scheduleDailyVerseReminder();
    setupNotificationListeners();
  }, []);

  if (loading) return <LoadingCard />;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="main" screenOptions={{ headerShown: false }}>
        {/* ── Initial screen decision tree ─────────────────────────────── */}
        {firstLaunch ? (
          // Brand new install → Welcome onboarding slides
          <Stack.Screen name={route.welcome} component={Welcome} />
        ) : userLoggedIn ? (
          // Returning authenticated user → straight to Bible
          <Stack.Screen name={route.home} component={Home} />
        ) : (
          // Not logged in, not first launch → Auth hub (GuestEntry)
          // Users can read the Bible as guest OR choose to sign in / register
          <Stack.Screen name={route.guestEntry} component={GuestEntry} />
        )}
        {/* ── Auth screens ─────────────────────────────────────────────── */}
        <Stack.Screen name={route.notLogined} component={Login} />
        <Stack.Screen name={route.login} component={Login} />
        <Stack.Screen name={route.register} component={Register} />
        <Stack.Screen name={route.forgotPassword} component={ForgotPassword} />
        <Stack.Screen name={route.bible} component={Bible} />
        <Stack.Screen name={route.bibleGuest} component={Bible} />
        <Stack.Screen name={route.homeLogin} component={Home} />
        {/* ── Main app screens ─────────────────────────────────────────── */}
        <Stack.Screen name={route.bibleFirstLaunch} component={Bible} />
        <Stack.Screen name={route.Highlights} component={Highlights} />
        <Stack.Screen name={route.readHistory} component={ReadHistory} />
        <Stack.Screen name={route.profile} component={Profile} />
        <Stack.Screen
          name={route.dailyDevotional}
          component={DailyDevotional}
        />
        <Stack.Screen name={route.favorites} component={Favorites} />
        <Stack.Screen
          name={route.fullVerseExplanation}
          component={FullVerseExplanation}
        />
        <Stack.Screen name={route.notes} component={Notes} />
        <Stack.Screen name={route.editProfile} component={EditProfile} />
        <Stack.Screen
          name={route.extendedProfile}
          component={ExtendedProfile}
        />
        <Stack.Screen name={route.readingPlan} component={BibleReadingPlan} />
        <Stack.Screen name={route.planDetail} component={PlanDetailScreen} />
        <Stack.Screen
          name={route.dailyReading}
          component={DailyReadingScreen}
        />
        <Stack.Screen name={route.voiceSettings} component={VoiceSettings} />
        <Stack.Screen name={route.planBible} component={PlanBibleScreen} />
        <Stack.Screen
          name={route.readingSettings}
          component={ReadingSettingsScreen}
        />
        <Stack.Screen
          name={route.notificationSettings}
          component={NotificationSettings}
        />
        {/* ── Admin screens ─────────────────────────────────────────── */}
        <Stack.Screen name={route.adminDashboard} component={AdminDashboard} />
        <Stack.Screen name={route.adminUsers} component={AdminUsersPage} />
        <Stack.Screen name={route.adminActivity} component={AdminActivityPage} />
        <Stack.Screen name={route.adminDailyVerse} component={AdminDailyVerseManager} />
        <Stack.Screen name={route.adminReadingPlans} component={AdminReadingPlans} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;

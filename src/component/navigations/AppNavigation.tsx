import React, { useContext, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
} from '@react-navigation/native';
import { route } from './routes';
import { AppContext } from '../../common/AppContext';
import LoadingCard from '../../common/LoadingCard';
import { navigationRef } from '../../services/navigationRef';
import { ConnectivityProvider } from '../../providers/ConnectivityProvider';
import { withSubscriptionGate } from '../../reusable/SubscriptionGate';

const gate = (
  mod: any,
  tier: 'legacy_sower' | 'covenant_sower',
): React.ComponentType<any> =>
  withSubscriptionGate(mod, tier) as React.ComponentType<any>;

const Stack = createNativeStackNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Gated screens must be created OUTSIDE the component function.
// If created inside (e.g. inline in getComponent), React sees a brand-new
// component type every render → unmount/remount → effect fires → navigate →
// re-render → infinite loop.
// ─────────────────────────────────────────────────────────────────────────────
const GatedReadingPlan = gate(
  require('../../features/ReadingPlan/BibleReadingPlan').default,
  'legacy_sower',
);
const GatedPlanDetail = gate(
  require('../../features/ReadingPlan/PlanDetailScreen').default,
  'legacy_sower',
);
const GatedDailyReading = gate(
  require('../../features/ReadingPlan/DailyReadingScreen').default,
  'legacy_sower',
);
const GatedPlanBible = gate(
  require('../../features/ReadingPlan/Planbiblescreen').default,
  'legacy_sower',
);
const GatedJournal = gate(
  require('../../features/ledger/LegacyLedgerScreen').default,
  'legacy_sower',
);
const GatedJournalEntry = gate(
  require('../../features/journal/JournalEntry').default,
  'legacy_sower',
);
const GatedJournalDetail = gate(
  require('../../features/journal/JournalDetail').default,
  'legacy_sower',
);
const GatedLegacyLedger = gate(
  require('../../features/ledger/LegacyLedgerScreen').default,
  'legacy_sower',
);
const GatedLedgerDetail = gate(
  require('../../features/journal/JournalDetail').default,
  'legacy_sower',
);
const GatedLedgerEntry = gate(
  require('../../features/journal/JournalEntry').default,
  'legacy_sower',
);
const GatedStudyBible = gate(
  require('../../features/strongs-dictionary/StrongsDictionaryScreen').default,
  'legacy_sower',
);
const GatedBibleStudy = gate(
  require('../../features/lab/LabFlowScreen').default,
  'legacy_sower',
);
const GatedTrivia = gate(
  require('../../features/trivia/TriviaScreen').default,
  'legacy_sower',
);

const getLabHomeScreen = gate(
  require('../../features/lab/LabHomeScreen').default,
  'legacy_sower'
);

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
  AddStudyTool: 'slide_from_bottom',
  EditStudyTool: 'slide_from_bottom',
  AddBookPrologue: 'slide_from_bottom',
  EditBookPrologue: 'slide_from_bottom',

  CreateReadingPlan: 'slide_from_bottom',
  EditReadingPlan: 'slide_from_bottom',
  journalEntry: 'slide_from_bottom',
  LabHomeScreen: 'slide_from_bottom',
};


const linking = {
  prefixes: ['exegesis://'],
  config: {
    screens: {
      [route.sower]: 'sower',
    },
  },
};

const AppNavigation = () => {

  const { firstLaunch, userInfo, loading }: any = useContext(AppContext);
  const userLoggedIn = !!userInfo;
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
      const presentation:
        | 'card'
        | 'modal'
        | 'transparentModal'
        | 'containedModal'
        | 'containedTransparentModal'
        | 'fullScreenModal'
        | 'formSheet'
        | 'pageSheet' =
        animation === 'slide_from_bottom' ? 'fullScreenModal' : 'card';
      return {
        headerShown: false,
        animation,
        animationDuration: 260,
        gestureEnabled: true,
        gestureDirection: 'horizontal' as const,
        presentation,
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
    <ConnectivityProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
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
            name={route.bible}
            getComponent={() => require('../../features/bible/bible').default}
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
          name={route.home}
          getComponent={() => require('../../features/home/Home').default}
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
          name={route.dailyExegesis}
          getComponent={() =>
            require('../../features/bible/DailyExegesisScreen').default
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
          name={route.userProfile}
          getComponent={() =>
            require('../../features/Setting/UserProfile').default
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
          getComponent={() => GatedReadingPlan}
        />
        <Stack.Screen
          name={route.planDetail}
          getComponent={() => GatedPlanDetail}
        />
        <Stack.Screen
          name={route.dailyReading}
          getComponent={() => GatedDailyReading}
        />
        <Stack.Screen
          name={route.planBible}
          getComponent={() => GatedPlanBible}
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
          name={route.adminDailyExegesis}
          getComponent={() =>
            require('../../features/admin/AdminDailyExegesisManager').default
          }
        />
        <Stack.Screen
          name="AddDailyExegesis"
          getComponent={() =>
            require('../../features/admin/AddDailyExegesis').default
          }
        />
        <Stack.Screen
          name="EditDailyExegesis"
          getComponent={() =>
            require('../../features/admin/AddDailyExegesis').default
          }
        />
        <Stack.Screen
          name={route.adminTrivia}
          getComponent={() =>
            require('../../features/admin/AdminTriviaManager').default
          }
        />
        <Stack.Screen
          name="AddTriviaQuestion"
          getComponent={() =>
            require('../../features/admin/AddTriviaQuestion').default
          }
        />
        <Stack.Screen
          name="EditTriviaQuestion"
          getComponent={() =>
            require('../../features/admin/AddTriviaQuestion').default
          }
        />
        <Stack.Screen
          name={route.adminTriviaPerformance}
          getComponent={() =>
            require('../../features/admin/AdminTriviaPerformance').default
          }
        />
        <Stack.Screen
          name={route.adminTriviaUserDetail}
          getComponent={() =>
            require('../../features/admin/AdminTriviaUserDetail').default
          }
        />
        <Stack.Screen
          name={route.adminStudyTools}
          getComponent={() =>
            require('../../features/admin/AdminStudyToolsManager').default
          }
        />
        <Stack.Screen
          name="AddStudyTool"
          getComponent={() =>
            require('../../features/admin/AddStudyTool').default
          }
        />
        <Stack.Screen
          name="EditStudyTool"
          getComponent={() =>
            require('../../features/admin/AddStudyTool').default
          }
        />
        <Stack.Screen
          name={route.adminBookPrologues}
          getComponent={() =>
            require('../../features/admin/AdminBookProloguesManager').default
          }
        />
        <Stack.Screen
          name="AddBookPrologue"
          getComponent={() =>
            require('../../features/admin/AddBookPrologue').default
          }
        />
        <Stack.Screen
          name="EditBookPrologue"
          getComponent={() =>
            require('../../features/admin/AddBookPrologue').default
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

        {/* ── Journal → Legacy Ledger ──────────────────────────────────── */}
        <Stack.Screen
          name={route.journal}
          getComponent={() => GatedJournal}
        />
        <Stack.Screen
          name={route.journalEntry}
          getComponent={() => GatedJournalEntry}
        />
        <Stack.Screen
          name={route.journalDetail}
          getComponent={() => GatedJournalDetail}
        />

        {/* ── Legacy Ledger ─────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.legacyLedger}
          getComponent={() => GatedLegacyLedger}
        />
        <Stack.Screen
          name={route.ledgerDetail}
          getComponent={() => GatedLedgerDetail}
        />
        <Stack.Screen
          name={route.ledgerEntry}
          getComponent={() => GatedLedgerEntry}
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
        <Stack.Screen
          name={route.adminJournalModeration}
          getComponent={() =>
            require('../../features/admin/AdminJournalModeration').default
          }
        />
        <Stack.Screen
          name={route.verseResources}
          getComponent={() =>
            require('../../features/bible/VerseResourcesScreen').default
          }
        />
        <Stack.Screen
          name={route.studyGuide}
          getComponent={() =>
            require('../../features/bible/modals/StudyGuideModal').default
          }
        />

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.search}
          getComponent={() =>
            require('../../features/search/SearchScreen').default
          }
        />

        {/* ── Study Bible (Strong's Dictionary / tools) ────────────────────── */}
        <Stack.Screen
          name={route.studyBible}
          getComponent={() => GatedStudyBible}
        />

        {/* ── Strong's Dictionary (alias route used by the Lab) ───────────── */}
        <Stack.Screen
          name={route.strongsDictionary}
          getComponent={() => GatedStudyBible}
        />

        {/* ── Bible Study (4-stage study flow) ────────────────────────────── */}
        <Stack.Screen
          name={route.bibleStudy}
          getComponent={() => GatedBibleStudy}
        />

        {/* ── Subscription / Sower ────────────────────────────────────────── */}
        <Stack.Screen
          name={route.sower}
          getComponent={() =>
            require('../../features/subscription/SowerScreen').default
          }
        />
        <Stack.Screen
          name={route.adminSubscriptions}
          getComponent={() =>
            require('../../features/admin/AdminSubscriptions').default
          }
        />

        {/* ── Bible Trivia ───────────────────────────────────────────────── */}
        <Stack.Screen
          name={route.trivia}
          getComponent={() => GatedTrivia}
          />
          <Stack.Screen
          name={route.lab}
          getComponent={() => getLabHomeScreen}
        />  

        {/* ── Admin Verse Explanations ────────────────────────────────────── */}
        <Stack.Screen
          name={route.adminVerseExplanations}
          getComponent={() =>
            require('../../features/admin/AdminVerseExplanationsManager').default
          }
        />
        <Stack.Screen
          name={route.addVerseExplanation}
          getComponent={() =>
            require('../../features/admin/AddVerseExplanation').default
          }
        />
      </Stack.Navigator>
    </NavigationContainer>
    </ConnectivityProvider>
  );
};

export default AppNavigation;

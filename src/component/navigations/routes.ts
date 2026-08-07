export const route = {
  bible: 'Bible',
  bibleGuest: 'BibleGuest',
  login: 'Login',
  register: 'Register',
  googleRegister: 'GoogleRegister',
  welcome: 'Welcome',
  forgotPassword: 'ForgotPassword',
  Highlights: 'Highlights',
  readHistory: 'ReadHistory',
  profile: 'Profile',
  dailyDevotional: 'DailyDevotional',
  dailyDevotions: 'DailyDevotions',
  dailyExegesis: 'DailyExegesis',
  dailyVerse: 'DailyVerse',
  home: 'Home',
  homeLogin: 'HomeLogin',
  favorites: 'Favorites',
  notLogined: 'NotLoggedIn',
  bibleFirstLaunch: 'BibleFirstLaunch',
  notes: 'Notes',
  editProfile: 'EditProfile',
  userProfile: 'UserProfile',
  extendedProfile: 'ExtendedProfile',
  readingPlan: 'ReadingPlan',
  planDetail: 'PlanDetail',
  dailyReading: 'DailyReading',
  voiceSettings: 'VoiceSettings',
  guestEntry: 'GuestEntry',
  notificationSettings: 'NotificationSettings',
  planBible: 'PlanBibleScreen',
  readingSettings: 'ReadingSettings',
  adminDashboard: 'AdminDashboard',
  adminDashboardLogin: 'AdminDashboardLogin',
  adminUsers: 'AdminUsers',
  adminActivity: 'AdminActivity',
  adminDailyVerse: 'AdminDailyVerse',
  adminDailyDevotion: 'AdminDailyDevotion',
  adminDailyExegesis: 'AdminDailyExegesis',
  adminTrivia: 'AdminTrivia',
  adminStudyTools: 'AdminStudyTools',
  adminBookPrologues: 'AdminBookPrologues',
  adminReadingPlans: 'AdminReadingPlans',
  adminReadingPlanDetail: 'AdminReadingPlanDetail',
  journal: 'Journal',
  journalEntry: 'JournalEntry',
  journalDetail: 'JournalDetail',
  adminJournalPrompts: 'AdminJournalPrompts',
  adminJournalTemplates: 'AdminJournalTemplates',
  adminJournalModeration: 'AdminJournalModeration',
  fullVerseExplanation: 'FullVerseExplanation',
  verseResources: 'VerseResources',
  wordStudy: 'WordStudy',
  search: 'Search',
  studyBible: 'StudyBible',
  bibleStudy: 'BibleStudy',
  lab: 'Lab',
  studyGuide: 'StudyGuide',
  legacyLedger: 'LegacyLedger',
  ledgerDetail: 'LedgerDetail',
  ledgerEntry: 'LedgerEntry',
  trivia: 'Trivia',
  adminTriviaPerformance: 'AdminTriviaPerformance',
  adminTriviaUserDetail: 'AdminTriviaUserDetail',
  sower: 'Sower',
  adminSubscriptions: 'AdminSubscriptions',
  strongsDictionary: 'StrongsDictionary',
  adminVerseExplanations: 'AdminVerseExplanations',
  addVerseExplanation: 'AddVerseExplanation',
} as const;

export type RouteName = (typeof route)[keyof typeof route];

export type RootStackParamList = {
  [route.bible]: { bookName: string; chapter: number; verseNumber?: number } | undefined;
  [route.bibleGuest]: { bookName: string; chapter: number; verseNumber?: number } | undefined;
  [route.fullVerseExplanation]: { bookName: string; chapter: number; verse: number };
  [route.verseResources]: { bookName: string; chapter: number; verse: number };
  [route.wordStudy]: { strongsId?: string; word?: string };
  [route.journalEntry]: { entryId?: string };
  [route.journalDetail]: { entryId: string };
  [route.planDetail]: { planId: string };
  [route.dailyReading]: { planId: string; day?: number };
  [route.planBible]: { planId: string; bookName?: string; chapter?: number };
  [route.search]: { query?: string; scope?: string; word?: string; strongsId?: string } | undefined;
  [route.strongsDictionary]: undefined;
  [route.studyBible]: { bookName?: string; chapter?: number; verseStart?: number; verseEnd?: number; stage?: string; learnTab?: string };
  [route.dailyDevotional]: undefined;
  [route.dailyDevotions]: undefined;
  [route.dailyExegesis]: undefined;
  [route.dailyVerse]: undefined;
  [route.home]: undefined;
  [route.homeLogin]: undefined;
  [route.Highlights]: undefined;
  [route.readHistory]: undefined;
  [route.profile]: undefined;
  [route.editProfile]: undefined;
  [route.userProfile]: undefined;
  [route.extendedProfile]: undefined;
  [route.favorites]: undefined;
  [route.notes]: undefined;
  [route.readingPlan]: undefined;
  [route.voiceSettings]: undefined;
  [route.notificationSettings]: undefined;
  [route.readingSettings]: undefined;
  [route.bibleStudy]: { bookName: string; chapter: number; verseStart: number; verseEnd: number; stage?: string; learnTab?: string };
  [route.lab]: { stage?: string } | undefined;
  [route.studyGuide]: undefined;
  [route.legacyLedger]: undefined;
  [route.trivia]: undefined;
  [route.sower]: undefined;
  [route.strongsDictionary]: undefined;
  [route.ledgerDetail]: { ledgerId: string };
  [route.ledgerEntry]: { ledgerId?: string };
  [route.adminTriviaPerformance]: { triviaId: string };
  [route.adminTriviaUserDetail]: { userId: string };
  [route.adminReadingPlanDetail]: { planId: string };
  [route.notLogined]: { screen?: string } | undefined;
  [route.addVerseExplanation]: { verseId?: string } | undefined;
};

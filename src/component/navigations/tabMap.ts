import { route } from './routes';

// Route name → bottom-tab id. Used to highlight the correct tab pill when a
// screen is pushed. All dictionary/study routes map to the TOOLS tab.
const ROUTE_TO_TAB: Record<string, string> = {
  [route.home]: 'home',
  [route.bible]: 'bible',
  [route.favorites]: 'favorites',
  [route.readingPlan]: 'Plan',
  [route.profile]: 'profile',
  [route.legacyLedger]: 'ledger',
  [route.ledgerDetail]: 'ledger',
  [route.ledgerEntry]: 'ledger',
  [route.journal]: 'ledger',
  [route.studyBible]: 'studyBible',
  [route.bibleStudy]: 'studyBible',
  [route.strongsDictionary]: 'studyBible',
  [route.adminDashboard]: 'adminDashboard',
  [route.adminUsers]: 'adminUsers',
  [route.adminDailyVerse]: 'adminVerse',
  [route.adminReadingPlans]: 'adminPlans',
  [route.adminJournalPrompts]: 'adminJournalPrompts',
  [route.adminJournalTemplates]: 'adminJournalTemplates',
};

/**
 * Resolves the active bottom-tab id for a route name.
 * Falls back to the manual active tab when the route is unknown or absent.
 */
export function getActiveTabForRoute(
  currentRouteName?: string | null,
  manualActiveTab?: string,
): string {
  return (currentRouteName ? ROUTE_TO_TAB[currentRouteName] : null) ?? manualActiveTab ?? '';
}

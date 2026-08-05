/**
 * Tests for getActiveTabForRoute — the route → bottom-tab map.
 *
 * Verifies that the dictionary/study routes (studyBible, bibleStudy,
 * strongsDictionary) all resolve to the TOOLS tab, that the other tabs
 * resolve correctly, and that unknown routes fall back to the manual tab.
 */

import { getActiveTabForRoute } from '../src/component/navigations/tabMap';
import { route } from '../src/component/navigations/routes';

describe('getActiveTabForRoute', () => {
  // ── Dictionary routes → TOOLS tab ────────────────────────────────────────
  test('resolves studyBible to the tools tab', () => {
    expect(getActiveTabForRoute(route.studyBible)).toBe('studyBible');
  });

  test('resolves bibleStudy to the tools tab', () => {
    expect(getActiveTabForRoute(route.bibleStudy)).toBe('studyBible');
  });

  test('resolves strongsDictionary to the tools tab', () => {
    expect(getActiveTabForRoute(route.strongsDictionary)).toBe('studyBible');
  });

  // ── Other tabs ───────────────────────────────────────────────────────────
  test('resolves home, bible, profile, readingPlan and favorites to their tabs', () => {
    expect(getActiveTabForRoute(route.home)).toBe('home');
    expect(getActiveTabForRoute(route.bible)).toBe('bible');
    expect(getActiveTabForRoute(route.profile)).toBe('profile');
    expect(getActiveTabForRoute(route.readingPlan)).toBe('Plan');
    expect(getActiveTabForRoute(route.favorites)).toBe('favorites');
  });

  test('resolves all ledger routes to the journal tab', () => {
    expect(getActiveTabForRoute(route.legacyLedger)).toBe('ledger');
    expect(getActiveTabForRoute(route.ledgerDetail)).toBe('ledger');
    expect(getActiveTabForRoute(route.ledgerEntry)).toBe('ledger');
    expect(getActiveTabForRoute(route.journal)).toBe('ledger');
  });

  test('resolves admin routes to their admin tabs', () => {
    expect(getActiveTabForRoute(route.adminDashboard)).toBe('adminDashboard');
    expect(getActiveTabForRoute(route.adminUsers)).toBe('adminUsers');
    expect(getActiveTabForRoute(route.adminDailyVerse)).toBe('adminVerse');
    expect(getActiveTabForRoute(route.adminReadingPlans)).toBe('adminPlans');
    expect(getActiveTabForRoute(route.adminJournalPrompts)).toBe('adminJournalPrompts');
    expect(getActiveTabForRoute(route.adminJournalTemplates)).toBe('adminJournalTemplates');
  });

  // ── Fallback behavior ────────────────────────────────────────────────────
  test('falls back to the manual active tab for unknown routes', () => {
    expect(getActiveTabForRoute('SomeUnknownRoute', 'home')).toBe('home');
    expect(getActiveTabForRoute(undefined, 'studyBible')).toBe('studyBible');
  });

  test('falls back to the manual active tab when route name is missing', () => {
    expect(getActiveTabForRoute(null, 'bible')).toBe('bible');
    expect(getActiveTabForRoute(undefined, 'bible')).toBe('bible');
  });

  test('returns empty string when nothing is known', () => {
    expect(getActiveTabForRoute(undefined, undefined)).toBe('');
    expect(getActiveTabForRoute(null)).toBe('');
    expect(getActiveTabForRoute('UnknownRoute')).toBe('');
  });
});

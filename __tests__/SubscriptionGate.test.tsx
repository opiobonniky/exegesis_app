/**
 * Tests for withSubscriptionGate HOC
 *
 * Verifies that:
 * 1. Authorized users (matching or exceeding the required tier) see the screen.
 * 2. Unauthenticated users are redirected to Login and nothing is rendered.
 * 3. Authenticated users with an insufficient tier are redirected to Sower.
 * 4. No infinite-render loop occurs (navigation called at most once per state change).
 */

import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { AppContext } from '../src/common/AppContext';
import { withSubscriptionGate } from '../src/reusable/SubscriptionGate';
import { navigationRef } from '../src/services/navigationRef';

// ── Mock navigationRef so we can spy on navigate ─────────────────────────────
const mockNavigate = jest.fn();
jest.mock('../src/services/navigationRef', () => ({
  navigationRef: { current: { navigate: jest.fn() } },
}));

// ── A trivial screen used as the gated component ──────────────────────────────
const ProtectedScreen = () => <Text testID="protected-content">Protected</Text>;
ProtectedScreen.displayName = 'ProtectedScreen';

// ── Helper: build a minimal AppContext value ──────────────────────────────────
type ContextOverrides = {
  userInfo?: object | null;
  subscriptionTier?: string;
};

function makeContext(overrides: ContextOverrides = {}) {
  const subscriptionTier = overrides.subscriptionTier ?? 'free';
  const tierOrder: Record<string, number> = {
    free: 0,
    legacy_sower: 1,
    covenant_sower: 2,
  };
  return {
    userInfo: overrides.userInfo !== undefined ? overrides.userInfo : { username: 'testuser' },
    subscriptionTier,
    hasSubscriptionAccess: (minimumTier: 'legacy_sower' | 'covenant_sower') =>
      tierOrder[subscriptionTier] >= tierOrder[minimumTier],
    // Unused but required by the context type
    isDark: false,
    toggleTheme: jest.fn(),
    loading: false,
    setLoading: jest.fn(),
    setUserInfo: jest.fn(),
    firstLaunch: false,
    markLaunched: jest.fn(),
    logout: jest.fn(),
    currentBook: 'Genesis',
    setCurrentBook: jest.fn(),
    currentChapter: 1,
    setCurrentChapter: jest.fn(),
    bibleVersionId: 'KJV',
    setBibleVersion: jest.fn(),
    isGuest: false,
    isAdmin: false,
    accessExpiresAt: null,
    fetchSubscriptionStatus: jest.fn(),
  } as any;
}

function renderGated(
  tier: 'legacy_sower' | 'covenant_sower',
  contextOverrides: ContextOverrides = {},
) {
  const GatedScreen = withSubscriptionGate(ProtectedScreen, tier);
  const ctx = makeContext(contextOverrides);
  return render(
    <AppContext.Provider value={ctx}>
      <GatedScreen />
    </AppContext.Provider>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the mock navigate fn on the ref
  (navigationRef as any).current = { navigate: mockNavigate };
});

// ── 1. Authorized: user has exactly the required tier ────────────────────────
test('renders protected screen when user meets the required tier', async () => {
  const { getByTestId } = renderGated('legacy_sower', {
    userInfo: { username: 'sower' },
    subscriptionTier: 'legacy_sower',
  });

  await act(async () => {});

  expect(getByTestId('protected-content')).toBeTruthy();
  expect(mockNavigate).not.toHaveBeenCalled();
});

// ── 2. Authorized: user exceeds the required tier ────────────────────────────
test('renders protected screen when user exceeds the required tier', async () => {
  const { getByTestId } = renderGated('legacy_sower', {
    userInfo: { username: 'covenant' },
    subscriptionTier: 'covenant_sower',
  });

  await act(async () => {});

  expect(getByTestId('protected-content')).toBeTruthy();
  expect(mockNavigate).not.toHaveBeenCalled();
});

// ── 3. Unauthenticated: no userInfo → redirect to Login ──────────────────────
test('redirects to Login when userInfo is null', async () => {
  const { queryByTestId } = renderGated('legacy_sower', {
    userInfo: null,
    subscriptionTier: 'free',
  });

  await act(async () => {});

  expect(queryByTestId('protected-content')).toBeNull();
  expect(mockNavigate).toHaveBeenCalledWith('Login');
});

// ── 4. Insufficient tier → redirect to Sower ─────────────────────────────────
test('redirects to Sower when user is logged in but tier is too low', async () => {
  const { queryByTestId } = renderGated('legacy_sower', {
    userInfo: { username: 'freeuser' },
    subscriptionTier: 'free',
  });

  await act(async () => {});

  expect(queryByTestId('protected-content')).toBeNull();
  expect(mockNavigate).toHaveBeenCalledWith('Sower');
});

// ── 5. No infinite loop: navigate called only once per mount ─────────────────
test('does not call navigate more than once for a stable unauthorized state', async () => {
  renderGated('legacy_sower', {
    userInfo: null,
    subscriptionTier: 'free',
  });

  // Allow multiple render cycles to settle
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  // navigate should have been called exactly once despite multiple render passes
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('Login');
});

// ── 6. covenant_sower gate rejects legacy_sower tier ────────────────────────
test('redirects to Sower when covenant tier is required but user only has legacy_sower', async () => {
  const { queryByTestId } = renderGated('covenant_sower', {
    userInfo: { username: 'legacyuser' },
    subscriptionTier: 'legacy_sower',
  });

  await act(async () => {});

  expect(queryByTestId('protected-content')).toBeNull();
  expect(mockNavigate).toHaveBeenCalledWith('Sower');
});

// ── 7. displayName is set correctly ──────────────────────────────────────────
test('sets a meaningful displayName on the gated component', () => {
  const Gated = withSubscriptionGate(ProtectedScreen, 'legacy_sower');
  expect(Gated.displayName).toBe('withSubscriptionGate(ProtectedScreen)');
});

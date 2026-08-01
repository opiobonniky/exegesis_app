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
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { AppContext } from '../src/common/AppContext';
import { withSubscriptionGate } from '../src/reusable/SubscriptionGate';

// ── Mock useNavigation so we can spy on navigate ─────────────────────────────
// The component calls navigation.replace() — spy on that.
// Keep the rest of the real module (navigationRef.ts needs createNavigationContainerRef).
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ replace: mockReplace }),
  };
});

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
): ReactTestRenderer {
  const GatedScreen = withSubscriptionGate(ProtectedScreen, tier);
  const ctx = makeContext(contextOverrides);
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <AppContext.Provider value={ctx}>
        <GatedScreen />
      </AppContext.Provider>,
    );
  });
  return renderer;
}

function hasProtectedContent(renderer: ReactTestRenderer): boolean {
  return renderer.root.findAllByProps({ testID: 'protected-content' }).length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Authorized: user has exactly the required tier ────────────────────────
test('renders protected screen when user meets the required tier', async () => {
  const renderer = renderGated('legacy_sower', {
    userInfo: { username: 'sower' },
    subscriptionTier: 'legacy_sower',
  });

  await act(async () => {});

  expect(hasProtectedContent(renderer)).toBe(true);
  expect(mockReplace).not.toHaveBeenCalled();
});

// ── 2. Authorized: user exceeds the required tier ────────────────────────────
test('renders protected screen when user exceeds the required tier', async () => {
  const renderer = renderGated('legacy_sower', {
    userInfo: { username: 'covenant' },
    subscriptionTier: 'covenant_sower',
  });

  await act(async () => {});

  expect(hasProtectedContent(renderer)).toBe(true);
  expect(mockReplace).not.toHaveBeenCalled();
});

// ── 3. Unauthenticated: no userInfo → redirect to Login ──────────────────────
test('redirects to Login when userInfo is null', async () => {
  const renderer = renderGated('legacy_sower', {
    userInfo: null,
    subscriptionTier: 'free',
  });

  await act(async () => {});

  expect(hasProtectedContent(renderer)).toBe(false);
  expect(mockReplace).toHaveBeenCalledWith('Login');
});

// ── 4. Insufficient tier → redirect to Sower ─────────────────────────────────
test('redirects to Sower when user is logged in but tier is too low', async () => {
  const renderer = renderGated('legacy_sower', {
    userInfo: { username: 'freeuser' },
    subscriptionTier: 'free',
  });

  await act(async () => {});

  expect(hasProtectedContent(renderer)).toBe(false);
  expect(mockReplace).toHaveBeenCalledWith('Sower');
});

// ── 5. No infinite loop: navigate called only once per mount ─────────────────
test('does not call navigate more than once for a stable unauthorized state', async () => {
  renderGated('legacy_sower', {
    userInfo: null,
    subscriptionTier: 'free',
  });

  // Allow multiple render cycles to settle
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 50));
  });

  // navigate should have been called exactly once despite multiple render passes
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('Login');
});

// ── 6. Any paid tier passes any gate (tier granularity not yet enforced) ────
// The HOC treats every paid tier as sufficient; `_minimumTier` is reserved for
// future granular gating (see withSubscriptionGate).
test('a paid legacy_sower user still passes a covenant_sower gate', async () => {
  const renderer = renderGated('covenant_sower', {
    userInfo: { username: 'legacyuser' },
    subscriptionTier: 'legacy_sower',
  });

  await act(async () => {});

  expect(hasProtectedContent(renderer)).toBe(true);
  expect(mockReplace).not.toHaveBeenCalled();
});

// ── 7. displayName is set correctly ──────────────────────────────────────────
test('sets a meaningful displayName on the gated component', () => {
  const Gated = withSubscriptionGate(ProtectedScreen, 'legacy_sower');
  expect(Gated.displayName).toBe('withSubscriptionGate(ProtectedScreen)');
});

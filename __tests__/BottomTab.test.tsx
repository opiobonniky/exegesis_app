import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { AppContext } from '../src/common/AppContext';
import BottomTab from '../src/component/navigations/BottomTab';
import { route } from '../src/component/navigations/routes';

const mockNavigate = jest.fn();
const mockHasAccess = jest.fn();

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    current: null,
    isReady: () => true,
    navigate: jest.fn(),
  }),
  useNavigation: () => ({ navigate: mockNavigate }),
  useNavigationState: (selector: any) =>
    selector({ index: 0, routes: [{ name: 'Bible' }] }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../src/component/language-translation/LanguageProvider', () => ({
  useLanguage: () => ({ translations: null, language: 'en' }),
  isRtlLanguage: () => false,
}));

jest.mock('../src/hooks/useSubscription', () => ({
  useSubscription: () => ({ hasAccess: mockHasAccess }),
}));

const renderTab = (props: React.ComponentProps<typeof BottomTab> = {}) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <AppContext.Provider
        value={{ isDark: false, userInfo: { userRole: 0 } } as any}
      >
        <BottomTab {...props} />
      </AppContext.Provider>,
    );
  });
  return tree;
};

describe('BottomTab', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockHasAccess.mockReset();
  });

  it('marks the current route active and preserves subscription gating', () => {
    mockHasAccess.mockReturnValue(false);
    const tree = renderTab();

    expect(
      tree.root.findByProps({ accessibilityLabel: 'BIBLE' }).props
        .accessibilityState,
    ).toEqual({ selected: true });

    const lab = tree.root.findByProps({
      accessibilityLabel: 'LAB, subscription required',
    });
    act(() => lab.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(route.sower);
  });

  it('opens the Lab for subscribers and blocks guest-only destinations', () => {
    mockHasAccess.mockReturnValue(true);
    const onGuestTabPress = jest.fn();
    const subscriberTree = renderTab();
    const guestTree = renderTab({ isGuest: true, onGuestTabPress });

    act(() =>
      subscriberTree.root
        .findByProps({ accessibilityLabel: 'LAB' })
        .props.onPress(),
    );
    expect(mockNavigate).toHaveBeenCalledWith(route.studyBible);

    act(() =>
      guestTree.root
        .findByProps({ accessibilityLabel: 'HOME' })
        .props.onPress(),
    );
    expect(onGuestTabPress).toHaveBeenCalledTimes(1);
  });
});

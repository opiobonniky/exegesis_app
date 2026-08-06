import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BookOpen,
  House,
  NotebookTabs,
  NotebookText,
  Shield,
  User,
  Lightbulb,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import {
  isRtlLanguage,
  useLanguage,
} from '../language-translation/LanguageProvider';
import { useSubscription } from '../../hooks/useSubscription';
import { route } from './routes';
import { getActiveTabForRoute } from './tabMap';

interface BottomTabProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isGuest?: boolean;
  onGuestTabPress?: () => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
}

const BAR_BG = '#07162B';
const ACTIVE_TINT = '#00A7E8';
const INACTIVE_TINT = '#C5CEDC';
const ICON_SIZE = 24;
const CONTENT_HEIGHT = 62;

export default function BottomTab({
  activeTab: manualActiveTab,
  setActiveTab,
  isGuest = false,
  onGuestTabPress,
}: BottomTabProps) {
  const app = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const navigationState = useNavigationState(state => state);
  const { translations, language } = useLanguage();
  const { hasAccess } = useSubscription();

  if (!app) return null;

  const isAdmin = (app.userInfo?.userRole ?? 0) === 1;
  const isRtl = isRtlLanguage(language);
  const currentRouteName = navigationState?.routes[navigationState.index]?.name;
  const activeTab = getActiveTabForRoute(currentRouteName, manualActiveTab);

  const tabs: TabItem[] = isAdmin
    ? [
        {
          id: 'adminDashboard',
          label: translations?.bottomTab?.dashboard || 'DASHBOARD',
          icon: Shield,
          onPress: () => navigation.navigate(route.adminDashboard),
        },
        {
          id: 'adminUsers',
          label: translations?.bottomTab?.users || 'USERS',
          icon: User,
          onPress: () => navigation.navigate(route.adminUsers),
        },
        {
          id: 'adminVerse',
          label: translations?.bottomTab?.verse || 'VERSE',
          icon: BookOpen,
          onPress: () => navigation.navigate(route.adminDailyVerse),
        },
        {
          id: 'adminDevotion',
          label: translations?.bottomTab?.devotion || 'DEVOTION',
          icon: Lightbulb,
          onPress: () => navigation.navigate(route.adminDailyDevotion),
        },
      ]
    : [
        {
          id: 'home',
          label: translations?.bottomTab?.home || 'HOME',
          icon: House,
          onPress: () => navigation.navigate(route.home),
        },
        {
          id: 'bible',
          label: translations?.bottomTab?.bible || 'BIBLE',
          icon: BookOpen,
          onPress: () => navigation.navigate(route.bible),
        },
        {
          id: 'studyBible',
          label: translations?.bottomTab?.lab || 'LAB',
          icon: NotebookTabs,
          onPress: () =>
            hasAccess('legacy_sower')
              ? navigation.navigate(route.studyBible)
              : navigation.navigate(route.sower),
        },
        {
          id: 'ledger',
          label: translations?.bottomTab?.ledger || 'JOURNAL',
          icon: NotebookText,
          onPress: () =>
            hasAccess('legacy_sower')
              ? navigation.navigate(route.legacyLedger)
              : navigation.navigate(route.sower),
        },
      ];

  return (
    <View
      style={[
        styles.wrapper,
        {
          height: CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={[styles.tabRow, isRtl && styles.tabRowRtl]}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const tint = isActive ? ACTIVE_TINT : INACTIVE_TINT;
          const locked =
            !isAdmin &&
            (tab.id === 'studyBible' || tab.id === 'ledger') &&
            !hasAccess('legacy_sower');

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              activeOpacity={0.68}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label}${locked ? ', subscription required' : ''}`}
              onPress={() => {
                if (isGuest && tab.id !== 'bible') {
                  onGuestTabPress?.();
                  return;
                }
                setActiveTab?.(tab.id);
                tab.onPress();
              }}
            >
              <Icon
                size={ICON_SIZE}
                color={tint}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <Text
                style={[
                  styles.label,
                  { color: tint },
                  isActive && styles.activeLabel,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: BAR_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 14,
  },
  tabRow: {
    height: CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tabRowRtl: {
    flexDirection: 'row-reverse',
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 6,
  },
  label: {
    maxWidth: '92%',
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  activeLabel: {
    fontWeight: '800',
  },
});

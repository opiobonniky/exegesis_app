import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  Home,
  BookOpen,
  User,
  LucideUserCircle,
  ShieldIcon,
  BookText,
  Lightbulb,
  ListTodo,
  Bookmark,
  Beaker,
} from 'lucide-react-native';
import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  getColors,
} from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useLanguage, isRtlLanguage } from '../language-translation/LanguageProvider';
import { route } from './routes';

interface BottomTabProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isGuest?: boolean;
  onGuestTabPress?: () => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: any;
  onPress: () => void;
}

export default function BottomTab({
  activeTab: manualActiveTab,
  setActiveTab,
  isGuest = false,
  onGuestTabPress,
}: BottomTabProps) {
  const app = useContext(AppContext);
  if (!app) return null;

  const { isAdmin, userInfo } = app;
  const userRole = userInfo?.userRole || 0;
  const isUserAdmin = userRole === 1;

  const COLORS = useMemo(() => getColors(app.isDark), [app.isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const navigation = useNavigation<any>();
  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);

  // ── Sync with actual navigation state ──────────────────────────────
  const navigationState = useNavigationState(state => state);
  const currentRouteName = navigationState?.routes[navigationState.index]?.name;

  const activeTab = useMemo(() => {
    // Map route names to tab IDs
    const routeToTab: Record<string, string> = {
      [route.home]: 'home',
      [route.bible]: 'bible',
      [route.favorites]: 'favorites',
      [route.readingPlan]: 'Plan',
      [route.profile]: 'profile',
      [route.legacyLedger]: 'ledger',
      [route.ledgerDetail]: 'ledger',
      [route.ledgerEntry]: 'ledger',
      [route.journal]: 'journal',
      [route.lab]: 'lab',
      [route.labFlow]: 'lab',
      [route.adminDashboard]: 'adminDashboard',
      [route.adminUsers]: 'adminUsers',
      [route.adminDailyVerse]: 'adminVerse',
      [route.adminReadingPlans]: 'adminPlans',
      [route.adminJournalPrompts]: 'adminJournalPrompts',
      [route.adminJournalTemplates]: 'adminJournalTemplates',
    };

    const detectedTab = currentRouteName ? routeToTab[currentRouteName] : null;

    // If we detected a tab from the current route, use it!
    // This ensures back navigation works perfectly.
    if (detectedTab) return detectedTab;

    // Fallback to manual prop if navigation state is unavailable or doesn't match
    return manualActiveTab || '';
  }, [manualActiveTab, currentRouteName]);

  // Different tabs based on user role
  let tabs: TabItem[] = [];

if (isUserAdmin) {
    // ADMIN TABS - simplified to 4 main items
    tabs = [
      {
        id: 'adminDashboard',
        label: translations?.bottomTab?.dashboard || 'Dashboard',
        icon: ShieldIcon,
        onPress: () => navigation.navigate(route.adminDashboard),
      },
      {
        id: 'adminUsers',
        label: translations?.bottomTab?.users || 'Users',
        icon: User,
        onPress: () => navigation.navigate(route.adminUsers),
      },
      {
        id: 'adminVerse',
        label: translations?.bottomTab?.verse || 'Verse',
        icon: BookOpen,
        onPress: () => navigation.navigate(route.adminDailyVerse),
      },
      {
        id: 'adminDevotion',
        label: translations?.bottomTab?.devotion || 'Devotion',
        icon: Lightbulb,
        onPress: () => navigation.navigate(route.adminDailyDevotion),
      },
    ];
  } else {
    // REGULAR USER TABS
    tabs = [
      {
        id: 'home',
        label: translations?.bottomTab?.home || 'Home',
        icon: Home,
        onPress: () => navigation.navigate(route.home),
      },
      {
        id: 'bible',
        label: translations?.bottomTab?.bible || 'Bible',
        icon: BookOpen,
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'lab',
        label: translations?.bottomTab?.lab || 'Lab',
        icon: Beaker,
        onPress: () => navigation.navigate(route.lab),
      },
      {
        id: 'ledger',
        label: translations?.bottomTab?.ledger || 'Ledger',
        icon: BookText,
        onPress: () => navigation.navigate(route.legacyLedger),
      },
      
    ];
  }

  return (
    <View style={styles.container}>
      <View style={[styles.tabBar, isRtl && styles.tabBarRtl]}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => {
                // Guests can only stay on the Bible tab
                if (isGuest && tab.id !== 'bible') {
                  onGuestTabPress?.();
                  return;
                }
                if (setActiveTab) {
                  setActiveTab(tab.id);
                }
                tab.onPress();
              }}
            >
              <View style={styles.iconContainer}>
                {isActive && <View style={styles.activeIndicator} />}
                <Icon
                  size={24}
                  color={isActive ? COLORS.accent : COLORS.muted}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  isRtl && styles.tabLabelRtl,
                ]}
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

const createStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: COLORS.cardBackground,
      paddingBottom: Platform.OS === 'ios' ? 20 : 10,
      paddingTop: 10,
      paddingHorizontal: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    tabBarRtl: {
      flexDirection: 'row-reverse',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.xs,
    },
    iconContainer: {
      position: 'relative',
      marginBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeIndicator: {
      position: 'absolute',
      top: -10,
      width: 32,
      height: 3,
      backgroundColor: COLORS.accent,
      borderRadius: BORDER_RADIUS.sm,
    },
    tabLabel: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      fontWeight: '500',
    },
    tabLabelRtl: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    tabLabelActive: {
      color: COLORS.accent,
      fontWeight: '700',
    },
  });

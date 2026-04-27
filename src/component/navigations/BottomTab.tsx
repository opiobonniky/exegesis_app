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
  Heart,
  User,
  LucideUserCircle,
  CalendarClockIcon,
  StarsIcon,
  ShieldIcon,
  Settings,
} from 'lucide-react-native';
import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  getColors,
  createThemeStyles,
} from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useNavigation } from '@react-navigation/native';
import { route } from './routes';

interface BottomTabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  activeTab,
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

  // Different tabs based on user role
  let tabs: TabItem[] = [];
  
  if (isUserAdmin) {
    // ADMIN TABS - only admin-related screens
    tabs = [
      {
        id: 'adminDashboard',
        label: 'Dashboard',
        icon: ShieldIcon,
        onPress: () => navigation.navigate(route.adminDashboard),
      },
      {
        id: 'adminUsers',
        label: 'Users',
        icon: User,
        onPress: () => navigation.navigate(route.adminUsers),
      },
      {
        id: 'adminActivity',
        label: 'Activity',
        icon: ShieldIcon,
        onPress: () => navigation.navigate(route.adminActivity),
      },
      {
        id: 'adminVerse',
        label: 'Verse',
        icon: BookOpen,
        onPress: () => navigation.navigate(route.adminDailyVerse),
      },
      {
        id: 'adminPlans',
        label: 'Plans',
        icon: CalendarClockIcon,
        onPress: () => navigation.navigate(route.adminReadingPlans),
      },
    ];
  } else {
    // REGULAR USER TABS - user-related screens
    tabs = [
      {
        id: 'home',
        label: 'Home',
        icon: Home,
        onPress: () => navigation.navigate(route.home),
      },
      {
        id: 'bible',
        label: 'Bible',
        icon: BookOpen,
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'favorites',
        label: 'Favorites',
        icon: StarsIcon,
        onPress: () => navigation.navigate(route.favorites),
      },
      {
        id: 'Plan',
        label: 'Plan',
        icon: CalendarClockIcon,
        onPress: () => navigation.navigate(route.readingPlan),
      },
      {
        id: 'profile',
        label: 'Profile',
        icon: LucideUserCircle,
        onPress: () => navigation.navigate(route.profile),
      },
    ];
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
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
                setActiveTab(tab.id);
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
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
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
    tabLabelActive: {
      color: COLORS.accent,
      fontWeight: '700',
    },
  });

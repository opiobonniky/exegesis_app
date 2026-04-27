import React, {
  useEffect,
  useState,
  useCallback,
  useContext,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import {
  getAdminDashboardStats,
  DashboardStats,
} from '../../services/adminApi';
import { useAuth } from '../../hooks/useAuth';
import BottomTab from '../../component/navigations/BottomTab';
import { AppContext } from '../../common/AppContext';
import {
  ShieldIcon,
  Users,
  Activity,
  BookOpen,
  CalendarClock,
  Menu,
  X,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Bell,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

// ─── Theme ────────────────────────────────────────────────────────────────────
const lightTheme = {
  bg: '#f2efe9',
  surface: '#ffffff',
  surfaceAlt: '#f9f8f6',
  border: '#e8e2d9',
  text: '#1a1714',
  textSecondary: '#6b6560',
  textMuted: '#a09b94',
  accent: '#2a4d8f',
  accentLight: '#e8edf7',
  success: '#1a7a4a',
  successLight: '#e6f4ed',
  warning: '#c26a00',
  warningLight: '#fef3e2',
  purple: '#5c3d9e',
  purpleLight: '#eeebf8',
  cyan: '#0a7a8f',
  cyanLight: '#e3f4f7',
  drawerBg: '#1a1714',
  drawerText: '#f5f2ed',
  drawerMuted: '#8a8580',
  drawerActive: '#2a4d8f',
  drawerActiveBg: 'rgba(42,77,143,0.18)',
  shadow: '#000',
  cardShadow: 'rgba(0,0,0,0.06)',
  headerBadgeBg: '#fef3c7',
  headerBadgeText: '#92400e',
};

const darkTheme = {
  bg: '#0f0e0c',
  surface: '#1c1a17',
  surfaceAlt: '#252220',
  border: '#2e2b27',
  text: '#f0ece6',
  textSecondary: '#9e998f',
  textMuted: '#65605a',
  accent: '#5b83d4',
  accentLight: '#1a243d',
  success: '#34c77a',
  successLight: '#0d2a1c',
  warning: '#f0a540',
  warningLight: '#2a1e08',
  purple: '#9b72ef',
  purpleLight: '#1f1635',
  cyan: '#2db5cc',
  cyanLight: '#0d2530',
  drawerBg: '#0a0908',
  drawerText: '#f0ece6',
  drawerMuted: '#65605a',
  drawerActive: '#5b83d4',
  drawerActiveBg: 'rgba(91,131,212,0.15)',
  shadow: '#000',
  cardShadow: 'rgba(0,0,0,0.3)',
  headerBadgeBg: '#2a1e08',
  headerBadgeText: '#f0a540',
};

// ─── Drawer Nav Items ──────────────────────────────────────────────────────────
const drawerItems = [
  {
    id: 'adminDashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    routeKey: 'adminDashboard',
  },
  { id: 'adminUsers', label: 'Users', icon: Users, routeKey: 'adminUsers' },
  {
    id: 'adminActivity',
    label: 'Activity',
    icon: Activity,
    routeKey: 'adminActivity',
  },
  {
    id: 'adminVerse',
    label: 'Daily Verse',
    icon: BookOpen,
    routeKey: 'adminDailyVerse',
  },
  {
    id: 'adminPlans',
    label: 'Reading Plans',
    icon: CalendarClock,
    routeKey: 'adminReadingPlans',
  },
];

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  subtitle?: string;
  color: string;
  colorLight: string;
  onPress?: () => void;
  theme: typeof lightTheme;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  color,
  colorLight,
  onPress,
  theme,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  return (
    <Animated.View style={statStyles.wrapper}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          statStyles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={[statStyles.iconBadge, { backgroundColor: colorLight }]}>
          <Text style={[statStyles.valueText, { color }]}>
            {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()}
          </Text>
        </View>
        <Text style={[statStyles.label, { color: theme.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[statStyles.subtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
        {onPress && (
          <View
            style={[statStyles.arrowBadge, { backgroundColor: colorLight }]}
          >
            <ChevronRight size={12} color={color} strokeWidth={3} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const statStyles = StyleSheet.create({
  wrapper: {
    width: '48%',
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    height: 122, // Uniform height
  },
  iconBadge: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    minWidth: 42,
  },
  valueText: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 10.5,
    marginTop: 3,
    fontWeight: '400',
  },
  arrowBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Health Bar ────────────────────────────────────────────────────────────────
interface HealthBarProps {
  label: string;
  value: number;
  color: string;
  theme: typeof lightTheme;
}

const HealthBar: React.FC<HealthBarProps> = ({
  label,
  value,
  color,
  theme,
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: value,
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View style={healthStyles.item}>
      <View style={healthStyles.row}>
        <Text style={[healthStyles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
        <Text style={[healthStyles.value, { color: theme.text }]}>
          {value}%
        </Text>
      </View>
      <View style={[healthStyles.track, { backgroundColor: theme.surfaceAlt }]}>
        <Animated.View
          style={[
            healthStyles.fill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const healthStyles = StyleSheet.create({
  item: { marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 13, fontWeight: '700' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

// ─── Quick Action ──────────────────────────────────────────────────────────────
interface QuickActionProps {
  icon: string;
  label: string;
  color: string;
  colorLight: string;
  onPress: () => void;
  theme: typeof lightTheme;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  label,
  color,
  colorLight,
  onPress,
  theme,
}) => (
  <TouchableOpacity
    style={[
      qaStyles.card,
      { backgroundColor: theme.surface, borderColor: theme.border },
    ]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={[qaStyles.iconWrap, { backgroundColor: colorLight }]}>
      <Text style={qaStyles.icon}>{icon}</Text>
    </View>
    <Text style={[qaStyles.label, { color: theme.text }]}>{label}</Text>
    <ChevronRight size={13} color={theme.textMuted} style={{ marginTop: 4 }} />
  </TouchableOpacity>
);

const qaStyles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    height: 122, // Same height as stat cards
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: { fontSize: 23 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});

// ─── Drawer Component (unchanged) ─────────────────────────────────────────────
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: string;
  onNavigate: (routeKey: string, id: string) => void;
  onLogout: () => void;
  theme: typeof lightTheme;
  userInfo: any;
  translateX: Animated.Value;
  overlayOpacity: Animated.Value;
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  activeItem,
  onNavigate,
  onLogout,
  theme,
  userInfo,
  translateX,
  overlayOpacity,
}) => {
  if (!isOpen) return null;

  const initials = userInfo
    ? `${(userInfo.firstName || '')[0] || ''}${(userInfo.lastName || '')[0] || ''}`.toUpperCase() ||
      'A'
    : 'A';

  return (
    <View style={drawerStyles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[drawerStyles.backdrop, { opacity: overlayOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          drawerStyles.panel,
          {
            backgroundColor: theme.drawerBg,
            width: DRAWER_WIDTH,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Drawer Header */}
        <View style={drawerStyles.drawerHeader}>
          <View
            style={[
              drawerStyles.avatar,
              { backgroundColor: theme.drawerActive },
            ]}
          >
            <Text style={drawerStyles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[drawerStyles.drawerName, { color: theme.drawerText }]}
            >
              {userInfo?.firstName
                ? `${userInfo.firstName} ${userInfo.lastName || ''}`
                : userInfo?.username || 'Admin'}
            </Text>
            <View style={drawerStyles.roleBadge}>
              <ShieldIcon size={10} color="#fff" strokeWidth={2.5} />
              <Text style={drawerStyles.roleBadgeText}>Super Admin</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={drawerStyles.closeBtn}>
            <X size={20} color={theme.drawerMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View
          style={[drawerStyles.divider, { backgroundColor: theme.border }]}
        />

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Text style={[drawerStyles.navSection, { color: theme.drawerMuted }]}>
            NAVIGATION
          </Text>
          {drawerItems.map(item => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  drawerStyles.navItem,
                  isActive && {
                    backgroundColor: theme.drawerActiveBg,
                    borderLeftColor: theme.drawerActive,
                  },
                ]}
                onPress={() => onNavigate(item.routeKey, item.id)}
                activeOpacity={0.7}
              >
                <Icon
                  size={20}
                  color={isActive ? theme.drawerActive : theme.drawerMuted}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <Text
                  style={[
                    drawerStyles.navLabel,
                    {
                      color: isActive ? theme.drawerText : theme.drawerMuted,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {isActive && (
                  <View
                    style={[
                      drawerStyles.activeDot,
                      { backgroundColor: theme.drawerActive },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          <View
            style={[
              drawerStyles.divider,
              { backgroundColor: theme.border, marginVertical: 16 },
            ]}
          />

          <Text style={[drawerStyles.navSection, { color: theme.drawerMuted }]}>
            ACCOUNT
          </Text>
          <TouchableOpacity style={drawerStyles.navItem} activeOpacity={0.7}>
            <Bell size={20} color={theme.drawerMuted} strokeWidth={1.8} />
            <Text style={[drawerStyles.navLabel, { color: theme.drawerMuted }]}>
              Notifications
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[drawerStyles.navItem, drawerStyles.logoutItem]}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color="#e05555" strokeWidth={1.8} />
            <Text style={[drawerStyles.navLabel, { color: '#e05555' }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View
          style={[drawerStyles.drawerFooter, { borderTopColor: theme.border }]}
        >
          <Text style={[drawerStyles.footerText, { color: theme.drawerMuted }]}>
            Admin Console v1.0
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const drawerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    height: '100%',
    paddingTop:
      Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  drawerName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0392b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  navSection: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 12,
    marginBottom: 2,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 14,
  },
  navLabel: {
    fontSize: 14,
    flex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logoutItem: {
    marginTop: 4,
  },
  drawerFooter: {
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { userInfo, logout } = useAuth();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = isDark ? darkTheme : lightTheme;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('adminDashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [drawerMounted, setDrawerMounted] = useState(false);

  const openDrawer = useCallback(() => {
    setDrawerMounted(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 180,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(true));
  }, []);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: -DRAWER_WIDTH,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerOpen(false);
      setDrawerMounted(false);
    });
  }, []);

  const handleDrawerNavigate = useCallback(
    (routeKey: string, id: string) => {
      setActiveTab(id);
      closeDrawer();
      setTimeout(() => navigation.navigate((route as any)[routeKey]), 300);
    },
    [navigation, closeDrawer],
  );

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  const initials = userInfo
    ? `${(userInfo.firstName || '')[0] || ''}${(userInfo.lastName || '')[0] || ''}`.toUpperCase() ||
      'A'
    : 'A';

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      {/* Top Header Bar */}
      <View
        style={[
          s.topBar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            paddingTop:
              Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 10,
          },
        ]}
      >
        <TouchableOpacity
          onPress={openDrawer}
          style={s.menuBtn}
          activeOpacity={0.7}
        >
          <Menu size={22} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={s.topBarCenter}>
          <Text style={[s.topBarTitle, { color: theme.text }]}>Dashboard</Text>
        </View>
        <TouchableOpacity style={s.avatarBtn} activeOpacity={0.7}>
          <View style={[s.avatarSmall, { backgroundColor: theme.accent }]}>
            <Text style={s.avatarSmallText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {/* Hero Card */}
        <View style={[s.heroCard, { backgroundColor: theme.accent }]}>
          <View>
            <Text style={s.heroGreeting}>
              {userInfo?.firstName
                ? `Hey, ${userInfo.firstName} 👋`
                : 'Welcome back 👋'}
            </Text>
            <Text style={s.heroSub}>{today}</Text>
          </View>
          <View style={s.heroBadge}>
            <ShieldIcon size={18} color="#fff" strokeWidth={2.5} />
            <Text style={s.heroBadgeText}>Admin</Text>
          </View>
        </View>

        {/* User Statistics */}
        <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>
          User Statistics
        </Text>
        <View style={s.grid}>
          <StatCard
            label="Total Users"
            value={stats?.totalUsers || 0}
            subtitle={`${stats?.newUsersThisMonth || 0} new this month`}
            color={theme.accent}
            colorLight={theme.accentLight}
            onPress={() => navigation.navigate(route.adminUsers)}
            theme={theme}
          />
          <StatCard
            label="Active"
            value={stats?.activeUsers || 0}
            subtitle={`${stats?.inactiveUsers || 0} inactive`}
            color={theme.success}
            colorLight={theme.successLight}
            theme={theme}
          />
          <StatCard
            label="Verified"
            value={stats?.verifiedUsers || 0}
            subtitle={`${stats?.unverifiedUsers || 0} pending`}
            color={theme.cyan}
            colorLight={theme.cyanLight}
            theme={theme}
          />
          <StatCard
            label="Enrollments"
            value={stats?.totalEnrollments || 0}
            subtitle={`${stats?.completedEnrollments || 0} completed`}
            color={theme.purple}
            colorLight={theme.purpleLight}
            theme={theme}
          />
        </View>

        {/* Role Breakdown */}
        <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>
          Role Breakdown
        </Text>
        <View style={s.grid}>
          <StatCard
            label="Admins"
            value={stats?.adminCount || 0}
            color={theme.purple}
            colorLight={theme.purpleLight}
            theme={theme}
          />
          <StatCard
            label="Members"
            value={stats?.memberCount || 0}
            color={theme.cyan}
            colorLight={theme.cyanLight}
            theme={theme}
          />
          <StatCard
            label="Reading Plans"
            value={stats?.totalPlans || 0}
            subtitle={`${stats?.activePlans || 0} active`}
            color={theme.success}
            colorLight={theme.successLight}
            theme={theme}
          />
          <StatCard
            label="New This Month"
            value={stats?.newUsersThisMonth || 0}
            color={theme.warning}
            colorLight={theme.warningLight}
            theme={theme}
          />
        </View>

        {/* Platform Health */}
        <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>
          Platform Health
        </Text>
        <View
          style={[
            s.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <HealthBar
            label="Active User Rate"
            value={stats?.activeRate || 0}
            color={theme.success}
            theme={theme}
          />
          <HealthBar
            label="Email Verification"
            value={stats?.verificationRate || 0}
            color={theme.cyan}
            theme={theme}
          />
          <HealthBar
            label="Plan Completion"
            value={stats?.completionRate || 0}
            color={theme.purple}
            theme={theme}
          />
        </View>

        {/* Quick Actions */}
        <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>
          Quick Actions
        </Text>
        <View style={s.grid}>
          <QuickAction
            icon="👥"
            label="Manage Users"
            color={theme.accent}
            colorLight={theme.accentLight}
            onPress={() => navigation.navigate(route.adminUsers)}
            theme={theme}
          />
          <QuickAction
            icon="📊"
            label="View Activity"
            color={theme.success}
            colorLight={theme.successLight}
            onPress={() => navigation.navigate(route.adminActivity)}
            theme={theme}
          />
          <QuickAction
            icon="📖"
            label="Daily Verse"
            color={theme.cyan}
            colorLight={theme.cyanLight}
            onPress={() => navigation.navigate(route.adminDailyVerse)}
            theme={theme}
          />
          <QuickAction
            icon="📚"
            label="Reading Plans"
            color={theme.purple}
            colorLight={theme.purpleLight}
            onPress={() => navigation.navigate(route.adminReadingPlans)}
            theme={theme}
          />
        </View>

        <View style={s.bottomSpacer} />
      </ScrollView>

      {/* Bottom Tab */}
      <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Drawer */}
      {drawerMounted && (
        <Drawer
          isOpen={drawerOpen}
          onClose={closeDrawer}
          activeItem={activeTab}
          onNavigate={handleDrawerNavigate}
          onLogout={async () => {
            closeDrawer();
            setTimeout(() => logout?.(), 300);
          }}
          theme={theme}
          userInfo={userInfo}
          translateX={translateX}
          overlayOpacity={overlayOpacity}
        />
      )}
    </View>
  );
};

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heroGreeting: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bottomSpacer: {
    height: 30,
  },
});

export default AdminDashboard;

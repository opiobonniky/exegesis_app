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
import { getColors } from '../../constants/theme';
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
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Clock,
  UserPlus,
} from 'lucide-react-native';
import { route } from '../../component/navigations/routes';
import useAuth from '../../hooks/useAuth';
import { AppContext } from '../../common/AppContext';
import {
  DashboardStats,
  getAdminDashboardStats,
} from '../../services/adminApi';
import BottomTab from '../../component/navigations/BottomTab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

const getDashboardTheme = (isDark: boolean) => {
  const colors = getColors(isDark);
  return {
    bg: colors.background,
    surface: colors.surface,
    surfaceAlt: colors.cardBackground,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.muted,
    accent: colors.primary,
    accentLight: colors.primaryLight || `${colors.primary}33`,
    success: colors.success,
    successLight: `${colors.success}33`,
    warning: colors.warning,
    warningLight: `${colors.warning}33`,
    purple: '#5c3d9e',
    purpleLight: '#eeebf8',
    cyan: colors.info,
    cyanLight: `${colors.info}33`,
    drawerBg: colors.surface,
    drawerText: colors.text,
    drawerMuted: colors.muted,
    drawerActive: colors.primary,
    drawerActiveBg: colors.selectedItem,
    shadow: colors.shadowColor,
  };
};

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

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  trend?: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = ({ label, value, trend, color, bgColor, icon }) => {
  return (
    <View style={[kpiStyles.card, { backgroundColor: bgColor }]}>
      <View style={kpiStyles.kpiHeader}>
        <View style={[kpiStyles.iconWrap, { backgroundColor: color }]}>
          {icon}
        </View>
        {trend !== undefined && (
          <View
            style={[
              kpiStyles.trendBadge,
              { backgroundColor: trend >= 0 ? '#22c55e' : '#ef4444' },
            ]}
          >
            {trend >= 0 ? (
              <TrendingUp size={10} color="#fff" />
            ) : (
              <TrendingDown size={10} color="#fff" />
            )}
            <Text style={kpiStyles.trendText}>{Math.abs(trend)}%</Text>
          </View>
        )}
      </View>
      <Text style={[kpiStyles.kpiValue, { color }]}>{value}</Text>
      <Text style={kpiStyles.kpiLabel}>{label}</Text>
    </View>
  );
};

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 6,
    marginBottom: 12,
    minHeight: 140,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
});

const StatBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
}> = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={barStyles.container}>
      <View style={barStyles.header}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.value, { color }]}>
          {value.toLocaleString()}
          <Text style={barStyles.total}>/{total.toLocaleString()}</Text>
        </Text>
      </View>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
  total: {
    fontWeight: '400',
    opacity: 0.6,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

const CircleChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  size?: number;
}> = ({ data, size = 120 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;

  return (
    <View style={[chartStyles.circleContainer, { width: size, height: size }]}>
      <View
        style={[
          chartStyles.circleOuter,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const prevCumulative = cumulative;
          cumulative += percentage;
          return (
            <View
              key={index}
              style={[
                chartStyles.segment,
                {
                  width: size / 2,
                  backgroundColor: item.color,
                  transform: [
                    { rotate: `${prevCumulative * 3.6 - 90}deg` },
                    { translateX: size / 4 },
                  ],
                  borderRadius: percentage > 50 ? size / 4 : 0,
                },
              ]}
            />
          );
        })}
        <View
          style={[
            chartStyles.circleInner,
            {
              width: size - 40,
              height: size - 40,
              borderRadius: (size - 40) / 2,
            },
          ]}
        >
          <Text style={chartStyles.circleTotal}>{total}</Text>
          <Text style={chartStyles.circleLabel}>Total</Text>
        </View>
      </View>
    </View>
  );
};

const chartStyles = StyleSheet.create({
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOuter: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    height: '50%',
    transformOrigin: 'left center',
  },
  circleInner: {
    position: 'absolute',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTotal: {
    fontSize: 22,
    fontWeight: '800',
  },
  circleLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
});

const QuickAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  color: string;
  onPress: () => void;
}> = ({ icon, label, subtitle, color, onPress }) => (
  <TouchableOpacity
    style={[actionStyles.card, { borderLeftColor: color }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={[actionStyles.iconWrap, { backgroundColor: `${color}15` }]}>
      {icon}
    </View>
    <View style={actionStyles.content}>
      <Text style={actionStyles.label}>{label}</Text>
      {subtitle && <Text style={actionStyles.subtitle}>{subtitle}</Text>}
    </View>
    <ChevronRight size={18} color="#9ca3af" />
  </TouchableOpacity>
);

const actionStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
});

const Drawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeItem: string;
  onNavigate: (routeKey: string, id: string) => void;
  onLogout: () => void;
  theme: any;
  userInfo: any;
  translateX: Animated.Value;
  overlayOpacity: Animated.Value;
}> = ({
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
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  drawerName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
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
  divider: { height: 1, marginHorizontal: 16 },
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
  navLabel: { fontSize: 14, flex: 1 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  logoutItem: { marginTop: 4 },
  drawerFooter: {
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  footerText: { fontSize: 11, fontWeight: '500' },
});

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { userInfo, logout } = useAuth();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = getDashboardTheme(isDark);

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

  const roleData = useMemo(
    () => [
      { label: 'Admins', value: stats?.adminCount || 0, color: '#8b5cf6' },
      { label: 'Members', value: stats?.memberCount || 0, color: '#06b6d4' },
    ],
    [stats],
  );

  const userStatusData = useMemo(
    () => [
      { label: 'Active', value: stats?.activeUsers || 0, color: '#22c55e' },
      { label: 'Inactive', value: stats?.inactiveUsers || 0, color: '#f59e0b' },
    ],
    [stats],
  );

  return (
    <View style={[rootStyles.root, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      <View
        style={[
          rootStyles.topBar,
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
          style={rootStyles.menuBtn}
          activeOpacity={0.7}
        >
          <Menu size={22} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={rootStyles.topBarCenter}>
          <Text style={[rootStyles.topBarTitle, { color: theme.text }]}>
            Analytics
          </Text>
        </View>
        <TouchableOpacity style={rootStyles.avatarBtn} activeOpacity={0.7}>
          <View
            style={[rootStyles.avatarSmall, { backgroundColor: theme.accent }]}
          >
            <Text style={rootStyles.avatarSmallText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={rootStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        <View style={[rootStyles.heroCard, { backgroundColor: theme.accent }]}>
          <View>
            <Text style={rootStyles.heroGreeting}>
              {userInfo?.firstName
                ? `Hey, ${userInfo.firstName}`
                : 'Welcome back'}
            </Text>
            <Text style={rootStyles.heroSub}>{today}</Text>
          </View>
          <View style={rootStyles.heroBadge}>
            <ShieldIcon size={16} color="#fff" strokeWidth={2.5} />
            <Text style={rootStyles.heroBadgeText}>Admin</Text>
          </View>
        </View>

        <View style={rootStyles.kpiGrid}>
          <KpiCard
            label="Total Users"
            value={stats?.totalUsers || 0}
            trend={12}
            color="#fff"
            bgColor="#6366f1"
            icon={<Users size={18} color="#6366f1" />}
          />
          <KpiCard
            label="Active"
            value={stats?.activeUsers || 0}
            trend={5}
            color="#fff"
            bgColor="#22c55e"
            icon={<CheckCircle size={18} color="#22c55e" />}
          />
          <KpiCard
            label="Plans"
            value={stats?.totalPlans || 0}
            trend={-2}
            color="#fff"
            bgColor="#8b5cf6"
            icon={<BookOpen size={18} color="#8b5cf6" />}
          />
          <KpiCard
            label="Enrolled"
            value={stats?.totalEnrollments || 0}
            trend={8}
            color="#fff"
            bgColor="#06b6d4"
            icon={<Activity size={18} color="#06b6d4" />}
          />
        </View>

        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[rootStyles.sectionTitle, { color: theme.text }]}>
            User Overview
          </Text>
          <View style={rootStyles.overviewRow}>
            <View style={rootStyles.barsContainer}>
              <StatBar
                label="Active Users"
                value={stats?.activeUsers || 0}
                total={stats?.totalUsers || 1}
                color="#22c55e"
              />
              <StatBar
                label="Verified"
                value={stats?.verifiedUsers || 0}
                total={stats?.totalUsers || 1}
                color="#06b6d4"
              />
              <StatBar
                label="Inactive"
                value={stats?.inactiveUsers || 0}
                total={stats?.totalUsers || 1}
                color="#f59e0b"
              />
            </View>
          </View>
        </View>

        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[rootStyles.sectionTitle, { color: theme.text }]}>
            Role Distribution
          </Text>
          <View style={rootStyles.distributionRow}>
            <CircleChart data={roleData} size={110} />
            <View style={rootStyles.legendContainer}>
              {roleData.map((item, index) => (
                <View key={index} style={rootStyles.legendItem}>
                  <View
                    style={[
                      rootStyles.legendDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={rootStyles.legendLabel}>{item.label}</Text>
                  <Text style={rootStyles.legendValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[rootStyles.sectionTitle, { color: theme.text }]}>
            Platform Health
          </Text>
          <View style={rootStyles.healthGrid}>
            <View style={rootStyles.healthItem}>
              <View style={rootStyles.healthHeader}>
                <Text style={[rootStyles.healthLabel, { color: theme.text }]}>
                  Active Rate
                </Text>
                <Text
                  style={[
                    rootStyles.healthValuePill,
                    { color: '#22c55e', backgroundColor: '#22c55e20' },
                  ]}
                >
                  {stats?.activeRate || 0}%
                </Text>
              </View>
              <View
                style={[
                  rootStyles.healthTrack,
                  { backgroundColor: theme.border },
                ]}
              >
                <View
                  style={[
                    rootStyles.healthFill,
                    {
                      width: `${stats?.activeRate || 0}%`,
                      backgroundColor: '#22c55e',
                    },
                  ]}
                />
              </View>
            </View>
            <View style={rootStyles.healthItem}>
              <View style={rootStyles.healthHeader}>
                <Text style={[rootStyles.healthLabel, { color: theme.text }]}>
                  Verified
                </Text>
                <Text
                  style={[
                    rootStyles.healthValuePill,
                    { color: '#06b6d4', backgroundColor: '#06b6d420' },
                  ]}
                >
                  {stats?.verificationRate || 0}%
                </Text>
              </View>
              <View
                style={[
                  rootStyles.healthTrack,
                  { backgroundColor: theme.border },
                ]}
              >
                <View
                  style={[
                    rootStyles.healthFill,
                    {
                      width: `${stats?.verificationRate || 0}%`,
                      backgroundColor: '#06b6d4',
                    },
                  ]}
                />
              </View>
            </View>
            <View style={rootStyles.healthItem}>
              <View style={rootStyles.healthHeader}>
                <Text style={[rootStyles.healthLabel, { color: theme.text }]}>
                  Completion
                </Text>
                <Text
                  style={[
                    rootStyles.healthValuePill,
                    { color: '#8b5cf6', backgroundColor: '#8b5cf620' },
                  ]}
                >
                  {stats?.completionRate || 0}%
                </Text>
              </View>
              <View
                style={[
                  rootStyles.healthTrack,
                  { backgroundColor: theme.border },
                ]}
              >
                <View
                  style={[
                    rootStyles.healthFill,
                    {
                      width: `${stats?.completionRate || 0}%`,
                      backgroundColor: '#8b5cf6',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[rootStyles.sectionTitle, { color: theme.text }]}>
            Quick Actions
          </Text>
          <QuickAction
            icon={<Users size={20} color="#6366f1" />}
            label="Manage Users"
            subtitle="View & edit users"
            color="#6366f1"
            onPress={() => navigation.navigate(route.adminUsers)}
          />
          <QuickAction
            icon={<Activity size={20} color="#22c55e" />}
            label="View Activity"
            subtitle="Login sessions & events"
            color="#22c55e"
            onPress={() => navigation.navigate(route.adminActivity)}
          />
          <QuickAction
            icon={<BookOpen size={20} color="#06b6d4" />}
            label="Daily Verse"
            subtitle="Manage daily verses"
            color="#06b6d4"
            onPress={() => navigation.navigate(route.adminDailyVerse)}
          />
          <QuickAction
            icon={<CalendarClock size={20} color="#8b5cf6" />}
            label="Reading Plans"
            subtitle="Manage plans"
            color="#8b5cf6"
            onPress={() => navigation.navigate(route.adminReadingPlans)}
          />
        </View>

        <View style={rootStyles.bottomSpacer} />
      </ScrollView>

      <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />

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

const rootStyles = StyleSheet.create({
  root: { flex: 1 },
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
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
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
  avatarSmallText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scrollContent: { paddingBottom: 80, paddingTop: 8, paddingHorizontal: 16 },
  heroCard: {
    borderRadius: 22,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  heroGreeting: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    marginHorizontal: -6,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  barsContainer: { flex: 1 },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  legendContainer: { flex: 1, marginLeft: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  legendValue: { fontSize: 13, fontWeight: '700' },
  healthGrid: { gap: 18 },
  healthItem: { marginBottom: 4 },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthLabel: { fontSize: 13, fontWeight: '500' },
  healthValue: { fontSize: 13, fontWeight: '700' },
  healthValuePill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  healthTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: 5 },
  bottomSpacer: { height: 34 },
});

export default AdminDashboard;

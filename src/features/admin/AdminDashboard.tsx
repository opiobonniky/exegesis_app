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
  Switch,
  Modal,
  FlatList,
  ActivityIndicator,
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
  ChevronLeft,
  LogOut,
  LayoutDashboard,
  Bell,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  BookText,
  LayoutTemplate,
  Lightbulb,
  Globe,
  Settings,
  ChevronDown,
} from 'lucide-react-native';
import { route } from '../../component/navigations/routes';
import useAuth from '../../hooks/useAuth';
import { AppContext } from '../../common/AppContext';
import {
  DashboardStats,
  getAdminDashboardStats,
  getSiteSetting,
  setSiteSetting,
} from '../../services/adminApi';
import { bibleApi } from '../../services/bibleApi';
import BottomTab from '../../component/navigations/BottomTab';
import { useLanguage } from '../../component/language-translation/LanguageProvider';
import { AdminTranslations, Language } from '../../component/language-translation/type';
import { isRtlLanguage, getLocale } from '../../component/language-translation/localeUtils';
import LanguagePickerModal, { FLAGS, NATIVE_NAMES } from '../../component/LanguagePickerModal';

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

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  trend?: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  isRtl?: boolean;
}> = ({ label, value, trend, color, bgColor, icon, isRtl }) => {
  return (
    <View style={[kpiStyles.card, { backgroundColor: bgColor }]}>
      <View style={[kpiStyles.kpiHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
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
      <Text style={[kpiStyles.kpiValue, { color, textAlign: isRtl ? 'right' : 'left' }]}>{value}</Text>
      <Text style={[kpiStyles.kpiLabel, { textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
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
  isRtl?: boolean;
}> = ({ label, value, total, color, isRtl }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={barStyles.container}>
      <View style={[barStyles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Text style={[barStyles.label, { textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
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
  totalLabel?: string;
}> = ({ data, size = 120, totalLabel }) => {
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
          <Text style={chartStyles.circleLabel}>{totalLabel || 'Total'}</Text>
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
  isRtl?: boolean;
}> = ({ icon, label, subtitle, color, onPress, isRtl }) => (
  <TouchableOpacity
    style={[
      actionStyles.card,
      { flexDirection: isRtl ? 'row-reverse' : 'row', borderLeftColor: isRtl ? undefined : color, borderRightColor: isRtl ? color : undefined, borderLeftWidth: isRtl ? 0 : 4, borderRightWidth: isRtl ? 4 : 0 },
    ]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={[actionStyles.iconWrap, { backgroundColor: `${color}15`, marginRight: isRtl ? 0 : 14, marginLeft: isRtl ? 14 : 0 }]}>
      {icon}
    </View>
    <View style={actionStyles.content}>
      <Text style={[actionStyles.label, { textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
      {subtitle && <Text style={[actionStyles.subtitle, { textAlign: isRtl ? 'right' : 'left' }]}>{subtitle}</Text>}
    </View>
    {isRtl ? <ChevronLeft size={18} color="#9ca3af" /> : <ChevronRight size={18} color="#9ca3af" />}
  </TouchableOpacity>
);

const actionStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  isRtl: boolean;
  ac?: AdminTranslations;
  currentLanguage?: Language;
  onLanguagePress?: () => void;
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
  isRtl,
  ac,
  currentLanguage,
  onLanguagePress,
}) => {
  if (!isOpen) return null;

  const initials = userInfo
    ? `${(userInfo.firstName || '')[0] || ''}${(userInfo.lastName || '')[0] || ''}`.toUpperCase() ||
      'A'
    : 'A';

  const drawerItems = [
    {
      id: 'adminDashboard',
      label: ac?.dashboard || 'Dashboard',
      icon: LayoutDashboard,
      routeKey: 'adminDashboard',
    },
    { id: 'adminUsers', label: ac?.users || 'Users', icon: Users, routeKey: 'adminUsers' },
    {
      id: 'adminVerse',
      label: ac?.dailyVerseLabel || 'Daily Verse',
      icon: BookOpen,
      routeKey: 'adminDailyVerse',
    },
    {
      id: 'adminDevotion',
      label: ac?.dailyDevotionLabel || 'Daily Devotion',
      icon: Lightbulb,
      routeKey: 'adminDailyDevotion',
    },
    {
      id: 'adminPlans',
      label: ac?.readingPlansLabel || 'Reading Plans',
      icon: CalendarClock,
      routeKey: 'adminReadingPlans',
    },
    {
      id: 'adminJournalPrompts',
      label: ac?.journalPromptsLabel || 'Journal Prompts',
      icon: BookText,
      routeKey: 'adminJournalPrompts',
    },
    {
      id: 'adminJournalTemplates',
      label: ac?.journalTemplatesLabel || 'Journal Templates',
      icon: LayoutTemplate,
      routeKey: 'adminJournalTemplates',
    },
    {
      id: 'adminActivity',
      label: ac?.activity || 'Activity',
      icon: Activity,
      routeKey: 'adminActivity',
    },
  ];

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
            ...(isRtl ? { right: 0 } : { left: 0 }),
          },
        ]}
      >
        <View style={[drawerStyles.drawerHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              drawerStyles.avatar,
              { backgroundColor: theme.drawerActive },
            ]}
          >
            <Text style={drawerStyles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, ...(isRtl ? { marginRight: 12 } : { marginLeft: 12 }) }}>
            <Text
              style={[drawerStyles.drawerName, { color: theme.drawerText, textAlign: isRtl ? 'right' : 'left' }]}
            >
              {userInfo?.firstName
                ? `${userInfo.firstName} ${userInfo.lastName || ''}`
                : userInfo?.username || 'Admin'}
            </Text>
            <View style={[drawerStyles.roleBadge, { alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
              <ShieldIcon size={10} color="#fff" strokeWidth={2.5} />
              <Text style={drawerStyles.roleBadgeText}>{ac?.superAdminBadge || 'Super Admin'}</Text>
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
          <Text style={[drawerStyles.navSection, { color: theme.drawerMuted, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.navigationSection || 'NAVIGATION'}
          </Text>
          {drawerItems.map(item => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  drawerStyles.navItem,
                  {
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                    borderLeftWidth: isRtl ? 0 : 3,
                    borderRightWidth: isRtl ? 3 : 0,
                    borderLeftColor: isActive && !isRtl ? theme.drawerActive : 'transparent',
                    borderRightColor: isActive && isRtl ? theme.drawerActive : 'transparent',
                  },
                  isActive && { backgroundColor: theme.drawerActiveBg },
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
                      textAlign: isRtl ? 'right' : 'left',
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
          <Text style={[drawerStyles.navSection, { color: theme.drawerMuted, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.accountSection || 'ACCOUNT'}
          </Text>
          <TouchableOpacity
            style={[drawerStyles.navItem, { flexDirection: isRtl ? 'row-reverse' : 'row', borderLeftWidth: isRtl ? 0 : 3, borderRightWidth: isRtl ? 3 : 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' }]}
            activeOpacity={0.7}
          >
            <Bell size={20} color={theme.drawerMuted} strokeWidth={1.8} />
            <Text style={[drawerStyles.navLabel, { color: theme.drawerMuted, textAlign: isRtl ? 'right' : 'left' }]}>
              {ac?.notifications || 'Notifications'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[drawerStyles.navItem, { flexDirection: isRtl ? 'row-reverse' : 'row', borderLeftWidth: isRtl ? 0 : 3, borderRightWidth: isRtl ? 3 : 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' }]}
            onPress={onLanguagePress}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginRight: isRtl ? 0 : 8, marginLeft: isRtl ? 8 : 0 }}>
              {currentLanguage ? FLAGS[currentLanguage] : '🌐'}
            </Text>
            <Text style={[drawerStyles.navLabel, { color: theme.drawerText, textAlign: isRtl ? 'right' : 'left' }]}>
              {currentLanguage ? NATIVE_NAMES[currentLanguage] : 'Language'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[drawerStyles.navItem, drawerStyles.logoutItem, { flexDirection: isRtl ? 'row-reverse' : 'row', borderLeftWidth: isRtl ? 0 : 3, borderRightWidth: isRtl ? 3 : 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' }]}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color="#e05555" strokeWidth={1.8} />
            <Text style={[drawerStyles.navLabel, { color: '#e05555', textAlign: isRtl ? 'right' : 'left' }]}>
              {ac?.signOut || 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <View
          style={[drawerStyles.drawerFooter, { borderTopColor: theme.border }]}
        >
          <Text style={[drawerStyles.footerText, { color: theme.drawerMuted, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.adminConsole || 'Admin Console v1.0'}
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
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 12,
    marginBottom: 2,
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
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const ac = translations?.admin;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [freeTranslationsOnly, setFreeTranslationsOnly] = useState(false);
  const [defaultTranslationId, setDefaultTranslationId] = useState('Berean');
  const [translationOptions, setTranslationOptions] = useState<{ id: string; name: string }[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('adminDashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [translationPickerVisible, setTranslationPickerVisible] = useState(false);

  const translateX = useRef(new Animated.Value(isRtl ? DRAWER_WIDTH : -DRAWER_WIDTH)).current;
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
        toValue: isRtl ? DRAWER_WIDTH : -DRAWER_WIDTH,
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
  }, [isRtl]);

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

  const loadSettings = useCallback(async () => {
    try {
      const [freeVal, defaultVal] = await Promise.all([
        getSiteSetting('freeTranslationsOnly'),
        getSiteSetting('defaultTranslationId'),
      ]);
      setFreeTranslationsOnly(freeVal === 'true');
      setDefaultTranslationId(defaultVal || 'Berean');
    } catch (error) {
      console.error('Failed to load site settings:', error);
    }
  }, []);

  const loadTranslationOptions = useCallback(async () => {
    try {
      const list = await bibleApi.getAvailableTranslationsWithMapping();
      setTranslationOptions(list.map((t: any) => ({ id: t.frontendId, name: t.name })));
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, []);

  const handleToggleFreeTranslations = async (checked: boolean) => {
    setSettingsLoading(true);
    try {
      await setSiteSetting('freeTranslationsOnly', String(checked));
      setFreeTranslationsOnly(checked);
    } catch (error) {
      console.error('Failed to save setting:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangeDefaultTranslation = async (id: string) => {
    setSettingsLoading(true);
    try {
      await setSiteSetting('defaultTranslationId', id);
      setDefaultTranslationId(id);
    } catch (error) {
      console.error('Failed to save default translation:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    loadSettings();
    loadTranslationOptions();
  }, [fetchStats, loadSettings, loadTranslationOptions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(getLocale(language), {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [language],
  );

  const initials = userInfo
    ? `${(userInfo.firstName || '')[0] || ''}${(userInfo.lastName || '')[0] || ''}`.toUpperCase() ||
      'A'
    : 'A';

  const roleData = useMemo(
    () => [
      { label: ac?.admins || 'Admins', value: stats?.adminCount || 0, color: '#8b5cf6' },
      { label: ac?.members || 'Members', value: stats?.memberCount || 0, color: '#06b6d4' },
    ],
    [stats, ac],
  );

  const userStatusData = useMemo(
    () => [
      { label: ac?.activeKpi || 'Active', value: stats?.activeUsers || 0, color: '#22c55e' },
      { label: ac?.inactive || 'Inactive', value: stats?.inactiveUsers || 0, color: '#f59e0b' },
    ],
    [stats, ac],
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
            flexDirection: isRtl ? 'row-reverse' : 'row',
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
            {ac?.analytics || 'Analytics'}
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
        <View style={[rootStyles.heroCard, { backgroundColor: theme.accent, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View>
            <Text style={[rootStyles.heroGreeting, { textAlign: isRtl ? 'right' : 'left' }]}>
              {userInfo?.firstName
                ? `${ac?.heyPrefix || 'Hey'}, ${userInfo.firstName}`
                : ac?.welcomeBack || 'Welcome back'}
            </Text>
            <Text style={[rootStyles.heroSub, { textAlign: isRtl ? 'right' : 'left' }]}>{today}</Text>
          </View>
          <View style={[rootStyles.heroBadge, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <ShieldIcon size={16} color="#fff" strokeWidth={2.5} />
            <Text style={rootStyles.heroBadgeText}>{ac?.adminBadge || 'Admin'}</Text>
          </View>
        </View>

        <View style={[rootStyles.kpiGrid, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <KpiCard
            label={ac?.totalUsers || 'Total Users'}
            value={stats?.totalUsers || 0}
            trend={12}
            color="#fff"
            bgColor="#6366f1"
            icon={<Users size={18} color="#6366f1" />}
            isRtl={isRtl}
          />
          <KpiCard
            label={ac?.activeKpi || 'Active'}
            value={stats?.activeUsers || 0}
            trend={5}
            color="#fff"
            bgColor="#22c55e"
            icon={<CheckCircle size={18} color="#22c55e" />}
            isRtl={isRtl}
          />
          <KpiCard
            label={ac?.plansKpi || 'Plans'}
            value={stats?.totalPlans || 0}
            trend={-2}
            color="#fff"
            bgColor="#8b5cf6"
            icon={<BookOpen size={18} color="#8b5cf6" />}
            isRtl={isRtl}
          />
          <KpiCard
            label={ac?.enrolledKpi || 'Enrolled'}
            value={stats?.totalEnrollments || 0}
            trend={8}
            color="#fff"
            bgColor="#06b6d4"
            icon={<Activity size={18} color="#06b6d4" />}
            isRtl={isRtl}
          />
        </View>

        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[rootStyles.sectionTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.userOverview || 'User Overview'}
          </Text>
          <View style={[rootStyles.overviewRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={rootStyles.barsContainer}>
              <StatBar
                label={ac?.activeUsers || 'Active Users'}
                value={stats?.activeUsers || 0}
                total={stats?.totalUsers || 1}
                color="#22c55e"
                isRtl={isRtl}
              />
              <StatBar
                label={ac?.verified || 'Verified'}
                value={stats?.verifiedUsers || 0}
                total={stats?.totalUsers || 1}
                color="#06b6d4"
                isRtl={isRtl}
              />
              <StatBar
                label={ac?.inactive || 'Inactive'}
                value={stats?.inactiveUsers || 0}
                total={stats?.totalUsers || 1}
                color="#f59e0b"
                isRtl={isRtl}
              />
            </View>
          </View>
        </View>

        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[rootStyles.sectionTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.roleDistribution || 'Role Distribution'}
          </Text>
          <View style={[rootStyles.distributionRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <CircleChart data={roleData} size={110} totalLabel={ac?.totalLabel || 'Total'} />
            <View style={[rootStyles.legendContainer, { marginLeft: isRtl ? 0 : 24, marginRight: isRtl ? 24 : 0 }]}>
              {roleData.map((item, index) => (
                <View
                  key={index}
                  style={[
                    rootStyles.legendItem,
                    {
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.02)',
                    },
                  ]}
                >
                  <View style={[rootStyles.legendLabelGroup, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        rootStyles.legendDot,
                        { backgroundColor: item.color, marginRight: isRtl ? 0 : 10, marginLeft: isRtl ? 10 : 0 },
                      ]}
                    />
                    <Text
                      style={[
                        rootStyles.legendLabel,
                        { color: isDark ? theme.textSecondary : '#4b5563', textAlign: isRtl ? 'right' : 'left' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      rootStyles.legendValueBadge,
                      { backgroundColor: `${item.color}15`, marginLeft: isRtl ? 0 : 8, marginRight: isRtl ? 8 : 0 },
                    ]}
                  >
                    <Text
                      style={[rootStyles.legendValue, { color: item.color }]}
                    >
                      {item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[rootStyles.sectionTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.platformHealth || 'Platform Health'}
          </Text>
          <View style={rootStyles.healthGrid}>
            <View style={rootStyles.healthItem}>
              <View style={[rootStyles.healthHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[rootStyles.healthLabel, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                  {ac?.activeRate || 'Active Rate'}
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
              <View style={[rootStyles.healthHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[rootStyles.healthLabel, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                  {ac?.verificationRate || 'Verified'}
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
              <View style={[rootStyles.healthHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[rootStyles.healthLabel, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                  {ac?.completionRate || 'Completion'}
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
          <Text style={[rootStyles.sectionTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {ac?.quickActions || 'Quick Actions'}
          </Text>
          <QuickAction
            icon={<Users size={20} color="#6366f1" />}
            label={ac?.manageUsers || 'Manage Users'}
            subtitle={ac?.viewEditUsers || 'View & edit users'}
            color="#6366f1"
            onPress={() => navigation.navigate(route.adminUsers)}
            isRtl={isRtl}
          />
          <QuickAction
            icon={<Activity size={20} color="#22c55e" />}
            label={ac?.viewActivity || 'View Activity'}
            subtitle={ac?.loginSessions || 'Login sessions & events'}
            color="#22c55e"
            onPress={() => navigation.navigate(route.adminActivity)}
            isRtl={isRtl}
          />
          <QuickAction
            icon={<BookOpen size={20} color="#06b6d4" />}
            label={ac?.dailyVerseLabel || 'Daily Verse'}
            subtitle={ac?.manageDailyVerses || 'Manage daily verses'}
            color="#06b6d4"
            onPress={() => navigation.navigate(route.adminDailyVerse)}
            isRtl={isRtl}
          />
          <QuickAction
            icon={<CalendarClock size={20} color="#8b5cf6" />}
            label={ac?.readingPlansLabel || 'Reading Plans'}
            subtitle={ac?.managePlans || 'Manage plans'}
            color="#8b5cf6"
            onPress={() => navigation.navigate(route.adminReadingPlans)}
            isRtl={isRtl}
          />
          <QuickAction
            icon={<BookText size={20} color="#f59e0b" />}
            label={ac?.journalPromptsLabel || 'Journal Prompts'}
            subtitle={ac?.managePrompts || 'Manage prompts'}
            color="#f59e0b"
            onPress={() => navigation.navigate(route.adminJournalPrompts)}
            isRtl={isRtl}
          />
           <QuickAction
             icon={<LayoutTemplate size={20} color="#ec4899" />}
             label={ac?.journalTemplatesLabel || 'Journal Templates'}
             subtitle={ac?.manageTemplates || 'Manage templates'}
             color="#ec4899"
             onPress={() => navigation.navigate(route.adminJournalTemplates)}
             isRtl={isRtl}
           />
           <QuickAction
             icon={<Lightbulb size={20} color="#fbbf24" />}
             label={ac?.dailyDevotionLabel || 'Daily Devotion'}
             subtitle={ac?.manageDevotions || 'Manage devotions'}
             color="#fbbf24"
             onPress={() => navigation.navigate(route.adminDailyDevotion)}
             isRtl={isRtl}
           />
          <QuickAction
            icon={<Globe size={20} color="#64748b" />}
            label={translations?.profile?.menuItems?.language || 'Language'}
            subtitle={`${FLAGS[language]}  ${NATIVE_NAMES[language]}`}
            color="#64748b"
            onPress={() => setLangPickerVisible(true)}
            isRtl={isRtl}
          />
          </View>

        {/* ── System Settings ── */}
        <View
          style={[rootStyles.sectionCard, { backgroundColor: theme.surface }]}
        >
          <View style={[systemStyles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[systemStyles.iconWrap, { backgroundColor: `${theme.accent}18` }]}>
              <Settings size={18} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[systemStyles.title, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
              {ac?.systemSettings || 'System Settings'}
            </Text>
          </View>

          {/* Free Translations Only */}
          <View style={[systemStyles.row, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={systemStyles.rowText}>
              <Text style={[systemStyles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.freeTranslationsOnly || 'Free Translations Only'}
              </Text>
              <Text style={[systemStyles.desc, { color: theme.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.freeTranslationsDesc || 'Limit Bible readers to free translations only'}
              </Text>
            </View>
            <Switch
              value={freeTranslationsOnly}
              onValueChange={handleToggleFreeTranslations}
              disabled={settingsLoading}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.border}
            />
          </View>

          {/* Default Bible Translation */}
          <View style={[systemStyles.row, { flexDirection: isRtl ? 'row-reverse' : 'row', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 4 }]}>
            <View style={systemStyles.rowText}>
              <Text style={[systemStyles.label, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.defaultTranslation || 'Default Bible Translation'}
              </Text>
              <Text style={[systemStyles.desc, { color: theme.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.defaultTranslationDesc || 'Translation to use by default in the Bible reader'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setTranslationPickerVisible(true)}
              disabled={settingsLoading || translationOptions.length === 0}
              style={[
                systemStyles.pickerBtn,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[systemStyles.pickerText, { color: theme.text }]}>
                {defaultTranslationId}
              </Text>
              <ChevronDown size={14} color={theme.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={rootStyles.bottomSpacer} />
      </ScrollView>

      <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── Translation Picker Modal ── */}
      <Modal
        visible={translationPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTranslationPickerVisible(false)}
      >
        <View style={systemStyles.modalOverlay}>
          <View style={[systemStyles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={systemStyles.modalHeader}>
              <Text style={[systemStyles.modalTitle, { color: theme.text }]}>
                {ac?.defaultTranslation || 'Default Bible Translation'}
              </Text>
              <TouchableOpacity onPress={() => setTranslationPickerVisible(false)}>
                <X size={20} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={translationOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    systemStyles.modalItem,
                    { borderBottomColor: theme.border },
                    item.id === defaultTranslationId && { backgroundColor: `${theme.accent}12` },
                  ]}
                  onPress={() => {
                    handleChangeDefaultTranslation(item.id);
                    setTranslationPickerVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    systemStyles.modalItemText,
                    { color: item.id === defaultTranslationId ? theme.accent : theme.text },
                    item.id === defaultTranslationId && { fontWeight: '700' },
                  ]}>
                    {item.name}
                  </Text>
                  {item.id === defaultTranslationId && (
                    <Text style={{ color: theme.accent, fontSize: 16 }}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={theme.accent} />
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <LanguagePickerModal
        visible={langPickerVisible}
        onRequestClose={() => setLangPickerVisible(false)}
      />

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
          isRtl={isRtl}
          ac={ac}
          currentLanguage={language}
          onLanguagePress={() => {
            closeDrawer();
            setTimeout(() => setLangPickerVisible(true), 350);
          }}
        />
      )}
    </View>
  );
};

const rootStyles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
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
  overviewRow: { alignItems: 'center' },
  barsContainer: { flex: 1 },
  distributionRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  legendContainer: {
    flex: 1,
    gap: 12,
  },
  legendItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 10,
    borderRadius: 12,
  },
  legendLabelGroup: {
    alignItems: 'center',
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  legendValueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  healthGrid: { gap: 18 },
  healthItem: { marginBottom: 4 },
  healthHeader: {
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

const systemStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 14,
    flex: 1,
  },
});

export default AdminDashboard;

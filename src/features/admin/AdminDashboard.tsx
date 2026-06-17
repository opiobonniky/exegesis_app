import React, { useEffect, useState, useCallback, useContext, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated, Dimensions, StatusBar, Platform, Pressable, ActivityIndicator, Switch, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getColors } from '../../constants/theme';
import { Users, Menu, X, LogOut, LayoutDashboard, TrendingUp, TrendingDown, BookOpen, Activity, Bell, CalendarClock, UserCheck, Percent, Settings, Lightbulb, BookText, LayoutTemplate, ChevronDown } from 'lucide-react-native';
import { route } from '../../component/navigations/routes';
import useAuth from '../../hooks/useAuth';
import { AppContext } from '../../common/AppContext';
import { DashboardStats, getAdminDashboardStats, getSiteSetting, setSiteSetting } from '../../services/adminApi';
import { bibleApi } from '../../services/bibleApi';
import BottomTab from '../../component/navigations/BottomTab';
import { useLanguage } from '../../component/language-translation/LanguageProvider';
import { isRtlLanguage, getLocale } from '../../component/language-translation/localeUtils';
import LanguagePickerModal, { FLAGS, NATIVE_NAMES } from '../../component/LanguagePickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

const getDashboardTheme = (isDark: boolean) => {
  const colors = getColors(isDark);
  return {
    bg: colors.background, surface: colors.surface, border: colors.border,
    text: colors.text, textSecondary: colors.textSecondary, textMuted: colors.muted,
    accent: colors.primary, drawerBg: colors.surface, drawerText: colors.text,
    drawerMuted: colors.muted, drawerActive: colors.primary, drawerActiveBg: colors.selectedItem,
  };
};

function SkeletonBlock({ height = 16, width = '100%', style }: { height?: number; width?: string | number; style?: any }) {
  return <View style={[{ height, width, borderRadius: 8, backgroundColor: 'rgba(150,150,150,0.12)' }, style]} />;
}

const KpiCard: React.FC<{ label: string; value: string | number; trend?: number; color: string; bgColor: string; icon: React.ReactNode; isRtl?: boolean }> = ({ label, value, trend, color, bgColor, icon, isRtl }) => (
  <View style={[kpiStyles.card, { backgroundColor: bgColor }]}>
    <View style={[kpiStyles.topRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <View style={[kpiStyles.iconWrap, { backgroundColor: `${color}25` }]}>{icon}</View>
      {trend !== undefined && (
        <View style={[kpiStyles.trendPill, { backgroundColor: trend >= 0 ? '#22c55e20' : '#ef444420' }]}>
          {trend >= 0 ? <TrendingUp size={9} color="#22c55e" /> : <TrendingDown size={9} color="#ef4444" />}
          <Text style={[kpiStyles.trendText, { color: trend >= 0 ? '#22c55e' : '#ef4444' }]}>{Math.abs(trend)}%</Text>
        </View>
      )}
    </View>
    <Text style={[kpiStyles.value, { color, textAlign: isRtl ? 'right' : 'left' }]}>{value}</Text>
    <Text style={[kpiStyles.label, { color, opacity: 0.7, textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
  </View>
);

const kpiStyles = StyleSheet.create({
  card: { flex: 1, minHeight: 90, borderRadius: 16, padding: 12, marginHorizontal: 4, marginBottom: 8 },
  topRow: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  iconWrap: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trendPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, gap: 2 },
  trendText: { fontSize: 9, fontWeight: '700' },
  value: { fontSize: 22, fontWeight: '800', marginBottom: 1, letterSpacing: -0.3 },
  label: { fontSize: 11, fontWeight: '600' },
});

const Drawer: React.FC<{ isOpen: boolean; onClose: () => void; activeItem: string; onNavigate: (routeKey: string, id: string) => void; onLogout: () => void; theme: any; userInfo: any; translateX: Animated.Value; overlayOpacity: Animated.Value; isRtl: boolean; ac?: any; currentLanguage?: any; onLanguagePress?: () => void }> = ({ isOpen, onClose, activeItem, onNavigate, onLogout, theme, userInfo, translateX, overlayOpacity, isRtl, ac, currentLanguage, onLanguagePress }) => {
  if (!isOpen) return null;
  const initials = userInfo ? `${(userInfo.firstName || '')[0]}${(userInfo.lastName || '')[0]}`.toUpperCase() || 'A' : 'A';
  const items = [
    { id: 'adminDashboard', label: ac?.dashboard || 'Dashboard', icon: LayoutDashboard, routeKey: 'adminDashboard' },
    { id: 'adminUsers', label: ac?.users || 'Users', icon: Users, routeKey: 'adminUsers' },
    { id: 'adminVerse', label: ac?.dailyVerseLabel || 'Daily Verse', icon: BookOpen, routeKey: 'adminDailyVerse' },
    { id: 'adminDevotion', label: ac?.dailyDevotionLabel || 'Daily Devotion', icon: Lightbulb, routeKey: 'adminDailyDevotion' },
    { id: 'adminPlans', label: ac?.readingPlansLabel || 'Reading Plans', icon: CalendarClock, routeKey: 'adminReadingPlans' },
    { id: 'adminJournalPrompts', label: ac?.journalPromptsLabel || 'Journal Prompts', icon: BookText, routeKey: 'adminJournalPrompts' },
    { id: 'adminJournalTemplates', label: ac?.journalTemplatesLabel || 'Journal Templates', icon: LayoutTemplate, routeKey: 'adminJournalTemplates' },
    { id: 'adminActivity', label: ac?.activity || 'Activity', icon: Activity, routeKey: 'adminActivity' },
    { id: 'adminSettings', label: ac?.systemSettings || 'Settings', icon: Settings, routeKey: 'adminSettings' },
  ];

  return (
    <View style={drawerStyles.overlay} pointerEvents="box-none">
      <Animated.View style={[drawerStyles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[drawerStyles.panel, { backgroundColor: theme.drawerBg, width: DRAWER_WIDTH, transform: [{ translateX }] }, isRtl ? { right: 0 } : { left: 0 }]}>
        <View style={[drawerStyles.drawerHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View style={[drawerStyles.avatar, { backgroundColor: theme.drawerActive }]}>
            <Text style={drawerStyles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[drawerStyles.drawerName, { color: theme.drawerText, textAlign: isRtl ? 'right' : 'left' }]}>
              {userInfo?.firstName ? `${userInfo.firstName} ${userInfo.lastName || ''}` : userInfo?.username || 'Admin'}
            </Text>
            <View style={{ alignSelf: isRtl ? 'flex-end' : 'flex-start' }}>
              <Text style={drawerStyles.roleBadge}>{ac?.superAdminBadge || 'Super Admin'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={drawerStyles.closeBtn}>
            <X size={20} color={theme.drawerMuted} />
          </TouchableOpacity>
        </View>
        <View style={[drawerStyles.divider, { backgroundColor: theme.border }]} />
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Text style={[drawerStyles.navSection, { color: theme.drawerMuted, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.navigationSection || 'NAVIGATION'}</Text>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <TouchableOpacity key={item.id} style={[drawerStyles.navItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }, isActive && { backgroundColor: theme.drawerActiveBg }]} onPress={() => onNavigate(item.routeKey, item.id)} activeOpacity={0.7}>
                <Icon size={20} color={isActive ? theme.drawerActive : theme.drawerMuted} strokeWidth={isActive ? 2.5 : 1.8} />
                <Text style={[drawerStyles.navLabel, { color: isActive ? theme.drawerText : theme.drawerMuted, fontWeight: isActive ? '700' : '500', textAlign: isRtl ? 'right' : 'left' }]}>{item.label}</Text>
                {isActive && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.drawerActive }} />}
              </TouchableOpacity>
            );
          })}
          <View style={[drawerStyles.divider, { backgroundColor: theme.border, marginVertical: 16 }]} />
          <Text style={[drawerStyles.navSection, { color: theme.drawerMuted, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.accountSection || 'ACCOUNT'}</Text>
          <TouchableOpacity style={[drawerStyles.navItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }]} onPress={onLanguagePress} activeOpacity={0.7}>
            <Text style={{ fontSize: 22, marginHorizontal: 8 }}>{currentLanguage ? FLAGS[currentLanguage] : '🌐'}</Text>
            <Text style={[drawerStyles.navLabel, { color: theme.drawerText, textAlign: isRtl ? 'right' : 'left' }]}>{currentLanguage ? NATIVE_NAMES[currentLanguage] : 'Language'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[drawerStyles.navItem, { flexDirection: isRtl ? 'row-reverse' : 'row' }]} onPress={onLogout} activeOpacity={0.7}>
            <LogOut size={20} color="#e05555" />
            <Text style={[drawerStyles.navLabel, { color: '#e05555', textAlign: isRtl ? 'right' : 'left' }]}>{ac?.signOut || 'Sign Out'}</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={[drawerStyles.drawerFooter, { borderTopColor: theme.border }]}>
          <Text style={[drawerStyles.footerText, { color: theme.drawerMuted, textAlign: isRtl ? 'right' : 'left' }]}>{ac?.adminConsole || 'Admin Console v1.0'}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const drawerStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: { height: '100%', paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 12, paddingBottom: Platform.OS === 'ios' ? 34 : 16, borderTopRightRadius: 28, borderBottomRightRadius: 28, shadowColor: '#000', shadowOffset: { width: 8, height: 0 }, shadowOpacity: 0.25, shadowRadius: 28, elevation: 20, overflow: 'hidden' },
  drawerHeader: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  drawerName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  roleBadge: { color: '#fff', fontSize: 10, fontWeight: '700', backgroundColor: '#c0392b', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, letterSpacing: 0.4, overflow: 'hidden' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginHorizontal: 16 },
  navSection: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginHorizontal: 20, marginTop: 20, marginBottom: 8 },
  navItem: { alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, marginHorizontal: 8, borderRadius: 12, marginBottom: 2, gap: 14 },
  navLabel: { fontSize: 14, flex: 1 },
  drawerFooter: { borderTopWidth: 1, paddingTop: 14, paddingHorizontal: 20, marginTop: 8 },
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
  const [activeTab, setActiveTab] = useState('adminDashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [freeTranslationsOnly, setFreeTranslationsOnly] = useState(false);
  const [defaultTranslationId, setDefaultTranslationId] = useState('Berean');
  const [translationOptions, setTranslationOptions] = useState<{ id: string; name: string }[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [translationPickerVisible, setTranslationPickerVisible] = useState(false);
  const translateX = useRef(new Animated.Value(isRtl ? DRAWER_WIDTH : -DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [drawerMounted, setDrawerMounted] = useState(false);

  const openDrawer = useCallback(() => {
    setDrawerMounted(true);
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 200, mass: 0.8 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(true));
  }, []);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: isRtl ? DRAWER_WIDTH : -DRAWER_WIDTH, useNativeDriver: true, damping: 28, stiffness: 250, mass: 0.7 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => { setDrawerOpen(false); setDrawerMounted(false); });
  }, [isRtl]);

  const handleDrawerNavigate = useCallback((routeKey: string, id: string) => {
    setActiveTab(id);
    closeDrawer();
    setTimeout(() => navigation.navigate((route as any)[routeKey]), 300);
  }, [navigation, closeDrawer]);

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
    const prev = freeTranslationsOnly;
    setFreeTranslationsOnly(checked);
    setSettingsLoading(true);
    try {
      await setSiteSetting('freeTranslationsOnly', String(checked));
    } catch (error) {
      setFreeTranslationsOnly(prev);
      console.error('Failed to save setting:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangeDefaultTranslation = async (id: string) => {
    const prev = defaultTranslationId;
    setDefaultTranslationId(id);
    setSettingsLoading(true);
    try {
      await setSiteSetting('defaultTranslationId', id);
    } catch (error) {
      setDefaultTranslationId(prev);
      console.error('Failed to save default translation:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); loadSettings(); loadTranslationOptions(); }, [fetchStats, loadSettings, loadTranslationOptions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const today = useMemo(() => new Date().toLocaleDateString(getLocale(language), { weekday: 'long', month: 'long', day: 'numeric' }), [language]);
  const initials = userInfo ? `${(userInfo.firstName || '')[0]}${(userInfo.lastName || '')[0]}`.toUpperCase() || 'A' : 'A';

  const userGrowthTrend = stats?.totalUsers ? Math.round((stats.newUsersThisMonth / stats.totalUsers) * 100) : 0;
  const activeUserTrend = stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;

  // Approximate daily new users from monthly data
  const now = new Date();
  const daysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const avgDailyNew = stats ? Math.round(stats.newUsersThisMonth / dayOfMonth) : 0;

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 10 }]}>
          <SkeletonBlock height={40} width={40} style={{ borderRadius: 12 }} />
          <View style={{ flex: 1, alignItems: 'center' }}><SkeletonBlock height={16} width={100} /></View>
          <SkeletonBlock height={36} width={36} style={{ borderRadius: 18 }} />
        </View>
        <View style={{ padding: 16 }}>
          <SkeletonBlock height={160} style={{ borderRadius: 22, marginBottom: 16 }} />
          <View style={{ flexDirection: 'row' }}>
            {[1, 2].map(i => <View key={i} style={{ flex: 1, marginHorizontal: 4, minHeight: 90, borderRadius: 16, padding: 12, backgroundColor: 'rgba(150,150,150,0.06)' }}>
              <SkeletonBlock height={28} width={28} style={{ borderRadius: 10, marginBottom: 10 }} />
              <SkeletonBlock height={22} width="50%" style={{ marginBottom: 4 }} />
              <SkeletonBlock height={12} width="70%" />
            </View>)}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2].map(i => <View key={i} style={{ flex: 1, marginHorizontal: 4, minHeight: 90, borderRadius: 16, padding: 12, backgroundColor: 'rgba(150,150,150,0.06)' }}>
              <SkeletonBlock height={28} width={28} style={{ borderRadius: 10, marginBottom: 10 }} />
              <SkeletonBlock height={22} width="50%" style={{ marginBottom: 4 }} />
              <SkeletonBlock height={12} width="70%" />
            </View>)}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.accent} />

      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 10, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn} activeOpacity={0.7}>
          <Menu size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={s.topBarCenter}>
          <Text style={[s.topBarTitle, { color: theme.text }]}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={openDrawer} style={s.avatarBtn} activeOpacity={0.7}>
          <View style={[s.avatarSmall, { backgroundColor: theme.accent }]}>
            <Text style={s.avatarSmallText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
        {/* ════════════════════════════════════════
            HERO — admin overview with key metrics
        ════════════════════════════════════════ */}
        <View style={[s.heroCard, { backgroundColor: theme.accent }]}>
          <View style={[s.heroRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroGreeting, { textAlign: isRtl ? 'right' : 'left' }]}>
                {userInfo?.firstName ? `${ac?.heyPrefix || 'Hey'}, ${userInfo.firstName}` : ac?.welcomeBack || 'Welcome back'}
              </Text>
              <Text style={[s.heroSub, { textAlign: isRtl ? 'right' : 'left' }]}>{today}</Text>
            </View>
            <View style={[s.heroBadge]}>
              <Text style={s.heroBadgeText}>{ac?.adminBadge || 'Admin'}</Text>
            </View>
          </View>

          {/* Hero metrics: new this month, growth rate, active rate */}
          <View style={[s.heroMetrics, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <Text style={s.heroMetricValue}>{stats?.newUsersThisMonth || 0}</Text>
              <Text style={s.heroMetricLabel}>{ac?.newThisMonth || 'New this month'}</Text>
            </View>
            <View style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.heroMetricValue}>{userGrowthTrend}%</Text>
              <Text style={s.heroMetricLabel}>{ac?.userGrowth || 'Growth rate'}</Text>
            </View>
            <View style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <View style={{ flex: 1, alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
              <Text style={s.heroMetricValue}>{activeUserTrend}%</Text>
              <Text style={s.heroMetricLabel}>{ac?.activeKpi || 'Active rate'}</Text>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════
            DAILY SIGNUPS
        ════════════════════════════════════════ */}
        <View style={[s.dailyCard, { backgroundColor: theme.surface }]}>
          <View style={[s.dailyHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Users size={18} color={theme.accent} />
            <Text style={[s.dailyTitle, { color: theme.text, marginLeft: isRtl ? 0 : 8, marginRight: isRtl ? 8 : 0 }]}>
              {ac?.dailySignups || 'Daily Signups'}
            </Text>
          </View>
          <View style={[s.dailyGrid, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[s.dailyMetric, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
              <Text style={[s.dailyValue, { color: theme.text }]}>{avgDailyNew}</Text>
              <Text style={[s.dailyLabel, { color: theme.textMuted }]}>{ac?.avgDaily || 'Avg / day'}</Text>
            </View>
            <View style={[s.dailyMetric, { alignItems: 'center' }]}>
              <Text style={[s.dailyValue, { color: theme.text }]}>{stats?.newUsersThisMonth || 0}</Text>
              <Text style={[s.dailyLabel, { color: theme.textMuted }]}>{ac?.thisMonth || 'This month'}</Text>
            </View>
            <View style={[s.dailyMetric, { alignItems: isRtl ? 'flex-start' : 'flex-end' }]}>
              <Text style={[s.dailyValue, { color: theme.text }]}>{stats?.totalUsers || 0}</Text>
              <Text style={[s.dailyLabel, { color: theme.textMuted }]}>{ac?.totalUsers || 'Total users'}</Text>
            </View>
          </View>
          {/* mini progress bar showing month completion */}
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: theme.textMuted }}>{ac?.day || 'Day'} {dayOfMonth}/{daysThisMonth}</Text>
              <Text style={{ fontSize: 10, color: theme.textMuted }}>{Math.round((dayOfMonth / daysThisMonth) * 100)}%</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.12)', overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 3, width: `${(dayOfMonth / daysThisMonth) * 100}%`, backgroundColor: theme.accent }} />
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════
            KPI GRID
        ════════════════════════════════════════ */}
        <View style={[s.kpiGrid, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <KpiCard label={ac?.totalUsers || 'Total Users'} value={stats?.totalUsers || 0} trend={userGrowthTrend} color="#fff" bgColor="#6366f1" icon={<Users size={18} color="#6366f1" />} isRtl={isRtl} />
          <KpiCard label={ac?.activeKpi || 'Active Users'} value={stats?.activeUsers || 0} trend={activeUserTrend - 50} color="#fff" bgColor="#22c55e" icon={<UserCheck size={18} color="#22c55e" />} isRtl={isRtl} />
        </View>
        <View style={[s.kpiGrid, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <KpiCard label={ac?.plansKpi || 'Reading Plans'} value={stats?.totalPlans || 0} color="#fff" bgColor="#7c3aed" icon={<BookOpen size={18} color="#7c3aed" />} isRtl={isRtl} />
          <KpiCard label={ac?.enrolledKpi || 'Enrolled'} value={stats?.totalEnrollments || 0} color="#fff" bgColor="#06b6d4" icon={<Activity size={18} color="#06b6d4" />} isRtl={isRtl} />
        </View>

        {/* ════════════════════════════════════════
            SYSTEM SETTINGS
        ════════════════════════════════════════ */}
        <View style={[s.sectionCard, { backgroundColor: theme.surface }]}>
          <View style={[s.settingsHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${theme.accent}18`, alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={16} color={theme.accent} />
            </View>
            <Text style={[s.settingsTitle, { color: theme.text, marginLeft: isRtl ? 0 : 10, marginRight: isRtl ? 10 : 0 }]}>
              {ac?.systemSettings || 'System Settings'}
            </Text>
          </View>

          <View style={[s.settingsRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingsLabel, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.freeTranslationsOnly || 'Free Translations Only'}
              </Text>
              <Text style={[s.settingsDesc, { color: theme.textMuted, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.freeTranslationsDesc || 'Limit Bible readers to free translations'}
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

          <View style={[s.settingsRow, { flexDirection: isRtl ? 'row-reverse' : 'row', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 14, marginTop: 2 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingsLabel, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {ac?.defaultTranslation || 'Default Translation'}
              </Text>
              <Text style={[s.settingsDesc, { color: theme.textMuted, textAlign: isRtl ? 'right' : 'left' }]}>
                {defaultTranslationId}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setTranslationPickerVisible(true)}
              disabled={settingsLoading || translationOptions.length === 0}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>{defaultTranslationId}</Text>
              <ChevronDown size={12} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 34 }} />
      </ScrollView>

      {/* ── Translation Picker Modal ── */}
      <Modal visible={translationPickerVisible} transparent animationType="slide" onRequestClose={() => setTranslationPickerVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={[s.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[s.modalTitle, { color: theme.text }]}>{ac?.defaultTranslation || 'Default Translation'}</Text>
              <TouchableOpacity onPress={() => setTranslationPickerVisible(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={translationOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalItem, { borderBottomColor: theme.border }, item.id === defaultTranslationId && { backgroundColor: `${theme.accent}12` }]}
                  onPress={() => { handleChangeDefaultTranslation(item.id); setTranslationPickerVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.modalItemText, { color: item.id === defaultTranslationId ? theme.accent : theme.text }, item.id === defaultTranslationId && { fontWeight: '700' }]}>
                    {item.name}
                  </Text>
                  {item.id === defaultTranslationId && <Text style={{ color: theme.accent, fontSize: 15 }}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<View style={{ padding: 30, alignItems: 'center' }}><ActivityIndicator size="small" color={theme.accent} /></View>}
            />
          </View>
        </View>
      </Modal>

      <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />

      <LanguagePickerModal visible={langPickerVisible} onRequestClose={() => setLangPickerVisible(false)} />

      {drawerMounted && (
        <Drawer isOpen={drawerOpen} onClose={closeDrawer} activeItem={activeTab} onNavigate={handleDrawerNavigate} onLogout={async () => { closeDrawer(); setTimeout(() => logout?.(), 300); }} theme={theme} userInfo={userInfo} translateX={translateX} overlayOpacity={overlayOpacity} isRtl={isRtl} ac={ac} currentLanguage={language} onLanguagePress={() => { closeDrawer(); setTimeout(() => setLangPickerVisible(true), 350); }} />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, zIndex: 10 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  avatarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scrollContent: { paddingBottom: 80, paddingTop: 8, paddingHorizontal: 16 },
  heroCard: { borderRadius: 22, padding: 22, marginTop: 16 },
  heroRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  heroGreeting: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginTop: 4 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  heroBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  heroMetrics: { marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  heroMetricValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroMetricLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500', marginTop: 2 },
  kpiGrid: { flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12, marginHorizontal: -4 },
  dailyCard: { borderRadius: 20, padding: 18, marginTop: 16 },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dailyTitle: { fontSize: 15, fontWeight: '700' },
  dailyGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  dailyMetric: { flex: 1 },
  dailyValue: { fontSize: 22, fontWeight: '800' },
  dailyLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  sectionCard: { borderRadius: 20, padding: 18, marginTop: 16 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  settingsTitle: { fontSize: 15, fontWeight: '700' },
  settingsRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingsLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingsDesc: { fontSize: 11, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalItemText: { fontSize: 14, flex: 1 },
});

export default AdminDashboard;

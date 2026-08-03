import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Animated,
  Platform,
  Linking,
  StatusBar,
  Image,
} from 'react-native';
import {
  Moon,
  Sun,
  Bell,
  Globe,
  ChevronRight,
  ChevronLeft,
  History,
  LogOut,
  FileText,
  Settings2,
  BadgeCheck,
  BookOpen,
  Heart,
  Star,
  BookMarked,
  CalendarDays,
  Brain,
  GraduationCap,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import LanguagePickerModal, { FLAGS, NATIVE_NAMES } from '../../component/LanguagePickerModal';
import { BORDER_RADIUS, getColors, SPACING } from '../../constants/theme';
import ActionModal from '../../reusable/ActionModal';
import { route } from '../../component/navigations/routes';
import BottomTab from '../../component/navigations/BottomTab';
import { sendPostRequest } from '../../services/api';
import { getHomeDesign } from '../home/homeStyle';
import StatsRow from '../home/cards/StatsRow';
import RecentActivity from '../home/cards/RecentActivity';
import { formatWhatsAppTime } from '../../utilits/bibleUtils';
import { useSubscription } from '../../hooks/useSubscription';
import { ProfileCard, ContentList, QuickActions } from './cards';
import exegesisLogo from '../../assets/logos/exegesis_bg_rm.png';

// ── Types ─────────────────────────────────────────────────────────────────────
type ActivityType = 'read' | 'highlight' | 'note' | 'favorite' | 'plan';

type RecentActivityItem = {
  type: ActivityType;
  id: number;
  book: string;
  chapter: number;
  verse: number;
  time: string;
};

type SettingsItem = {
  id: string;
  icon: any;
  label: string;
  color: string;
  isSwitch?: boolean;
  value?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
  rightText?: string;
};

const safeNumber = (v: any): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const DEFAULT_TOP =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export default function ProfileScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();
  const { translations, language, t } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const { hasAccess } = useSubscription();
  const insets = useSafeAreaInsets();

  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const design = useMemo(() => getHomeDesign(isDark), [isDark]);

  const userInfo = app?.userInfo ?? null;
  const user = userInfo as any;
  const toggleTheme = useCallback(() => {
    app?.toggleTheme?.();
  }, [app]);
  const logout = app?.logout ?? (async () => {});

  const subscriptionTier = app?.subscriptionTier || 'free';

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [bottomTabVisible, setBottomTabVisible] = useState(true);
  const [stats, setStats] = useState({
    chaptersRead: 0,
    highlights: 0,
    notes: 0,
    favorites: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  const [modal, setModal] = useState<{
    status: boolean;
    title: string;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  const displayName =
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    user?.username ||
    'Reader';
  const accountLabel =
    subscriptionTier === 'covenant_sower_monthly' ||
    subscriptionTier === 'covenant_sower_yearly' ||
    subscriptionTier === 'covenant_sower'
      ? 'Covenant Sower'
      : subscriptionTier === 'legacy_sower_monthly' ||
          subscriptionTier === 'legacy_sower_yearly' ||
          subscriptionTier === 'legacy_sower'
        ? 'Legacy Sower'
        : 'Free Reader';

  const topInset =
    Platform.OS === 'android' ? (insets.top || DEFAULT_TOP) + 8 : insets.top || DEFAULT_TOP;

  // ── Data ───────────────────────────────────────────────────────────────────
  const formatActivityTime = useCallback(
    (act: any): string => {
      try {
        if (act.formattedTime) return act.formattedTime;
        const timeVal = act.time;
        if (!timeVal || typeof timeVal !== 'object') {
          if (typeof timeVal === 'string')
            return formatWhatsAppTime(timeVal, language);
          return translations?.home?.recentLabel || 'Recent';
        }
        const timeStr = timeVal.createdOn || timeVal.updatedOn;
        if (!timeStr) return translations?.home?.recentLabel || 'Recent';
        const time = new Date(timeStr);
        if (isNaN(time.getTime()))
          return translations?.home?.recentLabel || 'Recent';
        return formatWhatsAppTime(timeStr, language);
      } catch {
        return translations?.home?.recentLabel || 'Recent';
      }
    },
    [language, translations],
  );

  const loadProfileData = useCallback(async () => {
    try {
      const [homeRes, activityRes] = await Promise.all([
        sendPostRequest('bible', 'get-home-stats', {}).catch(() => null),
        sendPostRequest('bible', 'get-recent-activity', { limit: 10 }).catch(
          () => null,
        ),
      ]);

      if (homeRes?.returnCode === 200 && homeRes?.returnData) {
        const d = homeRes.returnData;
        setStats({
          chaptersRead: Number(d.chaptersRead ?? 0),
          highlights: Number(d.highlights ?? 0),
          notes: Number(d.notes ?? 0),
          favorites: Number(d.favorites ?? 0),
        });
      }

      if (activityRes?.returnData) {
        const activities = activityRes.returnData.map((act: any) => ({
          type: act.type,
          id: act.id,
          book: act.book,
          chapter: act.chapter,
          verse: act.verse,
          time: formatActivityTime(act),
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }, [formatActivityTime]);

  useEffect(() => {
    if (userInfo) loadProfileData();
  }, [loadProfileData, userInfo]);

  useFocusEffect(
    useCallback(() => {
      if (!userInfo) return;
      loadProfileData();
    }, [loadProfileData, userInfo]),
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleManageSubscription = async () => {
    if (subscriptionTier === 'free') {
      navigation.navigate(route.sower);
    } else {
      try {
        const res = await sendPostRequest('subscriptions', 'create-portal-session', {});
        if (res.returnCode === 200 && res.returnData?.url) {
          Linking.openURL(res.returnData.url);
        }
      } catch (e) {
        console.error('Failed to open portal:', e);
      }
    }
  };

  const handleLogout = async () => {
    setShowLogout(false);
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
      setModal({
        status: true,
        title: 'Logout Failed',
        message: 'Something went wrong while logging out. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleScroll = useCallback(
    (event: any) => {
      const currentOffset = event.nativeEvent.contentOffset.y;
      const direction = currentOffset > scrollY.current ? 'down' : 'up';
      const shouldShow = direction === 'up' || currentOffset <= 0;

      if (shouldShow !== bottomTabVisible) {
        setBottomTabVisible(shouldShow);
        Animated.timing(tabBarAnimation, {
          toValue: shouldShow ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
      scrollY.current = currentOffset;
    },
    [bottomTabVisible, tabBarAnimation],
  );

  // ── Content lists ──────────────────────────────────────────────────────────
  const contentItems = useMemo(
    () => [
      {
        id: 'exegesis',
        label: translations?.profile?.menuItems?.dailyExegesis || 'Daily Exegesis',
        icon: Star,
        onPress: () => navigation.navigate(route.dailyExegesis),
      },
      {
        id: 'bible',
        label: translations?.home?.banners?.bible || 'Bible',
        icon: BookOpen,
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'journal',
        label: translations?.home?.banners?.journal || 'Journals',
        icon: BookMarked,
        onPress: () =>
          hasAccess('legacy_sower')
            ? navigation.navigate(route.legacyLedger)
            : navigation.navigate(route.sower),
      },
      {
        id: 'plan',
        label: translations?.home?.banners?.plan || 'Reading Plans',
        icon: CalendarDays,
        onPress: () =>
          hasAccess('legacy_sower')
            ? navigation.navigate(route.readingPlan)
            : navigation.navigate(route.sower),
      },
      {
        id: 'trivia',
        label: 'Bible Trivia',
        icon: Brain,
        onPress: () => navigation.navigate(route.trivia),
      },
      {
        id: 'study',
        label: translations?.home?.banners?.study || 'Bible Study',
        icon: GraduationCap,
        onPress: () => navigation.navigate(route.lab),
      },
      {
        id: 'resources',
        label: translations?.home?.banners?.resources || 'Resources',
        icon: Globe,
        onPress: () => navigation.navigate(route.verseResources),
      },
      {
        id: 'support',
        label: translations?.home?.banners?.support || 'Support',
        icon: HelpCircle,
        onPress: () => navigation.navigate(route.home),
      },
    ],
    [navigation, hasAccess, translations],
  );

  const quickActions = useMemo(
    () => [
      {
        id: 'notes',
        label: translations?.home?.quickLinks?.notes || 'Notes',
        icon: FileText,
        onPress: () => navigation.navigate(route.notes),
      },
      {
        id: 'history',
        label: translations?.home?.quickLinks?.history || 'History',
        icon: History,
        onPress: () => navigation.navigate(route.readHistory),
      },
      {
        id: 'highlights',
        label: translations?.home?.quickLinks?.highlights || 'Highlights',
        icon: Star,
        onPress: () => navigation.navigate(route.Highlights),
      },
      {
        id: 'favorites',
        label: translations?.home?.quickLinks?.favorites || 'Favorites',
        icon: Heart,
        onPress: () => navigation.navigate(route.favorites),
      },
    ],
    [navigation, translations],
  );

  const statItems = useMemo(
    () => [
      {
        value: safeNumber(stats.chaptersRead),
        label: t('profile.stats.chapters') || (translations.profile && translations.profile.stats?.chapters) || 'Chapters',
        icon: BookOpen,
        color: design.blue,
      },
      {
        value: safeNumber(stats.highlights),
        label: t('profile.stats.highlights') || (translations.profile && translations.profile.stats?.highlights) || 'Highlights',
        icon: Star,
        color: design.accent,
      },
      {
        value: safeNumber(stats.notes),
        label: t('profile.stats.notes') || (translations.profile && translations.profile.stats?.notes) || 'Notes',
        icon: FileText,
        color: design.green,
      },
      {
        value: safeNumber(stats.favorites),
        label: t('profile.stats.favorites') || (translations.profile && translations.profile.stats?.favorites) || 'Favorites',
        icon: Heart,
        color: design.purple,
      },
    ],
    [stats, translations, t, design],
  );

  // The mockup shows READING activity in purple — tint the shared component
  // by pointing its "blue" accent at the design's purple for this screen only.
  const activityDesign = useMemo(
    () => ({ ...design, blue: design.purple }),
    [design],
  );

  const settingsItems = useMemo<SettingsItem[]>(
    () => [
      {
        id: 'theme',
        icon: isDark ? Sun : Moon,
        label:
          (isDark
            ? t('profile.menuItems.lightMode') ||
              (translations.profile && translations.profile.menuItems?.lightMode)
            : t('profile.menuItems.darkMode') ||
              (translations.profile && translations.profile.menuItems?.darkMode)) ||
          (isDark ? 'Light Mode' : 'Dark Mode'),
        color: design.accent,
        isSwitch: true,
        value: isDark,
        onToggle: toggleTheme,
      },
      {
        id: 'notifications',
        icon: Bell,
        label: t('profile.menuItems.notifications') || (translations.profile && translations.profile.menuItems?.notifications) || 'Notifications',
        color: '#EC4899',
        onPress: () => navigation.navigate(route.notificationSettings),
      },
      {
        id: 'language',
        icon: Globe,
        label: t('profile.menuItems.language') || (translations.profile && translations.profile.menuItems?.language) || 'Language',
        color: design.purple,
        onPress: () => setLangModalOpen(true),
        rightText: `${FLAGS[language]}  ${NATIVE_NAMES[language]}`,
      },
      {
        id: 'readingSettings',
        icon: Settings2,
        label: t('profile.menuItems.readingSettings') || (translations.profile && translations.profile.menuItems?.readingSettings) || 'Reading Settings',
        color: design.lightBlue,
        onPress: () => navigation.navigate(route.readingSettings),
      },
    ],
    [isDark, t, translations, design, navigation, toggleTheme, language],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: design.pageBg }]}>
      {!app || !userInfo ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <>
          {/* ── Custom header ──────────────────────────────────────────────── */}
          <View
            style={[
              styles.header,
              { backgroundColor: design.cardBg, borderBottomColor: design.cardBorder },
            ]}
          >
            <StatusBar
              backgroundColor="transparent"
              translucent
              barStyle={isDark ? 'light-content' : 'dark-content'}
            />
            <View
              style={[
                styles.headerRow,
                isRtl && styles.headerRowRtl,
                { paddingTop: topInset },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.headerBackBtn,
                  { borderColor: design.cardBorder },
                ]}
              >
                {isRtl ? (
                  <ChevronRight size={20} color={design.title} strokeWidth={2.5} />
                ) : (
                  <ChevronLeft size={20} color={design.title} strokeWidth={2.5} />
                )}
              </TouchableOpacity>

              <View style={styles.headerBrand}>
                <View
                  style={[
                    styles.headerBrandRow,
                    isRtl && styles.headerBrandRowRtl,
                  ]}
                >
                  <Image
                    source={exegesisLogo}
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                  <View style={styles.headerBrandText}>
                    <View
                      style={[
                        styles.headerTitleRow,
                        isRtl && styles.headerTitleRowRtl,
                      ]}
                    >
                      <Text
                        style={[styles.headerTitle, { color: design.title }]}
                        numberOfLines={1}
                      >
                        Exegesis Project
                      </Text>
                      <BadgeCheck
                        size={15}
                        color={design.lightBlue}
                        fill={design.lightBlue + '30'}
                      />
                    </View>
                    <Text
                      style={[styles.headerHandle, { color: design.lightBlue }]}
                      numberOfLines={1}
                    >
                      @{user?.username || 'ExegesisProject'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate(route.userProfile)}
                activeOpacity={0.7}
                style={[
                  styles.viewProfilePill,
                  { borderColor: design.lightBlue },
                ]}
              >
                <Text style={[styles.viewProfileText, { color: design.lightBlue }]}>
                  View profile
                </Text>
                {isRtl ? (
                  <ArrowLeft size={13} color={design.lightBlue} />
                ) : (
                  <ArrowRight size={13} color={design.lightBlue} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* ── Profile card ─────────────────────────────────────────────── */}
            <ProfileCard
              design={design}
              isRtl={isRtl}
              name={displayName}
              photoUrl={user?.profilePhotoUrl}
              viewProfileLabel="View profile"
              onViewProfile={() => navigation.navigate(route.userProfile)}
            />

            {/* ── Content ─────────────────────────────────────────────────── */}
            <ContentList
              design={design}
              isRtl={isRtl}
              title={translations?.profile?.menuSections?.content || 'Content'}
              items={contentItems}
            />

            {/* ── Quick Actions ───────────────────────────────────────────── */}
            <QuickActions
              design={design}
              isRtl={isRtl}
              title={translations?.home?.quickActionsTitle || 'Quick Actions'}
              items={quickActions}
            />

            {/* ── Your Stats ──────────────────────────────────────────────── */}
            <StatsRow
              design={design}
              isRtl={isRtl}
              title={
                translations?.home?.yourStatsTitle ||
                translations?.home?.statsTitle ||
                'Your Stats'
              }
              stats={statItems}
            />

            {/* ── Recent Activity ─────────────────────────────────────────── */}
            <RecentActivity
              design={activityDesign}
              isRtl={isRtl}
              items={recentActivity}
              title={
                translations?.home?.recentActivityTitle || 'Recent Activity'
              }
              seeAllLabel={translations?.home?.seeAll || 'See All'}
              emptyMessage={
                translations?.home?.startReadingTip ||
                'Start reading to see your activity here'
              }
              labels={{
                read: translations?.home?.activityLabels?.reading || 'Reading',
                highlight:
                  translations?.home?.activityLabels?.highlighted || 'Highlighted',
                note: translations?.home?.activityLabels?.noted || 'Noted',
                plan: translations?.home?.activityLabels?.planProgress || 'Plan Progress',
                favorite:
                  translations?.home?.activityLabels?.favorited || 'Favorited',
              }}
              onSeeAll={() => navigation.navigate(route.readHistory)}
              onPressItem={act =>
                navigation.navigate(route.bible, {
                  bookName: act.book,
                  chapter: act.chapter,
                })
              }
            />

            {/* ── Settings ────────────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: design.title }]}>
                {translations?.profile?.menuSections?.settings || 'Settings'}
              </Text>
              <View
                style={[
                  styles.settingsCard,
                  {
                    backgroundColor: design.cardBg,
                    borderColor: design.cardBorder,
                  },
                ]}
              >
                {settingsItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isLast = idx === settingsItems.length - 1;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.settingsRow,
                        isRtl && styles.settingsRowRtl,
                        !isLast && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: design.cardBorder,
                        },
                      ]}
                      onPress={item.isSwitch ? undefined : item.onPress}
                      activeOpacity={0.7}
                      disabled={!!item.isSwitch}
                    >
                      <View
                        style={[
                          styles.settingsIcon,
                          { backgroundColor: item.color + '1F' },
                        ]}
                      >
                        <Icon size={18} color={item.color} />
                      </View>
                      <Text
                        style={[styles.settingsLabel, { color: design.title }]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {item.isSwitch ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{
                            false: design.cardBorder,
                            true: design.lightBlue,
                          }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor={design.cardBorder}
                        />
                      ) : (
                        <>
                          {item.rightText && (
                            <Text
                              style={[
                                styles.settingsRightText,
                                { color: design.muted },
                              ]}
                              numberOfLines={1}
                            >
                              {item.rightText}
                            </Text>
                          )}
                          {isRtl ? (
                            <ChevronLeft size={18} color={design.muted} />
                          ) : (
                            <ChevronRight size={18} color={design.muted} />
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Sower status ────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.sowerCard,
                { backgroundColor: design.cardBg, borderColor: design.cardBorder },
              ]}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <View style={styles.sowerRow}>
                <View style={styles.sowerInfo}>
                  <Text style={[styles.sowerLabel, { color: design.muted }]}>
                    {translations?.profile?.sowerStatus?.label || 'Account Status'}
                  </Text>
                  <Text style={[styles.sowerValue, { color: design.title }]}>
                    {accountLabel}
                  </Text>
                  {subscriptionTier !== 'free' && app?.accessExpiresAt && (
                    <Text style={[styles.sowerExpiry, { color: design.muted }]}>
                      Renews{' '}
                      {new Date(app.accessExpiresAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View style={[styles.managePill, { backgroundColor: design.pillBg }]}>
                  <Text style={[styles.managePillText, { color: design.pillText }]}>
                    {subscriptionTier === 'free' ? 'Subscribe' : 'Manage'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ── Logout ──────────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.logoutBtn,
                {
                  backgroundColor: design.cardBg,
                  borderColor: design.cardBorder,
                },
                loggingOut && styles.logoutDimmed,
              ]}
              onPress={() => setShowLogout(true)}
              activeOpacity={0.7}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#F87171" />
              ) : (
                <LogOut size={18} color="#F87171" />
              )}
              <Text style={styles.logoutText}>
                {loggingOut
                  ? t('profile.logout.loggingOut') ||
                    (translations.profile &&
                      translations.profile.logout?.loggingOut) ||
                    'Logging out…'
                  : t('profile.logout.logout') ||
                    (translations.profile &&
                      translations.profile.logout?.logout) ||
                    'Logout'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* ── Modals ─────────────────────────────────────────────────────── */}
          <ActionModal
            visible={showLogout}
            severity="warning"
            title={
              t('profile.logout.confirmTitle') ||
              (translations.profile && translations.profile.logout?.confirmTitle) ||
              'Logout'
            }
            message={
              t('profile.logout.confirmMessage') ||
              (translations.profile &&
                translations.profile.logout?.confirmMessage) ||
              'Are you sure you want to logout from your account?'
            }
            confirmLabel={
              t('profile.logout.confirmLabel') ||
              (translations.profile && translations.profile.logout?.confirmLabel) ||
              'Logout'
            }
            cancelLabel={
              t('profile.logout.cancelLabel') ||
              (translations.profile && translations.profile.logout?.cancelLabel) ||
              'Cancel'
            }
            onCancel={() => setShowLogout(false)}
            onConfirm={handleLogout}
          />

          <LanguagePickerModal
            visible={langModalOpen}
            onRequestClose={() => setLangModalOpen(false)}
          />

          <ActionModal
            visible={modal.status}
            title={modal.title}
            message={modal.message}
            severity={modal.severity}
            onConfirm={() => setModal({ ...modal, status: false })}
          />
        </>
      )}

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    flex: 1,
    minWidth: 0,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBrandRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerBrandText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  headerTitleRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerHandle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  viewProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '700',
  },

  content: {
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },

  // ── Settings ──
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  settingsCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  settingsRowRtl: {
    flexDirection: 'row-reverse',
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  settingsRightText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 2,
    maxWidth: 110,
  },

  // ── Sower status ──
  sowerCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  sowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sowerInfo: {
    flex: 1,
  },
  sowerLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sowerValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  sowerExpiry: {
    fontSize: 11,
    marginTop: 3,
  },
  managePill: {
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  managePillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Logout ──
  logoutBtn: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F87171',
  },
  logoutDimmed: {
    opacity: 0.6,
  },

  // ── Bottom tab ──
  bottomTabWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

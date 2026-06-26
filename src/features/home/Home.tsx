import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StyleSheet,
} from 'react-native';
import {
  Star,
  History,
  Heart,
  ArrowRight,
  ArrowLeft,
  MenuSquareIcon,
  Clock,
  CalendarDays,
  Brain,
  BookMarked,
  Globe,
  HelpCircle,
  CheckCircle,
  BookOpen,
  GraduationCap,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import BottomTab from '../../component/navigations/BottomTab';
import { route } from '../../component/navigations/routes';
import { sendPostRequest } from '../../services/api';
import { formatWhatsAppTime } from '../../utilits/bibleUtils';
import ActionHeader from '../../reusable/ActionHeader';
import { createStyles } from './homeStyle';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import { showToast } from '../../helpers/Toash.helper';

// ── Types ─────────────────────────────────────────────────────────────────────
type ActivityType = 'read' | 'highlight' | 'note' | 'favorite' | 'plan';

type RecentActivityItem = {
  type: ActivityType;
  id: number;
  book: string;
  chapter: number;
  verse: number;
  colorId?: number;
  time: string;
};

type Stats = {
  chaptersRead: number;
  highlights: number;
  notes: number;
  bookmarks: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getGreeting = (translations?: any): string => {
  const h = new Date().getHours();
  if (h < 12) return translations?.home?.greetings?.morning ?? 'Good Morning,';
  if (h < 17)
    return translations?.home?.greetings?.afternoon ?? 'Good Afternoon,';
  return translations?.home?.greetings?.evening ?? 'Good Evening,';
};

const safeNumber = (v: any): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const getTodayLabel = (languageCode = 'en'): string => {
  const locale = languageCode === 'en' ? 'en-US' : languageCode;
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const userInfo = app?.userInfo ?? null;
  const isDark = app?.isDark ?? false;
  const toggleTheme = app?.toggleTheme ?? (() => {});
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats>({
    chaptersRead: 0,
    highlights: 0,
    notes: 0,
    bookmarks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    [],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [bottomTabVisible, setBottomTabVisible] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;


  const { language, translations: translation } = useLanguage();
  const isRtl = isRtlLanguage(language);
  // ── Banners & Quick Links ─────────────────────────────────────────────────
  const contentBanners = useMemo(
    () => [
      {
        id: 'daily',
        label: 'Daily Exegesis',
        icon: Star,
        onPress: () => navigation.navigate(route.dailyDevotional),
      },
      {
        id: 'bible',
        label: 'Bible',
        icon: BookOpen,
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'journal',
        label: 'Journals',
        icon: BookMarked,
        onPress: () => navigation.navigate(route.legacyLedger),
      },
      {
        id: 'plan',
        label: 'Reading Plans',
        icon: CalendarDays,
        onPress: () => navigation.navigate(route.readingPlan),
      },
      {
        id: 'trivial',
        label: 'Bible Trivial',
        icon: Brain,
        onPress: () => navigation.navigate(route.home),
      },
      {
        id: 'study',
        label: 'Bible Study',
        icon: GraduationCap,
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'lordsbook',
        label: 'LordsBook',
        icon: Heart,
        onPress: () => navigation.navigate(route.home),
      },
      {
        id: 'resources',
        label: 'Resources',
        icon: Globe,
        onPress: () => navigation.navigate(route.home),
      },
      {
        id: 'support',
        label: 'Support',
        icon: HelpCircle,
        onPress: () => navigation.navigate(route.home),
      },
      {
        id: 'community',
        label: 'Community Feeds',
        icon: History,
        onPress: () => navigation.navigate(route.home),
      },
    ],
    [navigation, translation],
  );

  const quickLinks = useMemo(
    () => [
      {
        id: '1',
        title: translation?.home?.quickLinks?.notes || 'Notes',
        icon: MenuSquareIcon,
        color: COLORS.primary,
        route: route.notes,
      },
      {
        id: '2',
        title: translation?.home?.quickLinks?.history || 'History',
        icon: History,
        color: '#10B981',
        route: route.readHistory,
      },
      {
        id: '3',
        title: translation?.home?.quickLinks?.highlights || 'Highlights',
        icon: Star,
        color: '#F59E0B',
        route: route.Highlights,
      },
      {
        id: '4',
        title: translation?.home?.quickLinks?.favorites || 'Favorites',
        icon: Heart,
        color: '#8B5CF6',
        route: route.favorites,
      },
    ],
    [COLORS.primary, translation],
  );

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const formatActivityTime = (act: any): string => {
    try {
      if (act.formattedTime) return act.formattedTime;
      const timeVal = act.time;
      if (!timeVal || typeof timeVal !== 'object') {
        if (typeof timeVal === 'string') return formatWhatsAppTime(timeVal, language);
        return translation?.home?.recentLabel || 'Recent';
      }
      const timeStr = timeVal.createdOn || timeVal.updatedOn;
      if (!timeStr) return translation?.home?.recentLabel || 'Recent';
      const time = new Date(timeStr);
      if (isNaN(time.getTime()))
        return translation?.home?.recentLabel || 'Recent';
      return formatWhatsAppTime(timeStr, language);
    } catch {
      return translation?.home?.recentLabel || 'Recent';
    }
  };

  const loadHomeStats = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        sendPostRequest('bible', 'get-home-stats', {}),
        sendPostRequest('bible', 'get-recent-activity', { limit: 10 }),
        
      ]);

      if (statsRes.returnCode === 200) {
        const d = statsRes.returnData;
        setStats({
          chaptersRead: d.readHistoryCount ?? 0,
          highlights: d.highlightCount ?? 0,
          notes: d.noteCount ?? 0,
          bookmarks: d.favoriteCount ?? 0,
        });

        const activities = (activityRes.returnData || []).map((act: any) => ({
          type: act.type,
          id: act.id,
          book: act.book,
          chapter: act.chapter,
          verse: act.verse,
          colorId: act.colorId,
          time: formatActivityTime(act),
        }));
        setRecentActivity(activities);
      }
    } catch (e) {
      console.error('Error loading home stats:', e);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userInfo) {
      loadHomeStats();
    }
  }, [loadHomeStats, userInfo]);

  useFocusEffect(
    useCallback(() => {
      if (!userInfo) return;
      loadHomeStats();
    }, [loadHomeStats, userInfo]),
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHomeStats();
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeStats]);

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

  // ── Render ────────────────────────────────────────────────────────────────
  if (!app || !userInfo) return null;

  return (
    <View style={styles.container}>
      <ActionHeader
        mode="home"
        greeting={getGreeting(translation)}
        userName={userInfo?.lastName + ' ' + userInfo?.firstName || 'Friend'}
        tagline={
          translation?.appTagline ||
          'Your Practical Application Bible for Daily Guidance'
        }
        isDarkMode={isDark}
        onThemeToggle={toggleTheme}
        onSearchPress={() => navigation.navigate(route.search)}
        profilePhotoUrl={userInfo?.profilePhotoUrl}
        onProfilePress={() => navigation.navigate(route.profile)}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >


        {/* ── Content Banners ── */}
        <View style={styles.bannersSection}>
          {contentBanners.map((btn, idx) => {
            const Icon = btn.icon;
            return (
              <TouchableOpacity
                key={btn.id}
                activeOpacity={0.85}
                onPress={btn.onPress}
                style={[
                  styles.bannerRow,
                  isRtl && styles.bannerRowRtl,
                  { backgroundColor: COLORS.primary },
                ]}
              >
                <View style={styles.bannerIconWrap}>
                  <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
                </View>
                <Text style={styles.bannerLabel}>{btn.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {translation?.home?.quickActionsTitle || 'Quick Actions'}
          </Text>
          <View style={[styles.quickLinksCompact, isRtl && styles.quickLinksCompactRtl]}>
            {quickLinks.map(link => (
              <TouchableOpacity
                key={link.id}
                style={styles.quickLinkCompactCard}
                onPress={() => navigation.navigate(link.route)}
              >
                <View
                  style={[
                    styles.quickLinkCompactIcon,
                    { backgroundColor: link.color + '20' },
                  ]}
                >
                  <link.icon size={20} color={link.color} />
                </View>
                <Text style={styles.quickLinkCompactText} numberOfLines={1}>
                  {link.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {translation?.home?.yourStatsTitle || 'Your Stats'}
          </Text>
          <View style={[styles.statsGrid, isRtl && styles.statsGridRtl]}>
            {[
              {
                label: translation?.profile?.stats?.chapters || 'Chapters',
                value: safeNumber(stats.chaptersRead),
                color: COLORS.primary,
              },
              {
                label: translation?.profile?.stats?.highlights || 'Highlights',
                value: safeNumber(stats.highlights),
                color: '#F59E0B',
              },
              {
                label: translation?.profile?.stats?.notes || 'Notes',
                value: safeNumber(stats.notes),
                color: '#10B981',
              },
              {
                label:
                  translation?.profile?.menuItems?.favorites || 'Favorites',
                value: safeNumber(stats.bookmarks),
                color: '#8B5CF6',
              },
            ].map((stat, idx) => (
              <View
                key={`stat-${idx}`}
                style={[
                  styles.statCard,
                  { backgroundColor: COLORS.cardBackground },
                ]}
              >
                <Text style={[styles.statValue, { color: stat.color }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: COLORS.muted }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRtl && styles.sectionHeaderRtl]}>
            <Text style={styles.sectionTitle}>
              {translation?.home?.recentActivityTitle || 'Recent Activity'}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(route.readHistory)}
            >
              <Text style={[styles.sectionAction, { color: COLORS.primary }]}>
                {translation?.home?.seeAll || 'See All'}
              </Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <View
              style={[
                activityStyles.emptyCard,
                { backgroundColor: COLORS.cardBackground },
              ]}
            >
              <Text style={[activityStyles.emptyText, { color: COLORS.muted }]}>
                {translation?.home?.startReadingTip ||
                  'Start reading to see your activity here'}
              </Text>
            </View>
          ) : (
            <View style={activityStyles.activityList}>
              {recentActivity.map((act, idx) => {
                const ActivityIcon =
                  act.type === 'read'
                    ? Clock
                    : act.type === 'highlight'
                      ? Star
                      : act.type === 'note'
                        ? MenuSquareIcon
                        : act.type === 'plan'
                          ? CheckCircle
                          : Heart;

                const iconColor =
                  act.type === 'read'
                    ? '#6366F1'
                    : act.type === 'highlight'
                      ? '#F59E0B'
                      : act.type === 'note'
                        ? '#10B981'
                        : act.type === 'plan'
                          ? '#00695C'
                          : '#EC4899';

                const label =
                  act.type === 'read'
                    ? translation?.home?.activityLabels?.reading || 'Reading'
                    : act.type === 'highlight'
                      ? translation?.home?.activityLabels?.highlighted ||
                        'Highlighted'
                      : act.type === 'note'
                        ? translation?.home?.activityLabels?.noted || 'Noted'
                        : act.type === 'plan'
                          ? translation?.home?.activityLabels?.planProgress ||
                            'Plan Progress'
                          : translation?.home?.activityLabels?.favorited ||
                            'Favorited';

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      activityStyles.activityCard,
                      isRtl && activityStyles.activityCardRtl,
                      { backgroundColor: COLORS.cardBackground },
                    ]}
                    onPress={() =>
                      act.type === 'plan'
                        ? navigation.navigate(route.readingPlan)
                        : navigation.navigate(route.bible, {
                            bookName: act.book,
                            chapter: act.chapter,
                          })
                    }
                  >
                    <View
                      style={[
                        activityStyles.iconBox,
                        isRtl && activityStyles.iconBoxRtl,
                        { backgroundColor: iconColor + '20' },
                      ]}
                    >
                      <ActivityIcon size={18} color={iconColor} />
                    </View>
                    <View style={activityStyles.activityContent}>
                      <View style={[activityStyles.activityTop, isRtl && activityStyles.activityTopRtl]}>
                        <Text
                          style={[
                            activityStyles.activityLabel,
                            { color: iconColor },
                          ]}
                        >
                          {label}
                        </Text>
                        <Text
                          style={[
                            activityStyles.activityTime,
                            { color: COLORS.muted },
                          ]}
                        >
                          {act.time}
                        </Text>
                      </View>
                      <Text
                        style={[
                          activityStyles.activityVerse,
                          { color: COLORS.text },
                        ]}
                      >
                        {act.book} {act.chapter}:{act.verse}
                      </Text>
                    </View>
                    {isRtl ? (
                      <ArrowLeft size={16} color={COLORS.muted} />
                    ) : (
                      <ArrowRight size={16} color={COLORS.muted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>



      {/* ── Bottom Tab ── */}
      <Animated.View
        style={[
          styles.bottomTabWrapper,
          {
            transform: [
              {
                translateY: tabBarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: tabBarAnimation,
          },
        ]}
      >
        <BottomTab activeTab="home" setActiveTab={() => {}} />
      </Animated.View>
    </View>
  );
}

// ── Activity Styles ────────────────────────────────────────────────────────────
const activityStyles = StyleSheet.create({
  emptyCard: { padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  activityList: { gap: 8 },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityCardRtl: {
    flexDirection: 'row-reverse',
  },
  iconBoxRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  activityTopRtl: {
    flexDirection: 'row-reverse',
  },
  activityContent: { flex: 1 },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityTime: { fontSize: 11 },
  activityVerse: { fontSize: 14, fontWeight: '500' },
});
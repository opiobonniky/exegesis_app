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
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import {
  Star,
  History,
  Heart,
  ArrowRight,
  MenuSquareIcon,
  Clock,
  StarsIcon,
  CalendarDays,
  HandHeart,
  Mic2,
  Brain,
  BookMarked,
  Globe,
  HelpCircle,
  CheckCircle,
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
import { bibleTTS } from '../../utilits/bibleTTS';
import { connectSocket } from '../../services/socket/socketClient';

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

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
};

const safeNumber = (v: any): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

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

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    chaptersRead: 0,
    highlights: 0,
    notes: 0,
    bookmarks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    [],
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bottomTabVisible, setBottomTabVisible] = useState(true);
  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  const VERSE_POLL_MS = __DEV__ ? 6000 : 5 * 60 * 1000;

  // ── Content buttons ────────────────────────────────────────────────────────

  const contentButtons = useMemo(
    () => [
      {
        id: '1',
        label: 'Exegesis Bible',
        icon: CalendarDays,
        color: '#1565C0',
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: '2',
        label: 'Daily Devotions',
        icon: HandHeart,
        color: '#2E7D32',
        onPress: () => navigation.navigate(route.dailyDevotional), // replace with your prayer wall route
      },
      {
        id: '3',
        label: 'Testify',
        icon: Mic2,
        color: '#E65100',
        onPress: () => navigation.navigate(route.home), // replace with testify route
      },
      {
        id: '4',
        label: 'Bible Trivia',
        icon: Brain,
        color: '#F9A825',
        onPress: () => navigation.navigate(route.home), // replace with trivia route
      },
      {
        id: '5',
        label: 'Daily Prayers',
        icon: BookMarked,
        color: '#6A1B9A',
        onPress: () => navigation.navigate(route.home), // replace with prayers route
      },
      {
        id: '6',
        label: 'Reading Plan',
        icon: Globe,
        color: '#00695C',
        onPress: () => navigation.navigate(route.readingPlan),
      },
      {
        id: '7',
        label: 'Support',
        icon: HelpCircle,
        color: '#C62828',
        onPress: () => navigation.navigate(route.home), // replace with support route
      },
    ],
    [navigation],
  );

  // ── Quick links ────────────────────────────────────────────────────────────

  const quickLinks = useMemo(
    () => [
      {
        id: '1',
        title: 'Notes',
        icon: MenuSquareIcon,
        color: COLORS.primary,
        route: route.notes,
      },
      {
        id: '2',
        title: 'History',
        icon: History,
        color: '#10B981',
        route: route.readHistory,
      },
      {
        id: '3',
        title: 'Highlights',
        icon: Star,
        color: '#F59E0B',
        route: route.Highlights,
      },
      {
        id: '4',
        title: 'Favorites',
        icon: Heart,
        color: '#8B5CF6',
        route: route.favorites,
      },
    ],
    [COLORS.primary],
  );

  // ── Data fetching ──────────────────────────────────────────────────────────

  const formatActivityTime = (act: any): string => {
    try {
      const timeVal = act.time;
      if (!timeVal || typeof timeVal !== 'object') {
        if (typeof timeVal === 'string') return formatWhatsAppTime(timeVal);
        return 'Recent';
      }
      const timeStr = timeVal.createdOn || timeVal.updatedOn;
      if (!timeStr) return 'Recent';
      const time = new Date(timeStr);
      if (isNaN(time.getTime())) return 'Recent';
      return formatWhatsAppTime(timeStr);
    } catch {
      return 'Recent';
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

        console.log('Home Stats response:', JSON.stringify(statsRes));
        console.log('Recent Activity response:', JSON.stringify(activityRes));

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

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (userInfo) {
      loadHomeStats();
    }
    const unsubscribe = bibleTTS.subscribe(state => {
      setIsPlaying(state.isPlaying);
      setIsPaused(state.isPaused);
    });
    return unsubscribe;
  }, [loadHomeStats, userInfo]);

  useFocusEffect(
    useCallback(() => {
      if (!userInfo) return;
      loadHomeStats();
    }, [loadHomeStats, userInfo]),
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!app || !userInfo) return null;

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <ActionHeader
        mode="home"
        greeting={getGreeting()}
        userName={userInfo?.lastName || 'Friend'}
        tagline="Your Practical Application Bible for Daily Guidance"
        isDarkMode={isDark}
        onThemeToggle={toggleTheme}
        profilePhotoUrl={userInfo?.profilePhotoUrl}
        onProfilePress={() => navigation.navigate(route.profile)}
      />

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <ScrollView
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
        {/* ── Content Buttons ────────────────────────────────────────────── */}
        <View style={contentStyles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
            Content
          </Text>
          {contentButtons.map(btn => {
            const Icon = btn.icon;
            return (
              <TouchableOpacity
                key={btn.id}
                activeOpacity={0.82}
                onPress={btn.onPress}
                style={[contentStyles.button, { backgroundColor: btn.color }]}
              >
                <View style={contentStyles.iconWrap}>
                  <Icon
                    size={22}
                    color="rgba(255,255,255,0.9)"
                    strokeWidth={1.8}
                  />
                </View>
                <Text style={contentStyles.label}>{btn.label}</Text>
                <ArrowRight size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickLinksCompact}>
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

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>

          <View style={styles.progressRow}>
            <View style={[styles.progressCard, { marginRight: 0 }]}>
              <Text style={styles.progressLabel}>Chapters Visited</Text>
              <Text style={styles.progressNumber}>
                {safeNumber(stats.chaptersRead)}
              </Text>
            </View>
            <View style={[styles.progressCard, { marginRight: 0 }]}>
              <Text style={styles.progressLabel}>Highlights</Text>
              <Text style={styles.progressNumber}>
                {safeNumber(stats.highlights)}
              </Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={[styles.progressCard, { marginRight: 0 }]}>
              <Text style={styles.progressLabel}>Notes</Text>
              <Text style={styles.progressNumber}>
                {safeNumber(stats.notes)}
              </Text>
            </View>
            <View style={[styles.progressCard, { marginRight: 0 }]}>
              <Text style={styles.progressLabel}>Favorites</Text>
              <Text style={styles.progressNumber}>
                {safeNumber(stats.bookmarks)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Recent Activity ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(route.readHistory)}
            >
              <Text style={[styles.sectionAction, { color: COLORS.primary }]}>
                See All
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
                Start reading to see your activity here
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
                    ? 'Reading'
                    : act.type === 'highlight'
                      ? 'Highlighted'
                      : act.type === 'note'
                        ? 'Noted'
                        : act.type === 'plan'
                          ? 'Plan Progress'
                          : 'Favorited';

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      activityStyles.activityCard,
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
                        { backgroundColor: iconColor + '20' },
                      ]}
                    >
                      <ActivityIcon size={18} color={iconColor} />
                    </View>
                    <View style={activityStyles.activityContent}>
                      <View style={activityStyles.activityTop}>
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
                    <ArrowRight size={16} color={COLORS.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Tab ──────────────────────────────────────────────────── */}
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

// ── Content button styles (self-contained) ────────────────────────────────────

const contentStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});

// ── Activity styles ───────────────────────────────────────────────────────────────

const activityStyles = StyleSheet.create({
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  activityList: {
    gap: 8,
  },
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
  activityContent: {
    flex: 1,
  },
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
  activityTime: {
    fontSize: 11,
  },
  activityVerse: {
    fontSize: 14,
    fontWeight: '500',
  },
});

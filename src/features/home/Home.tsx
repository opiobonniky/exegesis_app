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
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Star,
  CalendarDays,
  Brain,
  BookMarked,
  Globe,
  HelpCircle,
  BookOpen,
  GraduationCap,
  BookText,
  CalendarCheck,
  Heart,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import BottomTab from '../../component/navigations/BottomTab';
import { route } from '../../component/navigations/routes';
import { sendPostRequest } from '../../services/api';
import { getTriviaStats } from '../trivia/services/triviaApi';
import { useSubscription } from '../../hooks/useSubscription';
import { formatWhatsAppTime } from '../../utilits/bibleUtils';
import ActionHeader from '../../reusable/ActionHeader';
import {
  GreetingCard,
  ContinueReadingCard,
  DailyVerseCard,
  DailyDevotionCard,
  StatsRow,
  QuickAccess,
  RecentActivity,
  LabCard,
} from './cards';
import { createStyles, getHomeDesign } from './homeStyle';
import {
  useLanguage,
  isRtlLanguage,
} from '../../component/language-translation/LanguageProvider';
import {
  saveDailyVerseCache,
  loadDailyVerseCache,
  getLocalISODate,
  normalizeDailyVerse,
} from './dailyVerseCache';
import HomeSkeleton from './HomeSkeleton';

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
  booksRead: number;
  chaptersRead: number;
  planProgress: number;
  trivia: number;
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

const BANNER_COLORS = [
  '#396284',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#0EA5E9',
  '#6366F1',
  '#EF4444',
];

// Rough per-book chapter map so Continue Reading can show a progress %.
const BOOK_CHAPTER_COUNTS: Record<string, number> = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  '1 Samuel': 31,
  '2 Samuel': 24,
  '1 Kings': 22,
  '2 Kings': 25,
  '1 Chronicles': 29,
  '2 Chronicles': 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  'Song of Solomon': 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  '1 Corinthians': 16,
  '2 Corinthians': 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  '1 Thessalonians': 5,
  '2 Thessalonians': 3,
  '1 Timothy': 6,
  '2 Timothy': 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  '1 Peter': 5,
  '2 Peter': 3,
  '1 John': 5,
  '2 John': 1,
  '3 John': 1,
  Jude: 1,
  Revelation: 22,
};

const computeReadingProgress = (pos: {
  bookName: string;
  chapter: number;
}): number => {
  const total = BOOK_CHAPTER_COUNTS[pos.bookName] || 1;
  const pct = (pos.chapter / total) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
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
  const design = useMemo(() => getHomeDesign(isDark), [isDark]);
  const { hasAccess } = useSubscription();

  // ── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats>({
    booksRead: 0,
    chaptersRead: 0,
    planProgress: 0,
    trivia: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    [],
  );
  const [lastBiblePosition, setLastBiblePosition] = useState<{
    bookName: string;
    chapter: number;
  } | null>(null);
  const [todaysVerse, setTodaysVerse] = useState<any | null>(null);
  const [todaysDevotion, setTodaysDevotion] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        onPress: () => navigation.navigate(route.dailyExegesis),
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
        onPress: () =>
          hasAccess('legacy_sower')
            ? navigation.navigate(route.legacyLedger)
            : navigation.navigate(route.sower),
      },
      {
        id: 'plan',
        label: 'Reading Plans',
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
        label: 'Bible Study',
        icon: GraduationCap,
        onPress: () => navigation.navigate(route.lab),
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
        onPress: () => navigation.navigate(route.verseResources),
      },
      {
        id: 'support',
        label: 'Support',
        icon: HelpCircle,
        onPress: () => navigation.navigate(route.home),
      },
    ],
    [navigation, hasAccess],
  );

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const formatActivityTime = useCallback(
    (act: any): string => {
      try {
        if (act.formattedTime) return act.formattedTime;
        const timeVal = act.time;
        if (!timeVal || typeof timeVal !== 'object') {
          if (typeof timeVal === 'string')
            return formatWhatsAppTime(timeVal, language);
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
    },
    [language, translation],
  );

  const loadHomeStats = useCallback(async () => {
    try {
      const [statsRes, activityRes, verseRes, devotionRes, triviaRes] =
        await Promise.all([
          sendPostRequest('bible', 'get-home-stats', {}).catch(() => null),
          sendPostRequest('bible', 'get-recent-activity', { limit: 10 }).catch(
            () => null,
          ),
          sendPostRequest('bible', 'get-todays-verse', {}).catch(() => null),
          sendPostRequest('bible', 'get-todays-devotion', {}).catch(() => null),
          getTriviaStats().catch(() => null),
        ]);

      if (statsRes?.returnCode === 200) {
        const d = statsRes.returnData || {};
        setStats({
          booksRead: Number(d.booksRead ?? 0),
          chaptersRead: Number(d.chaptersRead ?? 0),
          planProgress: Number(d.planProgressCount ?? 0),
          trivia: Number(triviaRes?.totalAnswered ?? 0),
        });
      }

      if (activityRes?.returnData) {
        const activities = activityRes.returnData.map((act: any) => ({
          type: act.type,
          id: act.id,
          book: act.book,
          chapter: act.chapter,
          verse: act.verse,
          colorId: act.colorId,
          time: formatActivityTime(act),
        }));
        setRecentActivity(activities);

        // Approximate "Books Read" from distinct books in recent activity
        // (the backend doesn't expose a booksRead field yet)
        const booksRead = new Set(
          activityRes.returnData.map((act: any) => act.book).filter(Boolean),
        ).size;
        if (booksRead > 0) {
          setStats(prev => ({ ...prev, booksRead }));
        }
      }

      // Today's verse — cache on success, fallback to cache on failure
      if (verseRes?.returnCode === 200 && verseRes?.returnData) {
        setTodaysVerse(verseRes.returnData);
        try {
          const cached = normalizeDailyVerse(
            verseRes.returnData,
            getLocalISODate(),
            'rest',
          );
          if (cached) saveDailyVerseCache(cached);
        } catch {}
      } else {
        try {
          const cached = await loadDailyVerseCache();
          if (cached) {
            setTodaysVerse({
              bookName: cached.bookName,
              chapter: cached.chapter,
              verseNumber: cached.verseNumber,
              text: cached.text,
              reference: `${cached.bookName} ${cached.chapter}:${cached.verseNumber}`,
            });
          } else {
            setTodaysVerse(null);
          }
        } catch {
          setTodaysVerse(null);
        }
      }

      // Today's devotion — cache on success, fallback to cache on failure
      if (devotionRes?.returnCode === 200 && devotionRes?.returnData) {
        setTodaysDevotion(devotionRes.returnData);
        try {
          await AsyncStorage.setItem(
            'daily_devotion_cache',
            JSON.stringify({
              date: getLocalISODate(),
              data: devotionRes.returnData,
            }),
          );
        } catch {}
      } else {
        try {
          const devotionRaw = await AsyncStorage.getItem(
            'daily_devotion_cache',
          );
          if (devotionRaw) {
            const devotionCached = JSON.parse(devotionRaw);
            if (devotionCached.date === getLocalISODate()) {
              setTodaysDevotion(devotionCached.data);
            } else {
              setTodaysDevotion(null);
            }
          } else {
            setTodaysDevotion(null);
          }
        } catch {
          setTodaysDevotion(null);
        }
      }
    } catch (e) {
      console.error('Error loading home stats:', e);
    }
  }, [formatActivityTime]);

  const loadBiblePosition = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('bible_last_position');
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos.bookName && pos.chapter) {
          setLastBiblePosition({
            bookName: pos.bookName,
            chapter: Number(pos.chapter),
          });
          return;
        }
      }
      setLastBiblePosition(null);
    } catch {
      setLastBiblePosition(null);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  const loadAllHomeData = useCallback(async () => {
    await Promise.all([loadHomeStats(), loadBiblePosition()]);
  }, [loadHomeStats, loadBiblePosition]);

  useEffect(() => {
    if (userInfo) {
      loadAllHomeData().finally(() => setIsLoading(false));
    }
  }, [userInfo, loadAllHomeData]);

  useFocusEffect(
    useCallback(() => {
      if (!userInfo) return;
      // Initial load is handled above (with the skeleton); refresh silently on refocus.
      loadAllHomeData();
    }, [userInfo, loadAllHomeData]),
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
  return (
    <View style={[styles.container, { backgroundColor: design.pageBg }]}>
      {!app || !userInfo ? (
        <View
          style={[styles.loadingContainer, { backgroundColor: design.pageBg }]}
        >
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <>
          <ActionHeader
            mode="home"
            hideProfile
            onSearchPress={() => navigation.navigate(route.search)}
            profilePhotoUrl={userInfo?.profilePhotoUrl}
            onProfilePress={() => navigation.navigate(route.profile)}
          />

          {isLoading ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <HomeSkeleton design={design} />
            </ScrollView>
          ) : (
            <>
              <GreetingCard
                design={design}
                isRtl={isRtl}
                greeting={getGreeting(translation)}
                userName={
                  [userInfo?.firstName, userInfo?.lastName]
                    .filter(Boolean)
                    .join(' ') || 'Friend'
                }
                encouragement={
                  translation?.home?.greetingMessage ||
                  'We encourage you to search the scriptures daily just like Paul told the Bereans. Please jump into the word, get consistent and build daily spiritual disciplines.'
                }
                isDarkMode={isDark}
                onThemeToggle={toggleTheme}
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
                {/* ── Continue Reading (with progress bar) ── */}
                {lastBiblePosition && (
                  <ContinueReadingCard
                    design={design}
                    isRtl={isRtl}
                    bookName={lastBiblePosition.bookName}
                    chapter={lastBiblePosition.chapter}
                    progressPercent={computeReadingProgress(lastBiblePosition)}
                    label={
                      translation?.home?.continueReadingTitle ||
                      'Continue Reading'
                    }
                    progressLabel={translation?.home?.progress || 'Progress'}
                    continueLabel={
                      translation?.home?.continueReadingTitle || 'Continue'
                    }
                    onPress={() =>
                      navigation.navigate(route.bible, {
                        bookName: lastBiblePosition.bookName,
                        chapter: lastBiblePosition.chapter,
                      })
                    }
                  />
                )}

                {/* ── Daily Verse Card ── */}
                {todaysVerse && (
                  <DailyVerseCard
                    design={design}
                    isRtl={isRtl}
                    reference={
                      todaysVerse.reference ||
                      `${todaysVerse.bookName} ${todaysVerse.chapter}:${todaysVerse.verseNumber}`
                    }
                    text={todaysVerse.text}
                    label={
                      translation?.home?.dailyVerseTitle ||
                      translation?.bible?.dailyVerse ||
                      'Daily Verse'
                    }
                    readLabel={
                      translation?.home?.readExplanation || 'Read Explanation'
                    }
                    onPress={() => navigation.navigate(route.dailyExegesis)}
                  />
                )}

                {/* ── Daily Devotion Card ── */}
                {todaysDevotion && (
                  <DailyDevotionCard
                    design={design}
                    isRtl={isRtl}
                    subtitle={todaysDevotion.title || "Today's devotion"}
                    content={todaysDevotion.content || ''}
                    label={
                      translation?.bible?.dailyDevotionalTitle ||
                      translation?.home?.dailyDevotionTitle ||
                      'Daily Devotion'
                    }
                    readLabel={
                      translation?.home?.readDevotion || 'Read Devotion'
                    }
                    onPress={() => navigation.navigate(route.dailyDevotional)}
                  />
                )}

                {/* ── Exegesis Lab ── */}
                <LabCard
                  design={design}
                  isRtl={isRtl}
                  title={translation?.home?.labCardTitle || 'Exegesis Lab'}
                  subtitle={
                    translation?.home?.labCardSubtitle ||
                    'A guided 5-step journey through any passage — Look, Listen, Learn, Abide, and Apply.'
                  }
                  startLabel={translation?.home?.labStartStudy || 'Start Study'}
                  durationHint={
                    translation?.home?.labDurationHint || '5 steps · 30–60 min'
                  }
                  onPress={() => navigation.navigate(route.lab)}
                />

                <StatsRow
                  design={design}
                  isRtl={isRtl}
                  title={translation?.home?.statsTitle || 'Your Stats'}
                  stats={[
                    {
                      value: safeNumber(stats.booksRead),
                      label: translation?.home?.stats?.booksRead || 'Books Read',
                      icon: BookOpen,
                      color: design.blue,
                    },
                    {
                      value: safeNumber(stats.chaptersRead),
                      label:
                        translation?.home?.stats?.chaptersRead ||
                        'Chapters Read',
                      icon: BookText,
                      color: design.green,
                    },
                    {
                      value: safeNumber(stats.planProgress),
                      label:
                        translation?.home?.stats?.readingPlan || 'Reading Plan',
                      icon: CalendarCheck,
                      color: design.accent,
                    },
                    {
                      value: safeNumber(stats.trivia),
                      label: translation?.home?.stats?.trivia || 'Trivia',
                      icon: Brain,
                      color: design.purple,
                    },
                  ]}
                />

                {/* ── Quick Access (content banners) ── */}
                <QuickAccess
                  design={design}
                  isRtl={isRtl}
                  title={translation?.home?.quickActionsTitle || 'Quick Actions'}
                  items={contentBanners.map((b, idx) => ({
                    id: b.id,
                    label: b.label,
                    icon: b.icon,
                    color: BANNER_COLORS[idx % BANNER_COLORS.length],
                    onPress: b.onPress,
                  }))}
                />

                {/* ── Stats ── */}

                {/* ── Recent Activity ── */}
                <RecentActivity
                  design={design}
                  isRtl={isRtl}
                  items={recentActivity}
                  title={
                    translation?.home?.recentActivityTitle || 'Recent Activity'
                  }
                  seeAllLabel={translation?.home?.seeAll || 'See All'}
                  emptyMessage={
                    translation?.home?.startReadingTip ||
                    'Start reading to see your activity here'
                  }
                  labels={{
                    read:
                      translation?.home?.activityLabels?.reading || 'Reading',
                    highlight:
                      translation?.home?.activityLabels?.highlighted ||
                      'Highlighted',
                    note: translation?.home?.activityLabels?.noted || 'Noted',
                    plan:
                      translation?.home?.activityLabels?.planProgress ||
                      'Plan Progress',
                    favorite:
                      translation?.home?.activityLabels?.favorited ||
                      'Favorited',
                  }}
                  onSeeAll={() => navigation.navigate(route.readHistory)}
                  onPressItem={act => {
                    if (act.type === 'plan') {
                      navigation.navigate(
                        hasAccess('legacy_sower')
                          ? route.readingPlan
                          : route.sower,
                      );
                    } else {
                      navigation.navigate(route.bible, {
                        bookName: act.book,
                        chapter: act.chapter,
                      });
                    }
                  }}
                />
              </ScrollView>
            </>
          )}
        </>
      )}

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

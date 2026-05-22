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
  Image,
} from 'react-native';
import {
  Star,
  History,
  Heart,
  ArrowRight,
  MenuSquareIcon,
  Clock,
  CalendarDays,
  Brain,
  BookMarked,
  Globe,
  HelpCircle,
  CheckCircle,
  Volume2,
  Share2,
  ChevronDown,
  Play,
  BookOpen,
  GraduationCap,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import BottomTab from '../../component/navigations/BottomTab';
import { route } from '../../component/navigations/routes';
import { sendPostRequest } from '../../services/api';
import { formatWhatsAppTime, getVerseText } from '../../utilits/bibleUtils';
import ActionHeader from '../../reusable/ActionHeader';
import { createStyles } from './homeStyle';
import { bibleTTS } from '../../utilits/bibleTTS';
import { useLanguage } from '../../component/language-translation/LanguageProvider';

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

type DailyVerse = {
  reference: string;
  translation: string;
  text: string;
  date: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
// Greeting resolver now accepts translations so it can return localized strings
const getGreeting = (translations?: any): string => {
  const h = new Date().getHours();
  if (h < 12) return translations?.home?.greetings?.morning ?? 'Good Morning,';
  if (h < 17) return translations?.home?.greetings?.afternoon ?? 'Good Afternoon,';
  return translations?.home?.greetings?.evening ?? 'Good Evening,';
};

const safeNumber = (v: any): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const getTodayLabel = (languageCode = 'en'): string => {
  // try to use the active language for locale formatting; fall back to en-US
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
  const [showExplanation, setShowExplanation] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [stats, setStats] = useState<Stats>({
    chaptersRead: 0,
    highlights: 0,
    notes: 0,
    bookmarks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bottomTabVisible, setBottomTabVisible] = useState(true);
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [verseLoading, setVerseLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);

  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  // languages / translations used on this screen
   const { language, translations: translation } = useLanguage();

  // ── Banners & Quick Links ─────────────────────────────────────────────────
  const contentBanners = useMemo(
    () => [
      { id: 'bible', label: translation?.home?.banners?.bible || 'Bible', icon: BookOpen, color: '#2E7D32', onPress: () => navigation.navigate(route.bible) },
      { id: 'journal', label: translation?.home?.banners?.journal || 'Journal', icon: BookMarked, color: '#00695C', onPress: () => navigation.navigate(route.journal) },
      { id: 'study', label: translation?.home?.banners?.study || 'Bible Study', icon: GraduationCap, color: '#1A2F52', onPress: () => navigation.navigate(route.bible) },
      { id: 'trivial', label: translation?.home?.banners?.trivial || 'Bible Trivial', icon: Brain, color: '#8B5CF6', onPress: () => navigation.navigate(route.home) },
      { id: 'plan', label: translation?.home?.banners?.plan || 'Bible Plan', icon: CalendarDays, color: '#E8A317', onPress: () => navigation.navigate(route.readingPlan) },
      { id: 'resources', label: translation?.home?.banners?.resources || 'Resources', icon: Globe, color: '#0D47A1', onPress: () => navigation.navigate(route.home) },
      { id: 'support', label: translation?.home?.banners?.support || 'Support', icon: HelpCircle, color: '#D32F2F', onPress: () => navigation.navigate(route.home) },
    ],
    [navigation, translation],
  );

  const quickLinks = useMemo(
    () => [
      { id: '1', title: translation?.home?.quickLinks?.notes || 'Notes', icon: MenuSquareIcon, color: COLORS.primary, route: route.notes },
      { id: '2', title: translation?.home?.quickLinks?.history || 'History', icon: History, color: '#10B981', route: route.readHistory },
      { id: '3', title: translation?.home?.quickLinks?.highlights || 'Highlights', icon: Star, color: '#F59E0B', route: route.Highlights },
      { id: '4', title: translation?.home?.quickLinks?.favorites || 'Favorites', icon: Heart, color: '#8B5CF6', route: route.favorites },
    ],
    [COLORS.primary, translation],
  );

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const formatActivityTime = (act: any): string => {
    try {
      const timeVal = act.time;
      if (!timeVal || typeof timeVal !== 'object') {
        if (typeof timeVal === 'string') return formatWhatsAppTime(timeVal);
        return translation?.home?.recentLabel || 'Recent';
      }
      const timeStr = timeVal.createdOn || timeVal.updatedOn;
      if (!timeStr) return translation?.home?.recentLabel || 'Recent';
      const time = new Date(timeStr);
      if (isNaN(time.getTime())) return translation?.home?.recentLabel || 'Recent';
      return formatWhatsAppTime(timeStr);
    } catch {
      return translation?.home?.recentLabel || 'Recent';
    }
  };

  const loadDailyVerse = useCallback(async () => {
    setVerseLoading(true);
    try {
      const res = await sendPostRequest('bible', 'get-daily-verse', {});
      if (res.returnCode === 200 && res.returnData) {
        const d = res.returnData;
        setDailyVerse({
          reference: d.reference ?? '',
          translation: d.translation ?? 'NKJV',
          text: d.text ?? '',
          date: getTodayLabel(),
        });
      }
    } catch (e) {
      console.error('Error loading daily verse:', e);
    } finally {
      setVerseLoading(false);
    }
  }, []);

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
      loadDailyVerse();
    }

    const unsubscribe = bibleTTS.subscribe((state: any) => {
      setIsPlaying(state.isPlaying);
      setIsPaused(state.isPaused);
    });

    return unsubscribe;
  }, [loadHomeStats, loadDailyVerse, userInfo]);

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
      await Promise.all([loadHomeStats(), loadDailyVerse()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeStats, loadDailyVerse]);

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
        // use the book icon as the home logo (falls back to default elsewhere)
        logoComponent={<BookOpen size={40} color={COLORS.primary} />}
        greeting={getGreeting(translation)}
        userName={userInfo?.lastName || 'Friend'}
        tagline={translation?.appTagline || 'Your Practical Application Bible for Daily Guidance'}
        isDarkMode={isDark}
        onThemeToggle={toggleTheme}
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
        {/* Daily Verse Card */}
        <View style={styles.verseCard}>
          <View style={styles.verseCardHeader}>
            <View style={styles.verseCardHeaderLeft}>
              <View style={styles.verseIconBox}>
                <BookOpen size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.verseCardTitle}>{translation?.home?.dailyVerseTitle || 'Daily Verse'}</Text>
                <Text style={styles.verseCardDate}>{getTodayLabel(language)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.lordsBookTag}
              onPress={() => navigation.navigate(route.dailyVerse)}
            >
              <Text style={styles.lordsBookTagText}>{translation?.home?.lordsBookTag || "Exegesis Daily's"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.verseCardDivider} />

          {verseLoading ? (
            <View style={styles.verseLoadingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.verseLoadingText}>{translation?.home?.loadingVerse || 'Loading verse...'}</Text>
            </View>
          ) : (
            <>
              <View style={styles.verseReferenceRow}>
                <View style={styles.verseRefLeft}>
                  <BookMarked size={14} color={COLORS.primary} />
                  <Text style={styles.verseRefText}>
                    {dailyVerse?.reference ?? 'John 3:16'}{' '}
                    <Text style={styles.verseTranslation}>
                      ({dailyVerse?.translation ?? 'NKJV'})
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.audioBtn}
                  onPress={() => {
                    if (dailyVerse?.text) {
                      bibleTTS.speak(dailyVerse.text, dailyVerse.reference);
                    }
                  }}
                >
                  <Volume2
                    size={18}
                    color={isPlaying ? COLORS.accent : COLORS.muted}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.verseBodyText}>
                {(dailyVerse?.text && String(dailyVerse.text).trim().length > 0)
                  ? dailyVerse.text
                  : getVerseText( 'John', 3, 16)}
              </Text>

              {/* Enhanced Explanation with Show More */}
              {showExplanation && (
                <View style={styles.explainSection}>
                    <Text style={styles.explainText}>
                      {translation?.home?.explainIntro || 'This is one of the most famous and powerful verses in the Bible. It beautifully summarizes God\'s love and the plan of salvation through Jesus Christ.'}
                    </Text>

                  {showMore && (
                      <Text style={styles.explainText}>
                        {translation?.home?.explainMoreFull || translation?.home?.explainMore}
                      </Text>
                  )}

                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => {
                      if (showMore) {
                        setShowMore(false);
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      } else {
                        setShowMore(true);
                      }
                    }}
                  >
                    <Text style={styles.showMoreText}>
                      {showMore ? (translation?.home?.showLess || 'Show Less ▲') : (translation?.home?.showMore || 'Show More ▼')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.verseActions}>
                  <TouchableOpacity
                    style={styles.verseActionBtn}
                    onPress={() => {
                      const closing = showExplanation;
                      setShowExplanation(!showExplanation);
                      if (closing) {
                        setShowMore(false); // Reset when closing
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }
                    }}
                  >
                  <ChevronDown size={15} color={COLORS.primary} />
                  <Text style={styles.verseActionText}>
                    {showExplanation ? (translation?.home?.hideExplanation || 'Hide Explanation') : (translation?.home?.explainVerse || 'Explain verse')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.verseActionBtn}>
                  <Share2 size={14} color={COLORS.primary} />
                  <Text style={styles.verseActionText}>{translation?.home?.shareVerse || 'Share verse'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Content Banners */}
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
                  { backgroundColor: btn.color },
                  idx === 0 && styles.bannerFirst,
                  idx === contentBanners.length - 1 && styles.bannerLast,
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

      

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translation?.home?.quickActionsTitle || 'Quick Actions'}</Text>
          <View style={styles.quickLinksCompact}>
            {quickLinks.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={styles.quickLinkCompactCard}
                onPress={() => navigation.navigate(link.route)}
              >
                <View style={[styles.quickLinkCompactIcon, { backgroundColor: link.color + '20' }]}>
                  <link.icon size={20} color={link.color} />
                </View>
                   <Text style={styles.quickLinkCompactText} numberOfLines={1}>
                   {link.title}
                 </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translation?.home?.yourStatsTitle || 'Your Stats'}</Text>
          <View style={styles.statsGrid}>
            {[
              { label: translation?.profile?.stats?.chapters || 'Chapters', value: safeNumber(stats.chaptersRead), color: COLORS.primary },
              { label: translation?.profile?.stats?.highlights || 'Highlights', value: safeNumber(stats.highlights), color: '#F59E0B' },
              { label: translation?.profile?.stats?.notes || 'Notes', value: safeNumber(stats.notes), color: '#10B981' },
              { label: translation?.profile?.menuItems?.favorites || 'Favorites', value: safeNumber(stats.bookmarks), color: '#8B5CF6' },
            ].map((stat, idx) => (
              <View
                key={`stat-${idx}`}
                style={[styles.statCard, { backgroundColor: COLORS.cardBackground }]}
              >
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: COLORS.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{translation?.home?.recentActivityTitle || 'Recent Activity'}</Text>
            <TouchableOpacity onPress={() => navigation.navigate(route.readHistory)}>
              <Text style={[styles.sectionAction, { color: COLORS.primary }]}>{translation?.home?.seeAll || 'See All'}</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <View style={[activityStyles.emptyCard, { backgroundColor: COLORS.cardBackground }]}>
              <Text style={[activityStyles.emptyText, { color: COLORS.muted }]}> 
                {translation?.home?.startReadingTip || 'Start reading to see your activity here'}
              </Text>
            </View>
          ) : (
            <View style={activityStyles.activityList}>
              {recentActivity.map((act, idx) => {
                const ActivityIcon = act.type === 'read' ? Clock
                  : act.type === 'highlight' ? Star
                  : act.type === 'note' ? MenuSquareIcon
                  : act.type === 'plan' ? CheckCircle : Heart;

                const iconColor = act.type === 'read' ? '#6366F1'
                  : act.type === 'highlight' ? '#F59E0B'
                  : act.type === 'note' ? '#10B981'
                  : act.type === 'plan' ? '#00695C' : '#EC4899';

                const label = act.type === 'read' ? (translation?.home?.activityLabels?.reading || 'Reading')
                  : act.type === 'highlight' ? (translation?.home?.activityLabels?.highlighted || 'Highlighted')
                  : act.type === 'note' ? (translation?.home?.activityLabels?.noted || 'Noted')
                  : act.type === 'plan' ? (translation?.home?.activityLabels?.planProgress || 'Plan Progress') : (translation?.home?.activityLabels?.favorited || 'Favorited');

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[activityStyles.activityCard, { backgroundColor: COLORS.cardBackground }]}
                    onPress={() =>
                      act.type === 'plan'
                        ? navigation.navigate(route.readingPlan)
                        : navigation.navigate(route.bible, {
                            bookName: act.book,
                            chapter: act.chapter,
                          })
                    }
                  >
                    <View style={[activityStyles.iconBox, { backgroundColor: iconColor + '20' }]}>
                      <ActivityIcon size={18} color={iconColor} />
                    </View>
                    <View style={activityStyles.activityContent}>
                      <View style={activityStyles.activityTop}>
                        <Text style={[activityStyles.activityLabel, { color: iconColor }]}>
                          {label}
                        </Text>
                        <Text style={[activityStyles.activityTime, { color: COLORS.muted }]}>
                          {act.time}
                        </Text>
                      </View>
                      <Text style={[activityStyles.activityVerse, { color: COLORS.text }]}>
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

      {/* Bottom Tab */}
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

// Activity Styles
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

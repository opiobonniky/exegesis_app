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
  Pressable,
  Modal,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Share,
  Alert,
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
  Volume2,
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  X,
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
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import { showToast } from '../../helpers/Toash.helper';
import { useTranslation } from '../../hooks/useTranslation';

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
  explanation?: string | null;
  learnMore?: string | null;
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
  const [showExplanation, setShowExplanation] = useState(false);
  const [showMore, setShowMore] = useState(false);
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
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | any>(null);
  const [verseLoading, setVerseLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [customDailyVerse, setCustomDailyVerse] = useState<DailyVerse | any>(
    null,
  );
  const [customDateLoading, setCustomDateLoading] = useState(false);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [translatedVerseText, setTranslatedVerseText] = useState('');
  const [translatedReference, setTranslatedReference] = useState('');
  const sharingRef = useRef(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;


  const { language, translations: translation } = useLanguage();
  const isRtl = isRtlLanguage(language);
  // ── Banners & Quick Links ─────────────────────────────────────────────────
  const contentBanners = useMemo(
    () => [
      {
        id: 'bible',
        label: translation?.home?.banners?.bible || 'Bible',
        icon: BookOpen,
        color: '#2E7D32',
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'journal',
        label: translation?.home?.banners?.journal || 'Journal',
        icon: BookMarked,
        color: '#00695C',
        onPress: () => navigation.navigate(route.journal),
      },
      {
        id: 'study',
        label: translation?.home?.banners?.study || 'Bible Study',
        icon: GraduationCap,
        color: '#1A2F52',
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'trivial',
        label: translation?.home?.banners?.trivial || 'Bible Trivial',
        icon: Brain,
        color: '#8B5CF6',
        onPress: () => navigation.navigate(route.home),
      },
      {
        id: 'plan',
        label: translation?.home?.banners?.plan || 'Bible Plan',
        icon: CalendarDays,
        color: '#E8A317',
        onPress: () => navigation.navigate(route.readingPlan),
      },
      {
        id: 'resources',
        label: translation?.home?.banners?.resources || 'Resources',
        icon: Globe,
        color: '#0D47A1',
        onPress: () => {
          const v = isCustomDate && customDailyVerse ? customDailyVerse : dailyVerse;
          navigation.navigate(route.verseResources, {
            bookName: v?.bookName || 'John',
            chapter: v?.chapter || 3,
            verseNumber: v?.verseNumber || 16,
            verseText: v?.text || '',
          });
        },
      },
      {
        id: 'support',
        label: translation?.home?.banners?.support || 'Support',
        icon: HelpCircle,
        color: '#D32F2F',
        onPress: () => navigation.navigate(route.home),
      },
    ],
    [navigation, translation, dailyVerse, customDailyVerse, isCustomDate],
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

  const loadDailyVerse = useCallback(async () => {
    setIsCustomDate(false);
    setSelectedDate('');
    setCustomDailyVerse(null);
    setVerseLoading(true);
    try {
      const res = await sendPostRequest('bible', 'get-todays-verse', {});
      if (res.returnCode === 200 && res.returnData) {
        const d = res.returnData;
        const verseText = d.text ?? '';
        const ref = `${d.bookName} ${d.chapter}:${d.verseNumber}`;
        setDailyVerse({
          reference: ref,
          translation: d.translation ?? 'NKJV',
          text: verseText,
          date: getTodayLabel(),
          bookName: d.bookName,
          chapter: Number(d.chapter),
          verseNumber: Number(d.verseNumber),
          explanation: d.explanation ?? null,
          learnMore: d.learnMore ?? null,
        });
        if (verseText && language !== 'en') {
          const [translated, translatedRef] = await Promise.all([
            useTranslation(verseText),
            useTranslation(ref),
          ]);
          setTranslatedVerseText(translated);
          setTranslatedReference(translatedRef);
        } else {
          setTranslatedVerseText(verseText);
          setTranslatedReference(ref);
        }
      } else {
        setTranslatedVerseText('');
        setTranslatedReference('');
      }
    } catch (e) {
      console.error('Error loading daily verse:', e);
    } finally {
      setVerseLoading(false);
    }
  }, [language]);

  const loadVerseByDate = useCallback(async (dateStr: string) => {
    setCustomDateLoading(true);
    try {
      const res = await sendPostRequest('bible', 'get-verse-by-date', {
        date: dateStr,
      });
      console.log('Verse by date response:', JSON.stringify(res));
      if (res.returnCode === 200 && res.returnData) {
        const d = res.returnData;
        const verseText = d.text ?? '';
        const ref = `${d.bookName} ${d.chapter}:${d.verseNumber}`;
        setCustomDailyVerse({
          reference: ref,
          translation: d.translation ?? 'NKJV',
          text: verseText,
          date: dateStr,
          bookName: d.bookName,
          chapter: d.chapter,
          verseNumber: d.verseNumber,
          explanation: d.explanation ?? null,
          learnMore: d.learnMore ?? null,
        });
        setIsCustomDate(true);
        if (verseText && language !== 'en') {
          const [translated, translatedRef] = await Promise.all([
            useTranslation(verseText),
            useTranslation(ref),
          ]);
          setTranslatedVerseText(translated);
          setTranslatedReference(translatedRef);
          bibleTTS.speak(translated, translatedRef);
        } else {
          setTranslatedVerseText(verseText);
          setTranslatedReference(ref);
          if (d.text) {
            bibleTTS.speak(d.text, ref);
          }
        }
      } else {
        showToast("warning", "No verse found for the selected date");
      }
    } catch (e) {
      console.error('Error loading verse by date:', e);
      showToast("error", "Failed to load verse for the selected date. Please try again.");
      
    } finally {
      setCustomDateLoading(false);
    }
  }, [language]);

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

  // ── Share Handler ─────────────────────────────────────────────────────────
  const handleShare = () => {
    if (sharingRef.current) return;
    sharingRef.current = true;

    const activeVerse =
      isCustomDate && customDailyVerse ? customDailyVerse : dailyVerse;

    const verseText =
      activeVerse?.text && String(activeVerse.text).trim().length > 0
        ? activeVerse.text
        : getVerseText('John', 3, 16);

    const ref = activeVerse?.reference ?? 'John 3:16';
    const ver = activeVerse?.translation ?? 'NKJV';

    const message = `📖 ${ref} (${ver})\n\n"${verseText}"\n\n— Shared from Exegesis`;

    Share.share(
      {
        message,
        title: ref,
      },
      {
        dialogTitle: ref,
        subject: ref,
      },
    )
      .then(result => {
        if (result.action === Share.sharedAction) {
          console.log('Verse shared via:', result.activityType);
        }
      })
      .catch(error => {
        Alert.alert('Share Error', error.message);
      })
      .finally(() => {
        sharingRef.current = false;
      });
  };

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
        logoComponent={<BookOpen size={40} color={COLORS.primary} />}
        greeting={getGreeting(translation)}
        userName={userInfo?.lastName || 'Friend'}
        tagline={
          translation?.appTagline ||
          'Your Practical Application Bible for Daily Guidance'
        }
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
        {/* ── Daily Verse Card ── */}
        <View style={styles.verseCard}>
          <View style={[styles.verseCardHeader, isRtl && styles.verseCardHeaderRtl]}>
            <View style={[styles.verseCardHeaderLeft, isRtl && styles.verseCardHeaderLeftRtl]}>
              <View style={styles.verseIconBox}>
                <BookOpen size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.verseCardTitle}>
                  {translation?.home?.dailyVerseTitle || 'Daily Verse'}
                </Text>
                <Text style={styles.verseCardDate}>
                  {isCustomDate && selectedDate
                    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(
                        language === 'en' ? 'en-US' : language,
                        {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        },
                      )
                    : getTodayLabel(language)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.lordsBookTag, isRtl && styles.lordsBookTagRtl]}
              onPress={() => setShowDatePicker(true)}
            >
              <CalendarDays size={13} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.lordsBookTagText}>
                {translation?.home?.lordsBookTag || "Exegesis Daily's"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.verseCardDivider} />

          {verseLoading || (isCustomDate && customDateLoading) ? (
            <View style={[styles.verseLoadingRow, isRtl && styles.verseLoadingRowRtl]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.verseLoadingText}>
                {translation?.home?.loadingVerse || 'Loading verse...'}
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.verseReferenceRow, isRtl && styles.verseReferenceRowRtl]}>
                <View style={[styles.verseRefLeft, isRtl && styles.verseRefLeftRtl]}>
                  {isCustomDate ? (
                    <TouchableOpacity
                      onPress={() => {
                        setIsCustomDate(false);
                        setSelectedDate('');
                        setCustomDailyVerse(null);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <ChevronRight size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                  ) : null}
                  <BookMarked size={14} color={COLORS.primary} />
                  <Text style={styles.verseRefText}>
                    {translatedReference || 'John 3:16'}{' '}
                    <Text style={styles.verseTranslation}>
                      (
                      {isCustomDate && customDailyVerse
                        ? customDailyVerse.translation
                        : (dailyVerse?.translation ?? 'NKJV')}
                      )
                    </Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.audioBtn,
                    (isPlaying || customDateLoading) && {
                      backgroundColor: COLORS.primary + '30',
                    },
                  ]}
                  onPress={() => {
                    const verse =
                      isCustomDate && customDailyVerse
                        ? customDailyVerse
                        : dailyVerse;
                    if (verse?.text) {
                      bibleTTS.speak(verse.text, translatedReference || verse.reference);
                    }
                  }}
                >
                  {customDateLoading ? (
                    <ActivityIndicator size={16} color={COLORS.accent} />
                  ) : (
                    <Volume2
                      size={18}
                      color={isPlaying ? COLORS.accent : COLORS.accent}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.verseBodyText}>
                {translatedVerseText || getVerseText('John', 3, 16)}
              </Text>

              {/* Explanation Section */}
              {showExplanation && (
                <View style={styles.explainSection}>
                  <Text style={styles.explainText}>
                    {(isCustomDate && customDailyVerse
                      ? customDailyVerse.explanation
                      : dailyVerse?.explanation) ??
                      (translation?.home?.explainIntro ||
                        "This is one of the most famous and powerful verses in the Bible. It beautifully summarizes God's love and the plan of salvation through Jesus Christ.")}
                  </Text>

                  {showMore && (
                    <Text style={styles.explainText}>
                      {(isCustomDate && customDailyVerse
                        ? customDailyVerse.learnMore
                        : dailyVerse?.learnMore) ??
                        (translation?.home?.explainMoreFull ||
                          translation?.home?.explainMore ||
                          'God demonstrated His immense love by sending His only Son, Jesus Christ, to earth. Anyone who believes in Him receives forgiveness of sins and the gift of eternal life. This salvation is freely available to all people through faith alone — not by works, but by grace.')}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[styles.showMoreBtn, isRtl && styles.showMoreBtnRtl]}
                    onPress={() => {
                      if (showMore) {
                        setShowMore(false);
                        scrollViewRef.current?.scrollTo({
                          y: 0,
                          animated: true,
                        });
                      } else {
                        setShowMore(true);
                      }
                    }}
                  >
                    <Text style={styles.showMoreText}>
                      {showMore
                        ? translation?.home?.showLess || 'Show Less ▲'
                        : translation?.home?.showMore || 'Show More ▼'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.verseActions, isRtl && styles.verseActionsRtl]}>
                <TouchableOpacity
                  style={[styles.verseActionBtn, isRtl && styles.verseActionBtnRtl]}
                  onPress={() => {
                    const closing = showExplanation;
                    setShowExplanation(!showExplanation);
                    if (closing) {
                      setShowMore(false);
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }
                  }}
                >
                  <ChevronDown size={15} color={COLORS.primary} />
                  <Text style={styles.verseActionText}>
                    {showExplanation
                      ? translation?.home?.hideExplanation || 'Hide Explanation'
                      : translation?.home?.explainVerse || 'Explain verse'}
                  </Text>
                </TouchableOpacity>

                {/* Share Button */}
                <TouchableOpacity
                  style={[styles.verseActionBtn, isRtl && styles.verseActionBtnRtl]}
                  activeOpacity={0.6}
                  onPress={() => handleShare()}
                >
                  <Share2 size={14} color={COLORS.primary} />
                  <Text style={styles.verseActionText}>
                    {translation?.home?.shareVerse || 'Share verse'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ── Back to Today Banner (when viewing custom date) ── */}
        {isCustomDate && (
          <TouchableOpacity
            style={[
              styles.backToTodayBanner,
              isRtl && styles.backToTodayBannerRtl,
              {
                backgroundColor: COLORS.primary + '15',
                borderWidth: 1,
                borderColor: COLORS.primary + '30',
              },
            ]}
            onPress={() => {
              setIsCustomDate(false);
              setSelectedDate('');
              setCustomDailyVerse(null);
            }}
          >
            <CalendarDays size={16} color={COLORS.primary} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: COLORS.primary,
              }}
            >
              Back to Today's Verse
            </Text>
          </TouchableOpacity>
        )}

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

      {/* ── Date Picker Modal ── */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable
            style={{
              width: '90%',
              maxWidth: 360,
              backgroundColor: COLORS.cardBackground,
              borderRadius: 20,
              padding: 24,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              maxHeight: '85%',
            }}
            onPress={e => e.stopPropagation()}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: isRtl ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: '800', color: COLORS.text }}
              >
                {translation?.home?.selectDateTitle || 'Select a Date'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                hitSlop={12}
              >
                <X size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 13,
                color: COLORS.muted,
                marginBottom: 16,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {`Pick a date to read and listen to that day's daily verse`}
            </Text>

            {/* ── This Week Quick Row ── */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: COLORS.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              {translation?.home?.thisWeek || 'This Week'}
            </Text>
            <View
              style={{
                flexDirection: isRtl ? 'row-reverse' : 'row',
                gap: 6,
                marginBottom: 20,
                justifyContent: 'center',
              }}
            >
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dayName = d.toLocaleDateString('en-US', {
                  weekday: 'short',
                });
                const dayNum = d.getDate();
                const isToday = i === 0;
                const isSelected = selectedDate === dateStr;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? COLORS.primary
                        : isToday
                          ? COLORS.primary + '20'
                          : COLORS.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                    }}
                    onPress={() => {
                      setSelectedDate(dateStr);
                      setShowDatePicker(false);
                      loadVerseByDate(dateStr);
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: isSelected ? '#FFFFFF' : COLORS.muted,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                      }}
                    >
                      {dayName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color: isSelected ? '#FFFFFF' : COLORS.text,
                        marginTop: 1,
                      }}
                    >
                      {dayNum}
                    </Text>
                    {isToday && (
                      <Text
                        style={{
                          fontSize: 8,
                          fontWeight: '600',
                          color: isSelected ? '#FFFFFF' : COLORS.primary,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          marginTop: 1,
                        }}
                      >
                        {'Today'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Month / Year Picker ── */}
            <View
              style={{
                flexDirection: isRtl ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (pickerMonth === 0) {
                    setPickerMonth(11);
                    setPickerYear(p => p - 1);
                  } else {
                    setPickerMonth(p => p - 1);
                  }
                }}
                hitSlop={12}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {isRtl ? (
                  <ArrowRight size={18} color={COLORS.text} />
                ) : (
                  <ChevronLeft size={18} color={COLORS.text} />
                )}
              </TouchableOpacity>

              <Text
                style={{ fontSize: 16, fontWeight: '800', color: COLORS.text }}
              >
                {new Date(pickerYear, pickerMonth).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (pickerMonth === 11) {
                    setPickerMonth(0);
                    setPickerYear(p => p + 1);
                  } else {
                    setPickerMonth(p => p + 1);
                  }
                }}
                hitSlop={12}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {isRtl ? (
                  <ChevronLeft size={18} color={COLORS.text} />
                ) : (
                  <ArrowRight size={18} color={COLORS.text} />
                )}
              </TouchableOpacity>
            </View>

            {/* ── Calendar Grid ── */}
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 6 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <View
                  key={`weekday-header-${index}`}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                >
                
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: COLORS.muted,
                      textTransform: 'uppercase',
                    }}
                  >
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day cells */}
            {(() => {
              const daysInMonth = new Date(
                pickerYear,
                pickerMonth + 1,
                0,
              ).getDate();
              const firstDayOfWeek = new Date(
                pickerYear,
                pickerMonth,
                1,
              ).getDay(); // 0 = Sun
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

              const cells: React.ReactNode[] = [];

              // Empty cells before first day
              for (let i = 0; i < firstDayOfWeek; i++) {
                cells.push(
                  <View
                    key={`empty-${i}`}
                    style={{ flex: 1, aspectRatio: 1 }}
                  />,
                );
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const isSelected = selectedDate === dateStr;

                cells.push(
                  <TouchableOpacity
                    key={dateStr}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? COLORS.primary
                        : isToday
                          ? COLORS.primary + '20'
                          : 'transparent',
                    }}
                    onPress={() => {
                      setSelectedDate(dateStr);
                      setShowDatePicker(false);
                      loadVerseByDate(dateStr);
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isToday || isSelected ? '800' : '500',
                        color: isSelected
                          ? '#FFFFFF'
                          : isToday
                            ? COLORS.primary
                            : COLORS.text,
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>,
                );
              }

              // Build week rows
              const rows: React.ReactNode[] = [];
              for (let i = 0; i < cells.length; i += 7) {
                const weekCells = cells.slice(i, i + 7);
                rows.push(
                  <View
                    key={`week-${i}`}
                    style={{ flexDirection: isRtl ? 'row-reverse' : 'row', gap: 2, marginBottom: 2 }}
                  >
                    {weekCells}
                  </View>,
                );
              }
              return rows;
            })()}

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: COLORS.border,
                marginVertical: 16,
              }}
            />

            {/* Navigate to full Daily Verse page */}
            <TouchableOpacity
              style={{
                flexDirection: isRtl ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderStyle: 'dashed',
              }}
              onPress={() => {
                setShowDatePicker(false);
                navigation.navigate(route.dailyVerse);
              }}
            >
              <BookOpen size={16} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: COLORS.primary,
                }}
              >
                {'Full Daily Verse Page'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
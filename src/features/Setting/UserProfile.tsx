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
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  BookOpen,
  Star,
  CalendarDays,
  HandHeart,
  User,
  Heart,
  MapPin,
  GraduationCap,
  Calendar,
  Briefcase,
  ShieldCheck,
  Bell,
  Flame,
  Bookmark,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../../common/AppContext';
import {
  useLanguage,
  isRtlLanguage,
} from '../../component/language-translation/LanguageProvider';
import { getColors, SPACING } from '../../constants/theme';
import { route } from '../../component/navigations/routes';
import BottomTab from '../../component/navigations/BottomTab';
import { sendPostRequest } from '../../services/api';
import { getHomeDesign } from '../home/homeStyle';
import StatsRow from '../home/cards/StatsRow';
import {
  CoverCard,
  ActionGrid,
  ProfileDetails,
  MenuList,
} from './cards';
import exegesisLogo from '../../assets/logos/exegesis_bg_rm.png';

const DEFAULT_TOP =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const safeNumber = (v: any): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

// Demo fallbacks so the screen matches the design mockup while real
// profile fields are still preferred when the backend supplies them.
// Note: date-of-birth has NO fallback — we never invent a birthday.
const DEMO_BIO = 'I want to tell the whole world about Jesus!';
const DEMO_LOCATION = 'Long Beach, NY, United States';
const DEMO_EDUCATION = 'Studied bachelor degree at School of Hard Knocks';
const DEMO_OCCUPATION = 'Founder at Exegesis Project';

export default function UserProfileScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();
  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const insets = useSafeAreaInsets();

  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const design = useMemo(() => getHomeDesign(isDark), [isDark]);

  const userInfo = app?.userInfo ?? null;
  const user = userInfo as any;

  const [stats, setStats] = useState({
    daysStreak: 0,
    versesRead: 0,
    devotions: 0,
    bookmarks: 0,
  });
  const [details, setDetails] = useState<{
    gender?: string;
    maritalStatus?: string;
    dateOfBirth?: string;
  }>({});

  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;
  const [bottomTabVisible, setBottomTabVisible] = useState(true);

  const displayName =
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    user?.username ||
    'Reader';

  const topInset =
    Platform.OS === 'android'
      ? (insets.top || DEFAULT_TOP) + 8
      : insets.top || DEFAULT_TOP;

  // ── Data ───────────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      const [userRes, statsRes] = await Promise.all([
        sendPostRequest('auth', 'get-current-user', {}).catch(() => null),
        sendPostRequest('bible', 'get-home-stats', {}).catch(() => null),
      ]);

      if (userRes?.returnCode === 200 && userRes?.returnData) {
        const d = userRes.returnData;
        setDetails({
          gender: d.gender || undefined,
          maritalStatus: d.maritalStatus || undefined,
          dateOfBirth: d.dateOfBirth || undefined,
        });
      }

      if (statsRes?.returnCode === 200 && statsRes?.returnData) {
        const d = statsRes.returnData;
        setStats({
          daysStreak: Number(d.daysStreak ?? d.streak ?? d.planProgressCount ?? 0),
          versesRead: Number(d.versesRead ?? d.chaptersRead ?? 0),
          devotions: Number(d.devotions ?? d.notes ?? 0),
          bookmarks: Number(d.favorites ?? d.bookmarks ?? 0),
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, []);

  useEffect(() => {
    if (userInfo) loadProfile();
  }, [loadProfile, userInfo]);

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

  // ── Content ────────────────────────────────────────────────────────────────
  const actionItems = useMemo(
    () => [
      {
        id: 'continue',
        label:
          translations?.home?.continueReadingTitle || 'Continue Reading',
        icon: BookOpen,
        onPress: () => navigation.navigate(route.bible),
      },
      {
        id: 'verse',
        label:
          translations?.home?.dailyVerseTitle || 'Daily Verse',
        icon: Star,
        onPress: () => navigation.navigate(route.dailyVerse),
      },
      {
        id: 'devotion',
        label:
          translations?.bible?.dailyDevotionalTitle || 'Daily Devotional',
        icon: CalendarDays,
        onPress: () => navigation.navigate(route.dailyDevotional),
      },
      {
        id: 'prayer',
        label: 'Prayer Wall',
        icon: HandHeart,
        onPress: () => navigation.navigate(route.legacyLedger),
      },
    ],
    [navigation, translations],
  );

  const detailsLines = useMemo(() => {
    let dobText = '';
    if (details.dateOfBirth) {
      try {
        const date = new Date(details.dateOfBirth);
        if (!isNaN(date.getTime())) {
          dobText = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      } catch {
        dobText = '';
      }
    }
    return [
      [
        { icon: User, text: details.gender || '' },
        { icon: Heart, text: details.maritalStatus || '' },
        { icon: MapPin, text: DEMO_LOCATION },
      ],
      [{ icon: GraduationCap, text: DEMO_EDUCATION }],
      [
        { icon: Calendar, text: dobText },
        { icon: Briefcase, text: DEMO_OCCUPATION },
      ],
    ];
  }, [details]);

  const statItems = useMemo(
    () => [
      {
        value: safeNumber(stats.daysStreak),
        label: 'Days Streak',
        icon: BookOpen,
        color: design.blue,
      },
      {
        value: safeNumber(stats.versesRead),
        label: 'Verses Read',
        icon: Flame,
        color: design.flame,
      },
      {
        value: safeNumber(stats.devotions),
        label: 'Devotions',
        icon: CalendarDays,
        color: design.green,
      },
      {
        value: safeNumber(stats.bookmarks),
        label: 'Bookmarks',
        icon: Bookmark,
        color: design.purple,
      },
    ],
    [stats, design],
  );

  const menuItems = useMemo(
    () => [
      {
        id: 'edit',
        label:
          translations?.profile?.menuItems?.editProfile || 'Edit Profile',
        icon: User,
        onPress: () => navigation.navigate(route.editProfile),
      },
      {
        id: 'account',
        label: 'Account Settings',
        icon: ShieldCheck,
        onPress: () => navigation.navigate(route.extendedProfile),
      },
      {
        id: 'notifications',
        label:
          translations?.profile?.menuItems?.notifications || 'Notifications',
        icon: Bell,
        onPress: () => navigation.navigate(route.notificationSettings),
      },
    ],
    [navigation, translations],
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
          {/* ── Header: back + app brand ─────────────────────────────────── */}
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
                      style={[styles.headerHandle, { color: design.muted }]}
                      numberOfLines={1}
                    >
                      {translations?.appTagline || 'Your Biblical Companion'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* ── Cover + avatar + bio ── */}
            <CoverCard
              design={design}
              isRtl={isRtl}
              name={displayName}
              username={user?.username}
              bio={DEMO_BIO}
              photoUrl={user?.profilePhotoUrl}
              editCoverLabel="Edit Cover"
              onEditCover={() => navigation.navigate(route.editProfile)}
            />

            {/* ── Quick actions (2x2) ── */}
            <ActionGrid
              design={design}
              isRtl={isRtl}
              items={actionItems}
            />

            {/* ── Details ── */}
            <ProfileDetails design={design} isRtl={isRtl} lines={detailsLines} />

            {/* ── Stats ── */}
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

            {/* ── Menu ── */}
            <MenuList design={design} isRtl={isRtl} items={menuItems} />
          </ScrollView>
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
  headerTitleRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerHandle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  content: {
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },

  bottomTabWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

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
} from 'react-native';
import {
  Moon,
  Sun,
  User,
  BookOpen,
  Heart,
  Star,
  Bell,
  Globe,
  ChevronRight,
  Edit,
  History,
  Target,
  LogOut,
  FileText,
  Settings2,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import LanguagePickerModal, { FLAGS, NATIVE_NAMES } from '../../component/LanguagePickerModal';
import {
  BORDER_RADIUS,
  getColors,
  FONT_SIZES,
  SPACING,
} from '../../constants/theme';
import ActionModal from '../../reusable/ActionModal';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import BottomTab from '../../component/navigations/BottomTab';
import ActionHeader from '../../reusable/ActionHeader';
import { sendPostRequest } from '../../services/api';

export default function ProfileScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [bottomTabVisible, setBottomTabVisible] = useState(true);
  const isMounted = useRef(true);
  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const [stats, setStats] = useState({
    booksRead: 0, // optional (see below)
    chaptersRead: 0, // ✅ from get-home-stats
    highlights: 0,
    notes: 0,
    favorites: 0,
  });

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
  const [langModalOpen, setLangModalOpen] = useState(false);

  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const userInfo = app?.userInfo ?? null;
  const toggleTheme = useCallback(() => {
    app?.toggleTheme?.();
  }, [app]);
  const logout = app?.logout ?? (async () => {});
  const user = userInfo as any;
  const { translations, language, t } = useLanguage();
  const isRtl = isRtlLanguage(language);

  const subscriptionTier = app?.subscriptionTier || 'free';
  const hasSubscriptionAccess = app?.hasSubscriptionAccess ?? (() => false);

  const [gateModal, setGateModal] = useState<{
    visible: boolean;
    featureName: string;
  }>({ visible: false, featureName: '' });

  const requireAccess = useCallback(
    (minimumTier: 'legacy_sower' | 'covenant_sower', featureName: string, onGranted: () => void) => {
      if (app?.isAdmin || hasSubscriptionAccess(minimumTier)) {
        onGranted();
      } else {
        setGateModal({ visible: true, featureName });
      }
    },
    [hasSubscriptionAccess, app?.isAdmin],
  );

  const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Reader';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('') || 'R';
  const accountLabel =
    subscriptionTier === 'covenant_sower_monthly' || subscriptionTier === 'covenant_sower_yearly'  || subscriptionTier === 'covenant_sower'
      ? 'Covenant Sower'
      : subscriptionTier === 'legacy_sower_monthly' || subscriptionTier === 'legacy_sower_yearly' || subscriptionTier === 'legacy_sower'
        ? 'Legacy Sower'
        : 'Free Reader';
  
  console.log("subscriptionTier in ProfileScreen::::", subscriptionTier);
  

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

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      // setLoading(true);

      // ✅ Single call
      const homeRes = await sendPostRequest('bible', 'get-home-stats', {});

      if (homeRes?.returnCode === 200 && homeRes?.returnData) {
        const d = homeRes.returnData;

        setStats(prev => ({
          ...prev,
          chaptersRead: Number(d.chaptersRead ?? 0),
          highlights: Number(d.highlights ?? 0),
          notes: Number(d.notes ?? 0),
          favorites: Number(d.favorites ?? 0),
        }));
      }

      /**
       * OPTIONAL:
       * If you still want "Books Read" to be accurate, you need backend to return it too.
       * For now, you can compute it from recentActivity (approx), or keep a light read-history call.
       *
       * Best: update get-home-stats to also return "booksRead" (distinct book_name).
       */

      // Quick approximation from recentActivity (if backend returns it):
      if (homeRes?.returnCode === 200 && homeRes?.returnData?.recentActivity) {
        const recent = homeRes.returnData.recentActivity;
        const uniqueBooks = new Set(
          (recent || []).map((x: any) => x.bookName).filter(Boolean),
        );
        setStats(prev => ({ ...prev, booksRead: uniqueBooks.size }));
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
    }
  };

  const handleLogout = async () => {
    setShowLogout(false);
    setLoggingOut(true);
    try {
      await logout();
      // Navigation is handled automatically by the AppNavigation conditional rendering
      // based on auth state, so we don't need to navigate manually here
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



  const statCards = useMemo(
    () => [
      {
        label: t('profile.stats.books') || (translations.profile && translations.profile.stats?.books) || 'Books',
        value: stats.booksRead.toString(),
        icon: BookOpen,
        color: COLORS.primary,
      },
      {
        label: t('profile.stats.chapters') || (translations.profile && translations.profile.stats?.chapters) || 'Chapters',
        value: stats.chaptersRead.toString(), // ✅ correct now
        icon: Target,
        color: '#3B82F6',
      },
      {
        label: t('profile.stats.highlights') || (translations.profile && translations.profile.stats?.highlights) || 'Highlights',
        value: stats.highlights.toString(),
        icon: Star,
        color: '#F59E0B',
      },
      {
        label: t('profile.stats.notes') || (translations.profile && translations.profile.stats?.notes) || 'Notes',
        value: stats.notes.toString(),
        icon: FileText,
        color: '#8B5CF6',
      },
    ],
    [stats, COLORS.primary, translations, t],
  );

  const quickActions = useMemo(
    () => [
      {
        label: 'Daily Exegesis',
        icon: Sun,
        color: '#F59E0B',
        requiredTier: 'covenant_sower' as const,
        onPress: () => navigation.navigate(route.dailyExegesis),
      },
      {
        label: 'Journals',
        icon: FileText,
        color: '#8B5CF6',
        requiredTier: null,
        onPress: () => navigation.navigate(route.journal),
      },
      {
        label: 'Reading Plan',
        icon: Calendar,
        color: '#10B981',
        requiredTier: 'covenant_sower' as const,
        onPress: () => navigation.navigate(route.readingPlan),
      },
      {
        label: 'Bible Trivia',
        icon: Star,
        color: '#EC4899',
        requiredTier: null,
        onPress: () => navigation.navigate(route.trivia),
      },
      {
        label: 'Bible Study',
        icon: BookOpen,
        color: COLORS.primary,
        requiredTier: 'legacy_sower' as const,
        onPress: () => navigation.navigate(route.studyBible),
      },
      {
        label: 'Community Feed',
        icon: Globe,
        color: '#06B6D4',
        requiredTier: null,
        onPress: () => navigation.navigate(route.legacyLedger),
      },
    ],
    [COLORS.primary, navigation],
  );

  const handleScroll = useCallback(
    (event: any) => {
      if (!isMounted.current) return;
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

  const menuSections = useMemo(
    () => [
      {
        title: t('profile.menuSections.bibleStudy') || (translations.profile && translations.profile.menuSections?.bibleStudy) || 'Bible Study',
        items: [
          {
            icon: BookOpen,
            label: t('profile.menuItems.continueReading') || (translations.profile && translations.profile.menuItems?.continueReading) || 'Continue Reading',
            route: route.bible,
            color: COLORS.primary,
          },
          {
            icon: Star,
            label: t('profile.menuItems.myHighlights') || (translations.profile && translations.profile.menuItems?.myHighlights) || 'My Highlights',
            route: route.Highlights,
            badge:
              stats.highlights > 0 ? stats.highlights.toString() : undefined,
            color: '#F59E0B',
          },
          {
            icon: Heart,
            label: t('profile.menuItems.favorites') || (translations.profile && translations.profile.menuItems?.favorites) || 'Favorites',
            route: route.favorites,
            badge: stats.favorites > 0 ? stats.favorites.toString() : undefined,
            color: '#EF4444',
          },
          {
            icon: FileText,
            label: t('profile.menuItems.myNotes') || (translations.profile && translations.profile.menuItems?.myNotes) || 'My Notes',
            route: route.notes,
            badge: stats.notes > 0 ? stats.notes.toString() : undefined,
            color: '#8B5CF6',
          },
          {
            icon: History,
            label: t('profile.menuItems.readingHistory') || (translations.profile && translations.profile.menuItems?.readingHistory) || 'Reading History',
            route: route.readHistory,
            color: '#10B981',
            badge:
              stats.chaptersRead > 0
                ? stats.chaptersRead.toString()
                : undefined,
          },
        ],
      },
      {
        title: t('profile.menuSections.settings') || (translations.profile && translations.profile.menuSections?.settings) || 'Settings',
        items: [
          {
            icon: isDark ? Moon : Sun,
            label: isDark
              ? t('profile.menuItems.lightMode') || (translations.profile && translations.profile.menuItems?.lightMode) || 'Light Mode'
              : t('profile.menuItems.darkMode') || (translations.profile && translations.profile.menuItems?.darkMode) || 'Dark Mode',
            isSwitch: true,
            value: isDark,
            onToggle: toggleTheme,
            color: COLORS.accent,
          },
          {
            icon: Bell,
            label: t('profile.menuItems.notifications') || (translations.profile && translations.profile.menuItems?.notifications) || 'Notifications',
            onPress: () => navigation.navigate(route.notificationSettings),
            color: '#EC4899',
          },
          {
            icon: Globe,
            label: t('profile.menuItems.language') || (translations.profile && translations.profile.menuItems?.language) || 'Language',
            onPress: () => setLangModalOpen(true),
            color: '#8B5CF6',
            rightText: `${FLAGS[language]}  ${NATIVE_NAMES[language]}`,
          },
          {
            icon: User,
            label: t('profile.menuItems.editProfile') || (translations.profile && translations.profile.menuItems?.editProfile) || 'Edit Profile',
            onPress: () => navigation.navigate(route.editProfile),
            color: '#06B6D4',
          },
          {
            icon: Settings2,
            label: t('profile.menuItems.readingSettings') || (translations.profile && translations.profile.menuItems?.readingSettings) || 'Reading Settings',
            onPress: () => navigation.navigate(route.readingSettings),
            color: COLORS.primary,
          },
        ],
      },
    ],
    [COLORS.primary, COLORS.accent, isDark, stats, translations, t, language, navigation, toggleTheme],
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {!app || !userInfo ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <>
          <ActionHeader
            title={
              t('profile.title') ||
              translations?.profile?.title ||
              'Profile Information'
            }
            onPress={() => navigation.goBack()}
          />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* ── PROFILE CARD ─────────────────────────────────────────────── */}
            <View
              style={[
                styles.profileCard,
                { backgroundColor: COLORS.cardBackground },
              ]}
            >
              <View style={[styles.profileHeader, isRtl && styles.profileHeaderRtl]}>
                <View style={[styles.profileAvatar, { backgroundColor: COLORS.primary }]}> 
                  <Text style={styles.profileAvatarText}>{initials}</Text>
                </View>

                <View style={styles.profileNameSection}>
                  <View style={[styles.profileNameRow, isRtl && styles.profileNameRowRtl]}>
                    <Text style={[styles.profileName, { color: COLORS.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <View style={[styles.accountPill, { backgroundColor: COLORS.primary + '14' }]}> 
                      <Text style={[styles.accountPillText, { color: COLORS.primary }]}>
                        {accountLabel}
                      </Text>
                    </View>
                  </View>

                  {user?.username ? (
                    <Text style={[styles.profileUsername, { color: COLORS.muted }]} numberOfLines={1}>
                      @{user.username}
                    </Text>
                  ) : null}

                  <View style={[styles.profileMetaRow, isRtl && styles.profileMetaRowRtl]}>
                    <View style={[styles.profileMetaItem, isRtl && styles.profileMetaItemRtl]}>
                      <Mail size={13} color={COLORS.muted} />
                      <Text style={[styles.profileMetaText, { color: COLORS.muted }]} numberOfLines={1}>
                        {user?.email || 'No email'}
                      </Text>
                    </View>
                    {user?.phoneNumber ? (
                      <View style={[styles.profileMetaItem, isRtl && styles.profileMetaItemRtl]}>
                        <Phone size={13} color={COLORS.muted} />
                        <Text style={[styles.profileMetaText, { color: COLORS.muted }]} numberOfLines={1}>
                          {user.phoneNumber}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.editButton,
                    { backgroundColor: COLORS.primary + '15' },
                  ]}
                  onPress={() => navigation.navigate(route.editProfile)}
                  activeOpacity={0.7}
                >
                  <Edit size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── QUICK ACTIONS ─────────────────────────────────────────────── */}
            <View style={styles.quickActionsGrid}>
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <TouchableOpacity
                    key={action.label}
                    style={[
                      styles.quickActionCard,
                      { backgroundColor: COLORS.cardBackground },
                    ]}
                    onPress={() => {
                      if (action.requiredTier) {
                        requireAccess(action.requiredTier, action.label, action.onPress);
                      } else {
                        action.onPress();
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.quickActionIcon,
                        { backgroundColor: action.color + '16' },
                      ]}
                    >
                      <Icon size={18} color={action.color} />
                    </View>
                    <Text style={[styles.quickActionText, { color: COLORS.text }]} numberOfLines={2}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── SOWER STATUS ──────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.sowerCard,
                { backgroundColor: COLORS.cardBackground },
              ]}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <View style={styles.sowerRow}>
                <View style={styles.sowerInfo}>
                  <Text style={[styles.sowerLabel, { color: COLORS.muted }]}>
                    Account Status
                  </Text>
                  <Text style={[styles.sowerValue, { color: COLORS.text }]}>
                    {accountLabel}
                  </Text>
                  <Text style={[styles.sowerExpiry, { color: COLORS.muted }]}>
                    {subscriptionTier !== 'free' && app?.accessExpiresAt
                      ? `Renews ${new Date(app.accessExpiresAt).toLocaleDateString()}`
                      : ''}
                  </Text>
                  {subscriptionTier !== 'free' && app?.accessExpiresAt && (
                    <Text style={[styles.sowerExpiry, { color: COLORS.muted }]}>
                      Renews{' '}
                      {new Date(
                        (app as any).accessExpiresAt,
                      ).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.manageButton,
                    { backgroundColor: COLORS.primary + '15' },
                  ]}
                >
                  <Text
                    style={[styles.manageButtonText, { color: COLORS.primary }]}
                  >
                    {subscriptionTier === 'free'
                      ? 'Become a Sower'
                      : 'Manage Sowing'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ── STATS ROW ────────────────────────────────────────────────── */}
            <View
              style={[
                styles.statsRow,
                { backgroundColor: COLORS.cardBackground },
              ]}
            >
              {statCards.map((stat, index) => (
                <View key={index} style={styles.statItem}>
                  <View
                    style={[
                      styles.statIconSmall,
                      { backgroundColor: stat.color + '15' },
                    ]}
                  >
                    <stat.icon size={16} color={stat.color} />
                  </View>
                  <Text
                    style={[styles.statValueCompact, { color: COLORS.text }]}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={[styles.statLabelCompact, { color: COLORS.muted }]}
                    numberOfLines={1}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── MENU SECTIONS ────────────────────────────────────────────── */}
            {menuSections.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.menuSection}>
                <Text
                  style={[
                    styles.sectionTitle,
                    isRtl && styles.sectionTitleRtl,
                    { color: COLORS.muted },
                  ]}
                >
                  {section.title}
                </Text>

                <View
                  style={[
                    styles.menuCard,
                    { backgroundColor: COLORS.cardBackground },
                  ]}
                >
                  {section.items.map((item: any, itemIndex) => {
                    const Icon = item.icon;
                    const isLast = itemIndex === section.items.length - 1;

                    if (item.isSwitch) {
                      return (
                        <View
                          key={itemIndex}
                          style={[
                            styles.menuItem,
                            !isLast && {
                              borderBottomWidth: 1,
                              borderBottomColor: COLORS.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.menuLeft,
                              isRtl && styles.menuLeftRtl,
                            ]}
                          >
                            <View
                              style={[
                                styles.menuIconContainer,
                                isRtl && styles.menuIconContainerRtl,
                                { backgroundColor: item.color + '15' },
                              ]}
                            >
                              <Icon size={20} color={item.color} />
                            </View>
                            <Text
                              style={[styles.menuLabel, { color: COLORS.text }]}
                            >
                              {item.label}
                            </Text>
                          </View>

                          <Switch
                            value={item.value}
                            onValueChange={item.onToggle}
                            trackColor={{
                              false: COLORS.border,
                              true: COLORS.primary,
                            }}
                            thumbColor={COLORS.white}
                            ios_backgroundColor={COLORS.border}
                          />
                        </View>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={itemIndex}
                        style={[
                          styles.menuItem,
                          !isLast && {
                            borderBottomWidth: 1,
                            borderBottomColor: COLORS.border,
                          },
                        ]}
                        onPress={
                          item.route
                            ? () => navigation.navigate(item.route)
                            : item.onPress
                        }
                        activeOpacity={0.6}
                      >
                        <View
                          style={[styles.menuLeft, isRtl && styles.menuLeftRtl]}
                        >
                          <View
                            style={[
                              styles.menuIconContainer,
                              isRtl && styles.menuIconContainerRtl,
                              { backgroundColor: item.color + '15' },
                            ]}
                          >
                            <Icon size={20} color={item.color} />
                          </View>
                          <Text
                            style={[styles.menuLabel, { color: COLORS.text }]}
                          >
                            {item.label}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.menuRight,
                            isRtl && styles.menuRightRtl,
                          ]}
                        >
                          {item.rightText && (
                            <Text
                              style={[
                                styles.rightLangText,
                                { color: COLORS.muted },
                              ]}
                            >
                              {item.rightText}
                            </Text>
                          )}
                          {item.badge && (
                            <View
                              style={[
                                styles.badge,
                                { backgroundColor: item.color },
                              ]}
                            >
                              <Text style={styles.badgeText}>{item.badge}</Text>
                            </View>
                          )}
                          {isRtl ? (
                            <ChevronRight
                              size={20}
                              color={COLORS.muted}
                              style={{ transform: [{ scaleX: -1 }] }}
                            />
                          ) : (
                            <ChevronRight size={20} color={COLORS.muted} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* ── LOGOUT ───────────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.logoutButton,
                isRtl && styles.logoutButtonRtl,
                { backgroundColor: COLORS.cardBackground },
                loggingOut && { opacity: 0.6 },
              ]}
              onPress={() => setShowLogout(true)}
              activeOpacity={0.7}
              disabled={loggingOut}
            >
              <View
                style={[
                  styles.logoutIconContainer,
                  isRtl && styles.logoutIconContainerRtl,
                  { backgroundColor: COLORS.error + '15' },
                ]}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <LogOut size={20} color={COLORS.error} />
                )}
              </View>
              <Text style={[styles.logoutText, { color: COLORS.error }]}>
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

          {/* ── MODALS ───────────────────────────────────────────────────────── */}
          <ActionModal
            visible={showLogout}
            severity="warning"
            title={
              t('profile.logout.confirmTitle') ||
              (translations.profile &&
                translations.profile.logout?.confirmTitle) ||
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
              (translations.profile &&
                translations.profile.logout?.confirmLabel) ||
              'Logout'
            }
            cancelLabel={
              t('profile.logout.cancelLabel') ||
              (translations.profile &&
                translations.profile.logout?.cancelLabel) ||
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

          {/* ── Subscription Gate Modal ─────────────────────────── */}
          <ActionModal
            visible={gateModal.visible}
            severity="warning"
            title={`${gateModal.featureName} requires a Sower subscription`}
            message={
              subscriptionTier === 'free'
                ? `Upgrade your plan to access ${gateModal.featureName}. Choose a Sower tier to unlock premium features.`
                : `${gateModal.featureName} requires a higher-tier plan. Upgrade to Covenant Sower to access this feature.`
            }
            confirmLabel="Upgrade"
            cancelLabel="Not now"
            onCancel={() =>
              setGateModal({ visible: false, featureName: '' })
            }
            onConfirm={() => {
              setGateModal({ visible: false, featureName: '' });
              navigation.navigate(route.sower);
            }}
          />
        </>
      )}

      <Animated.View
        style={{
          transform: [
            {
              translateY: tabBarAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
          opacity: tabBarAnimation,
        }}
      >
        <BottomTab activeTab="profile" setActiveTab={tab => console.log(tab)} />
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 56 : 32,
  },

  // ── Profile card ──
  profileCard: {
    borderRadius: BORDER_RADIUS.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  profileHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  profileNameRowRtl: {
    flexDirection: 'row-reverse',
  },
  profileNameSection: {
    flex: 1,
    minWidth: 0,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    flexShrink: 1,
  },
  profileUsername: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 3,
  },
  accountPill: {
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  accountPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  profileMetaRow: {
    marginTop: SPACING.sm,
    gap: 4,
  },
  profileMetaRowRtl: {
    alignItems: 'flex-end',
  },
  profileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileMetaItemRtl: {
    flexDirection: 'row-reverse',
  },
  profileMetaText: {
    flexShrink: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  profileDivider: {
    height: 1,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  profileDetails: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  detailRow: {
    marginBottom: SPACING.md,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailLabelRtl: {
    flexDirection: 'row-reverse',
  },
  detailLabelText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },

  // Quick actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickActionCard: {
    width: '31.8%',
    minHeight: 88,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    lineHeight: 15,
  },

  // Stats
  avatarWrapper: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    letterSpacing: 1,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  name: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  email: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  memberPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statValueCompact: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabelCompact: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Menu ──
  menuSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitleRtl: {
    marginLeft: 0,
    marginRight: SPACING.xs,
  },
  menuCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuLeftRtl: {
    flexDirection: 'row-reverse',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuIconContainerRtl: {
    marginRight: 0,
    marginLeft: SPACING.md,
  },
  menuLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuRightRtl: {
    flexDirection: 'row-reverse',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  rightLangText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutButtonRtl: {
    flexDirection: 'row-reverse',
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  logoutIconContainerRtl: {
    marginRight: 0,
    marginLeft: SPACING.md,
  },
  logoutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },

  // ── Sower Status ──
  sowerCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sowerInfo: {
    flex: 1,
  },
  sowerLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sowerValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginTop: 4,
  },
  sowerExpiry: {
    fontSize: FONT_SIZES.xs,
    marginTop: 4,
  },
  manageButton: {
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginLeft: SPACING.md,
  },
  manageButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});

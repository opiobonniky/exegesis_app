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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Moon,
  Sun,
  User,
  BookOpen,
  Heart,
  Star,
  Bell,
  ChevronRight,
  Edit,
  History,
  Target,
  LogOut,
  FileText,
  CircleUserRoundIcon,
  Settings2,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
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
  const scrollY = useRef(0);
  const tabBarAnimation = useRef(new Animated.Value(1)).current;

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

  if (!app || !app.userInfo) return null;

  const { userInfo, isDark, toggleTheme, logout } = app;
  const user = userInfo as any;
  const COLORS = getColors(isDark);

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

  const initials = useMemo(() => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  const statCards = useMemo(
    () => [
      {
        label: 'Books',
        value: stats.booksRead.toString(),
        icon: BookOpen,
        color: COLORS.primary,
      },
      {
        label: 'Chapters',
        value: stats.chaptersRead.toString(), // ✅ correct now
        icon: Target,
        color: '#3B82F6',
      },
      {
        label: 'Highlights',
        value: stats.highlights.toString(),
        icon: Star,
        color: '#F59E0B',
      },
      {
        label: 'Notes',
        value: stats.notes.toString(),
        icon: FileText,
        color: '#8B5CF6',
      },
    ],
    [stats, COLORS.primary],
  );

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

  const menuSections = useMemo(
    () => [
      {
        title: 'Bible Study',
        items: [
          {
            icon: BookOpen,
            label: 'Continue Reading',
            route: route.bible,
            color: COLORS.primary,
          },
          {
            icon: Star,
            label: 'My Highlights',
            route: route.Highlights,
            badge:
              stats.highlights > 0 ? stats.highlights.toString() : undefined,
            color: '#F59E0B',
          },
          {
            icon: Heart,
            label: 'Favorites',
            route: route.favorites,
            badge: stats.favorites > 0 ? stats.favorites.toString() : undefined,
            color: '#EF4444',
          },
          {
            icon: FileText,
            label: 'My Notes',
            route: route.notes,
            badge: stats.notes > 0 ? stats.notes.toString() : undefined,
            color: '#8B5CF6',
          },
          {
            icon: History,
            label: 'Reading History',
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
        title: 'Settings',
        items: [
          {
            icon: isDark ? Moon : Sun,
            label: `${isDark ? 'Light' : 'Dark'} Mode`,
            isSwitch: true,
            value: isDark,
            onToggle: toggleTheme,
            color: COLORS.accent,
          },
          {
            icon: Bell,
            label: 'Notifications',
            onPress: () => navigation.navigate(route.notificationSettings),
            color: '#EC4899',
          },
          {
            icon: User,
            label: 'Edit Profile',
            onPress: () => navigation.navigate(route.editProfile),
            color: '#06B6D4',
          },
          {
            icon: Settings2,
            label: 'Reading Settings',
            onPress: () => navigation.navigate(route.readingSettings),
            color: COLORS.primary,
          },
        ],
      },
    ],
    [COLORS.primary, COLORS.accent, isDark, stats],
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ActionHeader title="Profile Information" />
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
          <View style={styles.profileHeader}>
            <View style={styles.profileTitleRow}>
              <View style={styles.profileNameSection}>
                <Text style={[styles.profileName, { color: COLORS.text }]}>
                  {user?.firstName} {user?.lastName}
                </Text>
                {user?.username ? (
                  <Text
                    style={[styles.profileUsername, { color: COLORS.primary }]}
                  >
                    @{user.username}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: COLORS.primary + '15' },
                ]}
                onPress={() => navigation.navigate(route.editProfile)}
              >
                <Edit size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[styles.profileDivider, { backgroundColor: COLORS.border }]}
          />

          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Mail size={14} color={COLORS.muted} />
                <Text style={[styles.detailLabelText, { color: COLORS.muted }]}>
                  Email
                </Text>
              </View>
              <Text
                style={[styles.detailValue, { color: COLORS.text }]}
                numberOfLines={1}
              >
                {user?.email}
              </Text>
            </View>

            {user?.phoneNumber ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <Phone size={14} color={COLORS.muted} />
                  <Text
                    style={[styles.detailLabelText, { color: COLORS.muted }]}
                  >
                    Phone
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: COLORS.text }]}>
                  {user.phoneNumber}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Calendar size={14} color={COLORS.muted} />
                <Text style={[styles.detailLabelText, { color: COLORS.muted }]}>
                  Member since
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: COLORS.text }]}>
                {new Date(user?.createdAt || Date.now()).toLocaleDateString(
                  'en-US',
                  {
                    month: 'long',
                    year: 'numeric',
                  },
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* ── STATS ROW ────────────────────────────────────────────────── */}
        <View
          style={[styles.statsRow, { backgroundColor: COLORS.cardBackground }]}
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
              <Text style={[styles.statValueCompact, { color: COLORS.text }]}>
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
            <Text style={[styles.sectionTitle, { color: COLORS.muted }]}>
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
                      <View style={styles.menuLeft}>
                        <View
                          style={[
                            styles.menuIconContainer,
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
                    <View style={styles.menuLeft}>
                      <View
                        style={[
                          styles.menuIconContainer,
                          { backgroundColor: item.color + '15' },
                        ]}
                      >
                        <Icon size={20} color={item.color} />
                      </View>
                      <Text style={[styles.menuLabel, { color: COLORS.text }]}>
                        {item.label}
                      </Text>
                    </View>

                    <View style={styles.menuRight}>
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
                      <ChevronRight size={20} color={COLORS.muted} />
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
            {loggingOut ? 'Logging out…' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      <ActionModal
        visible={showLogout}
        severity="warning"
        title="Logout"
        message="Are you sure you want to logout from your account?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />

      <ActionModal
        visible={modal.status}
        title={modal.title}
        message={modal.message}
        severity={modal.severity}
        onConfirm={() => setModal({ ...modal, status: false })}
      />

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
    padding: SPACING.lg,
    paddingTop: 0,
    paddingBottom: 20,
  },

  // ── Profile card ──
  profileCard: {
    borderRadius: BORDER_RADIUS.xl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  profileHeader: {
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileNameSection: {
    flex: 1,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  profileUsername: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 2,
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
  detailLabelText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
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
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
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
    padding: SPACING.lg,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
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
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  logoutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

import {
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import React, { useContext, useEffect, useRef } from 'react';
import { FONT_SIZES, getColors, SPACING } from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, Moon, Sun, User } from 'lucide-react-native';
import { useLanguage } from '../component/language-translation/LanguageProvider';
import { AppContext } from '../common/AppContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type BaseProps = {
  /** Hide the back button even when onPress is provided */
  hideBack?: boolean;
};

/** Standard header — logo bar + title row */
type StandardProps = BaseProps & {
  mode?: 'standard';
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
};

/** Home header — logo + greeting row + profile/theme controls */
type HomeProps = BaseProps & {
  mode: 'home';
  greeting: string; // e.g. "Good Morning,"
  userName: string; // e.g. "John"
  tagline?: string; // e.g. "Your daily guidance awaits"
  isDarkMode: boolean;
  onThemeToggle: () => void;
  profilePhotoUrl?: string | null;
  onProfilePress: () => void;
};

type Props = StandardProps | HomeProps;

// ── Constants ─────────────────────────────────────────────────────────────────

const ANDROID_TOP =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 34) : 44;

// ── Logo lockup ───────────────────────────────────────────────────────────────

const LogoLockup = ({
  compact = false,
  isLight = false,
}: {
  compact?: boolean;
  isLight?: boolean;
}) => {
  const { translations } = useLanguage();
  return (
    <View style={logo.wrap}>
      <Image
        source={require('../assets/logos/exegesis-logo.png')}
        style={compact ? logo.imageCompact : logo.image}
        resizeMode="contain"
      />
      <View
        style={[
          logo.divider,
          compact && { height: 32 },
          isLight && { backgroundColor: 'rgba(0,0,0,0.1)' },
        ]}
      />
      <View style={logo.textBlock}>
        <Text
          style={[
            logo.appNameBold,
            compact && { fontSize: 13, lineHeight: 17 },
            isLight && { color: '#0f2744' },
          ]}
        >
          Exegesis
        </Text>
        <Text
          style={[
            logo.tagline,
            compact && { fontSize: 8 },
            isLight && { color: '#F0B429' },
          ]}
        >
          {translations.appTagline || 'Your Daily Spiritual Companion'}
        </Text>
      </View>
    </View>
  );
};

const logo = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  image: {
    width: 72,
    height: 72,
  },
  imageCompact: {
    width: 44,
    height: 44,
  },
  divider: {
    width: 1,
    height: 44,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  textBlock: {
    justifyContent: 'center',
  },
  appName: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
    lineHeight: 17,
  },
  appNameBold: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '500',
    color: '#F0B429',
    letterSpacing: 0.5,
    marginTop: 3,
    lineHeight: 14,
  },
});

// ── ActionHeader ──────────────────────────────────────────────────────────────

const ActionHeader = (props: Props) => {
  const app = useContext(AppContext);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  const titleKey =
    props.mode === 'home' ? props.userName : (props as StandardProps).title;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleKey]);

  if (!app) return null;
  const { isDark } = app as any;
  const COLORS = getColors(isDark);

  // ── HOME MODE ──────────────────────────────────────────────────────────────
  if (props.mode === 'home') {
    const {
      greeting,
      userName,
      tagline,
      isDarkMode,
      onThemeToggle,
      profilePhotoUrl,
      onProfilePress,
    } = props;

    return (
      <View style={[styles.shadowWrapper, isDark && styles.shadowWrapperDark]}>
        <StatusBar
          backgroundColor="transparent"
          translucent
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />
        {isDark ? (
          <LinearGradient
            colors={COLORS.headgradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.container}
          >
            <View style={styles.shimmerLine} />
            <View style={[styles.topBar, { paddingTop: ANDROID_TOP }]}>
              <View style={{ paddingTop: 6 }}>
                <LogoLockup compact isLight={false} />
              </View>
              <View style={styles.homeControls}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={onThemeToggle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.75}
                >
                  {isDarkMode ? (
                    <Sun size={18} color="#F0B429" />
                  ) : (
                    <Moon size={18} color="#F0B429" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.avatarBtn}
                  onPress={onProfilePress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.8}
                >
                  {profilePhotoUrl ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <User size={20} color="rgba(255,255,255,0.9)" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.separator} />
            <Animated.View
              style={[
                styles.greetingRow,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>{userName} 👋</Text>
              {!!tagline && <Text style={styles.tagline}>{tagline}</Text>}
            </Animated.View>
          </LinearGradient>
        ) : (
          <View
            style={[styles.container, { backgroundColor: COLORS.background }]}
          >
            <View
              style={[
                styles.shimmerLine,
                { backgroundColor: COLORS.primary + '20' },
              ]}
            />
            <View style={[styles.topBar, { paddingTop: ANDROID_TOP }]}>
              <View style={{ paddingTop: 6 }}>
                <LogoLockup compact isLight={true} />
              </View>
              <View style={styles.homeControls}>
                <TouchableOpacity
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: COLORS.primary + '15',
                      borderColor: COLORS.primary + '30',
                    },
                  ]}
                  onPress={onThemeToggle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.75}
                >
                  {isDarkMode ? (
                    <Sun size={18} color={COLORS.primary} />
                  ) : (
                    <Moon size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.avatarBtn,
                    {
                      backgroundColor: COLORS.surface,
                      borderColor: COLORS.border,
                    },
                  ]}
                  onPress={onProfilePress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.8}
                >
                  {profilePhotoUrl ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <User size={20} color={COLORS.text} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={[styles.separator, { backgroundColor: COLORS.border }]}
            />
            <Animated.View
              style={[
                styles.greetingRow,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={[styles.greeting, { color: COLORS.textSecondary }]}>
                {greeting}
              </Text>
              <Text style={[styles.userName, { color: COLORS.text }]}>
                {userName} 👋
              </Text>
              {!!tagline && (
                <Text style={[styles.tagline, { color: COLORS.accent }]}>
                  {tagline}
                </Text>
              )}
            </Animated.View>
          </View>
        )}
      </View>
    );
  }

  // ── STANDARD MODE ─────────────────────────────────────────────────────────
  const { title, subtitle, onPress, rightComponent, hideBack } =
    props as StandardProps;

  return (
    <View style={[styles.shadowWrapper, isDark && styles.shadowWrapperDark]}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      {isDark ? (
        <LinearGradient
          colors={COLORS.headgradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.container}
        >
          <View style={styles.shimmerLine} />
          <View style={[styles.topBar, { paddingTop: ANDROID_TOP }]}>
            {onPress && !hideBack ? (
              <>
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.sideSlot}
                >
                  <View style={styles.backCircle}>
                    <ChevronLeft
                      color={COLORS.white}
                      size={20}
                      strokeWidth={2.5}
                    />
                  </View>
                </TouchableOpacity>
                <View style={{ paddingTop: 10 }}>
                  <LogoLockup compact isLight={false} />
                </View>
                {rightComponent ? (
                  <View style={[styles.sideSlot, { alignItems: 'flex-end' }]}>
                    <View style={styles.rightCircle}>{rightComponent}</View>
                  </View>
                ) : (
                  <View style={styles.sideSlot} />
                )}
              </>
            ) : (
              <>
                <View style={{ paddingTop: 10 }}>
                  <LogoLockup compact isLight={false} />
                </View>
                <View style={{ flex: 1 }} />
                {rightComponent && (
                  <View style={[styles.sideSlot, { alignItems: 'flex-end' }]}>
                    <View style={styles.rightCircle}>{rightComponent}</View>
                  </View>
                )}
              </>
            )}
          </View>
          <View style={styles.separator} />
          <Animated.View
            style={[
              styles.titleRow,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </Animated.View>
        </LinearGradient>
      ) : (
        <View
          style={[styles.container, { backgroundColor: COLORS.background }]}
        >
          <View
            style={[
              styles.shimmerLine,
              { backgroundColor: COLORS.primary + '20' },
            ]}
          />
          <View style={[styles.topBar, { paddingTop: ANDROID_TOP }]}>
            {onPress && !hideBack ? (
              <>
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.sideSlot}
                >
                  <View
                    style={[
                      styles.backCircle,
                      {
                        backgroundColor: COLORS.surface,
                        borderColor: COLORS.border,
                      },
                    ]}
                  >
                    <ChevronLeft
                      color={COLORS.text}
                      size={20}
                      strokeWidth={2.5}
                    />
                  </View>
                </TouchableOpacity>
                <View style={{ paddingTop: 10 }}>
                  <LogoLockup compact isLight={true} />
                </View>
                {rightComponent ? (
                  <View style={[styles.sideSlot, { alignItems: 'flex-end' }]}>
                    <View
                      style={[
                        styles.rightCircle,
                        {
                          backgroundColor: COLORS.surface,
                          borderColor: COLORS.border,
                        },
                      ]}
                    >
                      {rightComponent}
                    </View>
                  </View>
                ) : (
                  <View style={styles.sideSlot} />
                )}
              </>
            ) : (
              <>
                <View style={{ paddingTop: 10 }}>
                  <LogoLockup compact isLight={true} />
                </View>
                <View style={{ flex: 1 }} />
                {rightComponent && (
                  <View style={[styles.sideSlot, { alignItems: 'flex-end' }]}>
                    <View
                      style={[
                        styles.rightCircle,
                        {
                          backgroundColor: COLORS.surface,
                          borderColor: COLORS.border,
                        },
                      ]}
                    >
                      {rightComponent}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
          <View
            style={[styles.separator, { backgroundColor: COLORS.border }]}
          />
          <Animated.View
            style={[
              styles.titleRow,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text
              style={[styles.title, { color: COLORS.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {!!subtitle && (
              <Text
                style={[styles.subtitle, { color: COLORS.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadowWrapper: {
    width: '100%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
    backgroundColor: 'transparent',
  },
  shadowWrapperDark: {
    shadowOpacity: 0.15,
  },

  container: {
    width: '100%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: SPACING.md,
  },

  shimmerLine: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: 'rgba(240,180,41,0.18)',
    borderRadius: 1,
  },

  // ── Shared row ────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.xs,
  },

  separator: {
    height: 1,
    marginHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: SPACING.sm,
  },

  // ── Standard: side slots ──────────────────────────────────────────────────
  sideSlot: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Standard: title row ───────────────────────────────────────────────────
  titleRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },

  // ── Home: controls (right side of row 1) ─────────────────────────────────
  homeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(240,180,41,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // ── Home: greeting row (row 2) ────────────────────────────────────────────
  greetingRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  greeting: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 1,
  },
  tagline: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '400',
    color: '#F0B429',
    letterSpacing: 0.3,
    marginTop: 4,
    opacity: 0.85,
  },
});

export default ActionHeader;

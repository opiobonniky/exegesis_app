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
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FONT_SIZES, getColors, SPACING } from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, ChevronRight, Moon, Sun, User, BookOpen } from 'lucide-react-native';
import { useLanguage, isRtlLanguage } from '../component/language-translation/LanguageProvider';
import { useTranslation } from '../hooks/useTranslation';
import { AppContext } from '../common/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // Optional custom logo component for standard headers
  logoComponent?: React.ReactNode;
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
  // Controls whether the greeting row (second row with name & tagline) is shown.
  showGreeting?: boolean;
  // Optional custom logo component to render instead of the default emblem+wordmark.
  logoComponent?: React.ReactNode;
  // Optional overrides for app name and tagline shown in the lockup
  appName?: string;
  taglineText?: string;
};

type Props = StandardProps | HomeProps;

// ── Constants ─────────────────────────────────────────────────────────────────

// Default top inset for platforms when safe area is not available
const DEFAULT_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

// ── Logo lockup ───────────────────────────────────────────────────────────────

const LogoLockup = ({ compact = false, appName, tagline }: { compact?: boolean; appName?: string; tagline?: string }) => {
  const { translations, language } = useLanguage();
  const rtl = language === 'ar';
  const [translatedAppName, setTranslatedAppName] = useState('');

  useEffect(() => {
    const name = appName || 'Exegesis';
    if (language !== 'en') {
      useTranslation(name).then(setTranslatedAppName).catch(() => setTranslatedAppName(name));
    } else {
      setTranslatedAppName(name);
    }
  }, [appName, language]);

  return (
    <View style={[logo.wrap, rtl && logo.wrapRtl]}>
      <LinearGradient
        colors={['#6D28D9', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[logo.emblem, compact ? logo.emblemCompact : {}]}
      >
        <BookOpen size={compact ? 18 : 22} color="#FFFFFF" strokeWidth={2} />
      </LinearGradient>

      <View style={logo.textBlock}>
        <Text
          style={[
            logo.appNameBold,
            compact && { fontSize: 14, lineHeight: 18 },
          ]}
        >
          {translatedAppName || appName || 'Exegesis'}
        </Text>
        <Text style={[logo.tagline, compact && { fontSize: 10 }]}> 
          {tagline || translations.appTagline || 'Your Daily Spiritual Companion'}
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
  wrapRtl: {
    flexDirection: 'row-reverse',
  },
  image: {
    width: 72,
    height: 72,
  },
  imageCompact: {
    width: 44,
    height: 44,
  },
  emblem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  emblemCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0f2744',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.3,
    marginTop: 3,
    lineHeight: 16,
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

  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);

  if (!app) return null;
  const { isDark } = app as any;
  const COLORS = getColors(isDark);
  const insets = useSafeAreaInsets();
  // Normalize top inset: on iOS devices with large notches the inset can be
  // large. Subtract a small offset for visual balance so the header doesn't
  // appear to have too much empty space. Always clamp to DEFAULT_TOP.
  const rawTop = insets.top || DEFAULT_TOP;
  // Add extra top spacing on Android as requested; keep iOS using the
  // measured safe-area inset. The extra 8px gives more breathing room under
  // Android status bars.
  const topInset = Platform.OS === 'android' ? rawTop + 8 : rawTop;

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
      showGreeting = true,
      logoComponent,
      appName,
      taglineText,
    } = props as HomeProps;

    // Custom compact home header layout - profile + greeting in one row,
    // reduced vertical footprint.
    return (
      <View style={[styles.shadowWrapper, isDark && styles.shadowWrapperDark]}>
        <StatusBar
          backgroundColor="transparent"
          translucent
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />
        <View style={[styles.container, { paddingTop: 0, backgroundColor: isDark ? undefined : COLORS.background }]}> 
          <View style={styles.shimmerLine} />
          <View style={[styles.homeCompactTop, isRtl && styles.homeCompactTopRtl, { paddingTop: topInset }]}> 
            <View style={[styles.homeLeft, isRtl && styles.homeLeftRtl]}> 
              <View style={isRtl ? { marginLeft: 8 } : { marginRight: 8 }}>{logoComponent ? logoComponent : <LogoLockup compact appName={appName} tagline={taglineText} />}</View>
              <View>
                {showGreeting && <Text style={[styles.greeting, { color: COLORS.textSecondary }]}>{greeting}</Text>}
                <Text style={[styles.userName, { color: COLORS.text }]}>{userName} 👋</Text>
              </View>
            </View>

            <View style={[styles.homeRight, isRtl && styles.homeRightRtl]}> 
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onThemeToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.75}
              >
                {isDarkMode ? (
                  <Sun size={18} color="#F0B429" />
                ) : (
                  <Moon size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avatarBtn, { marginLeft: isRtl ? 0 : 8, marginRight: isRtl ? 8 : 0, backgroundColor: isDark ? undefined : COLORS.surface, borderColor: isDark ? undefined : COLORS.border }]}
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
                  <User size={20} color={isDark ? 'rgba(255,255,255,0.9)' : COLORS.text} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.separator, { backgroundColor: isDark ? undefined : COLORS.border }]} />
        </View>
      </View>
    );
  }

  // ── STANDARD MODE ─────────────────────────────────────────────────────────
  const { title, subtitle, onPress, rightComponent, hideBack } =
    props as StandardProps;
  const stdLogo = (props as StandardProps).logoComponent;

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
          <View style={[styles.topBar, isRtl && styles.topBarRtl, { paddingTop: topInset }]}> 
            {onPress && !hideBack ? (
              <>
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.sideSlot}
                >
                  <View style={styles.backCircle}>
                    {isRtl ? (
                      <ChevronRight
                        color={COLORS.white}
                        size={20}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <ChevronLeft
                        color={COLORS.white}
                        size={20}
                        strokeWidth={2.5}
                      />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={{ paddingTop: 6 }}>
                  {stdLogo ? stdLogo : <LogoLockup compact />}
                </View>
                {rightComponent ? (
                  <View style={[styles.sideSlot, { alignItems: isRtl ? 'flex-start' : 'flex-end' }]}>
                    <View style={styles.rightCircle}>{rightComponent}</View>
                  </View>
                ) : (
                  <View style={styles.sideSlot} />
                )}
              </>
            ) : (
              <>
                <View style={{ paddingTop: 6 }}>
                  {stdLogo ? stdLogo : <LogoLockup compact />}
                </View>
                <View style={{ flex: 1 }} />
                {rightComponent && (
                  <View style={[styles.sideSlot, { alignItems: isRtl ? 'flex-start' : 'flex-end' }]}>
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
           <View style={[styles.topBar, isRtl && styles.topBarRtl, { paddingTop: topInset }]}> 
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
                    {isRtl ? (
                      <ChevronRight
                        color={COLORS.text}
                        size={20}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <ChevronLeft
                        color={COLORS.text}
                        size={20}
                        strokeWidth={2.5}
                      />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={{ paddingTop: 10 }}>
                  {stdLogo ? stdLogo : <LogoLockup compact />}
                </View>
                {rightComponent ? (
                  <View style={[styles.sideSlot, { alignItems: isRtl ? 'flex-start' : 'flex-end' }]}>
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
                 <View style={{ paddingTop: 6 }}>
                   <LogoLockup compact />
                 </View>
                <View style={{ flex: 1 }} />
                {rightComponent && (
                  <View style={[styles.sideSlot, { alignItems: isRtl ? 'flex-start' : 'flex-end' }]}>
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
    paddingBottom: SPACING.sm,
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
    paddingBottom: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  topBarRtl: {
    flexDirection: 'row-reverse',
  },

  // Compact home layout
  homeCompactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  homeCompactTopRtl: {
    flexDirection: 'row-reverse',
  },

  homeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  homeLeftRtl: {
    flexDirection: 'row-reverse',
  },

  homeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeRightRtl: {
    flexDirection: 'row-reverse',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(240,180,41,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
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

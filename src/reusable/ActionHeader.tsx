import {
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StyleSheet,
  Image,
} from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { getColors, SPACING } from '../constants/theme';
import { ChevronLeft, ChevronRight, Search, User } from 'lucide-react-native';
import exegesisLogo from '../assets/logos/exegesis_bg_rm.png';
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

/** Home header — brand bar + user profile section */
type HomeProps = BaseProps & {
  mode: 'home';
  greeting?: string;
  userName?: string;
  tagline?: string;
  onSearchPress?: () => void;
  profilePhotoUrl?: string | null;
  onProfilePress?: () => void;
  hideProfile?: boolean;
  appName?: string;
  taglineText?: string;
};

type Props = StandardProps | HomeProps;

// ── Constants ─────────────────────────────────────────────────────────────────

// Default top inset for platforms when safe area is not available
const DEFAULT_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

// Demo avatar shown when the user has no profile photo (Home header)
const DEMO_AVATAR_URL = 'https://i.pravatar.cc/150?img=12';

// ── Logo lockup ───────────────────────────────────────────────────────────────

const LogoLockup = ({ compact = false, appName, tagline }: { compact?: boolean; appName?: string; tagline?: string }) => {
  const app = useContext(AppContext);
  const isDark = (app as any)?.isDark ?? false;
  const { translations, language } = useLanguage();
  const rtl = language === 'ar';
  const [translatedAppName, setTranslatedAppName] = useState('');

  useEffect(() => {
    const name: string = "Exegesis Project";
    if (language !== 'en') {
      useTranslation(name).then(setTranslatedAppName).catch(() => setTranslatedAppName(name));
    } else {
      setTranslatedAppName(name);
    }
  }, [language]);

  return (
    <View style={[logo.wrap, rtl && logo.wrapRtl]}>
      <Image
        source={exegesisLogo}
        style={compact ? logo.imageCompact : logo.image}
        resizeMode="contain"
      />
      <View style={logo.textBlock}>
        <Text style={[logo.appNameBold, compact && { fontSize: 16, lineHeight: 20 }, { color: isDark ? '#FFFFFF' : '#0f2744' }]}>
          {translatedAppName || appName || 'Exegesis'}
        </Text>
        <Text style={[logo.tagline, compact && { fontSize: 11, lineHeight: 14 }, { color: isDark ? 'rgba(255,255,255,0.5)' : '#6B7280' }]}>
          {tagline || translations.appTagline || 'Your Biblical Companion'}
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
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  imageCompact: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  textBlock: {
    justifyContent: 'center',
  },
  appNameBold: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.3,
    marginTop: 2,
    lineHeight: 14,
  },
});

// ── ActionHeader ──────────────────────────────────────────────────────────────

const ActionHeader = (props: Props) => {
  const app = useContext(AppContext);

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
      onSearchPress,
      profilePhotoUrl,
      onProfilePress,
      hideProfile,
      appName,
      taglineText,
    } = props as HomeProps;

    return (
      <View style={styles.homeHeader}>
        <StatusBar
          backgroundColor="transparent"
          translucent
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />
        <View style={[styles.homeContainer, { backgroundColor: isDark ? undefined : COLORS.background }]}>
          {/* Row 1: Brand bar */}
          <View style={[styles.brandBar, isRtl && styles.brandBarRtl, { paddingTop: topInset }]}>
            <LogoLockup compact appName={appName} tagline={taglineText} />
            <View style={styles.brandActions}>
              {onSearchPress && (
                <TouchableOpacity
                  onPress={onSearchPress}
                  style={[styles.themeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : COLORS.surface }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Search size={16} color={isDark ? 'rgba(255,255,255,0.7)' : COLORS.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onProfilePress}
                style={[styles.profileBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : COLORS.surface }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.75}
              >
                {profilePhotoUrl ? (
                  // Thin light-blue ring matches the Home design (docs/design-pic)
                  <Image
                    source={{ uri: profilePhotoUrl }}
                    style={[
                      styles.headerPic,
                      {
                        borderWidth: 2,
                        borderColor: isDark ? '#7DD3FC' : '#396284',
                      },
                    ]}
                  />
                ) : (
                  // Demo avatar placeholder when the user has no profile photo
                  <Image
                    source={{ uri: DEMO_AVATAR_URL }}
                    style={[
                      styles.headerPic,
                      {
                        borderWidth: 2,
                        borderColor: isDark ? '#7DD3FC' : '#396284',
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {!hideProfile && (
            /* Row 2: User profile section */
            <TouchableOpacity
              onPress={onProfilePress}
              activeOpacity={0.8}
              style={[styles.userSection, isRtl && styles.userSectionRtl]}
            >
              <View style={styles.userPicWrap}>
                {profilePhotoUrl ? (
                  <Image source={{ uri: profilePhotoUrl }} style={styles.userPicImage} />
                ) : (
                  <View style={[styles.userPicPlaceholder, { backgroundColor: COLORS.primary + '20' }]}>
                    <User size={24} color={COLORS.primary} />
                  </View>
                )}
              </View>

              <View style={[styles.userInfoWrap, isRtl && styles.userInfoWrapRtl]}>
                <Text style={[styles.userGreeting, { color: COLORS.muted }]} numberOfLines={1}>
                  {greeting}
                </Text>
                <Text style={[styles.userDisplayName, { color: COLORS.text }]} numberOfLines={1}>
                  {userName}
                </Text>
                {!!tagline && (
                  <Text style={[styles.userTagline, { color: COLORS.muted }]} numberOfLines={1}>
                    {tagline}
                  </Text>
                )}
              </View>

              <View style={[styles.userArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : COLORS.surface }]}>
                <ChevronRight size={18} color={COLORS.muted} strokeWidth={2} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── STANDARD MODE ─────────────────────────────────────────────────────────
  const { title, subtitle, onPress, rightComponent, hideBack } =
    props as StandardProps;
  const stdLogo = (props as StandardProps).logoComponent;

  return (
    <View style={styles.shadowWrapper}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      {isDark ? (
        <View style={[styles.container, { backgroundColor: COLORS.background }]}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image
                    source={exegesisLogo}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 }} numberOfLines={1}>
                    {title}
                  </Text>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image
                    source={exegesisLogo}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 }} numberOfLines={1}>
                    {title}
                  </Text>
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
        </View>
      ) : (
        <View
          style={[styles.container, { backgroundColor: COLORS.background }]}
        >
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image
                    source={exegesisLogo}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 }} numberOfLines={1}>
                    {title}
                  </Text>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image
                    source={exegesisLogo}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 }} numberOfLines={1}>
                    {title}
                  </Text>
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
        </View>
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadowWrapper: {
    width: '100%',
  },

  container: {
    width: '100%',
    overflow: 'hidden',
    paddingBottom: SPACING.sm,
  },

  homeContainer: {
    width: '100%',
    overflow: 'hidden',
    paddingBottom: SPACING.md,
  },

  // Home header is seamless with the page background (no shadow / rounded corners)
  homeHeader: {
    width: '100%',
  },

  // ── Brand bar (Row 1) ──────────────────────────────────────────────────────
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  brandBarRtl: {
    flexDirection: 'row-reverse',
  },
  brandActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPic: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  // ── User profile section (Row 2) ───────────────────────────────────────────
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 14,
  },
  userSectionRtl: {
    flexDirection: 'row-reverse',
  },
  userPicWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  userPicImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userPicPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoWrap: {
    flex: 1,
  },
  userInfoWrapRtl: {
    alignItems: 'flex-end',
  },
  userGreeting: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  userDisplayName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  userTagline: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  userArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Shared row (Standard mode) ─────────────────────────────────────────────
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

});

export default ActionHeader;

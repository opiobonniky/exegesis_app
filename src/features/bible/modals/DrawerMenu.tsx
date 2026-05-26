// DrawerMenu.tsx — minimal, task-first layout
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Easing,
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ScrollView,
  Switch,
} from 'react-native';
import {
  X,
  Edit3,
  FileText,
  Clock,
  Star,
  BookOpen,
  Minus,
  Plus,
  Settings2,
  Moon,
  Sun,
  ChevronRight,
  ChevronLeft,
  Lock,
  BookText,
} from 'lucide-react-native';
import { DrawerMenuProps } from '../types';
import { getColors, FONT_SIZES } from '../../../constants/theme';
import {
  getVersionById,
} from '../../../assets/bibleVersion/json/bibleVersions';
import { route } from '../../../component/navigations/routes';
import { AppContext } from '../../../common/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage, isRtlLanguage } from '../../../component/language-translation/LanguageProvider';

type NavRouteKey = keyof typeof route;
type IconType = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;



export default function DrawerMenu({
  visible,
  onClose,
  isGuest = false,
  onGuestNavPress,
  fontSize,
  onFontSizeChange,
  bibleVersionId,
  onVersionChange,
  showVersionPicker,
  onToggleVersionPicker,
  navigation,
  isDark,
}: DrawerMenuProps) {
  const app = useContext(AppContext);
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;

  const COLORS = getColors(isDark);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = useMemo(
    () => Math.min(windowWidth * 0.78, 320),
    [windowWidth],
  );

  const [mounted, setMounted] = useState(visible);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const activeVersion = useMemo(
    () => getVersionById(bibleVersionId),
    [bibleVersionId],
  );

  useEffect(() => {
    progressAnim.stopAnimation();

    if (visible) {
      setMounted(true);
      Animated.spring(progressAnim, {
        toValue: 1,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [progressAnim, visible]);

  const handleClose = useCallback(() => {
    if (showVersionPicker) onToggleVersionPicker();
    onClose();
  }, [onClose, onToggleVersionPicker, showVersionPicker]);

  const go = useCallback(
    (routeName: string) => {
      if (isGuest) {
        handleClose();
        onGuestNavPress?.();
        return;
      }
      handleClose();
      navigation.navigate(routeName);
    },
    [handleClose, isGuest, navigation, onGuestNavPress],
  );

  const goReadingSettings = useCallback(() => {
    if (isGuest) {
      handleClose();
      onGuestNavPress?.();
      return;
    }
    handleClose();
    navigation.navigate(route.readingSettings, { fontSize, onFontSizeChange });
  }, [
    fontSize,
    handleClose,
    isGuest,
    navigation,
    onFontSizeChange,
    onGuestNavPress,
  ]);

  const clampFontSize = useCallback(
    (size: number) => Math.max(12, Math.min(28, size)),
    [],
  );
  const canDecreaseFont = fontSize > 12;
  const canIncreaseFont = fontSize < 28;

  const translateX = useMemo(
    () =>
      progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: isRtl ? [drawerWidth, 0] : [-drawerWidth, 0],
      }),
    [drawerWidth, isRtl, progressAnim],
  );
  const backdropOpacity = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const bg = COLORS.cardBackground;
  const border = COLORS.border;
  const surface = COLORS.surface;
  const overlay = COLORS.overlay ?? 'rgba(0,0,0,0.5)';

  const userInfo = app?.userInfo ?? null;
  const displayName = useMemo(() => {
    if (!userInfo) return bc?.guestName || 'Guest';
    const full =
      `${userInfo.firstName ?? ''} ${userInfo.lastName ?? ''}`.trim();
    return full || userInfo.username || userInfo.email || 'Account';
  }, [userInfo]);
  const displaySub = useMemo(() => {
    if (!userInfo) return bc?.guestSubtitle || 'Sign in to sync highlights, notes & favourites';
    return userInfo.email || userInfo.username || 'Signed in';
  }, [userInfo]);
  const initials = useMemo(() => {
    const src = displayName.trim();
    if (!src) return 'A';
    const parts = src.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? 'A';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return (first + last).toUpperCase();
  }, [displayName]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          s.backdrop,
          { opacity: backdropOpacity, backgroundColor: overlay },
        ]}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          s.panel,
          {
            width: drawerWidth,
            backgroundColor: bg,
            transform: [{ translateX }],
            ...(isRtl
              ? { right: 0, borderLeftWidth: 1, borderLeftColor: border, borderRightWidth: 0 }
              : { left: 0, borderRightWidth: 1, borderRightColor: border }),
          },
        ]}
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View
          style={[
            s.topBar,
            {
              paddingTop: insets.top + 14,
              borderBottomColor: border,
              flexDirection: isRtl ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[s.topLeft, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                s.appIconWrap,
                { backgroundColor: `${COLORS.primary}18` },
              ]}
            >
              <BookOpen size={16} color={COLORS.primary} strokeWidth={2.2} />
            </View>
            <Text style={[s.appName, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
              {bc?.bibleReader || 'Bible Reader'}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            <X size={18} color={COLORS.muted} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          style={s.body}
          contentContainerStyle={[
            s.bodyContent,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Account ─────────────────────────────────────────────────── */}
          <Text style={[s.sectionTitle, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>{bc?.sectionAccount || 'Account'}</Text>
          <Pressable
            onPress={() => go(route.profile)}
            style={({ pressed }) => [
              s.accountCard,
              {
                backgroundColor: surface,
                borderColor: border,
                opacity: pressed ? 0.88 : 1,
                flexDirection: isRtl ? 'row-reverse' : 'row',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={userInfo ? 'Open profile' : 'Sign in'}
            accessibilityHint={
              userInfo ? 'Opens your profile' : 'Sign in required'
            }
          >
            <View
              style={[
                s.avatar,
                { backgroundColor: `${COLORS.primary}18`, borderColor: border },
              ]}
            >
              <Text style={[s.avatarText, { color: COLORS.primary }]}>
                {initials}
              </Text>
            </View>
            <View style={s.accountText}>
              <Text
                style={[s.accountName, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                style={[s.accountSub, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {displaySub}
              </Text>
            </View>
            <View style={[s.accountRight, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              {isGuest ? (
                <View
                  style={[
                    s.pill,
                    {
                      backgroundColor: `${COLORS.primary}14`,
                      borderColor: `${COLORS.primary}33`,
                    },
                  ]}
                >
                  <Text style={[s.pillText, { color: COLORS.primary }]}>
                    {bc?.signInBtn || 'Sign in'}
                  </Text>
                </View>
              ) : null}
              {isRtl ? (
                <ChevronLeft size={18} color={COLORS.muted} strokeWidth={2.5} />
              ) : (
                <ChevronRight size={18} color={COLORS.muted} strokeWidth={2.5} />
              )}
            </View>
          </Pressable>

          {/* ── Reading ─────────────────────────────────────────────────── */}
          <Text style={[s.sectionTitle, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>{bc?.sectionReading || 'Reading'}</Text>

          {/* Version */}
          <Pressable
            onPress={goReadingSettings}
            style={[s.versionRow, { backgroundColor: COLORS.primary, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            accessibilityRole="button"
            accessibilityLabel="Bible version"
            accessibilityHint="Opens version picker"
          >
            <View style={s.versionBadge}>
              <Text style={s.versionAbbr}>{activeVersion.abbreviation}</Text>
            </View>
            <View style={s.versionTextWrap}>
              <Text style={[s.versionName, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
                {activeVersion.name}
              </Text>
              <Text style={[s.versionDesc, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
                {activeVersion.description}
              </Text>
            </View>
            <View style={[s.changeChip, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={s.changeText}>
                {showVersionPicker ? (bc?.hideVersion || 'Hide') : (bc?.change || 'Change')}
              </Text>
              <View
                style={[s.chevWrap, showVersionPicker ? s.chevDown : undefined]}
              >
                {isRtl ? (
                  <ChevronLeft
                    size={12}
                    color="rgba(255,255,255,0.85)"
                    strokeWidth={3}
                  />
                ) : (
                  <ChevronRight
                    size={12}
                    color="rgba(255,255,255,0.85)"
                    strokeWidth={3}
                  />
                )}
              </View>
            </View>
          </Pressable>

          {/* ── Font size ────────────────────────────────────────────────── */}
          <View
            style={[
              s.fontRow,
              { backgroundColor: surface, borderColor: border, flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            <Pressable
              onPress={() => onFontSizeChange(clampFontSize(fontSize - 2))}
              disabled={!canDecreaseFont}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                s.fontBtn,
                { opacity: !canDecreaseFont ? 0.45 : pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Decrease font size"
              accessibilityState={{ disabled: !canDecreaseFont }}
            >
              <Minus size={16} color={COLORS.text} strokeWidth={2.5} />
            </Pressable>

            <View style={[s.fontMid, { borderColor: border }]}>
              <Text style={[s.fontVal, { color: COLORS.primary }]}>
                {fontSize}
              </Text>
              <Text style={[s.fontPt, { color: COLORS.muted }]}>pt</Text>
            </View>

            <Pressable
              onPress={() => onFontSizeChange(clampFontSize(fontSize + 2))}
              disabled={!canIncreaseFont}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                s.fontBtn,
                { opacity: !canIncreaseFont ? 0.45 : pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Increase font size"
              accessibilityState={{ disabled: !canIncreaseFont }}
            >
              <Plus size={16} color={COLORS.text} strokeWidth={2.5} />
            </Pressable>
          </View>

          <Pressable
            onPress={goReadingSettings}
            style={({ pressed }) => [
              s.inlineAction,
              {
                backgroundColor: surface,
                borderColor: border,
                opacity: pressed ? 0.85 : 1,
                flexDirection: isRtl ? 'row-reverse' : 'row',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open reading settings"
          >
            <Settings2 size={16} color={COLORS.muted} strokeWidth={2} />
            <Text style={[s.inlineActionText, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left', [isRtl ? 'marginRight' : 'marginLeft']: 10 }]}>
              {bc?.readingSettingsLabel || 'Reading settings'}
            </Text>
            {isRtl ? (
              <ChevronLeft size={16} color={COLORS.muted} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={16} color={COLORS.muted} strokeWidth={2.5} />
            )}
          </Pressable>

          {/* ── 2×2 library grid ─────────────────────────────────────────── */}
          <Text style={[s.sectionTitle, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>{bc?.sectionLibrary || 'Library'}</Text>
          <View style={[s.grid, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {[
              { label: bc?.highlights || 'Highlights', icon: Edit3, routeKey: 'Highlights' as NavRouteKey, color: '#F59E0B' },
              { label: bc?.notes || 'Notes', icon: FileText, routeKey: 'notes' as NavRouteKey, color: '#3B82F6' },
              { label: bc?.readingHistory || 'History', icon: Clock, routeKey: 'readHistory' as NavRouteKey, color: '#8B5CF6' },
              { label: bc?.favorites || 'Favorites', icon: Star, routeKey: 'favorites' as NavRouteKey, color: '#EC4899' },
              { label: bc?.journal || 'Journal', icon: BookText, routeKey: 'journal' as NavRouteKey, color: '#10B981' },
            ].map(({ label, icon: Icon, routeKey, color }) => (
              <Pressable
                key={routeKey}
                onPress={() => go(route[routeKey])}
                style={({ pressed }) => [
                  s.gridCell,
                  {
                    backgroundColor: surface,
                    borderColor: border,
                    opacity: pressed ? 0.85 : 1,
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={isGuest ? 'Sign in required' : undefined}
              >
                <View style={[s.gridIcon, { backgroundColor: `${color}18` }]}>
                  <Icon size={18} color={color} strokeWidth={2} />
                </View>
                <View style={[s.gridText, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[s.gridLabel, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
                    {label}
                  </Text>
                  {isGuest ? (
                    <View style={[s.lockRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                      <Lock size={12} color={COLORS.muted} strokeWidth={2} />
                      <Text style={[s.lockText, { color: COLORS.muted }]}>
                        {bc?.signInBtn || 'Sign in'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>

          {/* ── Appearance ──────────────────────────────────────────────── */}
          <Text style={[s.sectionTitle, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
            {bc?.sectionAppearance || 'Appearance'}
          </Text>
          <View
            style={[
              s.themeRow,
              {
                backgroundColor: surface,
                borderColor: border,
                flexDirection: isRtl ? 'row-reverse' : 'row',
              },
            ]}
            accessibilityRole="adjustable"
            accessibilityLabel="Theme"
          >
            <View style={[s.themeLeft, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              {isDark ? (
                <Moon size={16} color={COLORS.accent} strokeWidth={2} />
              ) : (
                <Sun size={16} color={COLORS.accent} strokeWidth={2} />
              )}
              <View style={s.themeText}>
                <Text style={[s.themeTitle, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
                  {bc?.darkModeLabel || 'Dark mode'}
                </Text>
                <Text style={[s.themeSub, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                  {bc?.switchAppearance || 'Switch appearance'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={app?.toggleTheme ?? (() => {})}
              disabled={!app?.toggleTheme}
              trackColor={{ false: border, true: COLORS.primary }}
              thumbColor={COLORS.white}
              ios_backgroundColor={border}
              style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: { fontSize: FONT_SIZES.md, fontWeight: '700', letterSpacing: -0.2 },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 14, gap: 10 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 6,
  },

  // Account
  accountCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.6 },
  accountText: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 14, fontWeight: '800' },
  accountSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  accountRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: '800' },

  // Version
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionAbbr: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  versionTextWrap: { flex: 1, minWidth: 0 },
  versionName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: '#fff',
  },
  versionDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.86)',
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
  },
  chevWrap: { transform: [{ rotate: '0deg' }] },
  chevDown: { transform: [{ rotate: '90deg' }] },

  versionPicker: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  versionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  versionOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  versionOptionText: { flex: 1, minWidth: 0 },
  versionOptName: { fontSize: 13, fontWeight: '700' },
  versionOptDesc: { fontSize: 12, fontWeight: '500' },
  versionYear: { fontSize: 12, fontWeight: '600', marginLeft: 10 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4 },

  // Font size
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    overflow: 'hidden',
  },
  fontBtn: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontMid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    height: 46,
  },
  fontVal: { fontSize: 20, fontWeight: '800' },
  fontPt: { fontSize: 11, fontWeight: '500', marginBottom: 1 },

  inlineAction: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineActionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },

  // 2×2 grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridText: { flex: 1, minWidth: 0 },
  gridLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  lockText: { fontSize: 12, fontWeight: '600' },

  // Theme
  themeRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  themeText: { flex: 1, minWidth: 0 },
  themeTitle: { fontSize: 14, fontWeight: '800' },
  themeSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});

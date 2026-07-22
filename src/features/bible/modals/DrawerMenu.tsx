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
  Headphones,
  BookText,
  BookMarked,
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

const LIBRARY_ITEMS: { label: string; routeKey: NavRouteKey; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; color: string }[] = [
  { label: 'Highlights', routeKey: 'Highlights' as NavRouteKey, icon: Edit3, color: '#F59E0B' },
  { label: 'Notes', routeKey: 'notes' as NavRouteKey, icon: FileText, color: '#3B82F6' },
  { label: 'History', routeKey: 'readHistory' as NavRouteKey, icon: Clock, color: '#8B5CF6' },
  { label: 'Favorites', routeKey: 'favorites' as NavRouteKey, icon: Star, color: '#EC4899' },
  { label: 'Journal', routeKey: 'journal' as NavRouteKey, icon: BookText, color: '#10B981' },
  { label: "Strong's", routeKey: 'strongsDictionary' as NavRouteKey, icon: BookOpen, color: '#6366F1' },
];

export default function DrawerMenu({
  visible,
  onClose,
  isGuest = false,
  onGuestNavPress,
  fontSize,
  onFontSizeChange,
  bibleVersionId,
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
    () => Math.min(windowWidth * 0.82, 340),
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
    onClose();
  }, [onClose]);

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
  }, [fontSize, handleClose, isGuest, navigation, onFontSizeChange, onGuestNavPress]);

  const clampFontSize = useCallback((size: number) => Math.max(12, Math.min(28, size)), []);
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
    const full = `${userInfo.firstName ?? ''} ${userInfo.lastName ?? ''}`.trim();
    return full || userInfo.username || userInfo.email || 'Account';
  }, [userInfo]);
  const displaySub = useMemo(() => {
    if (!userInfo) return bc?.guestSubtitle || 'Sign in to sync';
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
      <Animated.View
        style={[s.backdrop, { opacity: backdropOpacity, backgroundColor: overlay }]}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

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
        <View style={{ paddingTop: insets.top + 8, flex: 1 }}>
          <View style={[s.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Pressable
              onPress={() => go(route.profile)}
              style={[s.profileBadge, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            >
              <View style={[s.initialsCircle, { backgroundColor: `${COLORS.primary}18` }]}>
                <Text style={[s.initialsText, { color: COLORS.primary }]}>{initials}</Text>
              </View>
              <View style={s.profileInfo}>
                <Text style={[s.profileName, { color: COLORS.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[s.profileSub, { color: COLORS.muted }]} numberOfLines={1}>
                  {displaySub}
                </Text>
              </View>
              {isRtl ? (
                <ChevronLeft size={14} color={COLORS.muted} strokeWidth={2.5} />
              ) : (
                <ChevronRight size={14} color={COLORS.muted} strokeWidth={2.5} />
              )}
            </Pressable>
            <Pressable
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[s.closeBtn, { backgroundColor: `${COLORS.muted}12` }]}
            >
              <X size={15} color={COLORS.muted} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 14) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.scrollInner}>
              <View style={[s.controlsCard, { backgroundColor: surface, borderColor: border }]}>
                <Pressable
                  onPress={goReadingSettings}
                  style={[s.versionStrip, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
                >
                  <View style={[s.versionIcon, { backgroundColor: `${COLORS.primary}14` }]}>
                    <BookMarked size={16} color={COLORS.primary} strokeWidth={2} />
                  </View>
                  <View style={s.versionInfo}>
                    <Text style={[s.versionAbbr, { color: COLORS.text }]}>
                      {activeVersion.abbreviation}
                    </Text>
                    <Text style={[s.versionName, { color: COLORS.muted }]} numberOfLines={1}>
                      {activeVersion.name}
                    </Text>
                  </View>
                  <View style={[s.versionArrow, { backgroundColor: `${COLORS.muted}12` }]}>
                    {isRtl ? (
                      <ChevronLeft size={12} color={COLORS.muted} strokeWidth={2.5} />
                    ) : (
                      <ChevronRight size={12} color={COLORS.muted} strokeWidth={2.5} />
                    )}
                  </View>
                </Pressable>

                <View style={[s.divider, { backgroundColor: border }]} />

                <View style={[s.fontStrip, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <Pressable
                    onPress={() => onFontSizeChange(clampFontSize(fontSize - 2))}
                    disabled={!canDecreaseFont}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[s.fontBtn, { opacity: !canDecreaseFont ? 0.35 : 1 }]}
                  >
                    <Minus size={16} color={COLORS.text} strokeWidth={2.5} />
                  </Pressable>
                  <Pressable onPress={goReadingSettings} style={s.fontCenter}>
                    <Text style={[s.fontSizeLabel, { color: COLORS.primary }]}>
                      {fontSize}<Text style={[s.fontUnitLabel, { color: COLORS.muted }]}> pt</Text>
                    </Text>
                    <Text style={[s.fontHint, { color: COLORS.muted }]}>Text size</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onFontSizeChange(clampFontSize(fontSize + 2))}
                    disabled={!canIncreaseFont}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[s.fontBtn, { opacity: !canIncreaseFont ? 0.35 : 1 }]}
                  >
                    <Plus size={16} color={COLORS.text} strokeWidth={2.5} />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={goReadingSettings}
                style={({ pressed }) => [
                  s.settingsLink,
                  {
                    backgroundColor: surface,
                    borderColor: border,
                    opacity: pressed ? 0.85 : 1,
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Settings2 size={16} color={COLORS.primary} strokeWidth={2} />
                <Text style={[s.settingsLabel, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
                  {bc?.readingSettingsLabel || 'All reading settings'}
                </Text>
                {isRtl ? (
                  <ChevronLeft size={16} color={COLORS.muted} strokeWidth={2.5} />
                ) : (
                  <ChevronRight size={16} color={COLORS.muted} strokeWidth={2.5} />
                )}
              </Pressable>

              <Pressable
                onPress={() => go(route.voiceSettings)}
                style={({ pressed }) => [
                  s.settingsLink,
                  {
                    backgroundColor: surface,
                    borderColor: border,
                    opacity: pressed ? 0.85 : 1,
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Headphones size={16} color={COLORS.primary} strokeWidth={2} />
                <Text style={[s.settingsLabel, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
                  {bc?.voiceSettingsLabel || 'Voice reading'}
                </Text>
                {isRtl ? (
                  <ChevronLeft size={16} color={COLORS.muted} strokeWidth={2.5} />
                ) : (
                  <ChevronRight size={16} color={COLORS.muted} strokeWidth={2.5} />
                )}
              </Pressable>

              <View style={[s.libraryCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={s.libraryGrid}>
                  {LIBRARY_ITEMS.map(({ label, routeKey, icon: Icon, color }) => (
                    <Pressable
                      key={routeKey}
                      onPress={() => go(route[routeKey])}
                      style={({ pressed }) => [
                        s.libCell,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <View style={[s.libIconBg, { backgroundColor: `${color}14` }]}>
                        <Icon size={20} color={color} strokeWidth={2} />
                      </View>
                      <Text style={[s.libLabel, { color: COLORS.text }]} numberOfLines={1}>
                        {label}
                      </Text>
                      {isGuest && (
                        <View style={[s.libLockBg, { backgroundColor: `${COLORS.muted}20` }]}>
                          <Lock size={10} color={COLORS.muted} strokeWidth={2.5} />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ flex: 1 }} />

              <View
                style={[s.themeRow, { backgroundColor: surface, borderColor: border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
              >
                <View style={[s.themeIconBg, { backgroundColor: `${COLORS.accent}14` }]}>
                  {isDark ? (
                    <Moon size={16} color={COLORS.accent} strokeWidth={2} />
                  ) : (
                    <Sun size={16} color={COLORS.accent} strokeWidth={2} />
                  )}
                </View>
                <View style={s.themeInfo}>
                  <Text style={[s.themeTitle, { color: COLORS.text, textAlign: isRtl ? 'right' : 'left' }]}>
                    {bc?.darkModeLabel || 'Dark mode'}
                  </Text>
                  <Text style={[s.themeSub, { color: COLORS.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                    {bc?.switchAppearance || 'Switch appearance'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={app?.toggleTheme ?? (() => {})}
                  disabled={!app?.toggleTheme}
                  trackColor={{ false: border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                  ios_backgroundColor={border}
                  style={{ transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }] }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: { fontSize: 13, fontWeight: '900' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 14, fontWeight: '800' },
  profileSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  body: { flex: 1 },
  scrollInner: { gap: 10 },

  controlsCard: {
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  versionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  versionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionInfo: { flex: 1, minWidth: 0 },
  versionAbbr: { fontSize: 14, fontWeight: '800' },
  versionName: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  versionArrow: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: { height: 1 },

  fontStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 48,
  },
  fontBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeLabel: { fontSize: 20, fontWeight: '800' },
  fontUnitLabel: { fontSize: 13, fontWeight: '500' },
  fontHint: { fontSize: 9, fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },

  settingsLink: {
    marginHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  libraryCard: {
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  libraryGrid: {
    gap: 2,
  },
  libCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 12,
    position: 'relative',
    borderRadius: 10,
  },
  libIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  libLabel: { fontSize: 14, fontWeight: '700', textAlign: 'left', flex: 1 },
  libLockBg: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  themeRow: {
    marginHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeInfo: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  themeTitle: { fontSize: 13, fontWeight: '800' },
  themeSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
});

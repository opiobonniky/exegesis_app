

import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  ChevronRight,
  Volume2,
  Minus,
  Plus,
  Check,
  Moon,
  Sun,
  Search,
  BookMarked,
  Type,
  Palette,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppContext } from '../../common/AppContext';
import {
  BORDER_RADIUS,
  getColors,
  FONT_SIZES,
  SPACING,
} from '../../constants/theme';
import { BIBLE_VERSIONS } from '../../assets/bibleVersion/json/bibleVersions';
import { route } from '../../component/navigations/routes';
import ActionHeader from '../../reusable/ActionHeader';

// ─────────────────────────────────────────────────────────────────────────────

export default function ReadingSettingsScreen() {
  const app        = useContext(AppContext);
  const navigation = useNavigation<any>();
  const params     = (useRoute<any>().params ?? {}) as {
    fontSize?: number;
    onFontSizeChange?: (size: number) => void;
  };

  if (!app) return null;
  const { isDark, toggleTheme, bibleVersionId, setBibleVersion } = app;
  const COLORS = getColors(isDark);

  // ── Font size — kept in local state and synced back via param callback ─────
  const [fontSize, setFontSizeLocal] = useState<number>(params.fontSize ?? 16);

  const handleFontChange = useCallback(
    (size: number) => {
      setFontSizeLocal(size);
      params.onFontSizeChange?.(size);
    },
    [params.onFontSizeChange],
  );

  // ── Version search ────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BIBLE_VERSIONS;
    return BIBLE_VERSIONS.filter(v => {
      const hay =
        `${v.name} ${v.abbreviation} ${v.year} ${v.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const activeVersion = useMemo(
    () => BIBLE_VERSIONS.find(v => v.id === bibleVersionId) ?? BIBLE_VERSIONS[0],
    [bibleVersionId],
  );

  // ── Version row flash animation on selection ──────────────────────────────
  const flashAnim = useRef(new Animated.Value(1)).current;
  const handleSelectVersion = (id: string) => {
    setBibleVersion(id);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.4, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,   duration: 180, useNativeDriver: true }),
    ]).start();
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const surface = COLORS.cardBackground;
  const border  = COLORS.border;

  return (
    <View style={[s.root, { backgroundColor: COLORS.background }]}>
      <ActionHeader title="Reading Settings" onPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ════════════════════════════════════════════════════════════════
            BIBLE TRANSLATION
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          icon={<BookMarked size={15} color={COLORS.primary} strokeWidth={2} />}
          label="Bible Translation"
          COLORS={COLORS}
        />

        

        {/* Search bar */}
        <View
          style={[s.searchBar, { backgroundColor: surface, borderColor: border }]}
        >
          <Search size={15} color={COLORS.muted} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search translations — NIV, KJV, ESV…"
            placeholderTextColor={COLORS.muted}
            style={[s.searchInput, { color: COLORS.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            selectionColor={COLORS.primary}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Version list */}
        <View style={[s.versionList, { backgroundColor: surface, borderColor: border }]}>
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={[s.emptyTitle, { color: COLORS.text }]}>No results</Text>
              <Text style={[s.emptySub, { color: COLORS.muted }]}>
                Try "NIV", "KJV", "ESV"…
              </Text>
            </View>
          ) : (
            filtered.map((v, i) => {
              const isActive = v.id === bibleVersionId;
              const isLast   = i === filtered.length - 1;
              return (
                <Animated.View
                  key={v.id}
                  style={isActive ? { opacity: flashAnim } : undefined}
                >
                  <TouchableOpacity
                    onPress={() => handleSelectVersion(v.id)}
                    activeOpacity={0.7}
                    style={[
                      s.versionRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: border },
                      isActive && { backgroundColor: `${COLORS.primary}0D` },
                    ]}
                  >
                    {/* Abbreviation badge */}
                    <View
                      style={[
                        s.rowBadge,
                        {
                          backgroundColor: isActive
                            ? `${COLORS.primary}20`
                            : `${COLORS.muted}14`,
                          borderColor: isActive ? COLORS.primary : border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.rowBadgeText,
                          { color: isActive ? COLORS.primary : COLORS.muted },
                        ]}
                      >
                        {v.abbreviation}
                      </Text>
                    </View>

                    {/* Name + year + description */}
                    <View style={{ flex: 1 }}>
                      <View style={s.rowTitleRow}>
                        <Text
                          style={[
                            s.rowName,
                            {
                              color:      COLORS.text,
                              fontWeight: isActive ? '800' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {v.name}
                        </Text>
                        {!!v.year && (
                          <View
                            style={[s.yearPill, { backgroundColor: `${COLORS.muted}16` }]}
                          >
                            <Text style={[s.yearText, { color: COLORS.muted }]}>
                              {v.year}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[s.rowDesc, { color: COLORS.muted }]}
                        numberOfLines={1}
                      >
                        {v.description}
                      </Text>
                    </View>

                    {/* Check / empty ring */}
                    {isActive ? (
                      <View style={[s.checkDot, { backgroundColor: COLORS.primary }]}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </View>
                    ) : (
                      <View style={[s.checkEmpty, { borderColor: border }]} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>


        {/* ════════════════════════════════════════════════════════════════
            TEXT SIZE
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          icon={<Type size={15} color={COLORS.primary} strokeWidth={2} />}
          label="Text Size"
          COLORS={COLORS}
          style={{ marginTop: SPACING.xl }}
        />

        {/* Stepper */}
        <View style={[s.fontCard, { backgroundColor: surface, borderColor: border }]}>
          <TouchableOpacity
            style={[s.fontBtn, { borderRightColor: border }]}
            onPress={() => handleFontChange(Math.max(12, fontSize - 2))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Minus size={18} color={COLORS.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={s.fontCenter}>
            {/* Animated size display */}
            <Text style={[s.fontValue, { color: COLORS.primary }]}>{fontSize}</Text>
            <Text style={[s.fontUnit, { color: COLORS.muted }]}>pt</Text>
          </View>

          <TouchableOpacity
            style={[s.fontBtn, { borderLeftColor: border }]}
            onPress={() => handleFontChange(Math.min(28, fontSize + 2))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={18} color={COLORS.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Size scale row */}
        <View style={s.sizeScale}>
          {[11,12, 14, 16, 18, 20, 24, 28].map(sz => {
            const active = fontSize === sz;
            return (
              <TouchableOpacity
                key={sz}
                onPress={() => handleFontChange(sz)}
                style={[
                  s.scaleDot,
                  {
                    backgroundColor: active ? COLORS.primary : `${COLORS.muted}22`,
                    borderColor: active ? COLORS.primary : 'transparent',
                  },
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    s.scaleLabel,
                    { color: active ? '#fff' : COLORS.muted },
                  ]}
                >
                  {sz}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live preview */}
        <View style={[s.previewCard, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[s.previewHint, { color: COLORS.muted }]}>PREVIEW</Text>
          <Text
            style={{
              color:      COLORS.text,
              fontSize,
              lineHeight: fontSize * 1.7,
              fontStyle:  'italic',
            }}
            numberOfLines={4}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{'"'}</Text>
            {
              'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'
            }
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{'"'}</Text>
          </Text>
          <Text style={[s.previewRef, { color: COLORS.muted }]}>— John 3:16</Text>
        </View>


        {/* ════════════════════════════════════════════════════════════════
            READING VOICE
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          icon={<Volume2 size={15} color="#10B981" strokeWidth={2} />}
          label="Reading Voice"
          COLORS={COLORS}
          style={{ marginTop: SPACING.xl }}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate(route.voiceSettings)}
          activeOpacity={0.7}
          style={[s.linkRow, { backgroundColor: surface, borderColor: border }]}
        >
          <View style={[s.linkIcon, { backgroundColor: '#10B98118' }]}>
            <Volume2 size={18} color="#10B981" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.linkLabel, { color: COLORS.text }]}>Voice Settings</Text>
            <Text style={[s.linkSub, { color: COLORS.muted }]}>
              Speed, pitch, narrator voice
            </Text>
          </View>
          <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />
        </TouchableOpacity>


        {/* ════════════════════════════════════════════════════════════════
            APPEARANCE
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          icon={<Palette size={15} color={COLORS.accent} strokeWidth={2} />}
          label="Appearance"
          COLORS={COLORS}
          style={{ marginTop: SPACING.xl }}
        />

        <View style={[s.linkRow, { backgroundColor: surface, borderColor: border }]}>
          <View style={[s.linkIcon, { backgroundColor: `${COLORS.accent}18` }]}>
            {isDark
              ? <Moon size={18} color={COLORS.accent} strokeWidth={2} />
              : <Sun  size={18} color={COLORS.accent} strokeWidth={2} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.linkLabel, { color: COLORS.text }]}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </Text>
            <Text style={[s.linkSub, { color: COLORS.muted }]}>
              {isDark ? 'Switch to a brighter theme' : 'Switch to a darker theme'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: border, true: COLORS.primary }}
            thumbColor={COLORS.white}
            ios_backgroundColor={border}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  COLORS,
  style,
}: {
  icon:   React.ReactNode;
  label:  string;
  COLORS: any;
  style?: any;
}) {
  return (
    <View style={[sh.row, style]}>
      <View style={[sh.iconWrap, { backgroundColor: `${COLORS.primary}12` }]}>
        {icon}
      </View>
      <Text style={[sh.label, { color: COLORS.muted }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginBottom:  SPACING.sm,
  },
  iconWrap: {
    width:          26,
    height:         26,
    borderRadius:   8,
    justifyContent: 'center',
    alignItems:     'center',
  },
  label: {
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 1.4,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop:        SPACING.md,
    paddingBottom:     40,
  },

  // ── Active version hero ──────────────────────────────────────────────────
  activeVersionHero: {
    borderRadius: BORDER_RADIUS.xl,
    padding:      SPACING.lg,
    marginBottom: SPACING.md,
    overflow:     'hidden',
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius:  14,
    elevation:     8,
  },
  heroOrb: {
    position:     'absolute',
    width:        120,
    height:       120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top:  -30,
    right: -30,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  heroBadgeWrap: {
    backgroundColor:  'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical:    5,
    borderRadius:      10,
    borderWidth:        1,
    borderColor:       'rgba(255,255,255,0.20)',
  },
  heroBadgeText: {
    fontSize:      FONT_SIZES.sm,
    fontWeight:    '900',
    color:         '#fff',
    letterSpacing:  0.5,
  },
  heroName: {
    fontSize:   FONT_SIZES.md,
    fontWeight: '800',
    color:      '#fff',
    letterSpacing: -0.2,
  },
  heroMeta: {
    fontSize:  11,
    color:     'rgba(255,255,255,0.68)',
    marginTop:  2,
  },
  activeTag: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:               4,
    backgroundColor:  'rgba(255,255,255,0.18)',
    borderRadius:     999,
    paddingHorizontal: 10,
    paddingVertical:    5,
    borderWidth:        1,
    borderColor:       'rgba(255,255,255,0.22)',
  },
  activeTagText: {
    fontSize:   11,
    fontWeight: '800',
    color:      'rgba(255,255,255,0.9)',
  },

  // ── Search ───────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:               8,
    paddingHorizontal: SPACING.md,
    height:           44,
    borderRadius:     BORDER_RADIUS.lg,
    borderWidth:       1,
    marginBottom:     SPACING.sm,
  },
  searchInput: {
    flex:       1,
    fontSize:   FONT_SIZES.sm,
    fontWeight: '600',
    paddingVertical: 0, // prevent Android extra padding
  },

  // ── Version list ─────────────────────────────────────────────────────────
  versionList: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth:   1,
    overflow:     'hidden',
    marginBottom:  SPACING.sm,
  },
  versionRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:  12,
    paddingHorizontal: SPACING.md,
    gap:              12,
  },
  rowBadge: {
    width:          46,
    height:         28,
    borderRadius:   9,
    justifyContent: 'center',
    alignItems:     'center',
    borderWidth:     1,
  },
  rowBadgeText: {
    fontSize:   10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            6,
    flexWrap:      'nowrap',
  },
  rowName: { fontSize: FONT_SIZES.sm },
  yearPill: {
    paddingHorizontal: 7,
    paddingVertical:    2,
    borderRadius:      999,
  },
  yearText: { fontSize: 10, fontWeight: '800' },
  rowDesc:  { fontSize: 11, marginTop: 2 },

  checkDot: {
    width:          22,
    height:         22,
    borderRadius:   11,
    justifyContent: 'center',
    alignItems:     'center',
  },
  checkEmpty: {
    width:       22,
    height:      22,
    borderRadius: 11,
    borderWidth:  1.5,
  },

  emptyWrap: { padding: SPACING.lg, alignItems: 'center' },
  emptyTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', marginBottom: 4 },
  emptySub:   { fontSize: FONT_SIZES.sm, fontWeight: '500' },

  // ── Font size ────────────────────────────────────────────────────────────
  fontCard: {
    flexDirection: 'row',
    borderRadius:  BORDER_RADIUS.lg,
    borderWidth:    1,
    overflow:      'hidden',
    height:         56,
    marginBottom:  SPACING.sm,
  },
  fontBtn: {
    width:          56,
    justifyContent: 'center',
    alignItems:     'center',
    borderRightWidth: 1,
    borderLeftWidth:  1,
  },
  fontCenter: {
    flex:           1,
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'baseline',
    gap:             4,
  },
  fontValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  fontUnit:  { fontSize: 13, fontWeight: '500', marginBottom: 3 },

  // Quick-select dots
  sizeScale: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    marginBottom:     SPACING.md,
    paddingHorizontal: 2,
  },
  scaleDot: {
    paddingHorizontal: 9,
    paddingVertical:    5,
    borderRadius:      BORDER_RADIUS.round,
    borderWidth:        1,
    minWidth:          32,
    alignItems:        'center',
  },
  scaleLabel: { fontSize: 11, fontWeight: '700' },

  // Preview card
  previewCard: {
    borderRadius:  BORDER_RADIUS.xl,
    borderWidth:    1,
    padding:       SPACING.lg,
    marginBottom:  SPACING.sm,
  },
  previewHint: {
    fontSize:      9,
    fontWeight:    '800',
    letterSpacing: 1.5,
    marginBottom:  SPACING.sm,
  },
  previewRef: {
    fontSize:   11,
    fontWeight: '600',
    marginTop:  SPACING.sm,
    textAlign:  'right',
  },

  // ── Link row (Voice / Appearance) ────────────────────────────────────────
  linkRow: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              12,
    paddingHorizontal: SPACING.md,
    paddingVertical:  14,
    borderRadius:     BORDER_RADIUS.xl,
    borderWidth:       1,
    marginBottom:      8,
  },
  linkIcon: {
    width:          40,
    height:         40,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
  },
  linkLabel: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  linkSub:   { fontSize: 11,            fontWeight: '500', marginTop: 2 },
});
import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Globe,
  BookOpen,
  Layers,
} from 'lucide-react-native';
import {
  useLanguage,
  isRtlLanguage,
} from '../../../component/language-translation/LanguageProvider';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

// Design tokens matching the Bible screen header (biblescreen.jpeg)
const HEADER_BG = '#25385C';

interface ChapterSelectorScreenProps {
  bookName: string;
  maxChapters: number;
  isDark: boolean;
  onSelectChapter: (chapter: number) => void;
  onBack: () => void;
  bookHeadings?: Record<number, Array<{ verse: number; heading: string }>>;
  versionAbbr?: string;
  onVersionPress?: () => void;
  /** Current chapter, used to highlight the active row and show "Chapter x of N". */
  currentChapter?: number;
}

export default function ChapterSelectorScreen({
  bookName,
  maxChapters,
  isDark,
  onSelectChapter,
  onBack,
  bookHeadings,
  versionAbbr,
  onVersionPress,
  currentChapter = 1,
}: ChapterSelectorScreenProps) {
  const insets = useSafeAreaInsets();
  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;
  const COLORS = getColors(isDark);
  const scrollRef = useRef<ScrollView>(null);

  const chapters = useMemo(
    () => Array.from({ length: maxChapters }, (_, i) => i + 1),
    [maxChapters],
  );

  /** Up to two section headings of a chapter, joined (preview title). */
  const getPreview = (ch: number): string | null => {
    const list = bookHeadings?.[ch];
    if (!list || list.length === 0) return null;
    const headings = list
      .slice(0, 2)
      .map(h => h.heading)
      .filter(Boolean);
    return headings.length > 0 ? headings.join(' · ') : null;
  };

  return (
    <View style={[s.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={HEADER_BG} barStyle="light-content" />

      {/* ── Header (matches Bible screen) ─────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={[s.headerRow, isRtl && s.headerRowRtl]}>
          {/* Back */}
          <TouchableOpacity
            onPress={onBack}
            style={s.sideBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Centered book title (tappable to go back to books) */}
          <View style={s.headerCenter}>
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.75}
              style={s.titleRow}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
            >
              <Text style={s.headerTitle} numberOfLines={1}>
                {bookName}
              </Text>
              <ChevronDown size={15} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={s.headerSubtitle} numberOfLines={1}>
              {bc?.selectChapter || 'Select a chapter'}
            </Text>
          </View>

          {/* ── Translation selector icon ─────────────────────────────────── */}
          <TouchableOpacity
            onPress={onVersionPress}
            style={s.sideBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <Globe size={20} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        {versionAbbr ? (
          <Text style={s.headerVersion}>
            {bc?.readingFrom || 'Reading'} {versionAbbr}
          </Text>
        ) : null}
      </View>

      {/* Chapter list */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
      >
        {/* Section header: "Chapter x of 50" */}
        <View style={[s.sectionHeaderRow, isRtl && s.rowRtl]}>
          <View style={[s.sectionIcon, { backgroundColor: `${COLORS.primary}12` }]}>
            <Layers size={14} color={COLORS.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.sectionTitle, { color: COLORS.text }]}>
              {bc?.chapterOfLabel || 'Chapter'} {currentChapter} {bc?.ofLabel || 'of'}{' '}
              {maxChapters}
            </Text>
            <Text style={[s.sectionSubtitle, { color: COLORS.muted }]}>
              {bc?.chaptersAbbr || 'ch'} · {chapters.length} {bc?.totalLabel || 'total'}
            </Text>
          </View>
        </View>

        {chapters.map((ch, index) => {
          const preview = getPreview(ch);
          const isLast = index === chapters.length - 1;
          const isCurrent = ch === currentChapter;
          return (
            <TouchableOpacity
              key={ch}
              onPress={() => onSelectChapter(ch)}
              activeOpacity={0.7}
              style={[
                s.row,
                isRtl && s.rowRtl,
                {
                  backgroundColor: isCurrent
                    ? `${COLORS.primary}0F`
                    : COLORS.cardBackground,
                  borderColor: isCurrent ? COLORS.primary : COLORS.border,
                  borderWidth: isCurrent ? 1.5 : 1,
                  marginBottom: isLast ? 0 : SPACING.sm,
                },
              ]}
            >
              <View
                style={[
                  s.rowIndex,
                  {
                    backgroundColor: isCurrent
                      ? COLORS.primary
                      : `${COLORS.primary}12`,
                  },
                ]}
              >
                <Text
                  style={[
                    s.rowIndexText,
                    { color: isCurrent ? '#FFFFFF' : COLORS.primary },
                  ]}
                >
                  {ch}
                </Text>
              </View>

              <View style={s.rowContent}>
                {preview ? (
                  <>
                    <Text style={[s.rowSub, { color: COLORS.muted }]} numberOfLines={1}>
                      {bc?.chapterOfLabel || 'Chapter'} {ch}
                    </Text>
                    <View
                      style={[
                        s.rowPreviewWrap,
                        { backgroundColor: `${COLORS.primary}0D` },
                      ]}
                    >
                      <BookOpen size={11} color={COLORS.primary} strokeWidth={2.2} />
                      <Text
                        style={[s.rowPreview, { color: COLORS.primary }]}
                        numberOfLines={1}
                      >
                        {preview}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={[s.rowTitle, { color: COLORS.text }]}>
                    {bc?.chapterOfLabel || 'Chapter'} {ch}
                  </Text>
                )}
              </View>

              <ChevronRight
                size={18}
                color={COLORS.muted}
                strokeWidth={2}
                style={{ transform: [{ scaleX: isRtl ? -1 : 1 }] }}
              />
            </TouchableOpacity>
          );
        })}
        <View style={{ height: Platform.OS === 'ios' ? 40 : 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: HEADER_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.38)',
    paddingBottom: SPACING.sm,
  },
  headerRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  sideBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '100%',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  headerVersion: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: SPACING.md,
    paddingBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  rowIndex: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIndexText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  rowPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  rowPreview: {
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1,
  },
});

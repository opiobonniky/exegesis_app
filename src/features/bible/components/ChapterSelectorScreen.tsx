import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { ChevronLeft, BookOpen, Layers } from 'lucide-react-native';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = 4;
const H_PAD = 20;
const GAP = 10;
const ITEM_SIZE = Math.floor(
  (SCREEN_WIDTH - H_PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
);

interface ChapterSelectorScreenProps {
  bookName: string;
  maxChapters: number;
  isDark: boolean;
  onSelectChapter: (chapter: number) => void;
  onBack: () => void;
}

export default function ChapterSelectorScreen({
  bookName,
  maxChapters,
  isDark,
  onSelectChapter,
  onBack,
}: ChapterSelectorScreenProps) {
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const COLORS = getColors(isDark);
  const scrollRef = useRef<ScrollView>(null);

  const chapters = useMemo(
    () => Array.from({ length: maxChapters }, (_, i) => i + 1),
    [maxChapters],
  );

  const rows = useMemo(() => {
    const result: number[][] = [];
    for (let i = 0; i < chapters.length; i += COLUMNS) {
      result.push(chapters.slice(i, i + COLUMNS));
    }
    return result;
  }, [chapters]);

  return (
    <View style={[s.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header with back */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={onBack}
          style={[s.backBtn, { backgroundColor: COLORS.surface }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={COLORS.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={[s.headerIcon, { backgroundColor: `${COLORS.primary}15` }]}>
            <BookOpen size={18} color={COLORS.primary} strokeWidth={1.5} />
          </View>
          <View>
            <Text style={[s.headerTitle, { color: COLORS.text }]}>
              {bookName}
            </Text>
            <Text style={[s.headerSubtitle, { color: COLORS.muted }]}>
              {bc?.selectChapter || 'Select a chapter'}
            </Text>
          </View>
        </View>

        <View style={[s.chip, { backgroundColor: `${COLORS.primary}12`, borderColor: `${COLORS.primary}30` }]}>
          <Layers size={12} color={COLORS.primary} strokeWidth={2.5} />
          <Text style={[s.chipText, { color: COLORS.primary }]}>
            {maxChapters} {bc?.chaptersAbbr || 'ch'}
          </Text>
        </View>
      </View>

      {/* Chapter grid */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.gridContent}
      >
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={s.row}>
            {row.map(ch => (
              <TouchableOpacity
                key={ch}
                onPress={() => onSelectChapter(ch)}
                activeOpacity={0.75}
                style={[
                  s.cell,
                  {
                    backgroundColor: COLORS.cardBackground,
                    borderColor: COLORS.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 1,
                  },
                ]}
              >
                <Text style={[s.cellNum, { color: COLORS.text }]}>
                  {ch}
                </Text>
                <Text style={[s.cellLabel, { color: COLORS.muted }]}>
                  {bc?.chaptersAbbr || 'ch'}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Fill remaining cells in last row */}
            {row.length < COLUMNS &&
              Array.from({ length: COLUMNS - row.length }).map((_, i) => (
                <View key={`fill-${i}`} style={{ width: ITEM_SIZE }} />
              ))}
          </View>
        ))}
        <View style={{ height: Platform.OS === 'ios' ? 40 : 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridContent: {
    paddingHorizontal: H_PAD,
    paddingTop: SPACING.xs,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    width: ITEM_SIZE,
    height: 76,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellNum: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});

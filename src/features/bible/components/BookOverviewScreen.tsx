import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  BookOpen,
  BookMarked,
  Layers,
  BookCheck,
} from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { getBookPrologue, BookPrologue } from '../../../services/bookProloguesApi';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

interface BookOverviewScreenProps {
  bookName: string;
  chapters: number;
  testament?: 'Old' | 'New';
  isDark: boolean;
  onStartReading: () => void;
  onBack?: () => void;
}

export default function BookOverviewScreen({
  bookName,
  chapters,
  testament,
  isDark,
  onStartReading,
  onBack,
}: BookOverviewScreenProps) {
  const insets = useSafeAreaInsets();
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const COLORS = getColors(isDark);

  const [prologue, setPrologue] = useState<BookPrologue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    (async () => {
      try {
        const p = await getBookPrologue(bookName);
        if (!ignore) setPrologue(p);
      } catch {
        if (!ignore) setPrologue(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [bookName]);

  const isOt = testament !== 'New';
  const accent = isOt ? '#4F6EF7' : '#8B5CF6';

  const renderFact = (label: string, value?: string | null) => {
    if (!value) return null;
    return (
      <View style={[s.fact, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[s.factLabel, { color: COLORS.muted }]}>{label}</Text>
        <Text style={[s.factValue, { color: COLORS.text }]}>{value}</Text>
      </View>
    );
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: COLORS.background,
          paddingTop: Platform.OS === 'ios' ? insets.top + 4 : insets.top,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={[s.backBtn, { backgroundColor: COLORS.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={20} color={COLORS.text} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <View style={[s.headerIcon, { backgroundColor: `${accent}14` }]}>
            <BookMarked size={20} color={accent} strokeWidth={1.8} />
          </View>
          <View style={s.headerTextWrap}>
            <Text style={[s.headerTitle, { color: COLORS.text }]}>
              {bc?.bookOverviewTitle || 'Book Overview'}
            </Text>
            <Text style={[s.headerSubtitle, { color: COLORS.muted }]}>
              {bc?.bookOverviewSubtitle || 'Introduction & context before you read'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Hero card */}
        <View
          style={[
            s.hero,
            {
              backgroundColor: COLORS.cardBackground,
              borderColor: COLORS.border,
            },
          ]}
        >
          <View style={[s.heroAccent, { backgroundColor: accent }]} />
          <View style={s.heroTop}>
            <View style={[s.heroIconWrap, { backgroundColor: `${accent}16` }]}>
              <BookOpen size={26} color={accent} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroBook, { color: COLORS.text }]}>{bookName}</Text>
              <Text style={[s.heroSub, { color: COLORS.muted }]}>
                {isOt
                  ? bc?.oldTestamentTab || 'Old Testament'
                  : bc?.newTestamentTab || 'New Testament'}
              </Text>
            </View>
          </View>

          <View style={s.heroMeta}>
            <View style={[s.heroChip, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              <Layers size={13} color={accent} strokeWidth={2.2} />
              <Text style={[s.heroChipText, { color: COLORS.text }]}>
                {chapters} {bc?.chaptersAbbr || 'chapters'}
              </Text>
            </View>
            {prologue?.author ? (
              <View style={[s.heroChip, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
                <BookCheck size={13} color={accent} strokeWidth={2.2} />
                <Text style={[s.heroChipText, { color: COLORS.text }]}>{prologue.author}</Text>
              </View>
            ) : null}
          </View>

          {prologue?.summary ? (
            <Text style={[s.heroSummary, { color: COLORS.textSecondary }]}>
              {prologue.summary}
            </Text>
          ) : null}
        </View>

        {/* Prologue details */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[s.loadingText, { color: COLORS.muted }]}>
              {bc?.loadingOverview || 'Loading overview...'}
            </Text>
          </View>
        ) : prologue ? (
          <View style={{ gap: SPACING.md, marginTop: SPACING.md }}>
            <View style={s.factsWrap}>
              {renderFact('Author', prologue.author)}
              {renderFact('Audience', prologue.audience)}
              {renderFact('Date', prologue.dateWritten)}
              {renderFact('Location', prologue.locationWritten)}
            </View>

            {prologue.keyTheme ? (
              <View style={[s.themeBox, { backgroundColor: `${accent}0D`, borderColor: `${accent}24` }]}>
                <Text style={[s.themeLabel, { color: accent }]}>
                  {bc?.keyTheme || 'Key Theme'}
                </Text>
                <Text style={[s.themeContent, { color: COLORS.text }]}>{prologue.keyTheme}</Text>
              </View>
            ) : null}

            {prologue.purpose ? (
              <View style={[s.detailCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                <Text style={[s.detailTitle, { color: COLORS.text }]}>
                  {bc?.purpose || 'Purpose'}
                </Text>
                <Text style={[s.detailBody, { color: COLORS.textSecondary }]}>{prologue.purpose}</Text>
              </View>
            ) : null}

            {prologue.mainThemes && prologue.mainThemes.length > 0 ? (
              <View style={[s.detailCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                <Text style={[s.detailTitle, { color: COLORS.text }]}>
                  {bc?.mainThemes || 'Main Themes'}
                </Text>
                <View style={s.chipRow}>
                  {prologue.mainThemes.map((t, i) => (
                    <View
                      key={i}
                      style={[s.themeChip, { backgroundColor: `${accent}12`, borderColor: `${accent}26` }]}
                    >
                      <Text style={[s.themeChipText, { color: accent }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {prologue.christConnection ? (
              <View style={[s.christBox, { borderColor: `${accent}26`, backgroundColor: `${accent}0D` }]}>
                <Text style={[s.christLabel, { color: accent }]}>
                  {bc?.christConnection || 'Connection to Christ'}
                </Text>
                <Text style={[s.christBody, { color: COLORS.textSecondary }]}>
                  {prologue.christConnection}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[s.noPrologue, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
            <BookOpen size={22} color={COLORS.muted} strokeWidth={1.6} />
            <Text style={[s.noPrologueTitle, { color: COLORS.text }]}>
              {bc?.readyToRead || 'Ready to read?'}
            </Text>
            <Text style={[s.noPrologueText, { color: COLORS.muted }]}>
              {bc?.noOverviewMessage ||
                'No overview is available for this book yet. You can jump straight into the text.'}
            </Text>
          </View>
        )}
        <View style={{ height: Platform.OS === 'ios' ? 96 : 72 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          s.ctaWrap,
          {
            backgroundColor: COLORS.background,
            borderTopColor: COLORS.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: accent }]}
          onPress={onStartReading}
          activeOpacity={0.85}
        >
          <BookOpen size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={s.ctaText}>
            {bc?.startReading || 'Start Reading'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBook: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.md,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  heroChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  heroSummary: {
    fontSize: FONT_SIZES.md,
    lineHeight: 23,
    marginTop: SPACING.md,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  factsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  factLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginTop: 1,
  },
  themeBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  themeLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  themeContent: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 19,
    fontWeight: '600',
  },
  detailCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  detailTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailBody: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  themeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  christBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  christLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  christBody: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  noPrologue: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  noPrologueTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  noPrologueText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

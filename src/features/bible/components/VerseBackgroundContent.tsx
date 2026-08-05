import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  User,
  BookOpen,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react-native';
import RichText from '../../../reusable/RichText';
import VerseReadMore from './VerseReadMore';
import { BookPrologue } from '../../../services/bookProloguesApi';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

interface VerseBackgroundContentProps {
  bookName: string;
  chapter: number;
  verseNumber: number;
  background: string | null;
  prologue: BookPrologue | null;
  ai?: any;
  loading: boolean;
  colors: any;
  isRtl?: boolean;
  bc?: any;
  onHide: () => void;
}

/**
 * Inline verse background shown beneath the selected verse — replaces the old
 * modal. Matches the desired study layout: an "About this verse" write-up plus
 * three labeled rows — Author, Book and Context — drawn from the book prologue
 * and the rich AI analysis. Long content collapses under ONE "Read more"
 * button at the end of the section.
 */
export default function VerseBackgroundContent({
  bookName,
  chapter,
  verseNumber,
  background,
  prologue,
  ai,
  loading,
  colors: COLORS,
  isRtl,
  bc,
  onHide,
}: VerseBackgroundContentProps) {
  const hasVerseContent = !!background && background.trim().length > 0;

  // Author — from the prologue
  const author = prologue?.author?.trim();
  const hasAuthor = !!author;

  // Book — short description (summary) of the book
  const bookDesc = prologue?.summary?.trim() || prologue?.purpose?.trim() || '';
  const hasBook = !!bookDesc;

  // Context — surrounding-context write-up from the AI analysis, falling
  // back to the prologue's purpose/audience.
  const contextDesc =
    ai?.context?.trim() ||
    prologue?.purpose?.trim() ||
    prologue?.audience?.trim() ||
    '';
  const hasContext = !!contextDesc;

  const hasBody = hasVerseContent || hasAuthor || hasBook || hasContext;
  const isEmpty = !hasBody;

  const sectionLabel = (label: string) => (
    <Text style={[s.sectionLabel, { color: COLORS.primary }]}>{label}</Text>
  );

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: `${COLORS.primary}06`,
          borderColor: `${COLORS.primary}14`,
        },
      ]}
    >
      {/* Header */}
      <View
        style={[
          s.header,
          isRtl && s.headerRtl,
          { borderBottomColor: COLORS.border },
        ]}
      >
        <View style={[s.headerIcon, { backgroundColor: `${COLORS.primary}16` }]}>
          <BookOpen size={15} color={COLORS.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={[s.headerTitleRow, isRtl && s.headerTitleRowRtl]}>
            <Text style={[s.headerTitle, { color: COLORS.text }]}>
              {bc?.background || 'Background'}
            </Text>
            <View
              style={[s.aiBadge, { backgroundColor: `${COLORS.primary}12` }]}
            >
              <Sparkles size={10} color={COLORS.primary} strokeWidth={2.4} />
              <Text style={[s.aiBadgeText, { color: COLORS.primary }]}>
                {bc?.aiPoweredInsight || 'AI'}
              </Text>
            </View>
          </View>
          <Text style={[s.headerBook, { color: COLORS.muted }]}>
            {bookName} {chapter}:{verseNumber}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onHide}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[s.closeBtn, { backgroundColor: `${COLORS.textSecondary}15` }]}
        >
          <X size={14} color={COLORS.textSecondary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[s.centerText, { color: COLORS.muted }]}>
            {bc?.loading || 'Loading…'}
          </Text>
        </View>
      ) : isEmpty ? (
        <View style={s.center}>
          <Text style={[s.errorText, { color: COLORS.muted }]}>
            {bc?.noBackgroundMessage ||
              'No background available for this verse yet.'}
          </Text>
        </View>
      ) : (
        <View>
          <VerseReadMore
            collapsedLines={4}
            colors={COLORS}
            isRtl={isRtl}
            readMoreLabel={bc?.readMore || 'Read more'}
            showLessLabel={bc?.showLess || 'Show less'}
          >
            {/* ── About this verse ─────────────────────────────────── */}
            {hasVerseContent && (
              <View style={s.section}>
                {sectionLabel(bc?.aboutVerseLabel || 'About this verse')}
                <RichText
                  text={background}
                  textStyle={[s.sectionValue, { color: COLORS.text }]}
                  accentColor={COLORS.primary}
                  paragraphGap={8}
                />
              </View>
            )}

            {/* ── Author / Book / Context ──────────────────────────── */}
            {hasAuthor && (
              <View style={[s.rowItem, isRtl && s.rowItemRtl]}>
                <View style={[s.rowIcon, { backgroundColor: `${COLORS.primary}12` }]}>
                  <User size={13} color={COLORS.primary} strokeWidth={2.4} />
                </View>
                <View style={s.rowBody}>
                  {sectionLabel(bc?.authorLabel || 'Author')}
                  <RichText
                    text={author}
                    textStyle={[s.rowValue, { color: COLORS.text }]}
                    accentColor={COLORS.primary}
                    paragraphGap={6}
                  />
                </View>
              </View>
            )}

            {hasBook && (
              <View style={[s.rowItem, isRtl && s.rowItemRtl]}>
                <View style={[s.rowIcon, { backgroundColor: `${COLORS.primary}12` }]}>
                  <BookOpen size={13} color={COLORS.primary} strokeWidth={2.4} />
                </View>
                <View style={s.rowBody}>
                  {sectionLabel(bc?.bookContextLabel || 'Book')}
                  <RichText
                    text={bookDesc}
                    textStyle={[s.rowValue, { color: COLORS.text }]}
                    accentColor={COLORS.primary}
                    paragraphGap={6}
                  />
                </View>
              </View>
            )}

            {hasContext && (
              <View style={[s.rowItem, isRtl && s.rowItemRtl]}>
                <View style={[s.rowIcon, { backgroundColor: `${COLORS.primary}12` }]}>
                  <MapPin size={13} color={COLORS.primary} strokeWidth={2.4} />
                </View>
                <View style={s.rowBody}>
                  {sectionLabel(bc?.contextLabel || 'Context')}
                  <RichText
                    text={contextDesc}
                    textStyle={[s.rowValue, { color: COLORS.text }]}
                    accentColor={COLORS.primary}
                    paragraphGap={6}
                  />
                </View>
              </View>
            )}
          </VerseReadMore>

        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  headerBook: {
    fontSize: FONT_SIZES.xs,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  centerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  sectionValue: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    fontWeight: '500',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: SPACING.md,
  },
  rowItemRtl: {
    flexDirection: 'row-reverse',
  },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
  },
  rowValue: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
});

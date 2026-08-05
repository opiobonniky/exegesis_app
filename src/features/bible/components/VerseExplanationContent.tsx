import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Lightbulb,
  Compass,
  BookText,
  Sparkles,
} from 'lucide-react-native';
import RichText from '../../../reusable/RichText';
import VerseReadMore from './VerseReadMore';
import { route } from '../../../component/navigations/routes';
import { BORDER_RADIUS } from '../../../constants/theme';

/**
 * VerseExplanationContent
 *
 * Renders the "Explain Verse" result as clearly separated sections, matching
 * the desired study layout:
 *   1. Verse Introduction  — how the verse opens in context (ai.intro)
 *   2. Explanation         — what the verse means (ai.explanation)
 *   3. Application         — how it applies to the reader (ai.application)
 * The whole body collapses under ONE "Read more" button at the end of the
 * section; pressing it extends the full content in place.
 *
 * This component is intentionally a pure renderer: VerseCard uses it twice —
 * once inside a hidden measurer and once in the animated display — so the two
 * always stay pixel-identical in height.
 */
export default function VerseExplanationContent({
  explanationData,
  colors,
  isRtl,
  bc,
  journalPrompts = [],
  navigation,
  currentBook,
  currentChapter,
  verseNumber,
}: {
  explanationData?: {
    explanation: string;
    learnMore: string;
    ai?: any;
  } | null;
  colors: any;
  isRtl?: boolean;
  bc?: any;
  journalPrompts?: any[];
  navigation?: any;
  currentBook?: string;
  currentChapter?: number;
  verseNumber: number;
}) {
  const ai = explanationData?.ai;
  const explanation =
    ai?.explanation?.trim() ||
    explanationData?.explanation?.trim() ||
    '';
  const application =
    ai?.application?.trim() || explanationData?.learnMore?.trim() || '';
  const intro = ai?.intro?.trim() || '';

  const hasExplanation = explanation.length > 0;
  const hasApplication = application.length > 0;
  const hasIntro = intro.length > 0;

  const hasBody = hasIntro || hasExplanation || hasApplication;

  if (!hasBody) return null;

  const sectionHeaderRow = [s.sectionHeader, isRtl && s.sectionHeaderRtl];
  const headerLeft = [s.sectionHeaderLeft, isRtl && s.sectionHeaderLeftRtl];

  const renderSectionHeader = (
    Icon: React.ElementType,
    label: string,
    showAiBadge = false,
  ) => (
    <View style={sectionHeaderRow}>
      <View style={headerLeft}>
        <View style={[s.iconChip, { backgroundColor: `${colors.primary}16` }]}>
          <Icon size={15} color={colors.primary} strokeWidth={2.4} />
        </View>
        <Text style={[s.sectionTitle, { color: colors.text }]}>{label}</Text>
        {showAiBadge && (
          <View style={[s.aiBadge, { backgroundColor: `${colors.primary}12` }]}>
            <Sparkles size={10} color={colors.primary} strokeWidth={2.4} />
            <Text style={[s.aiBadgeText, { color: colors.primary }]}>
              {bc?.aiPoweredInsight || 'AI'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[s.card, { backgroundColor: `${colors.primary}06` }]}>
      {/* ── Body — collapsed under ONE Read More at the end ────────────── */}
      <VerseReadMore
        collapsedLines={4}
        colors={colors}
        isRtl={isRtl}
        readMoreLabel={bc?.readMore || 'Read more'}
        showLessLabel={bc?.showLess || 'Show less'}
      >
        {/* ── Section 1: Verse Introduction ─────────────────────────── */}
        {hasIntro && (
          <View style={s.section}>
            {renderSectionHeader(
              BookText,
              bc?.verseIntroduction || 'Verse Introduction',
            )}
            <RichText
              text={intro}
              textStyle={[s.bodyText, { color: colors.text }]}
              accentColor={colors.primary}
              paragraphGap={8}
            />
          </View>
        )}

        {hasIntro && (hasExplanation || hasApplication) && (
          <View style={s.dividerRow}>
            <View
              style={[s.dividerLine, { backgroundColor: `${colors.primary}20` }]}
            />
            <View
              style={[s.dividerDot, { backgroundColor: `${colors.primary}30` }]}
            />
            <View
              style={[s.dividerLine, { backgroundColor: `${colors.primary}20` }]}
            />
          </View>
        )}

        {/* ── Section 2: Explanation ─────────────────────────────────── */}
        {hasExplanation && (
          <View style={s.section}>
            {renderSectionHeader(
              Lightbulb,
              bc?.explanation || 'Explanation',
              true,
            )}
            <RichText
              text={explanation}
              textStyle={[s.bodyText, { color: colors.text }]}
              accentColor={colors.primary}
              paragraphGap={8}
            />
          </View>
        )}

        {(hasExplanation || hasIntro) && hasApplication && (
          <View style={s.dividerRow}>
            <View
              style={[
                s.dividerLine,
                { backgroundColor: `${colors.primary}20` },
              ]}
            />
            <View
              style={[s.dividerDot, { backgroundColor: `${colors.primary}30` }]}
            />
            <View
              style={[
                s.dividerLine,
                { backgroundColor: `${colors.primary}20` },
              ]}
            />
          </View>
        )}

        {/* ── Section 3: Application ─────────────────────────────────── */}
        {hasApplication && (
          <View style={s.section}>
            {renderSectionHeader(Compass, bc?.application || 'Application')}
            <RichText
              text={application}
              textStyle={[s.bodyText, { color: colors.text }]}
              accentColor={colors.primary}
              paragraphGap={8}
            />
          </View>
        )}

      </VerseReadMore>

      {/* ── Journal prompts ────────────────────────────────────────────── */}
      {journalPrompts.length > 0 && (
        <View
          style={[
            s.journalPromptsContainer,
            { borderTopColor: `${colors.primary}20` },
          ]}
        >
          <View style={s.promptsHeader}>
            <Text style={[s.promptsTitle, { color: colors.primary }]}>
              {bc?.journalPrompts || 'Journal Prompts'}
            </Text>
            {currentBook && currentChapter && (
              <TouchableOpacity
                onPress={() => {
                  navigation?.navigate(route.journalEntry, {
                    bookName: currentBook,
                    chapter: currentChapter,
                    verseStart: verseNumber,
                    verseEnd: verseNumber,
                  });
                }}
                style={[s.addPromptBtn, { backgroundColor: colors.primary }]}
              >
                <BookText size={12} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          {journalPrompts.map((prompt, idx) => (
            <TouchableOpacity
              key={prompt.id || idx}
              style={[
                s.promptItem,
                {
                  backgroundColor: `${colors.primary}10`,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => {
                if (navigation) {
                  navigation.navigate(route.journalEntry, {
                    bookName: currentBook,
                    chapter: currentChapter,
                    verseStart: verseNumber,
                    verseEnd: verseNumber,
                    promptText: prompt.prompt,
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[s.promptText, { color: colors.text }]}>
                {prompt.prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Dismiss hint ──────────────────────────────────────────────── */}
      <Text style={[s.dismissHint, { color: `${colors.textSecondary}70` }]}>
        {bc?.tapOutsideToClose || 'Tap outside to close'}
      </Text>

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  section: {
    // vertical rhythm handled by sibling margins
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  sectionHeaderLeftRtl: {
    flexDirection: 'row-reverse',
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  bodyText: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  journalPromptsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  promptsTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addPromptBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismissHint: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Clipboard,
} from 'react-native';
import {
  BookOpen,
  Hash,
  Languages,
  Copy,
  Check,
  X,
  Sparkles,
  ListChecks,
  Target,
  Quote,
} from 'lucide-react-native';
import RichText from '../../../reusable/RichText';
import VerseReadMore from './VerseReadMore';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { StrongsWordData, StrongsEntry } from '../../../services/strongsService';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

const LANGUAGE_LABELS: Record<string, string> = {
  hebrew: 'Hebrew',
  greek: 'Greek',
  aramaic: 'Aramaic',
};

interface VerseStrongsContentProps {
  word: StrongsWordData | null;
  entry: StrongsEntry | null;
  ai?: any;
  loading: boolean;
  colors: any;
  isRtl?: boolean;
  onHide: () => void;
}

/**
 * Inline Strong's Concordance content shown beneath the selected verse —
 * replaces the old bottom sheet. Shows the headword card plus the rich study
 * content from the AI analysis — the per-word Word Study, Practical
 * Applications, Key Insights and Cross References — all collapsing under ONE
 * "Read more" button at the end of the section.
 */
export default function VerseStrongsContent({
  word,
  entry,
  ai,
  loading,
  colors,
  isRtl,
  onHide,
}: VerseStrongsContentProps) {
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const [copiedStudyNote, setCopiedStudyNote] = useState(false);

  const copyToClipboard = (text: string) => {
    try {
      Clipboard.setString(text);
    } catch {}
  };

  if (loading) {
    return (
      <View
        style={[
          s.card,
          { backgroundColor: `${colors.primary}06`, borderColor: `${colors.primary}14` },
        ]}
      >
        <Row colors={colors} isRtl={isRtl} title={bc?.strongsConcordance || "Strong's Concordance"} onHide={onHide} />
        <View style={s.center}>
          <View style={[s.loadingSpinnerWrap, { backgroundColor: `${colors.primary}12` }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
            {bc?.loadingWordStudy || 'Loading word study…'}
          </Text>
        </View>
      </View>
    );
  }

  if (!entry && !ai?.wordStudy) {
    return (
      <View
        style={[
          s.card,
          { backgroundColor: `${colors.primary}06`, borderColor: `${colors.primary}14` },
        ]}
      >
        <Row colors={colors} isRtl={isRtl} title={bc?.strongsConcordance || "Strong's Concordance"} onHide={onHide} />
        <View style={s.emptyContainer}>
          <View style={[s.emptyIconWrap, { backgroundColor: `${colors.accent}15` }]}>
            <BookOpen size={22} color={colors.accent} />
          </View>
          {word?.surfaceText ? (
            <View
              style={[
                s.emptyWordCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Text style={[s.emptyWordText, { color: colors.text }]}>
                {word.surfaceText}
              </Text>
            </View>
          ) : null}
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            {bc?.noDataAvailable || 'No Data Available'}
          </Text>
          <Text style={[s.emptySubtext, { color: colors.textSecondary }]}>
            {bc?.noStrongsInline ||
              "Strong's concordance data hasn't been loaded for this word yet. Try a different word or check back later."}
          </Text>
        </View>
      </View>
    );
  }

  const hasGrammaticalDetails =
    entry?.grammaticalCase || entry?.gender || entry?.number;
  const crossRefs = entry?.crossReferences
    ? entry.crossReferences
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const langLabel = entry?.language
    ? LANGUAGE_LABELS[entry.language] || entry.language
    : null;
  const adminExplanation = (entry as any)?.adminExplanation;

  // Rich AI study content (mirrors the desired verse-study layout)
  const wordStudy = ai?.wordStudy?.trim();
  const applications = ai?.application?.trim();
  const insights = ai?.chapterInsights?.trim();
  const crossRefsRich = ai?.crossReferences?.trim();

  const hasRichStudy = !!(wordStudy || applications || insights || crossRefsRich);

  const handleCopyStudyNote = () => {
    if (!adminExplanation) return;
    copyToClipboard(adminExplanation);
    setCopiedStudyNote(true);
    setTimeout(() => setCopiedStudyNote(false), 2000);
  };

  return (
    <View
      style={[
        s.card,
        { backgroundColor: `${colors.primary}06`, borderColor: `${colors.primary}14` },
      ]}
    >
      <Row
        colors={colors}
        isRtl={isRtl}
        title={bc?.strongsConcordance || "Strong's Concordance"}
        subtitle={`${word?.surfaceText || entry?.strongsId || ''}`}
        aiLabel={bc?.aiPoweredInsight || 'AI'}
        onHide={onHide}
      />

      {/* ── Headword card ───────────────────────────────────────── */}
      {entry && (
        <>
          <View style={[s.headRow, { borderBottomColor: colors.border }]}>
            <View style={s.headLeft}>
              <Text style={[s.englishWord, { color: colors.text }]}>
                {word?.surfaceText || entry.strongsId}
              </Text>
              {entry.shortDefinition && (
                <Text
                  style={[s.englishDef, { color: colors.muted }]}
                  numberOfLines={2}
                >
                  {entry.shortDefinition}
                </Text>
              )}
            </View>
            <View style={s.headRight}>
              {entry.originalWord && (
                <Text style={[s.originalWord, { color: colors.accent }]}>
                  {entry.originalWord}
                </Text>
              )}
              {entry.transliteration && (
                <Text style={[s.translit, { color: colors.muted }]}>
                  {entry.transliteration}
                </Text>
              )}
            </View>
          </View>

          {/* ── Meta badges ──────────────────────────────────────── */}
          <View style={s.metaRow}>
            <View style={[s.metaBadge, { backgroundColor: `${colors.primary}12` }]}>
              <Hash size={11} color={colors.primary} strokeWidth={2.5} />
              <Text style={[s.metaText, { color: colors.primary }]}>
                {entry.strongsId}
              </Text>
            </View>
            {entry.partOfSpeech && (
              <View style={[s.metaBadge, { backgroundColor: `${colors.accent}12` }]}>
                <Text style={[s.metaText, { color: colors.accent }]}>
                  {entry.partOfSpeech}
                </Text>
              </View>
            )}
            {langLabel && (
              <View style={[s.metaBadge, { backgroundColor: `${colors.muted}18` }]}>
                <Languages size={11} color={colors.muted} strokeWidth={2.5} />
                <Text style={[s.metaText, { color: colors.muted }]}>{langLabel}</Text>
              </View>
            )}
            {entry.usageCount != null && (
              <View style={[s.metaBadge, { backgroundColor: `${colors.muted}18` }]}>
                <Text style={[s.metaText, { color: colors.muted }]}>
                  ×{entry.usageCount}
                </Text>
              </View>
            )}
          </View>

          {/* ── Full Definition ──────────────────────────────────── */}
          {entry.fullDefinition && (
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                {bc?.fullDefinition || 'Full Definition'}
              </Text>
              <Text style={[s.definitionText, { color: colors.text }]}>
                {entry.fullDefinition}
              </Text>
            </View>
          )}

          {/* ── Grammatical Details ──────────────────────────────── */}
          {hasGrammaticalDetails && (
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                {bc?.grammar || 'Grammar'}
              </Text>
              <View
                style={[
                  s.grammarCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {entry.partOfSpeech && (
                  <View style={[s.grammarRow, { borderBottomColor: colors.border }]}>
                    <Text style={[s.grammarKey, { color: colors.muted }]}>Part of Speech</Text>
                    <Text style={[s.grammarValue, { color: colors.text }]}>
                      {entry.partOfSpeech || '—'}
                    </Text>
                  </View>
                )}
                {entry.grammaticalCase && (
                  <View style={[s.grammarRow, { borderBottomColor: colors.border }]}>
                    <Text style={[s.grammarKey, { color: colors.muted }]}>Case</Text>
                    <Text style={[s.grammarValue, { color: colors.text }]}>
                      {entry.grammaticalCase}
                    </Text>
                  </View>
                )}
                {entry.gender && (
                  <View style={[s.grammarRow, { borderBottomColor: colors.border }]}>
                    <Text style={[s.grammarKey, { color: colors.muted }]}>Gender</Text>
                    <Text style={[s.grammarValue, { color: colors.text }]}>
                      {entry.gender}
                    </Text>
                  </View>
                )}
                {entry.number && (
                  <View style={[s.grammarRow, { borderBottomColor: colors.border }]}>
                    <Text style={[s.grammarKey, { color: colors.muted }]}>Number</Text>
                    <Text style={[s.grammarValue, { color: colors.text }]}>
                      {entry.number}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {/* ── Rich AI study sections — collapsed under ONE Read More ──── */}
      {hasRichStudy && (
        <VerseReadMore
          collapsedLines={4}
          colors={colors}
          isRtl={isRtl}
          readMoreLabel={bc?.readMore || 'Read more'}
          showLessLabel={bc?.showLess || 'Show less'}
        >
          {/* Word Study — the per-word concordance list */}
          {wordStudy && (
            <View style={s.section}>
              <View style={[s.sectionHeaderRow, isRtl && s.sectionHeaderRowRtl]}>
                <View style={[s.sectionIcon, { backgroundColor: `${colors.primary}12` }]}>
                  <BookOpen size={13} color={colors.primary} strokeWidth={2.4} />
                </View>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  {bc?.strongsWordStudy || 'Strong Concordance Word Study'}
                </Text>
              </View>
              <RichText
                text={wordStudy}
                textStyle={[s.richText, { color: colors.text }]}
                accentColor={colors.primary}
                paragraphGap={10}
              />
            </View>
          )}

          {/* Practical Applications */}
          {applications && (
            <View style={s.section}>
              <View style={[s.sectionHeaderRow, isRtl && s.sectionHeaderRowRtl]}>
                <View style={[s.sectionIcon, { backgroundColor: `${colors.success}12` }]}>
                  <ListChecks size={13} color={colors.success} strokeWidth={2.4} />
                </View>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  {bc?.practicalApplications || 'Practical Applications'}
                </Text>
              </View>
              <RichText
                text={applications}
                textStyle={[s.richText, { color: colors.text }]}
                accentColor={colors.success}
                paragraphGap={8}
              />
            </View>
          )}

          {/* Key Insights */}
          {insights && (
            <View style={s.section}>
              <View style={[s.sectionHeaderRow, isRtl && s.sectionHeaderRowRtl]}>
                <View style={[s.sectionIcon, { backgroundColor: `${colors.accent}12` }]}>
                  <Target size={13} color={colors.accent} strokeWidth={2.4} />
                </View>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  {bc?.keyInsights || 'Key Insights'}
                </Text>
              </View>
              <RichText
                text={insights}
                textStyle={[s.richText, { color: colors.text }]}
                accentColor={colors.accent}
                paragraphGap={8}
              />
            </View>
          )}

          {/* Cross References */}
          {crossRefsRich && (
            <View style={s.section}>
              <View style={[s.sectionHeaderRow, isRtl && s.sectionHeaderRowRtl]}>
                <View style={[s.sectionIcon, { backgroundColor: `${colors.primary}12` }]}>
                  <Quote size={13} color={colors.primary} strokeWidth={2.4} />
                </View>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  {bc?.crossReferences || 'Cross References'}
                </Text>
              </View>
              <RichText
                text={crossRefsRich}
                textStyle={[s.richText, { color: colors.text }]}
                accentColor={colors.primary}
                paragraphGap={8}
              />
            </View>
          )}
        </VerseReadMore>
      )}

      {/* ── Entry cross-reference chips (when no rich cross refs) ── */}
      {crossRefs.length > 0 && !crossRefsRich && (
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
            {bc?.crossReferences || 'Cross References'}
          </Text>
          <View style={s.crossRefsList}>
            {crossRefs.map((ref, i) => (
              <View
                key={i}
                style={[
                  s.crossRefChip,
                  {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}25`,
                  },
                ]}
              >
                <BookOpen size={11} color={colors.primary} strokeWidth={2.5} />
                <Text style={[s.crossRefText, { color: colors.primary }]}>
                  {ref}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Study Note (admin explanation) ───────────────────────── */}
      {adminExplanation && (
        <View style={s.section}>
          <View style={s.studyNoteHeader}>
            <Text
              style={[s.sectionLabel, { color: colors.textSecondary, flex: 1 }]}
            >
              {bc?.studyNote || 'Study Note'}
            </Text>
            <TouchableOpacity
              onPress={handleCopyStudyNote}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                s.copyBtn,
                {
                  backgroundColor: copiedStudyNote
                    ? 'rgba(34,197,94,0.12)'
                    : 'transparent',
                },
              ]}
            >
              {copiedStudyNote ? (
                <Check size={14} color="#22C55E" strokeWidth={2.5} />
              ) : (
                <Copy size={14} color={colors.accent} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
          <View
            style={[
              s.studyNoteCard,
              {
                backgroundColor: `${colors.accent}10`,
                borderColor: `${colors.accent}20`,
              },
            ]}
          >
            <Text style={[s.studyNoteText, { color: colors.text }]}>
              {adminExplanation}
            </Text>
          </View>
        </View>
      )}



    </View>
  );
}

function Row({
  colors,
  isRtl,
  title,
  subtitle,
  aiLabel = 'AI',
  onHide,
}: {
  colors: any;
  isRtl?: boolean;
  title: string;
  subtitle?: string;
  aiLabel?: string;
  onHide: () => void;
}) {
  return (
    <View style={[s.row, isRtl && s.rowRtl, { borderBottomColor: colors.border }]}>
      <View style={[s.rowIcon, { backgroundColor: `${colors.primary}16` }]}>
        <Hash size={15} color={colors.primary} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={[s.rowTitleRow, isRtl && s.rowTitleRowRtl]}>
          <Text style={[s.rowTitle, { color: colors.text }]}>{title}</Text>
          <View style={[s.aiBadge, { backgroundColor: `${colors.primary}12` }]}>
            <Sparkles size={10} color={colors.primary} strokeWidth={2.4} />
            <Text style={[s.aiBadgeText, { color: colors.primary }]}>
              {aiLabel}
            </Text>
          </View>
        </View>
        {subtitle ? (
          <Text style={[s.rowSub, { color: colors.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onHide}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[s.rowClose, { backgroundColor: `${colors.textSecondary}15` }]}
      >
        <X size={14} color={colors.textSecondary} strokeWidth={2.5} />
      </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitleRowRtl: {
    flexDirection: 'row-reverse',
  },
  rowTitle: {
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
  rowSub: {
    fontSize: FONT_SIZES.xs,
    marginTop: 1,
  },
  rowClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingSpinnerWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyWordCard: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: 4,
  },
  emptyWordText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
  },
  headLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  englishWord: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  englishDef: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    lineHeight: 18,
  },
  headRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  originalWord: {
    fontSize: 20,
    fontWeight: '700',
  },
  translit: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeaderRowRtl: {
    flexDirection: 'row-reverse',
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  richText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
    fontWeight: '500',
  },
  definitionText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    fontWeight: '500',
  },
  grammarCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  grammarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  grammarKey: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  grammarValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  crossRefsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  crossRefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  crossRefText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  studyNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyNoteCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  studyNoteText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    fontWeight: '500',
  },});

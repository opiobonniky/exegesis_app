import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Book,
  Tags,
} from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import ExpandableText from '../../ExpandableText';
import { ResourceCard, EmptyState } from './shared';
import type {
  CommentaryEntry,
  DictionaryEntry,
  InterlinearWord,
  TranslationComparisonEntry,
} from '../../../../services/verseResourcesApi';
import type { StrongsWordData } from '../../../../services/strongsService';

// ── CommentariesView ──────────────────────────────────────────────────────

export function CommentariesView({
  data,
  colors,
  isRtl,
  bc,
}: {
  data: CommentaryEntry[];
  colors: any;
  isRtl: boolean;
  bc: any;
}) {
  if (!data || data.length === 0)
    return <EmptyState message={bc?.noExplanationFound || 'No commentaries available for this verse.'} colors={colors} />;

  return (
    <View style={{ gap: SPACING.sm }}>
      {data.map((c, i) => (
        <ResourceCard key={`comm-${i}`} colors={colors} accentColor="#4F6EF7">
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={[vrStyles.authorBadge, { backgroundColor: '#4F6EF7' }]}>
              <Text style={vrStyles.authorInitial}>{c.author.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[vrStyles.authorName, { color: colors.text }]} numberOfLines={1}>
                {c.author}
              </Text>
              {c.title ? (
                <Text style={[vrStyles.titleText, { color: colors.muted }]} numberOfLines={1}>
                  {c.title}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[vrStyles.divider, { backgroundColor: colors.border }]} />
          <ExpandableText
            text={c.text}
            initialLines={5}
            expandLabel={bc?.learnMore || 'Read more'}
            closeLabel={bc?.cancel || 'Close'}
          />
        </ResourceCard>
      ))}
    </View>
  );
}

// ── CrossReferencesView ───────────────────────────────────────────────────

export function CrossReferencesView({
  data,
  colors,
  isRtl,
  onNavigate,
}: {
  data: Array<{ ref: string; text: string }>;
  colors: any;
  isRtl: boolean;
  onNavigate: (ref: string) => void;
}) {
  if (!data || data.length === 0)
    return <EmptyState message="No cross-references available for this verse." colors={colors} />;

  return (
    <View style={{ gap: SPACING.sm }}>
      {data.map((cr, i) => (
        <TouchableOpacity
          key={`cr-${i}`}
          activeOpacity={0.7}
          onPress={() => onNavigate(cr.ref)}
        >
          <ResourceCard colors={colors} accentColor="#0EA5E9">
            <View
              style={{
                flexDirection: isRtl ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <View style={[vrStyles.crNumber, { backgroundColor: '#0EA5E914' }]}>
                <Text style={[vrStyles.crNumberText, { color: '#0EA5E9' }]}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[vrStyles.crRef, { color: '#0EA5E9' }]} numberOfLines={1}>
                  {cr.ref}
                </Text>
                <Text style={[vrStyles.crText, { color: colors.textSecondary }]} numberOfLines={3}>
                  {cr.text}
                </Text>
              </View>
              {isRtl ? (
                <ChevronLeft size={15} color={colors.muted} strokeWidth={2} />
              ) : (
                <ChevronRight size={15} color={colors.muted} strokeWidth={2} />
              )}
            </View>
          </ResourceCard>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── WordStudiesView ───────────────────────────────────────────────────────

export function WordStudiesView({
  data,
  colors,
  isRtl,
}: {
  data: Array<{ word: string; transliteration: string; meaning: string; strongs?: string }>;
  colors: any;
  isRtl: boolean;
}) {
  if (!data || data.length === 0)
    return <EmptyState message="No word studies available for this verse." colors={colors} />;

  return (
    <View style={{ gap: SPACING.sm }}>
      {data.map((ws, i) => (
        <ResourceCard key={`ws-${i}`} colors={colors} accentColor="#8B5CF6">
          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={[vrStyles.wsIcon, { backgroundColor: '#8B5CF614' }]}>
              <Text style={[vrStyles.wsIconText, { color: '#8B5CF6' }]}>
                {ws.word.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[vrStyles.wsWord, { color: colors.text }]}>
                {ws.word}
              </Text>
              <Text style={[vrStyles.wsTranslit, { color: colors.muted }]}>
                {ws.transliteration}
                {ws.strongs ? `  ·  ${ws.strongs}` : ''}
              </Text>
            </View>
          </View>
          <Text
            style={[
              vrStyles.wsMeaning,
              { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' },
            ]}
          >
            {ws.meaning}
          </Text>
        </ResourceCard>
      ))}
    </View>
  );
}

// ── DictionaryView ────────────────────────────────────────────────────────

export function DictionaryView({
  data,
  colors,
  isRtl,
  bc,
}: {
  data: DictionaryEntry[];
  colors: any;
  isRtl: boolean;
  bc: any;
}) {
  if (!data || data.length === 0)
    return <EmptyState message={bc?.noExplanationFound || 'No dictionary entries available.'} colors={colors} />;

  return (
    <View style={{ gap: SPACING.sm }}>
      {data.map((entry, i) => (
        <ResourceCard key={`dict-${i}`} colors={colors} accentColor="#10B981">
          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <View style={[vrStyles.dictIcon, { backgroundColor: '#10B98114' }]}>
              <Book size={16} color="#10B981" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[vrStyles.dictTerm, { color: colors.text }]}>
                {entry.term}
              </Text>
              {entry.pronunciation ? (
                <Text style={[vrStyles.dictPron, { color: colors.muted }]}>
                  /{entry.pronunciation}/
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[vrStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[vrStyles.dictDef, { color: '#10B981' }]}>
            {entry.definition}
          </Text>
          <ExpandableText
            text={entry.description}
            initialLines={4}
            expandLabel={bc?.learnMore || 'Read more'}
            closeLabel={bc?.cancel || 'Close'}
          />
        </ResourceCard>
      ))}
    </View>
  );
}

// ── TranslationComparisonView ─────────────────────────────────────────────

export function TranslationComparisonView({
  data,
  loading,
  error,
  colors,
  isRtl,
  bc,
}: {
  data: TranslationComparisonEntry[] | null;
  loading: boolean;
  error: string | null;
  colors: any;
  isRtl: boolean;
  bc: any;
}) {
  if (loading) {
    return (
      <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        message={error || bc?.noExplanationFound || 'No translation data available for this verse.'}
        colors={colors}
      />
    );
  }

  return (
    <View style={{ gap: SPACING.sm }}>
      {data.map((t, i) => (
        <ResourceCard key={`trans-${i}`} colors={colors} accentColor="#F59E0B">
          <View
            style={{
              flexDirection: isRtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <View style={[vrStyles.transBadge, { backgroundColor: '#F59E0B14' }]}>
              <Text style={[vrStyles.transAbbr, { color: '#F59E0B' }]}>
                {t.abbreviation}
              </Text>
            </View>
            <Text style={[vrStyles.transVersion, { color: colors.text }]} numberOfLines={1}>
              {t.version}
            </Text>
          </View>
          <View style={[vrStyles.divider, { backgroundColor: colors.border }]} />
          <Text
            style={[vrStyles.transText, { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' }]}
          >
            {t.text}
          </Text>
        </ResourceCard>
      ))}
    </View>
  );
}

// ── InterlinearView ───────────────────────────────────────────────────────

export function InterlinearView({
  data,
  colors,
  isRtl,
  bc,
  verseWords = [],
}: {
  data: InterlinearWord[];
  colors: any;
  isRtl: boolean;
  bc: any;
  verseWords?: StrongsWordData[];
}) {
  const hasBackendData = data && data.length > 0;
  const hasStrongsData = verseWords && verseWords.length > 0;

  if (!hasBackendData && !hasStrongsData) {
    return (
      <EmptyState
        message={bc?.noExplanationFound || 'No interlinear data available for this verse.'}
        colors={colors}
      />
    );
  }

  const combinedRows = hasBackendData
    ? data.map((w) => ({
        original: w.original,
        strongs: w.strongs,
        transliteration: w.transliteration,
        translation: w.translation,
      }))
    : verseWords.map((w) => ({
        original: w.surfaceText,
        strongs: w.strongsId || '',
        transliteration: w.strongs?.transliteration || '',
        translation: w.strongs?.shortDefinition || '',
      }));

  return (
    <ResourceCard colors={colors} accentColor="#EC4899">
      <View style={{ gap: 6 }}>
        <View
          style={[vrStyles.ilHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
        >
          <Text style={[vrStyles.ilCol, vrStyles.ilColOrig, { color: '#EC4899' }]}>
            {bc?.oldTestament || 'Original'}
          </Text>
          <Text style={[vrStyles.ilCol, vrStyles.ilColStrongs, { color: colors.muted }]}>
            Strong's
          </Text>
          <Text style={[vrStyles.ilCol, vrStyles.ilColTranslit, { color: colors.muted }]}>
            {bc?.translate || 'Translit.'}
          </Text>
          <Text style={[vrStyles.ilCol, vrStyles.ilColEng, { color: colors.muted }]}>
            {bc?.copy || 'English'}
          </Text>
        </View>

        {combinedRows.map((w, i) => (
          <View
            key={`il-${i}`}
            style={[
              vrStyles.ilRow,
              {
                flexDirection: isRtl ? 'row-reverse' : 'row',
                backgroundColor: i % 2 === 0 ? 'transparent' : `${colors.border}25`,
              },
            ]}
          >
            <Text style={[vrStyles.ilCol, vrStyles.ilColOrig, { color: colors.text }]} numberOfLines={1}>
              {w.original}
            </Text>
            <Text style={[vrStyles.ilCol, vrStyles.ilColStrongs, { color: '#EC4899' }]} numberOfLines={1}>
              {w.strongs}
            </Text>
            <Text style={[vrStyles.ilCol, vrStyles.ilColTranslit, { color: colors.muted, fontStyle: 'italic' }]} numberOfLines={1}>
              {w.transliteration}
            </Text>
            <Text style={[vrStyles.ilCol, vrStyles.ilColEng, { color: colors.textSecondary }]} numberOfLines={1}>
              {w.translation}
            </Text>
          </View>
        ))}
      </View>
    </ResourceCard>
  );
}

// ── TopicsView ────────────────────────────────────────────────────────────

export function TopicsView({
  data,
  colors,
}: {
  data: Array<{ name: string }>;
  colors: any;
}) {
  if (!data || data.length === 0)
    return <EmptyState message="No related topics available for this verse." colors={colors} />;

  return (
    <ResourceCard colors={colors} accentColor="#6366F1">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data.map((topic, i) => (
          <View
            key={`topic-${i}`}
            style={[vrStyles.topicChip, { backgroundColor: '#6366F114', borderColor: '#6366F128' }]}
          >
            <Tags size={12} color="#6366F1" strokeWidth={2.5} />
            <Text style={[vrStyles.topicText, { color: '#6366F1' }]}>
              {topic.name}
            </Text>
          </View>
        ))}
      </View>
    </ResourceCard>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const vrStyles = StyleSheet.create({
  divider: { height: 1, marginVertical: 8 },

  // Commentary
  authorBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  authorName: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  titleText: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Cross ref
  crNumber: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  crNumberText: { fontSize: 12, fontWeight: '800' },
  crRef: { fontSize: FONT_SIZES.sm, fontWeight: '700', marginBottom: 2 },
  crText: { fontSize: FONT_SIZES.sm, lineHeight: 19 },

  // Word study
  wsIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wsIconText: { fontSize: 17, fontWeight: '800' },
  wsWord: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  wsTranslit: { fontSize: 11, marginTop: 1 },
  wsMeaning: { fontSize: FONT_SIZES.sm, lineHeight: 20, marginTop: 10 },

  // Dictionary
  dictIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dictTerm: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  dictPron: { fontSize: 11, fontStyle: 'italic', marginTop: 1 },
  dictDef: { fontSize: FONT_SIZES.sm, fontWeight: '600', lineHeight: 20, marginBottom: 8 },

  // Translation comparison
  transBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  transAbbr: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  transVersion: { fontSize: FONT_SIZES.sm, fontWeight: '600', flex: 1 },
  transText: { fontSize: FONT_SIZES.sm, lineHeight: 21 },

  // Interlinear
  ilHeader: { paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#EC489920' },
  ilCol: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  ilColOrig: { flex: 1.2 },
  ilColStrongs: { flex: 0.8 },
  ilColTranslit: { flex: 0.9 },
  ilColEng: { flex: 1.1 },
  ilRow: { paddingVertical: 8, paddingHorizontal: 4, borderRadius: 4, alignItems: 'center' },

  // Topics
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  topicText: { fontSize: 11, fontWeight: '700' },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FileText } from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import { ResourceCard, SectionLabel } from './shared';
import RichText from '../../../../reusable/RichText';
import { STUDY_TOOL_LABELS, STUDY_TOOL_COLORS } from './constants';
import type { StudyToolResource } from '../../../../services/verseResourcesApi';

export function StudyToolsSection({
  tools,
  colors,
  isRtl,
}: {
  tools: StudyToolResource[];
  colors: any;
  isRtl?: boolean;
}) {
  if (!tools.length) return null;

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <SectionLabel
        icon={<FileText size={15} color="#8B5CF6" />}
        label="Study Tools"
        color="#8B5CF6"
        count={tools.length}
        colors={colors}
      />
      <View style={{ gap: SPACING.sm }}>
        {tools.map((tool) => {
          const toolColor = STUDY_TOOL_COLORS[tool.toolType] || '#8B5CF6';
          return (
            <ResourceCard key={tool.id} colors={colors} accentColor={toolColor}>
              <View
                style={{
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <View style={[stStyles.typeIcon, { backgroundColor: `${toolColor}14` }]}>
                  <FileText size={15} color={toolColor} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={[stStyles.typeLabel, { color: toolColor }]}>
                      {STUDY_TOOL_LABELS[tool.toolType] || tool.toolType}
                    </Text>
                    {tool.bookName ? (
                      <Text style={[stStyles.ref, { color: colors.muted }]}>
                        {tool.bookName} {tool.chapter}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      stStyles.title,
                      { color: colors.text, textAlign: isRtl ? 'right' : 'left' },
                    ]}
                  >
                    {tool.label}
                  </Text>
                </View>
              </View>

              {tool.description ? (
                <RichText
                  text={tool.description}
                  textStyle={[
                    stStyles.desc,
                    { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' },
                  ]}
                  accentColor={toolColor}
                  paragraphGap={6}
                />
              ) : null}

              {tool.verseRefs?.length ? (
                <View
                  style={[
                    stStyles.versesBox,
                    { backgroundColor: `${colors.primary}06`, borderColor: `${colors.primary}14` },
                  ]}
                >
                  {tool.verseRefs.map((ref, i) => (
                    <Text
                      key={`${tool.id}-ref-${i}`}
                      style={[
                        stStyles.verseRef,
                        { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' },
                      ]}
                    >
                      <Text style={{ fontWeight: '700', color: colors.text }}>
                        {ref.verse}.
                      </Text>{' '}
                      {ref.excerpt || ''}
                    </Text>
                  ))}
                </View>
              ) : null}

              {tool.studyToolWords?.length ? (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {tool.studyToolWords.map((word) => {
                    const strongs = word.strongs;
                    const explanation = word.adminExplanation || strongs?.adminExplanation;
                    return (
                      <View
                        key={word.id}
                        style={[
                          stStyles.wordCard,
                          { borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: isRtl ? 'row-reverse' : 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Text style={[stStyles.wordSurface, { color: colors.text }]}>
                            {word.surfaceText}
                          </Text>
                          {word.strongsId ? (
                            <Text style={[stStyles.wordStrong, { color: toolColor }]}>
                              {word.strongsId}
                            </Text>
                          ) : null}
                          {strongs?.originalWord ? (
                            <Text style={[stStyles.wordOrig, { color: colors.textSecondary }]}>
                              {strongs.originalWord}
                            </Text>
                          ) : null}
                        </View>
                        {strongs?.transliteration || strongs?.shortDefinition ? (
                          <Text
                            style={[
                              stStyles.wordDef,
                              { color: colors.muted, textAlign: isRtl ? 'right' : 'left' },
                            ]}
                          >
                            {strongs?.transliteration ? `${strongs.transliteration} · ` : ''}
                            {strongs?.shortDefinition || ''}
                          </Text>
                        ) : null}
                        {explanation ? (
                          <RichText
                            text={explanation}
                            textStyle={[
                              stStyles.wordExpl,
                              { color: colors.textSecondary, textAlign: isRtl ? 'right' : 'left' },
                            ]}
                            accentColor={toolColor}
                            paragraphGap={4}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </ResourceCard>
          );
        })}
      </View>
    </View>
  );
}

const stStyles = StyleSheet.create({
  typeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  ref: { fontSize: 10, fontWeight: '500' },
  title: { fontSize: FONT_SIZES.md, fontWeight: '700' },
  desc: { fontSize: FONT_SIZES.sm, lineHeight: 19, marginTop: 8 },
  versesBox: { marginTop: 8, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, gap: 6 },
  verseRef: { fontSize: FONT_SIZES.sm, lineHeight: 19 },
  wordCard: { padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  wordSurface: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  wordStrong: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  wordOrig: { fontSize: 11, fontWeight: '600', fontStyle: 'italic' },
  wordDef: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  wordExpl: { fontSize: 11, lineHeight: 16, marginTop: 4, fontStyle: 'italic' },
});

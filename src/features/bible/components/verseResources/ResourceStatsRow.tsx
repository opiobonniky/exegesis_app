import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, FONT_SIZES } from '../../../../constants/theme';
import type { VerseResourceData } from '../../../../services/verseResourcesApi';
import type { StrongsWordData } from '../../../../services/strongsService';

export function ResourceStatsRow({
  data,
  verseWords,
  colors,
}: {
  data: VerseResourceData;
  verseWords: StrongsWordData[];
  colors: any;
}) {
  const stats = [
    { label: 'Commentaries', count: data.commentaries?.length || 0, color: '#4F6EF7' },
    { label: 'Cross Refs', count: data.crossReferences?.length || 0, color: '#0EA5E9' },
    { label: 'Word Studies', count: data.wordStudies?.length || 0, color: '#8B5CF6' },
    { label: 'Dictionary', count: data.dictionaryTerms?.length || 0, color: '#10B981' },
    { label: 'Words', count: verseWords.length || 0, color: '#EC4899' },
    { label: 'Topics', count: data.relatedTopics?.length || 0, color: '#6366F1' },
  ];

  const visibleStats = stats.filter((s) => s.count > 0);

  if (visibleStats.length === 0) return null;

  return (
    <View style={[statsStyles.row, { borderColor: colors.border }]}>
      {visibleStats.map((stat) => (
        <View key={stat.label} style={statsStyles.item}>
          <Text style={[statsStyles.count, { color: stat.color }]}>
            {stat.count}
          </Text>
          <Text style={[statsStyles.label, { color: colors.muted }]}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const statsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  item: { alignItems: 'center', minWidth: 60 },
  count: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: '600', marginTop: 1 },
});

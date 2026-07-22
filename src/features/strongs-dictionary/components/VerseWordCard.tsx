import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, Info } from 'lucide-react-native';
import type { VerseUniqueWord, StrongsWordEntry } from '../services/strongsDictionaryApi';

interface Props {
  item: VerseUniqueWord;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenDetail: (strongs: StrongsWordEntry) => void;
  colors: any;
}

export default function VerseWordCard({
  item,
  isExpanded,
  onToggle,
  onOpenDetail,
  colors,
}: Props) {
  const hasStrongs = item.strongsId && item.hasData;
  const isGreek = item.strongs?.language === 'Greek';
  const langColor = isGreek ? '#e53e3e' : '#2563eb';

  return (
    <View style={styles(colors).wrapper}>
      <TouchableOpacity
        style={styles(colors).card}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles(colors).left}>
          <Text style={styles(colors).surfaceText}>{item.surfaceText}</Text>
          <View style={styles(colors).verseBadge}>
            <Text style={styles(colors).verseBadgeText}>
              v{item.verseNumber} · #{item.wordOrder}
            </Text>
          </View>
        </View>
        <ChevronDown
          size={16}
          color={colors.muted}
          style={{ transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }] }}
        />
      </TouchableOpacity>

      {isExpanded && hasStrongs && item.strongs && (
        <View style={styles(colors).expandBody}>
          <View style={styles(colors).divider} />

          <View style={styles(colors).strongsRow}>
            <View style={[styles(colors).metaBadge, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles(colors).metaBadgeText, { color: colors.primary }]}>
                {item.strongsId}
              </Text>
            </View>
            {item.strongs.partOfSpeech && (
              <View style={styles(colors).posTag}>
                <Text style={styles(colors).posTagText}>{item.strongs.partOfSpeech}</Text>
              </View>
            )}
            <View style={[styles(colors).posTag, { backgroundColor: langColor + '15' }]}>
              <Text style={[styles(colors).posTagText, { color: langColor }]}>
                {item.strongs.language}
              </Text>
            </View>
          </View>

          <Text style={styles(colors).definition}>
            {item.strongs.shortDefinition || '(no definition)'}
          </Text>

          {item.strongs.originalWord && (
            <Text style={styles(colors).originalWord}>
              {item.strongs.originalWord}
              {item.strongs.transliteration ? `  ·  ${item.strongs.transliteration}` : ''}
            </Text>
          )}

          {item.strongs.fullDefinition && (
            <Text style={styles(colors).fullDef}>{item.strongs.fullDefinition}</Text>
          )}

          {item.strongs.usageCount != null && (
            <Text style={styles(colors).usageText}>
              Used {item.strongs.usageCount} times in the Bible
            </Text>
          )}

          <TouchableOpacity
            style={styles(colors).detailBtn}
            onPress={() => onOpenDetail(item.strongs!)}
            activeOpacity={0.7}
          >
            <Info size={14} color={colors.primary} />
            <Text style={styles(colors).detailBtnText}>View full details</Text>
          </TouchableOpacity>
        </View>
      )}

      {isExpanded && !hasStrongs && (
        <View style={styles(colors).expandBody}>
          <View style={styles(colors).divider} />
          <Text style={styles(colors).noData}>No Strong's data available for this word</Text>
        </View>
      )}
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  wrapper: {
    backgroundColor: c.cardBackground,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  surfaceText: { fontSize: 17, fontWeight: '800', color: c.text },
  verseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  verseBadgeText: { fontSize: 10, fontWeight: '800', color: c.textSecondary },

  expandBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  divider: { height: 1, backgroundColor: c.border, marginBottom: 4 },

  strongsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  metaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  metaBadgeText: { fontSize: 11, fontWeight: '800' },
  posTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  posTagText: { fontSize: 10, fontWeight: '800', color: c.textSecondary },

  definition: { fontSize: 16, fontWeight: '800', color: c.text, marginTop: 2 },
  originalWord: { fontSize: 14, fontWeight: '600', color: c.textSecondary, fontStyle: 'italic' },
  fullDef: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
  usageText: { fontSize: 12, fontWeight: '700', color: c.muted },

  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.primary + '30',
    marginTop: 4,
  },
  detailBtnText: { fontSize: 13, fontWeight: '800', color: c.primary },

  noData: { fontSize: 13, color: c.muted, fontStyle: 'italic', paddingBottom: 4 },
});

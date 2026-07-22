import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { StrongsWordEntry } from '../services/strongsDictionaryApi';

interface Props {
  item: StrongsWordEntry;
  onPress: (item: StrongsWordEntry) => void;
  colors: any;
}

export default function WordCard({ item, onPress, colors }: Props) {
  const isGreek = item.language === 'Greek';
  const langColor = isGreek ? '#e53e3e' : '#2563eb';
  const langLetter = isGreek ? 'G' : 'H';

  return (
    <TouchableOpacity
      style={styles(colors).card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles(colors).langBadge, { backgroundColor: langColor + '18' }]}>
        <Text style={[styles(colors).langLetter, { color: langColor }]}>{langLetter}</Text>
      </View>

      <View style={styles(colors).body}>
        <Text style={styles(colors).definition} numberOfLines={1}>
          {item.shortDefinition || '(no definition)'}
        </Text>
        <View style={styles(colors).originalRow}>
          {item.originalWord && (
            <Text style={styles(colors).originalWord}>{item.originalWord}</Text>
          )}
          {item.transliteration && (
            <Text style={styles(colors).translit}>{item.transliteration}</Text>
          )}
        </View>
        <View style={styles(colors).metaRow}>
          <View style={[styles(colors).metaBadge, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles(colors).metaBadgeText, { color: colors.primary }]}>
              {item.strongsId}
            </Text>
          </View>
          {item.partOfSpeech && (
            <View style={styles(colors).posBadge}>
              <Text style={styles(colors).posBadgeText}>{item.partOfSpeech}</Text>
            </View>
          )}
          {item.usageCount != null && (
            <Text style={styles(colors).usageCount}>{item.usageCount}×</Text>
          )}
        </View>
      </View>

      <ChevronRight size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = (c: any) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  langBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langLetter: { fontSize: 16, fontWeight: '900' },
  body: { flex: 1, gap: 4 },
  definition: { fontSize: 16, fontWeight: '800', color: c.text },
  originalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  originalWord: { fontSize: 14, fontWeight: '600', color: c.text, fontStyle: 'italic' },
  translit: { fontSize: 13, color: c.muted },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  metaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  metaBadgeText: { fontSize: 11, fontWeight: '800' },
  posBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  posBadgeText: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
  usageCount: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
});

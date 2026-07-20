import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
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
      style={styles(colors).wordCard}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles(colors).wordCardLeft}>
        <View style={[styles(colors).langBadge, { backgroundColor: langColor + '20' }]}>
          <Text style={[styles(colors).langBadgeText, { color: langColor }]}>
            {langLetter}
          </Text>
        </View>
      </View>
      <View style={styles(colors).wordCardBody}>
        <Text style={styles(colors).wordEnglish} numberOfLines={1}>
          {item.shortDefinition || '(no definition)'}
        </Text>
        <View style={styles(colors).wordMetaRow}>
          <Text style={styles(colors).wordStrongsId}>{item.strongsId}</Text>
          {item.originalWord && (
            <Text style={styles(colors).wordOriginal}>{item.originalWord}</Text>
          )}
          {item.transliteration && (
            <Text style={styles(colors).wordTranslit}>{item.transliteration}</Text>
          )}
        </View>
        {item.partOfSpeech && (
          <Text style={styles(colors).wordPos}>{item.partOfSpeech}</Text>
        )}
        <View style={styles(colors).wordBadges}>
          {item.usageCount != null && (
            <View style={styles(colors).badge}>
              <Text style={styles(colors).badgeText}>{item.usageCount}×</Text>
            </View>
          )}
          <View style={[styles(colors).badge, { backgroundColor: langColor + '15' }]}>
            <Text style={[styles(colors).badgeText, { color: langColor }]}>{item.language}</Text>
          </View>
        </View>
      </View>
      <ChevronDown size={14} color={colors.muted} style={{ transform: [{ rotate: '-90deg' }] }} />
    </TouchableOpacity>
  );
}

const styles = (c: any) => StyleSheet.create({
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  wordCardLeft: { alignItems: 'center' },
  langBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  langBadgeText: { fontSize: 15, fontWeight: '900' },
  wordCardBody: { flex: 1 },
  wordEnglish: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 2 },
  wordMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 2 },
  wordStrongsId: { fontSize: 11, fontWeight: '800', color: c.primary, backgroundColor: c.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  wordOriginal: { fontSize: 13, fontWeight: '600', color: c.text, fontStyle: 'italic' },
  wordTranslit: { fontSize: 12, color: c.muted },
  wordPos: { fontSize: 11, color: c.muted, marginTop: 3, fontWeight: '600' },
  wordBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  badgeText: { fontSize: 10, fontWeight: '800', color: c.textSecondary },
});

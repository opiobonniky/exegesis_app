import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import type { VerseUniqueWord } from '../services/strongsDictionaryApi';
import type { StrongsWordEntry } from '../services/strongsDictionaryApi';

interface Props {
  item: VerseUniqueWord;
  onPress: (strongs: StrongsWordEntry) => void;
  colors: any;
}

export default function VerseWordCard({ item, onPress, colors }: Props) {
  const hasStrongs = item.strongsId && item.hasData;
  const isGreek = item.strongs?.language === 'Greek';
  const langColor = isGreek ? '#e53e3e' : '#2563eb';

  return (
    <TouchableOpacity
      style={styles(colors).wordCard}
      onPress={() => {
        if (hasStrongs && item.strongs) {
          onPress(item.strongs);
        }
      }}
      activeOpacity={0.7}
      disabled={!hasStrongs}
    >
      <View style={styles(colors).wordCardBody}>
        <View style={styles(colors).verseWordHeader}>
          <Text style={styles(colors).verseWordSurface}>{item.surfaceText}</Text>
          <Text style={styles(colors).verseWordNum}>v{item.verseNumber} · #{item.wordOrder}</Text>
        </View>
        {item.strongs ? (
          <View style={styles(colors).wordMetaRow}>
            <Text style={styles(colors).wordStrongsId}>{item.strongsId}</Text>
            {item.strongs.shortDefinition && (
              <Text style={styles(colors).verseWordDef} numberOfLines={1}>
                {item.strongs.shortDefinition}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles(colors).noStrongsText}>No Strong's data</Text>
        )}
        {item.strongs && (
          <View style={styles(colors).wordBadges}>
            {item.strongs.partOfSpeech && (
              <View style={styles(colors).badge}>
                <Text style={styles(colors).badgeText}>{item.strongs.partOfSpeech}</Text>
              </View>
            )}
            <View style={[styles(colors).badge, { backgroundColor: langColor + '15' }]}>
              <Text style={[styles(colors).badgeText, { color: langColor }]}>
                {item.strongs.language}
              </Text>
            </View>
          </View>
        )}
      </View>
      {hasStrongs && (
        <ChevronDown size={14} color={colors.muted} style={{ transform: [{ rotate: '-90deg' }] }} />
      )}
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
  wordCardBody: { flex: 1 },
  verseWordHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  verseWordSurface: { fontSize: 16, fontWeight: '800', color: c.text },
  verseWordNum: { fontSize: 11, color: c.muted, fontWeight: '600' },
  wordMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 2 },
  wordStrongsId: { fontSize: 11, fontWeight: '800', color: c.primary, backgroundColor: c.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  verseWordDef: { fontSize: 13, color: c.textSecondary, flex: 1 },
  noStrongsText: { fontSize: 12, color: c.muted, fontStyle: 'italic', marginTop: 2 },
  wordBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  badgeText: { fontSize: 10, fontWeight: '800', color: c.textSecondary },
});

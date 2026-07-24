import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StrongsWordEntry } from '../services/strongsDictionaryApi';

interface Props {
  item: StrongsWordEntry;
  onPress: (item: StrongsWordEntry) => void;
  colors: any;
}

export default function WordCard({ item, onPress, colors }: Props) {
  const isGreek = item.language === 'Greek';
  const langColor = isGreek ? '#b91c1c' : '#1d4ed8';
  const langLabel = isGreek ? 'Gk' : 'Hb';

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={() => onPress(item)}
      activeOpacity={0.6}
    >
      <View style={styles.headwordRow}>
        <Text style={[styles.langTag, { color: langColor }]}>{langLabel}</Text>
        {item.originalWord && (
          <Text style={[styles.originalWord, { color: colors.text }]}>
            {item.originalWord}
          </Text>
        )}
        {item.transliteration && (
          <Text style={[styles.translit, { color: colors.textSecondary }]}>
            ({item.transliteration})
          </Text>
        )}
        <Text style={[styles.strongsId, { color: colors.muted }]}>
          {item.strongsId}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {item.partOfSpeech && (
          <Text style={[styles.pos, { color: colors.muted }]}>
            {item.partOfSpeech}
          </Text>
        )}
        {item.usageCount != null && (
          <Text style={[styles.usage, { color: colors.muted }]}>
            {item.usageCount}×
          </Text>
        )}
      </View>

      <Text style={[styles.definition, { color: colors.text }]} numberOfLines={3}>
        {item.fullDefinition || item.shortDefinition || '(no definition)'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  headwordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
  },
  langTag: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  originalWord: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  translit: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  strongsId: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  pos: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  usage: {
    fontSize: 11,
    fontWeight: '600',
  },
  definition: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
});

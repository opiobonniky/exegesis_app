import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Search, LibraryBig, BookText } from 'lucide-react-native';
import type { DictionaryMode } from '../hooks/useStrongsDictionary';

const MODE_TABS: { key: DictionaryMode; label: string; icon: React.ElementType }[] = [
  { key: 'search', label: 'Search', icon: Search },
  { key: 'browse', label: 'Browse by Book', icon: LibraryBig },
  { key: 'verse', label: 'By Verse', icon: BookText },
];

interface Props {
  mode: DictionaryMode;
  onSelect: (mode: DictionaryMode) => void;
  colors: any;
}

export default function ModeTabs({ mode, onSelect, colors }: Props) {
  return (
    <View style={styles(colors).modeTabs}>
      {MODE_TABS.map(tab => {
        const active = mode === tab.key;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles(colors).modeTab, active && styles(colors).modeTabActive]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.7}
          >
            <Icon size={14} color={active ? '#fff' : colors.primary} />
            <Text style={[styles(colors).modeTabText, active && styles(colors).modeTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  modeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardBackground,
  },
  modeTabActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
  },
  modeTabTextActive: {
    color: '#fff',
  },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BookOpen, Search, LibraryBig, Heart } from 'lucide-react-native';
import { useLanguage, isRtlLanguage } from '../../../component/language-translation/LanguageProvider';
import { primaryOnSurface } from '../themeHelper';
import type { DictionaryMode } from '../hooks/useStrongsDictionary';

const MODE_TABS: {
  key: DictionaryMode;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: 'study', label: 'Study Verse', icon: BookOpen },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'browse', label: 'Browse', icon: LibraryBig },
  { key: 'favorites', label: 'Favorites', icon: Heart },
];

interface Props {
  mode: DictionaryMode;
  onSelect: (mode: DictionaryMode) => void;
  colors: any;
  isDark: boolean;
}

/**
 * Four-tab switcher matching the dictionary design: a light grey rounded
 * container with the selected tab filled light-blue and blue text/border.
 */
export default function DictionaryTabs({ mode, onSelect, colors, isDark }: Props) {
  const { language } = useLanguage();
  const rtl = isRtlLanguage(language);
  const activeColor = primaryOnSurface(colors, isDark);
  return (
    <View style={[styles.wrap, { backgroundColor: colors.cardBackground }]}>
      {MODE_TABS.map(tab => {
        const active = mode === tab.key;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              rtl && styles.tabRtl,
              active
                ? { backgroundColor: colors.surface, borderColor: activeColor }
                : { borderColor: colors.cardBackground },
            ]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.8}
          >
            <Icon
              size={16}
              strokeWidth={2.2}
              color={active ? activeColor : colors.muted}
            />
            <Text
              style={[
                styles.tabText,
                { color: active ? activeColor : colors.muted },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: 2,
    borderRadius: 16,
    padding: 5,
    gap: 5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  tabRtl: {
    flexDirection: 'row-reverse',
  },
});

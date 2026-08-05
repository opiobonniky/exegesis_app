import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Highlighter,
  NotebookPen,
  Bookmark,
  Copy,
  Share2,
  Volume2,
  X,
} from 'lucide-react-native';
import { useLanguage, isRtlLanguage } from '../../../component/language-translation/LanguageProvider';

export interface VerseMultiSelectBarProps {
  count: number;
  colors: any;
  onHighlight: () => void;
  onNote: () => void;
  onFavorite: () => void;
  onCopy: () => void;
  onShare: () => void;
  onListen: () => void;
  onClear: () => void;
}

/**
 * Floating action bar shown while the reader is in multi-select mode (entered
 * by long-pressing a verse). Shows the selected count plus quick actions for
 * the whole selection, and a clear button to exit the mode.
 */
export default function VerseMultiSelectBar({
  count,
  colors,
  onHighlight,
  onNote,
  onFavorite,
  onCopy,
  onShare,
  onListen,
  onClear,
}: VerseMultiSelectBarProps) {
  const { language } = useLanguage();
  const isRtl = isRtlLanguage(language);

  const actions = [
    { id: 'highlight', Icon: Highlighter, label: 'Highlight', onPress: onHighlight },
    { id: 'note', Icon: NotebookPen, label: 'Note', onPress: onNote },
    { id: 'favorite', Icon: Bookmark, label: 'Save', onPress: onFavorite },
    { id: 'copy', Icon: Copy, label: 'Copy', onPress: onCopy },
    { id: 'share', Icon: Share2, label: 'Share', onPress: onShare },
    { id: 'listen', Icon: Volume2, label: 'Listen', onPress: onListen },
  ];

  return (
    <View
      style={[
        styles.bar,
        isRtl && styles.barRtl,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.countWrap, { backgroundColor: `${colors.primary}14` }]}>
        <Text style={[styles.countText, { color: colors.primary }]}>
          {count} selected
        </Text>
      </View>

      <View style={styles.actions}>
        {actions.map(a => {
          const Icon = a.Icon;
          return (
            <TouchableOpacity
              key={a.id}
              style={styles.action}
              onPress={a.onPress}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Icon size={18} color={colors.text} strokeWidth={2.1} />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.clearBtn, { backgroundColor: `${colors.muted}14` }]}
        onPress={onClear}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={18} color={colors.muted} strokeWidth={2.4} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  barRtl: {
    flexDirection: 'row-reverse',
  },
  countWrap: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 4,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 44,
    paddingVertical: 2,
  },
  actionLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

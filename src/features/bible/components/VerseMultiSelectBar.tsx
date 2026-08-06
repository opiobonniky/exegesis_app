import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
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

export interface VerseMultiSelectBarProps {
  count: number;
  colors: any;
  isDark?: boolean;
  highlightColor?: string;
  highlighting?: boolean;
  onHighlight: () => void;
  onNote: () => void;
  onFavorite: () => void;
  onCopy: () => void;
  onShare: () => void;
  onListen: () => void;
  onClear: () => void;
}

/**
 * Simple multi‑select bar anchored at the bottom of the screen.
 * Shows selection count, a clear button, and a horizontally scrollable row of actions.
 */
export default function VerseMultiSelectBar({
  count,
  colors,
  isDark = false,
  highlightColor,
  highlighting = false,
  onHighlight,
  onNote,
  onFavorite,
  onCopy,
  onShare,
  onListen,
  onClear,
}: VerseMultiSelectBarProps) {
  const accent = colors.primary;
  const actions = [
    { id: 'highlight', Icon: Highlighter, label: 'Highlight', tint: highlightColor ?? accent, busy: highlighting, onPress: onHighlight },
    { id: 'note', Icon: NotebookPen, label: 'Note', tint: '#F59E0B', onPress: onNote },
    { id: 'favorite', Icon: Bookmark, label: 'Save', tint: '#EC4899', onPress: onFavorite },
    { id: 'copy', Icon: Copy, label: 'Copy', tint: '#3B82F6', onPress: onCopy },
    { id: 'share', Icon: Share2, label: 'Share', tint: '#10B981', onPress: onShare },
    { id: 'listen', Icon: Volume2, label: 'Listen', tint: '#8B5CF6', onPress: onListen },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      {/* Header: count + clear button */}
      <View style={styles.header}>
        <View style={[styles.countWrap, { backgroundColor: `${accent}14` }]}> 
          <View style={[styles.countDot, { backgroundColor: accent }]} />
          <Text style={[styles.countText, { color: accent }]}>{count} selected</Text>
        </View>
        <TouchableOpacity
          style={[styles.clearBtn, { backgroundColor: `${colors.muted}18` }]}
          onPress={onClear}
          activeOpacity={0.75}
        >
          <X size={17} color={colors.muted} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* Action icons – horizontal scroll */}
      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actions}
      >
        {actions.map(({ id, Icon, label, tint, busy, onPress }) => (
          <TouchableOpacity key={id} style={styles.action} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconTile, { backgroundColor: `rgba(${tint}20,0.2)` }]}> 
              {busy ? (
                <ActivityIndicator size="small" color={tint} />
              ) : (
                <Icon size={19} color={tint} strokeWidth={2.2} />
              )}
            </View>
            <Text style={[styles.actionLabel, { color: colors.textSecondary ?? colors.muted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      borderRadius: 20,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 10,
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  countWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countDot: { width: 8, height: 8, borderRadius: 4 },
  countText: { fontSize: 12, fontWeight: '800' },
  clearBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  action: { alignItems: 'center', gap: 4, minWidth: 58 },
  iconTile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 9, fontWeight: '700' },
});

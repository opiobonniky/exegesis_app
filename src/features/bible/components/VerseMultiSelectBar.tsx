import React, { useMemo } from 'react';
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
  /** Hex color of the last highlight applied; undefined if never highlighted. */
  highlightColor?: string;
  /** True while a highlight request is being saved. */
  highlighting?: boolean;
  onHighlight: () => void;
  onNote: () => void;
  onFavorite: () => void;
  onCopy: () => void;
  onShare: () => void;
  onListen: () => void;
  onClear: () => void;
}

interface ActionItem {
  id: string;
  label: string;
  tint: string;
  Icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>;
  onPress: () => void;
  /** Rendered as a small circle ball badge on the tile. */
  indicatorColor?: string;
  indicatorLabel?: string;
  busy?: boolean;
}

/** Soft translucent tile background derived from the accent hex. */
function softTint(hex: string, isDark: boolean): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${isDark ? 0.28 : 0.16})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function ActionTile({
  item,
  isDark,
  textSecondary,
}: {
  item: ActionItem;
  isDark: boolean;
  textSecondary: string;
}) {
  const Icon = item.Icon;
  return (
    <TouchableOpacity
      style={styles.action}
      onPress={item.onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View
        style={[
          styles.iconTile,
          { backgroundColor: softTint(item.tint, isDark) },
        ]}
      >
        {item.busy ? (
          <ActivityIndicator size="small" color={item.tint} />
        ) : (
          <Icon size={19} color={item.tint} strokeWidth={2.2} />
        )}
        {item.indicatorColor ? (
          <View
            style={[styles.indicatorBall, { backgroundColor: item.indicatorColor }]}
          >
            <View style={styles.indicatorBallCore} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.actionLabel, { color: textSecondary }]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Floating action bar shown while the reader is in multi-select mode (entered
 * by long-pressing a verse). Shows the selected count plus quick actions for
 * the whole selection, and a clear button to exit the mode.
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

  const actions = useMemo<ActionItem[]>(
    () => [
      {
        id: 'highlight',
        Icon: Highlighter,
        label: 'Highlight',
        tint: highlightColor ?? accent,
        indicatorColor: highlightColor,
        indicatorLabel: 'Highlight color',
        busy: highlighting,
        onPress: onHighlight,
      },
      {
        id: 'note',
        Icon: NotebookPen,
        label: 'Note',
        tint: '#F59E0B',
        onPress: onNote,
      },
      {
        id: 'favorite',
        Icon: Bookmark,
        label: 'Save',
        tint: '#EC4899',
        onPress: onFavorite,
      },
      {
        id: 'copy',
        Icon: Copy,
        label: 'Copy',
        tint: '#3B82F6',
        onPress: onCopy,
      },
      {
        id: 'share',
        Icon: Share2,
        label: 'Share',
        tint: '#10B981',
        onPress: onShare,
      },
      {
        id: 'listen',
        Icon: Volume2,
        label: 'Listen',
        tint: '#8B5CF6',
        onPress: onListen,
      },
    ],
    [accent, highlightColor, highlighting, onHighlight, onNote, onFavorite, onCopy, onShare, onListen],
  );

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Header row: selection summary + clear */}
      <View style={styles.header}>
        <View style={[styles.countWrap, { backgroundColor: `${accent}14` }]}>
          <View style={[styles.countDot, { backgroundColor: accent }]} />
          <Text style={[styles.countText, { color: accent }]}>
            {count} selected
          </Text>
        </View>
        <Text style={[styles.hintText, { color: colors.muted }]}>
          Tap to add more
        </Text>
        <TouchableOpacity
          style={[styles.clearBtn, { backgroundColor: `${colors.muted}18` }]}
          onPress={onClear}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Clear selection"
        >
          <X size={17} color={colors.muted} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* Actions row: horizontal scroll of tiles.
          The ScrollView is clamped to the bar's width by the wrapper below, so
          when the six tiles exceed the available space the last ones are
          reachable by swiping sideways. A horizontal ScrollView mirrors itself
          in RTL automatically, so no manual row-reverse is needed. */}
      <View style={styles.actionsWrap}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          bounces={false}
          style={styles.actionsScroll}
          contentContainerStyle={styles.actions}
        >
          {actions.map(a => (
            <ActionTile
              key={a.id}
              item={a}
              isDark={isDark}
              textSecondary={colors.textSecondary ?? colors.muted}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  countDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  hintText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  actionsScroll: {
    flexGrow: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  action: {
    alignItems: 'center',
    gap: 4,
    minWidth: 58,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  indicatorBall: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorBallCore: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  actionLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
});

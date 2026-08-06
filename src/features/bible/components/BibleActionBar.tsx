/**
 * BibleActionBar.tsx
 *
 * Bottom action bar from docs/biblescreen.jpeg — a slate-blue
 * strip with six white line icons:
 *   note+  bookmark  undo  up  redo  down
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  AudioLines,
  FilePlus2,
  Bookmark,
  Undo2,
  ArrowUp,
  Redo2,
  ArrowDown,
} from 'lucide-react-native';

const BAR_BG = '#3c5172';

function VoiceNoteIcon() {
  return (
    <View style={styles.voiceNoteIcon}>
      <FilePlus2 color="#FFFFFF" size={24} strokeWidth={2} />
      <AudioLines
        color="#FFFFFF"
        size={11}
        strokeWidth={2.2}
        style={styles.voiceWaves}
      />
    </View>
  );
}

export type BibleActionBarProps = {
  isRtl?: boolean;
  onNote: () => void;
  onBookmark: () => void;
  onUndo: () => void;
  onScrollTop: () => void;
  onRedo: () => void;
  onScrollBottom: () => void;
};

export default function BibleActionBar({
  isRtl,
  onNote,
  onBookmark,
  onUndo,
  onScrollTop,
  onRedo,
  onScrollBottom,
}: BibleActionBarProps) {
  const actions = [
    {
      id: 'note',
      icon: VoiceNoteIcon,
      label: 'Add note',
      onPress: onNote,
    },
    {
      id: 'bookmark',
      icon: Bookmark,
      label: 'Bookmark verse',
      onPress: onBookmark,
    },
    {
      id: 'previous',
      icon: Undo2,
      label: 'Previous chapter',
      onPress: onUndo,
    },
    {
      id: 'top',
      icon: ArrowUp,
      label: 'Scroll to top',
      onPress: onScrollTop,
    },
    {
      id: 'next',
      icon: Redo2,
      label: 'Next chapter',
      onPress: onRedo,
    },
    {
      id: 'bottom',
      icon: ArrowDown,
      label: 'Scroll to bottom',
      onPress: onScrollBottom,
    },
  ];

  return (
    <View style={[styles.bar, isRtl && styles.barRtl]}>
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <TouchableOpacity
            key={action.id}
            style={styles.btn}
            onPress={action.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={{ top: 3, bottom: 3, left: 8, right: 8 }}
          >
            <Icon color="#FFFFFF" size={25} strokeWidth={2.15} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: BAR_BG,
    height: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  barRtl: {
    flexDirection: 'row-reverse',
  },
  btn: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceNoteIcon: {
    width: 31,
    height: 27,
    justifyContent: 'center',
  },
  voiceWaves: {
    position: 'absolute',
    right: 0,
    bottom: 1,
  },
});

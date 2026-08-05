/**
 * BibleActionBar.tsx
 *
 * Bottom action bar from docs/design-pic/biblescreen.jpeg — a dark-navy
 * strip with six white line icons:
 *   note+  bookmark  undo  up  redo  down
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  FilePlus2,
  Bookmark,
  Undo2,
  ArrowUp,
  Redo2,
  ArrowDown,
} from 'lucide-react-native';

const BAR_BG = '#25385C';

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
    { id: 'note', icon: FilePlus2, onPress: onNote },
    { id: 'bookmark', icon: Bookmark, onPress: onBookmark },
    { id: 'undo', icon: Undo2, onPress: onUndo },
    { id: 'up', icon: ArrowUp, onPress: onScrollTop },
    { id: 'redo', icon: Redo2, onPress: onRedo },
    { id: 'down', icon: ArrowDown, onPress: onScrollBottom },
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
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
          >
            <Icon color="#FFFFFF" size={20} strokeWidth={2.2} />
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
    height: 42,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  barRtl: {
    flexDirection: 'row-reverse',
  },
  btn: {
    width: 44,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

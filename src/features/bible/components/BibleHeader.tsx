/**
 * BibleHeader.tsx
 *
 * Redesigned to match docs/design-pic/biblescreen.jpeg:
 *  - Solid dark-navy bar (#25385C)
 *  - Menu (hamburger) on the left
 *  - Centered book + chapter title with dropdown chevron, and the
 *    version abbreviation + red asterisk underneath
 *  - Notes + search icon buttons on the right
 * Full RTL support, animated press states.
 */

import React, { useMemo } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, NotebookPen, Search, ChevronDown, ScrollText } from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';

// ── Design tokens (from biblescreen.jpeg) ─────────────────────────────────────
const HEADER_BG = '#25385C';
const VERSION_ACCENT = '#E5484D'; // red asterisk

export interface BibleHeaderProps {
  book: string;
  chapter: number;
  version: { name: string; abbreviation: string };
  isDark: boolean;
  isRtl?: boolean;
  onMenuPress: () => void;
  onBookPress: () => void;
  onSearchPress: () => void;
  onVersionPress?: () => void;
  onStudyToolsPress?: () => void;
}

export default function BibleHeader({
  book,
  chapter,
  version,
  isDark: _isDark,
  isRtl,
  onMenuPress,
  onBookPress,
  onSearchPress,
  onVersionPress,
  onStudyToolsPress,
}: BibleHeaderProps) {
  const insets = useSafeAreaInsets();

  const menuScale = useMemo(() => new Animated.Value(1), []);
  const searchScale = useMemo(() => new Animated.Value(1), []);
  const titleScale = useMemo(() => new Animated.Value(1), []);
  const studyToolsScale = useMemo(() => new Animated.Value(1), []);

  const animatePress = (anim: Animated.Value, toValue: number) => {
    Animated.spring(anim, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor={HEADER_BG}
        barStyle="light-content"
      />

      <View style={[localStyles.header, { paddingTop: insets.top }]}>
        <View
          style={[
            localStyles.row,
            { paddingHorizontal: SPACING.md },
            isRtl && localStyles.rowRtl,
          ]}
        >
          {/* ── Menu (hamburger) ─────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={onMenuPress}
            activeOpacity={0.8}
            onPressIn={() => animatePress(menuScale, 0.88)}
            onPressOut={() => animatePress(menuScale, 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={localStyles.sideBtn}
          >
            <Animated.View style={{ transform: [{ scale: menuScale }] }}>
              <Menu color="#FFFFFF" size={22} strokeWidth={2.4} />
            </Animated.View>
          </TouchableOpacity>

          {/* ── Centered: Book + Chapter + Version ──────────────────────── */}
          <View style={localStyles.titleWrap}>
            <TouchableOpacity
              onPress={onBookPress}
              activeOpacity={0.75}
              onPressIn={() => animatePress(titleScale, 0.97)}
              onPressOut={() => animatePress(titleScale, 1)}
              style={localStyles.titleBtn}
            >
              <Animated.View
                style={[
                  localStyles.titleRow,
                  { transform: [{ scale: titleScale }] },
                ]}
              >
                <Text style={localStyles.bookTitle} numberOfLines={1}>
                  {book}
                </Text>
                {chapter > 0 && (
                  <Text style={localStyles.bookTitle} numberOfLines={1}>
                    {' '}
                    {chapter}
                  </Text>
                )}
                <ChevronDown
                  size={15}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                  style={localStyles.chevron}
                />
              </Animated.View>
            </TouchableOpacity>

            {onVersionPress && version?.abbreviation ? (
              <TouchableOpacity
                onPress={onVersionPress}
                activeOpacity={0.7}
                hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                style={localStyles.versionRow}
              >
                <Text style={localStyles.versionText}>
                  {version.abbreviation}
                </Text>
                <Text style={localStyles.versionStar}>*</Text>
              </TouchableOpacity>
            ) : (
              <View style={localStyles.versionRow}>
                <Text style={localStyles.versionText}>
                  {version?.abbreviation || ''}
                </Text>
              </View>
            )}
          </View>

          {/* ── Notes (study tools) ──────────────────────────────────────── */}
          {onStudyToolsPress && (
            <TouchableOpacity
              onPress={onStudyToolsPress}
              activeOpacity={0.8}
              onPressIn={() => animatePress(studyToolsScale, 0.88)}
              onPressOut={() => animatePress(studyToolsScale, 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={localStyles.sideBtn}
            >
              <Animated.View
                style={{ transform: [{ scale: studyToolsScale }] }}
              >
                <ScrollText color="#FFFFFF" size={20} strokeWidth={2.2} />
              </Animated.View>
            </TouchableOpacity>
          )}

          {/* ── Search ───────────────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={onSearchPress}
            activeOpacity={0.8}
            onPressIn={() => animatePress(searchScale, 0.88)}
            onPressOut={() => animatePress(searchScale, 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={localStyles.sideBtn}
          >
            <Animated.View style={{ transform: [{ scale: searchScale }] }}>
              <Search color="#FFFFFF" size={21} strokeWidth={2.3} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const localStyles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: HEADER_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.38)',
  },
  row: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  sideBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  titleBtn: {
    maxWidth: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  chevron: {
    marginLeft: 2,
    opacity: 0.9,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    marginTop: 1,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
  },
  versionStar: {
    fontSize: 11,
    fontWeight: '700',
    color: VERSION_ACCENT,
  },
});

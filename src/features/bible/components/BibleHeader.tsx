/**
 * BibleHeader.tsx
 *
 * Clean top header — Menu | Book/Version | Search.
 * Audio chapter control lives in ChapterNavigation.
 */

import React, { useMemo } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronDown, Menu, Search } from 'lucide-react-native';
import { getColors } from '../../../constants/theme';
import { createBibleStyles } from '../bibleStyle';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface BibleHeaderProps {
  book: string;
  chapter: number;
  version: { name: string; abbreviation: string };
  isDark: boolean;
  onMenuPress: () => void;
  onBookPress: () => void;
  onSearchPress: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// BibleHeader
// ─────────────────────────────────────────────────────────────────────────────

export default function BibleHeader({
  book,
  chapter,
  version,
  isDark,
  onMenuPress,
  onBookPress,
  onSearchPress,
}: BibleHeaderProps) {
  const COLORS = getColors(isDark);
  const styles = useMemo(() => createBibleStyles(isDark), [isDark]);

  return (
    <>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primary]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {/* Menu */}
            <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
              <Menu color={COLORS.white} size={22} strokeWidth={2} />
            </TouchableOpacity>

            {/* Book title + version badge */}
            <TouchableOpacity
              style={styles.headerTitle}
              onPress={onBookPress}
              activeOpacity={0.75}
            >
              <View style={localStyles.titleRow}>
                <Text style={styles.bookTitleText}>{book}</Text>
                <ChevronDown
                  size={22}
                  color={COLORS.white}
                  strokeWidth={2.5}
                  style={{ marginTop: 3 }}
                />
              </View>
              <View style={localStyles.versionBadge}>
                <Text style={localStyles.versionBadgeText}>
                  {version.abbreviation}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Search */}
            <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
              <Search color={COLORS.white} size={22} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local styles
// ─────────────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
    alignSelf: 'center',
  },
  versionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

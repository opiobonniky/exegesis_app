/**
 * BibleHeader.tsx
 *
 * Clean top header — Menu | Book/Version | Search.
 * Audio chapter control lives in ChapterNavigation.
 *
 * iOS Fix: SafeAreaView (from react-native-safe-area-context) is placed
 * INSIDE the LinearGradient so the gradient fills the status-bar region
 * on both platforms without relying on manual inset calculations or
 * bibleStyle's headerGradient fixed height.
 */

import React, { useMemo } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// ✅ Use SafeAreaView from the community package, NOT react-native's built-in.
// Wrap it INSIDE the gradient so the gradient bleeds into the status bar area.
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronDown, Menu, Search } from 'lucide-react-native';
import { getColors, SPACING } from '../../../constants/theme';
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
  onVersionPress?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// BibleHeader
// ─────────────────────────────────────────────────────────────────────────────

export default function BibleHeader({
  book,
  version,
  isDark,
  onMenuPress,
  onBookPress,
  onSearchPress,
  onVersionPress,
}: BibleHeaderProps) {
  const COLORS = getColors(isDark);
  // bibleStyle is still used for bookTitleText, iconButton etc — just NOT for
  // headerGradient / headerContent layout which we fully own here.
  const styles = useMemo(() => createBibleStyles(isDark), [isDark]);

  return (
    <>
      {/*
        Android : backgroundColor fills the translucent status bar with
                  primary colour.
        iOS     : backgroundColor is ignored — the SafeAreaView inside the
                  gradient handles the notch / Dynamic Island inset instead.
      */}
      <StatusBar
        translucent
        backgroundColor={COLORS.primary}
        barStyle="light-content"
      />

      {/*
        The gradient is the outermost view so its colour extends all the way
        to the physical top of the screen (behind the status bar).
        We do NOT give it a fixed height — let it size to its content.
      */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primary]}
        style={localStyles.gradient}
      >
        {/*
          SafeAreaView with edges={['top']} injects the correct top padding
          for iOS notch / Dynamic Island AND the Android status bar when
          translucent={true} is set above.
          We only apply the top edge so left/right/bottom are untouched.
        */}
        <SafeAreaView edges={['top']} style={localStyles.safeArea}>
          {/* Fixed-height row — always visible regardless of inset */}
          <View style={[localStyles.row, { paddingHorizontal: SPACING.lg ?? 16 }]}>

            {/* ── Menu ── */}
            <TouchableOpacity style={styles.iconButton} onPress={onMenuPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Menu color={COLORS.white} size={22} strokeWidth={2} />
            </TouchableOpacity>

            {/* ── Book title (flex: 1 so it fills remaining space) ── */}
            <TouchableOpacity
              style={localStyles.titleButton}
              onPress={onBookPress}
              activeOpacity={0.75}
            >
              <Text style={styles.bookTitleText} numberOfLines={1}>
                {book}
              </Text>
              <ChevronDown
                size={18}
                color={COLORS.white}
                strokeWidth={2.5}
                style={localStyles.chevron}
              />
            </TouchableOpacity>

            {/* ── Version badge ── */}
            {onVersionPress && (
              <TouchableOpacity
                onPress={onVersionPress}
                activeOpacity={0.75}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View style={localStyles.versionBadge}>
                  <Text style={localStyles.versionBadgeText}>
                    {version.abbreviation}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ── Search ── */}
            <TouchableOpacity style={styles.iconButton} onPress={onSearchPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Search color={COLORS.white} size={22} strokeWidth={2} />
            </TouchableOpacity>

          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local styles  — owns the header layout entirely, independent of bibleStyle
// ─────────────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  // Gradient fills its own content — no fixed height so it always wraps the row
  gradient: {
    width: '100%',
  },

  // SafeAreaView adds the correct top inset transparently
  safeArea: {
    width: '100%',
  },

  // The actual icon/title row — explicit height so it never collapses
  row: {
    height: Platform.OS==='ios' ? 52 : 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom:Platform.OS==='ios'?20:20
  },

  // Title takes all remaining space between the side icons
  titleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  chevron: {
    marginTop: 2,
  },

  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  versionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
/**
 * BibleHeader.tsx
 *
 * Premium top header — Menu | Book/Chapter | Version | Search.
 * Designed with depth, subtle gradients, and refined micro-interactions.
 *
 * Features:
 * - Layered gradient background with subtle shadow depth
 * - Animated press states on all interactive elements
 * - Elegant version badge with glass-morphism effect
 * - Improved typography hierarchy
 * - Subtle bottom border for visual separation
 * - Full RTL support
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
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Menu, ScrollText, Search, ChevronDown } from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// BibleHeader
// ─────────────────────────────────────────────────────────────────────────────

export default function BibleHeader({
  book,
  chapter,
  version,
  isDark,
  isRtl,
  onMenuPress,
  onBookPress,
  onSearchPress,
  onVersionPress,
  onStudyToolsPress,
}: BibleHeaderProps) {
  const COLORS = getColors(isDark);

  // Animated values for press feedback
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
      {/* Status bar */}
      <StatusBar
        translucent
        backgroundColor={COLORS.primary}
        barStyle="light-content"
      />

      {/* Main gradient container */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark || COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={localStyles.gradient}
      >
        {/* Subtle inner glow overlay */}
        <View style={localStyles.glowOverlay} />

        {/* Safe area inset */}
        <SafeAreaView edges={['top']} style={localStyles.safeArea}>
          <View
            style={[
              localStyles.container,
              { paddingHorizontal: SPACING.lg },
              isRtl && localStyles.containerRtl,
            ]}
          >
            {/* ── Menu Button ───────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={onMenuPress}
              activeOpacity={0.8}
              onPressIn={() => animatePress(menuScale, 0.9)}
              onPressOut={() => animatePress(menuScale, 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View
                style={[
                  localStyles.iconButton,
                  { transform: [{ scale: menuScale }] },
                ]}
              >
                <View style={localStyles.iconButtonInner}>
                  <Menu color={COLORS.white} size={22} strokeWidth={2.2} />
                </View>
              </Animated.View>
            </TouchableOpacity>

            {/* ── Book & Chapter Title ─────────────────────────────────── */}
            <TouchableOpacity
              onPress={onBookPress}
              activeOpacity={0.75}
              onPressIn={() => animatePress(titleScale, 0.97)}
              onPressOut={() => animatePress(titleScale, 1)}
              style={localStyles.titleContainer}
            >
              <Animated.View
                style={{ transform: [{ scale: titleScale }] }}
              >
                <View style={localStyles.titleContent}>
                  <Text
                    style={localStyles.bookTitle}
                    numberOfLines={1}
                  >
                    {book}
                  </Text>
                  {chapter > 0 && (
                    <View style={localStyles.chapterBadge}>
                      <Text style={localStyles.chapterText}>
                        {chapter}
                      </Text>
                    </View>
                  )}
                  <ChevronDown
                    size={16}
                    color={COLORS.white}
                    strokeWidth={2.5}
                    style={localStyles.chevron}
                  />
                </View>
              </Animated.View>
            </TouchableOpacity>

            {/* ── Version Badge ────────────────────────────────────────── */}
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

            {/* ── Study Tools Button ────────────────────────────────────── */}
            {onStudyToolsPress && (
              <TouchableOpacity
                onPress={onStudyToolsPress}
                activeOpacity={0.8}
                onPressIn={() => animatePress(studyToolsScale, 0.9)}
                onPressOut={() => animatePress(studyToolsScale, 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Animated.View
                  style={[
                    localStyles.iconButton,
                    { transform: [{ scale: studyToolsScale }] },
                  ]}
                >
                  <View style={localStyles.iconButtonInner}>
                    <ScrollText color={COLORS.white} size={22} strokeWidth={2.2} />
                  </View>
                </Animated.View>
              </TouchableOpacity>
            )}

            {/* ── Search Button ────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={onSearchPress}
              activeOpacity={0.8}
              onPressIn={() => animatePress(searchScale, 0.9)}
              onPressOut={() => animatePress(searchScale, 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View
                style={[
                  localStyles.iconButton,
                  { transform: [{ scale: searchScale }] },
                ]}
              >
                <View style={localStyles.iconButtonInner}>
                  <Search color={COLORS.white} size={22} strokeWidth={2.2} />
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Bottom separator with subtle shadow */}
        <View style={localStyles.bottomBorder} />
      </LinearGradient>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Styles
// ─────────────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  // Gradient fills screen width, height wraps content
  gradient: {
    width: '100%',
    position: 'relative',
  },

  // Subtle inner glow for depth
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    pointerEvents: 'none',
  },

  safeArea: {
    width: '100%',
  },

  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    position: 'relative',
  },
  containerRtl: {
    flexDirection: 'row-reverse',
  },

  // ── Icon Buttons ──────────────────────────────────────────────────────
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Title Section ─────────────────────────────────────────────────────
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  bookTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
    maxWidth: 140,
  },
  chapterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  chapterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  chevron: {
    marginLeft: 2,
    opacity: 0.9,
  },

  // ── Version Badge ─────────────────────────────────────────────────────
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  versionBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ── Bottom Border ─────────────────────────────────────────────────────
  bottomBorder: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
});
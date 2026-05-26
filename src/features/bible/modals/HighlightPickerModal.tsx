import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { HighlightPickerModalProps } from '../types';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import {
  getColors,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from '../../../constants/theme';
import { HIGHLIGHT_COLORS } from '../../../utilits/HIGHLIGHT_COLORS';
import VerseRangeSlider from './VerseRangeSlider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Color groups with section labels ───────────────────────────────────────
function getColorGroups(bc: any) {
  return [
    {
      label: bc?.warm || 'Warm',
      ids: [1, 3, 4, 13, 14, 15], // Red, Yellow, Orange, Pink, Rose, Amber
    },
    {
      label: bc?.cool || 'Cool',
      ids: [2, 7, 8, 9, 10], // Blue, Cyan, Teal, Sky, Indigo
    },
    {
      label: bc?.nature || 'Nature',
      ids: [5, 6, 11, 12], // Green, Purple, Lime, Mint
    },
  ];
}

// ─── Animated swatch ────────────────────────────────────────────────────────
function SwatchButton({
  item,
  isSelected,
  onPress,
  styles,
}: {
  item: (typeof HIGHLIGHT_COLORS)[0];
  isSelected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof buildStyles>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.swatchWrapper}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={[
            styles.swatch,
            { backgroundColor: item.color },
            isSelected && styles.swatchSelected,
          ]}
        >
          {isSelected && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.swatchLabel}>{item.name}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function HighlightPickerModal({
  visible,
  onClose,
  onSelectColor,
  isDark,
  activeColorId,
  selectedVerses = [],
  totalVerses = 1,
  onRangeChange,
}: Omit<HighlightPickerModalProps, 'onSelectColor'> & {
  onSelectColor: (
    colorId: number,
    color: string,
    rangeStart?: number,
    rangeEnd?: number,
  ) => void;
  activeColorId?: number;
  selectedVerses?: number[];
  totalVerses?: number;
  onRangeChange?: (start: number, end: number) => void;
}) {
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const COLORS = getColors(isDark);
  const styles = useMemo(() => buildStyles(isDark, COLORS), [isDark]);
  const COLOR_GROUPS = useMemo(() => getColorGroups(bc), [bc]);

  // Local range state — seeded from selectedVerses when modal opens
  const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
  const initialStart = sortedVerses[0] ?? 1;
  const initialEnd = sortedVerses[sortedVerses.length - 1] ?? 1;

  const [rangeStart, setRangeStart] = useState(initialStart);
  const [rangeEnd, setRangeEnd] = useState(initialEnd);

  // Reset range whenever modal becomes visible with new selection
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    prevVisible.current = true;
    if (rangeStart !== initialStart || rangeEnd !== initialEnd) {
      setRangeStart(initialStart);
      setRangeEnd(initialEnd);
    }
  }
  if (!visible && prevVisible.current) {
    prevVisible.current = false;
  }

  const handleRangeChange = (start: number, end: number) => {
    setRangeStart(start);
    setRangeEnd(end);
    onRangeChange?.(start, end);
  };

  // Chosen accent — mirrors the actively-selected highlight colour
  const accentColor =
    activeColorId != null
      ? HIGHLIGHT_COLORS.find(c => c.id === activeColorId)?.color
      : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Scrim */}
      <TouchableOpacity
        style={styles.scrim}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{bc?.highlightTitle || 'Highlight'}</Text>
            <Text style={styles.subtitle}>
              {bc?.chooseColor || 'Choose a color to mark this verse'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Verse range slider */}
        {totalVerses > 1 && (
          <VerseRangeSlider
            totalVerses={totalVerses}
            startVerse={rangeStart}
            endVerse={rangeEnd}
            onRangeChange={handleRangeChange}
            isDark={isDark}
            accentColor={accentColor}
          />
        )}

        {/* Color groups */}
        <View style={styles.groupsContainer}>
          {COLOR_GROUPS.map(group => {
            const items = group.ids
              .map(id => HIGHLIGHT_COLORS.find(c => c.id === id))
              .filter(Boolean) as typeof HIGHLIGHT_COLORS;

            return (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={styles.swatchRow}>
                  {items.map(item => (
                    <SwatchButton
                      key={item.id}
                      item={item}
                      isSelected={activeColorId === item.id}
                      onPress={() =>
                        onSelectColor(item.id, item.color, rangeStart, rangeEnd)
                      }
                      styles={styles}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Remove row */}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onSelectColor(0, '', rangeStart, rangeEnd)}
          activeOpacity={0.65}
        >
          <View style={styles.removeIconRing}>
            <Text style={styles.removeIconText}>⊘</Text>
          </View>
          <Text style={styles.removeText}>{bc?.removeHighlightLabel || 'Remove highlight'}</Text>
          <Text style={styles.removeChevron}>›</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Styles factory ──────────────────────────────────────────────────────────
const SWATCH_COLS = 6;
const H_PAD = SPACING.xl;
const GAP = 10;
const SWATCH_SIZE = Math.floor(
  (SCREEN_WIDTH - H_PAD * 2 - GAP * (SWATCH_COLS - 1)) / SWATCH_COLS,
);

function buildStyles(isDark: boolean, COLORS: ReturnType<typeof getColors>) {
  const surface2 = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)',
    },
    sheet: {
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: H_PAD,
      paddingTop: SPACING.sm,
      paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
      // Deep shadow for lifted feel
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: isDark ? 0.5 : 0.12,
      shadowRadius: 24,
      elevation: 32,
    },

    // Handle
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginBottom: SPACING.lg,
    },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.lg,
    },
    title: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '800',
      color: COLORS.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.muted,
      marginTop: 2,
      fontWeight: '500',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: 13,
      color: COLORS.muted,
      fontWeight: '700',
    },

    divider: {
      height: 1,
      backgroundColor: COLORS.border,
      marginVertical: SPACING.md,
      opacity: 0.6,
    },

    // Color groups
    groupsContainer: {
      gap: SPACING.md,
    },
    group: {
      gap: SPACING.sm,
    },
    groupLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.muted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    swatchRow: {
      flexDirection: 'row',
      gap: GAP,
    },

    // Swatch
    swatchWrapper: {
      alignItems: 'center',
      gap: 5,
    },
    swatch: {
      width: SWATCH_SIZE,
      height: SWATCH_SIZE,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      // Subtle inner shadow effect via border
      borderWidth: 1.5,
      borderColor: 'rgba(0,0,0,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 4,
    },
    swatchSelected: {
      borderWidth: 2.5,
      borderColor: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
    checkCircle: {
      width: SWATCH_SIZE * 0.45,
      height: SWATCH_SIZE * 0.45,
      borderRadius: SWATCH_SIZE * 0.25,
      backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkMark: {
      fontSize: SWATCH_SIZE * 0.25,
      color: '#fff',
      fontWeight: '800',
    },
    swatchLabel: {
      fontSize: 9,
      color: COLORS.muted,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 0.2,
    },

    // Remove
    removeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    removeIconRing: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: surface2,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeIconText: {
      fontSize: 18,
      color: COLORS.muted,
      lineHeight: 22,
    },
    removeText: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: COLORS.text,
    },
    removeChevron: {
      fontSize: 22,
      color: COLORS.muted,
      fontWeight: '300',
    },
  });
}

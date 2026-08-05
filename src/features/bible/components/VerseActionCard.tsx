import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Lightbulb,
  Hash,
  Square,
  BookText,
  PenLine,
} from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';

interface VerseActionCardProps {
  colors: any;
  isRtl?: boolean;
  /** True while the verse explanation is being fetched (spinner on Explain). */
  isExplaining?: boolean;
  /**
   * Horizontal offset (px within the card) where the upward pointer should
   * sit. When provided, the pointer follows that position so it aligns with
   * where the user tapped on long multi-line verses. Falls back to centered
   * when omitted.
   */
  pointerOffset?: number | null;
  onExplain?: () => void;
  onStrongs?: () => void;
  onBackground?: () => void;
  onStudyTools?: () => void;
  onJournal?: () => void;
}

/**
 * Contextual action card shown directly beneath a selected verse, matching the
 * verse-selection design: a white rounded card with an upward pointer and a
 * horizontal row of five actions — Explain Verse, Strong's Concordance,
 * Background, Study Tools and Journal.
 */
const POINTER_SIZE = 12;
const POINTER_EDGE_GUARD = 10; // keep the rotated square inside the rounded card

export default function VerseActionCard({
  colors,
  isRtl,
  isExplaining,
  pointerOffset,
  onExplain,
  onStrongs,
  onBackground,
  onStudyTools,
  onJournal,
}: VerseActionCardProps) {
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const [wrapWidth, setWrapWidth] = useState(0);

  const items: {
    key: string;
    icon: typeof Lightbulb;
    label: string;
    onPress?: () => void;
    loading?: boolean;
  }[] = [
    {
      key: 'explain',
      icon: Lightbulb,
      label: bc?.explainVerse || 'Explain Verse',
      onPress: onExplain,
      loading: isExplaining,
    },
    {
      key: 'strongs',
      icon: Hash,
      label: bc?.strongsConcordance || "Strong's",
      onPress: onStrongs,
    },
    {
      key: 'background',
      icon: Square,
      label: bc?.background || 'Background',
      onPress: onBackground,
    },
    {
      key: 'studyTools',
      icon: BookText,
      label: bc?.studyTools || 'Study Tools',
      onPress: onStudyTools,
    },
    {
      key: 'journal',
      icon: PenLine,
      label: bc?.journal || 'Journal',
      onPress: onJournal,
    },
  ];

  const enabled = items.filter(i => i.onPress);
  if (enabled.length === 0) return null;

  // Pointer x: follow the tap offset when we know the card width, else center.
  const pointerLeft =
    pointerOffset != null && wrapWidth > 0
      ? Math.min(
          Math.max(pointerOffset - POINTER_SIZE / 2, POINTER_EDGE_GUARD),
          wrapWidth - POINTER_SIZE / 2 - POINTER_EDGE_GUARD,
        )
      : undefined;

  return (
    <View style={s.wrap} onLayout={e => setWrapWidth(e.nativeEvent.layout.width)}>
      {/* Upward pointer toward the selected verse */}
      <View
        pointerEvents="none"
        style={[
          s.pointer,
          pointerLeft == null && s.pointerCentered,
          pointerLeft != null && { left: pointerLeft },
          { backgroundColor: colors.surface },
        ]}
      />
      <View
        style={[
          s.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
        ]}
      >
        <View style={[s.row, isRtl && s.rowRtl]}>
          {items.map(item => {
            const Icon = item.icon;
            const disabled = !item.onPress;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                disabled={disabled}
                activeOpacity={0.7}
                style={[s.item, disabled && s.itemDisabled]}
              >
                <View
                  style={[
                    s.iconCircle,
                    { backgroundColor: `${colors.primary}12` },
                  ]}
                >
                  {item.loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Icon
                      size={17}
                      color={colors.primary}
                      strokeWidth={2.1}
                    />
                  )}
                </View>
                <Text
                  style={[s.label, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: SPACING.md,
    position: 'relative',
  },
  pointer: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  pointerCentered: {
    alignSelf: 'center',
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
    letterSpacing: -0.1,
  },
});

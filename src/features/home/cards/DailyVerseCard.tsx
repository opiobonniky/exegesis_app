import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  reference: string;
  text?: string;
  label?: string;
  readLabel?: string;
  onPress: () => void;
};

export default function DailyVerseCard({
  design,
  isRtl,
  reference,
  text,
  label,
  readLabel,
  onPress,
}: Props) {
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: design.cardBg, borderColor: design.cardBorder },
      ]}
    >
      <View style={[styles.headerRow, isRtl && styles.headerRowRtl]}>
        <View style={[styles.headerIcon, { backgroundColor: design.accent + '1A' }]}>
          <Star size={15} color={design.accent} strokeWidth={2} />
        </View>
        <Text style={[styles.label, { color: design.title }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <Text style={[styles.reference, { color: design.lightBlue }]} numberOfLines={1}>
        {reference}
      </Text>

      {!!text && (
        <View style={[styles.quoteWrap, isRtl && styles.quoteWrapRtl]}>
          <View style={[styles.quoteBar, { backgroundColor: design.accent }]} />
          <Text
            style={[styles.verseText, { color: design.body }]}
            numberOfLines={4}
          >
            {'\u201C'}
            {text}
            {'\u201D'}
          </Text>
        </View>
      )}

      <View style={[styles.actionRow, isRtl && styles.actionRowRtl]}>
        <Text style={[styles.readLink, { color: design.accent }]}>
          {readLabel}
        </Text>
        <Arrow size={14} color={design.accent} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  reference: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  quoteWrap: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  quoteWrapRtl: {
    flexDirection: 'row-reverse',
  },
  quoteBar: {
    width: 3,
    borderRadius: 2,
  },
  verseText: {
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.md,
  },
  actionRowRtl: {
    flexDirection: 'row-reverse',
  },
  readLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});

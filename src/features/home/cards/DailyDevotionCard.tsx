import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BookOpen, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  /** Light-blue subtitle under the header label (e.g. the devotion title) */
  subtitle: string;
  content?: string;
  label?: string;
  readLabel?: string;
  onPress: () => void;
};

export default function DailyDevotionCard({
  design,
  isRtl,
  subtitle,
  content,
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
        <View style={[styles.headerIcon, { backgroundColor: design.blue + '1A' }]}>
          <BookOpen size={15} color={design.blue} strokeWidth={2} />
        </View>
        <Text style={[styles.label, { color: design.title }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: design.lightBlue }]} numberOfLines={1}>
        {subtitle}
      </Text>

      {!!content && (
        <Text
          style={[styles.content, { color: design.muted }]}
          numberOfLines={4}
        >
          {content}
        </Text>
      )}

      <View style={[styles.actionRow, isRtl && styles.actionRowRtl]}>
        <Text style={[styles.readLink, { color: design.lightBlue }]}>
          {readLabel}
        </Text>
        <Arrow size={14} color={design.lightBlue} />
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
  subtitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  content: {
    fontSize: 13,
    lineHeight: 20,
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

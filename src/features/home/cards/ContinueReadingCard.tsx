import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BookOpen, Play } from 'lucide-react-native';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  bookName: string;
  chapter: number;
  progressPercent: number; // 0..100
  label?: string;
  progressLabel?: string;
  continueLabel?: string;
  onPress: () => void;
};

export default function ContinueReadingCard({
  design,
  isRtl,
  bookName,
  chapter,
  progressPercent,
  label,
  progressLabel,
  continueLabel,
  onPress,
}: Props) {
  const clamped = Math.min(100, Math.max(0, progressPercent));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: design.cardBg, borderColor: design.cardBorder },
      ]}
    >
      <View style={[styles.topRow, isRtl && styles.topRowRtl]}>
        <View style={[styles.iconWrap, { backgroundColor: design.blue + '1A' }]}>
          <BookOpen size={18} color={design.blue} strokeWidth={2} />
        </View>
        <View style={[styles.titleWrap, isRtl && styles.titleWrapRtl]}>
          <Text style={[styles.label, { color: design.title }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.position, { color: design.lightBlue }]} numberOfLines={1}>
            {bookName} {chapter}
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: design.cardBorder }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${clamped}%`, backgroundColor: design.blue },
          ]}
        />
      </View>

      <View style={[styles.bottomRow, isRtl && styles.bottomRowRtl]}>
        <Text style={[styles.progressText, { color: design.lightBlue }]}>
          {progressLabel} {Math.round(clamped)}%
        </Text>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={[styles.continueBtn, { backgroundColor: design.pillBg }]}
        >
          <Play size={13} color={design.pillText} fill={design.pillText} />
          <Text style={[styles.continueText, { color: design.pillText }]}>
            {continueLabel}
          </Text>
        </TouchableOpacity>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  topRowRtl: {
    flexDirection: 'row-reverse',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  titleWrapRtl: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  position: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  bottomRowRtl: {
    flexDirection: 'row-reverse',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  continueText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

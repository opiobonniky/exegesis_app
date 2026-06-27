import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

interface Props {
  correct: number;
  total: number;
  isRtl: boolean;
  isDark?: boolean;
}

export default function TriviaScoreBoard({ correct, total, isRtl, isDark = false }: Props) {
  const COLORS = useMemo(() => getColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <View style={[styles.container, isRtl && { flexDirection: 'row-reverse' }]}>
      <Trophy size={18} color={COLORS.accent} />
      <View style={[styles.scoreInfo, isRtl && { alignItems: 'flex-end' }]}>
        <Text style={styles.scoreText}>
          {correct}/{total}
        </Text>
      </View>
      <View style={[styles.percentageBadge, {
        backgroundColor:
          percentage >= 80 ? `${COLORS.success}18` :
          percentage >= 50 ? `${COLORS.info}18` :
          `${COLORS.error}18`,
      }]}>
        <Text style={[styles.percentageText, {
          color:
            percentage >= 80 ? COLORS.success :
            percentage >= 50 ? COLORS.info :
            COLORS.error,
        }]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.round,
    gap: SPACING.sm,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  percentageBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  percentageText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
});

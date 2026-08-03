import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

export type StatItem = {
  value: number;
  label: string;
  icon: any;
  color: string;
};

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  stats: StatItem[];
  title?: string;
};

export default function StatsRow({ design, isRtl, stats, title }: Props) {
  return (
    <View style={[styles.section, isRtl && styles.sectionRtl]}>
      {!!title && (
        <Text style={[styles.title, { color: design.title }]}>{title}</Text>
      )}
      <View style={[styles.row, isRtl && styles.rowRtl]}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <View
              key={`stat-${i}`}
              style={[
                styles.statCard,
                {
                  backgroundColor: design.cardBg,
                  borderColor: design.cardBorder,
                },
              ]}
            >
              <View
                style={[styles.statIcon, { backgroundColor: s.color + '1F' }]}
              >
                <Icon size={16} color={s.color} strokeWidth={2.2} />
              </View>
              <Text style={[styles.value, { color: design.title }]}>
                {s.value}
              </Text>
              <Text
                style={[styles.label, { color: design.muted }]}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionRtl: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  statCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

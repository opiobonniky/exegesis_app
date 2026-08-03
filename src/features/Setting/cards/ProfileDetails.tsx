import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING } from '../../../constants/theme';
import { HomeDesign } from '../../home/homeStyle';

export type DetailItem = {
  icon: any;
  text: string;
};

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  /** Each line is a horizontal group of { icon, text } items separated by a bullet */
  lines: DetailItem[][];
};

export default function ProfileDetails({ design, isRtl, lines }: Props) {
  // Drop empty items within a line so bare icons / orphaned bullets never render.
  const visibleLines = lines
    .map(line => line.filter(item => item.text))
    .filter(line => line.length > 0);

  if (visibleLines.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: design.cardBg, borderColor: design.cardBorder },
      ]}
    >
      {visibleLines.map((line, lineIdx) => (
        <View
          key={`line-${lineIdx}`}
          style={[
            styles.line,
            isRtl && styles.lineRtl,
            lineIdx < visibleLines.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: design.cardBorder,
            },
          ]}
        >
          {line.map((item, itemIdx) => {
            const Icon = item.icon;
            return (
              <View
                key={itemIdx}
                style={[
                  styles.item,
                  isRtl && styles.itemRtl,
                  itemIdx > 0 && { marginStart: SPACING.xs },
                ]}
              >
                {itemIdx > 0 && (
                  <Text style={[styles.bullet, { color: design.muted }]}>•</Text>
                )}
                <Icon size={14} color={design.muted} strokeWidth={2.2} />
                <Text style={[styles.itemText, { color: design.muted }]}>
                  {item.text}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  lineRtl: {
    flexDirection: 'row-reverse',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemRtl: {
    flexDirection: 'row-reverse',
  },
  bullet: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  itemText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

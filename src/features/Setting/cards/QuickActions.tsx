import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { HomeDesign } from '../../home/homeStyle';

export type QuickActionItem = {
  id: string;
  label: string;
  icon: any;
  onPress: () => void;
};

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  items: QuickActionItem[];
  title?: string;
};

export default function QuickActions({ design, isRtl, items, title }: Props) {
  return (
    <View style={styles.section}>
      {!!title && (
        <Text style={[styles.title, { color: design.title }]}>{title}</Text>
      )}
      <View style={[styles.grid, isRtl && styles.gridRtl]}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={item.onPress}
              activeOpacity={0.85}
              style={[styles.btn, { backgroundColor: design.pillBg }]}
            >
              <Icon size={18} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  gridRtl: {
    flexDirection: 'row-reverse',
  },
  btn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});

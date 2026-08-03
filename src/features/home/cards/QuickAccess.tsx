import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

type QuickAccessItem = {
  id: string;
  label: string;
  icon: any;
  color: string;
  onPress: () => void;
};

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  items: QuickAccessItem[];
  title?: string;
};

export default function QuickAccess({ design, isRtl, items, title }: Props) {
  return (
    <View style={[styles.section, isRtl && styles.sectionRtl]}>
      {!!title && (
        <Text style={[styles.title, { color: design.title }]}>{title}</Text>
      )}
      <View style={[styles.grid, isRtl && styles.gridRtl]}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={item.onPress}
              style={[
                styles.item,
                {
                  backgroundColor: design.cardBg,
                  borderColor: design.cardBorder,
                },
              ]}
            >
              <View
                style={[styles.iconWrap, { backgroundColor: item.color + '1F' }]}
              >
                <Icon size={18} color={item.color} strokeWidth={2.2} />
              </View>
              <Text style={[styles.label, { color: design.title }]} numberOfLines={1}>
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
  sectionRtl: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  gridRtl: {
    flexDirection: 'row-reverse',
  },
  item: {
    width: '31%',
    flexGrow: 1,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { HomeDesign } from '../../home/homeStyle';

export type ContentItem = {
  id: string;
  label: string;
  icon: any;
  onPress: () => void;
};

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  items: ContentItem[];
  title?: string;
};

export default function ContentList({ design, isRtl, items, title }: Props) {
  const Arrow = isRtl ? ChevronLeft : ChevronRight;

  return (
    <View style={styles.section}>
      {!!title && (
        <Text style={[styles.title, { color: design.title }]}>{title}</Text>
      )}
      <View style={styles.list}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={item.onPress}
              activeOpacity={0.85}
              style={[
                styles.item,
                isRtl && styles.itemRtl,
                { backgroundColor: design.pillBg },
              ]}
            >
              <Icon size={17} color="#FFFFFF" strokeWidth={2} />
              <Text
                style={[styles.itemLabel, isRtl && styles.itemLabelRtl]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Arrow size={16} color="rgba(255,255,255,0.85)" />
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
  list: {
    gap: SPACING.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
  },
  itemRtl: {
    flexDirection: 'row-reverse',
  },
  itemLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemLabelRtl: {
    textAlign: 'right',
  },
});

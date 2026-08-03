import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { HomeDesign } from '../../home/homeStyle';

export type MenuItem = {
  id: string;
  label: string;
  icon: any;
  onPress: () => void;
};

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  items: MenuItem[];
  title?: string;
};

export default function MenuList({ design, isRtl, items, title }: Props) {
  const Arrow = isRtl ? ChevronLeft : ChevronRight;

  return (
    <View style={[styles.section, isRtl && styles.sectionRtl]}>
      {!!title && (
        <Text style={[styles.title, { color: design.title }]}>{title}</Text>
      )}
      <View
        style={[
          styles.card,
          { backgroundColor: design.cardBg, borderColor: design.cardBorder },
        ]}
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isLast = idx === items.length - 1;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={item.onPress}
              activeOpacity={0.7}
              style={[
                styles.row,
                isRtl && styles.rowRtl,
                !isLast && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: design.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.iconChip,
                  { backgroundColor: design.lightBlue + '1F' },
                ]}
              >
                <Icon size={18} color={design.lightBlue} strokeWidth={2.2} />
              </View>
              <Text style={[styles.label, { color: design.title }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Arrow size={18} color={design.muted} />
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
    marginBottom: SPACING.xl,
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
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 15,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});

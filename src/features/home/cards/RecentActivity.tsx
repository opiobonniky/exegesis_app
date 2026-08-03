import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Clock,
  Star,
  MenuSquareIcon,
  Heart,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

export type ActivityItem = {
  type: 'read' | 'highlight' | 'note' | 'favorite' | 'plan';
  id?: number;
  book: string;
  chapter: number;
  verse: number;
  time: string;
};

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  items: ActivityItem[];
  title: string;
  seeAllLabel: string;
  emptyMessage: string;
  labels: {
    read: string;
    highlight: string;
    note: string;
    plan: string;
    favorite: string;
  };
  onSeeAll: () => void;
  onPressItem: (item: ActivityItem) => void;
};

const ICONS: Record<ActivityItem['type'], any> = {
  read: Clock,
  highlight: Star,
  note: MenuSquareIcon,
  plan: CheckCircle,
  favorite: Heart,
};

export default function RecentActivity({
  design,
  isRtl,
  items,
  title,
  seeAllLabel,
  emptyMessage,
  labels,
  onSeeAll,
  onPressItem,
}: Props) {
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const iconColors: Record<ActivityItem['type'], string> = {
    read: design.blue,
    highlight: design.accent,
    note: design.green,
    plan: design.purple,
    favorite: '#EC4899',
  };

  return (
    <View style={[styles.section, isRtl && styles.sectionRtl]}>
      <View style={[styles.headerRow, isRtl && styles.headerRowRtl]}>
        <Text style={[styles.title, { color: design.title }]}>{title}</Text>
        {items.length > 0 && (
          <TouchableOpacity
            onPress={onSeeAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.seeAll, { color: design.lightBlue }]}>
              {seeAllLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: design.cardBg,
              borderColor: design.cardBorder,
            },
          ]}
        >
          <Text style={[styles.emptyText, { color: design.muted }]}>
            {emptyMessage}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((act, idx) => {
            const Icon = ICONS[act.type] ?? Clock;
            const color = iconColors[act.type] ?? design.muted;
            const label = labels[act.type] || act.type;
            return (
              <TouchableOpacity
                key={act.id != null ? `${act.id}-${idx}` : idx}
                onPress={() => onPressItem(act)}
                activeOpacity={0.8}
                style={[
                  styles.activityCard,
                  isRtl && styles.activityCardRtl,
                  {
                    backgroundColor: design.cardBg,
                    borderColor: design.cardBorder,
                  },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                  <Icon size={18} color={color} />
                </View>
                <View style={styles.activityContent}>
                  <View style={[styles.activityTop, isRtl && styles.activityTopRtl]}>
                    <Text style={[styles.activityLabel, { color }]}>{label}</Text>
                    <Text style={[styles.activityTime, { color: design.muted }]}>
                      {act.time}
                    </Text>
                  </View>
                  <Text style={[styles.activityVerse, { color: design.title }]}>
                    {act.book} {act.chapter}:{act.verse}
                  </Text>
                </View>
                <Arrow size={16} color={design.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    width: '100%',
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    gap: SPACING.sm,
    width: '100%',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  activityCardRtl: {
    flexDirection: 'row-reverse',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityTopRtl: {
    flexDirection: 'row-reverse',
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityTime: {
    fontSize: 11,
  },
  activityVerse: {
    fontSize: 14,
    fontWeight: '500',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { BadgeCheck, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { HomeDesign } from '../../home/homeStyle';

const DEMO_AVATAR_URL = 'https://i.pravatar.cc/150?img=12';

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  name: string;
  photoUrl?: string | null;
  viewProfileLabel?: string;
  onViewProfile: () => void;
};

export default function ProfileCard({
  design,
  isRtl,
  name,
  photoUrl,
  viewProfileLabel,
  onViewProfile,
}: Props) {
  const Arrow = isRtl ? ChevronLeft : ChevronRight;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: design.cardBg, borderColor: design.cardBorder },
      ]}
    >
      <View style={[styles.row, isRtl && styles.rowRtl]}>
        <Image
          source={{ uri: photoUrl || DEMO_AVATAR_URL }}
          style={[
            styles.avatar,
            { borderColor: isRtl ? design.lightBlue : design.lightBlue },
          ]}
        />

        <View style={[styles.info, isRtl && styles.infoRtl]}>
          <View style={[styles.nameRow, isRtl && styles.nameRowRtl]}>
            <Text style={[styles.name, { color: design.title }]} numberOfLines={1}>
              {name}
            </Text>
            <BadgeCheck
              size={16}
              color={design.lightBlue}
              fill={design.lightBlue + '30'}
            />
          </View>

          <TouchableOpacity
            onPress={onViewProfile}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.viewRow, isRtl && styles.viewRowRtl]}
          >
            <Text style={[styles.viewText, { color: design.lightBlue }]}>
              {viewProfileLabel || 'View profile'}
            </Text>
            <Arrow size={14} color={design.lightBlue} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
  },
  info: {
    flex: 1,
  },
  infoRtl: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameRowRtl: {
    flexDirection: 'row-reverse',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
  },
  viewRowRtl: {
    flexDirection: 'row-reverse',
  },
  viewText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

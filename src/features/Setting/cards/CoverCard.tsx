import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { BadgeCheck, Camera } from 'lucide-react-native';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { HomeDesign } from '../../home/homeStyle';

const DEMO_AVATAR_URL = 'https://i.pravatar.cc/300?img=12';
// Demo cover used until real cover uploads exist (design: outdoor baptism scene)
const DEMO_COVER_URL =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80';

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  name: string;
  username?: string;
  bio?: string;
  photoUrl?: string | null;
  coverUrl?: string | null;
  editCoverLabel?: string;
  onEditCover?: () => void;
};

export default function CoverCard({
  design,
  isRtl,
  name,
  username,
  bio,
  photoUrl,
  coverUrl,
  editCoverLabel,
  onEditCover,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: design.cardBg, borderColor: design.cardBorder },
      ]}
    >
      {/* ── Cover photo ── */}
      <View style={styles.coverWrap}>
        <Image
          source={{ uri: coverUrl || DEMO_COVER_URL }}
          style={styles.cover}
          resizeMode="cover"
        />
        <TouchableOpacity
          onPress={onEditCover}
          activeOpacity={0.8}
          style={styles.editCoverBtn}
        >
          <Camera size={13} color="#FFFFFF" />
          <Text style={styles.editCoverText}>
            {editCoverLabel || 'Edit Cover'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Avatar (overlaps cover) ── */}
      <View style={[styles.avatarRow, isRtl && styles.avatarRowRtl]}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: photoUrl || DEMO_AVATAR_URL }}
            style={styles.avatar}
          />
          <View style={styles.cameraBadge}>
            <Camera size={11} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* ── Name / handle / bio ── */}
      <View style={[styles.info, isRtl && styles.infoRtl]}>
        <View style={[styles.nameRow, isRtl && styles.nameRowRtl]}>
          <Text style={[styles.name, { color: design.title }]} numberOfLines={1}>
            {name}
          </Text>
          <BadgeCheck
            size={18}
            color={design.lightBlue}
            fill={design.lightBlue + '30'}
          />
        </View>
        {!!username && (
          <Text style={[styles.handle, { color: design.muted }]} numberOfLines={1}>
            @{username}
          </Text>
        )}
        {!!bio && (
          <Text style={[styles.bio, { color: design.body }]}>{bio}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverWrap: {
    height: 190,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  editCoverBtn: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10,17,40,0.75)',
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  editCoverText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarRow: {
    marginTop: -44,
    paddingHorizontal: SPACING.lg,
  },
  avatarRowRtl: {
    alignItems: 'flex-start',
  },
  avatarWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  handle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});

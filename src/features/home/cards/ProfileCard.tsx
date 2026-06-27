import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { ChevronRight, ChevronLeft, User } from 'lucide-react-native';
import { AppContext } from '../../../common/AppContext';
import { getColors } from '../../../constants/theme';
import { useLanguage, isRtlLanguage } from '../../../component/language-translation/LanguageProvider';

type Props = {
  greeting: string;
  userName: string;
  profilePhotoUrl?: string | null;
  onProfilePress: () => void;
};

export default function ProfileCard({ greeting, userName, profilePhotoUrl, onProfilePress }: Props) {
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  const { language } = useLanguage();
  const isRtl = isRtlLanguage(language);

  return (
    <TouchableOpacity
      onPress={onProfilePress}
      activeOpacity={0.8}
      style={[
        styles.card,
        isRtl && styles.cardRtl,
        { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border },
      ]}
    >
      <View style={styles.picWrap}>
        {profilePhotoUrl ? (
          <Image source={{ uri: profilePhotoUrl }} style={styles.picImage} />
        ) : (
          <View style={[styles.picPlaceholder, { backgroundColor: COLORS.primary + '20' }]}>
            <User size={26} color={COLORS.primary} />
          </View>
        )}
      </View>

      <View style={[styles.infoWrap, isRtl && styles.infoWrapRtl]}>
        <Text style={[styles.greeting, { color: COLORS.muted }]} numberOfLines={1}>
          {greeting}
        </Text>
        <Text style={[styles.name, { color: COLORS.text }]} numberOfLines={1}>
          {userName}
        </Text>
      </View>

      <View style={[styles.arrow, { backgroundColor: COLORS.surface }]}>
        {isRtl ? (
          <ChevronLeft size={18} color={COLORS.muted} strokeWidth={2} />
        ) : (
          <ChevronRight size={18} color={COLORS.muted} strokeWidth={2} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  cardRtl: {
    flexDirection: 'row-reverse',
  },
  picWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  picImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  picPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoWrap: {
    flex: 1,
  },
  infoWrapRtl: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

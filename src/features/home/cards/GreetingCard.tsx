import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { BORDER_RADIUS, SPACING } from '../../../constants/theme';
import { HomeDesign } from '../homeStyle';

type Props = {
  design: HomeDesign;
  isRtl: boolean;
  greeting: string;
  userName: string;
  encouragement?: string;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onProfilePress: () => void;
};

export default function GreetingCard({
  design,
  isRtl,
  greeting,
  userName,
  encouragement,
  isDarkMode,
  onThemeToggle,
  onProfilePress,
}: Props) {

  
  return (
    <TouchableOpacity
      onPress={onProfilePress}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: design.cardBg, borderColor: design.cardBorder },
      ]}
    >
      <View style={[styles.topRow, isRtl && styles.topRowRtl]}>
        <TouchableOpacity
          onPress={onThemeToggle}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.themeBtn, { backgroundColor: design.accent + '1A' }]}
        >
          {isDarkMode ? (
            <Sun size={17} color={design.accent} strokeWidth={2.2} />
          ) : (
            <Moon size={17} color={design.accent} strokeWidth={2.2} />
          )}
        </TouchableOpacity>

        <View style={styles.infoWrap}>
          <Text style={styles.greetingLine}>
            <Text style={{ color: design.title }}>{greeting} </Text>
            <Text style={[styles.nameText, { color: design.lightBlue }]}>
              {userName}
            </Text>
          </Text>
        </View>
      </View>

      {!!encouragement && (
        <Text style={[styles.message, { color: design.muted }]}>
          {encouragement}
        </Text>
      )}
    </TouchableOpacity>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  topRowRtl: {
    flexDirection: 'row-reverse',
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrap: {
    flex: 1,
  },
  greetingLine: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '500',
  },
  message: {
    // Align under the greeting text (36px icon + 8px gap), not the card edge
    marginStart: 44,
    fontSize: 13,
    lineHeight: 19,
  },
});

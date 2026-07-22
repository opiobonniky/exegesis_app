import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../../constants/theme';

export function LoadingSkeleton({ colors, isRtl }: { colors: any; isRtl: boolean }) {
  return (
    <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }}>
      <View
        style={[
          loadingStyles.heroCard,
          { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor },
        ]}
      >
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md }}>
          <View style={[loadingStyles.pill, { backgroundColor: `${colors.border}` }]} />
          <View style={[loadingStyles.pill, { backgroundColor: `${colors.border}`, width: 80 }]} />
        </View>
        <View style={[loadingStyles.titleBar, { backgroundColor: `${colors.border}` }]} />
        <View style={[loadingStyles.textBar, { backgroundColor: `${colors.border}`, width: '90%', marginTop: 10 }]} />
        <View style={[loadingStyles.textBar, { backgroundColor: `${colors.border}`, width: '65%', marginTop: 6 }]} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[loadingStyles.tabPill, { backgroundColor: `${colors.border}`, width: 80 + i * 6 }]} />
        ))}
      </View>

      {[1, 2].map((i) => (
        <View
          key={i}
          style={[
            loadingStyles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[loadingStyles.avatar, { backgroundColor: `${colors.border}` }]} />
            <View style={{ flex: 1 }}>
              <View style={[loadingStyles.textBar, { backgroundColor: `${colors.border}`, width: '45%' }]} />
              <View style={[loadingStyles.textBar, { backgroundColor: `${colors.border}`, width: '30%', marginTop: 4 }]} />
            </View>
          </View>
          <View style={[loadingStyles.divider, { backgroundColor: colors.border }]} />
          <View style={[loadingStyles.textBar, { backgroundColor: `${colors.border}`, width: '100%' }]} />
          <View style={[loadingStyles.textBar, { backgroundColor: `${colors.border}`, width: '85%', marginTop: 4 }]} />
          <View style={[loadingStyles.textBar, { backgroundColor: `${colors.border}`, width: '60%', marginTop: 4 }]} />
        </View>
      ))}
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  heroCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pill: { height: 24, width: 70, borderRadius: 12 },
  titleBar: { height: 28, width: '70%', borderRadius: 6 },
  textBar: { height: 14, borderRadius: 4 },
  tabPill: { height: 32, borderRadius: 16 },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  divider: { height: 1, marginVertical: 8 },
});

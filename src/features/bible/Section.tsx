import React, { useContext, useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppContext } from '../../common/AppContext';
import {
  getColors,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
} from '../../constants/theme';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export default function Section({ title, children, right }: SectionProps) {
  const app = useContext(AppContext);
  if (!app) return null;

  const COLORS = useMemo(() => getColors(app.isDark), [app.isDark]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: COLORS.surface,
          borderColor: COLORS.border,
          shadowColor: COLORS.shadowColor ?? '#000',
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <Text
          style={[styles.title, { color: COLORS.primary }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    // iOS shadow
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    // Android shadow
    elevation: 2,
  },
  header: {
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  right: {
    marginLeft: SPACING.md,
  },
  content: {
    gap: SPACING.sm,
  },
});

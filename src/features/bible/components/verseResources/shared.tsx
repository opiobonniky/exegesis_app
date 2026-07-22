import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';

// ── ResourceCard ──────────────────────────────────────────────────────────

export function ResourceCard({
  children,
  colors,
  accentColor,
  style,
}: {
  children: React.ReactNode;
  colors: any;
  accentColor?: string;
  style?: any;
}) {
  return (
    <View
      style={[
        cardStyles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
        },
        accentColor ? { borderTopColor: accentColor, borderTopWidth: 2.5 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderTopWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
});

// ── SectionLabel ──────────────────────────────────────────────────────────

export function SectionLabel({
  icon,
  label,
  color,
  count,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  count?: number;
  colors: any;
}) {
  return (
    <View style={sectionStyles.row}>
      <View style={[sectionStyles.iconWrap, { backgroundColor: `${color}14` }]}>
        {React.cloneElement(icon as React.ReactElement, { color, strokeWidth: 2.2 })}
      </View>
      <Text style={[sectionStyles.label, { color: colors.text }]}>{label}</Text>
      {count !== undefined && count > 0 && (
        <View style={[sectionStyles.countPill, { backgroundColor: `${color}12` }]}>
          <Text style={[sectionStyles.countText, { color }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

// ── EmptyState ────────────────────────────────────────────────────────────

export function EmptyState({ message, colors }: { message: string; colors: any }) {
  return (
    <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
      <Text
        style={{
          color: colors.muted,
          fontSize: FONT_SIZES.sm,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

// ── ShowMoreButton ────────────────────────────────────────────────────────

export function ShowMoreButton({
  remaining,
  batch,
  onPress,
  colors,
}: {
  remaining: number;
  batch: number;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={showMoreStyles.btn}
    >
      <Text style={[showMoreStyles.text, { color: colors.primary }]}>
        Show {Math.min(batch, remaining)} more
      </Text>
      <ChevronDown size={13} color={colors.primary} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const showMoreStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
  },
  text: { fontSize: 13, fontWeight: '700' },
});

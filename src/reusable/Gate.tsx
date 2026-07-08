import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../hooks/useSubscription';
import { AppContext } from '../common/AppContext';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { route } from '../component/navigations/routes';

type Tier = 'legacy_sower' | 'covenant_sower';

interface GateProps {
  minimumTier: Tier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
}

const TIER_LABELS: Record<Tier, string> = {
  legacy_sower: 'Legacy Sower',
  covenant_sower: 'Covenant Sower',
};

export const Gate = ({ minimumTier, children, fallback, title, description }: GateProps) => {
  const { hasAccess } = useSubscription();

  if (hasAccess(minimumTier)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt minimumTier={minimumTier} title={title} description={description} />;
};

const UpgradePrompt = ({ minimumTier, title, description }: { minimumTier: Tier; title?: string; description?: string }) => {
  const app = React.useContext(AppContext);
  if (!app) return null;
  const COLORS = React.useMemo(() => getColors(app.isDark), [app.isDark]);
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.container, { backgroundColor: COLORS.cardBackground }]}>
      <View style={[styles.iconCircle, { backgroundColor: COLORS.border }]}>
        <Lock size={24} color={COLORS.muted} />
      </View>
      <Text style={[styles.title, { color: COLORS.text }]}>
        {title || `${TIER_LABELS[minimumTier]} Feature`}
      </Text>
      <Text style={[styles.description, { color: COLORS.textSecondary }]}>
        {description || `Upgrade to ${TIER_LABELS[minimumTier]} to unlock this and other advanced study features.`}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: COLORS.primary }]}
        onPress={() => navigation.navigate(route.sower)}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: COLORS.white }]}>View Plans</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.round,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

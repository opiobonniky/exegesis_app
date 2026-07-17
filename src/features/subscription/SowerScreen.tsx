import React, { useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { sendPostRequest } from '../../services/api';
import { useTiers, Tier } from '../../hooks/useTiers';
import { route } from '../../component/navigations/routes';
import ActionHeader from '../../reusable/ActionHeader';

const formatPrice = (price: number) => '$' + price.toFixed(2);

interface TierCard {
  id: string;
  name: string;
  priceYearly: number;
  priceMonthly: number;
  features: string[];
}

const buildTierCards = (tiers: Tier[]): TierCard[] => {
  const cards: TierCard[] = [];

  const free = tiers.find(t => t.id === 'free');
  cards.push({
    id: 'free',
    name: free?.name ?? 'Free',
    priceYearly: 0,
    priceMonthly: 0,
    features: free?.features?.length ? free.features : ['Bible reading', 'Daily verse', 'Basic tools'],
  });

  for (const baseId of ['legacy_sower', 'covenant_sower']) {
    const yearly = tiers.find(t => t.id === baseId);
    const monthly = tiers.find(t => t.id === `${baseId}_monthly`);
    if (yearly || monthly) {
      cards.push({
        id: baseId,
        name: yearly?.name ?? monthly?.name ?? baseId,
        priceYearly: yearly?.price ?? 0,
        priceMonthly: monthly?.price ?? 0,
        features: yearly?.features?.length ? yearly.features : (monthly?.features ?? []),
      });
    }
  }

  return cards;
};

const getSlotLabel = (cardId: string) => {
  if (cardId === 'legacy_sower') return 'for first 1,000 users';
  return null;
};

export default function SowerScreen() {
  const app = useContext(AppContext);
  const navigation = useNavigation<any>();
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);

  const { tiers, loading: tiersLoading, error: tiersError } = useTiers();
  const fetchSubscriptionStatus = app?.fetchSubscriptionStatus;
  const waitForTierUpdate = app?.waitForTierUpdate;
  const subscriptionTier = app?.subscriptionTier ?? 'free';

  useFocusEffect(
    React.useCallback(() => {
      fetchSubscriptionStatus?.();
    }, []),
  );

  const [loading, setLoading] = useState<string | null>(null);
  const TIERS = useMemo(() => buildTierCards(tiers), [tiers]);

  // Track the selected interval per tier card
  const [intervals, setIntervals] = useState<Record<string, 'month' | 'year'>>({});

  const getInterval = (cardId: string, card: TierCard) => {
    if (card.id === 'free') return 'year';
    // Default to the interval that has a valid price
    if (!card.priceMonthly || card.priceMonthly === 0) return 'year';
    return intervals[cardId] || 'month';
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSubscribe = async (cardId: string, interval: string) => {
    if (cardId === 'free') return;
    try {
      setLoading(`${cardId}_${interval}`);
      const res = await sendPostRequest('subscriptions', 'create-checkout-session', {
        tier: cardId,
        interval,
      });
      if (res.returnCode === 200 && res.returnData?.url) {
        await Linking.openURL(res.returnData.url);
        // After returning from Stripe Checkout, poll until the tier updates
        if (waitForTierUpdate) {
          const newTier = await waitForTierUpdate();
          if (newTier !== 'free' && newTier !== subscriptionTier) {
            Alert.alert('Subscription Active', `Your ${newTier} plan is now active.`);
          }
        }
      } else {
        Alert.alert('Error', res.returnMessage ?? 'Something went wrong. Please try again.');
      }
    } catch (e: any) {
      console.error('Failed to subscribe:', e);
      const msg = e?.message ?? '';
      if (msg.toLowerCase().includes('token') || msg === 'No token provided') {
        Alert.alert('Sign In Required', 'Please sign in to subscribe.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate(route.homeLogin as never) },
        ]);
      } else if (msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('cancel')) {
        // User cancelled at Stripe — no action needed
      } else {
        Alert.alert('Error', msg || 'Something went wrong.');
      }
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (cardId: string, interval: 'month' | 'year') => {
    if (cardId === 'free') return subscriptionTier === 'free';
    if (interval === 'month') return subscriptionTier === `${cardId}_monthly`;
    const base = subscriptionTier.replace(/_monthly$/, '');
    return base === cardId;
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ActionHeader title="Sower Plans" onPress={handleBack} />

      {tiersLoading && tiers.length === 0 ? (
        <View style={[styles.center, { backgroundColor: COLORS.background }]}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : tiersError && TIERS.length === 0 ? (
        <View style={[styles.center, { backgroundColor: COLORS.background }]}>
          <Text style={[styles.errorText, { color: COLORS.textSecondary }]}>{tiersError}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={[styles.heroTitle, { color: COLORS.text }]}>Support the Mission</Text>
            <Text style={[styles.heroSubtitle, { color: COLORS.textSecondary }]}>
              The Word remains free.{'\n'}Legacy tools support the work.
            </Text>
          </View>

          {/* Tier cards */}
          {TIERS.map(tier => {
            const interval = getInterval(tier.id, tier);
            const hasBothPrices = tier.id !== 'free' && tier.priceMonthly > 0 && tier.priceYearly > 0;
            const displayPrice = interval === 'month' ? tier.priceMonthly : tier.priceYearly;
            const current = isCurrentPlan(tier.id, interval);
            const slotLabel = getSlotLabel(tier.id);
            const isLoading = loading === `${tier.id}_${interval}`;

            return (
              <View
                key={tier.id}
                style={[styles.card, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
              >
                <Text style={[styles.tierName, { color: COLORS.text }]}>{tier.name}</Text>

                {hasBothPrices && (
                  <View style={styles.intervalToggle}>
                    <TouchableOpacity
                      style={[
                        styles.intervalBtn,
                        {
                          backgroundColor: interval === 'month' ? COLORS.primary : COLORS.cardBackground,
                          borderColor: interval === 'month' ? COLORS.primary : COLORS.border,
                        },
                      ]}
                      onPress={() => setIntervals(p => ({ ...p, [tier.id]: 'month' }))}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.intervalBtnText,
                          { color: interval === 'month' ? '#fff' : COLORS.textSecondary },
                        ]}
                      >
                        Monthly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.intervalBtn,
                        {
                          backgroundColor: interval === 'year' ? COLORS.primary : COLORS.cardBackground,
                          borderColor: interval === 'year' ? COLORS.primary : COLORS.border,
                        },
                      ]}
                      onPress={() => setIntervals(p => ({ ...p, [tier.id]: 'year' }))}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.intervalBtnText,
                          { color: interval === 'year' ? '#fff' : COLORS.textSecondary },
                        ]}
                      >
                        Yearly
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: COLORS.text }]}>
                    {tier.id === 'free' ? '$0' : formatPrice(displayPrice)}
                  </Text>
                  <Text style={[styles.period, { color: COLORS.textSecondary }]}>
                    {tier.id === 'free' ? '' : interval === 'month' ? '/month' : '/year'}
                  </Text>
                  {slotLabel && (
                    <Text style={[styles.slotLabel, { color: COLORS.textSecondary }]}>
                      {' '}{slotLabel}
                    </Text>
                  )}
                </View>

                <View style={styles.featureList}>
                  {tier.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={[styles.check, { color: COLORS.primary }]}>✓</Text>
                      <Text style={[styles.featureText, { color: COLORS.textSecondary }]}>{f}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    {
                      backgroundColor: current ? COLORS.border : COLORS.primary,
                      opacity: current || loading !== null ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => handleSubscribe(tier.id, interval)}
                  disabled={current || loading !== null}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.ctaText}>
                      {current
                        ? 'Current Plan'
                        : tier.id === 'free'
                        ? 'Free'
                        : `Sow ${interval === 'month' ? 'Monthly' : 'Yearly'}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },

  hero: { alignItems: 'center', marginBottom: 24, paddingTop: 12 },
  heroTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  card: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    marginBottom: 16,
  },
  tierName: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap' },
  price: { fontSize: 36, fontWeight: '800' },
  period: { fontSize: 16, marginLeft: 2, fontWeight: '500' },
  slotLabel: { fontSize: 13, fontWeight: '500' },

  featureList: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  check: { fontSize: 16, fontWeight: '700', marginRight: 10, marginTop: 1 },
  featureText: { fontSize: 14, flex: 1, lineHeight: 20 },

  intervalToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  intervalBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  intervalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  ctaButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

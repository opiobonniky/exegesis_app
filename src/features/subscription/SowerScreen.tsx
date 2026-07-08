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
import ActionHeader from '../../reusable/ActionHeader';

const formatPrice = (price: number) => '$' + price.toFixed(2);

const buildTierCards = (tiers: Tier[]) => {
  const cards: {
    id: string;
    name: string;
    price: string;
    period: string;
    features: string[];
  }[] = [];

  const free = tiers.find(t => t.id === 'free');
  if (free) {
    cards.push({
      id: 'free',
      name: free.name,
      price: '$0',
      period: '',
      features: ['Bible reading', 'Daily verse', 'Basic tools'],
    });
  }

  for (const baseId of ['legacy_sower', 'covenant_sower']) {
    const tier = tiers.find(t => t.id === baseId);
    if (tier) {
      cards.push({
        id: baseId,
        name: tier.name,
        price: formatPrice(tier.price),
        period: '/year',
        features: tier.features?.length ? tier.features : [],
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
  const subscriptionTier = app?.subscriptionTier ?? 'free';

  useFocusEffect(
    React.useCallback(() => {
      fetchSubscriptionStatus?.();
    }, [fetchSubscriptionStatus]),
  );

  const [loading, setLoading] = useState<string | null>(null);
  const TIERS = useMemo(() => buildTierCards(tiers), [tiers]);

  const handleSubscribe = async (cardId: string) => {
    if (cardId === 'free') return;
    try {
      setLoading(cardId);
      const res = await sendPostRequest('subscriptions', 'create-checkout-session', {
        tier: cardId,
        interval: 'year',
      });
      if (res.returnCode === 200 && res.returnData?.url) {
        Linking.openURL(res.returnData.url);
      } else {
        Alert.alert('Error', res.returnMessage ?? 'Something went wrong. Please try again.');
      }
    } catch (e: any) {
      console.error('Failed to subscribe:', e);
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (cardId: string) => {
    if (cardId === 'free') return subscriptionTier === 'free';
    const base = subscriptionTier.replace(/_monthly$/, '');
    return base === cardId;
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ActionHeader title="Sower Plans" onPress={() => navigation.goBack()} />

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
            const current = isCurrentPlan(tier.id);
            const slotLabel = getSlotLabel(tier.id);

            return (
              <View
                key={tier.id}
                style={[styles.card, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
              >
                <Text style={[styles.tierName, { color: COLORS.text }]}>{tier.name}</Text>

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: COLORS.text }]}>{tier.price}</Text>
                  <Text style={[styles.period, { color: COLORS.textSecondary }]}>{tier.period}</Text>
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
                  onPress={() => handleSubscribe(tier.id)}
                  disabled={current || loading !== null}
                  activeOpacity={0.8}
                >
                  {loading === tier.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.ctaText}>
                      {current ? 'Current Plan' : tier.id === 'free' ? 'Free' : 'Sow Yearly'}
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

  ctaButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

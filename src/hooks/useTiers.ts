import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPostRequest } from '../services/api';

const CACHE_KEY = 'subscription_tiers';

export interface Tier {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: string;
  stripeProductId?: string;
  stripePriceId?: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  maxSlots?: number;
}

const FALLBACK_TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'none',
    features: ['Bible reading', 'Daily verse', 'Basic tools'],
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'legacy_sower',
    name: 'Legacy Sower',
    price: 30,
    currency: 'usd',
    interval: 'year',
    features: [
      'Advanced word study (Strong\'s Concordance)',
      'In-depth verse explanations',
      'Lab (AI-assisted study)',
      'Higher-rate API access',
      'Legacy badge',
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'covenant_sower',
    name: 'Covenant Sower',
    price: 90,
    currency: 'usd',
    interval: 'year',
    features: [
      'Everything in Legacy Sower',
      'Priority support',
      'Covenant badge',
    ],
    isActive: true,
    sortOrder: 2,
  },
];

interface UseTiersResult {
  tiers: Tier[];
  loading: boolean;
  error: string | null;
  /** Fetch latest tiers from the API (also used to refresh subscription status) */
  fetchSubscriptionStatus: () => void;
}

export const useTiers = (): UseTiersResult => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref so the catch block always sees the current tiers length
  // without needing to add `tiers` to the useCallback dependency array.
  const tiersRef = useRef<Tier[]>(tiers);
  useEffect(() => {
    tiersRef.current = tiers;
  }, [tiers]);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      // Serve from cache immediately so the UI isn't blank
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: Tier[] = JSON.parse(cached);
        setTiers(parsed);
        setLoading(false);
      }

      // Then fetch fresh data
      const res = await sendPostRequest('subscriptions', 'tiers', {});

      console.log('Fetched subscription tiers:', res.returnData?.tiers);
      if (res.returnCode === 200 && res.returnData?.tiers) {
        const data: Tier[] = res.returnData.tiers;
        if (data.length > 0) {
          setTiers(data);
          setError(null);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } else if (!cached) {
          // API returned empty tiers (no DB seed) — use fallback silently
          setTiers(FALLBACK_TIERS);
          setError(null);
        }
      } else if (!cached) {
        setTiers(FALLBACK_TIERS);
        setError(null);
      }
    } catch {
      // If we already have cached/state data, swallow the error silently.
      // Otherwise use the hardcoded fallback so the screen never breaks.
      if (tiersRef.current.length === 0) {
        setTiers(FALLBACK_TIERS);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, []); // stable — no external deps needed thanks to tiersRef

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return { tiers, loading, error, fetchSubscriptionStatus };
};

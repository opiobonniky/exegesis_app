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
      if (res.returnCode === 200 && res.returnData?.tiers) {
        const data: Tier[] = res.returnData.tiers;
        setTiers(data);
        setError(null);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } else if (!cached) {
        setError('Failed to load subscription plans');
      }
    } catch {
      // If we already have cached/state data, swallow the error silently
      if (tiersRef.current.length === 0) {
        setError('Unable to load plans. Check your connection.');
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

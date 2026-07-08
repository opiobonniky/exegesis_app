import { useContext } from 'react';
import { AppContext } from '../common/AppContext';

const TIER_ORDER: Record<string, number> = {
  free: 0,
  legacy_sower: 1,
  legacy_sower_monthly: 1,
  covenant_sower: 2,
  covenant_sower_monthly: 2,
};

export const useSubscription = () => {
  const app = useContext(AppContext);
  const tier = app?.subscriptionTier || 'free';

  const hasAccess = (minimumTier: 'legacy_sower' | 'covenant_sower'): boolean => {
    return TIER_ORDER[tier] >= TIER_ORDER[minimumTier];
  };

  return {
    tier,
    hasAccess,
    isFree: tier === 'free',
    isLegacySower: tier === 'legacy_sower',
    isCovenantSower: tier === 'covenant_sower',
    fetchSubscriptionStatus: app?.fetchSubscriptionStatus || (async () => {}),
  };
};

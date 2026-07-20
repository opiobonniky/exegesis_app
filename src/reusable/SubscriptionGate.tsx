import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppContext } from '../common/AppContext';

type Tier = 'legacy_sower' | 'covenant_sower';

const PAID_TIERS = new Set([
  'legacy_sower',
  'legacy_sower_monthly',
  'covenant_sower',
  'covenant_sower_monthly',
]);

export function withSubscriptionGate<T extends object>(
  Screen: React.ComponentType<T>,
  _minimumTier: Tier, // kept for future granular gating
): React.ComponentType<T> {
  function GatedComponent(props: T) {
    const context = useContext(AppContext);
    const navigation = useNavigation<any>();
    const userInfo = context?.userInfo;
    const subscriptionLoading = context?.subscriptionLoading ?? false;

    // Primary: tier from context state (kept fresh by fetchSubscriptionStatus).
    // Fallback: tier embedded in userInfo (restored from AsyncStorage on boot).
    // Admin users bypass subscription checks entirely.
    const contextTier = context?.subscriptionTier ?? 'free';
    const cachedTier = (userInfo as any)?.subscriptionTier ?? 'free';
    const effectiveTier = PAID_TIERS.has(contextTier) ? contextTier : cachedTier;
    const isPaid = PAID_TIERS.has(effectiveTier);
    const isAdminUser = (userInfo as any)?.userRole === 1;


    useEffect(() => {
      if (subscriptionLoading) return;
      if (!context) return;

      if (!userInfo) {
        navigation.replace('Login');
      } else if (!isPaid && !isAdminUser) {
        navigation.replace('Sower');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfo, isPaid, subscriptionLoading]);

    if (subscriptionLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (!userInfo || (!isPaid && !isAdminUser)) return null;

    return <Screen {...props} />;
  }

  GatedComponent.displayName = `withSubscriptionGate(${Screen.displayName ?? Screen.name})`;

  return GatedComponent;
}

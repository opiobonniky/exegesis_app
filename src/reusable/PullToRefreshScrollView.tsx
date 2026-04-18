import React, { useCallback, useState, useContext } from 'react';
import {
  ScrollView,
  RefreshControl,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AppContext } from '../common/AppContext';
import { getColors } from '../constants/theme';

type Props = Omit<ScrollViewProps, 'refreshControl'> & {
  onRefresh: () => Promise<void> | void;
  refreshing?: boolean; // optional external control
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function PullToRefreshScrollView({
  onRefresh,
  refreshing: externalRefreshing,
  children,
  contentContainerStyle,
  ...scrollProps
}: Props) {
  const { isDark } = useContext(AppContext) as any;
  const COLORS = getColors(isDark);

  const [internalRefreshing, setInternalRefreshing] = useState(false);

  const refreshing =
    externalRefreshing !== undefined ? externalRefreshing : internalRefreshing;

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    if (externalRefreshing === undefined) setInternalRefreshing(true);

    try {
      await onRefresh();
    } finally {
      if (externalRefreshing === undefined) setInternalRefreshing(false);
    }
  }, [refreshing, externalRefreshing, onRefresh]);

  return (
    <ScrollView
      {...scrollProps}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary} // iOS
          colors={[COLORS.primary]} // Android
          progressBackgroundColor={COLORS.cardBackground}
        />
      }
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </ScrollView>
  );
}

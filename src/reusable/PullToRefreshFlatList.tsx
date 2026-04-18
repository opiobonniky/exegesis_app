import React, { useCallback, useState, useContext } from 'react';
import { FlatList, RefreshControl, FlatListProps } from 'react-native';
import { AppContext } from '../common/AppContext';
import { getColors } from '../constants/theme';

type Props<T> = Omit<FlatListProps<T>, 'refreshControl'> & {
  onRefresh: () => Promise<void> | void;
  refreshing?: boolean; // optional external control
};

export default function PullToRefreshFlatList<T>({
  onRefresh,
  refreshing: externalRefreshing,
  ...listProps
}: Props<T>) {
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
    <FlatList
      {...listProps}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary} // iOS
          colors={[COLORS.primary]} // Android
          progressBackgroundColor={COLORS.cardBackground}
        />
      }
    />
  );
}

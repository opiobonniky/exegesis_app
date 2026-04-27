/**
 * AdminActivityPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Activity logs for admins
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActivityRecord, getAllActivity } from '../../services/adminApi';
import BottomTab from '../../component/navigations/BottomTab';

const AdminActivityPage: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<{
    successCount: number;
    failedCount: number;
    onlineCount: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState('adminActivity');

  const fetchActivity = useCallback(
    async (pg: number = 1, filterType: string = 'all') => {
      try {
        const filters: any = {};
        if (filterType === 'success') filters.success = true;
        if (filterType === 'failed') filters.success = false;

        const response = await getAllActivity(pg, 20, filters);
        setActivities(response.sessions || []);
        setTotalPages(response.totalPages);
        setTotalCount(response.totalCount);
        setPage(response.page);
        setSummary(response.summary || null);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivity(page, filter);
    setRefreshing(false);
  }, [fetchActivity, page, filter]);

  const handleFilterChange = (newFilter: 'all' | 'success' | 'failed') => {
    setLoading(true);
    setFilter(newFilter);
    fetchActivity(1, newFilter);
  };

  const deviceIcon = (deviceType?: string) => {
    switch (deviceType?.toUpperCase()) {
      case 'MOBILE':
        return '📱';
      case 'TABLET':
        return '📱';
      case 'BOT':
        return '🤖';
      default:
        return '💻';
    }
  };

  const timeAgo = (ts: string) => {
    if (!ts) return '—';
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const renderActivity = ({ item }: { item: ActivityRecord }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View
          style={[
            styles.deviceIcon,
            item.success ? styles.deviceIconSuccess : styles.deviceIconFailed,
          ]}
        >
          <Text style={styles.deviceIconText}>
            {deviceIcon(item.deviceType)}
          </Text>
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityUsername}>
            {item.username || 'Unknown'}
          </Text>
          <Text style={styles.activityDetails}>
            {item.browserName || 'Unknown'} · {item.os || 'Unknown'}
          </Text>
          <Text style={styles.activityIP}>{item.ip || '—'}</Text>
        </View>
        <View
          style={[
            styles.statusIndicator,
            item.success ? styles.statusSuccess : styles.statusFailed,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.success ? styles.statusTextSuccess : styles.statusTextFailed,
            ]}
          >
            {item.success ? 'Success' : 'Failed'}
          </Text>
        </View>
      </View>

      <View style={styles.activityFooter}>
        <Text style={styles.activityTime}>
          {item.loggedInAt ? new Date(item.loggedInAt).toLocaleString() : '—'}
        </Text>
        {item.loggedOutAt && (
          <Text style={styles.activityLogout}>
            Logged out {timeAgo(item.loggedOutAt)}
          </Text>
        )}
        {!item.loggedOutAt && item.success && (
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No activity recorded yet</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Activity Logs</Text>
        <Text style={styles.subtitle}>{totalCount} sessions</Text>
      </View>

      {/* Summary Stats */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summarySuccess]}>
            <Text style={styles.summaryValue}>{summary.successCount}</Text>
            <Text style={styles.summaryLabel}>Successful</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryFailed]}>
            <Text style={styles.summaryValue}>{summary.failedCount}</Text>
            <Text style={styles.summaryLabel}>Failed</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryOnline]}>
            <Text style={styles.summaryValue}>{summary.onlineCount}</Text>
            <Text style={styles.summaryLabel}>Online</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'success' && styles.filterActive,
          ]}
          onPress={() => handleFilterChange('success')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'success' && styles.filterTextActive,
            ]}
          >
            Success
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'failed' && styles.filterActive,
          ]}
          onPress={() => handleFilterChange('failed')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'failed' && styles.filterTextActive,
            ]}
          >
            Failed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activity List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <>
          <FlatList
            data={activities}
            renderItem={renderActivity}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
          <View style={styles.bottomPadding} />
          <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
  },
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  backButton: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 13,
    color: '#78716c',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summarySuccess: {
    backgroundColor: '#d1fae5',
  },
  summaryFailed: {
    backgroundColor: '#fee2e2',
  },
  summaryOnline: {
    backgroundColor: '#dbeafe',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#57534e',
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  filterActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#57534e',
  },
  filterTextActive: {
    color: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconSuccess: {
    backgroundColor: '#d1fae5',
  },
  deviceIconFailed: {
    backgroundColor: '#fee2e2',
  },
  deviceIconText: {
    fontSize: 16,
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1917',
  },
  activityDetails: {
    fontSize: 12,
    color: '#78716c',
  },
  activityIP: {
    fontSize: 11,
    color: '#a8a29e',
    fontFamily: 'monospace',
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusSuccess: {
    backgroundColor: '#d1fae5',
  },
  statusFailed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#059669',
  },
  statusTextFailed: {
    color: '#dc2626',
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  activityTime: {
    fontSize: 11,
    color: '#a8a29e',
  },
  activityLogout: {
    fontSize: 11,
    color: '#a8a29e',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#78716c',
  },
  bottomPadding: {
    height: 80,
  },
});

export default AdminActivityPage;

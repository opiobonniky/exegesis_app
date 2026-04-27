
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import {
  getAdminDashboardStats,
  DashboardStats,
} from '../../services/adminApi';
import { useAuth } from '../../hooks/useAuth';
import BottomTab from '../../component/navigations/BottomTab';

interface StatCardProps {
  label: string;
  value: number;
  subtitle?: string;
  color: string;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, color, onPress }) => (
  <TouchableOpacity
    style={styles.statCard}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Text style={[styles.statIconText, { color }]}>{value.toLocaleString()}</Text>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { userInfo } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('adminDashboard');

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Admin Console</Text>
          </View>
          <Text style={styles.headerTitle}>Platform Overview</Text>
          <Text style={styles.headerDate}>{formatDate()}</Text>
        </View>

      {/* Welcome */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>
          Welcome back, {userInfo?.firstName || userInfo?.username}!
        </Text>
        <Text style={styles.welcomeSubtext}>
          Here's what's happening with your platform today.
        </Text>
      </View>

      {/* Primary Stats */}
      <Text style={styles.sectionTitle}>User Statistics</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Users"
          value={stats?.totalUsers || 0}
          subtitle={`${stats?.newUsersThisMonth || 0} new this month`}
          color="#2563eb"
        />
        <StatCard
          label="Active"
          value={stats?.activeUsers || 0}
          subtitle={`${stats?.inactiveUsers || 0} inactive`}
          color="#059669"
        />
        <StatCard
          label="Verified"
          value={stats?.verifiedUsers || 0}
          subtitle={`${stats?.unverifiedUsers || 0} pending`}
          color="#0891b2"
        />
        <StatCard
          label="Enrollments"
          value={stats?.totalEnrollments || 0}
          subtitle={`${stats?.completedEnrollments || 0} completed`}
          color="#7c3aed"
        />
      </View>

      {/* Role Stats */}
      <Text style={styles.sectionTitle}>Role Breakdown</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Admins"
          value={stats?.adminCount || 0}
          color="#7c3aed"
        />
        <StatCard
          label="Members"
          value={stats?.memberCount || 0}
          color="#0891b2"
        />
        <StatCard
          label="Reading Plans"
          value={stats?.totalPlans || 0}
          subtitle={`${stats?.activePlans || 0} active`}
          color="#059669"
        />
        <StatCard
          label="New This Month"
          value={stats?.newUsersThisMonth || 0}
          color="#d97706"
        />
      </View>

      {/* Activity Rates */}
      <Text style={styles.sectionTitle}>Platform Health</Text>
      <View style={styles.healthCard}>
        <View style={styles.healthItem}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthLabel}>Active User Rate</Text>
            <Text style={styles.healthValue}>{stats?.activeRate || 0}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats?.activeRate || 0}%`,
                  backgroundColor: '#059669',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.healthItem}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthLabel}>Email Verification</Text>
            <Text style={styles.healthValue}>{stats?.verificationRate || 0}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats?.verificationRate || 0}%`,
                  backgroundColor: '#0891b2',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.healthItem}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthLabel}>Plan Completion</Text>
            <Text style={styles.healthValue}>{stats?.completionRate || 0}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats?.completionRate || 0}%`,
                  backgroundColor: '#7c3aed',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate(route.adminUsers)}
        >
          <Text style={styles.quickActionIcon}>👥</Text>
          <Text style={styles.quickActionText}>Manage Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate(route.adminActivity)}
        >
          <Text style={styles.quickActionIcon}>📊</Text>
          <Text style={styles.quickActionText}>View Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate(route.adminDailyVerse)}
        >
          <Text style={styles.quickActionIcon}>📖</Text>
          <Text style={styles.quickActionText}>Daily Verse</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate(route.adminReadingPlans)}
        >
          <Text style={styles.quickActionIcon}>📚</Text>
          <Text style={styles.quickActionText}>Reading Plans</Text>
        </TouchableOpacity>
      </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />
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
  },
  headerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 13,
    color: '#78716c',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#78716c',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#57534e',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#44403c',
  },
  statSubtitle: {
    fontSize: 11,
    color: '#78716c',
    marginTop: 2,
  },
  healthCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  healthItem: {
    marginBottom: 12,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  healthLabel: {
    fontSize: 13,
    color: '#57534e',
  },
  healthValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1c1917',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f5f5f4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  quickAction: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#44403c',
  },
  bottomPadding: {
    height: 80,
  },
});

export default AdminDashboard;
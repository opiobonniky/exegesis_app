/**
 * AdminUsersPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User management for admins
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
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import {
  getUsersByAdmin,
  toggleUserStatusByAdmin,
  toggleUserVerificationByAdmin,
  deleteUserByAdmin,
  SystemUser,
} from '../../services/adminApi';
import BottomTab from '../../component/navigations/BottomTab';

const AdminUsersPage: React.FC = () => {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('adminUsers');

  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async (pg: number = 1, searchTerm: string = '') => {
    try {
      const response = await getUsersByAdmin(searchTerm, pg, 20);
      const processedUsers = response.users.map((u: any) => ({
        ...u,
        roleName: u.userRole === 1 || u.userRole === '1' ? 'admin' : 'Member',
        status: u.status ?? true,
        emailVerified: u.emailVerified ?? false,
      }));
      setUsers(processedUsers);
      setTotalCount(response.totalCount);
      setPage(response.page);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers(page, search);
    setRefreshing(false);
  }, [fetchUsers, page, search]);

  const handleSearch = (text: string) => {
    setSearch(text);
    setLoading(true);
    fetchUsers(1, text);
  };

  const handleToggleStatus = async (user: SystemUser) => {
    const username = user.username;
    setTogglingUsers((prev) => new Set(prev).add(username));
    
    try {
      await toggleUserStatusByAdmin(username, !user.status);
      setUsers((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, status: !u.status } : u
        )
      );
      Alert.alert(
        'Success',
        `User ${user.status ? 'deactivated' : 'activated'} successfully`,
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    } finally {
      setTogglingUsers((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  const handleToggleVerify = async (user: SystemUser) => {
    const username = user.username;
    setTogglingUsers((prev) => new Set(prev).add(username));
    
    try {
      await toggleUserVerificationByAdmin(username, !user.emailVerified);
      setUsers((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, emailVerified: !u.emailVerified } : u
        )
      );
      Alert.alert(
        'Success',
        `User verification ${!user.emailVerified ? 'granted' : 'revoked'} successfully`,
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update verification');
    } finally {
      setTogglingUsers((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  const handleDeleteUser = (user: SystemUser) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserByAdmin(user.username);
              setUsers((prev) =>
                prev.filter((u) => u.username !== user.username)
              );
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ],
    );
  };

  const roleColor = (role: string) => {
    if (role === 'admin') return '#7c3aed';
    return '#0891b2';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const renderUser = ({ item }: { item: SystemUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={[styles.avatar, { backgroundColor: roleColor(item.roleName) }]}>
          <Text style={styles.avatarText}>
            {getInitials(item.firstName, item.lastName)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: roleColor(item.roleName) + '20' },
          ]}
        >
          <Text
            style={[styles.roleBadgeText, { color: roleColor(item.roleName) }]}
          >
            {item.roleName}
          </Text>
        </View>
      </View>

      <View style={styles.userStats}>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            item.emailVerified
              ? styles.statusActive
              : styles.statusInactive,
          ]}
          onPress={() => handleToggleVerify(item)}
          disabled={togglingUsers.has(item.username)}
        >
          {togglingUsers.has(item.username) ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <Text
              style={[
                styles.statusText,
                item.emailVerified
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {item.emailVerified ? '✓ Verified' : '○ Unverified'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusBadge,
            item.status ? styles.statusActive : styles.statusInactive,
          ]}
          onPress={() => handleToggleStatus(item)}
          disabled={togglingUsers.has(item.username)}
        >
          <Text
            style={[
              styles.statusText,
              item.status ? styles.statusTextActive : styles.statusTextInactive,
            ]}
          >
            {item.status ? '● Active' : '○ Inactive'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteUser(item)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No users found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          {totalCount} user{totalCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#a8a29e"
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1c1917',
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
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  userEmail: {
    fontSize: 12,
    color: '#78716c',
  },
  userUsername: {
    fontSize: 12,
    color: '#a8a29e',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userStats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#f5f5f4',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#78716c',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteText: {
    color: '#dc2626',
    fontSize: 13,
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

export default AdminUsersPage;
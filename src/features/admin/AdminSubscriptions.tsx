import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Ban,
  CreditCard,
  DollarSign,
  Layers,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { sendPostRequest } from '../../services/api';
import { showToast } from '../../helpers/Toash.helper';
import ActionHeader from '../../reusable/ActionHeader';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubscribedUser {
  id: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  subscriptionTier: string;
  accessExpiresAt: string | null;
  legacySowerSlot: number | null;
  isSuspended: boolean;
  createdOn: string | null;
  // Stripe fields
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeTier: string | null;
  stripeStatus: string | null;
  stripeCurrentPeriodEnd: string | null;
  // Sync metadata
  source: 'db' | 'stripe_only' | 'partial';
  syncIssue: string | null;
  outOfSync: boolean;
}

interface SyncSummary {
  totalInDB: number;
  totalInStripe: number;
  outOfSync: number;
  stripeOnly: number;
}

interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  stripePriceId: string | null;
  features: string | string[] | null;
  isActive: boolean;
  sortOrder: number;
  maxSlots: number | null;
}

type TabKey = 'users' | 'tiers';

const INTERVAL_OPTIONS = ['month', 'year', 'once', 'none'];

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminSubscriptions() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('users');

  // ── Users state ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<SubscribedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [showOutOfSyncOnly, setShowOutOfSyncOnly] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  // ── Tiers state ────────────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);

  // ── Stats computed reactively from users + tiers actual prices ─────────────
  const stats = useMemo(() => {
    const legacySower = users.filter(u =>
      u.subscriptionTier === 'legacy_sower' || u.subscriptionTier === 'legacy_sower_monthly' ||
      u.stripeTier === 'legacy_sower' || u.stripeTier === 'legacy_sower_monthly',
    ).length;
    const covenantSower = users.filter(u =>
      u.subscriptionTier === 'covenant_sower' || u.subscriptionTier === 'covenant_sower_monthly' ||
      u.stripeTier === 'covenant_sower' || u.stripeTier === 'covenant_sower_monthly',
    ).length;
    const legacyPrice = tiers.find(t => t.id === 'legacy_sower')?.price ?? 0;
    const covenantPrice = tiers.find(t => t.id === 'covenant_sower')?.price ?? 0;
    return {
      total: users.length,
      legacySower,
      covenantSower,
      totalRevenue: legacySower * legacyPrice + covenantSower * covenantPrice,
    };
  }, [users, tiers]);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [changeTierUser, setChangeTierUser] = useState<SubscribedUser | null>(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [changeTierLoading, setChangeTierLoading] = useState(false);

  const [refundingUser, setRefundingUser] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const [tierFormVisible, setTierFormVisible] = useState(false);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [tierForm, setTierForm] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    currency: 'usd',
    interval: 'month' as string,
    stripePriceId: '',
    features: '',
    isActive: true,
    sortOrder: '',
    maxSlots: '',
  });
  const [tierFormLoading, setTierFormLoading] = useState(false);

  // ── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await sendPostRequest('admin', 'get-subscriptions-users', {});
      if (res.returnCode === 200 && res.returnData?.subscribedUsers) {
        const all: SubscribedUser[] = res.returnData.subscribedUsers;
        setUsers(all);
        setSyncSummary(res.returnData.summary ?? null);

        // stats are computed reactively via useMemo([users, tiers])
      }
    } catch (e) {
      console.error('Failed to fetch subscribed users:', e);
    } finally {
      setUsersLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Sync all Stripe subscribers into DB ────────────────────────────────────
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await sendPostRequest('admin', 'sync-stripe-users', {});
      if (res.returnCode === 200) {
        const { linked = [], updated = [], notFound = [] } = res.returnData?.results ?? {};
        showToast(
          'success',
          `Synced: ${updated.length} updated, ${linked.length} linked, ${notFound.length} not found`,
        );
        fetchUsers();
      } else {
        showToast('error', res.returnMessage || 'Sync failed');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // ── Fetch tiers ────────────────────────────────────────────────────────────
  const fetchTiers = useCallback(async () => {
    try {
      const res = await sendPostRequest('admin', 'subscription-tiers/list', {});
      if (res.returnCode === 200 && res.returnData?.tiers) {
        setTiers(res.returnData.tiers as SubscriptionTier[]);
      }
    } catch (e) {
      console.error('Failed to fetch tiers:', e);
    } finally {
      setTiersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTiers();
  }, [fetchUsers, fetchTiers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  // ── Change tier ────────────────────────────────────────────────────────────
  const handleChangeTier = async () => {
    if (!changeTierUser) return;
    if (!selectedTierId) {
      showToast('error', 'Please select a tier');
      return;
    }
    setChangeTierLoading(true);
    try {
      const res = await sendPostRequest('admin', 'subscriptions/update-user', {
        userId: changeTierUser.id,
        subscriptionTier: selectedTierId,
        accessExpiresAt: expiresAt || undefined,
      });
      if (res.returnCode === 200) {
        showToast('success', 'Subscription updated');
        setChangeTierUser(null);
        setSelectedTierId('');
        setExpiresAt('');
        fetchUsers();
      } else {
        showToast('error', res.returnMessage || 'Failed to update subscription');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to update subscription');
    } finally {
      setChangeTierLoading(false);
    }
  };

  // ── Suspend / Unsuspend ────────────────────────────────────────────────────
  const handleSuspendToggle = async (user: SubscribedUser) => {
    const newVal = !user.isSuspended;
    try {
      const res = await sendPostRequest('admin', 'subscriptions/suspend', {
        userId: user.id,
        suspend: newVal,
      });
      if (res.returnCode === 200) {
        showToast('success', newVal ? 'User suspended' : 'User unsuspended');
        fetchUsers();
      } else {
        showToast('error', res.returnMessage || 'Failed to update suspension');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to update suspension');
    }
  };

  // ── Refund ─────────────────────────────────────────────────────────────────
  const handleRefund = (userId: string) => {
    Alert.alert(
      'Confirm Refund',
      'Are you sure you want to issue a full refund for this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            setRefundingUser(userId);
            setRefundLoading(true);
            try {
              const res = await sendPostRequest('admin', 'subscriptions/refund', {
                userId,
                reason: 'requested_by_customer',
              });
              if (res.returnCode === 200) {
                showToast('success', 'Refund processed');
                fetchUsers();
              } else {
                showToast('error', res.returnMessage || 'Refund failed');
              }
            } catch (e: any) {
              showToast('error', e?.message || 'Refund failed');
            } finally {
              setRefundingUser(null);
              setRefundLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Tier CRUD ──────────────────────────────────────────────────────────────
  const openCreateTier = () => {
    setEditingTier(null);
    setTierForm({
      id: '',
      name: '',
      description: '',
      price: '',
      currency: 'usd',
      interval: 'month',
      stripePriceId: '',
      features: '',
      isActive: true,
      sortOrder: '',
      maxSlots: '',
    });
    setTierFormVisible(true);
  };

  const getTierFormPayload = () => {
    const featuresArray = tierForm.features
      ? tierForm.features.split('\n').filter(Boolean)
      : undefined;

    return {
      ...(editingTier && { id: tierForm.id }),
      name: tierForm.name,
      description: tierForm.description || undefined,
      price: Number(tierForm.price),
      currency: tierForm.currency,
      interval: tierForm.interval,
      features: featuresArray,
      isActive: tierForm.isActive,
      sortOrder: tierForm.sortOrder ? Number(tierForm.sortOrder) : 0,
      maxSlots: tierForm.maxSlots ? Number(tierForm.maxSlots) : null,
    };
  };

  const featuresToString = (f: string | string[] | null): string => {
    if (!f) return '';
    if (Array.isArray(f)) return f.join('\n');
    return f;
  };

  const openEditTier = (tier: SubscriptionTier) => {
    setEditingTier(tier);
    setTierForm({
      id: tier.id,
      name: tier.name,
      description: tier.description || '',
      price: String(tier.price),
      currency: tier.currency,
      interval: tier.interval,
      stripePriceId: tier.stripePriceId || '',
      features: featuresToString(tier.features),
      isActive: tier.isActive,
      sortOrder: String(tier.sortOrder),
      maxSlots: tier.maxSlots !== null ? String(tier.maxSlots) : '',
    });
    setTierFormVisible(true);
  };

  const handleSaveTier = async () => {
    if (!tierForm.name || !tierForm.price) {
      showToast('error', 'Name and price are required');
      return;
    }
    setTierFormLoading(true);
    try {
      const payload = getTierFormPayload();

      let res;
      if (editingTier) {
        res = await sendPostRequest('admin', 'subscription-tiers/update', payload);
      } else {
        res = await sendPostRequest('admin', 'subscription-tiers/create', payload);
      }

      if (res.returnCode === 200) {
        showToast('success', editingTier ? 'Tier updated' : 'Tier created');
        setTierFormVisible(false);
        fetchTiers();
      } else {
        showToast('error', res.returnMessage || 'Failed to save tier');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save tier');
    } finally {
      setTierFormLoading(false);
    }
  };

  const handleDeleteTier = (tier: SubscriptionTier) => {
    Alert.alert(
      'Delete Tier',
      `Are you sure you want to delete "${tier.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await sendPostRequest('admin', 'subscription-tiers/delete', { id: tier.id });
              if (res.returnCode === 200) {
                showToast('success', 'Tier deleted');
                fetchTiers();
              } else {
                showToast('error', res.returnMessage || 'Failed to delete tier');
              }
            } catch (e: any) {
              showToast('error', e?.message || 'Failed to delete tier');
            }
          },
        },
      ],
    );
  };

  // ── Filtered users ─────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch =
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
    const matchesSync = showOutOfSyncOnly ? u.outOfSync : true;
    return matchesSearch && matchesSync;
  });

  // ── Tier label helper ──────────────────────────────────────────────────────
  const tierLabel = (tierId: string) => {
    const t = tiers.find(t => t.id === tierId);
    return t?.name || tierId;
  };

  // ── Tabs config ────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'users', label: 'Users', icon: <Users size={16} color={activeTab === 'users' ? '#fff' : COLORS.textSecondary} /> },
    { key: 'tiers', label: 'Tiers', icon: <Layers size={16} color={activeTab === 'tiers' ? '#fff' : COLORS.textSecondary} /> },
  ];

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (usersLoading && activeTab === 'users') {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ActionHeader
        title="Subscription Management"
        onPress={() => navigation.goBack()}
      />

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                isActive && { backgroundColor: COLORS.primary },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              {tab.icon}
              <Text style={[styles.tabText, { color: isActive ? '#fff' : COLORS.textSecondary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          activeTab === 'users' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          ) : undefined
        }
      >
        {/* ════════════════════════════════════════
            USERS TAB
        ════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <>
            {/* Overview Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: COLORS.cardBackground, borderColor: '#F59E0B' }]}>
                <ShieldCheck size={20} color="#F59E0B" />
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.legacySower}</Text>
                <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Legacy Sowers</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.cardBackground, borderColor: '#8B5CF6' }]}>
                <ShieldCheck size={20} color="#8B5CF6" />
                <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{stats.covenantSower}</Text>
                <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Covenant Sowers</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.primary }]}>
                <Layers size={20} color={COLORS.primary} />
                <Text style={[styles.statValue, { color: COLORS.primary }]}>{Math.max(0, 1000 - stats.legacySower)}</Text>
                <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Slots Left</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.cardBackground, borderColor: '#10B981' }]}>
                <DollarSign size={20} color="#10B981" />
                <Text style={[styles.statValue, { color: '#10B981' }]}>${stats.totalRevenue.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Est. Revenue</Text>
              </View>
            </View>

            {/* Sync Summary Banner */}
            {syncSummary && (
              <View style={[styles.syncBanner, {
                backgroundColor: syncSummary.outOfSync > 0 ? '#F59E0B15' : '#10B98115',
                borderColor: syncSummary.outOfSync > 0 ? '#F59E0B' : '#10B981',
              }]}>
                <View style={styles.syncBannerLeft}>
                  {syncSummary.outOfSync > 0
                    ? <AlertTriangle size={16} color="#F59E0B" />
                    : <CheckCircle size={16} color="#10B981" />
                  }
                  <View style={{ marginLeft: 8 }}>
                    <Text style={[styles.syncBannerTitle, { color: COLORS.text }]}>
                      {syncSummary.outOfSync > 0
                        ? `${syncSummary.outOfSync} out-of-sync`
                        : 'All in sync'}
                    </Text>
                    <Text style={[styles.syncBannerSub, { color: COLORS.textSecondary }]}>
                      DB: {syncSummary.totalInDB} · Stripe: {syncSummary.totalInStripe} · Stripe-only: {syncSummary.stripeOnly}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.syncBtn, { backgroundColor: COLORS.primary, opacity: syncing ? 0.6 : 1 }]}
                  onPress={handleSyncAll}
                  disabled={syncing}
                  activeOpacity={0.7}
                >
                  {syncing
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <RefreshCw size={14} color="#fff" />
                  }
                  <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync All'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.totalRow, { backgroundColor: COLORS.cardBackground }]}>
              <Text style={[styles.totalText, { color: COLORS.text }]}>
                {stats.total} subscriber{stats.total !== 1 ? 's' : ''} (DB + Stripe)
              </Text>
            </View>

            {/* Search + out-of-sync filter */}
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: COLORS.cardBackground,
                  color: COLORS.text,
                  borderColor: COLORS.border,
                },
              ]}
              placeholder="Search by name or email..."
              placeholderTextColor={COLORS.muted}
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: showOutOfSyncOnly ? '#F59E0B20' : COLORS.cardBackground,
                  borderColor: showOutOfSyncOnly ? '#F59E0B' : COLORS.border,
                },
              ]}
              onPress={() => setShowOutOfSyncOnly(v => !v)}
              activeOpacity={0.7}
            >
              <AlertTriangle size={13} color={showOutOfSyncOnly ? '#F59E0B' : COLORS.textSecondary} />
              <Text style={[styles.filterChipText, { color: showOutOfSyncOnly ? '#F59E0B' : COLORS.textSecondary }]}>
                Out of sync only
              </Text>
            </TouchableOpacity>

            {/* User list */}
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
                  {users.length === 0
                    ? 'No subscribed users found'
                    : 'No results match your filter'}
                </Text>
              </View>
            ) : (
              filtered.map((user, idx) => (
                <View
                  key={user.stripeSubscriptionId || user.id || String(idx)}
                  style={[
                    styles.userCard,
                    {
                      backgroundColor: COLORS.cardBackground,
                      borderWidth: user.outOfSync ? 1 : 0,
                      borderColor: user.outOfSync ? '#F59E0B' : 'transparent',
                    },
                  ]}
                >
                  {/* Out-of-sync banner */}
                  {user.outOfSync && user.syncIssue && (
                    <View style={styles.outOfSyncRow}>
                      <AlertTriangle size={12} color="#F59E0B" />
                      <Text style={styles.outOfSyncText}>{user.syncIssue}</Text>
                    </View>
                  )}

                  {/* Stripe-only badge */}
                  {user.source === 'stripe_only' && (
                    <View style={styles.stripeOnlyBadge}>
                      <Text style={styles.stripeOnlyText}>Stripe-only — not in DB</Text>
                    </View>
                  )}
                  {user.source === 'partial' && (
                    <View style={[styles.stripeOnlyBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={[styles.stripeOnlyText, { color: '#F59E0B' }]}>Email matched — customer ID not linked</Text>
                    </View>
                  )}

                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: COLORS.text }]}>
                      {user.firstName || user.lastName
                        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                        : '(Unknown user)'}
                    </Text>
                    <Text style={[styles.userEmail, { color: COLORS.textSecondary }]}>{user.email}</Text>

                    <View style={styles.userMeta}>
                      {/* DB tier badge */}
                      <View
                        style={[
                          styles.tierBadge,
                          {
                            backgroundColor: user.subscriptionTier.startsWith('legacy_sower')
                              ? '#F59E0B20'
                              : '#8B5CF620',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tierText,
                            {
                              color: user.subscriptionTier.startsWith('legacy_sower')
                                ? '#F59E0B'
                                : '#8B5CF6',
                            },
                          ]}
                        >
                          DB: {tierLabel(user.subscriptionTier)}
                        </Text>
                      </View>

                      {/* Stripe tier badge (only if different) */}
                      {user.stripeTier && user.stripeTier !== user.subscriptionTier && (
                        <View style={[styles.tierBadge, { backgroundColor: '#EF444420' }]}>
                          <Text style={[styles.tierText, { color: '#EF4444' }]}>
                            Stripe: {tierLabel(user.stripeTier)}
                          </Text>
                        </View>
                      )}

                      {/* Stripe status */}
                      {user.stripeStatus && (
                        <View style={[styles.tierBadge, { backgroundColor: '#10B98120' }]}>
                          <Text style={[styles.tierText, { color: '#10B981' }]}>
                            {user.stripeStatus}
                          </Text>
                        </View>
                      )}

                      {user.legacySowerSlot != null && (
                        <Text style={[styles.slotText, { color: COLORS.textSecondary }]}>
                          Slot #{user.legacySowerSlot}
                        </Text>
                      )}
                    </View>

                    {user.accessExpiresAt && (
                      <Text style={[styles.detailText, { color: COLORS.textSecondary }]}>
                        Expires: {new Date(user.accessExpiresAt).toLocaleDateString()}
                      </Text>
                    )}
                    {user.stripeCurrentPeriodEnd && user.stripeCurrentPeriodEnd !== user.accessExpiresAt && (
                      <Text style={[styles.detailText, { color: COLORS.textSecondary }]}>
                        Stripe period end: {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString()}
                      </Text>
                    )}
                    {user.createdOn && (
                      <Text style={[styles.detailText, { color: COLORS.textSecondary }]}>
                        Joined: {new Date(user.createdOn).toLocaleDateString()}
                      </Text>
                    )}

                    {user.isSuspended && (
                      <View style={styles.suspendedBadge}>
                        <Ban size={14} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Suspended</Text>
                      </View>
                    )}
                  </View>

                  {/* Action buttons — only for users that exist in DB */}
                  {user.id && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: COLORS.primary + '20' }]}
                        onPress={() => {
                          setChangeTierUser(user as any);
                          setSelectedTierId(user.subscriptionTier);
                          setExpiresAt(user.accessExpiresAt || '');
                        }}
                        activeOpacity={0.7}
                      >
                        <CreditCard size={14} color={COLORS.primary} />
                        <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Change Tier</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: user.isSuspended ? '#10B98120' : '#F59E0B20' },
                        ]}
                        onPress={() => handleSuspendToggle(user as any)}
                        activeOpacity={0.7}
                      >
                        <Ban size={14} color={user.isSuspended ? '#10B981' : '#F59E0B'} />
                        <Text style={[styles.actionBtnText, { color: user.isSuspended ? '#10B981' : '#F59E0B' }]}>
                          {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleRefund(user.id!)}
                        disabled={refundLoading && refundingUser === user.id}
                        activeOpacity={0.7}
                      >
                        {refundLoading && refundingUser === user.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <RotateCcw size={14} color="#EF4444" />
                        )}
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Refund</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Stripe-only: show sync button */}
                  {!user.id && (
                    <TouchableOpacity
                      style={[styles.syncSingleBtn, { borderColor: '#F59E0B' }]}
                      onPress={handleSyncAll}
                      disabled={syncing}
                      activeOpacity={0.7}
                    >
                      <RefreshCw size={13} color="#F59E0B" />
                      <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>
                        Sync to DB
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* ════════════════════════════════════════
            TIERS TAB
        ════════════════════════════════════════ */}
        {activeTab === 'tiers' && (
          <>
            <View style={styles.tiersHeader}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Subscription Tiers</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: COLORS.primary }]}
                onPress={openCreateTier}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.addBtnText}>New Tier</Text>
              </TouchableOpacity>
            </View>

            {tiersLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : tiers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>No tiers found</Text>
              </View>
            ) : (
              tiers.map(tier => (
                <View key={tier.id} style={[styles.tierCard, { backgroundColor: COLORS.cardBackground }]}>
                  <View style={styles.tierCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.tierNameRow}>
                        <Text style={[styles.tierName, { color: COLORS.text }]}>{tier.name}</Text>
                        <View
                          style={[
                            styles.activeDot,
                            { backgroundColor: tier.isActive ? '#10B981' : '#EF4444' },
                          ]}
                        />
                      </View>
                      <Text style={[styles.tierPrice, { color: COLORS.primary }]}>
                        ${tier.price}/{tier.interval}
                      </Text>
                    </View>
                    <View style={styles.tierActions}>
                      <TouchableOpacity
                        style={[styles.tierActionBtn, { backgroundColor: COLORS.primary + '20' }]}
                        onPress={() => openEditTier(tier)}
                        activeOpacity={0.7}
                      >
                        <CreditCard size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tierActionBtn, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleDeleteTier(tier)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {tier.description ? (
                    <Text style={[styles.tierDesc, { color: COLORS.textSecondary }]}>{tier.description}</Text>
                  ) : null}

                  <View style={styles.tierMetaRow}>
                    <Text style={[styles.tierMeta, { color: COLORS.muted }]}>
                      ID: {tier.id}
                    </Text>
                    {tier.maxSlots != null && (
                      <Text style={[styles.tierMeta, { color: COLORS.muted }]}>
                        Max Slots: {tier.maxSlots}
                      </Text>
                    )}
                    {tier.stripePriceId && (
                      <Text style={[styles.tierMeta, { color: COLORS.muted }]} numberOfLines={1}>
                        {tier.stripePriceId}
                      </Text>
                    )}
                  </View>

                  {tier.features ? (
                    <View style={styles.featuresList}>
                      {(Array.isArray(tier.features) ? tier.features : tier.features.split('\n'))
                        .filter(Boolean)
                        .map((f, i) => (
                          <View key={i} style={styles.featureRow}>
                            <Text style={[styles.featureBullet, { color: COLORS.success }]}>✓</Text>
                            <Text style={[styles.featureText, { color: COLORS.textSecondary }]}>{f}</Text>
                          </View>
                        ))}
                    </View>
                  ) : null}
                </View>
              ))
            )}

            {/* Seed button */}
            <TouchableOpacity
              style={[styles.seedBtn, { borderColor: COLORS.border }]}
              onPress={async () => {
                try {
                  const res = await sendPostRequest('admin', 'subscription-tiers/seed', {});
                  if (res.returnCode === 200) {
                    showToast('success', `Seeded ${res.returnData?.results?.length || 0} tiers`);
                    fetchTiers();
                  }
                } catch (e: any) {
                  showToast('error', e?.message || 'Failed to seed tiers');
                }
              }}
              activeOpacity={0.7}
            >
              <RotateCcw size={16} color={COLORS.textSecondary} />
              <Text style={[styles.seedBtnText, { color: COLORS.textSecondary }]}>Seed Default Tiers</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Change Tier Modal ────────────────────────────────────────────────── */}
      <Modal visible={!!changeTierUser} transparent animationType="slide" onRequestClose={() => setChangeTierUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: COLORS.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Change Tier</Text>
              <TouchableOpacity onPress={() => setChangeTierUser(null)}>
                <X size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {changeTierUser && (
              <View style={styles.modalBody}>
                <Text style={[styles.modalLabel, { color: COLORS.text }]}>
                  User: {changeTierUser.firstName} {changeTierUser.lastName}
                </Text>

                <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>New Tier</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tierPickerRow}>
                  {tiers.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.tierChip,
                        {
                          backgroundColor: selectedTierId === t.id ? COLORS.primary + '20' : COLORS.cardBackground,
                          borderColor: selectedTierId === t.id ? COLORS.primary : COLORS.border,
                        },
                      ]}
                      onPress={() => setSelectedTierId(t.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tierChipText,
                          { color: selectedTierId === t.id ? COLORS.primary : COLORS.text },
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Expires At (optional)</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    {
                      backgroundColor: COLORS.cardBackground,
                      color: COLORS.text,
                      borderColor: COLORS.border,
                    },
                  ]}
                  placeholder="e.g. 2026-12-31"
                  placeholderTextColor={COLORS.muted}
                  value={expiresAt}
                  onChangeText={setExpiresAt}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: COLORS.primary, opacity: changeTierLoading ? 0.6 : 1 }]}
                  onPress={handleChangeTier}
                  disabled={changeTierLoading}
                  activeOpacity={0.7}
                >
                  {changeTierLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Update Subscription</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Tier Create/Edit Modal ────────────────────────────────────────────── */}
      <Modal visible={tierFormVisible} transparent animationType="slide" onRequestClose={() => setTierFormVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetFull, { backgroundColor: COLORS.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>
                {editingTier ? 'Edit Tier' : 'Create Tier'}
              </Text>
              <TouchableOpacity onPress={() => setTierFormVisible(false)}>
                <X size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {editingTier && (
                <View style={[styles.readOnlyRow, { borderColor: COLORS.border }]}>
                  <Text style={[styles.readOnlyLabel, { color: COLORS.textSecondary }]}>ID</Text>
                  <Text style={[styles.readOnlyValue, { color: COLORS.text }]}>{tierForm.id}</Text>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Name *</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: COLORS.cardBackground,
                    color: COLORS.text,
                    borderColor: COLORS.border,
                  },
                ]}
                placeholder="Tier name"
                placeholderTextColor={COLORS.muted}
                value={tierForm.name}
                onChangeText={v => setTierForm(p => ({ ...p, name: v }))}
              />

              <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Description</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.multiline,
                  {
                    backgroundColor: COLORS.cardBackground,
                    color: COLORS.text,
                    borderColor: COLORS.border,
                  },
                ]}
                placeholder="Short description"
                placeholderTextColor={COLORS.muted}
                value={tierForm.description}
                onChangeText={v => setTierForm(p => ({ ...p, description: v }))}
                multiline
              />

              <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Price *</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: COLORS.cardBackground,
                    color: COLORS.text,
                    borderColor: COLORS.border,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={COLORS.muted}
                value={tierForm.price}
                onChangeText={v => setTierForm(p => ({ ...p, price: v }))}
                keyboardType="decimal-pad"
              />

              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Currency</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      {
                        backgroundColor: COLORS.cardBackground,
                        color: COLORS.text,
                        borderColor: COLORS.border,
                      },
                    ]}
                    value={tierForm.currency}
                    onChangeText={v => setTierForm(p => ({ ...p, currency: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Interval</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {INTERVAL_OPTIONS.map(i => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.intervalChip,
                          {
                            backgroundColor: tierForm.interval === i ? COLORS.primary + '20' : COLORS.cardBackground,
                            borderColor: tierForm.interval === i ? COLORS.primary : COLORS.border,
                          },
                        ]}
                        onPress={() => setTierForm(p => ({ ...p, interval: i }))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: tierForm.interval === i ? COLORS.primary : COLORS.text,
                          }}
                        >
                          {i}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {editingTier && tierForm.stripePriceId && (
                <View style={[styles.readOnlyRow, { borderColor: COLORS.border }]}>
                  <Text style={[styles.readOnlyLabel, { color: COLORS.textSecondary }]}>Stripe Price ID</Text>
                  <Text style={[styles.readOnlyValue, { color: COLORS.text }]}>{tierForm.stripePriceId}</Text>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Features (one per line)</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.multiline,
                  {
                    backgroundColor: COLORS.cardBackground,
                    color: COLORS.text,
                    borderColor: COLORS.border,
                  },
                ]}
                placeholder="Full Bible access&#10;Audio Bible&#10;Journaling"
                placeholderTextColor={COLORS.muted}
                value={tierForm.features}
                onChangeText={v => setTierForm(p => ({ ...p, features: v }))}
                multiline
              />

              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Sort Order</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      {
                        backgroundColor: COLORS.cardBackground,
                        color: COLORS.text,
                        borderColor: COLORS.border,
                      },
                    ]}
                    placeholder="0"
                    placeholderTextColor={COLORS.muted}
                    value={tierForm.sortOrder}
                    onChangeText={v => setTierForm(p => ({ ...p, sortOrder: v }))}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Max Slots</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      {
                        backgroundColor: COLORS.cardBackground,
                        color: COLORS.text,
                        borderColor: COLORS.border,
                      },
                    ]}
                    placeholder="null = unlimited"
                    placeholderTextColor={COLORS.muted}
                    value={tierForm.maxSlots}
                    onChangeText={v => setTierForm(p => ({ ...p, maxSlots: v }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Active</Text>
                <Switch
                  value={tierForm.isActive}
                  onValueChange={v => setTierForm(p => ({ ...p, isActive: v }))}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={COLORS.border}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: COLORS.primary, opacity: tierFormLoading ? 0.6 : 1, marginTop: 20 }]}
                onPress={handleSaveTier}
                disabled={tierFormLoading}
                activeOpacity={0.7}
              >
                {tierFormLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{editingTier ? 'Update Tier' : 'Create Tier'}</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: { fontSize: 13, fontWeight: '700' },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 12 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // Total row
  totalRow: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalText: { fontSize: 14, fontWeight: '700' },

  // Search
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 15 },

  // User card
  userCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  userInfo: {},
  userName: { fontSize: 15, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierText: { fontSize: 12, fontWeight: '700' },
  slotText: { fontSize: 12, fontWeight: '500' },
  detailText: { fontSize: 12, marginTop: 4 },
  suspendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700' },

  // Tiers
  tiersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  tierCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  tierCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierName: { fontSize: 16, fontWeight: '800' },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierPrice: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  tierActions: {
    flexDirection: 'row',
    gap: 6,
  },
  tierActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierDesc: { fontSize: 13, marginTop: 6 },
  tierMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tierMeta: { fontSize: 11, fontWeight: '500' },
  featuresList: { marginTop: 8, gap: 4 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  featureBullet: { fontSize: 14, fontWeight: '700', marginTop: -1 },
  featureText: { fontSize: 13, flex: 1 },

  // Seed button
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 6,
  },
  seedBtnText: { fontSize: 13, fontWeight: '600' },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalSheetFull: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingVertical: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },

  // Fields
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },

  readOnlyRow: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  readOnlyLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  readOnlyValue: { fontSize: 14, fontWeight: '500' },

  // Tier picker in change tier modal
  tierPickerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tierChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  tierChipText: { fontSize: 13, fontWeight: '600' },

  // Interval chips
  intervalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },

  // Switch row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  // Submit
  submitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Sync banner
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  syncBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  syncBannerTitle: { fontSize: 13, fontWeight: '700' },
  syncBannerSub: { fontSize: 11, marginTop: 1 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  syncBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Filter chip
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },

  // Out-of-sync row inside card
  outOfSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
  },
  outOfSyncText: { fontSize: 11, color: '#F59E0B', fontWeight: '600', flex: 1 },

  // Stripe-only badge
  stripeOnlyBadge: {
    backgroundColor: '#EF444415',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  stripeOnlyText: { fontSize: 11, color: '#EF4444', fontWeight: '700' },

  // Sync single btn
  syncSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});

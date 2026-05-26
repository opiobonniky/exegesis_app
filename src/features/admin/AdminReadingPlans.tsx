/**
 * AdminReadingPlans.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reading plans management for admins - list only (create/edit use separate screens)
 */

import React, { useEffect, useState, useCallback, useContext } from 'react';
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
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { route } from '../../component/navigations/routes';
import {
  getAllReadingPlansAdmin,
  deleteReadingPlan,
  ReadingPlan,
} from '../../services/adminApi';
import BottomTab from '../../component/navigations/BottomTab';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useLanguage, isRtlLanguage } from '../../component/language-translation/LanguageProvider';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  Calendar,
  BarChart3,
  HelpCircle,
  ToggleLeft,
  Trash2,
  Edit2,
  PieChart,
} from 'lucide-react-native';
import { showToast } from '../../helpers/Toash.helper';

const getReadingPlansTheme = (isDark: boolean) => {
  const colors = getColors(isDark);
  return {
    bg: colors.background,
    surface: colors.surface,
    cardBackground: colors.cardBackground,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    muted: colors.muted,
    primary: colors.primary,
    success: colors.success,
    successLight: `${colors.success}33`,
    error: colors.error,
    inactiveBg: colors.surface,
    inactiveText: colors.muted,
    shadowColor: colors.shadowColor,
  };
};

const difficultyColors = {
  easy: '#059669',
  medium: '#d97706',
  hard: '#dc2626',
  default: '#78716c',
};

const AdminReadingPlans: React.FC = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const { language, translations } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const ac = translations?.admin;
  const theme = getReadingPlansTheme(isDark);
  const styles = getStyles(theme, isRtl);

  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('adminPlans');

  const fetchPlans = useCallback(async (pg: number = 1) => {
    try {
      const response = await getAllReadingPlansAdmin(pg, 20);
      setPlans(response.plans || []);
      setTotalPages(response.totalPages);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlans(page);
    setRefreshing(false);
  }, [fetchPlans, page]);

  const handleDelete = (plan: ReadingPlan) => {
    const cancelText = ac?.readingPlanCancelBtn || 'Cancel';
    const deleteText = ac?.readingPlanDeleteBtn || 'Delete';
    Alert.alert(
      ac?.readingPlanDeleteTitle || 'Delete Plan',
      (ac?.readingPlanDeleteMessage || 'Are you sure you want to delete "{title}"? This action cannot be undone.').replace('{title}', plan.title || ''),
      [
        { text: cancelText, style: 'cancel' },
        {
          text: deleteText,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReadingPlan(plan.planId);
              setPlans(prev => prev.filter(p => p.planId !== plan.planId));
              showToast('success', ac?.readingPlanDeletedToast || 'Plan deleted successfully');
            } catch (error) {
              showToast('error', ac?.readingPlanFailedDelete || 'Failed to delete plan');
            }
          },
        },
      ],
    );
  };

  const handleEdit = (plan: ReadingPlan) => {
    navigation.navigate('EditReadingPlan', { planId: plan.planId });
  };

  const handleViewDetails = (plan: ReadingPlan) => {
    navigation.navigate(route.adminReadingPlanDetail, { planId: plan.planId });
  };

  const handleCreate = () => {
    navigation.navigate('CreateReadingPlan');
  };

  const difficultyColor = (diff?: string) => {
    const key = diff?.toLowerCase() as keyof typeof difficultyColors;
    return difficultyColors[key] || difficultyColors.default;
  };

  const renderPlan = ({ item }: { item: ReadingPlan }) => (
    <View style={styles.planCard}>
      <View style={[styles.planHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={styles.planInfo}>
          <Text style={[styles.planTitle, { textAlign: isRtl ? 'right' : 'left' }]}>{item.title}</Text>
          <View style={[styles.planMeta, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.daysContainer, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Calendar size={12} color={theme.muted} />
              <Text style={styles.planDays}>
                {(ac?.readingPlanDays || '{count} days').replace('{count}', String(item.totalDays || 0))}
              </Text>
            </View>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: difficultyColor(item.difficulty) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  { color: difficultyColor(item.difficulty) },
                ]}
              >
                {item.difficulty}
              </Text>
            </View>
            {item.questionsEnabled && (
              <View style={[styles.quizBadge, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <HelpCircle size={10} color="#7c3aed" />
                <Text style={styles.quizText}>{ac?.readingPlanQuiz || 'Quiz'}</Text>
              </View>
            )}
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.isActive ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.isActive
                ? styles.statusTextActive
                : styles.statusTextInactive,
              { textAlign: isRtl ? 'right' : 'left' },
            ]}
          >
            {item.isActive ? '●' : '○'} {item.isActive ? (ac?.readingPlanActiveStatus || 'Active') : (ac?.readingPlanInactiveStatus || 'Inactive')}
          </Text>
        </View>
      </View>

      {item.description && (
        <Text style={[styles.planDescription, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={[styles.planFooter, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.categoryContainer, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <BookOpen size={12} color={theme.muted} />
          <Text style={[styles.planCategory, { textAlign: isRtl ? 'right' : 'left' }]}>{item.category}</Text>
        </View>
        <View style={[styles.actionButtons, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => handleViewDetails(item)}
          >
            <PieChart size={16} color={theme.success} />
            <Text style={styles.statsButtonText}>{ac?.readingPlanStatsLabel || 'Stats'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <Edit2 size={16} color={theme.primary} />
            <Text style={styles.editButtonText}>{ac?.readingPlanEditLabel || 'Edit'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={16} color={theme.error} />
            <Text style={styles.deleteButtonText}>{ac?.readingPlanDeleteLabel || 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <BookOpen size={48} color={theme.muted} />
      <Text style={styles.emptyText}>{ac?.readingPlanNoPlans || 'No reading plans yet'}</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreate}>
        <Plus size={18} color="#fff" />
        <Text style={styles.emptyButtonText}>{ac?.readingPlanCreateFirst || 'Create First Plan'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            {isRtl ? <ChevronRight size={20} color={theme.primary} /> : <ChevronLeft size={20} color={theme.primary} />}
          </TouchableOpacity>
          <Text style={styles.title}>{ac?.readingPlanTitle || 'Reading Plans'}</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {totalCount === 1
            ? (ac?.readingPlanSubtitle || '{count} plan').replace('{count}', String(totalCount))
            : (ac?.readingPlanSubtitlePlural || '{count} plans').replace('{count}', String(totalCount))}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <BarChart3 size={20} color={theme.primary} />
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>{ac?.readingPlanTotalPlans || 'Total Plans'}</Text>
        </View>
        <View style={styles.statCard}>
          <BookOpen size={20} color={theme.success} />
          <Text style={styles.statValue}>
            {plans.filter(p => p.isActive).length}
          </Text>
          <Text style={styles.statLabel}>{ac?.readingPlanActive || 'Active'}</Text>
        </View>
        <View style={styles.statCard}>
          <HelpCircle size={20} color="#7c3aed" />
          <Text style={styles.statValue}>
            {plans.filter(p => p.questionsEnabled).length}
          </Text>
          <Text style={styles.statLabel}>{ac?.readingPlanWithQuiz || 'With Quiz'}</Text>
        </View>
      </View>

      {/* Plans List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <FlatList
            data={plans}
            renderItem={renderPlan}
            keyExtractor={item => item.planId}
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
    </SafeAreaView>
  );
};

const getStyles = (theme: ReturnType<typeof getReadingPlansTheme>, isRtl: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      padding: 16,
      paddingTop: 8,
      backgroundColor: theme.surface,
    },
    headerTop: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      flex: 1,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    addButton: {
      backgroundColor: theme.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.cardBackground,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
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
    planCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    planHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
    },
    planInfo: {
      flex: 1,
    },
    planTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    planMeta: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    daysContainer: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
    },
    planDays: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    difficultyBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    difficultyText: {
      fontSize: 10,
      fontWeight: '600',
    },
    quizBadge: {
      backgroundColor: '#ede9fe',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
    },
    quizText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#7c3aed',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    statusActive: {
      backgroundColor: theme.successLight,
    },
    statusInactive: {
      backgroundColor: theme.inactiveBg,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '500',
    },
    statusTextActive: {
      color: theme.success,
    },
    statusTextInactive: {
      color: theme.inactiveText,
    },
    planDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 8,
      lineHeight: 18,
    },
    planFooter: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    categoryContainer: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
    },
    planCategory: {
      fontSize: 12,
      color: theme.muted,
    },
    actionButtons: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      gap: 8,
    },
    editButton: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    editButtonText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '500',
    },
    statsButton: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    statsButtonText: {
      color: theme.success,
      fontSize: 13,
      fontWeight: '500',
    },
    deleteButton: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    deleteButtonText: {
      color: theme.error,
      fontSize: 13,
      fontWeight: '500',
    },
    empty: {
      padding: 48,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 12,
      marginBottom: 16,
    },
    emptyButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
    },
    emptyButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    bottomPadding: {
      height: 80,
    },
  });

export default AdminReadingPlans;

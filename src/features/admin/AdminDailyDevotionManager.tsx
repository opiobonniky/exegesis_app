/**
 * AdminDailyDevotionManager.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Daily devotion management for admins
 */

import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getAllDailyDevotions,
  deleteDailyDevotion,
  DailyDevotion,
} from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  Plus,
  CheckCircle2,
  Trash2,
  Pencil,
  Lightbulb,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../../helpers/Toash.helper';
import { useLanguage } from '../../component/language-translation/LanguageProvider';

const getTheme = (isDark: boolean) => {
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
    error: colors.error,
  };
};

const getLocale = (language: string) => {
  switch (language) {
    case 'ar': return 'ar-SA';
    case 'fr': return 'fr-FR';
    case 'es': return 'es-ES';
    default: return 'en-US';
  }
};

const AdminDailyDevotionManager: React.FC = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = getTheme(isDark);
  const { language, translations } = useLanguage();
  const isRtl = language === 'ar';
  const ac = translations?.admin;
  const locale = getLocale(language);
  const styles = getStyles(theme, isRtl);

  const [devotions, setDevotions] = useState<DailyDevotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevotions = useCallback(async () => {
    try {
      const response = await getAllDailyDevotions(0, 12, {
        smartDefault: true,
        futureDays: 30,
      });

      console.log('Fetched daily devotions:', response.content || []);
      setDevotions(response.content || []);
    } catch (error) {
      console.error('Failed to fetch daily devotions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDevotions();
    }, [fetchDevotions]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevotions();
    setRefreshing(false);
  }, [fetchDevotions]);

  const handleAddPress = () => {
    navigation.navigate('AddDailyDevotion');
  };

  const handleEditPress = (devotion: DailyDevotion) => {
    navigation.navigate('EditDailyDevotion', { devotion });
  };

  const handleDelete = (devotion: DailyDevotion) => {
    Alert.alert(
      ac?.devotionManagerDeleteTitle || 'Delete Devotion',
      ac?.devotionManagerDeleteMessage || 'Are you sure you want to delete this daily devotion?',
      [
        { text: ac?.devotionManagerCancelBtn || 'Cancel', style: 'cancel' as const },
        {
          text: ac?.devotionManagerDeleteBtn || 'Delete',
          style: 'destructive' as const,
          onPress: async () => {
            try {
              await deleteDailyDevotion(devotion.id);
              setDevotions(prev => prev.filter(d => d.id !== devotion.id));
              showToast('success', ac?.devotionManagerDeletedToast || 'Devotion deleted successfully');
            } catch (error) {
              Alert.alert('Error', ac?.devotionManagerDeleteFailed || 'Failed to delete devotion');
            }
          },
        },
      ],
    );
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderDevotion = ({ item }: { item: DailyDevotion }) => (
    <View
      style={[
        styles.devotionCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={[styles.devotionHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.devotionTitleRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Lightbulb size={16} color={theme.primary} />
          <Text style={[styles.devotionTitle, { color: theme.text, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        {item.isPublished ? (
          <CheckCircle2 size={14} color={theme.success} />
        ) : null}
      </View>

      <Text style={[styles.devotionContent, { color: theme.textSecondary, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={3}>
        {item.content}
      </Text>

      {item.bookName && (
        <Text style={[styles.devotionRef, { color: theme.primary, textAlign: isRtl ? 'right' : 'left' }]}>
          {item.bookName} {item.chapter}:{item.verseNumber}
        </Text>
      )}

      <View style={[styles.devotionFooter, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.dateBadge, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Calendar size={12} color={theme.muted} />
          <Text style={[styles.devotionDate, { color: theme.muted }]}>
            {(() => {
              const date = item.displayDate
                ? new Date(item.displayDate)
                : null;
              return date && !isNaN(date.getTime())
                ? formatDate(date)
                : (ac?.devotionManagerNA || 'N/A');
            })()}
          </Text>
          {(() => {
            if (!item.displayTime) return null;
            const date = new Date(item.displayTime);
            return !isNaN(date.getTime()) ? (
              <Text style={[styles.devotionTime, { color: theme.muted, marginHorizontal: isRtl ? 0 : 8, marginLeft: isRtl ? 0 : 8, marginRight: isRtl ? 8 : 0 }]}>
                {formatTime(date)}
              </Text>
            ) : null;
          })()}
        </View>

        <View style={[styles.actionButtons, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surface }]}
            onPress={() => handleEditPress(item)}
          >
            <Pencil size={16} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surface }]}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={16} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          {isRtl ? (
            <ChevronRight size={24} color={theme.primary} />
          ) : (
            <ChevronLeft size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {ac?.devotionManagerTitle || 'Daily Devotions'}
        </Text>
        <TouchableOpacity onPress={handleAddPress} style={styles.addBtn}>
          <Plus size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {devotions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Lightbulb size={48} color={theme.muted} />
          <Text style={[styles.emptyText, { color: theme.muted, textAlign: isRtl ? 'right' : 'center' }]}>
            {ac?.devotionManagerNoDevotions || 'No devotions yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.muted, textAlign: isRtl ? 'right' : 'center' }]}>
            {ac?.devotionManagerNoDevotionsSub || 'Tap + to add your first devotion'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={devotions}
          renderItem={renderDevotion}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme: ReturnType<typeof getTheme>, isRtl: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    backBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    addBtn: {
      padding: 8,
    },
    listContent: {
      padding: 16,
    },
    devotionCard: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    devotionHeader: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    devotionTitleRow: {
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    devotionTitle: {
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    devotionContent: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    devotionRef: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 12,
    },
    devotionFooter: {
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateBadge: {
      alignItems: 'center',
      gap: 4,
    },
    devotionDate: {
      fontSize: 12,
    },
    devotionTime: {
      fontSize: 12,
    },
    actionButtons: {
      gap: 8,
    },
    actionBtn: {
      padding: 8,
      borderRadius: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 8,
    },
  });

export default AdminDailyDevotionManager;

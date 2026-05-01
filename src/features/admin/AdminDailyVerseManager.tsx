/**
 * AdminDailyVerseManager.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Daily verse management for admins - improved version with theme support
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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getAllDailyVerses,
  deleteDailyVerse,
  DailyVerse,
} from '../../services/adminApi';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import {
  ChevronLeft,
  Plus,
  CheckCircle2,
  Trash2,
  Pencil,
  Sun,
  User,
  Clock,
  Book,
  Calendar,
} from 'lucide-react-native';
import BottomTab from '../../component/navigations/BottomTab';
import { showToast } from '../../helpers/Toash.helper';
import { getVerseText } from '../../utilits/bibleUtils';

export interface ExtendedDailyVerse extends DailyVerse {
  creatorName?: string;
}

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

const AdminDailyVerseManager: React.FC = () => {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const isDark = app?.isDark ?? false;
  const theme = getTheme(isDark);
  const styles = getStyles(theme);

  const [verses, setVerses] = useState<ExtendedDailyVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('adminVerse');

  const fetchVerses = useCallback(async () => {
    try {
      const response = await getAllDailyVerses(0, 12, {
        smartDefault: true,
        futureDays: 30,
      });

      console.log('Fetched daily verses:', response.content || []);
      setVerses((response.content as ExtendedDailyVerse[]) || []);
    } catch (error) {
      console.error('Failed to fetch daily verses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVerses();
    }, [fetchVerses]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVerses();
    setRefreshing(false);
  }, [fetchVerses]);

  const handleAddPress = () => {
    navigation.navigate('AddDailyVerse');
  };

  const handleEditPress = (verse: DailyVerse) => {
    navigation.navigate('EditDailyVerse', { verse });
  };

  const handleDelete = (verse: DailyVerse) => {
    Alert.alert(
      'Delete Verse',
      'Are you sure you want to delete this daily verse?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDailyVerse(verse.id);
              setVerses(prev => prev.filter(v => v.id !== verse.id));
              showToast('success', 'Verse deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete verse');
            }
          },
        },
      ],
    );
  };

  const renderVerse = ({ item }: { item: ExtendedDailyVerse }) => (
    <View
      style={[
        styles.verseCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={styles.verseHeader}>
        <View style={styles.verseRef}>
          <Book size={16} color={theme.primary} />
          <Text style={[styles.verseRefText, { color: theme.text }]}>
            {item.bookName} {item.chapter}:{item.verseNumber}
          </Text>
          {item.isPublished ? (
            <CheckCircle2 size={14} color={theme.success} />
          ) : null}
        </View>
        <View style={styles.dateBadge}>
          <Calendar size={12} color={theme.muted} />
          <Text style={[styles.verseDate, { color: theme.muted }]}>
            {item.displayDate && typeof item.displayDate === 'string'
              ? new Date(item.displayDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.verseContentContainer}>
        <Text style={[styles.verseText, { color: theme.textSecondary }]}>
          "{getVerseText(item.bookName, item.chapter, item.verseNumber)}"
        </Text>
      </View>

      {item.reflection && (
        <View
          style={[
            styles.reflectionContainer,
            { backgroundColor: isDark ? '#ffffff05' : '#f8fafc' },
          ]}
        >
          <Text style={[styles.reflectionLabel, { color: theme.muted }]}>
            REFLECTION
          </Text>
          <Text
            style={[styles.verseReflection, { color: theme.textSecondary }]}
            numberOfLines={3}
          >
            {item.reflection}
          </Text>
        </View>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <User size={12} color={theme.muted} />
          <Text style={[styles.metaText, { color: theme.muted }]}>
            {item.creatorName || 'System'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={12} color={theme.muted} />
          <Text style={[styles.metaText, { color: theme.muted }]}>
            {item.createdOn
              ? new Date(item.createdOn).toLocaleDateString()
              : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.verseActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: `${theme.primary}10` },
          ]}
          onPress={() => handleEditPress(item)}
        >
          <Pencil size={14} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.primary }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: `${theme.error}10` }]}
          onPress={() => handleDelete(item)}
        >
          <Trash2 size={14} color={theme.error} />
          <Text style={[styles.actionButtonText, { color: theme.error }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Sun size={48} color={theme.muted} />
      <Text style={[styles.emptyText, { color: theme.muted }]}>
        No daily verses found
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: theme.primary }]}
        onPress={handleAddPress}
      >
        <Text style={styles.emptyButtonText}>Add First Verse</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sun size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>
            Daily Verses
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={handleAddPress}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <FlatList
            data={verses}
            renderItem={renderVerse}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
          <View style={styles.bottomPadding}>
            <BottomTab activeTab={activeTab} setActiveTab={setActiveTab} />
          </View>
        </>
      )}
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    list: {
      padding: 16,
    },
    verseCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },
    verseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    verseRef: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    verseRefText: {
      fontSize: 16,
      fontWeight: '700',
    },
    verseDate: {
      fontSize: 12,
    },
    verseReflection: {
      fontSize: 13,
      marginTop: 8,
    },
    verseActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 15,
      marginTop: 12,
      marginBottom: 16,
    },
    emptyButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    emptyButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    bottomPadding: {
      height: 80,
    },
    verseText: {
      fontSize: 15,
      fontStyle: 'italic',
      lineHeight: 22,
    },
    dateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.03)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    verseContentContainer: {
      marginTop: 12,
      paddingHorizontal: 4,
    },
    reflectionContainer: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      gap: 4,
    },
    reflectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 12,
      paddingHorizontal: 4,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      fontWeight: '500',
    },
  });

export default AdminDailyVerseManager;

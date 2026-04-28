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
import { useNavigation } from '@react-navigation/native';
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
} from 'lucide-react-native';
import BottomTab from '../../component/navigations/BottomTab';
import { showToast } from '../../helpers/Toash.helper';

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

  const [verses, setVerses] = useState<DailyVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('adminVerse');

  const fetchVerses = useCallback(async () => {
    try {
      const response = await getAllDailyVerses(0, 12, {
        smartDefault: true,
        futureDays: 30,
      });
      setVerses(response.content || []);
    } catch (error) {
      console.error('Failed to fetch daily verses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerses();
  }, [fetchVerses]);

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

  const renderVerse = ({ item }: { item: DailyVerse }) => (
    <View style={[styles.verseCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.verseHeader}>
        <View style={styles.verseRef}>
          <Text style={[styles.verseRefText, { color: theme.text }]}>
            {item.bookName} {item.chapter}:{item.verseNumber}
          </Text>
          {item.isPublished ? (
            <CheckCircle2 size={14} color={theme.success} />
          ) : null}
        </View>
        <Text style={[styles.verseDate, { color: theme.muted }]}>
          {item.displayDate ? new Date(item.displayDate).toLocaleDateString() : '—'}
        </Text>
      </View>

      {item.reflection && (
        <Text style={[styles.verseReflection, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.reflection}
        </Text>
      )}

      <View style={styles.verseActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEditPress(item)}>
          <Pencil size={14} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
          <Trash2 size={14} color={theme.error} />
          <Text style={[styles.actionButtonText, { color: theme.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Sun size={48} color={theme.muted} />
      <Text style={[styles.emptyText, { color: theme.muted }]}>No daily verses found</Text>
      <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.primary }]} onPress={handleAddPress}>
        <Text style={styles.emptyButtonText}>Add First Verse</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sun size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Daily Verses</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleAddPress}>
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
      gap: 16,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '500',
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
  });

export default AdminDailyVerseManager;
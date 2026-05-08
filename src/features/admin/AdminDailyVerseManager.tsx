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
  Clock,
  Book,
  Calendar,
  Lightbulb,
  Quote,
  XCircle,
  BookOpen,
} from 'lucide-react-native';
import { getVerseText } from '../../utilits/bibleUtils';
import { getVersionById } from '../../assets/bibleVersion/json/bibleVersions';
import BottomTab from '../../component/navigations/BottomTab';
import { showToast } from '../../helpers/Toash.helper';

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

  const renderVerse = ({ item }: { item: ExtendedDailyVerse }) => {
    const formattedDate = item.displayDate && typeof item.displayDate === 'string'
      ? new Date(item.displayDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—';

    return (
      <View
        style={[
          styles.verseCard,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <View style={[styles.verseAccentBar, { backgroundColor: theme.primary }]} />
        <View style={styles.verseCardInner}>
          {/* Header: Reference + Version + Actions */}
          <View style={styles.verseHeader}>
            <View style={styles.verseRef}>
              <Book size={14} color={theme.primary} />
              <Text style={[styles.verseRefText, { color: theme.text }]}>
                {item.bookName} {item.chapter}:{item.verseNumber}
              </Text>
              {item.bibleVersion && (
                <View style={[styles.versionBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.versionText, { color: theme.primary }]}>
                    {item.bibleVersion}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.verseActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: `${theme.primary}10` }]}
                onPress={() => handleEditPress(item)}
              >
                <Pencil size={12} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: `${theme.error}10` }]}
                onPress={() => handleDelete(item)}
              >
                <Trash2 size={12} color={theme.error} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Verse Text */}
          <View style={styles.verseContentContainer}>
            <Text style={styles.openQuote}>"</Text>
            <Text style={[styles.verseText, { color: theme.textSecondary }]}>
              {getVerseText(
                item.bookName,
                item.chapter,
                item.verseNumber,
                item.bibleVersion ? getVersionById(item.bibleVersion).load() : undefined
              ) || '—'}
              "
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Info Row: Status + Date */}
          <View style={styles.infoRow}>
            {item.isPublished ? (
              <View style={[styles.statusBadge, { backgroundColor: `${theme.success}15` }]}>
                <CheckCircle2 size={10} color={theme.success} />
                <Text style={[styles.statusText, { color: theme.success }]}>Published</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: `${theme.error}15` }]}>
                <XCircle size={10} color={theme.error} />
                <Text style={[styles.statusText, { color: theme.error }]}>Draft</Text>
              </View>
            )}
            <View style={styles.dateRow}>
              <Calendar size={10} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{formattedDate}</Text>
            </View>
          </View>

          {/* Explanation Preview */}
          {item.explanation && (
            <View
              style={[
                styles.sectionContainer,
                { backgroundColor: isDark ? '#ffffff08' : '#f0f9ff' },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Lightbulb size={12} color={theme.primary} />
                <Text style={[styles.sectionLabel, { color: theme.primary }]}>EXPLANATION</Text>
              </View>
              <Text style={[styles.sectionText, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.explanation.length > 80 ? item.explanation.substring(0, 80) + '...' : item.explanation}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

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
    container: { flex: 1 },
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
    title: { fontSize: 18, fontWeight: '700' },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 12 },
    verseCard: {
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    verseAccentBar: { height: 4, width: '100%' },
    verseCardInner: { padding: 16 },
    verseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    verseRef: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      flex: 1,
    },
    verseRefText: { fontSize: 13, fontWeight: '700' },
    versionBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    versionText: { fontSize: 9, fontWeight: '700' },
    verseActions: {
      flexDirection: 'row',
      gap: 6,
    },
    verseContentContainer: {
      marginTop: 4,
      marginBottom: 8,
    },
    openQuote: {
      fontSize: 48,
      lineHeight: 36,
      color: theme.primary,
      opacity: 0.25,
      fontStyle: 'italic',
      marginBottom: -8,
    },
    verseText: {
      fontSize: 14,
      fontStyle: 'italic',
      lineHeight: 22,
      color: theme.textSecondary,
    },
    divider: { height: 1, backgroundColor: theme.border, marginBottom: 12 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    statusText: { fontSize: 10, fontWeight: '600' },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: { fontSize: 10, fontWeight: '500' },
    sectionContainer: {
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    sectionText: { fontSize: 11, lineHeight: 16 },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionButtonText: { fontSize: 11, fontWeight: '600' },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyText: { fontSize: 15, marginTop: 12, marginBottom: 16 },
    emptyButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    emptyButtonText: { color: '#fff', fontWeight: '600' },
    bottomPadding: { height: 80 },
  });

export default AdminDailyVerseManager;

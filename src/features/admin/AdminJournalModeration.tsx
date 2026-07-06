import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BookText, CheckCircle2, ChevronLeft, Search, XCircle } from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import {
  AdminJournalEntry,
  getJournalEntriesForAdmin,
  setJournalEntryPublicationForAdmin,
} from '../../services/adminApi';

const FILTERS = ['all', 'published', 'private'] as const;

export default function AdminJournalModeration() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [entries, setEntries] = useState<AdminJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const load = useCallback(async () => {
    try {
      const res = await getJournalEntriesForAdmin({ page: 1, pageSize: 100, search: search.trim() || undefined });
      const next = res.entries || [];
      setEntries(next.filter(entry => {
        if (filter === 'published') return entry.isPublished;
        if (filter === 'private') return !entry.isPublished;
        return true;
      }));
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const setPublication = async (entry: AdminJournalEntry, isPublished: boolean) => {
    try {
      const updated = await setJournalEntryPublicationForAdmin(entry.id, isPublished);
      setEntries(prev => prev.map(item => (item.id === entry.id ? updated : item)));
      showToast('success', isPublished ? 'Journal entry approved' : 'Journal entry rejected');
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to update journal entry');
    }
  };

  const renderItem = ({ item }: { item: AdminJournalEntry }) => {
    const author = item.user?.firstName || item.user?.username || item.user?.email || 'Unknown user';
    const reference = item.bookName
      ? `${item.bookName} ${item.chapter ?? ''}${item.verseNumber ? `:${item.verseNumber}` : ''}`.trim()
      : null;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <BookText size={17} color={COLORS.primary} />
            <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled Journal Entry'}</Text>
          </View>
          {item.isPublished ? <CheckCircle2 size={18} color={COLORS.success} /> : <XCircle size={18} color={COLORS.muted} />}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaChip}>{item.isPublished ? 'Published' : 'Private'}</Text>
          <Text style={styles.metaChip}>{item.category || 'general'}</Text>
          {reference ? <Text style={styles.referenceChip}>{reference}</Text> : null}
        </View>

        <Text style={styles.author}>By {author}</Text>
        <Text style={styles.preview} numberOfLines={4}>{item.content}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => setPublication(item, true)}>
            <CheckCircle2 size={15} color="#fff" />
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => setPublication(item, false)}>
            <XCircle size={15} color="#fff" />
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal Moderation</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            placeholder="Search journal entries"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filters}>
          {FILTERS.map(item => {
            const active = filter === item;
            return (
              <TouchableOpacity key={item} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilter(item)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.charAt(0).toUpperCase() + item.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={entries.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No journal entries found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  toolbar: { padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.cardBackground },
  searchInput: { flex: 1, color: COLORS.text, padding: 0 },
  filters: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, paddingBottom: 40 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontWeight: '700' },
  card: { backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  metaChip: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  referenceChip: { color: COLORS.primary, fontSize: 11, fontWeight: '800', backgroundColor: COLORS.selectedItem, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  author: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginTop: 10 },
  preview: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionButton: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  approveButton: { backgroundColor: COLORS.success },
  rejectButton: { backgroundColor: COLORS.error },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});

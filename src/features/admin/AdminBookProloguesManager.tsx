import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { BookOpen, ChevronLeft, Pencil, Plus, Search, Trash2 } from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import { BookPrologue, deleteAdminBookPrologue, getAllAdminBookPrologues } from '../../services/bookProloguesApi';

export default function AdminBookProloguesManager() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [items, setItems] = useState<BookPrologue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getAllAdminBookPrologues({ page: 0, pageSize: 100, search: search.trim() || undefined });
      setItems(res.data || []);
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load book prologues');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmDelete = (item: BookPrologue) => {
    Alert.alert('Delete Book Prologue', `Delete ${item.bookName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAdminBookPrologue(item.bookName);
            setItems(prev => prev.filter(p => p.bookName !== item.bookName));
            showToast('success', 'Book prologue deleted');
          } catch (error: any) {
            showToast('error', error?.message || 'Failed to delete book prologue');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: BookPrologue }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <BookOpen size={17} color={COLORS.primary} />
          <Text style={styles.title}>{item.bookName}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('EditBookPrologue', { prologue: item })}>
            <Pencil size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => confirmDelete(item)}>
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.theme} numberOfLines={1}>{item.keyTheme || 'No key theme set'}</Text>
      <Text style={styles.preview} numberOfLines={3}>{item.summary || 'No summary set.'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Prologues</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AddBookPrologue')}>
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.muted} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} onSubmitEditing={load} placeholder="Search books" placeholderTextColor={COLORS.muted} returnKeyType="search" />
        </View>
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.bookName}
          renderItem={renderItem}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No book prologues found.</Text>}
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
  toolbar: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.cardBackground },
  searchInput: { flex: 1, color: COLORS.text, padding: 0 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, paddingBottom: 40 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontWeight: '700' },
  card: { backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  theme: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 10 },
  preview: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 },
});

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
import {
  BookOpen,
  ChevronLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import { showToast } from '../../helpers/Toash.helper';
import {
  ChapterStudyToolItem,
  deleteAdminStudyTool,
  getAllAdminStudyTools,
  TOOL_TYPE_LABELS,
  TOOL_TYPE_ORDER,
  ToolType,
} from '../bible/services/studyToolsApi';

const FILTERS = ['all', ...TOOL_TYPE_ORDER] as const;

export default function AdminStudyToolsManager() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [items, setItems] = useState<ChapterStudyToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toolType, setToolType] = useState<(typeof FILTERS)[number]>('all');

  const load = useCallback(async () => {
    try {
      const res = await getAllAdminStudyTools({
        page: 0,
        pageSize: 100,
        search: search.trim() || undefined,
        toolType: toolType === 'all' ? undefined : toolType,
      });
      setItems(res.data || []);
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load study tools');
    } finally {
      setLoading(false);
    }
  }, [search, toolType]);

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

  const confirmDelete = (item: ChapterStudyToolItem) => {
    Alert.alert('Delete Study Tool', `Delete "${item.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAdminStudyTool(Number(item.id));
            setItems(prev => prev.filter(tool => tool.id !== item.id));
            showToast('success', 'Study tool deleted');
          } catch (error: any) {
            showToast('error', error?.message || 'Failed to delete study tool');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ChapterStudyToolItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <BookOpen size={17} color={COLORS.primary} />
          <Text style={styles.title} numberOfLines={2}>
            {item.label}
          </Text>
        </View>
        <Text style={styles.orderText}>#{item.order ?? 0}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.referenceChip}>{item.bookName} {item.chapter}</Text>
        <Text style={styles.metaChip}>{TOOL_TYPE_LABELS[item.toolType]}</Text>
      </View>

      {item.description ? (
        <Text style={styles.preview} numberOfLines={3}>{item.description}</Text>
      ) : null}

      {Array.isArray(item.verseRefs) && item.verseRefs.length ? (
        <Text style={styles.verses} numberOfLines={2}>
          Verses: {item.verseRefs.map(ref => ref.verse).join(', ')}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.metaText}>{item.strongsIds?.length ? `${item.strongsIds.length} Strong's links` : 'No Strong\'s links'}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('EditStudyTool', { tool: item })}
          >
            <Pencil size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => confirmDelete(item)}>
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Tools</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AddStudyTool')}>
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            placeholder="Search study tools"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filters}>
          {FILTERS.map(filter => {
            const active = toolType === filter;
            const label = filter === 'all' ? 'All' : TOOL_TYPE_LABELS[filter as ToolType];
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setToolType(filter)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BookOpen size={34} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No study tools found</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddStudyTool')}>
                <Text style={styles.primaryButtonText}>Add Study Tool</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  toolbar: { padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: COLORS.cardBackground,
  },
  searchInput: { flex: 1, color: COLORS.text, padding: 0 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, paddingBottom: 40 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '800' },
  orderText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  referenceChip: { color: COLORS.primary, fontSize: 11, fontWeight: '800', backgroundColor: COLORS.selectedItem, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaChip: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  preview: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  verses: { color: COLORS.muted, fontSize: 12, marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  metaText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
});

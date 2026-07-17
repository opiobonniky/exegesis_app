import React, { useCallback, useContext, useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
  BookText,
  Check,
  ChevronDown,
  ChevronLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  ScrollText,
  Languages,
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

const BIBLE_BOOKS_OT = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes',
  'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
];

const BIBLE_BOOKS_NT = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus',
  'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John',
  '3 John', 'Jude', 'Revelation',
];

const ALL_BOOKS = [...BIBLE_BOOKS_OT, ...BIBLE_BOOKS_NT];

export default function AdminStudyToolsManager() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [items, setItems] = useState<ChapterStudyToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [toolType, setToolType] = useState<(typeof FILTERS)[number]>('all');
  const [showBookFilter, setShowBookFilter] = useState(false);
  const [bookFilter, setBookFilter] = useState('');
  const [covenant, setCovenant] = useState<'all' | 'ot' | 'nt'>('all');
  const [bookSearch, setBookSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getAllAdminStudyTools({
        page: 0,
        pageSize: 100,
        search: searchText.trim() || undefined,
        toolType: toolType === 'all' ? undefined : toolType,
        bookName: bookFilter || undefined,
      });
      setItems(res.data || []);
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load study tools');
    } finally {
      setLoading(false);
    }
  }, [searchText, toolType, bookFilter]);

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

  const filteredBooks = useMemo(() => {
    let books = ALL_BOOKS;
    if (covenant === 'ot') books = BIBLE_BOOKS_OT;
    else if (covenant === 'nt') books = BIBLE_BOOKS_NT;
    if (bookSearch.trim()) {
      const q = bookSearch.toLowerCase();
      books = books.filter(b => b.toLowerCase().includes(q));
    }
    return books;
  }, [covenant, bookSearch]);

  const renderItem = ({ item }: { item: ChapterStudyToolItem }) => {
    const words = item.studyToolWords || [];
    return (
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

        {/* Linked Words Section */}
        {words.length > 0 && (
          <View style={styles.wordsSection}>
            <Text style={styles.wordsSectionTitle}>
              <ScrollText size={12} color={COLORS.primary} /> Linked Words ({words.length})
            </Text>
            <View style={styles.wordsList}>
              {words.map(w => (
                <View key={w.id} style={styles.wordChip}>
                  <Text style={styles.wordSurface}>{w.surfaceText}</Text>
                  <Text style={styles.wordStrongs}>{w.strongsId}</Text>
                  {w.strongs?.originalWord && (
                    <Text style={styles.wordOriginal}>{w.strongs.originalWord}</Text>
                  )}
                  {w.adminExplanation ? (
                    <View style={styles.wordHasExplanation}>
                      <Text style={styles.wordHasExplanationDot}>●</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.metaText}>
            {item.strongsIds?.length ? `${item.strongsIds.length} Strong's IDs` : (words.length ? `${words.length} linked words` : 'No Strong\'s links')}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('AddStudyTool', { tool: item })}
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
  };

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
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={load}
            placeholder="Search study tools"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
          />
        </View>

        {/* Book Filter */}
        <TouchableOpacity
          style={[styles.bookFilterBtn, bookFilter ? styles.bookFilterBtnActive : {}]}
          onPress={() => setShowBookFilter(true)}
        >
          <BookOpen size={14} color={bookFilter ? '#fff' : COLORS.primary} />
          <Text style={[styles.bookFilterText, bookFilter && { color: '#fff' }]}>
            {bookFilter || 'All Books'}
          </Text>
          <ChevronDown size={12} color={bookFilter ? '#fff' : COLORS.muted} />
        </TouchableOpacity>

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

      {/* Book Filter Modal */}
      <Modal visible={showBookFilter} transparent animationType="slide" onRequestClose={() => setShowBookFilter(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: COLORS.surface, maxHeight: '75%' }]}>
            <View style={[styles.modalHeader2, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.modalTitle2, { color: COLORS.text }]}>Filter by Book</Text>
              <TouchableOpacity onPress={() => setShowBookFilter(false)}>
                <X size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox2}>
              <Search size={16} color={COLORS.muted} />
              <TextInput
                style={[styles.modalSearchInput2, { color: COLORS.text }]}
                value={bookSearch}
                onChangeText={setBookSearch}
                placeholder="Search book..."
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.covenantRow2}>
              {(['all', 'ot', 'nt'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.covenantChip2, covenant === c && styles.covenantChipActive2]}
                  onPress={() => setCovenant(c)}
                >
                  <Text style={[styles.covenantChipText2, covenant === c && styles.covenantChipTextActive2]}>
                    {c === 'all' ? 'All' : c === 'ot' ? 'OT' : 'NT'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={filteredBooks}
              keyExtractor={b => b}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem2,
                    { borderBottomColor: COLORS.border },
                    bookFilter === item && { backgroundColor: `${COLORS.primary}15` },
                  ]}
                  onPress={() => {
                    setBookFilter(bookFilter === item ? '' : item);
                    setShowBookFilter(false);
                  }}
                >
                  <Text style={[styles.modalItemText2, { color: bookFilter === item ? COLORS.primary : COLORS.text }, bookFilter === item && { fontWeight: '700' }]}>
                    {item}
                  </Text>
                  {bookFilter === item && <Check size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  toolbar: { padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.cardBackground },
  searchInput: { flex: 1, color: COLORS.text, padding: 0 },
  bookFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBackground, alignSelf: 'flex-start' },
  bookFilterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bookFilterText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
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
  wordsSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  wordsSectionTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  wordsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.selectedItem, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  wordSurface: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  wordStrongs: { color: COLORS.primary, fontSize: 9, fontWeight: '800', backgroundColor: COLORS.primary + '18', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  wordOriginal: { color: COLORS.muted, fontSize: 10, fontStyle: 'italic' },
  wordHasExplanation: { marginLeft: 2 },
  wordHasExplanationDot: { color: '#22c55e', fontSize: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  metaText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34 },
  modalHeader2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle2: { fontSize: 17, fontWeight: '800' },
  modalSearchBox2: { flexDirection: 'row', alignItems: 'center', margin: 12, gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.cardBackground },
  modalSearchInput2: { flex: 1, padding: 0 },
  covenantRow2: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  covenantChip2: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  covenantChipActive2: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  covenantChipText2: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  covenantChipTextActive2: { color: '#fff' },
  modalItem2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalItemText2: { fontSize: 15, flex: 1 },
});
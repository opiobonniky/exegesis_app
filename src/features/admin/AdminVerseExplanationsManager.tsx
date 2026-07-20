import React, { useCallback, useContext, useMemo, useState } from 'react';
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
} from 'lucide-react-native';
import { AppContext } from '../../common/AppContext';
import { getColors } from '../../constants/theme';
import {
  BIBLE_BOOKS_OT,
  BIBLE_BOOKS_NT,
  ALL_BOOKS,
} from '../../constants/bibleBooks';
import { showToast } from '../../helpers/Toash.helper';
import {
  getAllVerseExplanations,
  deleteVerseExplanation,
  VerseExplanationItem,
} from '../../services/adminApi';

export default function AdminVerseExplanationsManager() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);
  const COLORS = getColors(app?.isDark ?? false);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [items, setItems] = useState<VerseExplanationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Book picker
  const [showBookFilter, setShowBookFilter] = useState(false);
  const [covenant, setCovenant] = useState<'all' | 'ot' | 'nt'>('all');
  const [bookSearch, setBookSearch] = useState('');

  const load = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await getAllVerseExplanations({
        page: pageNum,
        pageSize: 50,
        bookName: bookFilter || undefined,
      });
      if (append) {
        setItems(prev => [...prev, ...res.explanations]);
      } else {
        setItems(res.explanations);
      }
      setTotalPages(res.totalPages);
      setTotalCount(res.totalCount);
      setPage(pageNum);
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load verse explanations');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [bookFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1);
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    await load(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    load(page + 1, true);
  };

  const confirmDelete = (item: VerseExplanationItem) => {
    Alert.alert(
      'Delete Explanation',
      `Delete explanation for ${item.bookName} ${item.chapter}:${item.verseNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVerseExplanation(item.id);
              setItems(prev => prev.filter(i => i.id !== item.id));
              setTotalCount(prev => prev - 1);
              showToast('success', 'Verse explanation deleted');
            } catch (error: any) {
              showToast('error', error?.message || 'Failed to delete');
            }
          },
        },
      ],
    );
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

  const renderItem = ({ item }: { item: VerseExplanationItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <ScrollText size={17} color={COLORS.primary} />
          <Text style={styles.reference}>
            {item.bookName} {item.chapter}:{item.verseNumber}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('AddVerseExplanation', { explanation: item })}
          >
            <Pencil size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => confirmDelete(item)}
          >
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {item.explanation ? (
        <View style={styles.textSection}>
          <Text style={styles.textLabel}>Explanation</Text>
          <Text style={styles.textPreview} numberOfLines={4}>
            {item.explanation}
          </Text>
        </View>
      ) : null}

      {item.learnMore ? (
        <View style={styles.textSection}>
          <Text style={styles.textLabel}>Learn More</Text>
          <Text style={styles.textPreview} numberOfLines={3}>
            {item.learnMore}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {item.bibleVersion || 'No version'} · ID #{item.id}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verse Explanations</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('AddVerseExplanation')}
        >
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
            onSubmitEditing={() => { setLoading(true); load(1); }}
            placeholder="Search explanations..."
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
          />
        </View>

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
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <BookText size={34} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No verse explanations found</Text>
              <Text style={styles.emptySubtext}>
                {bookFilter
                  ? `No explanations for ${bookFilter}`
                  : 'Add your first verse explanation'}
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('AddVerseExplanation')}
              >
                <Text style={styles.primaryButtonText}>Add Explanation</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {totalCount > 0 && !loading && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {totalCount} explanation{totalCount !== 1 ? 's' : ''} · Page {page}/{totalPages}
          </Text>
        </View>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, paddingBottom: 60 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  reference: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  textSection: { marginTop: 12 },
  textLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  textPreview: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  footer: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  countBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 10, alignItems: 'center' },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  loadingMore: { paddingVertical: 20, alignItems: 'center' },
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

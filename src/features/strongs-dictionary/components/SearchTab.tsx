import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Search, ChevronDown, BookOpen } from 'lucide-react-native';
import { LANG_FILTERS } from '../hooks/useStrongsDictionary';
import type { StrongsWordEntry } from '../services/strongsDictionaryApi';
import WordCard from './WordCard';

interface Props {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  langFilter: string;
  setLangFilter: (f: any) => void;
  results: StrongsWordEntry[];
  searchLoading: boolean;
  searched: boolean;
  searchCount: number;
  searchHasNext: boolean;
  onExecuteSearch: (q: string) => void;
  onLoadMore: () => void;
  onOpenDetail: (item: StrongsWordEntry) => void;
  onClear: () => void;
  colors: any;
}

/**
 * Search tab — search the Strong's lexicon by word or number, with language
 * filter chips and a paginated result list.
 */
export default function SearchTab({
  searchQuery,
  setSearchQuery,
  langFilter,
  setLangFilter,
  results,
  searchLoading,
  searched,
  searchCount,
  searchHasNext,
  onExecuteSearch,
  onLoadMore,
  onOpenDetail,
  onClear,
  colors,
}: Props) {
  const filtered =
    langFilter === 'all' ? results : results.filter(r => r.language === langFilter);

  return (
    <View style={styles.section}>
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => onExecuteSearch(searchQuery)}
          placeholder="Search word or Strong's number"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.clearBtnText, { color: colors.muted }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {LANG_FILTERS.map(lf => (
          <TouchableOpacity
            key={lf.key}
            style={[
              styles.filterChip,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              langFilter === lf.key && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setLangFilter(lf.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: langFilter === lf.key ? '#fff' : colors.textSecondary },
              ]}
            >
              {lf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {searchLoading && !results.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.strongsId}
          renderItem={({ item, index }) => (
            <View>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <WordCard item={item} onPress={onOpenDetail} colors={colors} />
            </View>
          )}
          contentContainerStyle={
            filtered.length ? styles.listContent : styles.emptyList
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookOpen size={40} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No entries found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {searched ? 'Try a different search term' : 'Start typing to search the lexicon'}
              </Text>
            </View>
          }
          ListFooterComponent={
            searchHasNext && !searchLoading ? (
              <TouchableOpacity
                style={[styles.loadMore, { backgroundColor: colors.surface }]}
                onPress={onLoadMore}
                activeOpacity={0.7}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  Load more ({results.length} of {searchCount})
                </Text>
                <ChevronDown size={16} color={colors.primary} />
              </TouchableOpacity>
            ) : searchLoading && results.length > 0 ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  clearBtnText: { fontSize: 13, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  listContent: { paddingBottom: 90 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 30, gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 4 },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 6,
    borderRadius: 12,
  },
  loadMoreText: { fontSize: 14, fontWeight: '800' },
  loadingMore: { paddingVertical: 20, alignItems: 'center' },
});

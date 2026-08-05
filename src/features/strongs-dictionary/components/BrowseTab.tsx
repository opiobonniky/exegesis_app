import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookOpen, ChevronDown, LibraryBig } from 'lucide-react-native';
import { LANG_FILTERS } from '../hooks/useStrongsDictionary';
import type { StrongsWordEntry } from '../services/strongsDictionaryApi';
import WordCard from './WordCard';
import InlineBookPicker from './InlineBookPicker';

interface Props {
  selectedBook: string;
  bookPickerExpanded: boolean;
  onToggleBookPicker: () => void;
  onSelectBook: (book: string) => void;
  langFilter: string;
  setLangFilter: (f: any) => void;
  browseWords: StrongsWordEntry[];
  browseLoading: boolean;
  browseLoaded: boolean;
  browseTotal: number;
  browseHasNext: boolean;
  onLoadMore: () => void;
  onOpenDetail: (item: StrongsWordEntry) => void;
  colors: any;
}

/**
 * Browse tab — browse all Strong's words for a Bible book with language
 * filter chips and infinite scroll.
 */
export default function BrowseTab({
  selectedBook,
  bookPickerExpanded,
  onToggleBookPicker,
  onSelectBook,
  langFilter,
  setLangFilter,
  browseWords,
  browseLoading,
  browseLoaded,
  browseTotal,
  browseHasNext,
  onLoadMore,
  onOpenDetail,
  colors,
}: Props) {
  const filtered =
    langFilter === 'all' ? browseWords : browseWords.filter(r => r.language === langFilter);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.pillButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onToggleBookPicker}
        activeOpacity={0.8}
      >
        <BookOpen size={20} color={colors.primary} />
        <Text style={[styles.pillButtonText, { color: colors.text }]} numberOfLines={1}>
          {selectedBook || 'Select a Book'}
        </Text>
        <View style={[styles.pillBadge, { backgroundColor: colors.primary + '12' }]}>
          <Text style={[styles.pillBadgeText, { color: colors.primary }]}>
            {browseWords.length > 0 ? `${browseTotal}` : 'Books'}
          </Text>
        </View>
        <ChevronDown size={18} color={colors.muted} />
      </TouchableOpacity>

      {bookPickerExpanded && (
        <InlineBookPicker
          selectedBook={selectedBook}
          onSelectBrowse={onSelectBook}
          onSelectVerse={() => {}}
          colors={colors}
        />
      )}

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

      {browseLoading && !browseWords.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : browseLoaded && !browseWords.length ? (
        <View style={styles.emptyState}>
          <BookOpen size={40} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No words for this book</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            This book may not have Strong's data loaded yet
          </Text>
        </View>
      ) : !selectedBook ? (
        <View style={styles.emptyState}>
          <LibraryBig size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Select a Book</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Choose a Bible book to browse all Strong's words in it
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.strongsId}
          renderItem={({ item }) => <WordCard item={item} onPress={onOpenDetail} colors={colors} />}
          contentContainerStyle={styles.listContent}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            browseHasNext && !browseLoading ? (
              <TouchableOpacity
                style={[styles.loadMore, { backgroundColor: colors.surface }]}
                onPress={onLoadMore}
                activeOpacity={0.7}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  Load more ({browseWords.length} of {browseTotal})
                </Text>
                <ChevronDown size={16} color={colors.primary} />
              </TouchableOpacity>
            ) : browseLoading && browseWords.length > 0 ? (
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
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
  },
  pillButtonText: { flex: 1, fontSize: 15, fontWeight: '800' },
  pillBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillBadgeText: { fontSize: 12, fontWeight: '800' },
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
  emptyState: { alignItems: 'center', paddingHorizontal: 30, gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },
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

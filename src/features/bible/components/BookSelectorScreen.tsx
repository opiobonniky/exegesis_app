import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Search, X, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useLanguage } from '../../../component/language-translation/LanguageProvider';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';

interface Book {
  name: string;
  chapters: number;
  verses: number;
  testament: 'Old' | 'New';
}

interface BookSelectorScreenProps {
  books: Book[];
  isDark: boolean;
  onSelectBook: (bookName: string) => void;
  onBack?: () => void;
  loading?: boolean;
}

export default function BookSelectorScreen({
  books,
  isDark,
  onSelectBook,
  onBack,
  loading = false,
}: BookSelectorScreenProps) {
  const { translations } = useLanguage();
  const bc = translations?.bible;
  const COLORS = getColors(isDark);

  const [activeTab, setActiveTab] = useState<'Old' | 'New'>('Old');
  const [query, setQuery] = useState('');

  const oldBooks = books.filter(b => b.testament === 'Old');
  const newBooks = books.filter(b => b.testament === 'New');

  const displayed = useMemo(
    () =>
      (activeTab === 'Old' ? oldBooks : newBooks).filter(
        b => query.length === 0 || b.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [activeTab, oldBooks, newBooks, query],
  );

  return (
    <View style={[s.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={[s.backBtn, { backgroundColor: COLORS.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={20} color={COLORS.text} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <View style={[s.headerIcon, onBack && { marginLeft: 4 }]}>
            <BookOpen size={22} color={COLORS.primary} strokeWidth={1.5} />
          </View>
          <View style={s.headerTextWrap}>
            <Text style={[s.headerTitle, { color: COLORS.text }]}>
              {bc?.selectBookTitle || 'Select a Book'}
            </Text>
            <Text style={[s.headerSubtitle, { color: COLORS.muted }]}>
              {books.length} books · {oldBooks.length} OT · {newBooks.length} NT
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Search size={16} color={COLORS.muted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={bc?.searchBooksPlaceholder || 'Search books…'}
          placeholderTextColor={COLORS.muted}
          style={[s.searchInput, { color: COLORS.text }]}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={COLORS.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Testament tabs */}
      {query.length === 0 && (
        <View style={[s.tabsRow, { borderColor: COLORS.border }]}>
          {(['Old', 'New'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  s.tab,
                  isActive && { backgroundColor: COLORS.primary },
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.tabText,
                    { color: isActive ? COLORS.white : COLORS.muted },
                  ]}
                >
                  {tab === 'Old'
                    ? bc?.oldTestamentTab || 'Old Testament'
                    : bc?.newTestamentTab || 'New Testament'}
                </Text>
                <Text
                  style={[
                    s.tabCount,
                    { color: isActive ? 'rgba(255,255,255,0.7)' : COLORS.muted },
                  ]}
                >
                  {tab === 'Old' ? oldBooks.length : newBooks.length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Book list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[s.loadingText, { color: COLORS.muted }]}>Loading books...</Text>
          </View>
        ) : displayed.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={[s.emptyText, { color: COLORS.muted }]}>
              {bc?.noBooksFound || 'No books found'} "{query}"
            </Text>
          </View>
        ) : (
          displayed.map((book, index) => {
            const isLast = index === displayed.length - 1;
            return (
              <TouchableOpacity
                key={book.name}
                onPress={() => onSelectBook(book.name)}
                activeOpacity={0.7}
                style={[
                  s.row,
                  {
                    backgroundColor: COLORS.cardBackground,
                    borderColor: COLORS.border,
                    marginBottom: isLast ? 0 : SPACING.sm,
                  },
                ]}
              >
                <View style={[s.rowIndex, { backgroundColor: `${COLORS.primary}12` }]}>
                  <Text style={[s.rowIndexText, { color: COLORS.primary }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>

                <View style={s.rowContent}>
                  <Text style={[s.rowName, { color: COLORS.text }]}>
                    {book.name}
                  </Text>
                  <View style={s.rowMeta}>
                    <View style={[s.chip, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
                      <Text style={[s.chipText, { color: COLORS.muted }]}>
                        {book.chapters} {bc?.chaptersAbbr || 'ch'}
                      </Text>
                    </View>
                  </View>
                </View>

                <ChevronRight size={18} color={COLORS.muted} strokeWidth={2} />
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: Platform.OS === 'ios' ? 40 : 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 18 : 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    height: '100%',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  rowIndex: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIndexText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
});

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Search, X, ChevronLeft, Globe, BookOpen } from 'lucide-react-native';
import { route } from '../../../component/navigations/routes';
import {
  useLanguage,
  isRtlLanguage,
} from '../../../component/language-translation/LanguageProvider';
import {
  getColors,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../../constants/theme';

// Header background keeps continuity with the Bible screen.
const HEADER_BG = '#25385C';

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
  versionAbbr?: string;
  onVersionPress?: () => void;
  lastReadBook?: string | null;
}

export default function BookSelectorScreen({
  books,
  isDark,
  onSelectBook,
  onBack,
  loading = false,
  versionAbbr,
  onVersionPress,
  lastReadBook = null,
}: BookSelectorScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);
  const bc = translations?.bible;
  const COLORS = getColors(isDark);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Old' | 'New'>('Old');

  const oldBooks = useMemo(
    () => books.filter(b => b.testament === 'Old'),
    [books],
  );
  const newBooks = useMemo(
    () => books.filter(b => b.testament === 'New'),
    [books],
  );

  const filtering = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  const visibleBooks = useMemo(() => {
    const pool = filtering ? books : activeTab === 'Old' ? oldBooks : newBooks;
    return filtering
      ? pool.filter(b => b.name.toLowerCase().includes(q))
      : pool;
  }, [books, activeTab, oldBooks, newBooks, filtering, q]);

  // Responsive columns: wider screens pack more books per row.
  const columns = width >= 480 ? 5 : width >= 340 ? 4 : 3;
  const itemWidth = (width - PADDING_H * 2 - GAP * (columns - 1)) / columns;

  const anyResults = visibleBooks.length > 0;

  return (
    <View style={[s.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={HEADER_BG} barStyle="light-content" />

      {/* ── Compact header ─────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={[s.headerRow, isRtl && s.headerRowRtl]}>
          <View style={[s.headerLeft, isRtl && s.headerSideRtl]}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={s.sideBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
                accessibilityLabel="Back"
              >
                <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {bc?.selectBookTitle || 'Select a Book'}
            </Text>
            <Text style={s.headerSubtitle} numberOfLines={1}>
              {books.length} {bc?.booksLabel || 'books'} · {oldBooks.length} OT ·{' '}
              {newBooks.length} NT
            </Text>
          </View>

          <View style={[s.headerRight, isRtl && s.headerSideRtl]}>
            <TouchableOpacity
              onPress={onVersionPress}
              style={s.sideBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
              accessibilityLabel="Translation"
            >
              <Globe size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>
        {versionAbbr ? (
          <Text style={s.version}>
            {bc?.readingFrom || 'Reading'} {versionAbbr}
          </Text>
        ) : null}
      </View>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <View
        style={[
          s.searchWrap,
          { backgroundColor: COLORS.surface, borderColor: COLORS.border },
        ]}
      >
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
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={COLORS.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Old / New Testament tabs ───────────────────────────────────────── */}
      {!filtering && (
        <View style={[s.tabsRow, isRtl && s.tabsRowRtl, { borderColor: COLORS.border }]}>
          {(['Old', 'New'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[s.tab, isActive && { backgroundColor: COLORS.primary }]}
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

      {/* ── Book grid (responsive, scrollable) ─────────────────────────────── */}
      {loading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[s.centerText, { color: COLORS.muted }]}>
            Loading books...
          </Text>
        </View>
      ) : !anyResults ? (
        <View style={s.centerWrap}>
          <BookOpen size={34} color={COLORS.muted} strokeWidth={1.5} />
          <Text style={[s.centerText, { color: COLORS.muted }]}>
            {bc?.noBooksFound || 'No books found'} "{query}"
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.gridScroll}
          contentContainerStyle={[
            s.gridContent,
            { paddingBottom: insets.bottom + SPACING.lg },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {visibleBooks.map(book => {
            const isLastRead = !!lastReadBook && book.name === lastReadBook;
            return (
              <TouchableOpacity
                key={book.name}
                onPress={() => onSelectBook(book.name)}
                activeOpacity={0.55}
                style={[
                  s.bookItem,
                  { width: itemWidth },
                  isLastRead && {
                    backgroundColor: `${COLORS.primary}12`,
                    borderColor: `${COLORS.primary}55`,
                  },
                ]}
              >
                <Text
                  style={[
                    s.bookName,
                    { color: isLastRead ? COLORS.primary : COLORS.text },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {book.name}
                </Text>
                <Text
                  style={[
                    s.bookChapters,
                    { color: isLastRead ? COLORS.primary : COLORS.muted },
                  ]}
                >
                  {isLastRead ? '● ' : ''}
                  {book.chapters} {bc?.chaptersAbbr || 'ch'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const PADDING_H = 12;
const GAP = 6;

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: HEADER_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.38)',
    paddingBottom: SPACING.sm,
  },
  headerRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    width: 46,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 46,
    alignItems: 'flex-end',
  },
  headerSideRtl: {
    alignItems: 'center',
  },
  sideBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  version: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PADDING_H,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    height: '100%',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: PADDING_H,
    marginBottom: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabsRowRtl: {
    flexDirection: 'row-reverse',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING_H,
    paddingTop: SPACING.xs,
    columnGap: GAP,
    rowGap: GAP,
  },
  bookItem: {
    height: 48,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bookName: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  bookChapters: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: PADDING_H,
  },
  centerText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});
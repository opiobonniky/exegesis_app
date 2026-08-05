import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  X,
  ChevronLeft,
  Globe,
  Home,
} from 'lucide-react-native';
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

// Design tokens matching the Bible screen header (biblescreen.jpeg)
const HEADER_BG = '#25385C';

const COLUMNS = 3;
const H_PAD = 16;
const GAP = 10;

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
  /** Book the user last read — visually highlighted so they can find it fast. */
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

  // Books in canonical Bible order (the incoming array is already ordered).
  // Search crosses both testaments; otherwise show only the active tab.
  const visibleBooks = useMemo(() => {
    const pool = filtering ? books : activeTab === 'Old' ? oldBooks : newBooks;
    return filtering ? pool.filter(b => b.name.toLowerCase().includes(q)) : pool;
  }, [books, activeTab, oldBooks, newBooks, filtering, q]);

  const rows = useMemo(() => {
    const result: Book[][] = [];
    for (let i = 0; i < visibleBooks.length; i += COLUMNS) {
      result.push(visibleBooks.slice(i, i + COLUMNS));
    }
    return result;
  }, [visibleBooks]);

  const anyResults = visibleBooks.length > 0;

  return (
    <View style={[s.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={HEADER_BG} barStyle="light-content" />

      {/* ── Header (matches Bible screen) ─────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={[s.headerRow, isRtl && s.headerRowRtl]}>
          {/* ── Left: back (or balanced spacer) ─────────────────────────────── */}
          <View style={[s.headerSide, s.headerSideLeft, isRtl && s.headerSideRtl]}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={s.sideBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
              {books.length} {bc?.booksLabel || 'books'} · {oldBooks.length} OT · {newBooks.length} NT
            </Text>
          </View>

          {/* ── Right: Home + translation selector icons ────────────────────── */}
          <View style={[s.headerSide, s.headerSideRight, isRtl && s.headerSideRtl]}>
            <TouchableOpacity
              onPress={() => navigation.navigate(route.home as never)}
              style={s.sideBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
              accessibilityLabel="Home"
            >
              <Home size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
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
          <Text style={s.headerVersion}>
            {bc?.readingFrom || 'Reading'} {versionAbbr}
          </Text>
        ) : null}
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

      {/* Old / New Testament tabs */}
      {!filtering && (
        <View style={[s.tabsRow, isRtl && s.tabsRowRtl, { borderColor: COLORS.border }]}>
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

      {/* Book list — plain text, flex layout that always fits the screen */}
      <View style={s.content}>
        {loading ? (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[s.centerText, { color: COLORS.muted }]}>Loading books...</Text>
          </View>
        ) : !anyResults ? (
          <View style={s.centerWrap}>
            <Text style={[s.centerText, { color: COLORS.muted }]}>
              {bc?.noBooksFound || 'No books found'} "{query}"
            </Text>
          </View>
        ) : (
          rows.map((row, rowIdx) => (
            <View key={rowIdx} style={[s.row, isRtl && s.rowRtl]}>
              {row.map(book => {
                const isLastRead =
                  !!lastReadBook && book.name === lastReadBook;
                return (
                  <TouchableOpacity
                    key={book.name}
                    onPress={() => onSelectBook(book.name)}
                    activeOpacity={0.55}
                    style={[
                      s.bookItem,
                      isLastRead && {
                        backgroundColor: `${COLORS.primary}12`,
                      },
                      isLastRead && s.bookItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.bookName,
                        { color: isLastRead ? COLORS.primary : COLORS.text },
                        isLastRead && s.bookNameActive,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {book.name}
                    </Text>
                    <Text
                      style={[
                        s.bookChapters,
                        {
                          color: isLastRead ? COLORS.primary : COLORS.muted,
                        },
                        isLastRead && s.bookChaptersActive,
                      ]}
                    >
                      {isLastRead ? '● ' : ''}
                      {book.chapters} {bc?.chaptersAbbr || 'ch'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

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
  // Symmetric side rails (2×40px buttons + gap) keep the title perfectly centered
  headerSide: {
    width: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSideLeft: {
    justifyContent: 'flex-start',
  },
  headerSideRight: {
    justifyContent: 'flex-end',
  },
  headerSideRtl: {
    flexDirection: 'row-reverse',
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
  headerVersion: {
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
    marginHorizontal: H_PAD,
    marginTop: SPACING.md,
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
    marginHorizontal: H_PAD,
    marginBottom: SPACING.sm,
    borderRadius: 14,
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
    paddingVertical: 11,
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
  content: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  bookItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  bookItemActive: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  bookName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  bookNameActive: {
    fontWeight: '800',
  },
  bookChapters: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  bookChaptersActive: {
    fontWeight: '700',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  centerText: {
    fontSize: FONT_SIZES.md,
  },
});

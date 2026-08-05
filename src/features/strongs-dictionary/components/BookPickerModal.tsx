import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookOpen, Check, Search, X } from 'lucide-react-native';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const H_PAD = 16;
const COLS = 4;
const GAP = 7;
const CELL_W = Math.floor((SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS);

type Testament = 'Old' | 'New';

interface Props {
  visible: boolean;
  books: Array<{ bookName: string; chaptersCount: number; testament: string }>;
  selectedBook?: string;
  onSelect: (book: string) => void;
  onClose: () => void;
  colors: any;
}

/**
 * Bottom-sheet book picker — Old/New Testament tabs with a compact
 * non-scrolling grid so every book in the active testament fits on screen.
 */
export default function BookPickerModal({
  visible,
  books,
  selectedBook,
  onSelect,
  onClose,
  colors,
}: Props) {
  const [tab, setTab] = useState<Testament>('Old');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      const found = books.find(b => b.bookName === selectedBook);
      setTab((found?.testament as Testament) || 'Old');
      setQuery('');
    }
  }, [visible, books, selectedBook]);

  const oldBooks = useMemo(
    () => books.filter(b => b.testament !== 'New'),
    [books],
  );
  const newBooks = useMemo(
    () => books.filter(b => b.testament === 'New'),
    [books],
  );

  const source = tab === 'Old' ? oldBooks : newBooks;

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(b =>
      b.bookName.toLowerCase().includes(q),
    );
  }, [source, query]);

  const handleSelect = (name: string) => {
    onSelect(name);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <BookOpen size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Select a Book</Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  {books.length} books · {oldBooks.length} OT · {newBooks.length} NT
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.cardBackground }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={17} color={colors.muted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Testament tabs */}
          <View style={[styles.tabs, { backgroundColor: colors.cardBackground }]}>
            {(['Old', 'New'] as Testament[]).map(t => {
              const active = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tab,
                    active && { backgroundColor: colors.surface, borderColor: colors.primary },
                    !active && { borderColor: 'transparent' },
                  ]}
                  onPress={() => {
                    setTab(t);
                    setQuery('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: active ? colors.primary : colors.muted },
                    ]}
                  >
                    {t === 'Old' ? 'Old Testament' : 'New Testament'}
                  </Text>
                  <Text
                    style={[
                      styles.tabCount,
                      { color: active ? colors.primary : colors.muted },
                    ]}
                  >
                    {t === 'Old' ? oldBooks.length : newBooks.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Search size={16} color={colors.muted} strokeWidth={2.2} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search books…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              selectionColor={colors.primary}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={colors.muted} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {/* Compact non-scrolling grid — all books of the active testament fit */}
          <View style={styles.grid}>
            {displayed.map(b => {
              const active = b.bookName === selectedBook;
              return (
                <TouchableOpacity
                  key={b.bookName}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: active ? colors.primary : colors.cardBackground,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(b.bookName)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.cellText,
                      { color: active ? '#fff' : colors.text },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {b.bookName}
                  </Text>
                  <Text
                    style={[
                      styles.cellSub,
                      { color: active ? 'rgba(255,255,255,0.85)' : colors.muted },
                    ]}
                  >
                    {b.chaptersCount}ch
                  </Text>
                  {active && <Check size={12} color="#fff" strokeWidth={3} style={styles.cellCheck} />}
                </TouchableOpacity>
              );
            })}
            {displayed.length === 0 && (
              <Text style={[styles.empty, { color: colors.muted }]}>
                No matching books
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: SCREEN_H * 0.9,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  tabText: { fontSize: 12.5, fontWeight: '700' },
  tabCount: { fontSize: 11, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 9 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: H_PAD,
    gap: GAP,
  },
  cell: {
    width: CELL_W,
    borderRadius: 9,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 5,
    alignItems: 'center',
    position: 'relative',
  },
  cellText: { fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  cellSub: { fontSize: 8.5, fontWeight: '600', marginTop: 1, opacity: 0.8 },
  cellCheck: { position: 'absolute', top: 4, right: 4 },
  empty: { width: '100%', textAlign: 'center', paddingVertical: 24, fontSize: 13, fontWeight: '600' },
});

import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, Check } from 'lucide-react-native';
import {
  BIBLE_BOOKS_OT,
  BIBLE_BOOKS_NT,
  ALL_BOOKS,
} from '../../../constants/bibleBooks';

interface Props {
  selectedBook?: string;
  verseBook?: string;
  onSelectBrowse: (book: string) => void;
  onSelectVerse: (book: string) => void;
  colors: any;
}

export default function InlineBookPicker({
  selectedBook,
  verseBook,
  onSelectBrowse,
  onSelectVerse,
  colors,
}: Props) {
  const [covenant, setCovenant] = useState<'all' | 'ot' | 'nt'>('all');
  const [bookSearch, setBookSearch] = useState('');

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

  return (
    <View style={styles(colors).inlineBookPicker}>
      <View style={styles(colors).inlineSearchBox}>
        <Search size={16} color={colors.muted} />
        <TextInput
          style={[styles(colors).inlineSearchInput, { color: colors.text }]}
          value={bookSearch}
          onChangeText={setBookSearch}
          placeholder="Search book..."
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles(colors).covenantRow}>
        {(['all', 'ot', 'nt'] as const).map(c => (
          <TouchableOpacity
            key={c}
            style={[styles(colors).covenantChip, covenant === c && styles(colors).covenantChipActive]}
            onPress={() => setCovenant(c)}
          >
            <Text style={[styles(colors).covenantChipText, covenant === c && styles(colors).covenantChipTextActive]}>
              {c === 'all' ? 'All' : c === 'ot' ? 'OT' : 'NT'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredBooks}
        keyExtractor={b => b}
        style={styles(colors).inlineBookList}
        renderItem={({ item }) => {
          const isSelected = item === selectedBook || item === verseBook;
          return (
            <TouchableOpacity
              style={[
                styles(colors).modalItem,
                { borderBottomColor: colors.border },
                isSelected && { backgroundColor: `${colors.primary}15` },
              ]}
              onPress={() => {
                onSelectBrowse(item);
                onSelectVerse(item);
              }}
            >
              <Text style={[styles(colors).modalItemText, { color: isSelected ? colors.primary : colors.text }, isSelected && { fontWeight: '700' }]}>
                {item}
              </Text>
              {isSelected && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  inlineBookPicker: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    backgroundColor: c.cardBackground,
    marginBottom: 12,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  inlineSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: c.surface,
  },
  inlineSearchInput: { flex: 1, padding: 0 },
  inlineBookList: { maxHeight: 260 },
  covenantRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, marginBottom: 8 },
  covenantChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  covenantChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  covenantChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  covenantChipTextActive: { color: '#fff' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  modalItemText: { fontSize: 15, flex: 1 },
});

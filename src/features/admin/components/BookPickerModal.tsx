import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Search, Check, X } from 'lucide-react-native';
import {
  BIBLE_BOOKS_OT,
  BIBLE_BOOKS_NT,
  ALL_BOOKS,
} from '../../../constants/bibleBooks';

interface Props {
  visible: boolean;
  selectedBook: string;
  onSelect: (book: string) => void;
  onClose: () => void;
  colors: any;
}

export default function BookPickerModal({ visible, selectedBook, onSelect, onClose, colors }: Props) {
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles(colors).modalOverlay}>
        <View style={[styles(colors).modalSheet]}>
          <View style={[styles(colors).modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles(colors).modalTitle, { color: colors.text }]}>Select Book</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles(colors).modalSearchBox}>
            <Search size={16} color={colors.muted} />
            <TextInput
              style={[styles(colors).modalSearchInput, { color: colors.text }]}
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
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles(colors).modalItem,
                  { borderBottomColor: colors.border },
                  selectedBook === item && { backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[styles(colors).modalItemText, { color: selectedBook === item ? colors.primary : colors.text }, selectedBook === item && { fontWeight: '700' }]}>
                  {item}
                </Text>
                {selectedBook === item && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = (c: any) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, height: 44, backgroundColor: c.cardBackground },
  modalSearchInput: { flex: 1, padding: 0 },
  covenantRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  covenantChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: c.cardBackground, borderWidth: 1, borderColor: c.border },
  covenantChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  covenantChipText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
  covenantChipTextActive: { color: '#fff' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalItemText: { fontSize: 15, flex: 1 },
});

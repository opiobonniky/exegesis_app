import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Search } from 'lucide-react-native';

const SCREEN_H = Dimensions.get('window').height;

interface Option {
  label: string;
  value: string | number;
  subtitle?: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: Option[];
  selectedValue?: string | number | null;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSelect: (value: string | number) => void;
  onClose: () => void;
  colors: any;
}

export default function OptionPickerModal({
  visible,
  title,
  options,
  selectedValue,
  searchable = false,
  searchPlaceholder = 'Search…',
  onSelect,
  onClose,
  colors,
}: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      o =>
        o.label.toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q),
    );
  }, [options, query]);

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
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {searchable && (
            <View
              style={[
                styles.searchWrap,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Search size={16} color={colors.muted} strokeWidth={2.2} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                selectionColor={colors.primary}
              />
            </View>
          )}

          {filtered.length === 0 ? (
            <Text style={[styles.empty, { color: colors.muted }]}>
              No matching options
            </Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, idx) => `${item.value}_${idx}`}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = String(item.value) === String(selectedValue);
                return (
                  <TouchableOpacity
                    style={[styles.item, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                  >
                    <View style={styles.itemTextWrap}>
                      <Text
                        style={[
                          styles.itemText,
                          { color: selected ? colors.primary : colors.text },
                          selected && { fontWeight: '800' },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text
                          style={[styles.itemSub, { color: colors.muted }]}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {selected && <Check size={17} color={colors.primary} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    height: SCREEN_H * 0.72,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 26,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 9,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 28,
    fontSize: 14,
    fontWeight: '600',
  },
  list: { flex: 1, paddingHorizontal: 12 },
  listContent: { paddingBottom: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTextWrap: { flex: 1, paddingRight: 12 },
  itemText: { fontSize: 15, fontWeight: '600' },
  itemSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.85,
  },
});

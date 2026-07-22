import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  colors: any;
}

export default function SearchBar({ value, onChangeText, onSubmit, placeholder, colors }: Props) {
  return (
    <View style={styles(colors).searchBox}>
      <Search size={20} color={colors.muted} />
      <TextInput
        style={styles(colors).searchInput}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <X size={18} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 56,
    backgroundColor: c.cardBackground,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: c.text,
    fontSize: 15,
    padding: 0,
  },
});

import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  initialValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  colors: any;
}

export default function NumberPickerModal({ visible, title, initialValue, onSelect, onClose, colors }: Props) {
  const [input, setInput] = useState(initialValue);

  useEffect(() => {
    if (visible) setInput(initialValue);
  }, [visible, initialValue]);

  const handleSet = () => {
    const num = Number(input);
    if (num > 0) {
      onSelect(String(num));
    } else {
      // parent should handle the error toast
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles(colors).overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles(colors).content, { backgroundColor: colors.surface }]}>
          <Text style={[styles(colors).title, { color: colors.text }]}>{title}</Text>
          <TextInput
            style={[styles(colors).input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
            value={input}
            onChangeText={setInput}
            keyboardType="number-pad"
            placeholder={`Enter ${title.toLowerCase()} number`}
            placeholderTextColor={colors.muted}
            autoFocus
          />
          <View style={styles(colors).actions}>
            <TouchableOpacity
              style={[styles(colors).btn, { backgroundColor: colors.cardBackground }]}
              onPress={onClose}
            >
              <Text style={[styles(colors).btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles(colors).btn, { backgroundColor: colors.primary }]}
              onPress={handleSet}
            >
              <Text style={[styles(colors).btnText, { color: '#fff' }]}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = (c: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '80%', borderRadius: 20, padding: 24 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center' },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '800' },
});

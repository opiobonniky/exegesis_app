import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from './language-translation/LanguageProvider';

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();
  const langs = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
  ];

  return (
    <View style={styles.wrap}>
      {langs.map(l => (
        <TouchableOpacity
          key={l.code}
          onPress={() => setLanguage(l.code as any)}
          style={[styles.btn, language === l.code && styles.active]}
        >
          <Text style={styles.label}>{l.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8 },
  btn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  active: { borderColor: '#333' },
  label: { fontSize: 14 },
});

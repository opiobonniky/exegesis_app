import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from './language-translation/LanguageProvider';

const NATIVE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  de: 'Deutsch',
  pt: 'Português',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو',
  sw: 'Kiswahili',
  it: 'Italiano',
  el: 'Ελληνικά',
  ru: 'Русский',
  ne: 'नेपाली',
  fil: 'Filipino',
};

const ALL_LANGS = Object.keys(NATIVE_NAMES);

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.wrap}>
      {ALL_LANGS.map(code => (
        <TouchableOpacity
          key={code}
          onPress={() => setLanguage(code as any)}
          style={[styles.btn, language === code && styles.active]}
        >
          <Text style={styles.label}>{NATIVE_NAMES[code]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  active: { borderColor: '#333', backgroundColor: 'rgba(0,0,0,0.05)' },
  label: { fontSize: 14 },
});

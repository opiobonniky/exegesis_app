import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useLanguage } from './language-translation/LanguageProvider';
import { AppContext } from '../common/AppContext';
import { getColors } from '../constants/theme';
import { Language } from './language-translation/type';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onRequestClose: () => void;
};

// Flag emojis for each supported language
const FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  ar: '🇸🇦',
};

// Language names in each supported language
// Each entry maps: { languageCode: nameInThatLanguage }
const LANGUAGE_NAMES: Record<Language, Record<Language, string>> = {
  en: { en: 'English', es: 'Inglés', fr: 'Anglais', ar: 'الإنجليزية' },
  es: { en: 'Spanish', es: 'Español', fr: 'Espagnol', ar: 'الإسبانية' },
  fr: { en: 'French', es: 'Francés', fr: 'Français', ar: 'الفرنسية' },
  ar: { en: 'Arabic', es: 'Árabe', fr: 'Arabe', ar: 'العربية' },
};

const LANG_CODES: Language[] = ['en', 'es', 'fr', 'ar'];

const LanguagePickerModal = ({ visible, onRequestClose }: Props) => {
  const { language, setLanguage } = useLanguage();
  const app = React.useContext(AppContext);
  const isDark = !!(app && (app as any).isDark);
  const C = getColors(isDark);
  const isRtl = language === 'ar';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onRequestClose}
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: C.muted }]} />
          </View>

          {/* Title */}
          <View style={[styles.titleRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { color: C.text }]}>Language</Text>
            <TouchableOpacity onPress={onRequestClose} style={styles.closeBtn}>
              <X size={20} color={C.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: C.muted, textAlign: isRtl ? 'right' : 'left' }]}>
            Choose your preferred language for the app experience
          </Text>

          {/* Language options */}
          <View style={styles.optionsList}>
            {LANG_CODES.map(code => {
              const isActive = language === code;
              const nativeName = LANGUAGE_NAMES[code][code];
              const currentLangName = LANGUAGE_NAMES[code][language];

              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.option,
                    {
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(255,255,255,0.08)'
                          : C.primary + '11'
                        : isDark
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)',
                      borderColor: isActive ? C.primary : C.border,
                    },
                  ]}
                  onPress={() => {
                    setLanguage(code);
                    onRequestClose();
                  }}
                  activeOpacity={0.7}
                >
                  {/* Flag + native name */}
                  <View style={[styles.optionLeft, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.flag}>{FLAGS[code]}</Text>
                    <View style={{ marginLeft: isRtl ? 0 : 12, marginRight: isRtl ? 12 : 0 }}>
                      <Text style={[styles.nativeName, { color: C.text, textAlign: isRtl ? 'right' : 'left' }]}>
                        {nativeName}
                      </Text>
                      {/* Show current-language name only if different from native name */}
                      {currentLangName !== nativeName && (
                        <Text style={[styles.currentLangName, { color: C.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                          {currentLangName}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Checkmark for active language */}
                  {isActive && (
                    <View style={[styles.checkWrap, { backgroundColor: C.primary }]}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 20,
    opacity: 0.7,
  },
  optionsList: {
    gap: 10,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionLeft: {
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 32,
    width: 40,
    textAlign: 'center',
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  currentLangName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.7,
  },
  checkWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LanguagePickerModal;

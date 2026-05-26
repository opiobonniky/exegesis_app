import React, { useRef, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
  SectionList,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useLanguage } from './language-translation/LanguageProvider';
import { AppContext } from '../common/AppContext';
import { getColors } from '../constants/theme';
import { Language } from './language-translation/type';
import { isRtlLanguage } from './language-translation/localeUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onRequestClose: () => void;
};

// Flag emojis for every supported language
export const FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  ar: '🇸🇦',
  de: '🇩🇪',
  pt: '🇵🇹',
  hi: '🇮🇳',
  bn: '🇧🇩',
  ta: '🇮🇳',
  te: '🇮🇳',
  mr: '🇮🇳',
  gu: '🇮🇳',
  kn: '🇮🇳',
  ml: '🇮🇳',
  pa: '🇮🇳',
  ur: '🇵🇰',
  sw: '🇰🇪',
  it: '🇮🇹',
  el: '🇬🇷',
  ru: '🇷🇺',
  ne: '🇳🇵',
  fil: '🇵🇭',
};

/** English name for each language (always visible, acts as the native name fallback). */
export const ENGLISH_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  ar: 'Arabic',
  de: 'German',
  pt: 'Portuguese',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  sw: 'Kiswahili',
  it: 'Italian',
  el: 'Greek',
  ru: 'Russian',
  ne: 'Nepali',
  fil: 'Filipino',
};

/** Native name (endonym) for each language – the name in its own script. */
export const NATIVE_NAMES: Record<Language, string> = {
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

/** Map of the current language's name in every other language (for subtitle). */
// We build this dynamically from ENGLISH_NAMES and NATIVE_NAMES.
const languageNameInLanguage = (
  targetLang: Language,
  currentLanguage: Language,
): string | null => {
  if (targetLang === currentLanguage) return null; // native name shown above – no subtitle needed
  // Show the English name as a subtitle so users can identify languages they don't recognise
  return ENGLISH_NAMES[targetLang];
};

/** Section definition for the SectionList grouping */
interface LangSection {
  title: string;
  data: Language[];
}

const LANG_SECTIONS: LangSection[] = [
  { title: 'Primary', data: ['en', 'es', 'fr', 'ar', 'de', 'pt', 'it', 'ru'] },
  { title: 'Indian Languages', data: ['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur'] },
  { title: 'Other', data: ['sw', 'el', 'ne', 'fil'] },
];

const LanguagePickerModal = ({ visible, onRequestClose }: Props) => {
  const { language, setLanguage } = useLanguage();
  const app = React.useContext(AppContext);
  const isDark = !!(app && (app as any).isDark);
  const C = getColors(isDark);
  const rtl = isRtlLanguage(language);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(1);
      backdropAnim.setValue(1);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const sheetTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onRequestClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: C.muted }]} />
          </View>

          {/* Title */}
          <View style={[styles.titleRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { color: C.text }]}>Language</Text>
            <TouchableOpacity onPress={onRequestClose} style={styles.closeBtn}>
              <X size={20} color={C.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.subtitle,
              { color: C.muted, textAlign: rtl ? 'right' : 'left' },
            ]}
          >
            Choose your preferred language for the app experience
          </Text>

          {/* Language options grouped by section */}
          <SectionList
            sections={LANG_SECTIONS}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsList}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.sectionHeader, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                <View style={[styles.sectionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : `${C.primary}15` }]}>
                  <Text style={[styles.sectionBadgeText, { color: C.primary }]}>{title}</Text>
                </View>
              </View>
            )}
            renderItem={({ item: code }) => {
              const isActive = language === code;
              const nativeName = NATIVE_NAMES[code];
              const subtitle = languageNameInLanguage(code, language);

              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.option,
                    {
                      flexDirection: rtl ? 'row-reverse' : 'row',
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
                  {/* Flag + names */}
                  <View
                    style={[
                      styles.optionLeft,
                      { flexDirection: rtl ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Text style={styles.flag}>{FLAGS[code]}</Text>
                    <View style={{ marginLeft: rtl ? 0 : 12, marginRight: rtl ? 12 : 0, flex: 1 }}>
                      <Text
                        style={[
                          styles.nativeName,
                          { color: C.text, textAlign: rtl ? 'right' : 'left' },
                        ]}
                      >
                        {nativeName}
                      </Text>
                      {subtitle && (
                        <Text
                          style={[
                            styles.currentLangName,
                            { color: C.muted, textAlign: rtl ? 'right' : 'left' },
                          ]}
                        >
                          {subtitle}
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
            }}
          />
        </Animated.View>
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
    maxHeight: SCREEN_HEIGHT * 0.78,
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
    marginBottom: 12,
    opacity: 0.7,
  },
  optionsList: {
    paddingBottom: 12,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  option: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionLeft: {
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 30,
    width: 38,
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

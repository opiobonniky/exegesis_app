import { Language } from './type';

/**
 * RTL languages currently supported: Arabic, Urdu.
 * Add more as needed (e.g., Hebrew, Farsi).
 */
const RTL_LANGUAGES: Language[] = ['ar', 'ur'];

/** Returns true if the language uses a right-to-left writing system. */
export const isRtlLanguage = (lang: Language): boolean =>
  RTL_LANGUAGES.includes(lang);

/** Arabic-Indic digits used in Arabic and Urdu scripts. */
const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Converts a number to Arabic-Indic numerals (٠ ١ ٢ ٣…) if the language is
 * RTL (Arabic / Urdu). For LTR languages, returns the number unchanged.
 */
export const toArabicIndic = (isRtl: boolean, num: number | string): string => {
  if (!isRtl) return String(num);
  return String(num).replace(/[0-9]/g, d => ARABIC_INDIC_DIGITS[parseInt(d, 10)]);
};

/** Returns the corresponding Intl locale string for a Language code. */
export const getLocale = (lang: Language): string => {
  const localeMap: Partial<Record<Language, string>> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    ar: 'ar-SA',
    de: 'de-DE',
    pt: 'pt-PT',
    hi: 'hi-IN',
    bn: 'bn-BD',
    ta: 'ta-IN',
    te: 'te-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    ur: 'ur-PK',
    sw: 'sw-KE',
    it: 'it-IT',
    el: 'el-GR',
    ru: 'ru-RU',
    ne: 'ne-NP',
    fil: 'fil-PH',
  };
  return localeMap[lang] || 'en-US';
};

import { Language } from './type';

/**
 * RTL languages currently supported: Arabic, Urdu.
 * Add more as needed (e.g., Hebrew, Farsi).
 */
const RTL_LANGUAGES: Language[] = ['ar', 'ur'];

/** Returns true if the language uses a right-to-left writing system. */
export const isRtlLanguage = (lang: Language): boolean =>
  RTL_LANGUAGES.includes(lang);

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

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import ar from './ar.json';
import {
  Translations,
  Translator,
  LanguageContextProps,
  Language,
} from './type';

// types moved to ./type

const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined,
);

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@app:language';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [loaded, setLoaded] = useState(false);

  const translationsMap: Record<Language, Translations> = { en, es, fr, ar };

  // Resolve dot‑notation paths safely
  const resolve = (obj: any, path: string): any => {
    return path
      .split('.')
      .reduce(
        (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
        obj,
      );
  };

  const translate = (key: string) => {
    const value = resolve(translationsMap[language], key);
    return value ?? key;
  };

  // expose the full translation object for dot‑notation access
  const translations = (translationsMap[language] || {}) as Translations;

  // create a callable translator that also contains the nested props
  const t = Object.assign(
    translate as Translator,
    translations as Translations,
  );

  // Persist language selection
  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // ignore persistence errors - untranslated selection still works in-memory
      // Could log this to a monitoring service if desired
    }
  }, []);

  // Load persisted language on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (
          stored &&
          (stored === 'en' ||
            stored === 'es' ||
            stored === 'fr' ||
            stored === 'ar')
        ) {
          setLanguageState(stored as Language);
        }
      } catch (e) {
        // ignore read errors
      }
      // mark loaded even if read failed - prevents consumers rendering before we know persisted value
      if (mounted) setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Do not render children until we have attempted to load persisted language
  if (!loaded) return null;

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, translations }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};

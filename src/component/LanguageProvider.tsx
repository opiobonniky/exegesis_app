import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from './language-translation/en.json';
import es from './language-translation/es.json';
import fr from './language-translation/fr.json';
import ar from './language-translation/ar.json';

type Language = 'en' | 'es' | 'fr' | 'ar';

type Translations = typeof en; // shape of translation objects

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined,
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const translationsMap: Record<Language, Translations> = { en, es, fr, ar };

  const t = (key: keyof Translations) => translationsMap[language][key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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

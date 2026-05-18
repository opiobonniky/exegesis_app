import React from 'react';
import { useLanguage } from './language-translation/LanguageProvider';

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <select value={language} onChange={e => setLanguage(e.target.value as any)}>
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <option value="ar">العربية</option>
    </select>
  );
};

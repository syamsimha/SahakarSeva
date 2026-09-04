import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, TranslationKey, translate, supportedLanguages, LanguageOption } from '../i18n';
import { storage } from '../services/db/databaseService';

const LANGUAGE_STORAGE_KEY = 'sahakar_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key, params) => translate(key, 'en', params),
  supportedLanguages,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = storage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'hi' || saved === 'te' || saved === 'en') {
      return saved as Language;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    storage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(key, language, params);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

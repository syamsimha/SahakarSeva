import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, TranslationKey, translate, supportedLanguages, LanguageOption } from '../i18n';

const LANGUAGE_STORAGE_KEY = '@sahakar_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key) => translate(key, 'en'),
  supportedLanguages,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'hi' || saved === 'te')) {
          setLanguageState(saved as Language);
        }
      } catch (e) {
        console.warn('Could not restore saved language preference:', e);
      }
    };
    loadSavedLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Failed to persist language preference:', e);
    }
  };

  const t = (key: TranslationKey) => {
    return translate(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

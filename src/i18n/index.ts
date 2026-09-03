import { en, TranslationKey } from './en';
import { hi } from './hi';
import { te } from './te';

export type Language = 'en' | 'hi' | 'te';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
}

export const supportedLanguages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  hi,
  te,
};

export const translate = (key: TranslationKey, lang: Language = 'en'): string => {
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
};

export * from './en';

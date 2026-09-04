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

export const translate = (
  key: TranslationKey,
  lang: Language = 'en',
  params?: Record<string, string | number>
): string => {
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || (key as string);
  if (params) {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
    });
  }
  return text;
};

export * from './en';

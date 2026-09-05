import { en, TranslationKey } from './en';
import { hi } from './hi';
import { te } from './te';

export type Language =
  | 'en'
  | 'hi'
  | 'te'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'or'
  | 'as'
  | 'ur';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  isAvailable: boolean;
}

export const supportedLanguages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', isAvailable: true },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', isAvailable: true },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', isAvailable: true },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', isAvailable: false },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', isAvailable: false },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', isAvailable: false },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', isAvailable: false },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', isAvailable: false },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', isAvailable: false },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', isAvailable: false },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', isAvailable: false },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া', isAvailable: false },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', isAvailable: false },
];

const translations: Partial<Record<Language, Record<TranslationKey, string>>> = {
  en,
  hi,
  te,
};

export const translate = (key: TranslationKey, lang: Language = 'en'): string => {
  const dict = translations[lang] || translations.en || en;
  return dict[key] || en[key] || key;
};

export * from './en';

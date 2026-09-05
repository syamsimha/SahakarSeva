import { en, TranslationKey } from './en';
import { hi } from './hi';
import { te } from './te';
import { kn } from './kn';

export type Language = 'en' | 'hi' | 'te' | 'kn';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
}

export const supportedLanguages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
];

const translations: Record<Language, Record<string, string>> = {
  en,
  hi,
  te,
  kn,
};

// Reverse lookup index from English text/phrase (lowercased) -> key
const englishPhraseToKey: Record<string, TranslationKey> = {};
for (const [key, value] of Object.entries(en)) {
  englishPhraseToKey[key.toLowerCase()] = key as TranslationKey;
  englishPhraseToKey[value.toLowerCase()] = key as TranslationKey;
  const sanitized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (sanitized) {
    englishPhraseToKey[sanitized] = key as TranslationKey;
  }
}

export const translate = (keyOrPhrase: string, lang: Language = 'en'): string => {
  if (!keyOrPhrase) return '';
  const dict = translations[lang] || translations.en;

  // 1. Direct key match in target dictionary
  if (dict[keyOrPhrase]) {
    return dict[keyOrPhrase];
  }

  // 2. Direct key match lowercased
  const lower = keyOrPhrase.toLowerCase().trim();
  if (dict[lower]) {
    return dict[lower];
  }

  // 3. Match from English phrase to dictionary key
  const matchedKey =
    englishPhraseToKey[lower] ||
    englishPhraseToKey[lower.replace(/[^a-z0-9]/g, '')];

  if (matchedKey && dict[matchedKey]) {
    return dict[matchedKey];
  }

  // 4. Default fallback to English value or original text
  return en[matchedKey as TranslationKey] || keyOrPhrase;
};

export * from './en';

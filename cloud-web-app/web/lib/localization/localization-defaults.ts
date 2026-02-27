/**
 * Built-in locale defaults and plural rules.
 */
import type { LocaleConfig, PluralRule } from './localization-types';

const PLURAL_RULES: Record<string, PluralRule[]> = {
  en: [
    { category: 'one', condition: (n) => n === 1 },
    { category: 'other', condition: () => true },
  ],
  pt: [
    { category: 'one', condition: (n) => n === 1 },
    { category: 'other', condition: () => true },
  ],
  ru: [
    { category: 'one', condition: (n) => n % 10 === 1 && n % 100 !== 11 },
    { category: 'few', condition: (n) => [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) },
    { category: 'many', condition: (n) => n % 10 === 0 || [5, 6, 7, 8, 9].includes(n % 10) || [11, 12, 13, 14].includes(n % 100) },
    { category: 'other', condition: () => true },
  ],
  ar: [
    { category: 'zero', condition: (n) => n === 0 },
    { category: 'one', condition: (n) => n === 1 },
    { category: 'two', condition: (n) => n === 2 },
    { category: 'few', condition: (n) => n % 100 >= 3 && n % 100 <= 10 },
    { category: 'many', condition: (n) => n % 100 >= 11 && n % 100 <= 99 },
    { category: 'other', condition: () => true },
  ],
  ja: [
    { category: 'other', condition: () => true },
  ],
  zh: [
    { category: 'other', condition: () => true },
  ],
  ko: [
    { category: 'other', condition: () => true },
  ],
  fr: [
    { category: 'one', condition: (n) => n === 0 || n === 1 },
    { category: 'other', condition: () => true },
  ],
  de: [
    { category: 'one', condition: (n) => n === 1 },
    { category: 'other', condition: () => true },
  ],
  es: [
    { category: 'one', condition: (n) => n === 1 },
    { category: 'other', condition: () => true },
  ],
  it: [
    { category: 'one', condition: (n) => n === 1 },
    { category: 'other', condition: () => true },
  ],
  pl: [
    { category: 'one', condition: (n) => n === 1 },
    { category: 'few', condition: (n) => [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) },
    { category: 'many', condition: (n) => n !== 1 && [0, 1].includes(n % 10) || [5, 6, 7, 8, 9].includes(n % 10) || [12, 13, 14].includes(n % 100) },
    { category: 'other', condition: () => true },
  ],
};

const DEFAULT_LOCALE_CONFIGS: Record<string, LocaleConfig> = {
  'en-US': {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: 'USD',
      currencySymbol: '$',
    },
    pluralRules: PLURAL_RULES.en,
  },
  'pt-BR': {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
      currency: 'BRL',
      currencySymbol: 'R$',
    },
    pluralRules: PLURAL_RULES.pt,
  },
  'ja-JP': {
    code: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: 'JPY',
      currencySymbol: '¥',
    },
    pluralRules: PLURAL_RULES.ja,
  },
  'zh-CN': {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    direction: 'ltr',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: 'CNY',
      currencySymbol: '¥',
    },
    pluralRules: PLURAL_RULES.zh,
  },
  'ko-KR': {
    code: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    dateFormat: 'YYYY.MM.DD',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: 'KRW',
      currencySymbol: '₩',
    },
    pluralRules: PLURAL_RULES.ko,
  },
  'ar-SA': {
    code: 'ar-SA',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: '٫',
      thousands: '٬',
      currency: 'SAR',
      currencySymbol: 'ر.س',
    },
    pluralRules: PLURAL_RULES.ar,
  },
  'ru-RU': {
    code: 'ru-RU',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: ' ',
      currency: 'RUB',
      currencySymbol: '₽',
    },
    pluralRules: PLURAL_RULES.ru,
  },
  'de-DE': {
    code: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
      currency: 'EUR',
      currencySymbol: '€',
    },
    pluralRules: PLURAL_RULES.de,
  },
  'fr-FR': {
    code: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: ' ',
      currency: 'EUR',
      currencySymbol: '€',
    },
    pluralRules: PLURAL_RULES.fr,
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
      currency: 'EUR',
      currencySymbol: '€',
    },
    pluralRules: PLURAL_RULES.es,
  },
};


export { DEFAULT_LOCALE_CONFIGS, PLURAL_RULES };

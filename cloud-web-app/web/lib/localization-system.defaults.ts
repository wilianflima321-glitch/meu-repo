import type { LocaleConfig, PluralCategory } from './localization-system.types';

export const pluralRules: Record<string, (n: number) => PluralCategory> = {
  // English, German, Spanish, etc.
  'en': (n) => n === 1 ? 'one' : 'other',
  'de': (n) => n === 1 ? 'one' : 'other',
  'es': (n) => n === 1 ? 'one' : 'other',
  'it': (n) => n === 1 ? 'one' : 'other',
  'nl': (n) => n === 1 ? 'one' : 'other',

  // French, Portuguese
  'fr': (n) => n === 0 || n === 1 ? 'one' : 'other',
  'pt': (n) => n === 0 || n === 1 ? 'one' : 'other',

  // Russian, Ukrainian, Polish, etc.
  'ru': (n) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'one';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return 'few';
    return 'many';
  },
  'pl': (n) => {
    if (n === 1) return 'one';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return 'few';
    return 'many';
  },

  // Arabic
  'ar': (n) => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n % 100 >= 3 && n % 100 <= 10) return 'few';
    if (n % 100 >= 11) return 'many';
    return 'other';
  },

  // Japanese, Chinese, Korean (no plural)
  'ja': () => 'other',
  'zh': () => 'other',
  'ko': () => 'other'
};

// ============================================================================
// DEFAULT LOCALES
// ============================================================================

export const defaultLocales: Record<string, LocaleConfig> = {
  'en-US': {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { code: 'USD', symbol: '$', position: 'before' },
    pluralRules: pluralRules['en']
  },
  'en-GB': {
    code: 'en-GB',
    name: 'English (UK)',
    nativeName: 'English',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { code: 'GBP', symbol: '£', position: 'before' },
    pluralRules: pluralRules['en']
  },
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    nativeName: 'Português',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: '.' },
    currency: { code: 'BRL', symbol: 'R$', position: 'before' },
    pluralRules: pluralRules['pt']
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español (España)',
    nativeName: 'Español',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: '.' },
    currency: { code: 'EUR', symbol: '€', position: 'after' },
    pluralRules: pluralRules['es']
  },
  'fr-FR': {
    code: 'fr-FR',
    name: 'Français (France)',
    nativeName: 'Français',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: ' ' },
    currency: { code: 'EUR', symbol: '€', position: 'after' },
    pluralRules: pluralRules['fr']
  },
  'de-DE': {
    code: 'de-DE',
    name: 'Deutsch (Deutschland)',
    nativeName: 'Deutsch',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: '.' },
    currency: { code: 'EUR', symbol: '€', position: 'after' },
    pluralRules: pluralRules['de']
  },
  'it-IT': {
    code: 'it-IT',
    name: 'Italiano (Italia)',
    nativeName: 'Italiano',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: '.' },
    currency: { code: 'EUR', symbol: '€', position: 'after' },
    pluralRules: pluralRules['it']
  },
  'ja-JP': {
    code: 'ja-JP',
    name: '日本語 (日本)',
    nativeName: '日本語',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { code: 'JPY', symbol: '¥', position: 'before' },
    pluralRules: pluralRules['ja']
  },
  'zh-CN': {
    code: 'zh-CN',
    name: '中文 (简体)',
    nativeName: '简体中文',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { code: 'CNY', symbol: '¥', position: 'before' },
    pluralRules: pluralRules['zh']
  },
  'ko-KR': {
    code: 'ko-KR',
    name: '한국어 (대한민국)',
    nativeName: '한국어',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { code: 'KRW', symbol: '₩', position: 'before' },
    pluralRules: pluralRules['ko']
  },
  'ru-RU': {
    code: 'ru-RU',
    name: 'Русский (Россия)',
    nativeName: 'Русский',
    direction: 'ltr',
    fallback: 'en-US',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: ' ' },
    currency: { code: 'RUB', symbol: '₽', position: 'after' },
    pluralRules: pluralRules['ru']
  },
  'ar-SA': {
    code: 'ar-SA',
    name: 'العربية (السعودية)',
    nativeName: 'العربية',
    direction: 'rtl',
    fallback: 'en-US',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '٫', thousands: '٬' },
    currency: { code: 'SAR', symbol: 'ر.س', position: 'after' },
    pluralRules: pluralRules['ar']
  }
};

// ============================================================================
// STRING INTERPOLATION
// ============================================================================

/**
 * LOCALIZATION SYSTEM - Aethel Engine
 * 
 * Sistema completo de localização para jogos.
 * 
 * FEATURES:
 * - Multi-language support
 * - String interpolation
 * - Pluralization
 * - Date/time formatting
 * - Number formatting
 * - Currency formatting
 * - RTL language support
 * - Dynamic loading
 * - Fallback languages
 * - Context-aware translations
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LocaleConfig {
  code: string;           // e.g., 'en-US', 'pt-BR'
  name: string;           // e.g., 'English (US)', 'Português (Brasil)'
  nativeName: string;     // e.g., 'English', 'Português'
  direction: 'ltr' | 'rtl';
  fallback?: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
  pluralRules: (n: number) => PluralCategory;
}

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export interface TranslationEntry {
  value: string | string[] | Partial<Record<PluralCategory, string>>;
  context?: string;
  description?: string;
}

export type TranslationDictionary = Record<string, TranslationEntry | string>;

export interface LocalizationData {
  locale: string;
  translations: TranslationDictionary;
  metadata?: {
    version?: string;
    author?: string;
    lastUpdated?: string;
  };
}

// ============================================================================
// PLURAL RULES
// ============================================================================

const pluralRules: Record<string, (n: number) => PluralCategory> = {
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

const defaultLocales: Record<string, LocaleConfig> = {
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

function interpolate(template: string, values: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values.hasOwnProperty(key) ? String(values[key]) : match;
  });
}

// ============================================================================
// LOCALIZATION MANAGER
// ============================================================================

export class LocalizationManager {
  private currentLocale: string = 'en-US';
  private locales: Map<string, LocaleConfig> = new Map();
  private translations: Map<string, TranslationDictionary> = new Map();
  private loadedNamespaces: Set<string> = new Set();
  
  private onLocaleChangeCallbacks: ((locale: string) => void)[] = [];
  private missingKeyHandler: ((key: string, locale: string) => string) | null = null;
  
  constructor(defaultLocale: string = 'en-US') {
    // Register default locales
    for (const [code, config] of Object.entries(defaultLocales)) {
      this.locales.set(code, config);
    }
    
    this.currentLocale = defaultLocale;
  }
  
  // ============================================================================
  // LOCALE MANAGEMENT
  // ============================================================================
  
  registerLocale(config: LocaleConfig): void {
    this.locales.set(config.code, config);
  }
  
  setLocale(code: string): boolean {
    if (!this.locales.has(code)) {
      console.warn(`Locale '${code}' not registered`);
      return false;
    }
    
    const previousLocale = this.currentLocale;
    this.currentLocale = code;
    
    if (previousLocale !== code) {
      for (const callback of this.onLocaleChangeCallbacks) {
        callback(code);
      }
    }
    
    return true;
  }
  
  getLocale(): string {
    return this.currentLocale;
  }
  
  getLocaleConfig(): LocaleConfig | undefined {
    return this.locales.get(this.currentLocale);
  }
  
  getAvailableLocales(): LocaleConfig[] {
    return Array.from(this.locales.values());
  }
  
  getTextDirection(): 'ltr' | 'rtl' {
    return this.getLocaleConfig()?.direction ?? 'ltr';
  }
  
  onLocaleChange(callback: (locale: string) => void): void {
    this.onLocaleChangeCallbacks.push(callback);
  }
  
  // ============================================================================
  // TRANSLATION LOADING
  // ============================================================================
  
  loadTranslations(data: LocalizationData): void {
    let existing = this.translations.get(data.locale);
    if (!existing) {
      existing = {};
      this.translations.set(data.locale, existing);
    }
    
    // Merge translations
    Object.assign(existing, data.translations);
  }
  
  async loadTranslationsFromUrl(url: string, locale?: string): Promise<void> {
    const response = await fetch(url);
    const data = await response.json() as LocalizationData;
    
    if (locale) {
      data.locale = locale;
    }
    
    this.loadTranslations(data);
  }
  
  async loadNamespace(namespace: string, baseUrl: string): Promise<void> {
    if (this.loadedNamespaces.has(`${this.currentLocale}:${namespace}`)) {
      return;
    }
    
    const url = `${baseUrl}/${this.currentLocale}/${namespace}.json`;
    await this.loadTranslationsFromUrl(url, this.currentLocale);
    
    this.loadedNamespaces.add(`${this.currentLocale}:${namespace}`);
  }
  
  setMissingKeyHandler(handler: (key: string, locale: string) => string): void {
    this.missingKeyHandler = handler;
  }
  
  // ============================================================================
  // TRANSLATION
  // ============================================================================
  
  t(key: string, values?: Record<string, any>, context?: string): string {
    const translation = this.getTranslation(key, this.currentLocale, context);
    
    if (translation === null) {
      if (this.missingKeyHandler) {
        return this.missingKeyHandler(key, this.currentLocale);
      }
      console.warn(`Missing translation: '${key}' for locale '${this.currentLocale}'`);
      return key;
    }
    
    if (values) {
      return interpolate(translation, values);
    }
    
    return translation;
  }
  
  // Alias for t()
  translate(key: string, values?: Record<string, any>, context?: string): string {
    return this.t(key, values, context);
  }
  
  // Pluralization
  tp(key: string, count: number, values?: Record<string, any>): string {
    const entry = this.getTranslationEntry(key, this.currentLocale);
    
    if (!entry) {
      console.warn(`Missing translation: '${key}' for locale '${this.currentLocale}'`);
      return key;
    }
    
    let template: string;
    
    if (typeof entry === 'string') {
      template = entry;
    } else if (typeof entry.value === 'string') {
      template = entry.value;
    } else if (Array.isArray(entry.value)) {
      // Simple plural: [singular, plural]
      template = count === 1 ? entry.value[0] : entry.value[1];
    } else {
      // Full plural forms
      const config = this.getLocaleConfig();
      const category = config?.pluralRules(count) ?? 'other';
      template = (entry.value as Record<PluralCategory, string>)[category] ?? 
                 (entry.value as Record<PluralCategory, string>).other ?? 
                 key;
    }
    
    const allValues = { ...values, count };
    return interpolate(template, allValues);
  }
  
  private getTranslation(key: string, locale: string, context?: string): string | null {
    const entry = this.getTranslationEntry(key, locale);
    
    if (!entry) {
      // Try fallback locale
      const config = this.locales.get(locale);
      if (config?.fallback) {
        return this.getTranslation(key, config.fallback, context);
      }
      return null;
    }
    
    if (typeof entry === 'string') {
      return entry;
    }
    
    // Check context match
    if (context && entry.context && entry.context !== context) {
      return null;
    }
    
    if (typeof entry.value === 'string') {
      return entry.value;
    }
    
    if (Array.isArray(entry.value)) {
      return entry.value[0];
    }
    
    // Return 'other' form for objects
    return entry.value.other ?? null;
  }
  
  private getTranslationEntry(key: string, locale: string): TranslationEntry | string | null {
    const dictionary = this.translations.get(locale);
    if (!dictionary) return null;
    
    // Support nested keys with dot notation
    const parts = key.split('.');
    let current: any = dictionary;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return current;
  }
  
  hasTranslation(key: string): boolean {
    return this.getTranslationEntry(key, this.currentLocale) !== null;
  }
  
  // ============================================================================
  // FORMATTING
  // ============================================================================
  
  formatNumber(value: number, decimals?: number): string {
    const config = this.getLocaleConfig();
    if (!config) return value.toString();
    
    const parts = value.toFixed(decimals ?? 0).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.numberFormat.thousands);
    
    return parts.join(config.numberFormat.decimal);
  }
  
  formatCurrency(value: number, currencyCode?: string): string {
    const config = this.getLocaleConfig();
    if (!config) return value.toFixed(2);
    
    const currency = currencyCode ?? config.currency.code;
    const symbol = config.currency.symbol;
    const formatted = this.formatNumber(value, 2);
    
    if (config.currency.position === 'before') {
      return `${symbol}${formatted}`;
    } else {
      return `${formatted} ${symbol}`;
    }
  }
  
  formatDate(date: Date, format?: string): string {
    const config = this.getLocaleConfig();
    const fmt = format ?? config?.dateFormat ?? 'YYYY-MM-DD';
    
    const tokens: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'YY': date.getFullYear().toString().slice(-2),
      'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
      'M': (date.getMonth() + 1).toString(),
      'DD': date.getDate().toString().padStart(2, '0'),
      'D': date.getDate().toString()
    };
    
    let result = fmt;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(token, value);
    }
    
    return result;
  }
  
  formatTime(date: Date, format?: string): string {
    const config = this.getLocaleConfig();
    const fmt = format ?? config?.timeFormat ?? 'HH:mm';
    
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const ampm = hours24 < 12 ? 'AM' : 'PM';
    
    const tokens: Record<string, string> = {
      'HH': hours24.toString().padStart(2, '0'),
      'H': hours24.toString(),
      'hh': hours12.toString().padStart(2, '0'),
      'h': hours12.toString(),
      'mm': date.getMinutes().toString().padStart(2, '0'),
      'm': date.getMinutes().toString(),
      'ss': date.getSeconds().toString().padStart(2, '0'),
      's': date.getSeconds().toString(),
      'A': ampm,
      'a': ampm.toLowerCase()
    };
    
    let result = fmt;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(token, value);
    }
    
    return result;
  }
  
  formatDateTime(date: Date, dateFormat?: string, timeFormat?: string): string {
    return `${this.formatDate(date, dateFormat)} ${this.formatTime(date, timeFormat)}`;
  }
  
  formatRelativeTime(date: Date, baseDate: Date = new Date()): string {
    const diffMs = date.getTime() - baseDate.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffWeek = Math.round(diffDay / 7);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);
    
    if (Math.abs(diffSec) < 60) {
      return this.tp('time.seconds_ago', Math.abs(diffSec));
    } else if (Math.abs(diffMin) < 60) {
      return this.tp('time.minutes_ago', Math.abs(diffMin));
    } else if (Math.abs(diffHour) < 24) {
      return this.tp('time.hours_ago', Math.abs(diffHour));
    } else if (Math.abs(diffDay) < 7) {
      return this.tp('time.days_ago', Math.abs(diffDay));
    } else if (Math.abs(diffWeek) < 4) {
      return this.tp('time.weeks_ago', Math.abs(diffWeek));
    } else if (Math.abs(diffMonth) < 12) {
      return this.tp('time.months_ago', Math.abs(diffMonth));
    } else {
      return this.tp('time.years_ago', Math.abs(diffYear));
    }
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  // Get browser's preferred language
  static getPreferredLocale(available: string[]): string {
    const browserLangs = navigator.languages || [navigator.language];
    
    for (const lang of browserLangs) {
      // Exact match
      if (available.includes(lang)) {
        return lang;
      }
      
      // Language only match (e.g., 'en' matches 'en-US')
      const langBase = lang.split('-')[0];
      const match = available.find(a => a.startsWith(langBase));
      if (match) {
        return match;
      }
    }
    
    return available[0] ?? 'en-US';
  }
  
  // Export all translations for a locale
  exportTranslations(locale: string): LocalizationData | null {
    const translations = this.translations.get(locale);
    if (!translations) return null;
    
    return {
      locale,
      translations
    };
  }
  
  // Get all translation keys
  getAllKeys(locale?: string): string[] {
    const dict = this.translations.get(locale ?? this.currentLocale);
    if (!dict) return [];
    
    const keys: string[] = [];
    const traverse = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !('value' in value)) {
          traverse(value, fullKey);
        } else {
          keys.push(fullKey);
        }
      }
    };
    
    traverse(dict);
    return keys;
  }
  
  // Find missing translations
  findMissingTranslations(sourceLocale: string, targetLocale: string): string[] {
    const sourceKeys = this.getAllKeys(sourceLocale);
    const targetKeys = new Set(this.getAllKeys(targetLocale));
    
    return sourceKeys.filter(key => !targetKeys.has(key));
  }
}

// ============================================================================
// REACT INTEGRATION (if React is available)
// ============================================================================

export interface I18nContextValue {
  t: (key: string, values?: Record<string, any>) => string;
  tp: (key: string, count: number, values?: Record<string, any>) => string;
  locale: string;
  setLocale: (locale: string) => void;
  formatNumber: (value: number, decimals?: number) => string;
  formatCurrency: (value: number) => string;
  formatDate: (date: Date, format?: string) => string;
  formatTime: (date: Date, format?: string) => string;
  direction: 'ltr' | 'rtl';
}

// Hook-like function for non-React usage
export function createI18n(manager: LocalizationManager): I18nContextValue {
  return {
    t: (key, values) => manager.t(key, values),
    tp: (key, count, values) => manager.tp(key, count, values),
    locale: manager.getLocale(),
    setLocale: (locale) => manager.setLocale(locale),
    formatNumber: (value, decimals) => manager.formatNumber(value, decimals),
    formatCurrency: (value) => manager.formatCurrency(value),
    formatDate: (date, format) => manager.formatDate(date, format),
    formatTime: (date, format) => manager.formatTime(date, format),
    direction: manager.getTextDirection()
  };
}

// ============================================================================
// DEFAULT TRANSLATIONS (English)
// ============================================================================

export const defaultEnglishTranslations: LocalizationData = {
  locale: 'en-US',
  translations: {
    // Common
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.load': 'Load',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Information',
    
    // Time
    'time.seconds_ago': {
      value: {
        one: '{count} second ago',
        other: '{count} seconds ago'
      }
    },
    'time.minutes_ago': {
      value: {
        one: '{count} minute ago',
        other: '{count} minutes ago'
      }
    },
    'time.hours_ago': {
      value: {
        one: '{count} hour ago',
        other: '{count} hours ago'
      }
    },
    'time.days_ago': {
      value: {
        one: '{count} day ago',
        other: '{count} days ago'
      }
    },
    'time.weeks_ago': {
      value: {
        one: '{count} week ago',
        other: '{count} weeks ago'
      }
    },
    'time.months_ago': {
      value: {
        one: '{count} month ago',
        other: '{count} months ago'
      }
    },
    'time.years_ago': {
      value: {
        one: '{count} year ago',
        other: '{count} years ago'
      }
    },
    
    // Game UI
    'game.pause': 'Pause',
    'game.resume': 'Resume',
    'game.restart': 'Restart',
    'game.quit': 'Quit',
    'game.settings': 'Settings',
    'game.new_game': 'New Game',
    'game.continue': 'Continue',
    'game.load_game': 'Load Game',
    'game.save_game': 'Save Game',
    
    // Settings
    'settings.audio': 'Audio',
    'settings.video': 'Video',
    'settings.controls': 'Controls',
    'settings.language': 'Language',
    'settings.master_volume': 'Master Volume',
    'settings.music_volume': 'Music Volume',
    'settings.sfx_volume': 'SFX Volume',
    'settings.fullscreen': 'Fullscreen',
    'settings.resolution': 'Resolution',
    'settings.vsync': 'V-Sync',
    'settings.quality': 'Quality',
    'settings.quality_low': 'Low',
    'settings.quality_medium': 'Medium',
    'settings.quality_high': 'High',
    'settings.quality_ultra': 'Ultra',
    
    // Inventory
    'inventory.items': {
      value: {
        one: '{count} item',
        other: '{count} items'
      }
    },
    'inventory.weight': 'Weight: {current}/{max}',
    'inventory.empty': 'Inventory is empty',
    
    // Quest
    'quest.new': 'New Quest',
    'quest.completed': 'Quest Completed',
    'quest.failed': 'Quest Failed',
    'quest.objectives': 'Objectives',
    
    // Combat
    'combat.damage': '{value} Damage',
    'combat.heal': '+{value} HP',
    'combat.miss': 'Miss!',
    'combat.critical': 'Critical!'
  }
};

export default LocalizationManager;

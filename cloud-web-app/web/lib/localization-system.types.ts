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

export type TranslationNode = TranslationEntry | string | { [key: string]: TranslationNode };

export type TranslationDictionary = Record<string, TranslationNode>;

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

/**
 * Shared localization contracts.
 */

export type LocaleCode = string; // e.g., 'en-US', 'pt-BR', 'ja-JP'

export interface LocaleConfig {
  code: LocaleCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
    currencySymbol: string;
  };
  pluralRules: PluralRule[];
}

export interface PluralRule {
  category: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
  condition: (n: number) => boolean;
}

export interface TranslationEntry {
  value: string | TranslationPluralForm;
  context?: string;
  description?: string;
  maxLength?: number;
}

export interface TranslationPluralForm {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface TranslationNamespace {
  [key: string]: TranslationEntry | string | TranslationNamespace;
}

export interface TranslationData {
  locale: LocaleCode;
  version?: string;
  translations: TranslationNamespace;
}

export interface UserContext {
  id: string;
  email?: string;
  plan?: string;
  country?: string;
  language?: string;
  createdAt?: Date;
  attributes?: Record<string, unknown>;
}

export interface FormatOptions {
  count?: number;
  context?: string;
  defaultValue?: string;
  variables?: Record<string, string | number>;
  namespace?: string;
}

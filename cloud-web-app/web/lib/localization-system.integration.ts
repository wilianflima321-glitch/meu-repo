import type { LocalizationManager } from './localization-system';

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

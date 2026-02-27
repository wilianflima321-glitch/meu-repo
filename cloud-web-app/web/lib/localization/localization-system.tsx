/**
 * Localization System - Sistema de Internacionalização (i18n)
 * 
 * Sistema completo de localização com:
 * - Multiple language support
 * - Pluralization rules
 * - Date/time/number formatting
 * - RTL support
 * - Dynamic language switching
 * - Missing translation fallbacks
 * - Variable interpolation
 * - Context-aware translations
 * 
 * @module lib/localization/localization-system
 */

import { EventEmitter } from 'events';
import { DEFAULT_LOCALE_CONFIGS, PLURAL_RULES } from './localization-defaults';
import type {
  FormatOptions,
  LocaleCode,
  LocaleConfig,
  PluralRule,
  TranslationData,
  TranslationEntry,
  TranslationNamespace,
  UserContext,
} from './localization-types';
export type {
  FormatOptions,
  LocaleCode,
  LocaleConfig,
  PluralRule,
  TranslationData,
  TranslationEntry,
  TranslationPluralForm,
  TranslationNamespace,
  UserContext,
} from './localization-types';
export { DEFAULT_LOCALE_CONFIGS, PLURAL_RULES } from './localization-defaults';

// ============================================================================
// LOCALIZATION MANAGER
// ============================================================================

export class LocalizationManager extends EventEmitter {
  private currentLocale: LocaleCode = 'en-US';
  private fallbackLocale: LocaleCode = 'en-US';
  private localeConfigs: Map<LocaleCode, LocaleConfig> = new Map();
  private translations: Map<LocaleCode, Map<string, TranslationNamespace>> = new Map();
  private missingKeys: Set<string> = new Set();
  private debugMode = false;
  
  constructor(defaultLocale: LocaleCode = 'en-US') {
    super();
    
    // Initialize default configs
    for (const [code, config] of Object.entries(DEFAULT_LOCALE_CONFIGS)) {
      this.localeConfigs.set(code, config);
    }
    
    this.currentLocale = defaultLocale;
    this.fallbackLocale = defaultLocale;
  }
  
  // ============================================================================
  // LOCALE MANAGEMENT
  // ============================================================================
  
  setLocale(locale: LocaleCode): void {
    if (this.currentLocale === locale) return;
    
    const previousLocale = this.currentLocale;
    this.currentLocale = locale;
    
    this.emit('localeChanged', { 
      previousLocale, 
      currentLocale: locale,
      direction: this.getDirection(),
    });
  }
  
  getLocale(): LocaleCode {
    return this.currentLocale;
  }
  
  setFallbackLocale(locale: LocaleCode): void {
    this.fallbackLocale = locale;
  }
  
  getLocaleConfig(locale?: LocaleCode): LocaleConfig | undefined {
    return this.localeConfigs.get(locale || this.currentLocale);
  }
  
  registerLocaleConfig(config: LocaleConfig): void {
    this.localeConfigs.set(config.code, config);
    this.emit('localeConfigRegistered', { locale: config.code });
  }
  
  getAvailableLocales(): LocaleCode[] {
    return Array.from(this.translations.keys());
  }
  
  getDirection(): 'ltr' | 'rtl' {
    return this.localeConfigs.get(this.currentLocale)?.direction || 'ltr';
  }
  
  isRTL(): boolean {
    return this.getDirection() === 'rtl';
  }
  
  // ============================================================================
  // TRANSLATION LOADING
  // ============================================================================
  
  loadTranslations(data: TranslationData, namespace = 'default'): void {
    if (!this.translations.has(data.locale)) {
      this.translations.set(data.locale, new Map());
    }
    
    this.translations.get(data.locale)!.set(namespace, data.translations);
    this.emit('translationsLoaded', { locale: data.locale, namespace });
  }
  
  async loadTranslationsFromUrl(url: string, locale: LocaleCode, namespace = 'default'): Promise<void> {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      this.loadTranslations({
        locale,
        translations: data,
      }, namespace);
    } catch (error) {
      console.error(`Failed to load translations from ${url}:`, error);
      throw error;
    }
  }
  
  hasTranslations(locale: LocaleCode): boolean {
    return this.translations.has(locale);
  }
  
  // ============================================================================
  // TRANSLATION
  // ============================================================================
  
  t(key: string, options: FormatOptions = {}): string {
    const { namespace = 'default', variables, count, context, defaultValue } = options;
    
    // Try current locale
    let result = this.getTranslation(this.currentLocale, namespace, key, count, context);
    
    // Try fallback locale
    if (result === null && this.currentLocale !== this.fallbackLocale) {
      result = this.getTranslation(this.fallbackLocale, namespace, key, count, context);
    }
    
    // Use default value or key
    if (result === null) {
      this.trackMissingKey(key, namespace);
      result = defaultValue || key;
    }
    
    // Apply variable interpolation
    if (variables) {
      result = this.interpolate(result, variables);
    }
    
    // Apply count interpolation
    if (count !== undefined) {
      result = this.interpolate(result, { count: String(count) });
    }
    
    return result;
  }
  
  private getTranslation(
    locale: LocaleCode, 
    namespace: string, 
    key: string, 
    count?: number, 
    context?: string
  ): string | null {
    const namespaceData = this.translations.get(locale)?.get(namespace);
    if (!namespaceData) return null;
    
    // Navigate nested keys (e.g., "menu.file.save")
    const parts = key.split('.');
    let current: unknown = namespaceData;
    
    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return null;
      }
      current = (current as Record<string, unknown>)[part];
    }
    
    if (current === undefined || current === null) {
      return null;
    }
    
    // Handle string value
    if (typeof current === 'string') {
      return current;
    }
    
    // Handle translation entry object
    if (typeof current === 'object' && 'value' in current) {
      const entry = current as TranslationEntry;
      
      // Check context
      if (context && entry.context && entry.context !== context) {
        return null;
      }
      
      const value = entry.value;
      
      if (typeof value === 'string') {
        return value;
      }
      
      // Handle plural forms
      if (typeof value === 'object' && count !== undefined) {
        return this.selectPluralForm(locale, value, count);
      }
      
      return null;
    }
    
    // Handle direct plural object
    if (typeof current === 'object' && 'other' in current && count !== undefined) {
      return this.selectPluralForm(locale, current as TranslationPluralForm, count);
    }
    
    return null;
  }
  
  private selectPluralForm(locale: LocaleCode, forms: TranslationPluralForm, count: number): string {
    const config = this.localeConfigs.get(locale);
    const rules = config?.pluralRules || PLURAL_RULES.en;
    
    for (const rule of rules) {
      if (rule.condition(count)) {
        const form = forms[rule.category];
        if (form !== undefined) {
          return form;
        }
      }
    }
    
    return forms.other;
  }
  
  private interpolate(text: string, variables: Record<string, string | number>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
  
  private trackMissingKey(key: string, namespace: string): void {
    const fullKey = `${namespace}:${key}`;
    
    if (!this.missingKeys.has(fullKey)) {
      this.missingKeys.add(fullKey);
      
      if (this.debugMode) {
        console.warn(`Missing translation: ${fullKey} (${this.currentLocale})`);
      }
      
      this.emit('missingTranslation', { key, namespace, locale: this.currentLocale });
    }
  }
  
  getMissingKeys(): string[] {
    return Array.from(this.missingKeys);
  }
  
  clearMissingKeys(): void {
    this.missingKeys.clear();
  }
  
  // ============================================================================
  // FORMATTING
  // ============================================================================
  
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }
  
  formatCurrency(value: number, currencyOverride?: string): string {
    const config = this.localeConfigs.get(this.currentLocale);
    const currency = currencyOverride || config?.numberFormat.currency || 'USD';
    
    return new Intl.NumberFormat(this.currentLocale, {
      style: 'currency',
      currency,
    }).format(value);
  }
  
  formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale, options).format(d);
  }
  
  formatTime(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale, {
      hour: 'numeric',
      minute: 'numeric',
      ...options,
    }).format(d);
  }
  
  formatDateTime(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      ...options,
    }).format(d);
  }
  
  formatRelativeTime(date: Date | number, baseDate: Date = new Date()): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    const diff = d.getTime() - baseDate.getTime();
    
    const seconds = Math.abs(diff) / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const weeks = days / 7;
    const months = days / 30;
    const years = days / 365;
    
    const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
    const sign = diff < 0 ? -1 : 1;
    
    if (years >= 1) return rtf.format(sign * Math.round(years), 'year');
    if (months >= 1) return rtf.format(sign * Math.round(months), 'month');
    if (weeks >= 1) return rtf.format(sign * Math.round(weeks), 'week');
    if (days >= 1) return rtf.format(sign * Math.round(days), 'day');
    if (hours >= 1) return rtf.format(sign * Math.round(hours), 'hour');
    if (minutes >= 1) return rtf.format(sign * Math.round(minutes), 'minute');
    return rtf.format(sign * Math.round(seconds), 'second');
  }
  
  formatList(items: string[], options?: Intl.ListFormatOptions): string {
    return new Intl.ListFormat(this.currentLocale, options).format(items);
  }
  
  formatPercent(value: number): string {
    return new Intl.NumberFormat(this.currentLocale, {
      style: 'percent',
      maximumFractionDigits: 2,
    }).format(value);
  }
  
  formatCompact(value: number): string {
    return new Intl.NumberFormat(this.currentLocale, {
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  exists(key: string, namespace = 'default'): boolean {
    const result = this.getTranslation(this.currentLocale, namespace, key);
    return result !== null;
  }
  
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  detectBrowserLocale(): LocaleCode {
    if (typeof navigator === 'undefined') return this.fallbackLocale;
    
    const browserLocales = navigator.languages || [navigator.language];
    
    for (const browserLocale of browserLocales) {
      // Exact match
      if (this.translations.has(browserLocale)) {
        return browserLocale;
      }
      
      // Language match (e.g., 'en' matches 'en-US')
      const lang = browserLocale.split('-')[0];
      for (const availableLocale of this.translations.keys()) {
        if (availableLocale.startsWith(lang)) {
          return availableLocale;
        }
      }
    }
    
    return this.fallbackLocale;
  }
  
  getLocaleInfo(): {
    code: LocaleCode;
    name: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
  } {
    const config = this.localeConfigs.get(this.currentLocale);
    
    return {
      code: this.currentLocale,
      name: config?.name || this.currentLocale,
      nativeName: config?.nativeName || this.currentLocale,
      direction: config?.direction || 'ltr',
    };
  }
  
  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  exportTranslations(locale: LocaleCode, namespace = 'default'): TranslationNamespace | null {
    return this.translations.get(locale)?.get(namespace) || null;
  }
  
  exportAllTranslations(): Record<LocaleCode, Record<string, TranslationNamespace>> {
    const result: Record<LocaleCode, Record<string, TranslationNamespace>> = {};
    
    for (const [locale, namespaces] of this.translations) {
      result[locale] = {};
      for (const [ns, data] of namespaces) {
        result[locale][ns] = data;
      }
    }
    
    return result;
  }
  
  dispose(): void {
    this.translations.clear();
    this.localeConfigs.clear();
    this.missingKeys.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// TRANSLATION KEY BUILDER
// ============================================================================

export class TranslationKeyBuilder {
  private translations: TranslationNamespace = {};
  
  add(key: string, value: string | TranslationPluralForm, options?: { context?: string; description?: string }): this {
    const parts = key.split('.');
    let current = this.translations;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as TranslationNamespace;
    }
    
    const lastKey = parts[parts.length - 1];
    
    if (options?.context || options?.description) {
      current[lastKey] = {
        value,
        context: options.context,
        description: options.description,
      };
    } else {
      current[lastKey] = value as string;
    }
    
    return this;
  }
  
  addPlural(key: string, forms: TranslationPluralForm): this {
    return this.add(key, forms);
  }
  
  build(): TranslationNamespace {
    return this.translations;
  }
  
  toJSON(): string {
    return JSON.stringify(this.translations, null, 2);
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

const LocalizationContext = createContext<LocalizationManager | null>(null);

export interface LocalizationProviderProps {
  children: React.ReactNode;
  defaultLocale?: LocaleCode;
  translations?: TranslationData[];
}

export function LocalizationProvider({ 
  children, 
  defaultLocale = 'en-US',
  translations = [],
}: LocalizationProviderProps) {
  const managerRef = useRef<LocalizationManager>(new LocalizationManager(defaultLocale));
  
  useEffect(() => {
    for (const data of translations) {
      managerRef.current.loadTranslations(data);
    }
  }, [translations]);
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <LocalizationContext.Provider value={managerRef.current}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const manager = useContext(LocalizationContext);
  if (!manager) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  
  const [locale, setLocaleState] = useState(manager.getLocale());
  const [direction, setDirection] = useState(manager.getDirection());
  
  useEffect(() => {
    const handleChange = ({ currentLocale, direction: dir }: { currentLocale: LocaleCode; direction: 'ltr' | 'rtl' }) => {
      setLocaleState(currentLocale);
      setDirection(dir);
    };
    
    manager.on('localeChanged', handleChange);
    
    return () => {
      manager.off('localeChanged', handleChange);
    };
  }, [manager]);
  
  const setLocale = useCallback((newLocale: LocaleCode) => {
    manager.setLocale(newLocale);
  }, [manager]);
  
  const t = useCallback((key: string, options?: FormatOptions) => {
    return manager.t(key, options);
  }, [manager]);
  
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return manager.formatNumber(value, options);
  }, [manager]);
  
  const formatCurrency = useCallback((value: number, currency?: string) => {
    return manager.formatCurrency(value, currency);
  }, [manager]);
  
  const formatDate = useCallback((date: Date | number, options?: Intl.DateTimeFormatOptions) => {
    return manager.formatDate(date, options);
  }, [manager]);
  
  const formatRelativeTime = useCallback((date: Date | number) => {
    return manager.formatRelativeTime(date);
  }, [manager]);
  
  return {
    manager,
    locale,
    direction,
    isRTL: direction === 'rtl',
    setLocale,
    t,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
    availableLocales: manager.getAvailableLocales(),
    localeInfo: manager.getLocaleInfo(),
  };
}

export function useTranslation(namespace = 'default') {
  const { manager, locale } = useLocalization();
  
  const t = useCallback((key: string, options?: Omit<FormatOptions, 'namespace'>) => {
    return manager.t(key, { ...options, namespace });
  }, [manager, namespace]);
  
  const exists = useCallback((key: string) => {
    return manager.exists(key, namespace);
  }, [manager, namespace]);
  
  return { t, exists, locale };
}

export function useFormattedNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const { formatNumber } = useLocalization();
  return useMemo(() => formatNumber(value, options), [value, options, formatNumber]);
}

export function useFormattedDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  const { formatDate } = useLocalization();
  return useMemo(() => formatDate(date, options), [date, options, formatDate]);
}

// ============================================================================
// HOC FOR CLASS COMPONENTS
// ============================================================================

export function withLocalization<P extends object>(
  WrappedComponent: React.ComponentType<P & ReturnType<typeof useLocalization>>
) {
  return function WithLocalizationComponent(props: P) {
    const localization = useLocalization();
    return <WrappedComponent {...props} {...localization} />;
  };
}

const __defaultExport = {
  LocalizationManager,
  TranslationKeyBuilder,
  LocalizationProvider,
  useLocalization,
  useTranslation,
  useFormattedNumber,
  useFormattedDate,
  withLocalization,
  DEFAULT_LOCALE_CONFIGS,
  PLURAL_RULES,
};

export default __defaultExport;

/**
 * Localization System - Professional i18n Infrastructure
 * 
 * Sistema de localização profissional para IDE de produção.
 * Inspirado em VS Code, JetBrains, Unreal Engine.
 * Suporta:
 * - Múltiplos idiomas
 * - Formatação regional (datas, números, moeda)
 * - Pluralização inteligente
 * - Interpolação de variáveis
 * - Hot-reload de traduções
 * - Fallback hierárquico
 * - RTL (Right-to-Left)
 * - Contribuição de extensões
 */

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Localization Types ====================

/**
 * Locale identifier (BCP 47)
 */
export type LocaleId = string;

/**
 * Translation key
 */
export type TranslationKey = string;

/**
 * Locale metadata
 */
export interface LocaleMetadata {
    id: LocaleId;
    name: string;
    nativeName: string;
    region?: string;
    script?: string;
    direction: 'ltr' | 'rtl';
    dateFormat: string;
    timeFormat: string;
    numberFormat: NumberFormatOptions;
    currencyFormat: CurrencyFormatOptions;
    pluralRules: PluralRules;
    fallback?: LocaleId;
}

/**
 * Number format options
 */
export interface NumberFormatOptions {
    decimalSeparator: string;
    thousandsSeparator: string;
    groupingSize: number;
}

/**
 * Currency format options
 */
export interface CurrencyFormatOptions {
    symbol: string;
    position: 'before' | 'after';
    spaceBetween: boolean;
    decimalPlaces: number;
}

/**
 * Plural rules
 */
export interface PluralRules {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
}

/**
 * Translation entry
 */
export interface TranslationEntry {
    key: TranslationKey;
    value: string;
    comment?: string;
    context?: string;
    plural?: PluralTranslation;
}

/**
 * Plural translation
 */
export interface PluralTranslation {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
}

/**
 * Translation bundle
 */
export interface TranslationBundle {
    locale: LocaleId;
    namespace: string;
    translations: Map<TranslationKey, TranslationEntry>;
    version?: string;
    contributors?: string[];
}

/**
 * Localization options
 */
export interface LocalizationOptions {
    defaultLocale: LocaleId;
    fallbackLocale: LocaleId;
    loadOnDemand: boolean;
    cacheTranslations: boolean;
    detectBrowserLocale: boolean;
    supportedLocales: LocaleId[];
}

/**
 * Interpolation context
 */
export interface InterpolationContext {
    [key: string]: string | number | boolean | Date | undefined;
}

// ==================== Events ====================

/**
 * Locale changed event
 */
export interface LocaleChangedEvent {
    previousLocale: LocaleId;
    currentLocale: LocaleId;
    timestamp: number;
}

/**
 * Translation loaded event
 */
export interface TranslationLoadedEvent {
    locale: LocaleId;
    namespace: string;
    entryCount: number;
}

/**
 * Missing translation event
 */
export interface MissingTranslationEvent {
    key: TranslationKey;
    locale: LocaleId;
    namespace?: string;
    fallbackValue?: string;
}

// ==================== Built-in Locales ====================

const BUILT_IN_LOCALES: LocaleMetadata[] = [
    {
        id: 'en',
        name: 'English',
        nativeName: 'English',
        region: 'US',
        direction: 'ltr',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: 'h:mm a',
        numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', groupingSize: 3 },
        currencyFormat: { symbol: '$', position: 'before', spaceBetween: false, decimalPlaces: 2 },
        pluralRules: { one: 'n == 1', other: '' }
    },
    {
        id: 'pt-BR',
        name: 'Portuguese (Brazil)',
        nativeName: 'Português (Brasil)',
        region: 'BR',
        direction: 'ltr',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', groupingSize: 3 },
        currencyFormat: { symbol: 'R$', position: 'before', spaceBetween: true, decimalPlaces: 2 },
        pluralRules: { one: 'n == 1', other: '' }
    },
    {
        id: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', groupingSize: 3 },
        currencyFormat: { symbol: '€', position: 'after', spaceBetween: true, decimalPlaces: 2 },
        pluralRules: { one: 'n == 1', other: '' }
    },
    {
        id: 'fr',
        name: 'French',
        nativeName: 'Français',
        direction: 'ltr',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: ',', thousandsSeparator: ' ', groupingSize: 3 },
        currencyFormat: { symbol: '€', position: 'after', spaceBetween: true, decimalPlaces: 2 },
        pluralRules: { one: 'n == 0 || n == 1', other: '' }
    },
    {
        id: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        direction: 'ltr',
        dateFormat: 'dd.MM.yyyy',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', groupingSize: 3 },
        currencyFormat: { symbol: '€', position: 'after', spaceBetween: true, decimalPlaces: 2 },
        pluralRules: { one: 'n == 1', other: '' }
    },
    {
        id: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        direction: 'ltr',
        dateFormat: 'yyyy/MM/dd',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', groupingSize: 3 },
        currencyFormat: { symbol: '¥', position: 'before', spaceBetween: false, decimalPlaces: 0 },
        pluralRules: { other: '' }
    },
    {
        id: 'zh-CN',
        name: 'Chinese (Simplified)',
        nativeName: '简体中文',
        region: 'CN',
        direction: 'ltr',
        dateFormat: 'yyyy/MM/dd',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', groupingSize: 4 },
        currencyFormat: { symbol: '¥', position: 'before', spaceBetween: false, decimalPlaces: 2 },
        pluralRules: { other: '' }
    },
    {
        id: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        direction: 'ltr',
        dateFormat: 'yyyy.MM.dd',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', groupingSize: 3 },
        currencyFormat: { symbol: '₩', position: 'before', spaceBetween: false, decimalPlaces: 0 },
        pluralRules: { other: '' }
    },
    {
        id: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        direction: 'ltr',
        dateFormat: 'dd.MM.yyyy',
        timeFormat: 'HH:mm',
        numberFormat: { decimalSeparator: ',', thousandsSeparator: ' ', groupingSize: 3 },
        currencyFormat: { symbol: '₽', position: 'after', spaceBetween: true, decimalPlaces: 2 },
        pluralRules: {
            one: 'n % 10 == 1 && n % 100 != 11',
            few: 'n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)',
            many: 'n % 10 == 0 || (n % 10 >= 5 && n % 10 <= 9) || (n % 100 >= 11 && n % 100 <= 14)',
            other: ''
        }
    },
    {
        id: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'hh:mm a',
        numberFormat: { decimalSeparator: '٫', thousandsSeparator: '٬', groupingSize: 3 },
        currencyFormat: { symbol: 'ر.س', position: 'after', spaceBetween: true, decimalPlaces: 2 },
        pluralRules: {
            zero: 'n == 0',
            one: 'n == 1',
            two: 'n == 2',
            few: 'n % 100 >= 3 && n % 100 <= 10',
            many: 'n % 100 >= 11 && n % 100 <= 99',
            other: ''
        }
    }
];

// ==================== Main Localization System ====================

@injectable()
export class LocalizationSystem {
    // Configuration
    private options: LocalizationOptions = {
        defaultLocale: 'en',
        fallbackLocale: 'en',
        loadOnDemand: true,
        cacheTranslations: true,
        detectBrowserLocale: true,
        supportedLocales: ['en', 'pt-BR', 'es', 'fr', 'de', 'ja', 'zh-CN', 'ko', 'ru', 'ar']
    };

    // State
    private currentLocale: LocaleId = 'en';
    private readonly locales: Map<LocaleId, LocaleMetadata> = new Map();
    private readonly bundles: Map<string, TranslationBundle> = new Map();
    private readonly cache: Map<string, string> = new Map();
    private readonly missingKeys: Set<string> = new Set();
    
    // Extension contributions
    private readonly extensionBundles: Map<string, TranslationBundle[]> = new Map();

    // Events
    private readonly onLocaleChangedEmitter = new Emitter<LocaleChangedEvent>();
    readonly onLocaleChanged: Event<LocaleChangedEvent> = this.onLocaleChangedEmitter.event;
    
    private readonly onTranslationLoadedEmitter = new Emitter<TranslationLoadedEvent>();
    readonly onTranslationLoaded: Event<TranslationLoadedEvent> = this.onTranslationLoadedEmitter.event;
    
    private readonly onMissingTranslationEmitter = new Emitter<MissingTranslationEvent>();
    readonly onMissingTranslation: Event<MissingTranslationEvent> = this.onMissingTranslationEmitter.event;

    constructor() {
        this.initialize();
    }

    // ==================== Initialization ====================

    /**
     * Initialize localization system
     */
    private initialize(): void {
        // Register built-in locales
        for (const locale of BUILT_IN_LOCALES) {
            this.locales.set(locale.id, locale);
        }
        
        // Detect locale
        if (this.options.detectBrowserLocale) {
            this.detectAndSetLocale();
        }
    }

    /**
     * Detect browser locale
     */
    private detectAndSetLocale(): void {
        // In browser environment
        if (typeof navigator !== 'undefined') {
            const browserLocales = navigator.languages || [navigator.language];
            
            for (const locale of browserLocales) {
                const normalized = this.normalizeLocale(locale);
                if (this.options.supportedLocales.includes(normalized)) {
                    this.currentLocale = normalized;
                    return;
                }
                
                // Try base language
                const base = locale.split('-')[0];
                if (this.options.supportedLocales.includes(base)) {
                    this.currentLocale = base;
                    return;
                }
            }
        }
        
        this.currentLocale = this.options.defaultLocale;
    }

    /**
     * Normalize locale ID
     */
    private normalizeLocale(locale: string): LocaleId {
        return locale.replace('_', '-');
    }

    // ==================== Locale Management ====================

    /**
     * Set current locale
     */
    setLocale(locale: LocaleId): boolean {
        const normalized = this.normalizeLocale(locale);
        
        if (!this.options.supportedLocales.includes(normalized)) {
            console.warn(`Locale "${locale}" is not supported`);
            return false;
        }
        
        if (normalized === this.currentLocale) {
            return true;
        }
        
        const previous = this.currentLocale;
        this.currentLocale = normalized;
        
        // Clear cache when locale changes
        this.cache.clear();
        
        this.onLocaleChangedEmitter.fire({
            previousLocale: previous,
            currentLocale: normalized,
            timestamp: Date.now()
        });
        
        return true;
    }

    /**
     * Get current locale
     */
    getLocale(): LocaleId {
        return this.currentLocale;
    }

    /**
     * Get locale metadata
     */
    getLocaleMetadata(locale?: LocaleId): LocaleMetadata | undefined {
        return this.locales.get(locale || this.currentLocale);
    }

    /**
     * Get available locales
     */
    getAvailableLocales(): LocaleMetadata[] {
        return Array.from(this.locales.values());
    }

    /**
     * Get supported locale IDs
     */
    getSupportedLocales(): LocaleId[] {
        return [...this.options.supportedLocales];
    }

    /**
     * Check if locale is RTL
     */
    isRTL(locale?: LocaleId): boolean {
        const metadata = this.getLocaleMetadata(locale);
        return metadata?.direction === 'rtl';
    }

    /**
     * Register custom locale
     */
    registerLocale(metadata: LocaleMetadata): void {
        this.locales.set(metadata.id, metadata);
        
        if (!this.options.supportedLocales.includes(metadata.id)) {
            this.options.supportedLocales.push(metadata.id);
        }
    }

    // ==================== Translation ====================

    /**
     * Translate key
     */
    t(key: TranslationKey, context?: InterpolationContext): string {
        return this.translate(key, context);
    }

    /**
     * Translate key (full method)
     */
    translate(
        key: TranslationKey,
        context?: InterpolationContext,
        options?: { locale?: LocaleId; namespace?: string }
    ): string {
        const locale = options?.locale || this.currentLocale;
        const namespace = options?.namespace || 'default';
        
        // Check cache
        const cacheKey = `${locale}:${namespace}:${key}`;
        if (this.options.cacheTranslations && this.cache.has(cacheKey)) {
            return this.interpolate(this.cache.get(cacheKey)!, context);
        }
        
        // Find translation
        let translation = this.findTranslation(key, locale, namespace);
        
        // Try fallback
        if (!translation && locale !== this.options.fallbackLocale) {
            translation = this.findTranslation(key, this.options.fallbackLocale, namespace);
        }
        
        // Report missing
        if (!translation) {
            const missingKey = `${locale}:${namespace}:${key}`;
            if (!this.missingKeys.has(missingKey)) {
                this.missingKeys.add(missingKey);
                this.onMissingTranslationEmitter.fire({
                    key,
                    locale,
                    namespace,
                    fallbackValue: key
                });
            }
            return key;
        }
        
        // Cache result
        if (this.options.cacheTranslations) {
            this.cache.set(cacheKey, translation);
        }
        
        return this.interpolate(translation, context);
    }

    /**
     * Find translation in bundles
     */
    private findTranslation(
        key: TranslationKey,
        locale: LocaleId,
        namespace: string
    ): string | undefined {
        // Check main bundle
        const bundleKey = `${locale}:${namespace}`;
        const bundle = this.bundles.get(bundleKey);
        
        if (bundle) {
            const entry = bundle.translations.get(key);
            if (entry) return entry.value;
        }
        
        // Check extension bundles
        for (const bundles of this.extensionBundles.values()) {
            for (const extBundle of bundles) {
                if (extBundle.locale === locale) {
                    const entry = extBundle.translations.get(key);
                    if (entry) return entry.value;
                }
            }
        }
        
        return undefined;
    }

    /**
     * Translate with plural
     */
    tp(
        key: TranslationKey,
        count: number,
        context?: InterpolationContext
    ): string {
        const locale = this.currentLocale;
        const namespace = 'default';
        const bundleKey = `${locale}:${namespace}`;
        const bundle = this.bundles.get(bundleKey);
        
        if (bundle) {
            const entry = bundle.translations.get(key);
            if (entry?.plural) {
                const pluralForm = this.getPluralForm(count, locale);
                const translation = entry.plural[pluralForm] || entry.plural.other;
                return this.interpolate(translation, { ...context, count });
            }
        }
        
        // Fallback to regular translation
        return this.translate(key, { ...context, count });
    }

    /**
     * Get plural form
     */
    private getPluralForm(
        n: number,
        locale: LocaleId
    ): keyof PluralTranslation {
        const metadata = this.locales.get(locale);
        if (!metadata) return 'other';
        
        const rules = metadata.pluralRules;
        
        // Evaluate rules
        if (rules.zero && this.evaluatePluralRule(rules.zero, n)) return 'zero';
        if (rules.one && this.evaluatePluralRule(rules.one, n)) return 'one';
        if (rules.two && this.evaluatePluralRule(rules.two, n)) return 'two';
        if (rules.few && this.evaluatePluralRule(rules.few, n)) return 'few';
        if (rules.many && this.evaluatePluralRule(rules.many, n)) return 'many';
        
        return 'other';
    }

    /**
     * Evaluate plural rule
     */
    private evaluatePluralRule(rule: string, n: number): boolean {
        if (!rule) return false;
        
        // Simple expression evaluator
        const expression = rule
            .replace(/n/g, n.toString())
            .replace(/==/g, '===')
            .replace(/!=/g, '!==');
        
        try {
            return Function(`return ${expression}`)();
        } catch {
            return false;
        }
    }

    /**
     * Interpolate variables
     */
    private interpolate(text: string, context?: InterpolationContext): string {
        if (!context) return text;
        
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = context[key];
            if (value === undefined) return match;
            
            if (value instanceof Date) {
                return this.formatDate(value);
            }
            
            return String(value);
        });
    }

    // ==================== Bundle Management ====================

    /**
     * Load translation bundle
     */
    loadBundle(bundle: TranslationBundle): void {
        const key = `${bundle.locale}:${bundle.namespace}`;
        
        // Merge with existing
        const existing = this.bundles.get(key);
        if (existing) {
            for (const [entryKey, entry] of bundle.translations) {
                existing.translations.set(entryKey, entry);
            }
        } else {
            this.bundles.set(key, bundle);
        }
        
        // Clear relevant cache entries
        for (const [cacheKey] of this.cache) {
            if (cacheKey.startsWith(`${bundle.locale}:${bundle.namespace}:`)) {
                this.cache.delete(cacheKey);
            }
        }
        
        this.onTranslationLoadedEmitter.fire({
            locale: bundle.locale,
            namespace: bundle.namespace,
            entryCount: bundle.translations.size
        });
    }

    /**
     * Load translations from object
     */
    loadTranslations(
        locale: LocaleId,
        translations: Record<string, string | { value: string; comment?: string; plural?: PluralTranslation }>,
        namespace: string = 'default'
    ): void {
        const entries = new Map<TranslationKey, TranslationEntry>();
        
        for (const [key, value] of Object.entries(translations)) {
            if (typeof value === 'string') {
                entries.set(key, { key, value });
            } else {
                entries.set(key, {
                    key,
                    value: value.value,
                    comment: value.comment,
                    plural: value.plural
                });
            }
        }
        
        this.loadBundle({
            locale,
            namespace,
            translations: entries
        });
    }

    /**
     * Register extension translations
     */
    registerExtensionTranslations(extensionId: string, bundles: TranslationBundle[]): void {
        this.extensionBundles.set(extensionId, bundles);
        
        for (const bundle of bundles) {
            this.onTranslationLoadedEmitter.fire({
                locale: bundle.locale,
                namespace: `ext:${extensionId}`,
                entryCount: bundle.translations.size
            });
        }
    }

    /**
     * Unregister extension translations
     */
    unregisterExtensionTranslations(extensionId: string): void {
        this.extensionBundles.delete(extensionId);
    }

    /**
     * Get all translations for locale
     */
    getAllTranslations(locale: LocaleId, namespace?: string): Map<TranslationKey, TranslationEntry> {
        const result = new Map<TranslationKey, TranslationEntry>();
        
        for (const [key, bundle] of this.bundles) {
            if (key.startsWith(`${locale}:`)) {
                if (namespace && !key.endsWith(`:${namespace}`)) continue;
                
                for (const [entryKey, entry] of bundle.translations) {
                    result.set(entryKey, entry);
                }
            }
        }
        
        return result;
    }

    // ==================== Formatting ====================

    /**
     * Format number
     */
    formatNumber(value: number, options?: { decimals?: number }): string {
        const metadata = this.getLocaleMetadata();
        if (!metadata) return value.toString();
        
        const { decimalSeparator, thousandsSeparator, groupingSize } = metadata.numberFormat;
        
        const [intPart, decPart] = value.toFixed(options?.decimals ?? 2).split('.');
        
        // Format integer part with grouping
        let formatted = '';
        const digits = intPart.replace('-', '');
        const isNegative = intPart.startsWith('-');
        
        for (let i = 0; i < digits.length; i++) {
            if (i > 0 && (digits.length - i) % groupingSize === 0) {
                formatted += thousandsSeparator;
            }
            formatted += digits[i];
        }
        
        if (isNegative) formatted = '-' + formatted;
        if (decPart) formatted += decimalSeparator + decPart;
        
        return formatted;
    }

    /**
     * Format currency
     */
    formatCurrency(value: number, currencyCode?: string): string {
        const metadata = this.getLocaleMetadata();
        if (!metadata) return value.toString();
        
        const { symbol, position, spaceBetween, decimalPlaces } = metadata.currencyFormat;
        const formattedNumber = this.formatNumber(value, { decimals: decimalPlaces });
        
        const space = spaceBetween ? ' ' : '';
        
        if (position === 'before') {
            return `${symbol}${space}${formattedNumber}`;
        } else {
            return `${formattedNumber}${space}${symbol}`;
        }
    }

    /**
     * Format date
     */
    formatDate(date: Date, format?: string): string {
        const metadata = this.getLocaleMetadata();
        const pattern = format || metadata?.dateFormat || 'yyyy-MM-dd';
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        return pattern
            .replace('yyyy', year.toString())
            .replace('MM', month.toString().padStart(2, '0'))
            .replace('dd', day.toString().padStart(2, '0'));
    }

    /**
     * Format time
     */
    formatTime(date: Date, format?: string): string {
        const metadata = this.getLocaleMetadata();
        const pattern = format || metadata?.timeFormat || 'HH:mm';
        
        const hours24 = date.getHours();
        const hours12 = hours24 % 12 || 12;
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const ampm = hours24 >= 12 ? 'PM' : 'AM';
        
        return pattern
            .replace('HH', hours24.toString().padStart(2, '0'))
            .replace('hh', hours12.toString().padStart(2, '0'))
            .replace('h', hours12.toString())
            .replace('mm', minutes.toString().padStart(2, '0'))
            .replace('ss', seconds.toString().padStart(2, '0'))
            .replace('a', ampm.toLowerCase())
            .replace('A', ampm);
    }

    /**
     * Format date and time
     */
    formatDateTime(date: Date, dateFormat?: string, timeFormat?: string): string {
        return `${this.formatDate(date, dateFormat)} ${this.formatTime(date, timeFormat)}`;
    }

    /**
     * Format relative time
     */
    formatRelativeTime(date: Date, baseDate?: Date): string {
        const now = baseDate || new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) {
            return this.tp('time.secondsAgo', diffSecs, { count: diffSecs });
        } else if (diffMins < 60) {
            return this.tp('time.minutesAgo', diffMins, { count: diffMins });
        } else if (diffHours < 24) {
            return this.tp('time.hoursAgo', diffHours, { count: diffHours });
        } else if (diffDays < 30) {
            return this.tp('time.daysAgo', diffDays, { count: diffDays });
        } else {
            return this.formatDate(date);
        }
    }

    /**
     * Format file size
     */
    formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        let size = bytes;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        const decimals = unitIndex === 0 ? 0 : 2;
        return `${this.formatNumber(size, { decimals })} ${units[unitIndex]}`;
    }

    /**
     * Format duration
     */
    formatDuration(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else if (minutes > 0) {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `0:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Format percentage
     */
    formatPercentage(value: number, decimals: number = 0): string {
        return `${this.formatNumber(value * 100, { decimals })}%`;
    }

    // ==================== Validation ====================

    /**
     * Check if translation exists
     */
    hasTranslation(key: TranslationKey, locale?: LocaleId, namespace?: string): boolean {
        const loc = locale || this.currentLocale;
        const ns = namespace || 'default';
        
        return this.findTranslation(key, loc, ns) !== undefined;
    }

    /**
     * Get missing translation keys
     */
    getMissingKeys(): string[] {
        return Array.from(this.missingKeys);
    }

    /**
     * Clear missing keys
     */
    clearMissingKeys(): void {
        this.missingKeys.clear();
    }

    // ==================== Utilities ====================

    /**
     * Clear translation cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        currentLocale: LocaleId;
        availableLocales: number;
        loadedBundles: number;
        totalTranslations: number;
        cachedEntries: number;
        missingKeys: number;
    } {
        let totalTranslations = 0;
        for (const bundle of this.bundles.values()) {
            totalTranslations += bundle.translations.size;
        }
        
        return {
            currentLocale: this.currentLocale,
            availableLocales: this.locales.size,
            loadedBundles: this.bundles.size,
            totalTranslations,
            cachedEntries: this.cache.size,
            missingKeys: this.missingKeys.size
        };
    }

    /**
     * Export translations for locale
     */
    exportTranslations(locale: LocaleId, namespace?: string): Record<string, string> {
        const translations = this.getAllTranslations(locale, namespace);
        const result: Record<string, string> = {};
        
        for (const [key, entry] of translations) {
            result[key] = entry.value;
        }
        
        return result;
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.cache.clear();
        this.bundles.clear();
        this.extensionBundles.clear();
        this.missingKeys.clear();
        
        this.onLocaleChangedEmitter.dispose();
        this.onTranslationLoadedEmitter.dispose();
        this.onMissingTranslationEmitter.dispose();
    }
}

// ==================== Helper Functions ====================

/**
 * Create localization context for React/Vue components
 */
export function createLocalizationContext(system: LocalizationSystem) {
    return {
        t: (key: TranslationKey, context?: InterpolationContext) => system.t(key, context),
        tp: (key: TranslationKey, count: number, context?: InterpolationContext) => system.tp(key, count, context),
        locale: system.getLocale(),
        setLocale: (locale: LocaleId) => system.setLocale(locale),
        isRTL: () => system.isRTL(),
        formatNumber: (value: number, options?: { decimals?: number }) => system.formatNumber(value, options),
        formatDate: (date: Date, format?: string) => system.formatDate(date, format),
        formatTime: (date: Date, format?: string) => system.formatTime(date, format),
        formatCurrency: (value: number) => system.formatCurrency(value)
    };
}

// ==================== Export ====================

export default LocalizationSystem;

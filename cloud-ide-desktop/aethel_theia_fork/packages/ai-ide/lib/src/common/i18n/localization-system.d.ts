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
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
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
export declare class LocalizationSystem {
    private options;
    private currentLocale;
    private readonly locales;
    private readonly bundles;
    private readonly cache;
    private readonly missingKeys;
    private readonly extensionBundles;
    private readonly onLocaleChangedEmitter;
    readonly onLocaleChanged: Event<LocaleChangedEvent>;
    private readonly onTranslationLoadedEmitter;
    readonly onTranslationLoaded: Event<TranslationLoadedEvent>;
    private readonly onMissingTranslationEmitter;
    readonly onMissingTranslation: Event<MissingTranslationEvent>;
    constructor();
    /**
     * Initialize localization system
     */
    private initialize;
    /**
     * Detect browser locale
     */
    private detectAndSetLocale;
    /**
     * Normalize locale ID
     */
    private normalizeLocale;
    /**
     * Set current locale
     */
    setLocale(locale: LocaleId): boolean;
    /**
     * Get current locale
     */
    getLocale(): LocaleId;
    /**
     * Get locale metadata
     */
    getLocaleMetadata(locale?: LocaleId): LocaleMetadata | undefined;
    /**
     * Get available locales
     */
    getAvailableLocales(): LocaleMetadata[];
    /**
     * Get supported locale IDs
     */
    getSupportedLocales(): LocaleId[];
    /**
     * Check if locale is RTL
     */
    isRTL(locale?: LocaleId): boolean;
    /**
     * Register custom locale
     */
    registerLocale(metadata: LocaleMetadata): void;
    /**
     * Translate key
     */
    t(key: TranslationKey, context?: InterpolationContext): string;
    /**
     * Translate key (full method)
     */
    translate(key: TranslationKey, context?: InterpolationContext, options?: {
        locale?: LocaleId;
        namespace?: string;
    }): string;
    /**
     * Find translation in bundles
     */
    private findTranslation;
    /**
     * Translate with plural
     */
    tp(key: TranslationKey, count: number, context?: InterpolationContext): string;
    /**
     * Get plural form
     */
    private getPluralForm;
    /**
     * Evaluate plural rule
     */
    private evaluatePluralRule;
    /**
     * Interpolate variables
     */
    private interpolate;
    /**
     * Load translation bundle
     */
    loadBundle(bundle: TranslationBundle): void;
    /**
     * Load translations from object
     */
    loadTranslations(locale: LocaleId, translations: Record<string, string | {
        value: string;
        comment?: string;
        plural?: PluralTranslation;
    }>, namespace?: string): void;
    /**
     * Register extension translations
     */
    registerExtensionTranslations(extensionId: string, bundles: TranslationBundle[]): void;
    /**
     * Unregister extension translations
     */
    unregisterExtensionTranslations(extensionId: string): void;
    /**
     * Get all translations for locale
     */
    getAllTranslations(locale: LocaleId, namespace?: string): Map<TranslationKey, TranslationEntry>;
    /**
     * Format number
     */
    formatNumber(value: number, options?: {
        decimals?: number;
    }): string;
    /**
     * Format currency
     */
    formatCurrency(value: number, currencyCode?: string): string;
    /**
     * Format date
     */
    formatDate(date: Date, format?: string): string;
    /**
     * Format time
     */
    formatTime(date: Date, format?: string): string;
    /**
     * Format date and time
     */
    formatDateTime(date: Date, dateFormat?: string, timeFormat?: string): string;
    /**
     * Format relative time
     */
    formatRelativeTime(date: Date, baseDate?: Date): string;
    /**
     * Format file size
     */
    formatFileSize(bytes: number): string;
    /**
     * Format duration
     */
    formatDuration(milliseconds: number): string;
    /**
     * Format percentage
     */
    formatPercentage(value: number, decimals?: number): string;
    /**
     * Check if translation exists
     */
    hasTranslation(key: TranslationKey, locale?: LocaleId, namespace?: string): boolean;
    /**
     * Get missing translation keys
     */
    getMissingKeys(): string[];
    /**
     * Clear missing keys
     */
    clearMissingKeys(): void;
    /**
     * Clear translation cache
     */
    clearCache(): void;
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
    };
    /**
     * Export translations for locale
     */
    exportTranslations(locale: LocaleId, namespace?: string): Record<string, string>;
    /**
     * Dispose
     */
    dispose(): void;
}
/**
 * Create localization context for React/Vue components
 */
export declare function createLocalizationContext(system: LocalizationSystem): {
    t: (key: TranslationKey, context?: InterpolationContext) => string;
    tp: (key: TranslationKey, count: number, context?: InterpolationContext) => string;
    locale: string;
    setLocale: (locale: LocaleId) => boolean;
    isRTL: () => boolean;
    formatNumber: (value: number, options?: {
        decimals?: number;
    }) => string;
    formatDate: (date: Date, format?: string) => string;
    formatTime: (date: Date, format?: string) => string;
    formatCurrency: (value: number) => string;
};
export default LocalizationSystem;

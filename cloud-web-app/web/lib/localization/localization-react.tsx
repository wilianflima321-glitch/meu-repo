import type React from 'react';

import { LocalizationManager } from './localization-system';
import type { FormatOptions, LocaleCode, TranslationData } from './localization-system.types';

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

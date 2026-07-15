'use client';

import { createContext, createElement, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EvaluationResult, FeatureFlag, UserContext } from './feature-flags.types';
import { FeatureFlagService } from './feature-flags.service';

interface FeatureFlagContextType {
  isEnabled: (key: string) => boolean;
  evaluate: (key: string) => EvaluationResult;
  getVariant: (key: string) => string | null;
  getAllFlags: () => FeatureFlag[];
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

export function FeatureFlagProvider({
  children,
  user,
}: {
  children: ReactNode;
  user?: UserContext;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState({});

  const service = useMemo(() => FeatureFlagService.getInstance(), []);

  useEffect(() => {
    service.syncFromServer().finally(() => setIsLoading(false));

    const unsubscribe = service.subscribe(() => forceUpdate({}));
    return () => unsubscribe();
  }, [service]);

  const isEnabled = useCallback((key: string) => {
    return service.evaluate(key, user).enabled;
  }, [service, user]);

  const evaluate = useCallback((key: string) => {
    return service.evaluate(key, user);
  }, [service, user]);

  const getVariant = useCallback((key: string) => {
    const result = service.evaluate(key, user);
    return result.variant || null;
  }, [service, user]);

  const getAllFlags = useCallback(() => {
    return service.getAllFlags();
  }, [service]);

  return createElement(
    FeatureFlagContext.Provider,
    {
      value: {
        isEnabled,
        evaluate,
        getVariant,
        getAllFlags,
        isLoading,
      },
    },
    children
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
}

export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}

export function useVariant(key: string): string | null {
  const { getVariant } = useFeatureFlags();
  return getVariant(key);
}

// ============================================================================
// COMPONENTES UTILITÁRIOS
// ============================================================================

interface FeatureProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled
    ? createElement(Fragment, null, children)
    : createElement(Fragment, null, fallback);
}

interface VariantProps {
  flag: string;
  variant: string;
  children: ReactNode;
}

export function Variant({ flag, variant, children }: VariantProps) {
  const currentVariant = useVariant(flag);
  return currentVariant === variant ? createElement(Fragment, null, children) : null;
}

'use client';

import { logger } from '@/lib/observability/logger';
/**
 * Feature Flag Component - Aethel Engine
 *
 * Componente para renderização condicional baseada em feature flags
 */

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';

interface FeatureFlag {
  key: string;
  name: string;
  enabled: boolean;
  type: string;
  percentage?: number;
  variants?: Array<{ id: string; name: string; weight: number }>;
}

interface FeatureFlagContextType {
  flags: FeatureFlag[];
  isEnabled: (key: string) => boolean;
  getVariant: (key: string) => string | null;
  loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: [],
  isEnabled: () => false,
  getVariant: () => null,
  loading: true,
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVariants, setUserVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/feature-flags')
      .then(res => res.json())
      .then(data => {
        setFlags(data.flags || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isEnabled = (key: string): boolean => {
    const flag = flags.find(f => f.key === key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Para percentage, usa hash do sessionId
    if (flag.type === 'percentage' && flag.percentage !== undefined) {
      const sessionId = typeof window !== 'undefined'
        ? sessionStorage.getItem('sessionId') || Math.random().toString()
        : Math.random().toString();
      const hash = Array.from(sessionId).reduce((acc, char) =>
        ((acc << 5) - acc) + char.charCodeAt(0), 0
      );
      return (Math.abs(hash) % 100) < flag.percentage;
    }

    return true;
  };

  const getVariant = (key: string): string | null => {
    if (userVariants[key]) return userVariants[key];

    const flag = flags.find(f => f.key === key);
    if (!flag?.variants || flag.variants.length === 0) return null;

    // Seleciona variante por peso
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of flag.variants) {
      cumulative += variant.weight;
      if (random < cumulative) {
        setUserVariants(prev => ({ ...prev, [key]: variant.id }));
        return variant.id;
      }
    }

    return flag.variants[0]?.id || null;
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, isEnabled, getVariant, loading }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}

export function useVariant(key: string): string | null {
  const { getVariant } = useFeatureFlags();
  return getVariant(key);
}

// Componente para renderização condicional
interface FeatureProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const enabled = useFeatureFlag(flag);
  const { loading } = useFeatureFlags();

  if (loading) return null;
  return enabled ? <>{children}</> : <>{fallback}</>;
}

// Componente para variantes A/B
interface VariantProps {
  flag: string;
  variant: string;
  children: ReactNode;
}

export function Variant({ flag, variant, children }: VariantProps) {
  const currentVariant = useVariant(flag);
  return currentVariant === variant ? <>{children}</> : null;
}

// Admin panel para feature flags
export function FeatureFlagAdmin() {
  const { flags, loading } = useFeatureFlags();
  const [localFlags, setLocalFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => {
    setLocalFlags(flags);
  }, [flags]);

  const toggleFlag = async (key: string) => {
    const flag = localFlags.find(f => f.key === key);
    if (!flag) return;

    try {
      await fetch(`/api/feature-flags/${key}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });

      setLocalFlags(prev =>
        prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f)
      );
    } catch (error) {
      logger.error('Failed to toggle flag:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-[var(--aethel-text-tertiary)]">
        Loading feature flags...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Flags de recurso</h2>

      <div className="space-y-2">
        {localFlags.map(flag => (
          <div
            key={flag.key}
            className="flex items-center justify-between p-3 bg-[var(--aethel-surface-tertiary)] rounded-lg"
          >
            <div>
              <div className="font-medium text-[var(--aethel-text-primary)]">{flag.name}</div>
              <div className="text-sm text-[var(--aethel-text-tertiary)]">
                {flag.key} • {flag.type}
                {flag.percentage !== undefined && ` • ${flag.percentage}%`}
              </div>
            </div>

            <button type="button" aria-label={flag.enabled ? `Disable feature flag ${flag.key}` : `Enable feature flag ${flag.key}`}
              onClick={() => toggleFlag(flag.key)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                flag.enabled
                  ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
                  : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)]'
              }`}
            >
              {flag.enabled ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

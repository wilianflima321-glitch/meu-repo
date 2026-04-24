'use client';

import { useCallback } from 'react';

import type { PreviewRuntimeReadinessResponse } from '@/lib/preview/runtime-manager';

type RuntimeTrigger = 'auto' | 'manual';

type UseWorkbenchRuntimeActionsParams = {
  runtimePrimaryAction: 'provision' | 'discover' | 'inline' | string | null;
  previewRuntimeUrl?: string | null;
  refreshRuntimeReadiness: () => Promise<PreviewRuntimeReadinessResponse | null>;
  discoverRuntime: (trigger?: RuntimeTrigger) => Promise<boolean>;
  provisionRuntime: (trigger?: RuntimeTrigger) => Promise<boolean>;
  syncRuntime?: () => Promise<boolean>;
  handleUseInlineFallback: () => void;
  checkRuntimeHealth?: (url: string) => Promise<void>;
  onRevalidateTracked?: (url: string) => void;
};

export function useWorkbenchRuntimeActions({
  runtimePrimaryAction,
  previewRuntimeUrl,
  refreshRuntimeReadiness,
  discoverRuntime,
  provisionRuntime,
  syncRuntime,
  handleUseInlineFallback,
  checkRuntimeHealth,
  onRevalidateTracked,
}: UseWorkbenchRuntimeActionsParams) {
  const discoverAndRefresh = useCallback(() => {
    void discoverRuntime('manual').then(() => {
      void refreshRuntimeReadiness();
    });
  }, [discoverRuntime, refreshRuntimeReadiness]);

  const provisionAndRefresh = useCallback(() => {
    void provisionRuntime('manual').then(() => {
      void refreshRuntimeReadiness();
    });
  }, [provisionRuntime, refreshRuntimeReadiness]);

  const syncAndRefresh = useCallback(() => {
    if (!syncRuntime) return;
    void syncRuntime().then(() => {
      void refreshRuntimeReadiness();
    });
  }, [refreshRuntimeReadiness, syncRuntime]);

  const runRecommendedAction = useCallback(() => {
    if (runtimePrimaryAction === 'provision') {
      provisionAndRefresh();
      return;
    }
    if (runtimePrimaryAction === 'discover') {
      discoverAndRefresh();
      return;
    }
    handleUseInlineFallback();
  }, [
    discoverAndRefresh,
    handleUseInlineFallback,
    provisionAndRefresh,
    runtimePrimaryAction,
  ]);

  const revalidateRuntimeHealth = useCallback(() => {
    if (!previewRuntimeUrl || !checkRuntimeHealth) return;
    void checkRuntimeHealth(previewRuntimeUrl);
    onRevalidateTracked?.(previewRuntimeUrl);
  }, [checkRuntimeHealth, onRevalidateTracked, previewRuntimeUrl]);

  const openRuntime = useCallback(() => {
    if (!previewRuntimeUrl || typeof window === 'undefined') return;
    window.open(previewRuntimeUrl, '_blank', 'noopener,noreferrer');
  }, [previewRuntimeUrl]);

  return {
    runRecommendedAction,
    discoverAndRefresh,
    provisionAndRefresh,
    syncAndRefresh,
    revalidateRuntimeHealth,
    openRuntime,
  };
}

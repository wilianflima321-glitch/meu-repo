'use client';

import { useCallback, useEffect, useState } from 'react';

import { type PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';
import {
  derivePreviewRecommendedAction,
  INITIAL_PREVIEW_RUNTIME,
  resolvePreviewStrategy,
} from '@/components/preview/previewRuntimeState';
import { usePreviewRuntimeHealthMonitor } from '@/components/preview/usePreviewRuntimeHealthMonitor';
import { usePreviewRuntimeHmrBridge } from '@/components/preview/usePreviewRuntimeHmrBridge';

export function usePreviewRuntime(projectId?: string, autoProvision = false) {
  const [runtime, setRuntime] = useState<PreviewRuntimeInfo>(INITIAL_PREVIEW_RUNTIME);
  const { clearHealthPolling, startHealthPolling } = usePreviewRuntimeHealthMonitor(setRuntime);
  const { clearHmrBridge, connectHMR } = usePreviewRuntimeHmrBridge(setRuntime);

  const extractRuntimeContext = useCallback((payload: any) => {
    const metadata = payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : null;
    const provider =
      typeof payload?.provider === 'string'
        ? payload.provider
        : typeof metadata?.provider === 'string'
          ? metadata.provider
          : null;
    const setupEnv = Array.isArray(metadata?.setupEnv)
      ? metadata.setupEnv.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const guidance =
      typeof payload?.message === 'string' && payload.message.trim().length > 0
        ? payload.message
        : typeof payload?.error === 'string' && payload.error.trim().length > 0
          ? payload.error
          : null;

    return {
      provider,
      setupEnv,
      guidance,
      recommendedAction: derivePreviewRecommendedAction(payload),
    };
  }, []);

  const provision = useCallback(async () => {
    setRuntime((prev) => ({
      ...prev,
      state: 'provisioning',
      provider: null,
      error: null,
      guidance: null,
      recommendedAction: null,
      setupEnv: [],
      failureCount: 0,
      lastHealthCheckAt: null,
      hmrConnected: false,
      hmrState: 'idle',
    }));

    try {
      const res = await fetch('/api/preview/runtime-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId || 'default' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Falha ao provisionar (${res.status})`);
      }

      const data = await res.json();
      const runtimeContext = extractRuntimeContext(data);

      if (data.runtimeUrl) {
        const resolvedStrategy = resolvePreviewStrategy(data);
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: resolvedStrategy,
          runtimeUrl: data.runtimeUrl,
          sandboxId: data.sandboxId || null,
          provider: runtimeContext.provider,
          startedAt: Date.now(),
          error: null,
          guidance: runtimeContext.guidance,
          recommendedAction: runtimeContext.recommendedAction,
          setupEnv: runtimeContext.setupEnv,
        }));

        startHealthPolling(data.runtimeUrl);
      } else if (data.discoveryResult?.preferredRuntimeUrl) {
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: 'iframe',
          runtimeUrl: data.discoveryResult.preferredRuntimeUrl,
          startedAt: Date.now(),
          latencyMs: data.discoveryResult.candidates?.[0]?.latencyMs || null,
          error: null,
          provider: runtimeContext.provider,
          guidance: runtimeContext.guidance,
          recommendedAction: runtimeContext.recommendedAction,
          setupEnv: runtimeContext.setupEnv,
        }));
        startHealthPolling(data.discoveryResult.preferredRuntimeUrl);
      } else {
        setRuntime((prev) => ({
          ...prev,
          state: 'failed',
          provider: runtimeContext.provider,
          error:
            runtimeContext.guidance ||
            'Nenhum runtime de preview disponivel. Inicie um servidor local de desenvolvimento ou configure o E2B.',
          guidance: runtimeContext.guidance,
          recommendedAction:
            runtimeContext.recommendedAction ||
            'Configure um provider valido ou troque para o fallback inline antes de continuar.',
          setupEnv: runtimeContext.setupEnv,
        }));
      }
    } catch (err) {
      setRuntime((prev) => ({
        ...prev,
        state: 'failed',
        error: err instanceof Error ? err.message : 'Falha ao provisionar o preview.',
        guidance: err instanceof Error ? err.message : 'Falha ao provisionar o preview.',
        recommendedAction:
          'Revise a configuracao do provider de preview ou use o fallback inline enquanto o runtime remoto nao responde.',
      }));
    }
  }, [extractRuntimeContext, projectId, startHealthPolling]);

  const switchToInline = useCallback(() => {
    clearHealthPolling();
    clearHmrBridge();
    setRuntime((prev) => ({
      ...prev,
      state: 'degraded',
      strategy: 'inline',
      runtimeUrl: null,
      sandboxId: null,
      provider: prev.provider,
      hmrConnected: false,
      hmrState: 'idle',
      error: prev.error,
      guidance: prev.guidance,
      recommendedAction:
        prev.recommendedAction || 'Continue no fallback inline enquanto estabilizamos o runtime remoto.',
      setupEnv: prev.setupEnv,
    }));
  }, [clearHealthPolling, clearHmrBridge]);

  useEffect(() => {
    if (autoProvision && runtime.state === 'idle') {
      void provision();
    }
  }, [autoProvision, runtime.state, provision]);

  useEffect(() => {
    if (runtime.state === 'healthy' && runtime.runtimeUrl) {
      connectHMR(runtime.runtimeUrl);
    }
  }, [runtime.state, runtime.runtimeUrl, connectHMR]);

  useEffect(() => {
    return () => {
      clearHmrBridge();
      clearHealthPolling();
    };
  }, [clearHealthPolling, clearHmrBridge]);

  return { runtime, provision, switchToInline };
}

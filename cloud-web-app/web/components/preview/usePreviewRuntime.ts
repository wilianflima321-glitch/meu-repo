'use client';

import { useCallback, useEffect, useState } from 'react';

import { type PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';
import {
  derivePreviewRecommendedAction,
  INITIAL_PREVIEW_RUNTIME,
  type PreviewRuntimePayload,
  resolvePreviewStrategy,
} from '@/components/preview/previewRuntimeState';
import { usePreviewRuntimeHealthMonitor } from '@/components/preview/usePreviewRuntimeHealthMonitor';
import { usePreviewRuntimeHmrBridge } from '@/components/preview/usePreviewRuntimeHmrBridge';

function isPreviewRuntimePayload(value: unknown): value is PreviewRuntimePayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPayloadText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function usePreviewRuntime(projectId?: string, autoProvision = false) {
  const [runtime, setRuntime] = useState<PreviewRuntimeInfo>(INITIAL_PREVIEW_RUNTIME);
  const { clearHealthPolling, startHealthPolling } = usePreviewRuntimeHealthMonitor(setRuntime);
  const { clearHmrBridge, connectHMR } = usePreviewRuntimeHmrBridge(setRuntime);

  const extractRuntimeContext = useCallback((payload: PreviewRuntimePayload) => {
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
        const rawData = await res.json().catch(() => ({}));
        const data = isPreviewRuntimePayload(rawData) ? rawData : {};
        throw new Error(getPayloadText(data.error) || getPayloadText(data.message) || `Falha ao provisionar (${res.status})`);
      }

      const rawData = await res.json();
      const data = isPreviewRuntimePayload(rawData) ? rawData : {};
      const runtimeContext = extractRuntimeContext(data);

      if (typeof data.runtimeUrl === 'string' && data.runtimeUrl.length > 0) {
        const runtimeUrl = data.runtimeUrl;
        const resolvedStrategy = resolvePreviewStrategy(data);
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: resolvedStrategy,
          runtimeUrl,
          sandboxId: typeof data.sandboxId === 'string' ? data.sandboxId : null,
          provider: runtimeContext.provider,
          startedAt: Date.now(),
          error: null,
          guidance: runtimeContext.guidance,
          recommendedAction: runtimeContext.recommendedAction,
          setupEnv: runtimeContext.setupEnv,
        }));

        startHealthPolling(runtimeUrl);
      } else if (
        data.discoveryResult &&
        typeof data.discoveryResult.preferredRuntimeUrl === 'string' &&
        data.discoveryResult.preferredRuntimeUrl.length > 0
      ) {
        const preferredRuntimeUrl = data.discoveryResult.preferredRuntimeUrl;
        const firstCandidate = data.discoveryResult.candidates?.[0];
        const latencyMs = typeof firstCandidate?.latencyMs === 'number' ? firstCandidate.latencyMs : null;

        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: 'iframe',
          runtimeUrl: preferredRuntimeUrl,
          startedAt: Date.now(),
          latencyMs,
          error: null,
          provider: runtimeContext.provider,
          guidance: runtimeContext.guidance,
          recommendedAction: runtimeContext.recommendedAction,
          setupEnv: runtimeContext.setupEnv,
        }));
        startHealthPolling(preferredRuntimeUrl);
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

'use client';

import { useCallback, useEffect, useState } from 'react';

import { type PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';
import {
  INITIAL_PREVIEW_RUNTIME,
  resolvePreviewStrategy,
} from '@/components/preview/previewRuntimeState';
import { usePreviewRuntimeHealthMonitor } from '@/components/preview/usePreviewRuntimeHealthMonitor';
import { usePreviewRuntimeHmrBridge } from '@/components/preview/usePreviewRuntimeHmrBridge';

export function usePreviewRuntime(projectId?: string, autoProvision = false) {
  const [runtime, setRuntime] = useState<PreviewRuntimeInfo>(INITIAL_PREVIEW_RUNTIME);
  const { clearHealthPolling, startHealthPolling } = usePreviewRuntimeHealthMonitor(setRuntime);
  const { clearHmrBridge, connectHMR } = usePreviewRuntimeHmrBridge(setRuntime);

  const provision = useCallback(async () => {
    setRuntime((prev) => ({ ...prev, state: 'provisioning', error: null }));

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

      if (data.runtimeUrl) {
        const resolvedStrategy = resolvePreviewStrategy(data);
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: resolvedStrategy,
          runtimeUrl: data.runtimeUrl,
          sandboxId: data.sandboxId || null,
          startedAt: Date.now(),
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
        }));
        startHealthPolling(data.discoveryResult.preferredRuntimeUrl);
      } else {
        setRuntime((prev) => ({
          ...prev,
          state: 'failed',
          error:
            'Nenhum runtime de preview disponivel. Inicie um servidor local de desenvolvimento ou configure o E2B.',
        }));
      }
    } catch (err) {
      setRuntime((prev) => ({
        ...prev,
        state: 'failed',
        error: err instanceof Error ? err.message : 'Falha ao provisionar o preview.',
      }));
    }
  }, [projectId, startHealthPolling]);

  const switchToInline = useCallback(() => {
    clearHealthPolling();
    clearHmrBridge();
    setRuntime((prev) => ({
      ...prev,
      state: 'degraded',
      strategy: 'inline',
      runtimeUrl: null,
      sandboxId: null,
      hmrConnected: false,
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

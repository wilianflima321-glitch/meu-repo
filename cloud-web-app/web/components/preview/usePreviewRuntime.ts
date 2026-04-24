'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createHMRBridge, type HMRBridge } from '@/lib/preview/hmr-bridge';
import { type PreviewRuntimeInfo, type PreviewStrategy } from '@/components/preview/previewRuntime.types';

export function usePreviewRuntime(projectId?: string, autoProvision = false) {
  const [runtime, setRuntime] = useState<PreviewRuntimeInfo>({
    state: 'idle',
    strategy: 'none',
    runtimeUrl: null,
    sandboxId: null,
    startedAt: null,
    latencyMs: null,
    error: null,
    hmrConnected: false,
    filesInSync: 0,
    lastSyncAt: null,
  });

  const bridgeRef = useRef<HMRBridge | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const warmupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncResetRef = useRef<NodeJS.Timeout | null>(null);
  const hmrUnsubscribeRef = useRef<(() => void) | null>(null);

  const resolveStrategy = (payload: any): PreviewStrategy => {
    const provider = payload?.provider || payload?.metadata?.provider;
    const rawStrategy = payload?.strategy || payload?.metadata?.strategy;
    if (rawStrategy) {
      if (rawStrategy === 'browser-side') return 'webcontainer';
      if (rawStrategy === 'local') return 'iframe';
      if (rawStrategy === 'managed') return provider === 'e2b' ? 'e2b' : 'iframe';
      if (rawStrategy === 'inline') return 'inline';
    }
    const mode = payload?.metadata?.mode;
    if (mode === 'local_fallback') return 'iframe';
    if (provider === 'webcontainers') return 'webcontainer';
    if (provider === 'e2b') return 'e2b';
    if (mode === 'managed') return 'e2b';
    return 'iframe';
  };

  const startHealthPolling = useCallback((url: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (warmupTimeoutRef.current) clearTimeout(warmupTimeoutRef.current);

    const poll = async () => {
      try {
        const start = Date.now();
        const res = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - start;

        setRuntime((prev) => ({
          ...prev,
          state: res.ok ? 'healthy' : 'degraded',
          latencyMs,
        }));
      } catch {
        setRuntime((prev) => {
          if (prev.state === 'warming') return prev;
          return { ...prev, state: 'degraded', latencyMs: null };
        });
      }
    };

    warmupTimeoutRef.current = setTimeout(poll, 2000);
    pollRef.current = setInterval(poll, 15000);
  }, []);

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
        const resolvedStrategy = resolveStrategy(data);
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

  const connectHMR = useCallback((runtimeUrl: string) => {
    bridgeRef.current?.disconnect();
    hmrUnsubscribeRef.current?.();

    try {
      bridgeRef.current = createHMRBridge({
        runtimeUrl,
        hmrPathCandidates: ['/_next/webpack-hmr', '/__vite_hmr'],
        onConnectionChange: (connected) => {
          setRuntime((prev) => ({ ...prev, hmrConnected: connected }));
        },
        onUpdate: (message) => {
          if (message.type === 'full-reload' || message.type === 'update') {
            if (syncResetRef.current) clearTimeout(syncResetRef.current);
            const syncedAt = Date.now();
            setRuntime((prev) => ({
              ...prev,
              state: prev.strategy === 'inline' ? 'degraded' : 'syncing',
              filesInSync: prev.filesInSync + 1,
              lastSyncAt: syncedAt,
            }));
            syncResetRef.current = setTimeout(() => {
              setRuntime((prev) => ({
                ...prev,
                state: prev.strategy === 'inline' ? 'degraded' : 'healthy',
              }));
            }, 900);
          }
        },
        onError: () => {
          setRuntime((prev) => ({ ...prev, hmrConnected: false }));
        },
      });
      hmrUnsubscribeRef.current = bridgeRef.current.onStateChange((state) => {
        if (state === 'failed' || state === 'reconnecting') {
          setRuntime((prev) => {
            if (prev.strategy === 'inline') return prev;
            if (prev.state === 'degraded') return prev;
            return { ...prev, state: 'degraded' };
          });
        }
      });
    } catch {
      setRuntime((prev) => ({ ...prev, hmrConnected: false }));
    }
  }, []);

  const switchToInline = useCallback(() => {
    setRuntime((prev) => ({
      ...prev,
      state: 'degraded',
      strategy: 'inline',
      runtimeUrl: null,
      sandboxId: null,
      hmrConnected: false,
    }));
  }, []);

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
      bridgeRef.current?.disconnect();
      hmrUnsubscribeRef.current?.();
      if (pollRef.current) clearInterval(pollRef.current);
      if (warmupTimeoutRef.current) clearTimeout(warmupTimeoutRef.current);
      if (syncResetRef.current) clearTimeout(syncResetRef.current);
    };
  }, []);

  return { runtime, provision, switchToInline };
}

'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import { createHMRBridge, type HMRBridge } from '@/lib/preview/hmr-bridge';
import {
  detectViteHmrClient,
  resolveClientHmrConnected,
  type ViteHmrDetectResult,
} from '@/lib/preview/vite-hmr-detect';
import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';

type RuntimeSetter = Dispatch<SetStateAction<PreviewRuntimeInfo>>;

export type PreviewHmrBridgeHandle = {
  clearHmrBridge: () => void;
  connectHMR: (runtimeUrl: string) => void;
  /** Best-effort Vite invalidate when WS protocol-live; false → rely on Vite file watcher. */
  invalidateModules: (paths: string[]) => boolean;
  getDetectResult: () => ViteHmrDetectResult | null;
  isClientHmrConnected: () => boolean;
};

export function usePreviewRuntimeHmrBridge(setRuntime: RuntimeSetter): PreviewHmrBridgeHandle {
  const bridgeRef = useRef<HMRBridge | null>(null);
  const hmrUnsubscribeRef = useRef<(() => void) | null>(null);
  const syncResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const degradeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectRef = useRef<ViteHmrDetectResult | null>(null);
  const viteClientPresentRef = useRef(false);
  const wsConnectedRef = useRef(false);
  const connectGenerationRef = useRef(0);
  const HMR_RECOVERY_GRACE_MS = 12000;

  const publishConnected = useCallback(() => {
    const connected = resolveClientHmrConnected({
      viteClientPresent: viteClientPresentRef.current,
      wsConnected: wsConnectedRef.current,
    });
    setRuntime((prev) => ({
      ...prev,
      hmrConnected: connected,
      hmrState: connected
        ? 'connected'
        : prev.hmrState === 'reconnecting'
          ? 'reconnecting'
          : prev.hmrState === 'connecting'
            ? 'connecting'
            : 'disconnected',
    }));
  }, [setRuntime]);

  const clearHmrBridge = useCallback(() => {
    connectGenerationRef.current += 1;
    bridgeRef.current?.disconnect();
    hmrUnsubscribeRef.current?.();
    if (syncResetRef.current) clearTimeout(syncResetRef.current);
    if (degradeTimeoutRef.current) clearTimeout(degradeTimeoutRef.current);
    bridgeRef.current = null;
    hmrUnsubscribeRef.current = null;
    syncResetRef.current = null;
    degradeTimeoutRef.current = null;
    detectRef.current = null;
    viteClientPresentRef.current = false;
    wsConnectedRef.current = false;
  }, []);

  const connectHMR = useCallback(
    (runtimeUrl: string) => {
      clearHmrBridge();
      const generation = connectGenerationRef.current;

      setRuntime((prev) => ({
        ...prev,
        hmrConnected: false,
        hmrState: 'connecting',
      }));

      void (async () => {
        const detected = await detectViteHmrClient(runtimeUrl);
        if (generation !== connectGenerationRef.current) return;

        detectRef.current = detected;
        viteClientPresentRef.current = detected.viteClientPresent;

        // Honesty first-light: Vite `/@vite/client` present ⇒ iframe HMR can apply disk syncs.
        if (detected.viteClientPresent) {
          publishConnected();
        }

        try {
          bridgeRef.current = createHMRBridge({
            runtimeUrl,
            hmrPathCandidates: detected.pathCandidates,
            onConnectionChange: (connected) => {
              if (generation !== connectGenerationRef.current) return;
              if (degradeTimeoutRef.current) {
                clearTimeout(degradeTimeoutRef.current);
                degradeTimeoutRef.current = null;
              }
              wsConnectedRef.current = connected;
              publishConnected();
            },
            onUpdate: (message) => {
              if (generation !== connectGenerationRef.current) return;
              if (message.type === 'full-reload' || message.type === 'update' || message.type === 'reload') {
                if (syncResetRef.current) clearTimeout(syncResetRef.current);
                const syncedAt = Date.now();
                wsConnectedRef.current = true;
                setRuntime((prev) => ({
                  ...prev,
                  state: prev.strategy === 'inline' ? 'degraded' : 'syncing',
                  error: null,
                  hmrConnected: true,
                  hmrState: 'connected',
                  filesInSync: prev.filesInSync + 1,
                  lastSyncAt: syncedAt,
                }));
                syncResetRef.current = setTimeout(() => {
                  setRuntime((prev) => ({
                    ...prev,
                    state:
                      prev.strategy === 'inline'
                        ? 'degraded'
                        : prev.state === 'syncing'
                          ? 'healthy'
                          : prev.state,
                  }));
                }, 1400);
              }
            },
            onError: () => {
              if (generation !== connectGenerationRef.current) return;
              // Keep viteClientPresent signal; only clear WS bit.
              wsConnectedRef.current = false;
              publishConnected();
            },
          });

          hmrUnsubscribeRef.current = bridgeRef.current.onStateChange((state) => {
            if (generation !== connectGenerationRef.current) return;
            if (state === 'failed' || state === 'reconnecting') {
              wsConnectedRef.current = false;
              setRuntime((prev) => {
                if (prev.strategy === 'inline') return prev;
                const stillConnected = resolveClientHmrConnected({
                  viteClientPresent: viteClientPresentRef.current,
                  wsConnected: false,
                });
                const hadRecentHealthySignal =
                  typeof prev.lastHealthyAt === 'number' &&
                  Date.now() - prev.lastHealthyAt < HMR_RECOVERY_GRACE_MS;

                if (degradeTimeoutRef.current) clearTimeout(degradeTimeoutRef.current);
                if (!stillConnected && hadRecentHealthySignal) {
                  degradeTimeoutRef.current = setTimeout(() => {
                    setRuntime((current) => {
                      const recovering =
                        current.strategy !== 'inline' &&
                        !current.hmrConnected &&
                        current.hmrState === 'reconnecting';
                      if (!recovering) return current;
                      return { ...current, state: 'degraded' };
                    });
                  }, HMR_RECOVERY_GRACE_MS);
                }

                return {
                  ...prev,
                  hmrConnected: stillConnected,
                  hmrState: stillConnected
                    ? 'connected'
                    : state === 'reconnecting'
                      ? 'reconnecting'
                      : 'disconnected',
                  state:
                    stillConnected || hadRecentHealthySignal || prev.state === 'syncing'
                      ? prev.state
                      : 'degraded',
                };
              });
            }
          });
        } catch {
          if (generation !== connectGenerationRef.current) return;
          wsConnectedRef.current = false;
          publishConnected();
        }
      })();
    },
    [clearHmrBridge, publishConnected, setRuntime],
  );

  const invalidateModules = useCallback((paths: string[]) => {
    return bridgeRef.current?.invalidateModules(paths) ?? false;
  }, []);

  const getDetectResult = useCallback(() => detectRef.current, []);

  const isClientHmrConnected = useCallback(
    () =>
      resolveClientHmrConnected({
        viteClientPresent: viteClientPresentRef.current,
        wsConnected: wsConnectedRef.current,
      }),
    [],
  );

  return {
    clearHmrBridge,
    connectHMR,
    invalidateModules,
    getDetectResult,
    isClientHmrConnected,
  };
}

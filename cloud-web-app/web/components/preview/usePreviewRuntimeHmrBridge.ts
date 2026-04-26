'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import { createHMRBridge, type HMRBridge } from '@/lib/preview/hmr-bridge';
import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';

type RuntimeSetter = Dispatch<SetStateAction<PreviewRuntimeInfo>>;

export function usePreviewRuntimeHmrBridge(setRuntime: RuntimeSetter) {
  const bridgeRef = useRef<HMRBridge | null>(null);
  const hmrUnsubscribeRef = useRef<(() => void) | null>(null);
  const syncResetRef = useRef<NodeJS.Timeout | null>(null);
  const degradeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const HMR_RECOVERY_GRACE_MS = 12000;

  const clearHmrBridge = useCallback(() => {
    bridgeRef.current?.disconnect();
    hmrUnsubscribeRef.current?.();
    if (syncResetRef.current) clearTimeout(syncResetRef.current);
    if (degradeTimeoutRef.current) clearTimeout(degradeTimeoutRef.current);
    bridgeRef.current = null;
    hmrUnsubscribeRef.current = null;
    syncResetRef.current = null;
    degradeTimeoutRef.current = null;
  }, []);

  const connectHMR = useCallback(
    (runtimeUrl: string) => {
      clearHmrBridge();

      try {
        setRuntime((prev) => ({
          ...prev,
          hmrConnected: false,
          hmrState: 'connecting',
        }));

        bridgeRef.current = createHMRBridge({
          runtimeUrl,
          hmrPathCandidates: ['/_next/webpack-hmr', '/__vite_hmr'],
          onConnectionChange: (connected) => {
            if (degradeTimeoutRef.current) {
              clearTimeout(degradeTimeoutRef.current);
              degradeTimeoutRef.current = null;
            }
            setRuntime((prev) => ({
              ...prev,
              hmrConnected: connected,
              hmrState: connected ? 'connected' : prev.hmrState === 'reconnecting' ? 'reconnecting' : 'disconnected',
            }));
          },
          onUpdate: (message) => {
            if (message.type === 'full-reload' || message.type === 'update') {
              if (syncResetRef.current) clearTimeout(syncResetRef.current);
              const syncedAt = Date.now();
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
            setRuntime((prev) => ({
              ...prev,
              hmrConnected: false,
              hmrState: prev.strategy === 'inline' ? 'idle' : 'disconnected',
            }));
          },
        });

        hmrUnsubscribeRef.current = bridgeRef.current.onStateChange((state) => {
          if (state === 'failed' || state === 'reconnecting') {
            setRuntime((prev) => {
              if (prev.strategy === 'inline') return prev;
              const hadRecentHealthySignal =
                typeof prev.lastHealthyAt === 'number' &&
                Date.now() - prev.lastHealthyAt < HMR_RECOVERY_GRACE_MS;

              if (degradeTimeoutRef.current) clearTimeout(degradeTimeoutRef.current);
              if (hadRecentHealthySignal) {
                degradeTimeoutRef.current = setTimeout(() => {
                  setRuntime((current) => {
                    const stillRecovering =
                      current.strategy !== 'inline' &&
                      !current.hmrConnected &&
                      current.hmrState === 'reconnecting';
                    if (!stillRecovering) return current;
                    return {
                      ...current,
                      state: 'degraded',
                    };
                  });
                }, HMR_RECOVERY_GRACE_MS);
              }

              return {
                ...prev,
                hmrConnected: false,
                hmrState: state === 'reconnecting' ? 'reconnecting' : 'disconnected',
                state: hadRecentHealthySignal || prev.state === 'syncing' ? prev.state : 'degraded',
              };
            });
          }
        });
      } catch {
        setRuntime((prev) => ({ ...prev, hmrConnected: false }));
      }
    },
    [clearHmrBridge, setRuntime],
  );

  return {
    clearHmrBridge,
    connectHMR,
  };
}

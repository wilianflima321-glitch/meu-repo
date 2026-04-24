'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import { createHMRBridge, type HMRBridge } from '@/lib/preview/hmr-bridge';
import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';

type RuntimeSetter = Dispatch<SetStateAction<PreviewRuntimeInfo>>;

export function usePreviewRuntimeHmrBridge(setRuntime: RuntimeSetter) {
  const bridgeRef = useRef<HMRBridge | null>(null);
  const hmrUnsubscribeRef = useRef<(() => void) | null>(null);
  const syncResetRef = useRef<NodeJS.Timeout | null>(null);

  const clearHmrBridge = useCallback(() => {
    bridgeRef.current?.disconnect();
    hmrUnsubscribeRef.current?.();
    if (syncResetRef.current) clearTimeout(syncResetRef.current);
    bridgeRef.current = null;
    hmrUnsubscribeRef.current = null;
    syncResetRef.current = null;
  }, []);

  const connectHMR = useCallback(
    (runtimeUrl: string) => {
      clearHmrBridge();

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
    },
    [clearHmrBridge, setRuntime],
  );

  return {
    clearHmrBridge,
    connectHMR,
  };
}

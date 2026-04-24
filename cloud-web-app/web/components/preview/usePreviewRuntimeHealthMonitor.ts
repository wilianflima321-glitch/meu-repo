'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';

type RuntimeSetter = Dispatch<SetStateAction<PreviewRuntimeInfo>>;

export function usePreviewRuntimeHealthMonitor(setRuntime: RuntimeSetter) {
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const warmupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHealthPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (warmupTimeoutRef.current) clearTimeout(warmupTimeoutRef.current);
    pollRef.current = null;
    warmupTimeoutRef.current = null;
  }, []);

  const startHealthPolling = useCallback(
    (url: string) => {
      clearHealthPolling();

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
    },
    [clearHealthPolling, setRuntime],
  );

  return {
    clearHealthPolling,
    startHealthPolling,
  };
}

'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';

type RuntimeSetter = Dispatch<SetStateAction<PreviewRuntimeInfo>>;

export function usePreviewRuntimeHealthMonitor(setRuntime: RuntimeSetter) {
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const warmupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const WARMUP_FAILURE_LIMIT = 2;

  const clearHealthPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (warmupTimeoutRef.current) clearTimeout(warmupTimeoutRef.current);
    pollRef.current = null;
    warmupTimeoutRef.current = null;
    consecutiveFailuresRef.current = 0;
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
          const checkedAt = Date.now();
          consecutiveFailuresRef.current = 0;

          setRuntime((prev) => ({
            ...prev,
            state: res.ok ? 'healthy' : 'degraded',
            latencyMs,
            error: res.ok ? null : `Runtime responded with HTTP ${res.status}.`,
            failureCount: res.ok ? 0 : prev.failureCount + 1,
            lastHealthCheckAt: checkedAt,
            lastHealthyAt: res.ok ? checkedAt : prev.lastHealthyAt,
          }));
        } catch {
          const checkedAt = Date.now();
          consecutiveFailuresRef.current += 1;
          setRuntime((prev) => {
            if (prev.state === 'warming' && consecutiveFailuresRef.current < WARMUP_FAILURE_LIMIT) {
              return {
                ...prev,
                lastHealthCheckAt: checkedAt,
              };
            }
            return {
              ...prev,
              state: 'degraded',
              latencyMs: null,
              error:
                prev.state === 'warming'
                  ? 'The runtime has not responded yet. Stay in local preview or revalidate when the server is ready.'
                  : 'Could not validate the remote runtime right now.',
              failureCount: prev.failureCount + 1,
              lastHealthCheckAt: checkedAt,
            };
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

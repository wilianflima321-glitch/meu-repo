'use client';

import { useCallback, useEffect, useRef } from 'react';

type UseWorkbenchRuntimeSyncSchedulerOptions = {
  previewSandboxId: string | null | undefined;
  isSyncingRuntime: boolean;
  syncRuntime: () => Promise<unknown>;
};

export function useWorkbenchRuntimeSyncScheduler({
  previewSandboxId,
  isSyncingRuntime,
  syncRuntime,
}: UseWorkbenchRuntimeSyncSchedulerOptions) {
  const runtimeSyncTimerRef = useRef<number | null>(null);
  const lastRuntimeSyncAtRef = useRef<number>(0);

  const scheduleRuntimeSync = useCallback(() => {
    if (!previewSandboxId || isSyncingRuntime) return;

    if (runtimeSyncTimerRef.current) {
      window.clearTimeout(runtimeSyncTimerRef.current);
    }

    runtimeSyncTimerRef.current = window.setTimeout(() => {
      runtimeSyncTimerRef.current = null;

      const now = Date.now();
      if (now - lastRuntimeSyncAtRef.current < 1000) return;

      lastRuntimeSyncAtRef.current = now;
      void syncRuntime();
    }, 1500);
  }, [previewSandboxId, isSyncingRuntime, syncRuntime]);

  useEffect(() => {
    return () => {
      if (runtimeSyncTimerRef.current) {
        window.clearTimeout(runtimeSyncTimerRef.current);
        runtimeSyncTimerRef.current = null;
      }
    };
  }, []);

  return { scheduleRuntimeSync };
}

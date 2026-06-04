"use client";

import { usePreviewRuntimeManager } from '@/hooks/usePreviewRuntimeManager';
import { useWorkbenchRuntimeActions } from '@/components/ide/fullscreen/useWorkbenchRuntimeActions';
import { useWorkbenchRuntimeSyncScheduler } from '@/components/ide/fullscreen/useWorkbenchRuntimeSyncScheduler';

type UseFullscreenIDERuntimeOptions = {
  projectId: string | null;
  previewEnabled: boolean;
  hasToken: boolean;
  previewUrlParam?: string | null;
};

export function useFullscreenIDERuntime({
  projectId,
  previewEnabled,
  hasToken,
  previewUrlParam,
}: UseFullscreenIDERuntimeOptions) {
  const runtime = usePreviewRuntimeManager({
    projectId,
    previewEnabled,
    hasToken,
    previewUrlParam,
  });

  const { scheduleRuntimeSync } = useWorkbenchRuntimeSyncScheduler({
    previewSandboxId: runtime.previewSandboxId,
    isSyncingRuntime: runtime.isSyncingRuntime,
    syncRuntime: runtime.syncRuntime,
  });

  const { runRecommendedAction: handleRunRecommendedPreviewAction } = useWorkbenchRuntimeActions({
    runtimePrimaryAction: runtime.runtimePrimaryAction,
    refreshRuntimeReadiness: runtime.refreshRuntimeReadiness,
    discoverRuntime: runtime.discoverRuntime,
    provisionRuntime: runtime.provisionRuntime,
    handleUseInlineFallback: runtime.handleUseInlineFallback,
  });

  return {
    ...runtime,
    scheduleRuntimeSync,
    handleRunRecommendedPreviewAction,
  };
}

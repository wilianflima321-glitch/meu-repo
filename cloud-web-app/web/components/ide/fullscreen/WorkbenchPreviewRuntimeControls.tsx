'use client';

import PreviewRuntimeToolbar from '@/components/ide/PreviewRuntimeToolbar';
import { useWorkbenchRuntimeActions } from '@/components/ide/fullscreen/useWorkbenchRuntimeActions';
import { analytics } from '@/lib/analytics';

import type { WorkbenchPreviewPaneProps } from './workbenchPreviewPaneModels';

type WorkbenchPreviewRuntimeControlsProps = Pick<
  WorkbenchPreviewPaneProps,
  | 'previewRuntimeUrl'
  | 'previewRuntimeInput'
  | 'showRuntimeSettings'
  | 'runtimeHealth'
  | 'runtimeHealthCheckedAt'
  | 'runtimeHealthHint'
  | 'runtimeReadiness'
  | 'runtimePrimaryAction'
  | 'runtimePrimaryActionLabel'
  | 'runtimeStrategyLabel'
  | 'runtimeStrategyHint'
  | 'runtimeDiscoveryMessage'
  | 'runtimeDiscoveryTone'
  | 'isDiscoveringRuntime'
  | 'isProvisioningRuntime'
  | 'isSyncingRuntime'
  | 'previewSandboxId'
  | 'setPreviewRuntimeInput'
  | 'setShowRuntimeSettings'
  | 'applyRuntimeUrl'
  | 'handleUseInlineFallback'
  | 'refreshRuntimeReadiness'
  | 'discoverRuntime'
  | 'provisionRuntime'
  | 'syncRuntime'
  | 'checkRuntimeHealth'
>;

function normalizeRuntimePrimaryAction(
  runtimePrimaryAction: WorkbenchPreviewPaneProps['runtimePrimaryAction']
): 'provision' | 'discover' | 'inline' {
  return runtimePrimaryAction === 'provision' || runtimePrimaryAction === 'discover'
    ? runtimePrimaryAction
    : 'inline';
}

export function WorkbenchPreviewRuntimeControls({
  previewRuntimeUrl,
  previewRuntimeInput,
  showRuntimeSettings,
  runtimeHealth,
  runtimeHealthCheckedAt,
  runtimeHealthHint,
  runtimeReadiness,
  runtimePrimaryAction,
  runtimePrimaryActionLabel,
  runtimeStrategyLabel,
  runtimeStrategyHint,
  runtimeDiscoveryMessage,
  runtimeDiscoveryTone,
  isDiscoveringRuntime,
  isProvisioningRuntime,
  isSyncingRuntime,
  previewSandboxId,
  setPreviewRuntimeInput,
  setShowRuntimeSettings,
  applyRuntimeUrl,
  handleUseInlineFallback,
  refreshRuntimeReadiness,
  discoverRuntime,
  provisionRuntime,
  syncRuntime,
  checkRuntimeHealth,
}: WorkbenchPreviewRuntimeControlsProps) {
  const {
    runRecommendedAction,
    discoverAndRefresh,
    provisionAndRefresh,
    syncAndRefresh,
    revalidateRuntimeHealth,
    openRuntime,
  } = useWorkbenchRuntimeActions({
    runtimePrimaryAction,
    previewRuntimeUrl,
    refreshRuntimeReadiness,
    discoverRuntime,
    provisionRuntime,
    syncRuntime,
    handleUseInlineFallback,
    checkRuntimeHealth,
    onRevalidateTracked: (runtimeUrl) => {
      analytics?.track?.('engine', 'render_time', {
        metadata: {
          surface: 'ide-preview-runtime-health',
          action: 'manual-revalidate',
          runtimeUrl,
        },
      });
    },
  });

  return (
    <PreviewRuntimeToolbar
      previewRuntimeUrl={previewRuntimeUrl}
      runtimeHealthStatus={runtimeHealth.status}
      runtimeHealthLatencyMs={runtimeHealth.latencyMs}
      runtimeHealthCheckedAt={runtimeHealthCheckedAt}
      runtimeHealthHint={runtimeHealthHint}
      runtimeReadiness={runtimeReadiness}
      runtimePrimaryAction={normalizeRuntimePrimaryAction(runtimePrimaryAction)}
      runtimePrimaryActionLabel={runtimePrimaryActionLabel}
      runtimeStrategyLabel={runtimeStrategyLabel}
      runtimeStrategyHint={runtimeStrategyHint}
      showRuntimeSettings={showRuntimeSettings}
      previewRuntimeInput={previewRuntimeInput}
      onToggleSettings={() => setShowRuntimeSettings((current) => !current)}
      onRuntimeInputChange={setPreviewRuntimeInput}
      onApplyRuntime={applyRuntimeUrl}
      onUseFallback={handleUseInlineFallback}
      isDiscoveringRuntime={isDiscoveringRuntime}
      isProvisioningRuntime={isProvisioningRuntime}
      isSyncingRuntime={isSyncingRuntime}
      canSyncRuntime={Boolean(previewSandboxId)}
      runtimeDiscoveryMessage={runtimeDiscoveryMessage}
      runtimeDiscoveryTone={runtimeDiscoveryTone}
      onRunRecommendedAction={runRecommendedAction}
      onDiscoverRuntime={discoverAndRefresh}
      onProvisionRuntime={provisionAndRefresh}
      onSyncRuntime={syncAndRefresh}
      onRevalidate={revalidateRuntimeHealth}
      onOpenRuntime={openRuntime}
    />
  );
}

'use client';

import PreviewRuntimeToolbar from '@/components/ide/PreviewRuntimeToolbar';
import { useWorkbenchRuntimeActions } from '@/components/ide/fullscreen/useWorkbenchRuntimeActions';
import { usePreviewDeployTrust } from '@/components/preview/usePreviewDeployTrust';
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
  | 'projectId'
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
  projectId,
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

  const {
    readiness: deployReadiness,
    deployment,
    deployStatusHref,
    shareTarget,
    feedback: deployFeedback,
    isSubmittingDeploy,
    isRefreshingDeploy,
    startDeploy,
    refreshDeployment,
    copyShareLink,
    openDeployStatus,
    openDeploySite,
  } = usePreviewDeployTrust({
    projectId,
    previewRuntimeUrl,
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
      deployReadiness={deployReadiness}
      deployStatus={deployment?.status ?? null}
      deployStatusHref={deployStatusHref}
      deployUrl={deployment?.url ?? null}
      deployFeedback={deployFeedback}
      shareTargetLabel={shareTarget?.label ?? null}
      isDeploySubmitting={isSubmittingDeploy}
      isDeployRefreshing={isRefreshingDeploy}
      onRunRecommendedAction={runRecommendedAction}
      onDiscoverRuntime={discoverAndRefresh}
      onProvisionRuntime={provisionAndRefresh}
      onSyncRuntime={syncAndRefresh}
      onRevalidate={revalidateRuntimeHealth}
      onOpenRuntime={openRuntime}
      onStartDeploy={startDeploy}
      onRefreshDeploy={() => void refreshDeployment()}
      onCopyShareLink={() => void copyShareLink()}
      onOpenDeployStatus={openDeployStatus}
      onOpenDeploySite={openDeploySite}
    />
  );
}

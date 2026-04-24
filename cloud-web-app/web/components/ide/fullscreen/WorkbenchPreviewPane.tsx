'use client';

import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';
import PreviewRuntimeToolbar from '@/components/ide/PreviewRuntimeToolbar';
import { DevicePreview } from '@/components/ide/DevicePreview';
import { ConsoleIntegration } from '@/components/ide/ConsoleIntegration';
import { useWorkbenchRuntimeActions } from '@/components/ide/fullscreen/useWorkbenchRuntimeActions';
import { analytics } from '@/lib/analytics';
import type {
  PreviewRuntimeHealthState,
  PreviewRuntimeReadinessResponse,
} from '@/lib/preview/runtime-manager';

import type {
  ActiveFileState,
  PreviewMode,
} from '@/components/ide/fullscreen/types';

export type WorkbenchPreviewPaneProps = {
  activeFile: ActiveFileState | null;
  previewMode: PreviewMode;
  previewRefreshTick: number;
  previewRuntimeUrl: string | null;
  previewRuntimeInput: string;
  showRuntimeSettings: boolean;
  runtimeHealth: PreviewRuntimeHealthState;
  runtimeHealthCheckedAt: Date | null;
  runtimeHealthHint: string;
  runtimeReadiness: PreviewRuntimeReadinessResponse | null;
  runtimePrimaryAction: 'provision' | 'discover' | 'inline' | string | null;
  runtimePrimaryActionLabel: string;
  runtimeStrategyLabel: string;
  runtimeStrategyHint: string;
  runtimeDiscoveryMessage: string | null;
  runtimeDiscoveryTone: 'info' | 'success' | 'warning';
  isDiscoveringRuntime: boolean;
  isProvisioningRuntime: boolean;
  isSyncingRuntime: boolean;
  previewSandboxId: string | null;
  forceInlinePreviewFallback: boolean;
  isSavingFile: boolean;
  projectId: string;
  setPreviewMode: (mode: PreviewMode) => void;
  setPreviewRuntimeInput: (value: string) => void;
  setShowRuntimeSettings: (value: boolean | ((current: boolean) => boolean)) => void;
  setPreviewRefreshTick: (value: number | ((current: number) => number)) => void;
  applyRuntimeUrl: () => void;
  handleUseInlineFallback: () => void;
  refreshRuntimeReadiness: () => Promise<PreviewRuntimeReadinessResponse | null>;
  discoverRuntime: (trigger?: 'auto' | 'manual') => Promise<boolean>;
  provisionRuntime: (trigger?: 'auto' | 'manual') => Promise<boolean>;
  syncRuntime: () => Promise<boolean>;
  checkRuntimeHealth: (url: string) => Promise<void>;
};

const PREVIEW_MODES: Array<{ id: PreviewMode; label: string; description: string }> = [
  { id: 'runtime', label: 'Preview', description: 'Live runtime surface' },
  { id: 'device', label: 'Devices', description: 'Responsive framing' },
  { id: 'console', label: 'Console', description: 'Logs and runtime output' },
  { id: 'viewport3d', label: 'Viewport 3D', description: 'Scene-oriented preview' },
];

export function WorkbenchPreviewPane({
  activeFile,
  previewMode,
  previewRefreshTick,
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
  forceInlinePreviewFallback,
  isSavingFile,
  projectId,
  setPreviewMode,
  setPreviewRuntimeInput,
  setShowRuntimeSettings,
  setPreviewRefreshTick,
  applyRuntimeUrl,
  handleUseInlineFallback,
  refreshRuntimeReadiness,
  discoverRuntime,
  provisionRuntime,
  syncRuntime,
  checkRuntimeHealth,
}: WorkbenchPreviewPaneProps) {
  const activeModeMeta = PREVIEW_MODES.find((mode) => mode.id === previewMode) ?? PREVIEW_MODES[0];
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

  const renderRuntimeSurface = (mode: 'runtime' | 'device') => {
    if (!activeFile) {
      return (
        <div className="flex h-full items-center justify-center px-6">
          <div className="max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] p-5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Preview lane
            </div>
            <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
              Choose a file to inspect its live surface.
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--aethel-text-tertiary)]">
              We keep this lane ready for runtime, devices, console, and 3D checks so the next validation step stays one click away.
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <span className="rounded-full border border-[var(--aethel-border-primary)] px-2.5 py-1">Preview</span>
              <span className="rounded-full border border-[var(--aethel-border-primary)] px-2.5 py-1">Devices</span>
              <span className="rounded-full border border-[var(--aethel-border-primary)] px-2.5 py-1">Console</span>
              <span className="rounded-full border border-[var(--aethel-border-primary)] px-2.5 py-1">Viewport 3D</span>
            </div>
          </div>
        </div>
      );
    }

    const surface = (
      <CanonicalPreviewSurface
        key={`${activeFile.path}:${previewRefreshTick}${mode === 'device' ? ':device' : ''}`}
        variant="runtime"
        title="Previa ao vivo"
        filePath={activeFile.path}
        content={activeFile.content}
        projectId={projectId}
        runtimeUrl={previewRuntimeUrl ?? undefined}
        forceInlineFallback={forceInlinePreviewFallback}
        runtimeUnavailableReason={runtimeHealth.reason}
        isStale={isSavingFile}
        onRefresh={() => setPreviewRefreshTick((prev) => prev + 1)}
      />
    );

    if (mode === 'device') {
      return <DevicePreview>{surface}</DevicePreview>;
    }

    return <div className="h-full min-h-0">{surface}</div>;
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--aethel-surface-primary)]">
      {(previewMode === 'runtime' || previewMode === 'device') && (
        <PreviewRuntimeToolbar
          previewRuntimeUrl={previewRuntimeUrl}
          runtimeHealthStatus={runtimeHealth.status}
          runtimeHealthLatencyMs={runtimeHealth.latencyMs}
          runtimeHealthCheckedAt={runtimeHealthCheckedAt}
          runtimeHealthHint={runtimeHealthHint}
          runtimeReadiness={runtimeReadiness}
          runtimePrimaryAction={
            runtimePrimaryAction === 'provision' || runtimePrimaryAction === 'discover'
              ? runtimePrimaryAction
              : 'inline'
          }
          runtimePrimaryActionLabel={runtimePrimaryActionLabel}
          runtimeStrategyLabel={runtimeStrategyLabel}
          runtimeStrategyHint={runtimeStrategyHint}
          showRuntimeSettings={showRuntimeSettings}
          previewRuntimeInput={previewRuntimeInput}
          onToggleSettings={() => setShowRuntimeSettings((prev) => !prev)}
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
      )}

      <div className="border-b border-[var(--aethel-border-secondary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
            {PREVIEW_MODES.map((mode) => {
              const isActive = previewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPreviewMode(mode.id)}
                  aria-pressed={isActive}
                  className={`group min-h-[40px] rounded-xl border px-3 py-2 text-left transition-all ${
                    isActive
                      ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-text-primary)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                      : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  <div className="text-[11px] font-semibold leading-none">{mode.label}</div>
                  <div className={`mt-1 text-[10px] leading-none ${isActive ? 'text-[var(--aethel-text-secondary)]' : 'text-[var(--aethel-text-quaternary)] group-hover:text-[var(--aethel-text-tertiary)]'}`}>
                    {mode.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex min-h-[30px] items-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-2.5 py-1 text-[var(--aethel-text-secondary)]">
              {activeModeMeta.label} lane
            </span>
            {activeFile ? (
              <span className="inline-flex min-h-[30px] max-w-[260px] items-center truncate rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-2.5 py-1 text-[var(--aethel-text-tertiary)]">
                {activeFile.path}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-primary)_100%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent))]">
        {previewMode === 'console' && <ConsoleIntegration />}
        {previewMode === 'viewport3d' && <CanonicalPreviewSurface variant="scene" renderMode="draft" />}
        {previewMode === 'runtime' && renderRuntimeSurface('runtime')}
        {previewMode === 'device' && renderRuntimeSurface('device')}
      </div>
    </div>
  );
}

export default WorkbenchPreviewPane;

'use client';

import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';
import PreviewRuntimeToolbar from '@/components/ide/PreviewRuntimeToolbar';
import { DevicePreview } from '@/components/ide/DevicePreview';
import { ConsoleIntegration } from '@/components/ide/ConsoleIntegration';
import { analytics } from '@/lib/analytics';
import type {
  PreviewRuntimeHealthState,
  PreviewRuntimeReadinessResponse,
} from '@/lib/preview/runtime-manager';

import type {
  ActiveFileState,
  PreviewMode,
} from '@/components/ide/fullscreen/types';

type WorkbenchPreviewPaneProps = {
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
  const renderRuntimeSurface = (mode: 'runtime' | 'device') => {
    if (!activeFile) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[var(--aethel-text-tertiary)]">
          Selecione um arquivo para visualizar a prévia.
        </div>
      );
    }

    const surface = (
      <CanonicalPreviewSurface
        key={`${activeFile.path}:${previewRefreshTick}${mode === 'device' ? ':device' : ''}`}
        variant="runtime"
        title="Prévia ao vivo"
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
    <div className="h-full min-h-0 bg-[var(--aethel-surface-primary)] flex flex-col">
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
          onRunRecommendedAction={() => {
            if (runtimePrimaryAction === 'provision') {
              void provisionRuntime('manual').then(() => {
                void refreshRuntimeReadiness();
              });
              return;
            }
            if (runtimePrimaryAction === 'discover') {
              void discoverRuntime('manual').then(() => {
                void refreshRuntimeReadiness();
              });
              return;
            }
            handleUseInlineFallback();
          }}
          onDiscoverRuntime={() => {
            void discoverRuntime('manual').then(() => {
              void refreshRuntimeReadiness();
            });
          }}
          onProvisionRuntime={() => {
            void provisionRuntime('manual').then(() => {
              void refreshRuntimeReadiness();
            });
          }}
          onSyncRuntime={() => {
            void syncRuntime().then(() => {
              void refreshRuntimeReadiness();
            });
          }}
          onRevalidate={() => {
            if (!previewRuntimeUrl) return;
            void checkRuntimeHealth(previewRuntimeUrl);
            analytics?.track?.('engine', 'render_time', {
              metadata: {
                surface: 'ide-preview-runtime-health',
                action: 'manual-revalidate',
                runtimeUrl: previewRuntimeUrl,
              },
            });
          }}
          onOpenRuntime={() => {
            if (!previewRuntimeUrl) return;
            window.open(previewRuntimeUrl, '_blank', 'noopener,noreferrer');
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] px-3 py-2.5 text-[11px]">
        {[
          { id: 'runtime' as const, label: 'Prévia' },
          { id: 'device' as const, label: 'Dispositivos' },
          { id: 'console' as const, label: 'Console' },
          { id: 'viewport3d' as const, label: 'Viewport 3D' },
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setPreviewMode(mode.id)}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors min-h-[36px] ${
              previewMode === mode.id
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {previewMode === 'console' && <ConsoleIntegration />}
        {previewMode === 'viewport3d' && (
          <CanonicalPreviewSurface variant="scene" renderMode="draft" />
        )}
        {previewMode === 'runtime' && renderRuntimeSurface('runtime')}
        {previewMode === 'device' && renderRuntimeSurface('device')}
      </div>
    </div>
  );
}

export default WorkbenchPreviewPane;

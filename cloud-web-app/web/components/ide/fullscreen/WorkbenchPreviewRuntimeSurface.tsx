'use client';

import { useMemo } from 'react';

import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';
import { DevicePreview } from '@/components/ide/DevicePreview';
import { PreviewRuntimeTrustNotice } from '@/components/preview/PreviewRuntimeTrustNotice';
import { INITIAL_PREVIEW_RUNTIME } from '@/components/preview/previewRuntimeState';
import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';

import type { WorkbenchPreviewPaneProps } from './workbenchPreviewPaneModels';

type WorkbenchPreviewRuntimeSurfaceProps = Pick<
  WorkbenchPreviewPaneProps,
  | 'activeFile'
  | 'previewRefreshTick'
  | 'previewRuntimeUrl'
  | 'forceInlinePreviewFallback'
  | 'isSavingFile'
  | 'projectId'
  | 'runtimeHealth'
  | 'runtimeHealthCheckedAt'
  | 'runtimeReadiness'
  | 'runtimePrimaryActionLabel'
  | 'runtimeStrategyLabel'
  | 'runtimeDiscoveryMessage'
  | 'setPreviewRefreshTick'
  | 'provisionRuntime'
  | 'handleUseInlineFallback'
> & {
  mode: 'runtime' | 'device';
  proposalContent?: string | null;
  isProposalPreviewing?: boolean;
};

function WorkbenchPreviewEmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] p-5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Visual workspace
        </div>
        <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
          Preview waits for real context.
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--aethel-text-tertiary)]">
          Open a file or generated workspace to review app, device, logs, and 3D output.
        </div>
      </div>
    </div>
  );
}

function WorkspaceRuntimePreview({
  previewRuntimeUrl,
  previewRefreshTick,
  onRefresh,
}: {
  previewRuntimeUrl: string;
  previewRefreshTick: number;
  onRefresh: () => void;
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-col bg-[var(--aethel-surface-primary)]"
      data-workspace-runtime-preview="workspace-first"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--aethel-border-secondary)] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Workspace preview
          </p>
          <p className="truncate text-xs text-[var(--aethel-text-secondary)]">
            {previewRuntimeUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
        >
          Refresh
        </button>
      </div>
      <iframe
        key={`${previewRuntimeUrl}:${previewRefreshTick}`}
        src={previewRuntimeUrl}
        title="Workspace runtime preview"
        className="min-h-0 flex-1 border-0 bg-white"
        sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
      />
    </div>
  );
}

export function WorkbenchPreviewRuntimeSurface({
  activeFile,
  previewRefreshTick,
  previewRuntimeUrl,
  forceInlinePreviewFallback,
  isSavingFile,
  projectId,
  runtimeHealth,
  runtimeHealthCheckedAt,
  runtimeReadiness,
  runtimePrimaryActionLabel,
  runtimeStrategyLabel,
  runtimeDiscoveryMessage,
  setPreviewRefreshTick,
  provisionRuntime,
  handleUseInlineFallback,
  mode,
  proposalContent = null,
  isProposalPreviewing = false,
}: WorkbenchPreviewRuntimeSurfaceProps) {
  const controlledRuntime = useMemo<PreviewRuntimeInfo>(() => {
    const baseRuntime: PreviewRuntimeInfo = {
      ...INITIAL_PREVIEW_RUNTIME,
      strategy: forceInlinePreviewFallback || !previewRuntimeUrl ? 'inline' : 'iframe',
      runtimeUrl: previewRuntimeUrl,
      latencyMs: runtimeHealth.latencyMs ?? null,
      error: runtimeHealth.reason ?? runtimeDiscoveryMessage ?? null,
      lastHealthCheckAt: runtimeHealthCheckedAt?.getTime() ?? null,
      failureCount:
        runtimeHealth.status === 'unhealthy' ||
        runtimeHealth.status === 'unreachable' ||
        runtimeHealth.status === 'invalid'
          ? 1
          : 0,
    };

    if (!previewRuntimeUrl) {
      return {
        ...baseRuntime,
        state: forceInlinePreviewFallback ? 'degraded' : 'idle',
      };
    }

    if (
      forceInlinePreviewFallback ||
      runtimeHealth.status === 'unhealthy' ||
      runtimeHealth.status === 'unreachable' ||
      runtimeHealth.status === 'invalid'
    ) {
      return {
        ...baseRuntime,
        state: 'degraded',
      };
    }

    if (runtimeHealth.status === 'checking') {
      return {
        ...baseRuntime,
        state: 'syncing',
      };
    }

    return {
      ...baseRuntime,
      state: 'healthy',
    };
  }, [
    forceInlinePreviewFallback,
    previewRuntimeUrl,
    runtimeHealth.latencyMs,
    runtimeHealth.reason,
    runtimeHealth.status,
    runtimeDiscoveryMessage,
    runtimeHealthCheckedAt,
  ]);

  const trustNotice = (
    <PreviewRuntimeTrustNotice
      previewRuntimeUrl={previewRuntimeUrl}
      runtimeHealth={runtimeHealth}
      runtimeReadiness={runtimeReadiness}
      runtimePrimaryActionLabel={runtimePrimaryActionLabel}
      runtimeStrategyLabel={runtimeStrategyLabel}
      runtimeDiscoveryMessage={runtimeDiscoveryMessage}
      forceInlinePreviewFallback={forceInlinePreviewFallback}
      isSavingFile={isSavingFile}
      density="compact"
      artifactLabel={isProposalPreviewing ? 'proposal' : 'live'}
    />
  );

  if (!activeFile) {
    if (previewRuntimeUrl && !forceInlinePreviewFallback) {
      const runtimePreview = (
        <WorkspaceRuntimePreview
          previewRuntimeUrl={previewRuntimeUrl}
          previewRefreshTick={previewRefreshTick}
          onRefresh={() => setPreviewRefreshTick((current) => current + 1)}
        />
      );

      if (mode === 'device') {
        return (
          <div className="flex h-full min-h-0 flex-col">
            {trustNotice}
            <div className="min-h-0 flex-1">
              <DevicePreview>{runtimePreview}</DevicePreview>
            </div>
          </div>
        );
      }

      return (
        <div className="flex h-full min-h-0 flex-col">
          {trustNotice}
          <div className="min-h-0 flex-1">{runtimePreview}</div>
        </div>
      );
    }

    return <WorkbenchPreviewEmptyState />;
  }

  const previewSurface = (
    <CanonicalPreviewSurface
      key={`${activeFile.path}:${previewRefreshTick}${mode === 'device' ? ':device' : ''}:${isProposalPreviewing ? 'proposal' : 'live'}`}
      variant="runtime"
      title={isProposalPreviewing ? 'Proposal preview' : 'Live preview'}
      filePath={activeFile.path}
      content={proposalContent ?? activeFile.content}
      projectId={projectId}
      runtimeUrl={previewRuntimeUrl ?? undefined}
      runtimeInfoOverride={controlledRuntime}
      forceInlineFallback={forceInlinePreviewFallback}
      runtimeUnavailableReason={runtimeHealth.reason}
      isStale={isSavingFile}
      onRefresh={() => setPreviewRefreshTick((current) => current + 1)}
      onProvisionRequest={() => {
        void provisionRuntime('manual');
      }}
      onInlineFallbackRequest={handleUseInlineFallback}
      showLifecycleBar={false}
    />
  );

  if (mode === 'device') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {trustNotice}
        <div className="min-h-0 flex-1">
          <DevicePreview>{previewSurface}</DevicePreview>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {trustNotice}
      <div className="min-h-0 flex-1">{previewSurface}</div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';

import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';
import { DevicePreview } from '@/components/ide/DevicePreview';
import { PreviewRuntimeTrustNotice } from '@/components/preview/PreviewRuntimeTrustNotice';
import { INITIAL_PREVIEW_RUNTIME } from '@/components/preview/previewRuntimeState';
import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';

import { PREVIEW_MODES, type WorkbenchPreviewPaneProps } from './workbenchPreviewPaneModels';

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
};

function WorkbenchPreviewEmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] p-5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Visual workspace
        </div>
        <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
          Selecione um arquivo para abrir a superficie visual certa.
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--aethel-text-tertiary)]">
          Mantemos runtime, devices, console e visual 3D na mesma lane para que a proxima validacao fique a um clique de distancia.
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--aethel-text-secondary)]">
          {PREVIEW_MODES.map((mode) => (
            <span
              key={mode.id}
              className="rounded-full border border-[var(--aethel-border-primary)] px-2.5 py-1"
            >
              {mode.label}
            </span>
          ))}
        </div>
      </div>
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

  if (!activeFile) {
    return <WorkbenchPreviewEmptyState />;
  }

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
    />
  );

  const previewSurface = (
    <CanonicalPreviewSurface
      key={`${activeFile.path}:${previewRefreshTick}${mode === 'device' ? ':device' : ''}`}
      variant="runtime"
      title="Previa ao vivo"
      filePath={activeFile.path}
      content={activeFile.content}
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

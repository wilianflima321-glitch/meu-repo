'use client';

import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface';
import { DevicePreview } from '@/components/ide/DevicePreview';

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
  | 'setPreviewRefreshTick'
> & {
  mode: 'runtime' | 'device';
};

function WorkbenchPreviewEmptyState() {
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
          We keep this lane ready for runtime, devices, console, and 3D checks so the next
          validation step stays one click away.
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
  setPreviewRefreshTick,
  mode,
}: WorkbenchPreviewRuntimeSurfaceProps) {
  if (!activeFile) {
    return <WorkbenchPreviewEmptyState />;
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
      onRefresh={() => setPreviewRefreshTick((current) => current + 1)}
    />
  );

  if (mode === 'device') {
    return <DevicePreview>{surface}</DevicePreview>;
  }

  return <div className="h-full min-h-0">{surface}</div>;
}

'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import type { ActiveFileState, PreviewMode } from '@/components/ide/fullscreen/types';
import {
  describeWorkbenchEntryProfile,
  resolveWorkbenchEntryProfile,
} from '@/components/ide/fullscreen/workbench-entry-triage';
import { getPreviewSurfaceDefinition } from '@/components/preview/previewSurfaceRegistry';
import { PREVIEW_MODES } from './workbenchPreviewPaneModels';

type WorkbenchPreviewModeHeaderProps = {
  activeFile: ActiveFileState | null;
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
};

export function WorkbenchPreviewModeHeader({
  activeFile,
  previewMode,
  setPreviewMode,
}: WorkbenchPreviewModeHeaderProps) {
  const searchParams    = useSearchParams();
  const activeModeMeta  = PREVIEW_MODES.find((m) => m.id === previewMode) ?? PREVIEW_MODES[0];
  const activeSurface   = getPreviewSurfaceDefinition(previewMode);
  const sourceParam     = searchParams?.get('source') ?? null;
  const missionParam    = searchParams?.get('mission') ?? null;

  const entryProfile = useMemo(
    () => resolveWorkbenchEntryProfile({ source: sourceParam, mission: missionParam }),
    [missionParam, sourceParam],
  );
  const chromeContext = useMemo(() => describeWorkbenchEntryProfile(entryProfile), [entryProfile]);

  // Rich title for tooltip only — never shown as visible text to users
  const tooltipTitle = [
    chromeContext.stageLabel,
    activeFile ? `File: ${activeFile.path}` : null,
    missionParam?.trim() ? `Mission: ${missionParam}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-2 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2" title={tooltipTitle}>
        {/* Mode pills — the ONLY user-visible controls */}
        <div className="flex min-w-0 flex-wrap items-center gap-1" role="tablist" aria-label="Preview mode">
          {PREVIEW_MODES.map((mode) => {
            const isActive = previewMode === mode.id;
            const surfaceMeta = getPreviewSurfaceDefinition(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setPreviewMode(mode.id)}
                data-preview-surface-kind={surfaceMeta.kind}
                data-preview-surface-owner={surfaceMeta.owner}
                className={[
                  'min-h-[28px] rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]',
                  isActive
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-text-primary)]'
                    : 'border-transparent text-[var(--aethel-text-quaternary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-secondary)]',
                ].join(' ')}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Trailing context — file name only, no internal policy/stage labels */}
        <div className="hidden items-center gap-2 xl:flex">
          {activeFile && (
            <span
              title={activeFile.path}
              className="max-w-[200px] truncate rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-2.5 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]"
            >
              {activeFile.path.split('/').pop()}
            </span>
          )}
          {missionParam?.trim() && (
            <span
              title={missionParam}
              className="max-w-[160px] truncate rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-2.5 py-0.5 text-[10px] text-[var(--aethel-text-quaternary)]"
            >
              {missionParam}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

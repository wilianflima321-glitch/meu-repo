'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import type {
  ActiveFileState,
  PreviewMode,
} from '@/components/ide/fullscreen/types';
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
  const searchParams = useSearchParams();
  const activeModeMeta = PREVIEW_MODES.find((mode) => mode.id === previewMode) ?? PREVIEW_MODES[0];
  const activeSurface = getPreviewSurfaceDefinition(previewMode);
  const sourceParam = searchParams?.get('source') ?? null;
  const missionParam = searchParams?.get('mission') ?? null;
  const entryProfile = useMemo(
    () =>
      resolveWorkbenchEntryProfile({
        source: sourceParam,
        mission: missionParam,
      }),
    [missionParam, sourceParam],
  );
  const chromeContext = useMemo(
    () => describeWorkbenchEntryProfile(entryProfile),
    [entryProfile],
  );
  const contextTitle = [
    chromeContext.stageLabel,
    `Mode: ${activeModeMeta.label}`,
    `Policy: ${activeSurface.detailPolicy.replace(/-/g, ' ')}`,
    missionParam?.trim() ? `Mission: ${missionParam}` : null,
    activeFile ? `File: ${activeFile.path}` : null,
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <div className="border-b border-[var(--aethel-border-secondary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent))] px-2 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-1.5">
          {PREVIEW_MODES.map((mode) => {
            const isActive = previewMode === mode.id;
            const surfaceMeta = getPreviewSurfaceDefinition(mode.id);

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setPreviewMode(mode.id)}
                aria-pressed={isActive}
                data-preview-surface-kind={surfaceMeta.kind}
                data-preview-surface-owner={surfaceMeta.owner}
                className={`group min-h-[30px] rounded-full border px-2.5 py-1 text-left transition-all ${
                  isActive
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-text-primary)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                    : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-secondary)]'
                }`}
              >
                <span className="text-[10px] font-semibold leading-none">{mode.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {activeFile ? (
            <span
              title={contextTitle}
              className="hidden min-h-[26px] items-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-2.5 py-1 text-[var(--aethel-text-secondary)] xl:inline-flex"
            >
              {activeModeMeta.label} - {activeSurface.detailPolicy.replace(/-/g, ' ')}
            </span>
          ) : null}
          {missionParam?.trim() ? (
            <span
              title={missionParam}
              className="hidden min-h-[26px] max-w-[180px] items-center truncate rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-2.5 py-1 text-[var(--aethel-text-tertiary)] xl:inline-flex"
            >
              {missionParam}
            </span>
          ) : null}
          {activeFile ? (
            <span
              title={activeFile.path}
              className="hidden min-h-[26px] max-w-[220px] items-center truncate rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-2.5 py-1 text-[var(--aethel-text-tertiary)] 2xl:inline-flex"
            >
              {activeFile.path}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

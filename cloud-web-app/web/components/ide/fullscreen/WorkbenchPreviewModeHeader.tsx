'use client';

import type {
  ActiveFileState,
  PreviewMode,
} from '@/components/ide/fullscreen/types';

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
  const activeModeMeta = PREVIEW_MODES.find((mode) => mode.id === previewMode) ?? PREVIEW_MODES[0];

  return (
    <div className="border-b border-[var(--aethel-border-secondary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent))] px-2 py-1.5">
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
                className={`group min-h-[34px] rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                  isActive
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-text-primary)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                    : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-secondary)]'
                }`}
              >
                <div className="text-[10px] font-semibold leading-none">{mode.label}</div>
                <div
                  className={`mt-1 text-[10px] leading-none ${
                    isActive
                      ? 'text-[var(--aethel-text-secondary)]'
                      : 'text-[var(--aethel-text-quaternary)] group-hover:text-[var(--aethel-text-tertiary)]'
                  }`}
                >
                  {mode.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex min-h-[26px] items-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-2.5 py-1 text-[var(--aethel-text-secondary)]">
            Surface: {activeModeMeta.label}
          </span>
          {activeFile ? (
              <span className="inline-flex min-h-[26px] max-w-[260px] items-center truncate rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-2.5 py-1 text-[var(--aethel-text-tertiary)]">
              {activeFile.path}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

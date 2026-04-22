'use client';

export type EntryNotice = {
  tone: 'info' | 'warning';
  title: string;
  description: string;
};

export interface WorkbenchEntryNoticeProps {
  notice: EntryNotice;
  onDismiss: () => void;
}

/**
 * Inline notice rendered at the top of the workbench when the IDE is entered
 * through an external flow (mission, entry shortcut, etc).
 *
 * Extracted from FullscreenIDE.tsx to keep the god-component below budget.
 */
export function WorkbenchEntryNotice({ notice, onDismiss }: WorkbenchEntryNoticeProps) {
  const toneClasses =
    notice.tone === 'warning'
      ? 'border-[color-mix(in_srgb,var(--aethel-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]';

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className={`flex-1 rounded-xl border px-4 py-3 ${toneClasses}`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          {notice.title}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          {notice.description}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-[36px] rounded-lg border border-[var(--aethel-border-primary)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]"
        aria-label="Fechar aviso do workbench"
      >
        Fechar
      </button>
    </div>
  );
}

export default WorkbenchEntryNotice;

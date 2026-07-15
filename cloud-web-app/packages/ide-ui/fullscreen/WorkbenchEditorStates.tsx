'use client';

export function WorkbenchEditorLoadingState() {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-5 py-4 text-sm text-[var(--aethel-text-tertiary)]">
        Loading file...
      </div>
    </div>
  );
}

export function WorkbenchEditorErrorState({ error }: { error: string }) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-xl rounded border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error)]">
        {error}
      </div>
    </div>
  );
}

export function WorkbenchEditorEmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--aethel-border-secondary)_64%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-6 text-left shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-primary-light)]">
          Workspace ready
        </p>
        <h2 className="mt-3 text-xl font-semibold text-[var(--aethel-text-primary)]">
          Open a file or ask an agent.
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          Use quick open, command center, or AI Console when the workspace needs it.
        </p>
        <div className="mt-5 grid gap-2 text-xs text-[var(--aethel-text-tertiary)] sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-3 py-2">
            <span className="block font-semibold text-[var(--aethel-text-secondary)]">Cmd+P</span>
            Quick open
          </div>
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-3 py-2">
            <span className="block font-semibold text-[var(--aethel-text-secondary)]">Cmd+K</span>
            Command
          </div>
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-3 py-2">
            <span className="block font-semibold text-[var(--aethel-text-secondary)]">Ctrl+I</span>
            AI Console
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkbenchEmptyEditorGroupState() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
      Open a file into this editor group with Cmd+P.
    </div>
  );
}

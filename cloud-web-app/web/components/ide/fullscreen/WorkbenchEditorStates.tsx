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
    <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[var(--aethel-text-tertiary)]">
      Select a file to start editing.
    </div>
  );
}

export function WorkbenchEmptyEditorGroupState() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
      No file open in this group.
    </div>
  );
}

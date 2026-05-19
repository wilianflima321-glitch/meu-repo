import { Keyboard, XCircle } from 'lucide-react'

import { SHORTCUTS } from './moderation-copy'

export function ModerationShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)]">
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
            <Keyboard className="h-5 w-5" />
            Keyboard shortcuts
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]" aria-label="Close keyboard shortcuts">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {Object.entries(SHORTCUTS).map(([key, action]) => (
            <div key={key} className="flex items-center justify-between border-b border-[var(--aethel-border-secondary)] py-2">
              <span className="text-[var(--aethel-text-secondary)]">{action}</span>
              <kbd className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] px-2 py-1 font-mono text-sm text-[var(--aethel-text-secondary)]">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-[var(--aethel-text-tertiary)]">Press any key while an item is selected to run the action.</p>
      </div>
    </div>
  )
}

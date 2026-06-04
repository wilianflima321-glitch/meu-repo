import { AlertTriangle } from 'lucide-react'

export function DeleteAccountDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)]">
      <div className="mx-4 w-full max-w-md rounded-xl bg-[var(--aethel-surface-tertiary)] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--aethel-error)]/20">
            <AlertTriangle className="h-5 w-5 text-[var(--aethel-error)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--aethel-text-primary)]">Delete account</h3>
        </div>

        <p className="mb-6 text-[var(--aethel-text-secondary)]">
          This action is <strong className="text-[var(--aethel-text-primary)]">permanent and irreversible</strong>.
          All your data, projects, and settings will be deleted.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-[var(--aethel-surface-quaternary)] px-4 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[var(--aethel-error-dark)] px-4 py-2 transition-colors hover:bg-[var(--aethel-error)]"
          >
            Delete my account
          </button>
        </div>
      </div>
    </div>
  )
}

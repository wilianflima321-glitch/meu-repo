'use client'

import { useState } from 'react'
import { Download, ShieldAlert, Loader2 } from 'lucide-react'

type Status = { type: 'idle' | 'error' | 'success' | 'info'; message: string }

const IDLE: Status = { type: 'idle', message: '' }

/**
 * Account data controls (LGPD/GDPR): self-serve data export (portability) and
 * irreversible account deletion (erasure). Wired to the real backend routes
 * `GET /api/account/export` and `DELETE /api/account`.
 */
export function AccountDataPanel() {
  const [exportStatus, setExportStatus] = useState<Status>(IDLE)
  const [exporting, setExporting] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [confirmWord, setConfirmWord] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<Status>(IDLE)

  const canDelete = confirmWord.trim() === 'DELETE' && confirmEmail.trim().length > 3 && !deleting

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportStatus(IDLE)
    try {
      const response = await fetch('/api/account/export', { headers: { Accept: 'application/json' } })
      if (response.status === 401) {
        setExportStatus({ type: 'error', message: 'Session expired. Please sign in again.' })
        return
      }
      if (!response.ok) {
        setExportStatus({ type: 'error', message: 'Export failed. Please try again.' })
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `aethel-account-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setExportStatus({ type: 'success', message: 'Your data export was downloaded.' })
    } catch {
      setExportStatus({ type: 'error', message: 'Network error during export.' })
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete) return
    setDeleting(true)
    setDeleteStatus(IDLE)
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmWord.trim(), email: confirmEmail.trim() }),
      })
      if (response.ok) {
        setDeleteStatus({ type: 'success', message: 'Account deleted. Redirecting…' })
        setTimeout(() => window.location.assign('/login'), 1200)
        return
      }
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null
      if (response.status === 400) {
        setDeleteStatus({
          type: 'error',
          message: data?.message || 'Confirmation does not match your account email.',
        })
        return
      }
      if (response.status === 401) {
        setDeleteStatus({ type: 'error', message: 'Session expired. Please sign in again.' })
        return
      }
      setDeleteStatus({ type: 'error', message: data?.error || data?.message || 'Deletion failed. Please try again.' })
    } catch {
      setDeleteStatus({ type: 'error', message: 'Network error during deletion.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mt-6 border-t border-[var(--aethel-border-primary)] pt-6">
      <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Your data &amp; privacy</h3>
      <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
        Export everything we hold about you, or permanently delete your account (LGPD / GDPR).
      </p>

      {/* Data export */}
      <div className="mt-4 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Export my data</p>
            <p className="mt-0.5 text-xs text-[var(--aethel-text-tertiary)]">
              Downloads a JSON file with your profile, projects, usage, payments and more. Secrets are excluded.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Preparing…' : 'Export'}
          </button>
        </div>
        {exportStatus.type !== 'idle' ? (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 text-xs ${
              exportStatus.type === 'error'
                ? 'text-[var(--aethel-error-light)]'
                : exportStatus.type === 'success'
                  ? 'text-[var(--aethel-success-light)]'
                  : 'text-[var(--aethel-text-secondary)]'
            }`}
          >
            {exportStatus.message}
          </p>
        ) : null}
      </div>

      {/* Danger zone */}
      <div className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] p-4">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-error-light)]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--aethel-error-light)]">Delete account</p>
            <p className="mt-0.5 text-xs text-[var(--aethel-text-tertiary)]">
              This is permanent. All your projects, files, chats and usage history are erased and cannot be recovered.
            </p>
          </div>
        </div>

        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => {
              setConfirmOpen(true)
              setDeleteStatus(IDLE)
            }}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)] px-3 text-sm font-semibold text-[var(--aethel-error-light)] transition hover:brightness-110"
          >
            Delete my account…
          </button>
        ) : (
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs text-[var(--aethel-text-secondary)]">
              Confirm your account email
              <input
                type="email"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="off"
                className="min-h-10 rounded-md border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 text-sm text-[var(--aethel-text-primary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)]"
              />
            </label>
            <label className="grid gap-1 text-xs text-[var(--aethel-text-secondary)]">
              Type <span className="font-bold text-[var(--aethel-text-primary)]">DELETE</span> to confirm
              <input
                type="text"
                value={confirmWord}
                onChange={(event) => setConfirmWord(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className="min-h-10 rounded-md border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 text-sm text-[var(--aethel-text-primary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[var(--aethel-error)] px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false)
                  setConfirmEmail('')
                  setConfirmWord('')
                  setDeleteStatus(IDLE)
                }}
                disabled={deleting}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--aethel-border-secondary)] px-4 text-sm font-medium text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteStatus.type !== 'idle' ? (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 text-xs ${
              deleteStatus.type === 'error'
                ? 'text-[var(--aethel-error-light)]'
                : deleteStatus.type === 'success'
                  ? 'text-[var(--aethel-success-light)]'
                  : 'text-[var(--aethel-text-secondary)]'
            }`}
          >
            {deleteStatus.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default AccountDataPanel

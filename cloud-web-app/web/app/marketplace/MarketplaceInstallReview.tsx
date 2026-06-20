'use client'

import { useEffect, useRef } from 'react'
import { LockKeyhole, ShieldCheck, XCircle } from 'lucide-react'
import type { MarketplaceInstallReviewProps } from './marketplace-page.types'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import {
  getExtensionBadge,
  isVerifiedExtension,
  riskClass,
} from './marketplace-page.helpers'

export function MarketplaceInstallReview({
  extension,
  onConfirmInstall,
  onCancel,
  pending = false,
  feedback = null,
}: MarketplaceInstallReviewProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const isOpen = Boolean(extension)

  // Keyboard: Escape closes (unless a request is in flight). Tab traps focus.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) {
        onCancel()
        return
      }
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements || focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            event.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            event.preventDefault()
          }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, pending, onCancel])

  // Move focus into the dialog when it opens (a11y).
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus()
  }, [isOpen])

  if (!extension) return null
  const verified = isVerifiedExtension(extension)
  const risk = extension.riskLevel ?? (verified ? 'low' : 'medium')
  const permissions = extension.permissions?.length
    ? extension.permissions
    : ['Read workspace metadata']

  const provenance =
    extension.provenance ??
    (verified
      ? 'Publisher and manifest reviewed'
      : 'Awaiting provenance review')
  const rollbackPlan =
    extension.rollbackPlan ??
    'Disable the package and remove generated artifacts where possible.'
  const finalLabel = verified ? 'Install preview' : 'Request review'
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] p-4 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketplace-install-review-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel()
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-5 shadow-[var(--aethel-shadow-xl)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] text-sm font-bold">
              {getExtensionBadge(extension)}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
                Marketplace install review
              </p>
              <h2
                id="marketplace-install-review-title"
                className="mt-1 text-xl font-semibold text-[var(--aethel-text-primary)]"
              >
                {extension.displayName}
              </h2>
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                {extension.evidenceLabel} -
                {extension.reviewStatus === 'community-review'
                  ? 'Community preview'
                  : 'Aethel-reviewed'}
                - v{extension.version}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            className={`inline-flex h-10 w-10 items-center justify-center border border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}
            aria-label="Close install review"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <section className="border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Permissions
            </p>
            <ul className="mt-3 space-y-2">
              {permissions.map((permission) => (
                <li
                  key={permission}
                  className="flex items-start gap-2 text-sm text-[var(--aethel-text-secondary)]"
                >
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-[var(--aethel-info-light)]" />
                  {permission}
                </li>
              ))}
            </ul>
          </section>
          <section className="border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Risk and license
            </p>
            <div
              className={`mt-3 inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${riskClass(risk)}`}
            >
              <LockKeyhole className="h-3 w-3" /> Risk {risk}
            </div>
            <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
              License: {extension.license ?? 'Not declared'}
            </p>
          </section>
          <section className="border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Provenance
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {provenance}
            </p>
          </section>
          <section className="border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Rollback
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {rollbackPlan}
            </p>
          </section>
        </div>
        {feedback ? (
          <p
            role="status"
            aria-live="polite"
            className={`mt-4 border-t pt-4 text-sm ${
              feedback.type === 'error'
                ? 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[var(--aethel-error-light)]'
                : feedback.type === 'success'
                  ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] text-[var(--aethel-success-light)]'
                  : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={`inline-flex min-h-11 items-center justify-center border border-[var(--aethel-border-subtle)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_FOCUS}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmInstall(extension.id)}
            disabled={pending}
            className={`inline-flex min-h-11 items-center justify-center bg-[var(--aethel-text-primary)] px-4 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${CANONICAL_FOCUS}`}
          >
            {pending ? 'Installing…' : finalLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

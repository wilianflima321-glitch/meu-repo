'use client'

import { LockKeyhole, ShieldCheck, XCircle } from 'lucide-react'
import type { MarketplaceInstallReviewProps } from './marketplace-page.types'
import {
  getExtensionBadge,
  isVerifiedExtension,
  riskClass,
} from './marketplace-page.helpers'

export function MarketplaceInstallReview({
  extension,
  onConfirmInstall,
  onCancel,
}: MarketplaceInstallReviewProps) {
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
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketplace-install-review-title"
    >
      <div className="w-full max-w-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.58)]">
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
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 items-center justify-center border border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
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
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center border border-[var(--aethel-border-subtle)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmInstall(extension.id)}
            className="inline-flex min-h-11 items-center justify-center bg-[var(--aethel-text-primary)] px-4 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:opacity-90"
          >
            {finalLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

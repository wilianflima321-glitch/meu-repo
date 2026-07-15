'use client'

import {
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import type { MarketplaceCardProps } from './marketplace-page.types'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import {
  getExtensionBadge,
  isVerifiedExtension,
  riskTextClass,
} from './marketplace-page.helpers'

export function MarketplaceCard({
  extension,
  onRequestInstall,
  onRequestPurchase,
  onUninstall,
  purchasePending,
}: MarketplaceCardProps) {
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

  return (
    <article className="flex h-full flex-col border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] p-5 shadow-[var(--aethel-shadow-md)] transition hover:border-[var(--aethel-border-secondary)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] text-sm font-bold text-[var(--aethel-text-primary)]">
          {getExtensionBadge(extension)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-base font-semibold text-[var(--aethel-text-primary)]">
              {extension.displayName}
            </h3>
            <span
              className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] ${verified ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning-light)]'}`}
            >
              {verified ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {verified ? 'Verified' : 'Review'}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            by {extension.publisher} - v{extension.version}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
        {extension.description}
      </p>
      <div className="mt-4 grid gap-2 border-t border-[var(--aethel-border-subtle)] pt-3 text-xs text-[var(--aethel-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
          {extension.evidenceLabel}
        </span>
        <span
          className={`inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${riskTextClass(risk)}`}
        >
          <LockKeyhole className="h-3 w-3" /> Risk {risk}
        </span>
      </div>
      <details className="mt-3 border-t border-[var(--aethel-border-subtle)] pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          <span>Review permissions and provenance</span>
          <span className="text-[9px] text-[var(--aethel-text-quaternary)]">
            Details
          </span>
        </summary>
        <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
          {permissions.length} permission scopes, {provenance.toLowerCase()},
          and {extension.tags.slice(0, 2).join(', ')} tags. Open review to
          inspect before installing.
        </p>
      </details>
      <div className="mt-auto pt-5">
        {extension.installed ? (
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-success-light)]">
              <CheckCircle2 className="h-3 w-3" /> Installed
            </span>
            <button
              type="button"
              onClick={() => onUninstall(extension.id)}
              className={`inline-flex min-h-10 items-center justify-center border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 text-xs font-semibold text-[var(--aethel-error-light)] transition hover:brightness-110 ${CANONICAL_FOCUS}`}
            >
              Uninstall
            </button>
          </div>
        ) : extension.requiresPurchase || (extension.priceCents ?? 0) > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                (extension.priceCents ?? 0) / 100
              )}
              <span className="ml-2 text-[10px] font-normal uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                Fiat · Stripe
              </span>
            </p>
            <button
              type="button"
              disabled={purchasePending}
              onClick={() => onRequestPurchase(extension.id)}
              className={`inline-flex min-h-10 w-full items-center justify-center bg-[var(--aethel-primary)] px-3 text-xs font-semibold text-[var(--aethel-text-inverse)] transition hover:brightness-110 disabled:opacity-60 ${CANONICAL_FOCUS}`}
            >
              {purchasePending ? 'Starting checkout…' : 'Buy with Stripe'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onRequestInstall(extension.id)}
            className={`inline-flex min-h-10 w-full items-center justify-center bg-[var(--aethel-primary)] px-3 text-xs font-semibold text-[var(--aethel-text-inverse)] transition hover:brightness-110 ${CANONICAL_FOCUS}`}
          >
            Review install
          </button>
        )}
      </div>
    </article>
  )
}

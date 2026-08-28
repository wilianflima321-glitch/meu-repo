'use client'

import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  FileCode2,
  HardDrive,
  Layers,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
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
      ? 'Publisher and manifest cryptographically verified'
      : 'Awaiting provenance verification')

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] p-5 shadow-[var(--aethel-shadow-md)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-[var(--aethel-border-secondary)] hover:shadow-[var(--aethel-shadow-xl)]">
      {/* Top row: Icon + Info + Verified badge */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] text-sm font-bold text-[var(--aethel-text-primary)] shadow-sm transition-transform duration-200 group-hover:scale-105">
          {getExtensionBadge(extension)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-base font-bold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-primary-light)] transition-colors">
              {extension.displayName}
            </h3>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${verified
                ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
              }`}
            >
              {verified ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {verified ? 'Verified' : 'Under Review'}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            by <span className="text-[var(--aethel-text-secondary)] font-medium">{extension.publisher}</span> · <span className="font-mono">v{extension.version}</span>
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3.5 line-clamp-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
        {extension.description}
      </p>

      {/* Technical Spec Pills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {extension.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--aethel-text-tertiary)]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Security and Risk Bar */}
      <div className="mt-4 grid gap-1.5 border-t border-[var(--aethel-border-subtle)] pt-3 text-xs text-[var(--aethel-text-secondary)]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
            <span>{extension.evidenceLabel}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] ${riskTextClass(risk)}`}
          >
            <LockKeyhole className="h-3 w-3" /> Risk {risk}
          </span>
        </div>
      </div>

      {/* Expandable permissions */}
      <details className="mt-3 border-t border-[var(--aethel-border-subtle)] pt-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]">
          <span>Permissions & Provenance</span>
          <span className="font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
            {permissions.length} scopes
          </span>
        </summary>
        <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--aethel-text-tertiary)]">
          {provenance}. Requires access to: {permissions.join(', ')}.
        </p>
      </details>

      {/* Action CTA Button */}
      <div className="mt-auto pt-4">
        {extension.installed ? (
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--aethel-success-light)]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Installed
            </span>
            <button
              type="button"
              onClick={() => onUninstall(extension.id)}
              className={`inline-flex min-h-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3.5 text-xs font-semibold text-[var(--aethel-error-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] ${CANONICAL_FOCUS}`}
            >
              Uninstall
            </button>
          </div>
        ) : extension.requiresPurchase && typeof extension.priceCents === 'number' && extension.priceCents > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm font-bold text-[var(--aethel-text-primary)]">
              ${(extension.priceCents / 100).toFixed(2)}
            </span>
            <button
              type="button"
              disabled={purchasePending}
              onClick={() => onRequestPurchase(extension.id)}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--aethel-primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--aethel-primary-light)] active:scale-[0.98] disabled:opacity-50 ${CANONICAL_FOCUS}`}
            >
              <Download className="h-3.5 w-3.5" /> {purchasePending ? 'Processing...' : 'Purchase'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onRequestInstall(extension.id)}
            className={`flex w-full min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] px-4 text-xs font-bold text-[var(--aethel-primary-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] active:scale-[0.98] ${CANONICAL_FOCUS}`}
          >
            <Download className="h-3.5 w-3.5" /> Install Extension
          </button>
        )}
      </div>
    </article>
  )
}

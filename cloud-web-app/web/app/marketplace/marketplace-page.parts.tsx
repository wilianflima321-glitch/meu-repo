'use client'

import { AlertTriangle, BadgeCheck, CheckCircle2, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react'
import type { Extension } from './marketplace-page.data'

export type MarketplaceTrustFilter = 'verified' | 'community-review'

type MarketplaceFiltersProps = {
  searchQuery: string
  selectedCategory: string
  sortBy: string
  trustFilter: MarketplaceTrustFilter
  categories: readonly string[]
  categoryLabels: Record<string, string>
  sortOptions: readonly { value: string; label: string }[]
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSortChange: (value: string) => void
  onTrustFilterChange: (value: MarketplaceTrustFilter) => void
}

type MarketplaceCardProps = {
  extension: Extension
  onRequestInstall: (extensionId: string) => void
  onUninstall: (extensionId: string) => void
}

type MarketplaceInstallReviewProps = {
  extension: Extension | null
  onConfirmInstall: (extensionId: string) => void
  onCancel: () => void
}

export function isVerifiedExtension(extension: Extension) {
  return extension.verified ?? extension.publisher.toLowerCase().includes('aethel')
}

export function getExtensionBadge(extension: Extension) {
  const base = (extension.displayName || extension.name || '').trim()
  if (!base) return 'EXT'
  const parts = base.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
  return initials || base.slice(0, 3).toUpperCase()
}

function riskClass(risk: Extension['riskLevel']) {
  if (risk === 'high') return 'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
  if (risk === 'medium') return 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
  return 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
}

export function MarketplaceHero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <div className="grid gap-5 rounded-[34px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(8,10,16,0.92))] p-6 shadow-[0_26px_90px_rgba(2,6,23,0.34)] lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Trusted extensions
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--aethel-text-primary)] sm:text-5xl">
            Install capabilities with permissions, provenance, and risk visible first.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
            Aethel Marketplace now behaves like a professional plugin store: reviewed packages are separated from community review, and every install makes scope explicit.
          </p>
        </div>
        <div className="grid gap-3 rounded-[26px] border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.42)] p-4">
          {[
            ['Verified', 'License and source trail checked'],
            ['Permissions', 'Read/write scope shown before install'],
            ['Rollback', 'Installed state remains reversible'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">{label}</p>
              <p className="mt-1 text-sm font-medium text-[var(--aethel-text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MarketplaceFilters({
  searchQuery,
  selectedCategory,
  sortBy,
  trustFilter,
  categories,
  categoryLabels,
  sortOptions,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onTrustFilterChange,
}: MarketplaceFiltersProps) {
  return (
    <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.22)] sm:p-5">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'verified', label: 'Featured verified', icon: BadgeCheck },
          { id: 'community-review', label: 'Community review', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon
          const active = trustFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTrustFilterChange(tab.id as MarketplaceTrustFilter)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold uppercase tracking-[0.14em] transition ${
                active
                  ? 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                  : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <input
          type="search"
          placeholder="Search extensions, permissions, or tags..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-12 w-full rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]"
        />
        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.currentTarget.value)}
          className="h-12 w-full rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)]"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <details className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_42%,transparent)] px-3 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
          <span>Category filters</span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)]">
            {categoryLabels[selectedCategory] ?? selectedCategory}
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategory === category
            return (
              <button
                type="button"
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                  active
                    ? 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                    : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                {categoryLabels[category] ?? category}
              </button>
            )
          })}
        </div>
      </details>
    </div>
  )
}

export function MarketplaceCard({ extension, onRequestInstall, onUninstall }: MarketplaceCardProps) {
  const verified = isVerifiedExtension(extension)
  const risk = extension.riskLevel ?? (verified ? 'low' : 'medium')
  const permissions = extension.permissions?.length ? extension.permissions : ['Read workspace metadata']
  const provenance = extension.provenance ?? (verified ? 'Publisher and manifest reviewed' : 'Awaiting provenance review')

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(8,10,16,0.76))] p-5 shadow-[0_18px_60px_rgba(2,6,23,0.22)] transition hover:border-[var(--aethel-border-secondary)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] text-sm font-bold text-[var(--aethel-text-primary)]">
          {getExtensionBadge(extension)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-[var(--aethel-text-primary)]">{extension.displayName}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${verified ? 'border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]' : 'border-[color-mix(in_srgb,var(--aethel-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'}`}>
              {verified ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {verified ? 'Verified' : 'Review'}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">by {extension.publisher} - v{extension.version}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{extension.description}</p>

      <div className="mt-4 grid gap-2 text-xs text-[var(--aethel-text-secondary)]">
        <div className="flex items-center justify-between rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.28)] px-3 py-2">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
            {extension.evidenceLabel}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            No public install metric yet
          </span>
        </div>
        <div className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${riskClass(risk)}`}>
          <LockKeyhole className="h-3 w-3" />
          Risk {risk}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.22)] p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Permissions</p>
        <ul className="mt-2 space-y-1.5">
          {permissions.slice(0, 3).map((permission) => (
            <li key={permission} className="flex items-center gap-2 text-xs text-[var(--aethel-text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--aethel-info)]" />
              {permission}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Provenance</p>
        <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{provenance}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {extension.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-2.5 py-1 text-[10px] text-[var(--aethel-text-secondary)]">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        {extension.installed ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => onUninstall(extension.id)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 text-xs font-semibold text-[var(--aethel-error-light)] transition hover:brightness-110">
              Uninstall
            </button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
              Configure
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => onRequestInstall(extension.id)} className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[var(--aethel-primary)] px-3 text-xs font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110">
            Review install
          </button>
        )}
      </div>
    </article>
  )
}

export function MarketplaceInstallReview({ extension, onConfirmInstall, onCancel }: MarketplaceInstallReviewProps) {
  if (!extension) return null

  const verified = isVerifiedExtension(extension)
  const risk = extension.riskLevel ?? (verified ? 'low' : 'medium')
  const permissions = extension.permissions?.length ? extension.permissions : ['Read workspace metadata']
  const provenance = extension.provenance ?? (verified ? 'Publisher and manifest reviewed' : 'Awaiting provenance review')
  const rollbackPlan = extension.rollbackPlan ?? 'Disable the package and remove generated artifacts where possible.'
  const finalLabel = verified ? 'Install preview' : 'Request review'

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-md sm:items-center" role="dialog" aria-modal="true" aria-labelledby="marketplace-install-review-title">
      <div className="w-full max-w-2xl rounded-[30px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.58)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] text-sm font-bold">
              {getExtensionBadge(extension)}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
                Marketplace install review
              </p>
              <h2 id="marketplace-install-review-title" className="mt-1 text-xl font-semibold text-[var(--aethel-text-primary)]">
                {extension.displayName}
              </h2>
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                {extension.evidenceLabel} · {extension.reviewStatus === 'community-review' ? 'Community preview' : 'Internal preview'} · v{extension.version}
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]" aria-label="Close install review">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <section className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.22)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Permissions</p>
            <ul className="mt-3 space-y-2">
              {permissions.map((permission) => (
                <li key={permission} className="flex items-start gap-2 text-sm text-[var(--aethel-text-secondary)]">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-[var(--aethel-info-light)]" />
                  {permission}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.22)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Risk and license</p>
            <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${riskClass(risk)}`}>
              <LockKeyhole className="h-3 w-3" />
              Risk {risk}
            </div>
            <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">License: {extension.license ?? 'Not declared'}</p>
          </section>
          <section className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.22)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Provenance</p>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{provenance}</p>
          </section>
          <section className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.22)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Rollback</p>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{rollbackPlan}</p>
          </section>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
            Cancel
          </button>
          <button type="button" onClick={() => onConfirmInstall(extension.id)} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-4 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110">
            {finalLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MarketplaceEmptyState({ showingFallbackCatalog }: { showingFallbackCatalog: boolean }) {
  return (
    <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-6 py-12 text-center">
      <p className="text-lg font-semibold text-[var(--aethel-text-primary)]">No extensions match this view</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--aethel-text-tertiary)]">
        Adjust search, category, or trust filter. {showingFallbackCatalog ? 'The live catalog is unavailable, so curated packages are shown.' : ''}
      </p>
    </div>
  )
}

import { ShieldCheck } from 'lucide-react'

export function MarketplaceHero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-6 shadow-[var(--aethel-shadow-lg)] lg:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
          <ShieldCheck className="h-3.5 w-3.5" /> Trusted extensions
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--aethel-text-primary)] sm:text-5xl">
          Review before install.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
          Extensions stay gated by trust, permissions, and rollback.
        </p>
        <details className="mt-5 max-w-2xl rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_38%,transparent)] px-3 py-2">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] [&::-webkit-details-marker]:hidden">
            Review policy
          </summary>
          <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
            Review stack: license, permissions, provenance, rollback. Usage
            metrics appear when live data exists.
          </p>
        </details>
      </div>
    </section>
  )
}

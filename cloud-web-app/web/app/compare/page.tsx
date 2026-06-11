import type { Metadata } from 'next'
import { CheckCircle2 } from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'
import { CompareHero } from './CompareHero'
import { CompareSourceLink } from './CompareSourceLink'
import {
  COMPARISON_CARDS,
  COMPARISON_METRICS,
  EVIDENCE_LINKS,
} from './comparison-content'

export const metadata: Metadata = {
  title: 'Compare | Aethel Studio',
  description:
    'Honest comparison between Aethel, Cursor, Windsurf, Replit, Vercel, Linear, and Notion for technical buyers.',
}

export default function ComparePage() {
  const primaryEvidenceLinks   = EVIDENCE_LINKS.slice(0, 3)
  const secondaryEvidenceLinks = EVIDENCE_LINKS.slice(3)
  const primaryCards           = COMPARISON_CARDS.slice(0, 3)
  const secondaryCards         = COMPARISON_CARDS.slice(3)

  const renderCard = (card: (typeof COMPARISON_CARDS)[number]) => (
    <article
      key={card.tool}
      className="border border-[var(--aethel-border-primary)] bg-[var(--aethel-panel)] p-5 shadow-[0_20px_70px_rgba(2,8,23,0.24)]"
    >
      {/* Tool identity — badge only, no redundant h3 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          {card.category}
        </span>
        <span className="border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-primary-light)]">
          {card.tool}
        </span>
      </div>

      {/* Primary recommendation — always visible */}
      <div className="mt-4 border border-[color-mix(in_srgb,var(--aethel-success)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-success-light)]">
          Choose Aethel when
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          {card.chooseAethelWhen}
        </p>
      </div>

      {/* Detail in drawer — collapsed by default */}
      <details className="mt-4 border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)] transition hover:text-[var(--aethel-text-secondary)]">
          Detail
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          <Row label="Market focus"   value={card.marketFocus} />
          <Row label="Edge"           value={card.benchmarkStrength} />
          <Row label="Honest gap"     value={card.honestGap} tone="text-[var(--aethel-warning-light)]" />
          <div>
            <Label>Best for</Label>
            <ul className="mt-2 space-y-1.5">
              {card.bestFor.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--aethel-success-light)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {card.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--aethel-border-primary)] pt-3">
              {card.sources.map((link) => (
                <CompareSourceLink key={`${card.tool}-${link.href}`} {...link} />
              ))}
            </div>
          )}
        </div>
      </details>
    </article>
  )

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10">
        <CompareHero />

        {/* Metrics bar */}
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-0 overflow-hidden border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] md:grid-cols-3 md:divide-x md:divide-[var(--aethel-border-primary)]">
            {COMPARISON_METRICS.map((metric) => (
              <div key={metric.label} className="border-b border-[var(--aethel-border-primary)] p-5 last:border-b-0 md:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">{metric.value}</p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-secondary)]">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison cards */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Tool by tool</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)] sm:text-4xl">
              One recommendation. Details on demand.
            </h2>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">{primaryCards.map(renderCard)}</div>
          {secondaryCards.length > 0 && (
            <details className="mt-6 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-4 py-4">
              <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-secondary)]">
                More benchmarks
              </summary>
              <div className="mt-5 grid gap-5 xl:grid-cols-3">{secondaryCards.map(renderCard)}</div>
            </details>
          )}
        </section>

        {/* Public checks */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-y border-[var(--aethel-border-primary)] py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Public checks</p>
              <h2 className="mt-1.5 text-xl font-semibold text-[var(--aethel-text-primary)]">
                Validate before the call.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {primaryEvidenceLinks.map((link) => (
                <CompareSourceLink key={link.href} {...link} />
              ))}
              {secondaryEvidenceLinks.length > 0 && (
                <details className="relative">
                  <summary className="cursor-pointer list-none border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
                    More
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 grid min-w-52 gap-2 border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-2 shadow-[0_22px_70px_rgba(2,8,23,0.36)]">
                    {secondaryEvidenceLinks.map((link) => (
                      <CompareSourceLink key={link.href} {...link} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
      {children}
    </p>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className={`mt-1 ${tone ?? 'text-[var(--aethel-text-secondary)]'}`}>{value}</p>
    </div>
  )
}

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
    'Honest comparison between Aethel, Cursor, Windsurf, Replit, Vercel, Linear, and Notion for technical buyers and champions.',
}

export default function ComparePage() {
  const primaryEvidenceLinks = EVIDENCE_LINKS.slice(0, 3)
  const secondaryEvidenceLinks = EVIDENCE_LINKS.slice(3)
  const primaryComparisonCards = COMPARISON_CARDS.slice(0, 3)
  const secondaryComparisonCards = COMPARISON_CARDS.slice(3)

  const renderComparisonCard = (card: (typeof COMPARISON_CARDS)[number]) => (
    <article
      key={card.tool}
      className="border border-[var(--aethel-border-primary)] bg-[var(--aethel-panel)] p-6 shadow-[0_20px_70px_rgba(2,8,23,0.24)]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
          {card.category}
        </span>
        <span className="border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
          {card.tool}
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-semibold text-[var(--aethel-text-primary)]">
        {card.tool}
      </h3>
      <div className="mt-5 border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)]">
          Choose Aethel when
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          {card.chooseAethelWhen}
        </p>
      </div>
      <details className="mt-5 border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
          Details
        </summary>
        <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Market focus
            </p>
            <p className="mt-2">{card.marketFocus}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Benchmark edge
            </p>
            <p className="mt-2">{card.benchmarkStrength}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-warning-light)]">
              Honest gap
            </p>
            <p className="mt-2">{card.honestGap}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Best fit
            </p>
            <ul className="mt-2 space-y-2">
              {card.bestFor.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            {card.sources.map((link) => (
              <CompareSourceLink
                key={`${card.tool}-${link.href}`}
                {...link}
              />
            ))}
          </div>
        </div>
      </details>
    </article>
  )

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10">
        <CompareHero />
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-0 overflow-hidden border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] shadow-[0_18px_56px_rgba(2,8,23,0.18)] md:grid-cols-3 md:divide-x md:divide-[var(--aethel-border-primary)]">
            {COMPARISON_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="border-b border-[var(--aethel-border-primary)] p-5 last:border-b-0 md:border-b-0"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  {metric.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              Tool by tool
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)] sm:text-4xl">
              The clean read by category.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--aethel-text-tertiary)]">
              One recommendation stays visible. Details stay closed.
            </p>
          </div>
          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {primaryComparisonCards.map(renderComparisonCard)}
          </div>
          {secondaryComparisonCards.length ? (
            <details className="mt-6 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-4 py-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                More benchmarks
              </summary>
              <div className="mt-5 grid gap-5 xl:grid-cols-3">
                {secondaryComparisonCards.map(renderComparisonCard)}
              </div>
            </details>
          ) : null}
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-y border-[var(--aethel-border-primary)] py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                Public checks
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">
                Validate the claim before the call.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {primaryEvidenceLinks.map((link) => (
                <CompareSourceLink key={link.href} {...link} />
              ))}
              {secondaryEvidenceLinks.length ? (
                <details className="relative">
                  <summary className="cursor-pointer list-none border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]">
                    More checks
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 grid min-w-56 gap-2 border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-2 shadow-[0_22px_70px_rgba(2,8,23,0.36)]">
                    {secondaryEvidenceLinks.map((link) => (
                      <CompareSourceLink key={link.href} {...link} />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}

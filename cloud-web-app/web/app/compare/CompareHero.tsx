import Link from 'next/link'
import { CheckCircle2, Compass, Scale } from 'lucide-react'
import { HERO_NOTES } from './comparison-content'

export function CompareHero() {
  return (
    <section
      data-compare-hero="compact"
      className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.66fr)] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
            <Scale className="h-3.5 w-3.5" /> Honest comparison
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl lg:text-6xl">
            Aethel vs the market, without fog.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
            See fit, gaps, and the next best choice. The clean read by category.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard?onboarding=1&source=compare-primary"
              className="inline-flex items-center justify-center bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
            >
              Try the studio
            </Link>
            <Link
              href="/docs/procurement-starter-pack"
              className="inline-flex items-center justify-center border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              Open procurement pack
            </Link>
          </div>
        </div>
        <aside>
          <details className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-5">
            <summary className="flex cursor-pointer list-none items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
              <Compass className="h-4 w-4 text-[var(--aethel-info-light)]" />
              How to read this benchmark
            </summary>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {HERO_NOTES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </section>
  )
}

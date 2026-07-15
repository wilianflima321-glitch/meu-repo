import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock3 } from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Changelog | Aethel Docs',
  description:
    'Recent public Aethel updates focused on shipped product work, gates, and operational trust without inflated marketing.',
}

const CHANGELOG_ENTRIES = [
  {
    date: '2026-04-27',
    title: 'Trust and docs routes cleaned up',
    summary:
      'Customer-fit proof moved into Trust while support, community, and changelog keep real routes with restrained copy.',
    bullets: [
      'Customer-fit proof now lives inside Trust instead of a separate low-value page.',
      'Docs now route to real support, community, and changelog destinations.',
      'Public navigation leans on Trust for buyer proof instead of spreading proof across extra pages.',
    ],
  },
  {
    date: '2026-04-26',
    title: 'Product screens split safely',
    summary:
      'Large product screens were split while compile-mode stayed viable.',
    bullets: [
      'ProjectsDashboard, InlineAIChat, and CreatorDashboard were split into real seams.',
      'Onboarding gained more durable persistence, while share and deploy became more stable in preview.',
      'Compile-mode remained viable while build:prerender-probe stayed explicitly open.',
    ],
  },
  {
    date: '2026-04-25',
    title: 'Public shell made steadier',
    summary:
      'Public pages and editor shell were simplified to reduce fragile handoff.',
    bullets: [
      'Landing v3 returned to a server page with interaction isolated in a local island.',
      'Status, preview trust, and deploy state became more coherent across editor, top bar, and deploy page.',
      'The public base moved closer to anti-fake-success and visible receipts.',
    ],
  },
  {
    date: '2026-04-24',
    title:
      'Editor shell gained real lanes',
    summary:
      'The editor became less monolithic with clearer terminal, AI, preview, and status lanes.',
    bullets: [
      'AIChatPanelPro, SettingsUI, and other large screens were cut aggressively.',
      'Terminal became a canonical shell lane instead of a hidden capability.',
      'Status bar and preview now speak to real editor, runtime, and source-control state.',
    ],
  },
]

export default function ChangelogDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main
        className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12"
        data-docs-changelog-surface="compact"
      >
        <Link
          href="/docs"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>
        <section className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] p-6 shadow-[0_20px_80px_rgba(2,8,23,0.18)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-success-light)]">
            Public changelog
          </p>
          <h1 className="mt-3 text-4xl font-bold">Recent product receipts.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)]">
            Shipped screens, gates, and trust work only.
          </p>
        </section>
        <section className="mt-10 space-y-5">
          {CHANGELOG_ENTRIES.map((entry) => (
            <article
              key={entry.date + entry.title}
              className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.18)]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-secondary)]">
                  <Clock3 className="h-3.5 w-3.5" /> {entry.date}
                </div>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--aethel-text-primary)]">
                {entry.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                {entry.summary}
              </p>
              <details className="mt-5 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_38%,transparent)] px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                  Open shipped details
                </summary>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                  {entry.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-2 inline-flex h-2 w-2 shrink-0 bg-[var(--aethel-success-light)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}

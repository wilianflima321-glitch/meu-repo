import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, GitBranch, MessageSquare, Users2 } from 'lucide-react'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Community | Aethel Docs',
  description:
    'Where the Aethel community lives today, how to participate honestly, and how to become a design partner.',
}

const COMMUNITY_PATHS = [
  {
    icon: GitBranch,
    title: 'Public GitHub',
    description:
      'Code, audits, execution history, and reviewable product work.',
    href: 'https://github.com/wilianflima321-glitch/meu-repo',
    actionLabel: 'Open repository',
  },
  {
    icon: MessageSquare,
    title: 'Feedback through docs and status',
    description:
      'Start from docs, pricing, status, or customer stories before a ticket or rollout.',
    href: '/docs',
    actionLabel: 'Explore docs',
  },
  {
    icon: Users2,
    title: 'Design partner conversations',
    description:
      'For fit, backlog, and rollout feedback that needs a guided conversation.',
    href: '/contact-sales?source=docs-community',
    actionLabel: 'Talk to the team',
  },
]

const HONEST_COMMUNITY_NOTES = [
  'No public Discord or massive Slack claim yet.',
  'The best signal today is repository work, audits, docs, and public product pages.',
  'Design partners are most useful when feedback is specific to workflow and rollout.',
]

export default function CommunityDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

        <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12" data-docs-community-surface="compact">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <section className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] py-6 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">Community</p>
          <h1 className="mt-3 text-4xl font-bold">Community, sized honestly.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)]">
            Public code, docs, and design-partner feedback are the real community today.
          </p>
        </section>

        <section className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-3">
          {COMMUNITY_PATHS.map((path) => {
            const Icon = path.icon
            const external = path.href.startsWith('http')

            return (
              <article
                key={path.title}
                className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] py-5"
              >
                <Icon className="h-5 w-5 text-[var(--aethel-primary-light)]" />
                <h2 className="mt-4 text-lg font-semibold">{path.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--aethel-text-secondary)]">{path.description}</p>
                {external ? (
                  <a
                    href={path.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] hover:text-[var(--aethel-primary-light)]"
                  >
                    {path.actionLabel}
                  </a>
                ) : (
                  <Link
                    href={path.href}
                    className="mt-5 inline-flex items-center border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] hover:text-[var(--aethel-primary-light)]"
                  >
                    {path.actionLabel}
                  </Link>
                )}
              </article>
            )
          })}
        </section>

        <section className="mt-10 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] py-6 sm:py-8">
          <h2 className="text-2xl font-semibold">Honest notes</h2>
          <details className="mt-5 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_28%,transparent)] px-4 py-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Open community limits
            </summary>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
              {HONEST_COMMUNITY_NOTES.map((note) => (
                <li key={note} className="flex items-start gap-3">
                  <span className="mt-2 inline-flex h-2 w-2 shrink-0 bg-[var(--aethel-primary-light)]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

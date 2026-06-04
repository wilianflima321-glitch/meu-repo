import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  LifeBuoy,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export const metadata: Metadata = {
  title: 'Support | Aethel Docs',
  description:
    'How to ask for help in Aethel, what to include, and which public pages to check before escalating.',
}

const SUPPORT_CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'Product help',
    description: 'Onboarding, Studio flow, billing, and product orientation.',
    actionLabel: 'Read docs',
    href: '/docs',
  },
  {
    icon: ShieldCheck,
    title: 'Status and incidents',
    description: 'Known issues, runtime state, and deploy checks.',
    actionLabel: 'View status',
    href: '/status',
  },
  {
    icon: Wrench,
    title: 'Commercial rollout',
    description: 'Quota, governance, onboarding, and enterprise rollout.',
    actionLabel: 'Talk to sales',
    href: '/contact-sales?source=docs-support',
  },
]

const REQUEST_CHECKLIST = [
  'Goal and blocker.',
  'Page or route.',
  'Relevant public context.',
  'Local, shared preview, or deploy.',
]

export default function SupportDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main
        className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12"
        data-docs-support-surface="compact"
      >
        <Link
          href="/docs"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>
        <section className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] p-6 shadow-[0_20px_80px_rgba(2,8,23,0.18)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
            Support
          </p>
          <h1 className="mt-3 text-4xl font-bold">
            Get help fast.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)]">
            Pick docs, status, or rollout support before opening a ticket.
          </p>
        </section>
        <section className="mt-10 divide-y divide-[var(--aethel-border-primary)] overflow-hidden border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]">
          {SUPPORT_CHANNELS.map((channel) => {
            const Icon = channel.icon

            return (
              <article
                key={channel.title}
                className="grid gap-4 p-5 md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center"
              >
                <Icon className="h-5 w-5 text-[var(--aethel-info-light)]" />
                <div>
                  <h2 className="text-lg font-semibold">{channel.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                    {channel.description}
                  </p>
                </div>
                <Link
                  href={channel.href}
                  className="inline-flex items-center text-sm font-medium text-[var(--aethel-text-primary)] transition hover:text-[var(--aethel-info-light)]"
                >
                  {channel.actionLabel}
                </Link>
              </article>
            )
          })}
        </section>
        <section className="mt-10 border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[var(--aethel-primary-light)]" />
            <h2 className="text-2xl font-semibold">
              Useful request checklist
            </h2>
          </div>
          <details className="mt-5 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_38%,transparent)] px-4 py-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Open request checklist
            </summary>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
              {REQUEST_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[var(--aethel-primary-light)]">
                    -
                  </span>
                  <span>{item}</span>
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

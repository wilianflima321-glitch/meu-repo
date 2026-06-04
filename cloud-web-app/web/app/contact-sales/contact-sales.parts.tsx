'use client'

import Link from 'next/link'
import { CheckCircle2, ShieldCheck, Users, Workflow } from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

const enterpriseFeatures = [
  {
    icon: ShieldCheck,
    title: 'Governance and review',
  },
  {
    icon: Workflow,
    title: 'Research -> plan -> code',
  },
  {
    icon: Users,
    title: 'Procurement with context',
  },
]

const DEAL_STEPS = [
  'Share context.',
  'We route it.',
  'You get next steps.',
]

const TRUST_LINKS = [
  { label: 'Security', href: '/security' },
  { label: 'Status', href: '/status' },
]

export const PRIMARY_GOALS = [
  { value: '', label: 'Select' },
  { value: 'avaliar-piloto', label: 'Evaluate pilot / design partner' },
  { value: 'security-procurement', label: 'Security / procurement review' },
  { value: 'rollout-enterprise', label: 'Assisted enterprise rollout' },
  { value: 'pricing-billing', label: 'Pricing, billing, or contract' },
]

export const TIMELINE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'exploratorio', label: 'Exploratory / no fixed date' },
  { value: '0-30', label: '0-30 days' },
  { value: '30-90', label: '30-90 days' },
  { value: '90+', label: '90+ days' },
]

export const sourceReasonLabel = (source: string) =>
  source.replace(/[-_]+/g, ' ').trim()

export function ContactSalesSubmitted() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl border-y border-[var(--aethel-border-primary)] bg-[var(--aethel-panel)] px-8 py-9 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[var(--aethel-text-primary)]">
            Briefing sent
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            We received the brief. We will reply with the best next step.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/docs/procurement-starter-pack"
              className="inline-flex items-center justify-center bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
            >
              Review procurement pack
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-strong)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              Review plans
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

export function ContactSalesHero() {
  return (
    <section className="max-w-4xl">
      <div className="inline-flex items-center gap-2 border-l border-[color-mix(in_srgb,var(--aethel-primary)_42%,transparent)] pl-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
        Enterprise conversation
      </div>
      <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl">
        Design the right enterprise rollout.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
        Share context once. We route the right next step.
      </p>

      <details className="mt-7 max-w-2xl border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-4 py-4">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
          Trust and rollout context
        </summary>
        <div className="mt-4 divide-y divide-[var(--aethel-border-subtle)] overflow-hidden border-y border-[var(--aethel-border-subtle)]">
          {enterpriseFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="flex items-center gap-3 py-3">
                <Icon className="h-4 w-4 shrink-0 text-[var(--aethel-text-tertiary)]" />
                <span className="text-xs font-medium text-[var(--aethel-text-secondary)]">
                  {feature.title}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TRUST_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-l border-[var(--aethel-border-primary)] pl-3 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </details>
    </section>
  )
}

export function ContactSalesAside() {
  return (
    <aside className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-6 py-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
        Next step
      </p>
      <div className="mt-4 divide-y divide-[var(--aethel-border-subtle)] border-y border-[var(--aethel-border-subtle)]">
        {DEAL_STEPS.map((item, index) => (
          <div key={item} className="flex items-center gap-3 py-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--aethel-border-primary)] text-[11px] font-semibold text-[var(--aethel-text-secondary)]">
              {index + 1}
            </div>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              {item}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        <Link
          href="/docs/procurement-starter-pack"
          className="inline-flex items-center justify-center bg-[var(--aethel-primary)] px-4 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition hover:bg-[var(--aethel-primary-dark)]"
        >
          Procurement pack
        </Link>
        <Link
          href="/status"
          className="inline-flex items-center justify-center border border-[var(--aethel-border-primary)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]"
        >
          Public status
        </Link>
      </div>
    </aside>
  )
}

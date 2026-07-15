import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

export type TrustTone = 'live' | 'partial' | 'planned'

export interface TrustMetric {
  label: string
  value: string
  detail: string
  tone?: TrustTone
}

export interface TrustCard {
  eyebrow?: string
  title: string
  tone: TrustTone
  description: string
  bullets: string[]
}

export interface TrustSection {
  eyebrow: string
  title: string
  description: string
  cards: TrustCard[]
}

export interface TrustFaq {
  question: string
  answer: string
}

export interface TrustAction {
  label: string
  href: string
  tone?: 'primary' | 'secondary'
}

export interface TrustResource {
  eyebrow: string
  title: string
  description: string
  href: string
}

interface TrustCenterPageShellProps {
  badge: string
  heroIcon: LucideIcon
  title: string
  description: string
  summaryTitle: string
  summaryBody: string
  summaryPoints: string[]
  metrics: TrustMetric[]
  sections: TrustSection[]
  resources?: TrustResource[]
  faqs: TrustFaq[]
  actions: TrustAction[]
}

function toneLabel(tone: TrustTone) {
  switch (tone) {
    case 'live':
      return 'Available now'
    case 'partial':
      return 'Partial / rollout'
    default:
      return 'Planned'
  }
}

function tonePanelClass(tone: TrustTone) {
  switch (tone) {
    case 'live':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]'
    case 'partial':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]'
    default:
      return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]'
  }
}

function toneBadgeClass(tone: TrustTone) {
  switch (tone) {
    case 'live':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
    case 'partial':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
    default:
      return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)]'
  }
}

function metricToneClass(tone: TrustTone = 'planned') {
  switch (tone) {
    case 'live':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
    case 'partial':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]'
    default:
      return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]'
  }
}

function actionClass(tone: 'primary' | 'secondary' = 'secondary') {
  if (tone === 'primary') {
    return 'border-[color-mix(in_srgb,var(--aethel-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)] text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]'
  }

  return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
}

export function TrustCenterPageShell({
  badge,
  heroIcon: HeroIcon,
  title,
  description,
  summaryTitle,
  summaryBody,
  summaryPoints,
  metrics,
  sections,
  resources = [],
  faqs,
  actions,
}: TrustCenterPageShellProps) {
  const primaryResources = resources.slice(0, 4)
  const secondaryResources = resources.slice(4)

  return (
    <div
      className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]"
      data-trust-center-surface="compact"
    >
      <PublicHeader />

      <main className="relative z-10 px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 border-l border-[color-mix(in_srgb,var(--aethel-info)_38%,transparent)] pl-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
                <HeroIcon className="h-3.5 w-3.5" />
                {badge}
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                {description}
              </p>
            </div>

            <div className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] py-6">
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                <ShieldAlert className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />
                Honest read
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--aethel-text-primary)]">{summaryTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{summaryBody}</p>
              <details className="mt-4 border-t border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  Open posture notes
                </summary>
                <div className="mt-4 space-y-3">
                  {summaryPoints.map((item) => (
                    <div
                      key={item}
                      className="border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3 text-sm leading-6 text-[var(--aethel-text-primary)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={`border-t p-5 ${metricToneClass(metric.tone)}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">{metric.value}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{metric.detail}</p>
              </div>
            ))}
          </section>

          {sections.map((section) => (
            <section key={section.title} className="space-y-5">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                  {section.eyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">{section.title}</h2>
                <p className="mt-3 text-base leading-7 text-[var(--aethel-text-secondary)]">{section.description}</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {section.cards.map((card) => (
                  <article key={card.title} className={`border-t p-6 ${tonePanelClass(card.tone)}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {card.eyebrow ? (
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                            {card.eyebrow}
                          </p>
                        ) : null}
                        <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">{card.title}</h3>
                      </div>
                      <span className={`border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneBadgeClass(card.tone)}`}>
                        {toneLabel(card.tone)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.description}</p>
                    <details className="mt-4 border-t border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4">
                      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                        Open controls
                      </summary>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-primary)]">
                        {card.bullets.map((bullet) => (
                          <li key={bullet}>- {bullet}</li>
                        ))}
                      </ul>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {resources.length ? (
            <section className="space-y-5">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                  Review links
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">
                  Public review links.
                </h2>
                <p className="mt-3 text-base leading-7 text-[var(--aethel-text-secondary)]">
                  Open the trail your review needs, then keep moving.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {primaryResources.map((resource) => (
                  <Link
                    key={resource.href}
                    href={resource.href}
                    className="group border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] py-6 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                      {resource.eyebrow}
                    </p>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold text-[var(--aethel-text-primary)]">{resource.title}</h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--aethel-info-light)] transition group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{resource.description}</p>
                  </Link>
                ))}
              </div>
              {secondaryResources.length ? (
                <details className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] p-4">
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                    More review links
                  </summary>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {secondaryResources.map((resource) => (
                      <Link
                        key={resource.href}
                        href={resource.href}
                        className="group border-t border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 py-4 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                          {resource.eyebrow}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{resource.title}</h3>
                          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--aethel-info-light)] transition group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
            <div className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] py-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
                Questions
              </div>
              <div className="mt-4 space-y-4">
                {faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="border-t border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4"
                  >
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
                      {faq.question}
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{faq.answer}</p>
                    <span className="sr-only">Open answer</span>
                  </details>
                ))}
              </div>
            </div>

            <div className="border-y border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] py-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
                <Clock3 className="h-3.5 w-3.5" />
                Next best step
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Start with public evidence. Use sales only when rollout, contracts, or questionnaires enter the review.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors ${actionClass(action.tone)}`}
                  >
                    {action.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

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
      return 'Disponivel agora'
    case 'partial':
      return 'Parcial / em rollout'
    default:
      return 'Planejado'
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
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-info)_10%,transparent),transparent_28%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[620px] w-[620px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[520px] w-[520px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_6%,transparent)] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
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

            <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)] p-6">
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                <ShieldAlert className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />
                Leitura honesta
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--aethel-text-primary)]">{summaryTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{summaryBody}</p>
              <div className="mt-4 space-y-3">
                {summaryPoints.map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3 text-sm leading-6 text-[var(--aethel-text-primary)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-[24px] border p-5 ${metricToneClass(metric.tone)}`}
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
                  <article key={card.title} className={`rounded-[28px] border p-6 ${tonePanelClass(card.tone)}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {card.eyebrow ? (
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                            {card.eyebrow}
                          </p>
                        ) : null}
                        <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">{card.title}</h3>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneBadgeClass(card.tone)}`}>
                        {toneLabel(card.tone)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.description}</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-primary)]">
                      {card.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-[20px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 px-4 py-3"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {resources.length ? (
            <section className="space-y-5">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                  Artefatos publicos
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">
                  O melhor kit publico para due diligence agora.
                </h2>
                <p className="mt-3 text-base leading-7 text-[var(--aethel-text-secondary)]">
                  Em vez de um trust portal decorativo, junte estas superficies para entender o que esta live, o
                  que segue assistido e onde a conversa comercial realmente comeca.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {resources.map((resource) => (
                  <Link
                    key={resource.href}
                    href={resource.href}
                    className="group rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-soft))] p-6 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
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
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
            <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
                Perguntas frequentes
              </div>
              <div className="mt-4 space-y-4">
                {faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/10 p-4"
                  >
                    <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
                <Clock3 className="h-3.5 w-3.5" />
                Proximo melhor passo
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Se sua avaliacao envolve procurement, seguranca, rollout ou readiness, use estas paginas como ponto de partida e depois puxe a conversa correta.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${actionClass(action.tone)}`}
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

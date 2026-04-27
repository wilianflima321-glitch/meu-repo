import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Compass, Scale, Sparkles } from 'lucide-react'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

import {
  COMPARISON_CARDS,
  COMPARISON_METRICS,
  DECISION_CARDS,
  EVIDENCE_LINKS,
  HERO_NOTES,
} from './comparison-content'

export const metadata: Metadata = {
  title: 'Compare | Aethel Studio',
  description:
    'Comparativo honesto entre Aethel, Cursor, Windsurf, Replit, Vercel, Linear e Notion para buyers e champions tecnicos.',
}

function SourceLink({
  href,
  label,
  external = false,
}: {
  href: string
  label: string
  external?: boolean
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:text-[var(--aethel-text-primary)]"
      >
        {label}
        <ArrowRight className="h-3 w-3" />
      </a>
    )
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:text-[var(--aethel-text-primary)]"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </Link>
  )
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-info)_10%,transparent),transparent_26%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[620px] w-[620px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[540px] w-[540px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] blur-[170px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.98fr)_minmax(340px,0.72fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
                <Scale className="h-3.5 w-3.5" />
                Comparativo honesto
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl lg:text-6xl">
                Compare o Aethel com as ferramentas que o seu time ja considera serias.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                Esta pagina existe para buyers e champions tecnicos que precisam responder duas perguntas sem marketing
                vazio: <span className="font-medium text-[var(--aethel-text-primary)]">onde o Aethel ja ganha por desenho de produto</span>{' '}
                e <span className="font-medium text-[var(--aethel-text-primary)]">onde os lideres do mercado ainda estao na frente</span>.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard?onboarding=1&source=compare-primary"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
                >
                  Testar o studio
                </Link>
                <Link
                  href="/docs/procurement-starter-pack"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  Abrir pack de procurement
                </Link>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] shadow-[0_24px_90px_rgba(2,6,23,0.42)]">
                <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Studio evidence</p>
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">editor, trust, dashboard e readiness em uma tela</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_78%,transparent)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_78%,transparent)]" />
                  </div>
                </div>
                <Image
                  src="/screenshots/editor.png"
                  alt="Aethel Studio com editor, AI ops e preview integrados"
                  width={1600}
                  height={960}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>

              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-5">
                <div className="flex items-center gap-3">
                  <Compass className="h-4 w-4 text-[var(--aethel-info-light)]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
                    Como ler este benchmark
                  </p>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  {HERO_NOTES.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {COMPARISON_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] p-5 shadow-[0_18px_56px_rgba(2,8,23,0.22)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--aethel-text-primary)]">{metric.value}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              Ferramenta por ferramenta
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)] sm:text-4xl">
              Onde cada referencia de mercado continua forte.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--aethel-text-tertiary)]">
              O objetivo nao e rebaixar Cursor, Windsurf, Replit, Vercel, Linear ou Notion. E ajudar o buyer a
              enxergar qual produto encaixa melhor no gargalo principal da equipe.
            </p>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {COMPARISON_CARDS.map((card) => (
              <article
                key={card.tool}
                className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-soft))] p-6 shadow-[0_20px_70px_rgba(2,8,23,0.24)]"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                    {card.category}
                  </span>
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
                    {card.tool}
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-semibold text-[var(--aethel-text-primary)]">{card.marketFocus}</h3>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
                      O benchmark faz melhor hoje
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.benchmarkStrength}</p>
                  </div>

                  <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success-light)]">
                      Escolha o Aethel quando
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.chooseAethelWhen}</p>
                  </div>

                  <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-warning-light)]">
                      Gap honesto
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.honestGap}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
                    Melhor fit
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                    {card.bestFor.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {card.sources.map((link) => (
                    <SourceLink key={`${card.tool}-${link.href}`} {...link} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-info)_10%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent))] p-6 shadow-[0_24px_90px_rgba(2,8,23,0.24)] sm:p-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
                <Sparkles className="h-3.5 w-3.5" />
                Decisao certa
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">
                Nao existe um vencedor universal. Existe o gargalo certo para resolver agora.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {DECISION_CARDS.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[26px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] p-5"
                >
                  <h3 className="text-xl font-semibold text-[var(--aethel-text-primary)]">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.description}</p>
                  <ul className="mt-4 space-y-2.5 text-sm text-[var(--aethel-text-secondary)]">
                    {card.bullets.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.22)] sm:p-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">
                Se o seu criterio e substancia auditavel, comece pelas superficies publicas abaixo.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                Esta e a melhor forma de validar se o Aethel esta pronto para a conversa que o seu time realmente quer
                ter: produto, trust, rollout, pricing ou procurement.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {EVIDENCE_LINKS.map((link) => (
                <SourceLink key={link.href} {...link} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Compass, ShieldCheck, Sparkles, Users2 } from 'lucide-react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'
import {
  BUYER_READINESS_LINKS,
  COMPOSITE_EVALUATIONS,
  HONEST_NOTES,
  NEXT_STEPS,
  PUBLIC_EVIDENCE,
  TEAM_PROFILES,
  USE_CASES,
} from './customerProofContent'

const PROOF_STACK = [
  { label: 'Fit atual', value: 'Apps + Pesquisa', note: 'O produto comercial mais maduro hoje.' },
  { label: 'Prova publica', value: 'Status + docs', note: 'Readiness verificavel antes de sales call.' },
  { label: 'Sem inflar', value: 'Beta partners', note: 'Nada de logo wall inventada ou customer count falso.' },
]

export const metadata: Metadata = {
  title: 'Clientes | Aethel Studio',
  description:
    'Prova honesta do Aethel: design partners beta, tipos de times e cenarios de uso sem inventar logos ou claims enterprise que ainda nao estao publicos.',
}

function SectionCard({
  eyebrow,
  title,
  description,
  bullets,
}: {
  eyebrow: string
  title: string
  description: string
  bullets: string[]
}) {
  return (
    <article className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent),color-mix(in_srgb,var(--aethel-surface-tertiary)_68%,transparent))] p-6 shadow-[0_20px_70px_rgba(2,8,23,0.22)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">{eyebrow}</p>
      <h2 className="mt-3 text-xl font-semibold leading-8 text-[var(--aethel-text-primary)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">{description}</p>
      <ul className="mt-5 space-y-2.5 text-sm text-[var(--aethel-text-secondary)]">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-success-light)]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--aethel-info)_10%,transparent),transparent_24%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[620px] w-[620px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[540px] w-[540px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] blur-[170px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.78fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
                <Users2 className="h-3.5 w-3.5" />
                Design partners beta
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-[var(--aethel-text-primary)] sm:text-5xl lg:text-6xl">
                Prova de clientes sem logo falsa e sem contagem inflada.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
                Esta pagina existe para responder a pergunta certa: <span className="font-medium text-[var(--aethel-text-primary)]">que tipo de time ja encontra valor no Aethel hoje?</span> A resposta honesta ainda e beta design partners, squads de produto e times avaliando rollout operacional - nao uma muralha de marcas inventadas.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Times', value: 'Founders, squads e studios' },
                  { label: 'Foco', value: 'Apps + Pesquisa' },
                  { label: 'Prova', value: 'Status, pricing e docs publicos' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{item.label}</div>
                    <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard?onboarding=1&source=customers-hero"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
                >
                  Comecar no studio
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  Ver planos e readiness
                </Link>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] p-5 shadow-[0_24px_90px_rgba(2,6,23,0.42)]">
                <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Studio real</p>
                    <p className="text-xs text-[var(--aethel-text-tertiary)]">dashboard, preview e readiness na mesma narrativa</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_78%,transparent)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_78%,transparent)]" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {PROOF_STACK.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                          {item.label}
                        </span>
                        <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-warning-light)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning-light)_8%,transparent)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-warning-light)]">O que podemos afirmar hoje</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  {HONEST_NOTES.map((note) => (
                    <li key={note} className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aethel-warning-light)]" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Quem ja encontra valor</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">Tipos de times que combinam com o estagio atual do produto</h2>
            </div>
            <div className="hidden rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] lg:inline-flex">
              Sem muralha de logos; com cenarios de uso reais
            </div>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {TEAM_PROFILES.map((profile) => (
              <SectionCard key={profile.title} {...profile} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-info)_10%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent))] p-6 shadow-[0_24px_90px_rgba(2,8,23,0.24)] sm:p-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Cenarios de uso</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">Onde a narrativa comercial ja conversa com o produto real</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                O Aethel nao precisa vender tudo para todo mundo. O melhor fit atual acontece quando o time quer reduzir handoff entre pesquisa, implementacao, preview e readiness sem abrir mao de uma trilha operacional honesta.
              </p>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {USE_CASES.map((useCase) => (
                <SectionCard key={useCase.title} {...useCase} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
            <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6">
              <div className="flex items-center gap-3">
                <Compass className="h-5 w-5 text-[var(--aethel-info-light)]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Superficies de evidencia</p>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--aethel-text-primary)]">O que um buyer pode conferir agora</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                Sem inventar customer counts, a forma mais forte de trust hoje e cruzar as superficies publicas que ja existem e mostram produto, limites e readiness com bastante franqueza.
              </p>
            </div>

            <div className="grid gap-4">
              {PUBLIC_EVIDENCE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[24px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent),color-mix(in_srgb,var(--aethel-surface-tertiary)_64%,transparent))] p-5 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{item.label}</h3>
                    <ArrowRight className="h-4 w-4 text-[var(--aethel-text-tertiary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--aethel-info-light)]" />
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--aethel-text-secondary)]">{item.note}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-success)_10%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent))] p-6 shadow-[0_24px_90px_rgba(2,8,23,0.24)] sm:p-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-success-light)]">Snapshots compostos</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">Como a prova publica costuma ser usada por buyers e champions.</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                Nao sao case studies nomeados. Sao trilhas compostas que explicam como times reais costumam validar o Aethel sem precisarmos inventar logos, porcentagens ou resultados fechados.
              </p>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {COMPOSITE_EVALUATIONS.map((evaluation) => (
                <SectionCard key={evaluation.title} {...evaluation} />
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {BUYER_READINESS_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-5 transition hover:border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{item.label}</h3>
                    <ArrowRight className="h-4 w-4 text-[var(--aethel-success-light)] transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--aethel-text-secondary)]">{item.note}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.22)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Proximo passo
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">Se o fit fez sentido, siga pela trilha certa para o seu momento.</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                  Esta pagina existe para qualificar melhor o interesse: produto real, trust progressivo e discurso comercial honesto antes de qualquer promessa enterprise maior do que o produto consegue sustentar hoje.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {NEXT_STEPS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] p-5 transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)]">{item.label}</h3>
                    <ArrowRight className="h-4 w-4 text-[var(--aethel-primary-light)]" />
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--aethel-text-secondary)]">{item.note}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

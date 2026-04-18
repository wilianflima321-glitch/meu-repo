'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PLANS } from '@/lib/plans'
import PublicBillingReadiness from '@/components/billing/PublicBillingReadiness'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import Codicon from '@/components/ide/Codicon'

function formatStorage(bytes: number) {
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
}

function formatLimit(value: number) {
  return value < 0 ? 'Ilimitado' : String(value)
}

const FAQ_ITEMS = [
  {
    q: 'Posso comecar sem cartao de credito-',
    a: 'Sim. O produto pode ser explorado a partir do fluxo gratuito e do onboarding do studio antes de qualquer upgrade.',
  },
  {
    q: 'Qual a diferenca entre Aethel e outros IDEs AI-',
    a: 'Aethel combina studio home, workbench, preview, billing e readiness na mesma experiencia. O objetivo nao e parecer um wrapper de prompt, mas um produto operacional.',
  },
  {
    q: 'Os precos incluem tokens de IA-',
    a: 'Sim. Cada plano inclui quotas, mas voce tambem pode conectar providers proprios para ampliar flexibilidade de custo.',
  },
  {
    q: 'Games e Films estao incluidos-',
    a: 'As superficies existem, mas o foco comercial do produto hoje continua em Apps + Pesquisa. Games e Films seguem em maturidade experimental.',
  },
  {
    q: 'O billing ja esta funcionando ponta a ponta-',
    a: 'As superficies de billing ja existem, mas o checkout publico depende das credenciais reais do Stripe. Mantemos essa transparencia na propria pagina.',
  },
  {
    q: 'Como funciona o cancelamento-',
    a: 'Voce pode cancelar a qualquer momento. O acesso permanece ativo ate o fim do ciclo contratado.',
  },
  {
    q: 'Impostos estao incluidos-',
    a: 'Os valores exibidos nao incluem impostos locais. A cobranca segue a politica fiscal aplicavel a sua regiao.',
  },
]

const COMPARISON_ROWS = [
  { label: 'Projetos', getValue: (plan: (typeof PLANS)[number]) => formatLimit(plan.limits.projects) },
  { label: 'Tokens por mes', getValue: (plan: (typeof PLANS)[number]) => formatLimit(plan.limits.tokensPerMonth) },
  { label: 'Storage', getValue: (plan: (typeof PLANS)[number]) => formatStorage(plan.limits.storage) },
  { label: 'Colaboradores', getValue: (plan: (typeof PLANS)[number]) => formatLimit(plan.limits.collaborators) },
  { label: 'Historico', getValue: (plan: (typeof PLANS)[number]) => `${formatLimit(plan.limits.historyDays)} dias` },
  { label: 'Concorrencia', getValue: (plan: (typeof PLANS)[number]) => formatLimit(plan.limits.concurrent) },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const isAnnual = billingCycle === 'year'

  const plans = useMemo(() => {
    return PLANS.map((plan) => {
      const annualFallback = Number((plan.price * 12 * 0.8).toFixed(2))
      const annualBRLFallback = Math.round((plan.priceBRL || 0) * 12 * 0.8)
      return {
        ...plan,
        displayPrice: isAnnual ? (plan.priceAnnual ?? annualFallback) : plan.price,
        displayPriceBRL: isAnnual ? (plan.priceAnnualBRL ?? annualBRLFallback) : plan.priceBRL,
      }
    })
  }, [isAnnual])

  const enterprisePlan = plans.find((plan) => plan.id === 'enterprise')
  const corePlans = plans.filter((plan) => plan.id !== 'enterprise')

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-4 py-1.5 text-[13px] font-medium text-[var(--aethel-primary-light)]">
                Planos transparentes
              </div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Planos claros para builders e equipes.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--aethel-text-secondary)]">
                Apps + Pesquisa sao o foco atual. Os planos escalam por volume, contexto e colaboracao.
              </p>

              <div className="mt-8 flex flex-wrap justify-start gap-3">
                <Link
                  href="/dashboard-onboarding=1&source=pricing-hero"
                  className="inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:brightness-110 rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Comecar no Studio
                </Link>
                <Link
                  href="/contact-sales"
                  className="inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded-xl px-5 py-3 text-sm font-medium"
                >
                  Falar com vendas
                </Link>
              </div>

              <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('month')}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
 billingCycle === 'month' ? 'bg-[var(--aethel-text-primary)] text-[var(--aethel-surface-primary)]' : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
 }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('year')}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
 billingCycle === 'year' ? 'bg-[var(--aethel-text-primary)] text-[var(--aethel-surface-primary)]' : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
 }`}
                >
                  Anual
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--aethel-success)]">
                    -20%
                  </span>
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
                Valores sem impostos. Cobranca mensal ou anual com cancelamento a qualquer momento.
              </p>
            </div>

            <aside className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Produto real</p>
                  <p className="mt-1 text-sm text-[var(--aethel-text-primary)]">Dashboard e workbench na mesma narrativa</p>
                </div>
                <div className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-success-light)]">
                  Apps + Pesquisa
                </div>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--aethel-surface-primary)]">
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Dashboard do Aethel Studio"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover object-top"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--aethel-surface-primary)_75%,transparent)] via-transparent to-transparent" />
              </div>

              <div className="space-y-4 px-5 py-5">
                <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  O plano certo depende do ritmo do time e do quanto do fluxo principal voce quer usar desde o primeiro dia.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Studio home</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Workbench</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Readiness visivel</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {corePlans.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col rounded-[24px] border p-5 transition-all ${
 plan.popular
 ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-gradient-to-b from-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)] to-transparent shadow-xl'
 : 'border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)]'
 }`}
              >
                {plan.popular ? (
                  <div className="absolute -top-3.5 left-6 rounded-full bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-4 py-1 text-xs font-bold text-[var(--aethel-text-primary)] shadow-lg">
                    Melhor equilibrio
                  </div>
                ) : null}

                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">{plan.id}</p>
                  <h2 className="mt-1 text-xl font-bold text-[var(--aethel-text-primary)]">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{plan.description}</p>
                </div>

                <div className="mb-5 border-b border-[var(--aethel-border-subtle)] pb-5">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-[var(--aethel-text-primary)]">R${plan.displayPriceBRL}</span>
                    <span className="pb-1 text-xs text-[var(--aethel-text-tertiary)]">/{isAnnual ? 'ano' : 'mes'}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">US${plan.displayPrice}/{isAnnual ? 'ano' : 'mes'}</p>
                  <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">
                    Cobranca {isAnnual ? 'anual' : 'mensal'}  impostos nao inclusos
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Projetos', value: formatLimit(plan.limits.projects) },
                    { label: 'Armazenamento', value: formatStorage(plan.limits.storage) },
                    { label: 'Tokens/dia', value: formatLimit(plan.limits.tokensPerDay) },
                    { label: 'Colaboracao', value: formatLimit(plan.limits.collaborators) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <ul className="mb-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[var(--aethel-text-secondary)]">
                      <span className="mt-0.5 shrink-0 text-[var(--aethel-success)]">
                        <Codicon name='check' />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/dashboard-tab=billing&plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`}
                  className={`inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] w-full rounded-xl px-4 py-3 text-sm font-semibold ${
 plan.popular ? 'aethel-button-primary shadow-lg' : 'aethel-button-secondary'
 }`}
                >
                  Selecionar {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {enterprisePlan ? (
          <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
            <article className="overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[linear-gradient(135deg,var(--aethel-panel),var(--aethel-panel-soft))] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
              <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">Enterprise</p>
                  <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)]">Contrato para operacao maior, governanca e integracao customizada</h2>
                  <p className="mt-4 text-sm leading-7 text-[var(--aethel-text-secondary)]">
                    Quando a decisao envolve equipe, compliance, SSO, quota e trilha operacional, a conversa deixa de ser self-serve e vira arquitetura de rollout.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">SSO + SAML</span>
                    <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Trilhas de auditoria</span>
                    <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Suporte 24/7</span>
                    <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Rollout guiado</span>
                  </div>
                </div>

                <div className="grid gap-4 rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_68%,transparent)] p-5 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Preco base</p>
                    <p className="mt-2 text-3xl font-bold text-[var(--aethel-text-primary)]">R${enterprisePlan.displayPriceBRL}</p>
                    <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">US${enterprisePlan.displayPrice}/{isAnnual ? 'ano' : 'mes'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Capacidade</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{formatLimit(enterprisePlan.limits.projects)} projetos, {formatStorage(enterprisePlan.limits.storage)} de armazenamento, requests enterprise e rollout guiado.</p>
                  </div>
                  <div className="md:col-span-2">
                    <ul className="space-y-2 text-sm text-[var(--aethel-text-secondary)]">
                      {enterprisePlan.features.slice(0, 6).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-[var(--aethel-success-light)]">
                            <Codicon name='check' />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/contact-sales" className="inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] hover:brightness-110 mt-2 w-full justify-center rounded-xl px-4 py-3 text-sm font-semibold md:col-span-2">
                    Falar com vendas
                  </Link>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
            <div className="border-b border-[var(--aethel-border-primary)] px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                Comparativo rapido
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--aethel-text-primary)]">
                O que muda entre os planos mais usados
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--aethel-border-primary)] text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                    <th className="px-6 py-4 font-semibold">Capacidade</th>
                    {corePlans.map((plan) => (
                      <th key={plan.id} className="px-6 py-4 font-semibold text-[var(--aethel-text-primary)]">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-[var(--aethel-border-subtle)]">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--aethel-text-primary)]">{row.label}</td>
                      {corePlans.map((plan) => (
                        <td key={`${row.label}-${plan.id}`} className="px-6 py-4 text-sm text-[var(--aethel-text-secondary)]">
                          {row.getValue(plan)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
          <div className="mb-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Transparencia operacional</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--aethel-text-primary)]">Billing readiness real</h2>
          </div>
          <PublicBillingReadiness />
          <p className="mt-3 text-center text-xs text-[var(--aethel-text-tertiary)]">
            Pagamentos sao processados pela Stripe quando as credenciais estiverem configuradas.
          </p>
        </div>

        <section className="mx-auto mt-24 w-full max-w-3xl px-4 pb-24 sm:px-6">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info)]">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)]">Perguntas frequentes</h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={item.q}
                className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between p-5 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{item.q}</span>
                  <span className={`ml-4 flex-shrink-0 text-[var(--aethel-text-tertiary)] transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}>
                    <Codicon name='chevron-down' />
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48 pb-5' : 'max-h-0'}`}
                >
                  <p className="px-5 text-sm leading-relaxed text-[var(--aethel-text-secondary)]">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}


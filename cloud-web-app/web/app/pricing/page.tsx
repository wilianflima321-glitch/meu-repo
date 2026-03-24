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
    q: 'Posso comecar sem cartao de credito?',
    a: 'Sim. O produto pode ser explorado a partir do fluxo gratuito e do onboarding do studio antes de qualquer upgrade.',
  },
  {
    q: 'Qual a diferenca entre Aethel e outros IDEs AI?',
    a: 'Aethel combina studio home, workbench, preview, billing e readiness na mesma experiencia. O objetivo nao e parecer um wrapper de prompt, mas um produto operacional.',
  },
  {
    q: 'Os precos incluem tokens de IA?',
    a: 'Sim. Cada plano inclui quotas, mas voce tambem pode conectar providers proprios para ampliar flexibilidade de custo.',
  },
  {
    q: 'Games e Films estao incluidos?',
    a: 'As superficies existem, mas o foco comercial do produto hoje continua em Apps + Research. Games e Films seguem em maturidade experimental.',
  },
  {
    q: 'O billing ja esta funcionando ponta a ponta?',
    a: 'As superficies de billing ja existem, mas o checkout publico depende das credenciais reais do Stripe. Mantemos essa transparencia na propria pagina.',
  },
]

const DECISION_PATH = [
  {
    title: 'Entrar rapido',
    desc: 'Starter e Basic para validar contexto, onboarding, AI chat e rotina inicial sem travar a avaliacao.',
  },
  {
    title: 'Operar de verdade',
    desc: 'Pro para quem precisa throughput, modelos melhores e uma experiencia mais proxima do uso continuo.',
  },
  {
    title: 'Escalar com time',
    desc: 'Studio e Enterprise para seats, governanca, rollout e integracao com requisitos mais altos.',
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
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
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
                Pricing alinhado ao uso real do studio
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--aethel-text-secondary)]">
                O foco comercial do produto hoje e Apps + Research. Os planos foram organizados para refletir volume, contexto e colaboracao sem esconder limites em letras pequenas.
              </p>

              <div className="mt-8 flex flex-wrap justify-start gap-3">
                <Link
                  href="/dashboard?onboarding=1&source=pricing-hero"
                  className="aethel-button aethel-button-primary rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Comecar no Studio
                </Link>
                <Link
                  href="/contact-sales"
                  className="aethel-button aethel-button-secondary rounded-xl px-5 py-3 text-sm font-medium"
                >
                  Falar com vendas
                </Link>
              </div>

              <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('month')}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'month' ? 'bg-white text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('year')}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'year' ? 'bg-white text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
                  }`}
                >
                  Anual
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--aethel-success)]">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            <aside className="overflow-hidden rounded-[28px] border border-white/10 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Produto real</p>
                  <p className="mt-1 text-sm text-[var(--aethel-text-primary)]">Dashboard e workbench na mesma narrativa</p>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                  Apps + Research
                </div>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Dashboard do Aethel Studio"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
              </div>

              <div className="space-y-4 px-5 py-5">
                <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  A proposta comercial nao termina em uma grade de preco. O studio precisa entregar onboarding, projeto, contexto, billing e proximas acoes na mesma shell.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Studio home</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Workbench</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">Readiness visivel</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {DECISION_PATH.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/10 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  Caminho de decisao
                </p>
                <h2 className="mt-3 text-lg font-semibold text-[var(--aethel-text-primary)]">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {corePlans.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col rounded-[24px] border p-5 transition-all ${
                  plan.popular
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-gradient-to-b from-blue-500/[0.10] to-transparent shadow-xl shadow-blue-500/10'
                    : 'border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)]'
                }`}
              >
                {plan.popular ? (
                  <div className="absolute -top-3.5 left-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-1 text-xs font-bold text-[var(--aethel-text-primary)] shadow-lg shadow-blue-500/30">
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
                </div>

                <div className="mb-5 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Projetos', value: formatLimit(plan.limits.projects) },
                    { label: 'Storage', value: formatStorage(plan.limits.storage) },
                    { label: 'Tokens/dia', value: formatLimit(plan.limits.tokensPerDay) },
                    { label: 'Collab', value: formatLimit(plan.limits.collaborators) },
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
                  href={`/dashboard?tab=billing&plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`}
                  className={`aethel-button w-full rounded-xl px-4 py-3 text-sm font-semibold ${
                    plan.popular ? 'aethel-button-primary shadow-lg shadow-blue-500/20' : 'aethel-button-secondary'
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
            <article className="overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[linear-gradient(135deg,rgba(30,41,59,0.9),rgba(15,23,42,0.72))] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
              <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">Enterprise</p>
                  <h2 className="mt-3 text-3xl font-bold text-white">Contrato para operacao maior, governanca e integracao customizada</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    Quando a decisao envolve equipe, compliance, SSO, quota e trilha operacional, a conversa deixa de ser self-serve e vira arquitetura de rollout.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white">SSO + SAML</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white">Audit logs</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white">Support 24/7</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white">Custom rollout</span>
                  </div>
                </div>

                <div className="grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-5 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Preco base</p>
                    <p className="mt-2 text-3xl font-bold text-white">R${enterprisePlan.displayPriceBRL}</p>
                    <p className="mt-1 text-xs text-slate-400">US${enterprisePlan.displayPrice}/{isAnnual ? 'ano' : 'mes'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Capacidade</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{formatLimit(enterprisePlan.limits.projects)} projetos, {formatStorage(enterprisePlan.limits.storage)} storage, requests enterprise e rollout guiado.</p>
                  </div>
                  <div className="md:col-span-2">
                    <ul className="space-y-2 text-sm text-slate-300">
                      {enterprisePlan.features.slice(0, 6).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-emerald-300">
                            <Codicon name='check' />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/contact-sales" className="aethel-button aethel-button-primary mt-2 w-full justify-center rounded-xl px-4 py-3 text-sm font-semibold md:col-span-2">
                    Falar com vendas
                  </Link>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-[28px] border border-white/10 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] p-6 lg:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Como vender o produto certo</p>
              <h2 className="mt-3 text-2xl font-bold text-[var(--aethel-text-primary)]">A narrativa comercial precisa acompanhar a experiencia do produto</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Starter e Basic</p>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">Boa entrada para avaliar dashboard, onboarding, workbench e contexto sem cair em uma experiencia inchada.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Pro e Studio</p>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">Onde o produto precisa parecer realmente premium: colaboracao, throughput, historico e operacao sustentada.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.86))] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
            <div className="border-b border-white/10 px-6 py-5">
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
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
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
                    <tr key={row.label} className="border-b border-white/5">
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
            <h2 className="mt-2 text-2xl font-bold text-[var(--aethel-text-primary)]">Billing readiness real, sem esconder dependencia externa</h2>
          </div>
          <PublicBillingReadiness />
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

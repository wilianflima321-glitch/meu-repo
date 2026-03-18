'use client'

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
    a: 'Sim. O plano Starter pode ser explorado sem pagamento inicial. O modo demo tambem permite testar o produto com respostas pre-geradas.',
  },
  {
    q: 'Qual a diferenca entre Aethel e outros IDEs AI?',
    a: 'Aethel tem multi-agent orquestrado com Architect/Engineer/Critic, politica anti-fake-success e rollback deterministico. Nao e um wrapper de LLM.',
  },
  {
    q: 'Os precos incluem tokens de IA?',
    a: 'Sim. Cada plano inclui uma quota de tokens. Voce pode usar seu proprio provider (OpenRouter, OpenAI, Anthropic) para ter mais controle de custos.',
  },
  {
    q: 'Posso fazer upgrade ou downgrade a qualquer momento?',
    a: 'Sim. As mudancas de plano sao proporcionais ao periodo restante da assinatura atual.',
  },
  {
    q: 'O billing ja esta funcionando?',
    a: 'As superficies de billing existem no produto, mas o runtime de checkout depende da configuracao real do gateway Stripe. Estamos em fase de ativacao.',
  },
  {
    q: 'Games e Films estao inclusos?',
    a: 'Sim, em todos os planos. Porem, Games e Films estao em nivel experimental (L2). O foco do produto hoje e Apps + Research.',
  },
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

  return (
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      {/* Ambient bg */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        {/* ── Hero ── */}
        <section className="mx-auto max-w-4xl px-4 pb-6 pt-16 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-4 py-1.5 text-[13px] font-medium text-[var(--aethel-primary-light)]">
            Planos transparentes
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Planos alinhados com uso real
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--aethel-text-secondary)]">
            Cada plano inclui tokens de IA, projetos, storage e acesso aos sistemas AAA.
            Sem surpresas, sem limites escondidos.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard?onboarding=1&source=pricing-hero"
              className="aethel-button aethel-button-primary rounded-xl px-5 py-3 text-sm font-semibold"
            >
              Comecar gratis
            </Link>
            <Link
              href="/contact-sales"
              className="aethel-button aethel-button-secondary rounded-xl px-5 py-3 text-sm font-medium"
            >
              Falar com vendas
            </Link>
          </div>

          {/* Billing cycle toggle */}
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
        </section>

        {/* ── Plans grid ── */}
        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-5">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                  plan.popular
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-gradient-to-b from-blue-500/[0.1] to-transparent shadow-xl shadow-blue-500/10'
                    : 'border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-1 text-xs font-bold text-[var(--aethel-text-primary)] shadow-lg shadow-blue-500/30">
                    Recomendado
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">{plan.id}</p>
                  <h2 className="mt-1 text-xl font-bold text-[var(--aethel-text-primary)]">{plan.name}</h2>
                  <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-[var(--aethel-text-primary)]">R${plan.displayPriceBRL}</span>
                    <span className="text-xs text-[var(--aethel-text-tertiary)]">/{isAnnual ? 'ano' : 'mes'}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">
                    US${plan.displayPrice}/{isAnnual ? 'ano' : 'mes'}
                  </p>
                </div>

                {/* Limits summary */}
                <div className="mb-5 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Projetos', value: formatLimit(plan.limits.projects) },
                    { label: 'Storage', value: formatStorage(plan.limits.storage) },
                    { label: 'Tokens/dia', value: formatLimit(plan.limits.tokensPerDay) },
                    { label: 'Collab', value: formatLimit(plan.limits.collaborators) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">{item.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="mb-6 flex-1 space-y-2.5 border-t border-[var(--aethel-border-subtle)] pt-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-[var(--aethel-text-secondary)]">
                      <span className="mt-0.5 text-[var(--aethel-success)] flex-shrink-0">
                        <Codicon name="check" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={
                    plan.id === 'enterprise'
                      ? '/contact-sales'
                      : `/dashboard?tab=billing&plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`
                  }
                  className={`aethel-button w-full rounded-xl px-4 py-3 text-sm font-semibold ${
                    plan.popular
                      ? 'aethel-button-primary shadow-lg shadow-blue-500/20'
                      : 'aethel-button-secondary'
                  }`}
                >
                  {plan.id === 'enterprise' ? 'Falar com vendas' : 'Selecionar'}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ── Billing readiness (anti-fake-success) ── */}
        <div className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
          <PublicBillingReadiness />
        </div>

        {/* ── FAQ ── */}
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
                    <Codicon name="chevron-down" />
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? 'max-h-40 pb-5' : 'max-h-0'
                  }`}
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

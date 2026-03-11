'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { PLANS } from '@/lib/plans'
import PublicBillingReadiness from '@/components/billing/PublicBillingReadiness'

function formatStorage(bytes: number) {
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
}

function formatLimit(value: number) {
  return value < 0 ? 'Ilimitado' : String(value)
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
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
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-600/10 blur-[150px]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/branding/aethel-icon-source.png" alt="Aethel" width={36} height={36} className="rounded-xl" />
            <span className="text-xl font-bold">Aethel</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
              Entrar
            </Link>
            <Link href="/status" className="text-slate-400 transition-colors hover:text-white">
              Status
            </Link>
            <Link
              href="/dashboard?onboarding=1&source=pricing"
              className="flex h-9 items-center rounded-lg bg-white px-4 font-medium text-black transition-colors hover:bg-slate-200"
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-6 pt-32 pb-20">
        <section className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300">
            Pricing alinhado com os planos canonicos do sistema
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Planos coerentes com uso real de IA, projetos e operacao.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Aethel ja expoe billing no produto, mas o runtime de checkout ainda depende da configuracao real do gateway.
            Esta pagina agora reflete os planos canonicos do sistema, sem tiers paralelos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard?onboarding=1&source=pricing-hero"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-slate-200"
            >
              Abrir dashboard
            </Link>
            <Link
              href="/status"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Ver status publico
            </Link>
            <Link
              href="/contact-sales"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Falar com vendas
            </Link>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
            <button
              type="button"
              onClick={() => setBillingCycle('month')}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                billingCycle === 'month' ? 'bg-white text-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('year')}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                billingCycle === 'year' ? 'bg-white text-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Anual (-20%)
            </button>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-5">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`relative rounded-2xl border p-6 ${
                  plan.popular
                    ? 'border-sky-500/50 bg-gradient-to-b from-blue-500/15 via-sky-500/10 to-transparent shadow-2xl shadow-blue-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-1.5 text-sm font-semibold text-white">
                    Recomendado
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{plan.id}</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">{plan.name}</h2>
                  <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">R${plan.displayPriceBRL}</span>
                    <span className="text-sm text-slate-400">/{isAnnual ? 'ano' : 'mes'}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    US${plan.displayPrice}/{isAnnual ? 'year' : plan.interval}
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Projetos</p>
                    <p className="mt-1 font-semibold text-white">{formatLimit(plan.limits.projects)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Storage</p>
                    <p className="mt-1 font-semibold text-white">{formatStorage(plan.limits.storage)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Tokens/dia</p>
                    <p className="mt-1 font-semibold text-white">{formatLimit(plan.limits.tokensPerDay)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Colaboradores</p>
                    <p className="mt-1 font-semibold text-white">{formatLimit(plan.limits.collaborators)}</p>
                  </div>
                </div>

                <ul className="space-y-3 border-t border-white/10 pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link
                    href={
                      plan.id === 'enterprise'
                        ? '/contact-sales'
                        : `/dashboard?tab=billing&plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`
                    }
                    className={`flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white hover:from-blue-500 hover:to-sky-500'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Falar com vendas' : 'Selecionar plano'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <PublicBillingReadiness />
      </main>
    </div>
  )
}

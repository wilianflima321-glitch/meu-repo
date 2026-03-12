"use client"

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { API_BASE } from '@/lib/api'
import { UsageDashboard } from '@/components/billing/UsageDashboard'
import StudioGlobalNav from '@/components/studio/StudioGlobalNav'
import { useToast } from '@/components/ui/Toast'

type Currency = 'USD' | 'BRL'

type Plan = {
  id: string
  name: string
  description?: string
  popular?: boolean
  price?: number
  priceAnnual?: number
  priceBRL?: number
  priceAnnualBRL?: number
  features?: string[]
  limits?: {
    tokensPerMonth?: number
  }
}

type PlansResponse = {
  plans?: Plan[]
}

const fetcher = async (url: string): Promise<PlansResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load plans (${res.status})`)
  }
  return res.json()
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

function formatPrice(value: number, currency: Currency): string {
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function BillingPage() {
  const toast = useToast()
  const [currency, setCurrency] = useState<Currency>('BRL')
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showUsage, setShowUsage] = useState(true)

  const { data, isLoading, error } = useSWR<PlansResponse>(`${API_BASE}/billing/plans`, fetcher)
  const plans = useMemo(() => data?.plans || [], [data])

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.warning('Faca login para continuar com a assinatura.')
        window.location.href = '/login'
        return
      }

      window.location.href = `/billing/checkout?plan=${encodeURIComponent(planId)}&interval=${billingCycle}`
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado no checkout'
      console.error('[billing/checkout]', message)
      toast.error('Nao foi possivel concluir a assinatura.', message)
    } finally {
      setSelectedPlan(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <StudioGlobalNav title="Billing" subtitle="Planos, consumo e faturamento do workspace." />
        <div className="aethel-flex aethel-items-center aethel-justify-center px-6 py-12">
          <div className="aethel-card aethel-p-6">
            <p className="text-sm text-slate-400">Carregando planos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <StudioGlobalNav title="Billing" subtitle="Planos, consumo e faturamento do workspace." />
        <div className="aethel-flex aethel-items-center aethel-justify-center px-6 py-12">
          <div className="aethel-card aethel-p-6 max-w-md">
            <h1 className="text-xl font-bold mb-2">Falha ao carregar billing</h1>
            <p className="text-sm text-slate-400">
              Nao foi possivel recuperar os planos neste momento. Tente novamente em instantes.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <StudioGlobalNav
        title="Billing"
        subtitle="Controle de uso, previsibilidade de custos e upgrade instantaneo."
      />

      <main className="mx-auto max-w-7xl aethel-p-6">
        <div className="aethel-flex aethel-items-center aethel-justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Planos e Consumo</h2>
            <p className="text-slate-400 text-sm">
              Ajuste plano mensal/anual e acompanhe limites em tempo real.
            </p>
          </div>
          <div className="aethel-flex aethel-gap-2">
            <button
              onClick={() => setCurrency('BRL')}
              className={`px-4 py-2 aethel-rounded ${currency === 'BRL' ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
            >
              BRL
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 aethel-rounded ${currency === 'USD' ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
            >
              USD
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="inline-flex aethel-items-center aethel-gap-2 rounded-full border border-slate-800 bg-slate-900/50 aethel-p-1">
            <button
              onClick={() => setBillingCycle('month')}
              className={`rounded-full px-4 py-1.5 text-sm ${billingCycle === 'month' ? 'bg-slate-200 text-slate-900' : 'text-slate-300'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('year')}
              className={`rounded-full px-4 py-1.5 text-sm ${billingCycle === 'year' ? 'bg-slate-200 text-slate-900' : 'text-slate-300'}`}
            >
              Anual (-20%)
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="aethel-flex aethel-items-center aethel-justify-between mb-3">
            <h2 className="text-xl font-bold">Uso atual</h2>
            <button
              onClick={() => setShowUsage((prev) => !prev)}
              className="text-sm text-slate-400 hover:text-slate-100"
            >
              {showUsage ? 'Ocultar detalhes' : 'Mostrar detalhes'}
            </button>
          </div>
          {showUsage && <UsageDashboard />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 aethel-gap-4">
          {plans.map((plan) => {
            const monthlyPrice = currency === 'BRL' ? plan.priceBRL || 0 : plan.price || 0
            const annualPrice = currency === 'BRL'
              ? (plan.priceAnnualBRL ?? Math.round((plan.priceBRL || 0) * 12 * 0.8))
              : (plan.priceAnnual ?? Number(((plan.price || 0) * 12 * 0.8).toFixed(2)))
            const displayPrice = billingCycle === 'year' ? annualPrice : monthlyPrice
            const tokens = plan.limits?.tokensPerMonth || 0
            const isBusy = selectedPlan === plan.id

            return (
              <div
                key={plan.id}
                className={`aethel-card aethel-p-6 aethel-flex aethel-flex-col ${plan.popular ? 'border border-slate-500' : ''}`}
              >
                <div className="aethel-flex aethel-items-center aethel-justify-between mb-2">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.popular ? <span className="badge badge-primary">Recomendado</span> : null}
                </div>
                <p className="text-sm text-slate-400 mb-4">{plan.description || 'Plano sem descricao detalhada.'}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatPrice(displayPrice, currency)}</span>
                  <span className="text-slate-400">/{billingCycle === 'year' ? 'ano' : 'mes'}</span>
                </div>

                <div className="mb-4 aethel-p-3 bg-slate-900 aethel-rounded border border-slate-800">
                  <span className="text-2xl font-bold text-slate-100">{formatTokens(tokens)}</span>
                  <span className="text-slate-400 text-sm"> tokens/mes</span>
                </div>

                <ul className="flex-1 space-y-2 mb-4">
                  {(plan.features || []).slice(0, 6).map((feature) => (
                    <li key={feature} className="aethel-flex items-start aethel-gap-2 text-sm">
                      <span className="text-green-400">+</span>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isBusy}
                  className={`aethel-button aethel-button-primary w-full ${isBusy ? 'opacity-50' : ''}`}
                >
                  {isBusy ? 'Processando...' : 'Assinar plano'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            Os limites de IA, execucao e deploy variam por plano. Upgrade e downgrade sao aplicados sem migracao manual.
          </p>
          <p className="mt-2 text-slate-500 text-xs">
            Checkout seguro via Stripe | Cancelamento a qualquer momento
          </p>
        </div>
      </main>
    </div>
  )
}

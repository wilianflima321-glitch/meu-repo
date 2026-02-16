"use client"

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { API_BASE } from '@/lib/api'
import { UsageDashboard } from '@/components/billing/UsageDashboard'
import { useToast } from '@/components/ui/Toast'

type Currency = 'USD' | 'BRL'

type Plan = {
  id: string
  name: string
  description?: string
  popular?: boolean
  price?: number
  priceBRL?: number
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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showUsage, setShowUsage] = useState(true)

  const { data, isLoading, error } = useSWR<PlansResponse>(`${API_BASE}/billing/plans`, fetcher)
  const plans = useMemo(() => data?.plans || [], [data])

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId)
    try {
      const token = localStorage.getItem('aethel-token')
      if (!token) {
        toast.warning('Faça login para continuar com a assinatura.')
        window.location.href = '/login'
        return
      }

      window.location.href = `/billing/checkout?plan=${encodeURIComponent(planId)}`
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
      <div className="aethel-flex aethel-items-center aethel-justify-center aethel-min-h-screen">
        <div className="aethel-card aethel-p-6">
          <p className="aethel-text-sm aethel-text-slate-400">Carregando planos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="aethel-flex aethel-items-center aethel-justify-center aethel-min-h-screen">
        <div className="aethel-card aethel-p-6 aethel-max-w-md">
          <h1 className="aethel-text-xl aethel-font-bold aethel-mb-2">Falha ao carregar billing</h1>
          <p className="aethel-text-sm aethel-text-slate-400">
            Nao foi possivel recuperar os planos neste momento. Tente novamente em instantes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="aethel-p-6 aethel-max-w-7xl aethel-mx-auto">
      <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
        <div>
          <h1 className="aethel-text-3xl aethel-font-bold">Planos e Consumo</h1>
          <p className="aethel-text-slate-400 aethel-text-sm">
            Controle de uso, previsibilidade de custos e upgrade instantaneo.
          </p>
        </div>
        <div className="aethel-flex aethel-gap-2">
          <button
            onClick={() => setCurrency('BRL')}
            className={`aethel-px-4 aethel-py-2 aethel-rounded ${currency === 'BRL' ? 'aethel-bg-slate-200 aethel-text-slate-900' : 'aethel-bg-slate-800 aethel-text-slate-300'}`}
          >
            BRL
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`aethel-px-4 aethel-py-2 aethel-rounded ${currency === 'USD' ? 'aethel-bg-slate-200 aethel-text-slate-900' : 'aethel-bg-slate-800 aethel-text-slate-300'}`}
          >
            USD
          </button>
        </div>
      </div>

      <div className="aethel-mb-8">
        <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-3">
          <h2 className="aethel-text-xl aethel-font-bold">Uso atual</h2>
          <button
            onClick={() => setShowUsage((prev) => !prev)}
            className="aethel-text-sm aethel-text-slate-400 hover:aethel-text-slate-100"
          >
            {showUsage ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          </button>
        </div>
        {showUsage && <UsageDashboard />}
      </div>

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 lg:aethel-grid-cols-5 aethel-gap-4">
        {plans.map((plan) => {
          const monthlyPrice = currency === 'BRL' ? plan.priceBRL || 0 : plan.price || 0
          const tokens = plan.limits?.tokensPerMonth || 0
          const isBusy = selectedPlan === plan.id
          return (
            <div
              key={plan.id}
              className={`aethel-card aethel-p-6 aethel-flex aethel-flex-col ${plan.popular ? 'aethel-border aethel-border-slate-500' : ''}`}
            >
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                <h3 className="aethel-text-xl aethel-font-bold">{plan.name}</h3>
                {plan.popular ? <span className="aethel-badge aethel-badge-primary">Recomendado</span> : null}
              </div>
              <p className="aethel-text-sm aethel-text-slate-400 aethel-mb-4">{plan.description || 'Plano sem descricao detalhada.'}</p>

              <div className="aethel-mb-4">
                <span className="aethel-text-3xl aethel-font-bold">{formatPrice(monthlyPrice, currency)}</span>
                <span className="aethel-text-slate-400">/mes</span>
              </div>

              <div className="aethel-mb-4 aethel-p-3 aethel-bg-slate-900 aethel-rounded aethel-border aethel-border-slate-800">
                <span className="aethel-text-2xl aethel-font-bold aethel-text-slate-100">{formatTokens(tokens)}</span>
                <span className="aethel-text-slate-400 aethel-text-sm"> tokens/mes</span>
              </div>

              <ul className="aethel-flex-1 aethel-space-y-2 aethel-mb-4">
                {(plan.features || []).slice(0, 6).map((feature) => (
                  <li key={feature} className="aethel-flex aethel-items-start aethel-gap-2 aethel-text-sm">
                    <span className="aethel-text-green-400">+</span>
                    <span className="aethel-text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isBusy}
                className={`aethel-button aethel-button-primary aethel-w-full ${isBusy ? 'aethel-opacity-50' : ''}`}
              >
                {isBusy ? 'Processando...' : 'Assinar plano'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="aethel-mt-8 aethel-text-center">
        <p className="aethel-text-slate-400 aethel-text-sm">
          Os limites de IA, execucao e deploy variam por plano. Upgrade e downgrade sao aplicados sem migracao manual.
        </p>
        <p className="aethel-mt-2 aethel-text-slate-500 aethel-text-xs">
          Checkout seguro via Stripe | Cancelamento a qualquer momento
        </p>
      </div>
    </div>
  )
}

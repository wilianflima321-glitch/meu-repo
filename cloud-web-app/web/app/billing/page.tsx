"use client"

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { API_BASE, type BillingReadiness } from '@/lib/api'
import { UsageDashboard } from '@/components/billing/UsageDashboard'
import { BillingStatusBanner, SubscriptionStatusWidget } from '@/components/billing/BillingIntegration'
import StudioLayout from '@/components/studio/StudioLayout'
import { Badge } from '@/components/ui/Badge'
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
    projects?: number
    storage?: number
    collaborators?: number
  }
}

type PlansResponse = {
  plans?: Plan[]
}

const fetcher = async <T,>(url: string): Promise<T> => {
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

function formatStorage(bytes?: number): string {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return '-'
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
}

function formatLimit(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  if (value < 0) return 'Ilimitado'
  return value.toLocaleString('pt-BR')
}

export default function BillingPage() {
  const toast = useToast()
  const [currency, setCurrency] = useState<Currency>('BRL')
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showUsage, setShowUsage] = useState(true)

  const { data, isLoading, error } = useSWR<PlansResponse>(`${API_BASE}/billing/plans`, fetcher)
  const { data: readiness } = useSWR<BillingReadiness>(`${API_BASE}/billing/readiness`, fetcher)
  const plans = useMemo(() => data?.plans || [], [data])

  const handleSubscribe = async (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = '/contact-sales?source=billing-page-enterprise'
      return
    }

    setSelectedPlan(planId)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.warning('Faca login para continuar com a assinatura.')
        window.location.href = '/login'
        return
      }

      if (readiness?.checkoutReady === false) {
        toast.warning('Checkout indisponivel neste ambiente.', 'Configure o runtime de billing antes de liberar upgrade self-serve.')
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
    <StudioLayout title="Faturamento" subtitle="Planos, consumo e faturamento do workspace.">
        <div className="aethel-flex aethel-items-center aethel-justify-center px-6 py-12">
          <div className="aethel-card aethel-p-6">
            <p className="text-sm text-[var(--aethel-text-secondary)]">Carregando planos...</p>
          </div>
        </div>
      </StudioLayout>
    )
  }

  if (error) {
    return (
    <StudioLayout title="Faturamento" subtitle="Planos, consumo e faturamento do workspace.">
        <div className="aethel-flex aethel-items-center aethel-justify-center px-6 py-12">
          <div className="aethel-card aethel-p-6 max-w-md">
            <h1 className="text-xl font-bold mb-2">Falha ao carregar billing</h1>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Nao foi possivel recuperar os planos neste momento. Tente novamente em instantes.
            </p>
          </div>
        </div>
      </StudioLayout>
    )
  }

  return (
    <StudioLayout
      title="Faturamento"
      subtitle="Controle de uso, previsibilidade de custos e upgrade instantaneo."
      maxWidth="7xl"
    >
      <div className="aethel-p-6">
        <div className="aethel-flex aethel-items-center aethel-justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Planos e Consumo</h2>
            <p className="text-[var(--aethel-text-secondary)] text-sm">
              Ajuste plano mensal/anual e acompanhe limites em tempo real.
            </p>
          </div>
          <div className="aethel-flex aethel-gap-2">
            <button type="button"
              onClick={() => setCurrency('BRL')}
              className={`px-4 py-2 aethel-rounded ${currency === 'BRL' ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'}`}
            >
              BRL
            </button>
            <button type="button"
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 aethel-rounded ${currency === 'USD' ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'}`}
            >
              USD
            </button>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <BillingStatusBanner />
          <SubscriptionStatusWidget />
        </div>

        <div className="mb-6">
          <div className="inline-flex aethel-items-center aethel-gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] aethel-p-1">
            <button type="button"
              onClick={() => setBillingCycle('month')}
              className={`rounded-full px-4 py-1.5 text-sm ${billingCycle === 'month' ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)]'}`}
            >
              Mensal
            </button>
            <button type="button"
              onClick={() => setBillingCycle('year')}
              className={`rounded-full px-4 py-1.5 text-sm ${billingCycle === 'year' ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)]'}`}
            >
              Anual (-20%)
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="aethel-flex aethel-items-center aethel-justify-between mb-3">
            <h2 className="text-xl font-bold">Uso atual</h2>
            <button type="button"
              onClick={() => setShowUsage((prev) => !prev)}
              className="text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              {showUsage ? 'Ocultar detalhes' : 'Mostrar detalhes'}
            </button>
          </div>
          {showUsage && <UsageDashboard />}
        </div>

        {readiness?.checkoutReady === false && (
          <div className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
              Checkout self-serve ainda nao esta pronto neste ambiente.
            </p>
            <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
              Seguimos mostrando os planos reais, mas so liberamos assinatura quando checkout e webhook estiverem operacionais. Enterprise continua por contato comercial.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 aethel-gap-4">
          {plans.map((plan) => {
            const monthlyPrice = currency === 'BRL' ? plan.priceBRL || 0 : plan.price || 0
            const annualPrice = currency === 'BRL'
              ? (plan.priceAnnualBRL ?? Math.round((plan.priceBRL || 0) * 12 * 0.8))
              : (plan.priceAnnual ?? Number(((plan.price || 0) * 12 * 0.8).toFixed(2)))
            const displayPrice = billingCycle === 'year' ? annualPrice : monthlyPrice
            const tokens = plan.limits?.tokensPerMonth || 0
            const isEnterprise = plan.id === 'enterprise'
            const isCheckoutBlocked = readiness?.checkoutReady === false && !isEnterprise
            const isBusy = selectedPlan === plan.id

            return (
              <div
                key={plan.id}
                className={`aethel-card aethel-p-6 aethel-flex aethel-flex-col ${plan.popular ? 'border border-[var(--aethel-border-secondary)]' : ''}`}
              >
                <div className="aethel-flex aethel-items-center aethel-justify-between mb-2">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.popular ? <Badge variant="primary" size="sm">Recomendado</Badge> : null}
                </div>
                <p className="text-sm text-[var(--aethel-text-secondary)] mb-4">{plan.description || 'Plano sem descricao detalhada.'}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatPrice(displayPrice, currency)}</span>
                  <span className="text-[var(--aethel-text-secondary)]">/{billingCycle === 'year' ? 'ano' : 'mes'}</span>
                </div>

                <div className="mb-4 aethel-p-3 bg-[var(--aethel-surface-secondary)] aethel-rounded border border-[var(--aethel-border-primary)]">
                  <span className="text-2xl font-bold text-[var(--aethel-text-primary)]">{formatTokens(tokens)}</span>
                  <span className="text-[var(--aethel-text-secondary)] text-sm"> tokens/mes</span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Projetos</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{formatLimit(plan.limits?.projects)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Storage</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{formatStorage(plan.limits?.storage)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Colaboradores</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{formatLimit(plan.limits?.collaborators)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Fluxo</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{isEnterprise ? 'Comercial' : 'Self-serve'}</p>
                  </div>
                </div>

                <ul className="flex-1 space-y-2 mb-4">
                  {(plan.features || []).slice(0, 6).map((feature) => (
                    <li key={feature} className="aethel-flex items-start aethel-gap-2 text-sm">
                      <span className="text-[var(--aethel-success)]">+</span>
                      <span className="text-[var(--aethel-text-secondary)]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isBusy || isCheckoutBlocked}
                  className={`aethel-button aethel-button-primary w-full ${isBusy ? 'opacity-50' : ''}`}
                >
                  {isBusy
                    ? 'Processando...'
                    : isEnterprise
                      ? 'Falar com vendas'
                      : isCheckoutBlocked
                        ? 'Checkout indisponivel'
                        : 'Assinar plano'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[var(--aethel-text-secondary)] text-sm">
            Os limites de IA, execucao e deploy variam por plano. Upgrade e downgrade sao aplicados sem migracao manual.
          </p>
          <p className="mt-2 text-[var(--aethel-text-tertiary)] text-xs">
            Checkout seguro via Stripe | Cancelamento a qualquer momento
          </p>
        </div>
      </div>
    </StudioLayout>
  )
}

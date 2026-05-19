'use client'

import { useMemo, useState, type ReactNode } from 'react'
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
  limits?: { tokensPerMonth?: number; projects?: number; storage?: number; collaborators?: number }
}

type PlansResponse = { plans?: Plan[] }

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load plans (${response.status})`)
  return response.json()
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

function formatPrice(value: number, currency: Currency): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US'
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function formatStorage(bytes?: number): string {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return '-'
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
}

function formatLimit(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  if (value < 0) return 'Unlimited'
  return value.toLocaleString('en-US')
}

export function BillingPageClient() {
  const toast = useToast()
  const [currency, setCurrency] = useState<Currency>('USD')
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
        toast.warning('Sign in to continue with a subscription.')
        window.location.href = '/login'
        return
      }
      if (readiness?.checkoutReady === false) {
        toast.warning('Checkout is not available in this environment.', 'Configure billing runtime before enabling self-serve upgrades.')
        return
      }
      window.location.href = `/billing/checkout?plan=${encodeURIComponent(planId)}&interval=${billingCycle}`
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected checkout error'
      toast.error('Could not complete the subscription.', message)
    } finally {
      setSelectedPlan(null)
    }
  }

  if (isLoading) return <BillingShell><BillingNotice text="Loading plans..." /></BillingShell>
  if (error) return <BillingShell><BillingNotice title="Failed to load billing" text="Plans could not be recovered right now. Try again in a moment." /></BillingShell>

  return (
    <StudioLayout title="Billing" subtitle="Usage control, cost predictability, and instant upgrades." maxWidth="7xl">
      <div className="p-6">
        <BillingHeader currency={currency} onCurrencyChange={setCurrency} />
        <div className="mb-6 space-y-4"><BillingStatusBanner /><SubscriptionStatusWidget /></div>
        <BillingCycleSwitch billingCycle={billingCycle} onChange={setBillingCycle} />
        <UsageSection showUsage={showUsage} onToggle={() => setShowUsage((previous) => !previous)} />
        {readiness?.checkoutReady === false && <CheckoutReadinessWarning />}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              billingCycle={billingCycle}
              currency={currency}
              isBusy={selectedPlan === plan.id}
              isCheckoutBlocked={readiness?.checkoutReady === false && plan.id !== 'enterprise'}
              onSubscribe={handleSubscribe}
              plan={plan}
            />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[var(--aethel-text-secondary)]">AI, execution, and deployment limits vary by plan. Upgrades and downgrades apply without manual migration.</p>
        <p className="mt-2 text-center text-xs text-[var(--aethel-text-tertiary)]">Secure checkout through Stripe | Cancel anytime</p>
      </div>
    </StudioLayout>
  )
}

function BillingShell({ children }: { children: ReactNode }) {
  return <StudioLayout title="Billing" subtitle="Plans, usage, and workspace billing."><div className="flex items-center justify-center px-6 py-12">{children}</div></StudioLayout>
}

function BillingNotice({ text, title }: { text: string; title?: string }) {
  return <div className="max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6 shadow-[var(--aethel-shadow-md)]">{title && <h1 className="mb-2 text-xl font-bold">{title}</h1>}<p className="text-sm text-[var(--aethel-text-secondary)]">{text}</p></div>
}

function BillingHeader({ currency, onCurrencyChange }: { currency: Currency; onCurrencyChange: (currency: Currency) => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div><h2 className="text-3xl font-bold">Plans and usage</h2><p className="text-sm text-[var(--aethel-text-secondary)]">Choose monthly or annual billing and track limits in real time.</p></div>
      <div className="flex gap-2">
        {(['USD', 'BRL'] as const).map((item) => <button type="button" key={item} onClick={() => onCurrencyChange(item)} className={`rounded px-4 py-2 ${currency === item ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'}`}>{item}</button>)}
      </div>
    </div>
  )
}

function BillingCycleSwitch({ billingCycle, onChange }: { billingCycle: 'month' | 'year'; onChange: (value: 'month' | 'year') => void }) {
  return <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-1">{(['month', 'year'] as const).map((cycle) => <button type="button" key={cycle} onClick={() => onChange(cycle)} className={`rounded-full px-4 py-1.5 text-sm ${billingCycle === cycle ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)]'}`}>{cycle === 'month' ? 'Monthly' : 'Annual (-20%)'}</button>)}</div>
}

function UsageSection({ showUsage, onToggle }: { showUsage: boolean; onToggle: () => void }) {
  return <div className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Current usage</h2><button type="button" onClick={onToggle} className="text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">{showUsage ? 'Hide details' : 'Show details'}</button></div>{showUsage && <UsageDashboard />}</div>
}

function CheckoutReadinessWarning() {
  return <div className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-4 py-3"><p className="text-sm font-medium text-[var(--aethel-text-primary)]">Self-serve checkout is not ready in this environment yet.</p><p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">Plans remain visible, but subscriptions unlock only when checkout and webhooks are operational. Enterprise remains available through sales.</p></div>
}

function PlanCard({ billingCycle, currency, isBusy, isCheckoutBlocked, onSubscribe, plan }: { billingCycle: 'month' | 'year'; currency: Currency; isBusy: boolean; isCheckoutBlocked: boolean; onSubscribe: (planId: string) => void; plan: Plan }) {
  const monthlyPrice = currency === 'BRL' ? plan.priceBRL || 0 : plan.price || 0
  const annualPrice = currency === 'BRL' ? (plan.priceAnnualBRL ?? Math.round((plan.priceBRL || 0) * 12 * 0.8)) : (plan.priceAnnual ?? Number(((plan.price || 0) * 12 * 0.8).toFixed(2)))
  const displayPrice = billingCycle === 'year' ? annualPrice : monthlyPrice
  const isEnterprise = plan.id === 'enterprise'
  return (
    <div className={`flex flex-col rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6 shadow-[var(--aethel-shadow-md)] ${plan.popular ? 'border-[var(--aethel-border-secondary)]' : ''}`}>
      <div className="mb-2 flex items-center justify-between"><h3 className="text-xl font-bold">{plan.name}</h3>{plan.popular ? <Badge variant="primary" size="sm">Recommended</Badge> : null}</div>
      <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">{plan.description || 'Plan details are not available yet.'}</p>
      <div className="mb-4"><span className="text-3xl font-bold">{formatPrice(displayPrice, currency)}</span><span className="text-[var(--aethel-text-secondary)]">/{billingCycle === 'year' ? 'year' : 'month'}</span></div>
      <PlanLimits plan={plan} isEnterprise={isEnterprise} />
      <ul className="mb-4 flex-1 space-y-2">{(plan.features || []).slice(0, 6).map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><span className="text-[var(--aethel-success)]">+</span><span className="text-[var(--aethel-text-secondary)]">{feature}</span></li>)}</ul>
      <button type="button" onClick={() => onSubscribe(plan.id)} disabled={isBusy || isCheckoutBlocked} className={`inline-flex w-full items-center justify-center rounded-xl bg-[var(--aethel-primary)] px-4 py-2 text-[var(--aethel-text-inverse)] transition-colors hover:bg-[var(--aethel-primary-dark)] disabled:opacity-50`}>
        {isBusy ? 'Processing...' : isEnterprise ? 'Talk to sales' : isCheckoutBlocked ? 'Checkout unavailable' : 'Subscribe'}
      </button>
    </div>
  )
}

function PlanLimits({ isEnterprise, plan }: { isEnterprise: boolean; plan: Plan }) {
  const tokens = plan.limits?.tokensPerMonth || 0
  const items = [
    ['AI tokens', `${formatTokens(tokens)} / month`],
    ['Projects', formatLimit(plan.limits?.projects)],
    ['Storage', formatStorage(plan.limits?.storage)],
    ['Collaborators', formatLimit(plan.limits?.collaborators)],
    ['Flow', isEnterprise ? 'Sales-led' : 'Self-serve'],
  ]
  return <div className="mb-4 grid grid-cols-2 gap-2">{items.map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3"><p className="text-[10px] uppercase tracking-wider text-[var(--aethel-text-tertiary)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{value}</p></div>)}</div>
}


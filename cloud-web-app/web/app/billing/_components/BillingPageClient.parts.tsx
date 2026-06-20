'use client'

import { UsageDashboard } from '@/components/billing/UsageDashboard'
import {
  BillingStatusBanner,
  SubscriptionStatusWidget,
} from '@/components/billing/BillingIntegration'
import { Badge } from '@/components/ui/Badge'
export type Currency = 'USD' | 'BRL'

export type Plan = {
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

export type PlansResponse = { plans?: Plan[] }

export const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load plans (${response.status})`)
  return response.json()
}

export const primaryPlanIds = ['starter', 'pro', 'studio']

export const fallbackPlans: Plan[] = [
  {
    id: 'basic',
    name: 'Starter',
    description:
      'Validate the core loop with missions, preview, and review.',
    price: 0,
    priceAnnual: 0,
    priceBRL: 0,
    priceAnnualBRL: 0,
    features: [
      '100K monthly AI tokens',
      '1 active workspace',
      'Preview and review center',
      'Community support',
    ],
    limits: {
      tokensPerMonth: 100_000,
      projects: 1,
      storage: 1_073_741_824,
      collaborators: 1,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description:
      'Daily builder workflow with Copilot, IDE, preview, and controlled agent cost.',
    popular: true,
    price: 29,
    priceAnnual: 278,
    priceBRL: 149,
    priceAnnualBRL: 1430,
    features: [
      '2M monthly AI tokens',
      '10 workspaces',
      'Agent cost ledger',
      'Priority preview lanes',
    ],
    limits: {
      tokensPerMonth: 2_000_000,
      projects: 10,
      storage: 21_474_836_480,
      collaborators: 3,
    },
  },
  {
    id: 'studio',
    name: 'Studio',
    description:
      'Team delivery with reviews, local handoff checks, and release controls.',
    price: 99,
    priceAnnual: 950,
    priceBRL: 499,
    priceAnnualBRL: 4790,
    features: [
      '10M monthly AI tokens',
      'Unlimited team projects',
      'Runtime handoff checks',
      'Team review controls',
    ],
    limits: {
      tokensPerMonth: 10_000_000,
      projects: -1,
      storage: 107_374_182_400,
      collaborators: 10,
    },
  },
]

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

function formatPrice(value: number, currency: Currency): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatStorage(bytes?: number): string {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return '-'
  if (bytes < 1024 * 1024 * 1024)
    return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
}

function formatLimit(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  if (value < 0) return 'Unlimited'
  return value.toLocaleString('en-US')
}

export function BillingLoadingRunboard({
  message,
  mode,
}: {
  message: string
  mode: 'cached' | 'error' | 'syncing'
}) {
  const toneClass =
    mode === 'error'
      ? 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]'

  return (
    <div
      className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}
      data-billing-loading-runboard="true"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold uppercase tracking-[0.14em]">
          Billing status
        </span>
        <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
          {mode === 'error' ? 'Checkout paused' : 'Plans updating'}
        </span>
      </div>
      <p className="mt-1 font-semibold text-[var(--aethel-text-primary)]">
        Cost and checkout status are updating.
      </p>
      <p className="mt-1 text-[var(--aethel-text-secondary)]">{message}</p>
    </div>
  )
}

export function BillingHeader({
  currency,
  onCurrencyChange,
}: {
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">Plans and usage</h2>
        <p className="text-sm text-[var(--aethel-text-secondary)]">
          Choose monthly or annual billing and track limits in real time.
        </p>
      </div>
      <div className="flex gap-2">
        {(['USD', 'BRL'] as const).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => onCurrencyChange(item)}
            className={`rounded px-4 py-2 ${currency === item ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BillingCycleSwitch({
  billingCycle,
  onChange,
}: {
  billingCycle: 'month' | 'year'
  onChange: (value: 'month' | 'year') => void
}) {
  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-1">
      {(['month', 'year'] as const).map((cycle) => (
        <button
          type="button"
          key={cycle}
          onClick={() => onChange(cycle)}
          className={`rounded-full px-4 py-1.5 text-sm ${billingCycle === cycle ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)]'}`}
        >
          {cycle === 'month' ? 'Monthly' : 'Annual (-20%)'}
        </button>
      ))}
    </div>
  )
}

export function BillingIntegrationStrip() {
  return (
    <div className="mb-6 space-y-4">
      <BillingStatusBanner />
      <SubscriptionStatusWidget />
    </div>
  )
}

export function UsageSection({
  showUsage,
  onToggle,
}: {
  showUsage: boolean
  onToggle: () => void
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">Current usage</h2>
        <button
          type="button"
          onClick={onToggle}
          className="text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
        >
          {showUsage ? 'Hide details' : 'Show details'}
        </button>
      </div>
      {showUsage && <UsageDashboard />}
    </div>
  )
}

export function CheckoutReadinessWarning() {
  return (
    <div className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-4 py-3">
      <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
        Checkout is paused in this environment.
      </p>
      <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
        Plans stay visible. Subscriptions unlock after checkout and webhooks are live.
        Enterprise remains available through sales.
      </p>
    </div>
  )
}

export function PlanCard({
  billingCycle,
  currency,
  isBusy,
  isCheckoutBlocked,
  onSubscribe,
  plan,
}: {
  billingCycle: 'month' | 'year'
  currency: Currency
  isBusy: boolean
  isCheckoutBlocked: boolean
  onSubscribe: (planId: string) => void
  plan: Plan
}) {
  const monthlyPrice = currency === 'BRL' ? plan.priceBRL || 0 : plan.price || 0
  const annualPrice =
    currency === 'BRL'
      ? (plan.priceAnnualBRL ?? Math.round((plan.priceBRL || 0) * 12 * 0.8))
      : (plan.priceAnnual ?? Number(((plan.price || 0) * 12 * 0.8).toFixed(2)))
  const displayPrice = billingCycle === 'year' ? annualPrice : monthlyPrice
  const isEnterprise = plan.id === 'enterprise'
  return (
    <div
      className={`flex flex-col rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6 shadow-[var(--aethel-shadow-md)] ${plan.popular ? 'border-[var(--aethel-border-secondary)]' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        {plan.popular ? (
          <Badge variant="primary" size="sm">
            Recommended
          </Badge>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
        {plan.description || 'Plan details are not available yet.'}
      </p>
      <div className="mb-4">
        <span className="text-3xl font-bold">
          {formatPrice(displayPrice, currency)}
        </span>
        <span className="text-[var(--aethel-text-secondary)]">
          /{billingCycle === 'year' ? 'year' : 'month'}
        </span>
      </div>
      <PlanLimits plan={plan} isEnterprise={isEnterprise} />
      <ul className="mb-4 flex-1 space-y-2">
        {(plan.features || []).slice(0, 6).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <span className="text-[var(--aethel-success)]">+</span>
            <span className="text-[var(--aethel-text-secondary)]">
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onSubscribe(plan.id)}
        disabled={isBusy || isCheckoutBlocked}
        className={`inline-flex w-full items-center justify-center rounded-xl bg-[var(--aethel-primary)] px-4 py-2 text-[var(--aethel-text-inverse)] transition-colors hover:bg-[var(--aethel-primary-dark)] disabled:opacity-50`}
      >
        {isBusy
          ? 'Processing...'
          : isEnterprise
            ? 'Talk to sales'
            : isCheckoutBlocked
              ? 'Checkout paused'
              : 'Subscribe'}
      </button>
    </div>
  )
}

function PlanLimits({
  isEnterprise,
  plan,
}: {
  isEnterprise: boolean
  plan: Plan
}) {
  const tokens = plan.limits?.tokensPerMonth || 0
  const items = [
    ['AI tokens', `${formatTokens(tokens)} / month`],
    ['Projects', formatLimit(plan.limits?.projects)],
    ['Storage', formatStorage(plan.limits?.storage)],
    ['Collaborators', formatLimit(plan.limits?.collaborators)],
    ['Flow', isEnterprise ? 'Sales-led' : 'Self-serve'],
  ]
  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3"
        >
          <p className="text-[10px] uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

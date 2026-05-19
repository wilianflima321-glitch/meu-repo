'use client';

/**
 * Billing Integration Components
 * Complete Stripe billing flow: plan selection, checkout, portal, quota enforcement.
 * Designed to work with both live and test Stripe environments.
 */
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  Crown,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Star,
  Users,
  HardDrive,
  Cpu,
  MessageSquare,
} from 'lucide-react'
import { getToken } from '@/lib/auth'

// ============================================================================
// TYPES
// ============================================================================

interface BillingReadinessState {
  checkoutReady: boolean
  portalReady: boolean
  webhookReady: boolean
  provider: string
  status: 'ready' | 'partial' | 'unavailable'
  blockers: string[]
}

interface Plan {
  id: string
  name: string
  price: number
  annualPrice?: number
  description: string
  features: string[]
  limits: {
    projects: number
    storage: number
    collaborators: number
    tokensPerMonth: number
  }
  popular?: boolean
}

interface SubscriptionStatus {
  plan: string
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

interface BillingTransparencyCardProps {
  estimatedCost: number
  tokenUsage: number
  tokenLimit: number
  nextResetLabel?: string
  onOpenDetails?: () => void
}

// ============================================================================
// PLAN ICONS
// ============================================================================

const PLAN_ICONS: Record<string, typeof Zap> = {
  starter: Zap,
  basic: Shield,
  pro: Star,
  studio: Crown,
  enterprise: Users,
}

// ============================================================================
// BILLING STATUS BANNER
// ============================================================================

export function BillingStatusBanner() {
  const [readiness, setReadiness] = useState<BillingReadinessState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/billing/readiness')
        if (res.ok) {
          const data = await res.json()
          setReadiness(data)
        }
      } catch {
        // Silent fail - billing check is non-critical
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  if (loading || !readiness) return null
  if (readiness.status === 'ready') return null

  return (
    <div
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--aethel-warning)]" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
            Runtime of billing esta {formatReadinessStatus(readiness.status)}
          </p>
          {readiness.blockers.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-[var(--aethel-text-secondary)]">
              {readiness.blockers.slice(0, 3).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PLAN CARD
// ============================================================================

interface PlanCardProps {
  plan: Plan
  currentPlan?: string
  interval: 'month' | 'year'
  onSelect: (planId: string) => void
  loading?: boolean
}

export function PlanCard({ plan, currentPlan, interval, onSelect, loading }: PlanCardProps) {
  const Icon = PLAN_ICONS[plan.id] || Zap
  const isCurrent = currentPlan === plan.id
  const price = interval === 'year' && plan.annualPrice ? plan.annualPrice / 12 : plan.price

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 transition-all ${
        plan.popular
          ? 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] shadow-lg shadow-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]'
          : 'border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]'
      } ${isCurrent ? 'ring-2 ring-[color-mix(in_srgb,var(--aethel-success)_55%,transparent)]' : ''}`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--aethel-primary)] px-3 py-0.5 text-xs font-bold text-[var(--aethel-text-primary)]">
          Popular
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            plan.popular ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]' : 'bg-[var(--aethel-surface-tertiary)]'
          }`}
        >
          <Icon className={`h-5 w-5 ${plan.popular ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-tertiary)]'}`} />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--aethel-text-primary)]">{plan.name}</h3>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">{plan.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[var(--aethel-text-primary)]">
            ${Math.round(price)}
          </span>
          <span className="text-sm text-[var(--aethel-text-tertiary)]">/mo</span>
        </div>
        {interval === 'year' && plan.annualPrice && (
          <p className="mt-1 text-xs text-[var(--aethel-success)]">
            Save ${Math.round((plan.price * 12 - plan.annualPrice))} per year
          </p>
        )}
      </div>

      {/* Limits summary */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]">
          <Cpu size={12} aria-hidden="true" />
          <span>{plan.limits.projects} projects</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]">
          <HardDrive size={12} aria-hidden="true" />
          <span>{formatStorage(plan.limits.storage)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]">
          <Users size={12} aria-hidden="true" />
          <span>{plan.limits.collaborators} collaborators</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]">
          <MessageSquare size={12} aria-hidden="true" />
          <span>{formatTokens(plan.limits.tokensPerMonth)}/mo</span>
        </div>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.slice(0, 6).map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--aethel-success)]" aria-hidden="true" />
            <span className="text-[var(--aethel-text-secondary)]">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent || loading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
          isCurrent
            ? 'cursor-default border border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
            : plan.popular
            ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aethel-primary)]'
            : 'border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aethel-primary)]'
        }`}
        aria-label={isCurrent ? `Current plan: ${plan.name}` : `Select plan ${plan.name}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isCurrent ? (
          <>
            <Check className="h-4 w-4" /> Current plan
          </>
        ) : (
          <>
            Start now <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  )
}

// ============================================================================
// CHECKOUT HANDLER
// ============================================================================

export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const startCheckout = useCallback(
    async (planId: string, interval: 'month' | 'year' = 'month') => {
      setLoading(true)
      setError(null)

      try {
        const token = getToken()
        if (!token) {
          router.push(`/login?next=${encodeURIComponent(`/billing/checkout?plan=${planId}&interval=${interval}`)}`)
          return
        }

        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planId, interval }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Failed to start checkout')
        }

        if (typeof data?.checkoutUrl === 'string' && data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        } else {
          throw new Error('Checkout URL was not received')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Checkout failed'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  return { startCheckout, loading, error }
}

// ============================================================================
// SUBSCRIPTION STATUS WIDGET
// ============================================================================

export function SubscriptionStatusWidget() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = getToken()
        if (!token) return
        const res = await fetch('/api/billing/subscription', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setSubscription(
            data?.data
              ? {
                  plan: data.data.plan,
                  status: data.data.subscription?.status || 'inactive',
                  currentPeriodEnd: data.data.subscription?.currentPeriodEnd,
                  cancelAtPeriodEnd: false,
                }
              : null
          )
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
        <div className="h-4 w-24 rounded bg-[var(--aethel-surface-tertiary)]" />
        <div className="mt-2 h-3 w-32 rounded bg-[var(--aethel-surface-tertiary)]" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 text-center">
        <CreditCard className="mx-auto mb-2 h-8 w-8 text-[var(--aethel-text-quaternary)]" />
        <p className="text-sm text-[var(--aethel-text-tertiary)]">No active subscription</p>
        <a
          href="/pricing"
          className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary)]"
        >
          View plans <ArrowRight size={14} />
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--aethel-text-tertiary)]">
            Current plan
          </p>
          <p className="mt-0.5 text-lg font-semibold capitalize text-[var(--aethel-text-primary)]">
            {subscription.plan}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            subscription.status === 'active'
              ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
          }`}
        >
          {formatSubscriptionStatus(subscription.status)}
        </span>
      </div>
      {subscription.currentPeriodEnd && (
        <p className="mt-2 text-xs text-[var(--aethel-text-quaternary)]">
          {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}{' '}
          {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// USAGE QUOTA BAR
// ============================================================================

interface QuotaBarProps {
  label: string
  used: number
  limit: number
  unit?: string
  variant?: 'default' | 'warning' | 'danger'
}

export function UsageQuotaBar({ label, used, limit, unit = '', variant }: QuotaBarProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const autoVariant =
    variant || (percentage >= 90 ? 'danger' : percentage >= 75 ? 'warning' : 'default')

  const barColors = {
    default: 'bg-[var(--aethel-primary)]',
    warning: 'bg-[var(--aethel-warning)]',
    danger: 'bg-[var(--aethel-error)]',
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--aethel-text-tertiary)]">{label}</span>
        <span className="text-[var(--aethel-text-secondary)]">
          {formatNumber(used)}{unit} / {formatNumber(limit)}{unit}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--aethel-surface-tertiary)]"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${label}: ${Math.round(percentage)}% used`}
        aria-valuetext={`${formatNumber(used)}${unit} of ${formatNumber(limit)}${unit} used`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColors[autoVariant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function BillingTransparencyCard({
  estimatedCost,
  tokenUsage,
  tokenLimit,
  nextResetLabel,
  onOpenDetails,
}: BillingTransparencyCardProps) {
  const usagePercent = tokenLimit > 0 ? Math.min((tokenUsage / tokenLimit) * 100, 100) : 0

  return (
    <section className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
            Usage transparency
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--aethel-text-primary)]">
            Cost and usage visible in the workflow
          </h3>
        </div>
        {onOpenDetails ? (
          <button
            type="button"
            onClick={onOpenDetails}
            aria-label="Abrir detalhes of custo e consumo"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]"
          >
            View details <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] p-3">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Estimated cost</p>
          <p className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)]">${estimatedCost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] p-3">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Uso of tokens</p>
          <p className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)]">
            {formatTokens(tokenUsage)} / {formatTokens(tokenLimit)}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] p-3">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Next reset</p>
          <p className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)]">{nextResetLabel || '—'}</p>
        </div>
      </div>

      <div className="mt-4">
        <UsageQuotaBar
          label="Monthly usage"
          used={tokenUsage}
          limit={tokenLimit}
        />
        <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
          {Math.round(usagePercent)}% of the current allowance used.
        </p>
      </div>
    </section>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatReadinessStatus(status: BillingReadinessState['status']): string {
  switch (status) {
    case 'ready':
      return 'ready'
    case 'partial':
      return 'parcial'
    default:
      return 'indisponivel'
  }
}

function formatSubscriptionStatus(status: string): string {
  const normalized = String(status || '').trim().toLowerCase()
  switch (normalized) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'em teste'
    case 'past_due':
      return 'pagamento pendente'
    case 'canceled':
      return 'cancelada'
    case 'incomplete':
      return 'incompleta'
    case 'unpaid':
      return 'inadimplente'
    default:
      return normalized || 'sem status'
  }
}

function formatStorage(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${bytes} B`
}

function formatTokens(count: number): string {
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`
  if (count >= 1e3) return `${(count / 1e3).toFixed(0)}K`
  return `${count}`
}

function formatNumber(num: number): string {
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toLocaleString()
}

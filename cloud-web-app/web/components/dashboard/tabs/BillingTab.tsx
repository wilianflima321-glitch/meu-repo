'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Badge, Button, Card } from '../../ui'
import {
  AethelAPIClient,
  APIError,
  type BillingPlan,
  type BillingReadiness,
  type BillingSubscriptionStatus,
} from '@/lib/api'
import { PLANS, type PlanDefinition } from '@/lib/plans'

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  popular?: boolean
  features: string[]
  limits: {
    requests: number | 'unlimited'
    projects: number | 'unlimited'
    storage: string
    collaborators: number | 'unlimited'
  }
}

interface BillingTabProps {
  plans?: Plan[]
  currentPlan?: string
  loading?: boolean
  onSelectPlan?: (planId: string) => void
  onManageSubscription?: () => void
  showHeader?: boolean
  showHighlights?: boolean
  showFaq?: boolean
  showCurrentPlanInfo?: boolean
}

const formatCompactNumber = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatTokenLimit = (value: number | 'unlimited') => {
  if (value === 'unlimited' || value < 0) return 'Unlimited'
  return `${formatCompactNumber(value)} tokens`
}

const formatLimitValue = (value: number | 'unlimited') => {
  if (value === 'unlimited' || value < 0) return 'Unlimited'
  return value
}

const formatPlanName = (planId: string) => {
  const match = PLANS.find((plan) => plan.id === planId)
  return match?.name ?? planId
}

const formatDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const buildRuntimeErrorMessage = (error: unknown) => {
  if (error instanceof APIError) {
    if (typeof error.data === 'object' && error.data && 'error' in error.data) {
      const code = String((error.data as { error?: unknown }).error ?? '')
      if (code === 'PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE') {
        return 'Billing runtime is not ready yet. Configure Stripe and webhook secrets before promoting checkout.'
      }
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Billing action failed.'
}

const planToCard = (plan: PlanDefinition): Plan => {
  const storageInGb = plan.limits.storage / (1024 * 1024 * 1024)
  const storageLabel =
    storageInGb >= 1 ? `${storageInGb.toFixed(0)}GB` : `${(storageInGb * 1024).toFixed(0)}MB`
  const collaborators = plan.limits.collaborators < 0 ? 'unlimited' : plan.limits.collaborators
  const projects = plan.limits.projects < 0 ? 'unlimited' : plan.limits.projects

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.priceBRL,
    currency: 'BRL',
    interval: plan.interval,
    popular: plan.popular,
    features: plan.features,
    limits: {
      requests: plan.limits.tokensPerMonth < 0 ? 'unlimited' : plan.limits.tokensPerMonth,
      projects,
      storage: storageLabel,
      collaborators,
    },
  }
}

const apiPlanToCard = (plan: BillingPlan): Plan => {
  const price = Number(plan.priceBRL ?? plan.price ?? 0)
  const limits = (plan.limits ?? {}) as Record<string, unknown>
  return {
    id: String(plan.id),
    name: plan.name ?? String(plan.id),
    description: plan.description ?? '',
    price,
    currency: plan.currency ?? 'BRL',
    interval: (plan.interval as Plan['interval']) ?? 'month',
    popular: plan.popular ?? false,
    features: plan.features ?? [],
    limits: {
      requests: (limits.tokensPerMonth as number | 'unlimited' | undefined) ?? (limits.requests as number | 'unlimited' | undefined) ?? 'unlimited',
      projects: (limits.projects as number | 'unlimited' | undefined) ?? 'unlimited',
      storage: String(limits.storage ?? '-'),
      collaborators: (limits.collaborators as number | 'unlimited' | undefined) ?? 'unlimited',
    },
  }
}

const defaultPlans: Plan[] = PLANS.map(planToCard)

const planIcons: Record<string, ReactNode> = {
  starter: <Sparkles className="w-6 h-6" />,
  basic: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  studio: <Crown className="w-6 h-6" />,
  enterprise: <Building2 className="w-6 h-6" />,
}

function PlanCard({
  plan,
  isCurrent,
  disabled = false,
  actionLabel,
  onSelect,
}: {
  plan: Plan
  isCurrent: boolean
  disabled?: boolean
  actionLabel?: string
  onSelect?: () => void
}) {
  const isPopular = plan.popular
  const isFree = plan.price === 0

  return (
    <Card
      variant={isPopular ? 'gradient' : 'elevated'}
      padding="none"
      className={`relative overflow-hidden ${isPopular ? 'ring-2 ring-sky-500' : ''}`}
    >
      {isPopular && (
        <div className="absolute top-4 right-4">
          <Badge variant="primary" size="sm">
            <Crown className="w-3 h-3 mr-1" />
            Recommended
          </Badge>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${isPopular ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}
            `}
          >
            {planIcons[plan.id] || <Sparkles className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="text-sm text-slate-400">{plan.description}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">{isFree ? 'Free' : `R$${plan.price}`}</span>
            {!isFree && <span className="text-slate-400">/{plan.interval === 'month' ? 'month' : 'year'}</span>}
          </div>
          {!isFree && (
            <p className="text-xs text-slate-500 mt-2">Recurring billing. Cancel any time.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Tokens/month</p>
            <p className="text-sm text-white font-semibold">{formatTokenLimit(plan.limits.requests)}</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Projects</p>
            <p className="text-sm text-white font-semibold">{formatLimitValue(plan.limits.projects)}</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Storage</p>
            <p className="text-sm text-white font-semibold">{plan.limits.storage}</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Collaborators</p>
            <p className="text-sm text-white font-semibold">{formatLimitValue(plan.limits.collaborators)}</p>
          </div>
        </div>

        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-6 pb-6">
        {isCurrent ? (
          <Button variant="secondary" fullWidth disabled>
            Current plan
          </Button>
        ) : (
          <Button
            variant={isPopular ? 'primary' : 'secondary'}
            fullWidth
            disabled={disabled}
            onClick={onSelect}
          >
            {actionLabel ?? (isFree ? 'Start free' : 'Subscribe')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  )
}

export function BillingTab({
  plans = defaultPlans,
  currentPlan = 'starter',
  loading = false,
  onSelectPlan,
  onManageSubscription,
  showHeader = true,
  showHighlights = true,
  showFaq = true,
  showCurrentPlanInfo = true,
}: BillingTabProps) {
  const [remotePlans, setRemotePlans] = useState<Plan[] | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [billingReadiness, setBillingReadiness] = useState<BillingReadiness | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<BillingSubscriptionStatus | null>(null)
  const [billingActionBusy, setBillingActionBusy] = useState<'checkout' | 'portal' | null>(null)
  const [billingActionError, setBillingActionError] = useState<string | null>(null)

  useEffect(() => {
    if (plans?.length) return

    setIsFetching(true)
    AethelAPIClient.getBillingPlans()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRemotePlans(data.map(apiPlanToCard))
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false))
  }, [plans])

  useEffect(() => {
    AethelAPIClient.getBillingReadiness()
      .then((data) => setBillingReadiness(data))
      .catch(() => setBillingReadiness(null))
  }, [])

  useEffect(() => {
    AethelAPIClient.getBillingSubscription()
      .then((data) => setSubscriptionStatus(data))
      .catch(() => setSubscriptionStatus(null))
  }, [])

  const resolvedPlans = useMemo(() => {
    if (plans?.length) return plans
    if (remotePlans?.length) return remotePlans
    return defaultPlans
  }, [plans, remotePlans])

  const effectiveCurrentPlan = subscriptionStatus?.plan || currentPlan
  const isLoading = loading || (isFetching && resolvedPlans.length === 0)
  const currentPlanLabel = resolvedPlans.find((plan) => plan.id === effectiveCurrentPlan)?.name ?? formatPlanName(effectiveCurrentPlan)
  const currentPeriodEnd = formatDate(subscriptionStatus?.subscription?.currentPeriodEnd)
  const subscriptionState = subscriptionStatus?.subscription?.status ?? null

  const handleSelectPlan = async (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId)
      return
    }

    setBillingActionError(null)
    setBillingActionBusy('checkout')
    try {
      const result = await AethelAPIClient.subscribe(planId)
      if (result.checkoutUrl && typeof window !== 'undefined') {
        window.location.href = result.checkoutUrl
        return
      }
      throw new Error('Checkout URL was not returned.')
    } catch (error) {
      setBillingActionError(buildRuntimeErrorMessage(error))
    } finally {
      setBillingActionBusy(null)
    }
  }

  const handleManageSubscription = async () => {
    if (onManageSubscription) {
      onManageSubscription()
      return
    }

    setBillingActionError(null)
    setBillingActionBusy('portal')
    try {
      const result = await AethelAPIClient.openBillingPortal()
      if (result.url && typeof window !== 'undefined') {
        window.location.href = result.url
        return
      }
      throw new Error('Billing portal URL was not returned.')
    } catch (error) {
      setBillingActionError(buildRuntimeErrorMessage(error))
    } finally {
      setBillingActionBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      {showHeader && (
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">Choose the right plan</h1>
          <p className="text-slate-400">
            Plans aligned with real AI and infrastructure usage. Upgrade or downgrade when needed.
          </p>
        </div>
      )}

      {showHighlights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm text-white font-semibold">Secure billing</p>
              <p className="text-xs text-slate-400">Stripe-backed payment and runtime checks.</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-sm text-white font-semibold">Fast activation</p>
              <p className="text-xs text-slate-400">Plan changes depend on live checkout and webhook readiness.</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-white font-semibold">Canonical plans</p>
              <p className="text-xs text-slate-400">Rendered from the same billing contract used by the backend.</p>
            </div>
          </Card>
        </div>
      )}

      {billingReadiness && !billingReadiness.checkoutReady && (
        <Card variant="outlined" padding="md" className="border-amber-500/30 bg-amber-500/10">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">Checkout is not production-ready yet</p>
              <p className="mt-1 text-xs text-amber-100/80">
                Billing routes exist, but the current runtime still reports partial readiness.
              </p>
              {billingReadiness.provider ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-amber-100/80">
                  <span className="rounded-full border border-amber-500/20 bg-black/20 px-2.5 py-1">
                    provider {billingReadiness.provider.label}
                  </span>
                  {billingReadiness.provider.webhookPath ? (
                    <span className="rounded-full border border-amber-500/20 bg-black/20 px-2.5 py-1">
                      webhook {billingReadiness.provider.webhookPath}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-amber-100/80">
                {billingReadiness.gateway?.checkoutEnabled === false && <li>Checkout is disabled in gateway configuration.</li>}
                {billingReadiness.gateway?.activeGateway !== 'stripe' && (
                  <li>Active gateway: {billingReadiness.gateway?.activeGateway || 'unknown'}.</li>
                )}
                {billingReadiness.portalReady === false && <li>Subscription portal is not ready in this runtime.</li>}
                {billingReadiness.webhookReady === false && <li>Webhook processing is not ready, so subscription events should not be treated as active.</li>}
                {billingReadiness.stripe?.missingEnv?.map((envKey) => (
                  <li key={envKey}>Missing {envKey}.</li>
                ))}
              </ul>
              {billingReadiness.provider?.setupEnv?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {billingReadiness.provider.setupEnv.map((envKey) => (
                    <span
                      key={envKey}
                      className="rounded-full border border-amber-500/20 bg-black/20 px-2.5 py-1 text-[11px] text-amber-100/80"
                    >
                      {envKey}
                    </span>
                  ))}
                </div>
              ) : null}
              {billingReadiness.stripe ? (
                <p className="mt-3 text-[11px] text-amber-100/80">
                  publishable={String(billingReadiness.stripe.publishableKeyConfigured)} | prices={billingReadiness.stripe.configuredPriceCount}/{billingReadiness.stripe.requiredPriceCount}
                </p>
              ) : null}
              {billingReadiness.instructions?.length ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-black/20 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100/80">
                    Next actions
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-100/80">
                    {billingReadiness.instructions.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ul>
                  {billingReadiness.recommendedCommands?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {billingReadiness.recommendedCommands.map((command) => (
                        <code
                          key={command}
                          className="rounded-full border border-amber-500/20 bg-slate-950/70 px-2.5 py-1 text-[11px] text-cyan-300"
                        >
                          {command}
                        </code>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <Badge variant="warning" size="sm">
              status: {billingReadiness.status}
            </Badge>
          </div>
        </Card>
      )}

      {billingActionError && (
        <Card variant="outlined" padding="md" className="border-red-500/30 bg-red-500/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-200">Billing action failed</p>
              <p className="mt-1 text-xs text-red-100/80">{billingActionError}</p>
            </div>
            <Badge variant="error" size="sm">
              action blocked
            </Badge>
          </div>
        </Card>
      )}

      {showCurrentPlanInfo && effectiveCurrentPlan && effectiveCurrentPlan !== 'unknown' && (
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                {planIcons[effectiveCurrentPlan] || <Sparkles className="w-6 h-6 text-sky-400" />}
              </div>
              <div>
                <p className="text-sm text-slate-400">Current plan</p>
                <p className="text-lg font-semibold text-white">{currentPlanLabel}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {subscriptionState ? (
                    <Badge variant={subscriptionState === 'active' ? 'success' : 'info'} size="sm">
                      subscription: {subscriptionState}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      no active subscription
                    </Badge>
                  )}
                  {currentPeriodEnd && <span>Renews on {currentPeriodEnd}</span>}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              loading={billingActionBusy === 'portal'}
              disabled={billingReadiness?.portalReady === false}
              onClick={handleManageSubscription}
            >
              {billingReadiness?.portalReady === false ? 'Portal unavailable' : 'Manage subscription'}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <Card variant="elevated" padding="lg" className="text-slate-400">
            Loading plans...
          </Card>
        ) : (
          resolvedPlans.map((plan) => {
            const isCurrent = effectiveCurrentPlan === plan.id
            const isCheckoutBlocked = billingReadiness?.checkoutReady === false
            const actionLabel = isCheckoutBlocked
              ? 'Checkout unavailable'
              : plan.price === 0
                ? 'Start free'
                : 'Subscribe'

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                disabled={isCheckoutBlocked || billingActionBusy === 'checkout'}
                actionLabel={actionLabel}
                onSelect={() => handleSelectPlan(plan.id)}
              />
            )
          })
        )}
      </div>

      {showFaq && (
        <Card variant="default" padding="lg">
          <h3 className="text-lg font-semibold text-white mb-4">FAQ</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-200 mb-2">Can I cancel at any time?</h4>
              <p className="text-sm text-slate-400">
                Yes. Cancellation is controlled by Stripe runtime state and takes effect according to the current subscription period.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">What happens if I exceed limits?</h4>
              <p className="text-sm text-slate-400">
                Usage limits are enforced by plan policy. Upgrade when needed or wait for the next billing window.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">Do you support team pricing?</h4>
              <p className="text-sm text-slate-400">
                Yes. Enterprise remains the right path for custom seats, support expectations, and contract review.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">Which payment methods are live?</h4>
              <p className="text-sm text-slate-400">
                Public billing readiness reflects the actual gateway state. Do not assume payment methods are active until checkout and webhook readiness are green.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default BillingTab

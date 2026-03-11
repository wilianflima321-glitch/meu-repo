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
  priceAnnual?: number
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
  onSelectPlan?: (planId: string, interval?: 'month' | 'year') => void
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
  if (value === 'unlimited' || value < 0) return 'Ilimitado'
  return `${formatCompactNumber(value)} tokens`
}

const formatLimitValue = (value: number | 'unlimited') => {
  if (value === 'unlimited' || value < 0) return 'Ilimitado'
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
        return 'O runtime de billing ainda nao esta pronto. Configure Stripe e webhook antes de liberar o checkout.'
      }
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Falha na acao de billing.'
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
    priceAnnual: plan.priceAnnualBRL,
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
  const priceAnnual = Number(plan.priceAnnualBRL ?? plan.priceAnnual ?? 0)
  const limits = (plan.limits ?? {}) as Record<string, unknown>
  return {
    id: String(plan.id),
    name: plan.name ?? String(plan.id),
    description: plan.description ?? '',
    price,
    priceAnnual: priceAnnual || undefined,
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
            Recomendado
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
            <span className="text-4xl font-bold text-white">{isFree ? 'Gratis' : `R$${plan.price}`}</span>
            {!isFree && <span className="text-slate-400">/{plan.interval === 'month' ? 'mes' : 'ano'}</span>}
          </div>
          {!isFree && (
            <p className="text-xs text-slate-500 mt-2">Cobranca recorrente. Cancele quando quiser.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Tokens/mes</p>
            <p className="text-sm text-white font-semibold">{formatTokenLimit(plan.limits.requests)}</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Projetos</p>
            <p className="text-sm text-white font-semibold">{formatLimitValue(plan.limits.projects)}</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Storage</p>
            <p className="text-sm text-white font-semibold">{plan.limits.storage}</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Colaboradores</p>
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
            Plano atual
          </Button>
        ) : (
          <Button
            variant={isPopular ? 'primary' : 'secondary'}
            fullWidth
            disabled={disabled}
            onClick={onSelect}
          >
            {actionLabel ?? (isFree ? 'Comecar gratis' : 'Assinar')}
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
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')

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
      onSelectPlan(planId, billingCycle)
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
          <h1 className="text-3xl font-bold text-white mb-4">Escolha o plano ideal</h1>
          <p className="text-slate-400">
            Planos alinhados ao uso real de IA e infraestrutura. Troque quando precisar.
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
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
      </div>

      {showHighlights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm text-white font-semibold">Billing seguro</p>
              <p className="text-xs text-slate-400">Stripe com checagens reais de runtime.</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-sm text-white font-semibold">Ativacao rapida</p>
              <p className="text-xs text-slate-400">Mudancas dependem de checkout e webhook prontos.</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-white font-semibold">Planos canonicos</p>
              <p className="text-xs text-slate-400">Renderizados do mesmo contrato usado no backend.</p>
            </div>
          </Card>
        </div>
      )}

      {billingReadiness && !billingReadiness.checkoutReady && (
        <Card variant="outlined" padding="md" className="border-amber-500/30 bg-amber-500/10">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">Checkout ainda nao esta pronto</p>
              <p className="mt-1 text-xs text-amber-100/80">
                As rotas existem, mas o runtime ainda reporta readiness parcial.
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
                {billingReadiness.gateway?.checkoutEnabled === false && <li>Checkout desabilitado na configuracao do gateway.</li>}
                {billingReadiness.gateway?.activeGateway !== 'stripe' && (
                  <li>Gateway ativo: {billingReadiness.gateway?.activeGateway || 'unknown'}.</li>
                )}
                {billingReadiness.portalReady === false && <li>Portal de assinatura nao esta pronto neste runtime.</li>}
                {billingReadiness.webhookReady === false && <li>Webhook nao esta pronto, eventos nao devem ser tratados como ativos.</li>}
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
                    Proximas acoes
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
              <p className="text-sm font-semibold text-red-200">Falha na acao de billing</p>
              <p className="mt-1 text-xs text-red-100/80">{billingActionError}</p>
            </div>
            <Badge variant="error" size="sm">
              acao bloqueada
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
                <p className="text-sm text-slate-400">Plano atual</p>
                <p className="text-lg font-semibold text-white">{currentPlanLabel}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {subscriptionState ? (
                    <Badge variant={subscriptionState === 'active' ? 'success' : 'info'} size="sm">
                      assinatura: {subscriptionState}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      sem assinatura ativa
                    </Badge>
                  )}
                  {currentPeriodEnd && <span>Renova em {currentPeriodEnd}</span>}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              loading={billingActionBusy === 'portal'}
              disabled={billingReadiness?.portalReady === false}
              onClick={handleManageSubscription}
            >
              {billingReadiness?.portalReady === false ? 'Portal indisponivel' : 'Gerenciar assinatura'}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <Card variant="elevated" padding="lg" className="text-slate-400">
            Carregando planos...
          </Card>
        ) : (
          resolvedPlans.map((plan) => {
            const isCurrent = effectiveCurrentPlan === plan.id
            const isCheckoutBlocked = billingReadiness?.checkoutReady === false
            const actionLabel = isCheckoutBlocked
              ? 'Checkout indisponivel'
              : plan.price === 0
                ? 'Comecar gratis'
                : 'Assinar'
            const displayPrice =
              billingCycle === 'year'
                ? plan.priceAnnual ?? Number((plan.price * 12 * 0.8).toFixed(2))
                : plan.price

            return (
              <PlanCard
                key={plan.id}
                plan={{
                  ...plan,
                  price: displayPrice,
                  interval: billingCycle,
                }}
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
              <h4 className="font-medium text-slate-200 mb-2">Posso cancelar a qualquer momento?</h4>
              <p className="text-sm text-slate-400">
                Sim. O cancelamento segue o estado real do Stripe e vale no fim do periodo vigente.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">O que acontece se eu ultrapassar os limites?</h4>
              <p className="text-sm text-slate-400">
                Os limites sao aplicados por plano. Faca upgrade ou aguarde o proximo ciclo.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">Existe plano para equipes?</h4>
              <p className="text-sm text-slate-400">
                Sim. Enterprise cobre assentos, suporte e contrato sob medida.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">Quais metodos de pagamento estao ativos?</h4>
              <p className="text-sm text-slate-400">
                O readiness publico reflete o estado real do gateway. So considere ativo quando checkout e webhook estiverem verdes.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default BillingTab

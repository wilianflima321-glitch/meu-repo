'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  ShieldCheck,
  Rocket,
} from 'lucide-react'
import { Card, Button, Badge } from '../../ui'
import { AethelAPIClient, type BillingPlan } from '@/lib/api'
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
  if (value === 'unlimited' || value < 0) return 'Ilimitado'
  return `${formatCompactNumber(value)} tokens`
}

const formatLimitValue = (value: number | 'unlimited') => {
  if (value === 'unlimited' || value < 0) return 'Ilimitado'
  return value
}

const planToCard = (plan: PlanDefinition): Plan => {
  const storageInGb = plan.limits.storage / (1024 * 1024 * 1024)
  const storageLabel = storageInGb >= 1 ? `${storageInGb.toFixed(0)}GB` : `${(storageInGb * 1024).toFixed(0)}MB`
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
      requests: (plan.limits as any)?.tokensPerMonth ?? (plan.limits as any)?.requests ?? 'unlimited',
      projects: (plan.limits as any)?.projects ?? 'unlimited',
      storage: (plan.limits as any)?.storage ?? '—',
      collaborators: (plan.limits as any)?.collaborators ?? 'unlimited',
    },
  }
}

const defaultPlans: Plan[] = PLANS.map(planToCard)

const planIcons: Record<string, React.ReactNode> = {
  starter: <Sparkles className="w-6 h-6" />,
  basic: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  studio: <Crown className="w-6 h-6" />,
  enterprise: <Building2 className="w-6 h-6" />,
}

function PlanCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: Plan
  isCurrent: boolean
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${isPopular
                ? 'bg-sky-500/20 text-sky-400'
                : 'bg-slate-800 text-slate-400'
              }
            `}
          >
            {planIcons[plan.id] || <Sparkles className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="text-sm text-slate-400">{plan.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">
              {isFree ? 'Grátis' : `R$${plan.price}`}
            </span>
            {!isFree && (
              <span className="text-slate-400">/{plan.interval === 'month' ? 'mês' : 'ano'}</span>
            )}
          </div>
          {!isFree && (
            <p className="text-xs text-slate-500 mt-2">
              Cobrança recorrente. Cancelamento a qualquer momento.
            </p>
          )}
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Tokens/mês</p>
            <p className="text-sm text-white font-semibold">
              {formatTokenLimit(plan.limits.requests)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Projetos</p>
            <p className="text-sm text-white font-semibold">
              {formatLimitValue(plan.limits.projects)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Armazenamento</p>
            <p className="text-sm text-white font-semibold">
              {plan.limits.storage}
            </p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Colaboradores</p>
            <p className="text-sm text-white font-semibold">
              {formatLimitValue(plan.limits.collaborators)}
            </p>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        {isCurrent ? (
          <Button variant="secondary" fullWidth disabled>
            Plano Atual
          </Button>
        ) : (
          <Button
            variant={isPopular ? 'primary' : 'secondary'}
            fullWidth
            onClick={onSelect}
          >
            {isFree ? 'Começar Grátis' : 'Assinar'}
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

  const resolvedPlans = useMemo(() => {
    if (plans?.length) return plans
    if (remotePlans?.length) return remotePlans
    return defaultPlans
  }, [plans, remotePlans])

  const isLoading = loading || (isFetching && resolvedPlans.length === 0)

  return (
    <div className="space-y-8">
      {showHeader && (
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">
            Escolha o plano ideal para você
          </h1>
          <p className="text-slate-400">
            Planos alinhados com o consumo real de IA e infraestrutura.
            Você pode fazer upgrade ou downgrade quando precisar.
          </p>
        </div>
      )}

      {showHighlights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm text-white font-semibold">Cobrança segura</p>
              <p className="text-xs text-slate-400">Processamento Stripe e conformidade.</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-sm text-white font-semibold">Upgrade instantâneo</p>
              <p className="text-xs text-slate-400">Ativação imediata após pagamento.</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-white font-semibold">Planos oficiais</p>
              <p className="text-xs text-slate-400">Alinhados com PLANS do sistema.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Current Plan Info */}
      {showCurrentPlanInfo && currentPlan && currentPlan !== 'unknown' && (
        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                {planIcons[currentPlan] || <Sparkles className="w-6 h-6 text-sky-400" />}
              </div>
              <div>
                <p className="text-sm text-slate-400">Seu plano atual</p>
                <p className="text-lg font-semibold text-white">
                  {plans.find((p) => p.id === currentPlan)?.name || currentPlan}
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={onManageSubscription}>
              Gerenciar Assinatura
            </Button>
          </div>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <Card variant="elevated" padding="lg" className="text-slate-400">
            Carregando planos...
          </Card>
        ) : (
          resolvedPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={currentPlan === plan.id}
            onSelect={() => onSelectPlan?.(plan.id)}
          />
          ))
        )}
      </div>

      {showFaq && (
        <Card variant="default" padding="lg">
          <h3 className="text-lg font-semibold text-white mb-4">
            Perguntas Frequentes
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-200 mb-2">
                Posso cancelar a qualquer momento?
              </h4>
              <p className="text-sm text-slate-400">
                Sim, você pode cancelar sua assinatura a qualquer momento. Você continuará
                tendo acesso até o final do período pago.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">
                O que acontece se exceder meus limites?
              </h4>
              <p className="text-sm text-slate-400">
                Você será notificado quando estiver próximo do limite. Pode fazer upgrade
                ou aguardar a renovação do mês.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">
                Oferecem desconto para times?
              </h4>
              <p className="text-sm text-slate-400">
                Sim! O plano Enterprise inclui preços especiais para equipes.
                Entre em contato para um orçamento personalizado.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-2">
                Quais formas de pagamento aceitam?
              </h4>
              <p className="text-sm text-slate-400">
                Aceitamos cartões de crédito, PIX, boleto e transferência bancária
                para planos Enterprise.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default BillingTab

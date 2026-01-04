'use client'

import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Building2,
  ArrowRight,
} from 'lucide-react'
import { Card, Button, Badge } from '../../ui'

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
}

const defaultPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para começar a explorar',
    price: 0,
    currency: 'BRL',
    interval: 'month',
    features: [
      '100 requests de AI/mês',
      '3 projetos',
      '1GB de armazenamento',
      'IDE Web básica',
      'Comunidade Discord',
    ],
    limits: {
      requests: 100,
      projects: 3,
      storage: '1GB',
      collaborators: 1,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para desenvolvedores sérios',
    price: 49,
    currency: 'BRL',
    interval: 'month',
    popular: true,
    features: [
      'Requests ilimitados',
      'Projetos ilimitados',
      '50GB de armazenamento',
      'IDE Desktop + Web',
      'Multi-Agent AI',
      'Suporte prioritário',
      'Integrações avançadas',
    ],
    limits: {
      requests: 'unlimited',
      projects: 'unlimited',
      storage: '50GB',
      collaborators: 5,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para times e empresas',
    price: 199,
    currency: 'BRL',
    interval: 'month',
    features: [
      'Tudo do Pro',
      'SSO/SAML',
      'Deploy on-premise',
      'SLA 99.9%',
      'Gerente de conta',
      'Treinamento personalizado',
      'API dedicada',
      'Auditoria de segurança',
    ],
    limits: {
      requests: 'unlimited',
      projects: 'unlimited',
      storage: '500GB',
      collaborators: 'unlimited',
    },
  },
]

const planIcons: Record<string, React.ReactNode> = {
  free: <Sparkles className="w-6 h-6" />,
  pro: <Zap className="w-6 h-6" />,
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
      className={`relative overflow-hidden ${isPopular ? 'ring-2 ring-indigo-500' : ''}`}
    >
      {isPopular && (
        <div className="absolute top-4 right-4">
          <Badge variant="primary" size="sm">
            <Crown className="w-3 h-3 mr-1" />
            Popular
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
                ? 'bg-indigo-500/20 text-indigo-400'
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
            {isFree ? 'Começar Grátis' : 'Fazer Upgrade'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  )
}

export function BillingTab({
  plans = defaultPlans,
  currentPlan = 'free',
  loading = false,
  onSelectPlan,
  onManageSubscription,
}: BillingTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">
          Escolha o plano ideal para você
        </h1>
        <p className="text-slate-400">
          Comece grátis e faça upgrade quando precisar de mais recursos.
          Todos os planos incluem 14 dias de teste do Pro.
        </p>
      </div>

      {/* Current Plan Info */}
      {currentPlan !== 'free' && (
        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                {planIcons[currentPlan] || <Sparkles className="w-6 h-6 text-indigo-400" />}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={currentPlan === plan.id}
            onSelect={() => onSelectPlan?.(plan.id)}
          />
        ))}
      </div>

      {/* FAQ / Additional Info */}
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
    </div>
  )
}

export default BillingTab

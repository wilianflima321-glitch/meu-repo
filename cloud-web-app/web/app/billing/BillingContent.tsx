"use client"
import useSWR from 'swr'
import { API_BASE } from '@/lib/api'
import { useState } from 'react'
import { UsageDashboard } from '@/components/billing/UsageDashboard'
import { useToast } from '@/components/ui/Toast'

const API = API_BASE
const fetcher = (u: string) => fetch(u).then(r => r.json())

/**
 * Billing Page - Seleção de Planos + Consumo
 * UI otimizada para experiência do usuário
 */
export default function BillingContent() {
  const toast = useToast()
  const { data, isLoading } = useSWR(`${API}/billing/plans`, fetcher)
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('BRL')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showUsage, setShowUsage] = useState(true)

  const plans = data?.plans || []

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${tokens / 1_000_000}M`
    if (tokens >= 1_000) return `${tokens / 1_000}K`
    return tokens.toString()
  }

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId)
    
    try {
      const token = localStorage.getItem('aethel-token'); // Or use getToken() from lib/auth
      if (!token) {
        toast.warning('Por favor, faça login para assinar.')
        window.location.href = '/login';
        return;
      }

      const res = await fetch(`${API}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar checkout');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar assinatura. Tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <div className="aethel-flex aethel-items-center aethel-justify-center aethel-min-h-screen">
        <div className="aethel-text-lg">Carregando planos...</div>
      </div>
    )
  }

  return (
    <div className="aethel-p-6 aethel-max-w-7xl aethel-mx-auto">
      {/* Usage Dashboard */}
      <div className="aethel-mb-8">
        <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
          <h2 className="aethel-text-xl aethel-font-bold">Consumo Atual</h2>
          <button
            onClick={() => setShowUsage(!showUsage)}
            className="aethel-text-sm aethel-text-slate-400 hover:aethel-text-white"
          >
            {showUsage ? 'Ocultar' : 'Mostrar'} detalhes
          </button>
        </div>
        {showUsage && <UsageDashboard />}
      </div>

      {/* Header */}
      <div className="aethel-text-center aethel-mb-8">
        <h1 className="aethel-text-3xl aethel-font-bold aethel-mb-2">
          Escolha seu Plano
        </h1>
        <p className="aethel-text-slate-400">
          Todos os planos incluem os 17 sistemas AAA do Engine
        </p>
        
        {/* Currency Toggle */}
        <div className="aethel-mt-4 aethel-flex aethel-justify-center aethel-gap-2">
          <button
            onClick={() => setCurrency('BRL')}
            className={`aethel-px-4 aethel-py-2 aethel-rounded ${
              currency === 'BRL' 
                ? 'aethel-bg-indigo-600 aethel-text-white' 
                : 'aethel-bg-slate-700 aethel-text-slate-300'
            }`}
          >
            R$ BRL
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`aethel-px-4 aethel-py-2 aethel-rounded ${
              currency === 'USD' 
                ? 'aethel-bg-indigo-600 aethel-text-white' 
                : 'aethel-bg-slate-700 aethel-text-slate-300'
            }`}
          >
            $ USD
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 lg:aethel-grid-cols-5 aethel-gap-4">
        {plans.map((plan: any) => (
          <div 
            key={plan.id} 
            className={`aethel-card aethel-p-6 aethel-flex aethel-flex-col ${
              plan.popular ? 'aethel-border-2 aethel-border-indigo-500 aethel-relative' : ''
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="aethel-absolute -aethel-top-3 aethel-left-1/2 aethel-transform -aethel-translate-x-1/2">
                <span className="aethel-bg-indigo-600 aethel-text-white aethel-text-xs aethel-font-bold aethel-px-3 aethel-py-1 aethel-rounded-full">
                  MAIS POPULAR
                </span>
              </div>
            )}

            {/* Plan Name */}
            <h3 className="aethel-text-xl aethel-font-bold aethel-mb-1">
              {plan.name}
            </h3>
            <p className="aethel-text-sm aethel-text-slate-400 aethel-mb-4">
              {plan.description}
            </p>

            {/* Price */}
            <div className="aethel-mb-4">
              <span className="aethel-text-3xl aethel-font-bold">
                {currency === 'BRL' ? `R$${plan.priceBRL}` : `$${plan.price}`}
              </span>
              <span className="aethel-text-slate-400">/mês</span>
            </div>

            {/* Tokens */}
            <div className="aethel-mb-4 aethel-p-3 aethel-bg-slate-800 aethel-rounded">
              <span className="aethel-text-2xl aethel-font-bold aethel-text-indigo-400">
                {formatTokens(plan.limits?.tokensPerMonth || 0)}
              </span>
              <span className="aethel-text-slate-400 aethel-text-sm"> tokens/mês</span>
            </div>

            {/* Features */}
            <ul className="aethel-flex-1 aethel-space-y-2 aethel-mb-4">
              {plan.features?.slice(0, 6).map((feature: string) => (
                <li key={feature} className="aethel-flex aethel-items-start aethel-gap-2 aethel-text-sm">
                  <span className="aethel-text-green-500">✓</span>
                  <span className="aethel-text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={selectedPlan === plan.id}
              className={`aethel-w-full aethel-py-3 aethel-rounded aethel-font-bold aethel-transition ${
                plan.popular
                  ? 'aethel-bg-indigo-600 hover:aethel-bg-indigo-700 aethel-text-white'
                  : 'aethel-bg-slate-700 hover:aethel-bg-slate-600 aethel-text-white'
              } ${selectedPlan === plan.id ? 'aethel-opacity-50' : ''}`}
            >
              {selectedPlan === plan.id ? 'Processando...' : 'Começar agora'}
            </button>
          </div>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="aethel-mt-8 aethel-text-center">
        <p className="aethel-text-slate-400 aethel-text-sm">
          💡 Todos os planos incluem LivePreview 3D, Physics, Animation e todos os 17 sistemas AAA.
          <br />
          A diferença está no volume de IA e modelos disponíveis.
        </p>
        <p className="aethel-mt-2 aethel-text-slate-500 aethel-text-xs">
          Pagamento seguro via Stripe • Cancele quando quiser • Upgrade/downgrade a qualquer momento
        </p>
      </div>
    </div>
  )
}

/**
 * Billing Plans API - Aethel Engine
 * GET /api/billing/plans - List all available plans
 * 
 * Planos alinhados com análise estratégica 2025
 * ZERO PREJUÍZO - Margem mínima 89%
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Planos definitivos - alinhados com custos reais
 * Todos os planos incluem os 17 sistemas AAA do Engine
 * Diferença está apenas no volume de IA e features extras
 */
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 3,
    priceBRL: 15,
    currency: 'USD',
    interval: 'month',
    description: 'Para iniciantes e projetos pessoais',
    features: [
      '500K tokens IA/mês',
      '3 projetos',
      '500 MB storage',
      'Gemini Flash + DeepSeek',
      '17 sistemas AAA inclusos',
      'LivePreview 3D',
      'Suporte comunidade',
    ],
    limits: {
      projects: 3,
      storage: 500 * 1024 * 1024, // 500 MB
      collaborators: 0,
      tokensPerMonth: 500_000,
      tokensPerDay: 20_000,
      requestsPerHour: 30,
      concurrent: 1,
      contextWindow: 8000,
      historyDays: 7,
    },
    allowedModels: ['gemini-1.5-flash', 'deepseek-v3'],
    allowedDomains: ['code'],
    allowedAgents: ['coder', 'universal'],
    // Economia: custo $0.10, receita $3, margem 96.7%
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9,
    priceBRL: 45,
    currency: 'USD',
    interval: 'month',
    description: 'Para desenvolvedores ativos',
    features: [
      '2M tokens IA/mês',
      '10 projetos',
      '2 GB storage',
      '4 modelos de IA',
      'Todos os agents básicos',
      'Domínio Research',
      'Histórico 30 dias',
      'Suporte email',
    ],
    limits: {
      projects: 10,
      storage: 2 * 1024 * 1024 * 1024, // 2 GB
      collaborators: 2,
      tokensPerMonth: 2_000_000,
      tokensPerDay: 100_000,
      requestsPerHour: 60,
      concurrent: 2,
      contextWindow: 16000,
      historyDays: 30,
    },
    allowedModels: ['gemini-1.5-flash', 'deepseek-v3', 'gpt-4o-mini', 'claude-3-haiku'],
    allowedDomains: ['code', 'research'],
    allowedAgents: ['coder', 'universal', 'architect', 'researcher'],
    // Economia: custo $0.55, receita $9, margem 93.9%
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceBRL: 149,
    currency: 'USD',
    interval: 'month',
    popular: true,
    description: 'Para profissionais e freelancers',
    features: [
      '8M tokens IA/mês',
      'Projetos ilimitados',
      '10 GB storage',
      'Modelos premium (GPT-4o, Claude)',
      'Todos os agents',
      'Todos os domínios',
      'API access',
      'Priority queue',
      'Suporte prioritário',
    ],
    limits: {
      projects: -1, // unlimited
      storage: 10 * 1024 * 1024 * 1024, // 10 GB
      collaborators: 5,
      tokensPerMonth: 8_000_000,
      tokensPerDay: 400_000,
      requestsPerHour: 120,
      concurrent: 5,
      contextWindow: 32000,
      historyDays: 90,
    },
    allowedModels: ['all-ultra', 'all-balanced'],
    allowedDomains: ['code', 'research', 'trading', 'creative'],
    allowedAgents: ['all-standard'],
    extras: {
      priorityQueue: true,
      apiAccess: true,
    },
    // Economia: custo $3.12, receita $29, margem 89.2%
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 79,
    priceBRL: 399,
    currency: 'USD',
    interval: 'month',
    description: 'Para times e studios',
    features: [
      '25M tokens IA/mês',
      'Projetos ilimitados',
      '50 GB storage',
      'Todos os modelos incluindo premium',
      'Agents customizados',
      '3 seats inclusos',
      'Webhooks',
      'Histórico 180 dias',
      'Suporte dedicado',
    ],
    limits: {
      projects: -1,
      storage: 50 * 1024 * 1024 * 1024, // 50 GB
      collaborators: 10,
      tokensPerMonth: 25_000_000,
      tokensPerDay: 1_000_000,
      requestsPerHour: 300,
      concurrent: 10,
      contextWindow: 64000,
      historyDays: 180,
    },
    allowedModels: ['all'],
    allowedDomains: ['all'],
    allowedAgents: ['all', 'custom'],
    extras: {
      priorityQueue: true,
      apiAccess: true,
      teamSeats: 3,
      webhooks: true,
    },
    // Economia: custo $8.23, receita $79, margem 89.6%
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceBRL: 999,
    currency: 'USD',
    interval: 'month',
    description: 'Para empresas e grandes times',
    features: [
      '100M tokens IA/mês',
      'Tudo ilimitado',
      '200 GB storage',
      'Custom fine-tuned models',
      'Agents privados',
      '10 seats inclusos',
      'SSO & SAML',
      'Audit logs',
      'SLA 99.9%',
      'On-premise option',
      'Suporte 24/7',
    ],
    limits: {
      projects: -1,
      storage: 200 * 1024 * 1024 * 1024, // 200 GB
      collaborators: -1,
      tokensPerMonth: 100_000_000,
      tokensPerDay: -1, // unlimited
      requestsPerHour: -1, // unlimited
      concurrent: -1, // unlimited
      contextWindow: 128000,
      historyDays: 365,
    },
    allowedModels: ['all', 'custom-fine-tuned'],
    allowedDomains: ['all', 'custom'],
    allowedAgents: ['all', 'custom', 'private'],
    extras: {
      sso: true,
      auditLogs: true,
      dedicatedSupport: true,
      sla: '99.9%',
      customIntegrations: true,
      onPremiseOption: true,
      teamSeats: 10,
    },
    // Economia: custo $15.94, receita $199, margem 92.0%
  },
];

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      plans: PLANS,
      success: true,
      currency: {
        default: 'USD',
        available: ['USD', 'BRL'],
        rates: { BRL: 5.0 }, // Taxa aproximada
      },
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

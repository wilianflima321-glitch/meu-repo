/**
 * Plan Limits Service - Enforcement de Limites por Plano
 * 
 * Define e verifica limites de uso para cada tier de assinatura.
 * Bloqueia uso quando quota é excedida.
 */

import { prisma } from './db';
import { getCreditBalance } from './credit-wallet';

// ============================================================================
// DEFINIÇÃO DE LIMITES POR PLANO
// ============================================================================

export interface PlanLimits {
  tokensPerMonth: number;
  requestsPerDay: number;
  projectsMax: number;
  storageGB: number;
  concurrentSessions: number;
  maxAgents: number;       // Máximo de agentes ativos (1/2/3...) por usuário/experiência
  maxTokensPerRequest: number; // Hard cap de tokens estimados por request (anti-spike)
  models: string[];        // Modelos LLM permitidos
  features: string[];      // Features habilitadas
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  // Free trial - muito limitado
  'starter_trial': {
    tokensPerMonth: 10_000,
    requestsPerDay: 20,
    projectsMax: 1,
    storageGB: 0.5,
    concurrentSessions: 1,
    maxAgents: 1,
    maxTokensPerRequest: 2_000,
    models: ['gpt-4o-mini', 'gemini-1.5-flash'],
    features: ['editor', 'preview'],
  },
  
  // Starter - $3/mês
  'starter': {
    tokensPerMonth: 100_000,
    requestsPerDay: 100,
    projectsMax: 3,
    storageGB: 2,
    concurrentSessions: 1,
    maxAgents: 1,
    maxTokensPerRequest: 4_000,
    models: ['gpt-4o-mini', 'gemini-1.5-flash', 'claude-3-5-haiku-20241022'],
    features: ['editor', 'preview', 'chat'],
  },
  
  // Basic - $9/mês
  'basic': {
    tokensPerMonth: 500_000,
    requestsPerDay: 500,
    projectsMax: 10,
    storageGB: 10,
    concurrentSessions: 2,
    maxAgents: 1,
    maxTokensPerRequest: 8_000,
    models: ['gpt-4o-mini', 'gpt-4o', 'gemini-1.5-flash', 'gemini-1.5-pro', 'claude-3-5-haiku-20241022'],
    features: ['editor', 'preview', 'chat', 'debugger', 'terminal'],
  },
  
  // Pro - $29/mês
  'pro': {
    tokensPerMonth: 2_000_000,
    requestsPerDay: 2000,
    projectsMax: 50,
    storageGB: 50,
    concurrentSessions: 5,
    maxAgents: 3,
    maxTokensPerRequest: 20_000,
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gemini-1.5-flash', 'gemini-1.5-pro', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
    features: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'git', 'collaboration', 'agents'],
  },
  
  // Studio - $79/mês
  'studio': {
    tokensPerMonth: 10_000_000,
    requestsPerDay: 10000,
    projectsMax: 200,
    storageGB: 200,
    concurrentSessions: 10,
    maxAgents: 3,
    maxTokensPerRequest: 50_000,
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gemini-1.5-flash', 'gemini-1.5-pro', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    features: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'git', 'collaboration', 'agents', 'api', 'export', 'priority-support'],
  },
  
  // Enterprise - custom
  'enterprise': {
    tokensPerMonth: 100_000_000,
    requestsPerDay: 100000,
    projectsMax: -1, // Ilimitado
    storageGB: 1000,
    concurrentSessions: 50,
    maxAgents: 10,
    maxTokensPerRequest: 200_000,
    models: ['*'], // Todos
    features: ['*'], // Todas
  },
};

// ============================================================================
// TIPOS DE VERIFICAÇÃO
// ============================================================================

export interface UsageStatus {
  allowed: boolean;
  reason?: string;
  usage: {
    tokensUsed: number;
    tokensLimit: number;
    tokensRemaining: number;
    percentUsed: number;
  };
  plan: string;
  limits: PlanLimits;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  code?: 'QUOTA_EXCEEDED' | 'MODEL_NOT_ALLOWED' | 'FEATURE_NOT_ALLOWED' | 'RATE_LIMITED' | 'CREDITS_EXHAUSTED';
}

// ============================================================================
// FUNÇÕES DE VERIFICAÇÃO
// ============================================================================

/**
 * Obtém os limites do plano do usuário
 */
export function getPlanLimits(plan: string): PlanLimits {
  // Remover sufixo _trial se existir para fallback
  const basePlan = plan.replace('_trial', '');
  return PLAN_LIMITS[plan] || PLAN_LIMITS[basePlan] || PLAN_LIMITS['starter_trial'];
}

/**
 * Verifica se o usuário pode fazer uma requisição de IA
 */
export async function checkAIQuota(userId: string, estimatedTokens: number = 1000): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  
  if (!user) {
    return { allowed: false, reason: 'Usuário não encontrado', code: 'QUOTA_EXCEEDED' };
  }
  
  const limits = getPlanLimits(user.plan);
  const usage = await getCurrentUsage(userId);
  
  // Verificar limite de tokens mensais
  if (usage.tokensUsed + estimatedTokens > limits.tokensPerMonth) {
    return {
      allowed: false,
      reason: `Limite mensal de ${limits.tokensPerMonth.toLocaleString()} tokens atingido. Upgrade seu plano para continuar.`,
      code: 'QUOTA_EXCEEDED',
    };
  }
  
  // Verificar limite de requisições diárias
  const dailyRequests = await getDailyRequestCount(userId);
  if (dailyRequests >= limits.requestsPerDay) {
    return {
      allowed: false,
      reason: `Limite diário de ${limits.requestsPerDay} requisições atingido. Tente novamente amanhã ou upgrade seu plano.`,
      code: 'RATE_LIMITED',
    };
  }

  // Entitlement de consumo (credits): bloqueia custo variavel quando saldo zera.
  // Mantemos features premium do ciclo pago, mas IA/compute depende de saldo.
  const estimatedCredits = Math.max(1, Math.ceil(Math.max(0, estimatedTokens) / 1000));
  const creditBalance = await getCreditBalance(userId);
  if (creditBalance < estimatedCredits) {
    return {
      allowed: false,
      reason: `Créditos insuficientes para esta operação (necessário: ${estimatedCredits}, saldo: ${creditBalance}).`,
      code: 'CREDITS_EXHAUSTED',
    };
  }
  
  return { allowed: true };
}

/**
 * Verifica se o usuário pode usar um modelo específico
 */
export async function checkModelAccess(userId: string, model: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  
  if (!user) {
    return { allowed: false, reason: 'Usuário não encontrado' };
  }
  
  const limits = getPlanLimits(user.plan);
  
  if (limits.models.includes('*') || limits.models.includes(model)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `O modelo ${model} não está disponível no seu plano. Modelos disponíveis: ${limits.models.join(', ')}`,
    code: 'MODEL_NOT_ALLOWED',
  };
}

/**
 * Verifica se o usuário tem acesso a uma feature
 */
export async function checkFeatureAccess(userId: string, feature: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  
  if (!user) {
    return { allowed: false, reason: 'Usuário não encontrado' };
  }
  
  const limits = getPlanLimits(user.plan);
  
  if (limits.features.includes('*') || limits.features.includes(feature)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `A feature "${feature}" não está disponível no seu plano. Faça upgrade para acessar.`,
    code: 'FEATURE_NOT_ALLOWED',
  };
}

/**
 * Obtém o uso atual do mês
 */
export async function getCurrentUsage(userId: string): Promise<{ tokensUsed: number; requestsUsed: number; storageUsedMB: number }> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const bucket = await prisma.usageBucket.findFirst({
    where: {
      userId,
      window: 'month',
      windowStart: { gte: monthStart },
    },
  });
  
  return {
    tokensUsed: bucket?.tokens || 0,
    requestsUsed: bucket?.requests || 0,
    storageUsedMB: 0, // Pending asset-ledger integration
  };
}

/**
 * Obtém contagem de requisições do dia
 */
async function getDailyRequestCount(userId: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const bucket = await prisma.usageBucket.findFirst({
    where: {
      userId,
      window: 'day',
      windowStart: { gte: dayStart, lte: dayEnd },
    },
    select: { requests: true },
  });

  return bucket?.requests ?? 0;
}

/**
 * Obtém status completo de uso para exibir ao usuário
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  
  if (!user) {
    throw new Error('Usuário não encontrado');
  }
  
  const limits = getPlanLimits(user.plan);
  const usage = await getCurrentUsage(userId);
  
  const tokensRemaining = Math.max(0, limits.tokensPerMonth - usage.tokensUsed);
  const percentUsed = (usage.tokensUsed / limits.tokensPerMonth) * 100;
  
  return {
    allowed: percentUsed < 100,
    reason: percentUsed >= 100 ? 'Limite mensal atingido' : undefined,
    usage: {
      tokensUsed: usage.tokensUsed,
      tokensLimit: limits.tokensPerMonth,
      tokensRemaining,
      percentUsed: Math.round(percentUsed * 10) / 10,
    },
    plan: user.plan,
    limits,
  };
}

/**
 * Registra uso de tokens
 */
export async function recordTokenUsage(userId: string, tokensUsed: number): Promise<void> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(23, 59, 59, 999);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  await prisma.$transaction([
    prisma.usageBucket.upsert({
      where: {
        userId_window_windowStart: {
          userId,
          window: 'month',
          windowStart: monthStart,
        }
      },
      create: {
        userId,
        window: 'month',
        windowStart: monthStart,
        windowEnd: monthEnd,
        tokens: tokensUsed,
        requests: 1,
      },
      update: {
        tokens: { increment: tokensUsed },
        requests: { increment: 1 },
      }
    }),
    prisma.usageBucket.upsert({
      where: {
        userId_window_windowStart: {
          userId,
          window: 'day',
          windowStart: dayStart,
        }
      },
      create: {
        userId,
        window: 'day',
        windowStart: dayStart,
        windowEnd: dayEnd,
        tokens: tokensUsed,
        requests: 1,
      },
      update: {
        tokens: { increment: tokensUsed },
        requests: { increment: 1 },
      }
    }),
  ]);
}



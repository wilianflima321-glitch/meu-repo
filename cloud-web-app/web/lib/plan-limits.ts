/**
 * Plan Limits Service - Enforcement de Limites por Plano
 * 
 * Define e verifica limites de uso para cada tier de assinatura.
 * Bloqueia uso quando quota é excedida.
 */

import { prisma } from './db';
import { OPENROUTER_BEST_MODELS, OPENROUTER_BUDGET_MODELS, OPENROUTER_FREE_MODELS } from './ai/openrouter-models';

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

const FREE_MODEL_IDS = OPENROUTER_FREE_MODELS.map((model) => model.id);
const BUDGET_MODEL_IDS = [...FREE_MODEL_IDS, ...OPENROUTER_BUDGET_MODELS.map((model) => model.id)];
const BEST_MODEL_IDS = OPENROUTER_BEST_MODELS.map((model) => model.id);

const STARTER_TRIAL_MODELS = [
  ...FREE_MODEL_IDS,
  'google/gemini-2.5-flash-lite',
  'google/gemini-3.1-flash-lite-preview',
  'openai/gpt-5-nano',
  'openai/gpt-5.4-nano',
  'openai/gpt-4.1-nano',
  'anthropic/claude-3.5-haiku',
];

const STARTER_MODELS = Array.from(new Set([
  ...STARTER_TRIAL_MODELS,
  'openai/gpt-5-mini',
  'openai/gpt-5.4-mini',
  'openai/gpt-4.1-mini',
  'google/gemini-2.5-flash',
]));

const PRO_BEST_MODELS = [
  'openai/gpt-5',
  'openai/gpt-5.4',
  'openai/gpt-5-codex',
  'openai/o3',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-3.7-sonnet',
  'google/gemini-2.5-pro',
  'openai/gpt-4.1',
];

const STUDIO_BEST_MODELS = BEST_MODEL_IDS.filter((model) => model !== 'openai/gpt-5.4-pro');
const PRO_MODELS = Array.from(new Set([...BUDGET_MODEL_IDS, ...PRO_BEST_MODELS]));
const STUDIO_MODELS = Array.from(new Set([...BUDGET_MODEL_IDS, ...STUDIO_BEST_MODELS]));

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  // Free - no card required, intentionally limited but useful for first value
  'free': {
    tokensPerMonth: 100_000,
    requestsPerDay: 100,
    projectsMax: 10,
    storageGB: 0.25,
    concurrentSessions: 1,
    maxAgents: 1,
    maxTokensPerRequest: 2_000,
    models: FREE_MODEL_IDS,
    features: ['editor', 'preview', 'chat'],
  },

  // Starter trial - 14-day onboarding ramp
  'starter_trial': {
    tokensPerMonth: 10_000,
    requestsPerDay: 20,
    projectsMax: 1,
    storageGB: 0.5,
    concurrentSessions: 1,
    maxAgents: 1,
    maxTokensPerRequest: 2_000,
    models: STARTER_TRIAL_MODELS,
    features: ['editor', 'preview'],
  },
  
  // Starter - $3/mês
  'starter': {
    tokensPerMonth: 500_000,
    requestsPerDay: 720,
    projectsMax: 3,
    storageGB: 0.5,
    concurrentSessions: 1,
    maxAgents: 1,
    maxTokensPerRequest: 8_000,
    models: STARTER_MODELS,
    features: ['editor', 'preview', 'chat'],
  },
  
  // Basic - $9/mês
  'basic': {
    tokensPerMonth: 2_000_000,
    requestsPerDay: 1440,
    projectsMax: 10,
    storageGB: 2,
    concurrentSessions: 2,
    maxAgents: 1,
    maxTokensPerRequest: 16_000,
    models: BUDGET_MODEL_IDS,
    features: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'research'],
  },
  
  // Pro - $29/mês
  'pro': {
    tokensPerMonth: 8_000_000,
    requestsPerDay: 2880,
    projectsMax: -1,
    storageGB: 10,
    concurrentSessions: 5,
    maxAgents: 3,
    maxTokensPerRequest: 32_000,
    models: PRO_MODELS,
    features: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'git', 'collaboration', 'agents', 'api'],
  },
  
  // Studio - $79/mês
  'studio': {
    tokensPerMonth: 25_000_000,
    requestsPerDay: 7200,
    projectsMax: -1,
    storageGB: 50,
    concurrentSessions: 10,
    maxAgents: 3,
    maxTokensPerRequest: 64_000,
    models: STUDIO_MODELS,
    features: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'git', 'collaboration', 'agents', 'api', 'export', 'priority-support', 'webhooks'],
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
    requestsUsedToday: number;
    requestsDailyLimit: number;
    requestsDailyRemaining: number;
  };
  plan: string;
  limits: PlanLimits;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  code?: 'QUOTA_EXCEEDED' | 'MODEL_NOT_ALLOWED' | 'FEATURE_NOT_ALLOWED' | 'RATE_LIMITED';
}

const MODEL_ALIASES = buildModelAliases([...BUDGET_MODEL_IDS, ...BEST_MODEL_IDS]);

function buildModelAliases(models: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const id of models) {
    const parts = id.split('/');
    if (parts.length === 2) {
      const [provider, name] = parts;
      map[id] = [
        name,
        `${provider}:${name}`,
        `openrouter:${id}`,
      ];
    } else {
      map[id] = [];
    }
  }

  // Extra compatibility aliases for common direct-provider IDs
  if (map['anthropic/claude-3.5-haiku']) {
    map['anthropic/claude-3.5-haiku'].push('claude-3-5-haiku-20241022', 'claude-3.5-haiku');
  }
  if (map['anthropic/claude-3.7-sonnet']) {
    map['anthropic/claude-3.7-sonnet'].push('claude-3-7-sonnet-20250219', 'claude-3.7-sonnet');
  }
  if (map['openai/gpt-5.4']) {
    map['openai/gpt-5.4'].push('gpt-5.4');
  }
  if (map['openai/gpt-5']) {
    map['openai/gpt-5'].push('gpt-5');
  }
  if (map['openai/gpt-5.4-mini']) {
    map['openai/gpt-5.4-mini'].push('gpt-5.4-mini');
  }
  if (map['openai/gpt-5.4-nano']) {
    map['openai/gpt-5.4-nano'].push('gpt-5.4-nano');
  }
  if (map['openai/gpt-5-mini']) {
    map['openai/gpt-5-mini'].push('gpt-5-mini');
  }
  if (map['openai/gpt-5-nano']) {
    map['openai/gpt-5-nano'].push('gpt-5-nano');
  }

  return map;
}

function normalizeModelIdentifier(model: string): string {
  const raw = String(model || '').trim();
  if (!raw) return raw;
  const colonIndex = raw.indexOf(':');
  if (colonIndex > 0 && colonIndex < raw.length - 1) {
    const prefix = raw.slice(0, colonIndex).toLowerCase();
    if (prefix === 'openai' || prefix === 'openrouter' || prefix === 'anthropic' || prefix === 'google' || prefix === 'groq') {
      return raw.slice(colonIndex + 1);
    }
  }
  return raw;
}

function expandAllowedModels(models: readonly string[]): Set<string> {
  const expanded = new Set<string>();
  for (const model of models) {
    const normalized = normalizeModelIdentifier(model);
    expanded.add(normalized);
    const aliases = MODEL_ALIASES[normalized];
    if (aliases) {
      for (const alias of aliases) {
        expanded.add(normalizeModelIdentifier(alias));
      }
    }

    for (const [canonical, aliasList] of Object.entries(MODEL_ALIASES)) {
      const normalizedAliases = aliasList.map(normalizeModelIdentifier);
      if (normalizedAliases.includes(normalized)) {
        expanded.add(canonical);
        for (const alias of normalizedAliases) {
          expanded.add(alias);
        }
      }
    }
  }
  return expanded;
}

function getUtcDayWindow(now: Date = new Date()): { start: Date; end: Date } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  return { start, end };
}

function getUtcMonthWindow(now: Date = new Date()): { start: Date; end: Date } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return { start, end };
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
  return PLAN_LIMITS[plan] || PLAN_LIMITS[basePlan] || PLAN_LIMITS['free'];
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
  const normalizedModel = normalizeModelIdentifier(model);
  const allowedModels = expandAllowedModels(limits.models);

  if (limits.models.includes('*') || allowedModels.has(normalizedModel)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `O modelo ${normalizedModel} não está disponível no seu plano. Modelos disponíveis: ${limits.models.join(', ')}`,
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
  const { start: monthStart } = getUtcMonthWindow();
  
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
  const { start: dayStart } = getUtcDayWindow();

  const bucket = await prisma.usageBucket.findFirst({
    where: {
      userId,
      window: 'day',
      windowStart: dayStart,
    },
    select: { requests: true },
  });

  return bucket?.requests || 0;
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
  const requestsUsedToday = await getDailyRequestCount(userId);
  
  const tokensRemaining = Math.max(0, limits.tokensPerMonth - usage.tokensUsed);
  const percentUsed = (usage.tokensUsed / limits.tokensPerMonth) * 100;
  const requestsDailyRemaining = Math.max(0, limits.requestsPerDay - requestsUsedToday);
  
  return {
    allowed: percentUsed < 100 && requestsUsedToday < limits.requestsPerDay,
    reason:
      percentUsed >= 100
        ? 'Limite mensal atingido'
        : requestsUsedToday >= limits.requestsPerDay
          ? 'Limite diário de requisições atingido'
          : undefined,
    usage: {
      tokensUsed: usage.tokensUsed,
      tokensLimit: limits.tokensPerMonth,
      tokensRemaining,
      percentUsed: Math.round(percentUsed * 10) / 10,
      requestsUsedToday,
      requestsDailyLimit: limits.requestsPerDay,
      requestsDailyRemaining,
    },
    plan: user.plan,
    limits,
  };
}

/**
 * Registra uso de tokens
 */
export async function recordTokenUsage(userId: string, tokensUsed: number): Promise<void> {
  const { start: monthStart, end: monthEnd } = getUtcMonthWindow();
  const { start: dayStart, end: dayEnd } = getUtcDayWindow();

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


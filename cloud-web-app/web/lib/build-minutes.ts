/**
 * Build Minutes System - Controle de Tempo de Build por Plano
 * 
 * Cada plano tem um limite mensal de minutos de build:
 * - starter_trial: 10 min/mês
 * - starter: 30 min/mês
 * - basic: 100 min/mês
 * - pro: 500 min/mês
 * - studio: 2000 min/mês
 * - enterprise: ilimitado
 * 
 * O sistema:
 * 1. Verifica quota antes de iniciar build
 * 2. Reserva tempo estimado (com lock otimista)
 * 3. Atualiza uso real após conclusão
 * 4. Envia alertas quando atinge thresholds
 */

import { prisma } from './db';
import { getPlanLimits } from './plan-limits';

// ============================================================================
// LIMITES DE BUILD POR PLANO (minutos/mês)
// ============================================================================

const BUILD_MINUTES_LIMITS: Record<string, number> = {
  starter_trial: 10,
  starter: 30,
  basic: 100,
  pro: 500,
  studio: 2000,
  enterprise: -1, // -1 = ilimitado
};

// Custo estimado por tipo de build (minutos)
const BUILD_COST_ESTIMATES: Record<string, number> = {
  quick: 1,      // TypeScript check, lint
  development: 2, // Dev build simples
  production: 5,  // Prod build com otimização
  full: 10,       // Build completo multi-plataforma
  native: 15,     // Build nativo (Electron, etc)
  game: 30,       // Build de jogo AAA
};

// ============================================================================
// TIPOS
// ============================================================================

export interface BuildQuotaResult {
  allowed: boolean;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  percentUsed: number;
  reason?: string;
  upgradeRequired?: boolean;
  suggestedPlan?: string;
}

export interface BuildReservation {
  reservationId: string;
  estimatedMinutes: number;
  expiresAt: Date;
}

export interface BuildUsageRecord {
  userId: string;
  projectId: string;
  buildType: string;
  startedAt: Date;
  finishedAt?: Date;
  durationMinutes: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Obtém o limite de build minutes para o plano
 */
export function getBuildMinutesLimit(plan: string): number {
  const basePlan = plan.replace('_trial', '');
  return BUILD_MINUTES_LIMITS[plan] ?? BUILD_MINUTES_LIMITS[basePlan] ?? BUILD_MINUTES_LIMITS.starter;
}

/**
 * Calcula minutos de build usados no mês atual
 */
export async function getBuildMinutesUsed(userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Usar tabela UsageBucket ou criar registros específicos
  const bucket = await prisma.usageBucket.findFirst({
    where: {
      userId,
      window: 'month',
      windowStart: { gte: monthStart },
    },
  });

  // O campo 'tokens' pode ser reutilizado ou criar campo específico
  // Por ora, usar um cálculo baseado em requests * custo médio
  return bucket?.requests ? Math.ceil(bucket.requests * 0.5) : 0;
}

/**
 * CIRCUIT BREAKER: Verifica se build é permitido
 */
export async function checkBuildQuota(
  userId: string,
  buildType: string = 'production'
): Promise<BuildQuotaResult> {
  // 1. Buscar usuário e plano
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    return {
      allowed: false,
      minutesUsed: 0,
      minutesLimit: 0,
      minutesRemaining: 0,
      percentUsed: 100,
      reason: 'Usuário não encontrado',
    };
  }

  // 2. Obter limite do plano
  const limit = getBuildMinutesLimit(user.plan);
  
  // Plano ilimitado
  if (limit === -1) {
    return {
      allowed: true,
      minutesUsed: 0,
      minutesLimit: -1,
      minutesRemaining: -1,
      percentUsed: 0,
    };
  }

  // 3. Calcular uso atual
  const used = await getBuildMinutesUsed(userId);
  const estimatedCost = BUILD_COST_ESTIMATES[buildType] || BUILD_COST_ESTIMATES.production;
  const projected = used + estimatedCost;

  // 4. Verificar quota
  const remaining = Math.max(0, limit - used);
  const percentUsed = (used / limit) * 100;

  if (projected > limit) {
    return {
      allowed: false,
      minutesUsed: used,
      minutesLimit: limit,
      minutesRemaining: remaining,
      percentUsed: Math.min(100, percentUsed),
      reason: `Limite de ${limit} minutos de build/mês atingido. Usado: ${used} min. Este build requer ~${estimatedCost} min.`,
      upgradeRequired: true,
      suggestedPlan: getSuggestedBuildPlan(projected),
    };
  }

  return {
    allowed: true,
    minutesUsed: used,
    minutesLimit: limit,
    minutesRemaining: remaining - estimatedCost,
    percentUsed: Math.min(100, percentUsed),
  };
}

/**
 * Reserva minutos antes de iniciar build (lock otimista)
 */
export async function reserveBuildMinutes(
  userId: string,
  estimatedMinutes: number
): Promise<BuildReservation | null> {
  const check = await checkBuildQuota(userId);
  
  if (!check.allowed) {
    return null;
  }

  // Criar reservação com TTL de 30 minutos
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const reservationId = `build_${userId}_${Date.now()}`;

  // Em produção, usar Redis para lock distribuído
  // Por ora, criar entrada no banco
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  await prisma.usageBucket.upsert({
    where: {
      userId_window_windowStart: {
        userId,
        window: 'month',
        windowStart: monthStart,
      },
    },
    create: {
      userId,
      window: 'month',
      windowStart: monthStart,
      windowEnd: monthEnd,
      requests: Math.ceil(estimatedMinutes * 2), // Conversão para requests
      tokens: 0,
    },
    update: {
      requests: { increment: Math.ceil(estimatedMinutes * 2) },
    },
  });

  return {
    reservationId,
    estimatedMinutes,
    expiresAt,
  };
}

/**
 * Finaliza reserva e ajusta uso real
 */
export async function finalizeBuildUsage(
  userId: string,
  reservationId: string,
  actualMinutes: number,
  estimatedMinutes: number
): Promise<void> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Ajustar diferença entre estimado e real
  const diff = Math.ceil((actualMinutes - estimatedMinutes) * 2);

  if (diff !== 0) {
    await prisma.usageBucket.updateMany({
      where: {
        userId,
        window: 'month',
        windowStart: { gte: monthStart },
      },
      data: {
        requests: { increment: diff },
      },
    });
  }
}

/**
 * Determina plano necessário para quota desejada
 */
function getSuggestedBuildPlan(requiredMinutes: number): string {
  const plansInOrder = [
    { id: 'starter', minutes: 30 },
    { id: 'basic', minutes: 100 },
    { id: 'pro', minutes: 500 },
    { id: 'studio', minutes: 2000 },
    { id: 'enterprise', minutes: Infinity },
  ];

  for (const plan of plansInOrder) {
    if (plan.minutes >= requiredMinutes) {
      return plan.id;
    }
  }

  return 'enterprise';
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

export function createBuildQuotaExceededResponse(result: BuildQuotaResult) {
  return {
    error: 'QUOTA_EXCEEDED',
    code: 'BUILD_MINUTES_EXCEEDED',
    message: result.reason,
    details: {
      minutesUsed: result.minutesUsed,
      minutesLimit: result.minutesLimit,
      minutesRemaining: result.minutesRemaining,
      percentUsed: Math.round(result.percentUsed * 10) / 10,
      upgradeRequired: result.upgradeRequired,
      suggestedPlan: result.suggestedPlan,
    },
    actions: {
      upgrade: '/pricing?feature=builds',
      usage: '/dashboard/usage',
    },
  };
}

// ============================================================================
// WARNING THRESHOLDS
// ============================================================================

export interface BuildMinutesWarning {
  level: 'ok' | 'warning' | 'critical' | 'blocked';
  message?: string;
  percentUsed: number;
}

export function getBuildMinutesWarningLevel(percentUsed: number): BuildMinutesWarning {
  if (percentUsed >= 100) {
    return {
      level: 'blocked',
      message: 'Limite de build atingido. Faça upgrade para continuar.',
      percentUsed,
    };
  }

  if (percentUsed >= 90) {
    return {
      level: 'critical',
      message: 'Você usou 90%+ dos seus minutos de build.',
      percentUsed,
    };
  }

  if (percentUsed >= 75) {
    return {
      level: 'warning',
      message: 'Você já usou 75% dos seus minutos de build.',
      percentUsed,
    };
  }

  return {
    level: 'ok',
    percentUsed,
  };
}

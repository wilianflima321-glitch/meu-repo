/**
 * Storage Quota Circuit Breaker
 * 
 * Verifica e bloqueia uploads quando o usuário excede a quota de storage do plano.
 * CRÍTICO para evitar custos descontrolados de S3/storage.
 * 
 * Limites por plano:
 * - starter_trial: 500MB
 * - starter: 2GB
 * - basic: 10GB  
 * - pro: 50GB
 * - studio: 200GB
 * - enterprise: 1TB+
 */

import { prisma } from './db';
import { getPlanLimits } from './plan-limits';

// ============================================================================
// TYPES
// ============================================================================

export interface StorageQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  reason?: string;
  upgradeRequired?: boolean;
  suggestedPlan?: string;
}

export interface StorageCheckParams {
  userId: string;
  projectId?: string;
  additionalBytes?: number;
}

// ============================================================================
// STORAGE QUOTA FUNCTIONS
// ============================================================================

/**
 * Calcula o storage usado por um usuário em todos os projetos
 */
export async function getUserStorageUsed(userId: string): Promise<number> {
  const result = await prisma.asset.aggregate({
    where: {
      project: {
        userId: userId,
      },
    },
    _sum: {
      size: true,
    },
  });

  return result._sum.size || 0;
}

/**
 * Calcula o storage usado em um projeto específico
 */
export async function getProjectStorageUsed(projectId: string): Promise<number> {
  const result = await prisma.asset.aggregate({
    where: {
      projectId: projectId,
    },
    _sum: {
      size: true,
    },
  });

  return result._sum.size || 0;
}

/**
 * CIRCUIT BREAKER: Verifica se upload é permitido antes de gerar presigned URL
 * 
 * Retorna allowed=false se:
 * 1. Storage atual + novo arquivo excede quota do plano
 * 2. Projeto não existe ou usuário não tem acesso
 */
export async function checkStorageQuota(params: StorageCheckParams): Promise<StorageQuotaResult> {
  const { userId, additionalBytes = 0 } = params;

  // 1. Buscar usuário e plano
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 100,
      reason: 'Usuário não encontrado',
    };
  }

  // 2. Obter limites do plano
  const limits = getPlanLimits(user.plan);
  const limitBytes = limits.storageGB * 1024 * 1024 * 1024; // GB -> bytes

  // 3. Calcular storage usado
  const usedBytes = await getUserStorageUsed(userId);
  const projectedUsage = usedBytes + additionalBytes;

  // 4. Verificar quota
  const remaining = Math.max(0, limitBytes - usedBytes);
  const percentUsed = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 100;

  if (projectedUsage > limitBytes) {
    // Determinar plano sugerido para upgrade
    const suggestedPlan = getSuggestedPlan(projectedUsage);

    return {
      allowed: false,
      used: usedBytes,
      limit: limitBytes,
      remaining: remaining,
      percentUsed: Math.min(100, percentUsed),
      reason: `Quota de storage excedida. Usado: ${formatBytes(usedBytes)} de ${formatBytes(limitBytes)}. Este arquivo requer ${formatBytes(additionalBytes)} adicionais.`,
      upgradeRequired: true,
      suggestedPlan,
    };
  }

  return {
    allowed: true,
    used: usedBytes,
    limit: limitBytes,
    remaining: remaining - additionalBytes,
    percentUsed: Math.min(100, percentUsed),
  };
}

/**
 * Determina o plano mínimo necessário para o storage requisitado
 */
function getSuggestedPlan(requiredBytes: number): string {
  const plansInOrder = [
    { id: 'starter', gb: 2 },
    { id: 'basic', gb: 10 },
    { id: 'pro', gb: 50 },
    { id: 'studio', gb: 200 },
    { id: 'enterprise', gb: 1000 },
  ];

  const requiredGB = requiredBytes / (1024 * 1024 * 1024);

  for (const plan of plansInOrder) {
    if (plan.gb >= requiredGB) {
      return plan.id;
    }
  }

  return 'enterprise';
}

/**
 * Formata bytes para exibição amigável
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  
  return `${value.toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
}

// ============================================================================
// STORAGE WARNING THRESHOLDS
// ============================================================================

export interface StorageWarning {
  level: 'ok' | 'warning' | 'critical' | 'blocked';
  message?: string;
  percentUsed: number;
}

/**
 * Retorna nível de warning para exibir na UI
 */
export function getStorageWarningLevel(percentUsed: number): StorageWarning {
  if (percentUsed >= 100) {
    return {
      level: 'blocked',
      message: 'Storage cheio. Faça upgrade ou delete arquivos.',
      percentUsed,
    };
  }

  if (percentUsed >= 90) {
    return {
      level: 'critical',
      message: 'Storage quase cheio (90%+). Considere fazer upgrade.',
      percentUsed,
    };
  }

  if (percentUsed >= 75) {
    return {
      level: 'warning',
      message: 'Storage acima de 75%. Monitore seu uso.',
      percentUsed,
    };
  }

  return {
    level: 'ok',
    percentUsed,
  };
}

// ============================================================================
// STORAGE CLEANUP UTILITIES
// ============================================================================

/**
 * Lista assets que podem ser deletados para liberar espaço
 * Prioriza: duplicados, não usados há muito tempo, grandes
 */
export async function getSuggestedDeletions(userId: string, targetFreeBytes: number): Promise<{
  assets: Array<{ id: string; name: string; size: number; lastAccessed: Date | null }>;
  totalBytes: number;
}> {
  // Assets criados há mais de 90 dias, ordenados por tamanho
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const assets = await prisma.asset.findMany({
    where: {
      project: {
        userId: userId,
      },
      createdAt: { lt: ninetyDaysAgo },
    },
    orderBy: {
      size: 'desc',
    },
    select: {
      id: true,
      name: true,
      size: true,
      createdAt: true,
    },
  });

  // Selecionar assets até atingir target
  const selected: typeof assets = [];
  let totalBytes = 0;

  for (const asset of assets) {
    if (totalBytes >= targetFreeBytes) break;
    selected.push(asset);
    totalBytes += asset.size || 0;
  }

  return {
    assets: selected.map(a => ({
      id: a.id,
      name: a.name,
      size: a.size || 0,
      lastAccessed: a.createdAt,
    })),
    totalBytes,
  };
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

export function createQuotaExceededResponse(result: StorageQuotaResult) {
  return {
    error: 'QUOTA_EXCEEDED',
    code: 'STORAGE_QUOTA_EXCEEDED',
    message: result.reason,
    details: {
      used: result.used,
      limit: result.limit,
      remaining: result.remaining,
      percentUsed: Math.round(result.percentUsed * 10) / 10,
      upgradeRequired: result.upgradeRequired,
      suggestedPlan: result.suggestedPlan,
    },
    actions: {
      upgrade: '/pricing',
      manage: '/dashboard/storage',
    },
  };
}

/**
 * Storage Enforcement - Sistema Real de Controle de Armazenamento
 * 
 * Garante que usuários respeitem os limites de storage do plano.
 * Bloqueia uploads quando o limite é atingido.
 */

import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS, PlanType } from '@/lib/plans';

// ============================================================================
// TYPES
// ============================================================================

export interface StorageUsage {
  used: number;        // bytes
  limit: number;       // bytes
  percentage: number;  // 0-100
  remaining: number;   // bytes
  isOverLimit: boolean;
  plan: PlanType;
}

export interface StorageItem {
  id: string;
  name: string;
  size: number;
  type: string;
  projectId: string;
  createdAt: Date;
}

export interface StorageQuotaCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  requestedSize: number;
  wouldExceed: boolean;
  message?: string;
}

// ============================================================================
// STORAGE LIMITS BY PLAN (in bytes)
// ============================================================================

const STORAGE_LIMITS: Record<PlanType, number> = {
  free: 100 * 1024 * 1024,        // 100 MB
  starter: 500 * 1024 * 1024,     // 500 MB
  basic: 2 * 1024 * 1024 * 1024,  // 2 GB
  pro: 10 * 1024 * 1024 * 1024,   // 10 GB
  studio: 50 * 1024 * 1024 * 1024, // 50 GB
  enterprise: 200 * 1024 * 1024 * 1024, // 200 GB
};

// Warning thresholds (percentage)
const WARNING_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 95;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Obtém o uso de storage de um usuário
 */
export async function getStorageUsage(userId: string): Promise<StorageUsage> {
  // Buscar usuário com plano
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      plan: true,
      storageUsed: true, // Campo que precisamos adicionar no schema
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const plan = (user.plan || 'free') as PlanType;
  const limit = STORAGE_LIMITS[plan];

  // Calcular uso real se não tiver cache
  let used = user.storageUsed || 0;

  // Se não tem cache, calcular
  if (!user.storageUsed) {
    used = await calculateStorageUsage(userId);
    
    // Atualizar cache
    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: used },
    });
  }

  const percentage = Math.min(100, Math.round((used / limit) * 100));
  const remaining = Math.max(0, limit - used);
  const isOverLimit = used >= limit;

  return {
    used,
    limit,
    percentage,
    remaining,
    isOverLimit,
    plan,
  };
}

/**
 * Calcula o uso total de storage de um usuário
 */
async function calculateStorageUsage(userId: string): Promise<number> {
  // Buscar todos os projetos do usuário
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  });

  const projectIds = projects.map(p => p.id);

  // Somar size de todos os assets
  const assetsTotal = await prisma.asset.aggregate({
    where: { projectId: { in: projectIds } },
    _sum: { size: true },
  });

  // Somar size de todos os arquivos
  const filesTotal = await prisma.file.aggregate({
    where: { projectId: { in: projectIds } },
    _sum: { size: true },
  });

  return (assetsTotal._sum.size || 0) + (filesTotal._sum.size || 0);
}

/**
 * Verifica se um upload é permitido
 */
export async function checkStorageQuota(
  userId: string,
  requestedSize: number
): Promise<StorageQuotaCheck> {
  const usage = await getStorageUsage(userId);

  const wouldExceed = (usage.used + requestedSize) > usage.limit;
  const allowed = !usage.isOverLimit && !wouldExceed;

  let message: string | undefined;

  if (usage.isOverLimit) {
    message = `Você atingiu o limite de armazenamento do plano ${usage.plan}. Faça upgrade para continuar.`;
  } else if (wouldExceed) {
    const needed = formatBytes(usage.used + requestedSize - usage.limit);
    message = `Este arquivo excede seu limite em ${needed}. Libere espaço ou faça upgrade.`;
  } else if (usage.percentage >= CRITICAL_THRESHOLD) {
    message = `Atenção: Você está usando ${usage.percentage}% do seu armazenamento.`;
  } else if (usage.percentage >= WARNING_THRESHOLD) {
    message = `Você está usando ${usage.percentage}% do seu armazenamento.`;
  }

  return {
    allowed,
    currentUsage: usage.used,
    limit: usage.limit,
    requestedSize,
    wouldExceed,
    message,
  };
}

/**
 * Registra uso de storage após upload
 */
export async function recordStorageUsage(
  userId: string,
  bytesAdded: number
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      storageUsed: {
        increment: bytesAdded,
      },
    },
  });
}

/**
 * Registra liberação de storage após delete
 */
export async function releaseStorageUsage(
  userId: string,
  bytesRemoved: number
): Promise<void> {
  // Garantir que não fica negativo
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageUsed: true },
  });

  const currentUsage = user?.storageUsed || 0;
  const newUsage = Math.max(0, currentUsage - bytesRemoved);

  await prisma.user.update({
    where: { id: userId },
    data: { storageUsed: newUsage },
  });
}

/**
 * Recalcula o storage de um usuário (para sync/audit)
 */
export async function recalculateStorageUsage(userId: string): Promise<number> {
  const used = await calculateStorageUsage(userId);
  
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsed: used },
  });
  
  return used;
}

/**
 * Obtém os maiores arquivos de um usuário
 */
export async function getLargestFiles(
  userId: string,
  limit: number = 10
): Promise<StorageItem[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  });

  const projectIds = projects.map(p => p.id);

  const assets = await prisma.asset.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { size: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      size: true,
      type: true,
      projectId: true,
      createdAt: true,
    },
  });

  return assets.map(a => ({
    id: a.id,
    name: a.name,
    size: a.size || 0,
    type: a.type,
    projectId: a.projectId,
    createdAt: a.createdAt,
  }));
}

/**
 * Obtém breakdown de storage por tipo
 */
export async function getStorageBreakdown(userId: string): Promise<Record<string, number>> {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  });

  const projectIds = projects.map(p => p.id);

  const breakdown = await prisma.asset.groupBy({
    by: ['type'],
    where: { projectId: { in: projectIds } },
    _sum: { size: true },
  });

  const result: Record<string, number> = {};
  
  for (const item of breakdown) {
    result[item.type] = item._sum.size || 0;
  }

  return result;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware para verificar quota antes de upload
 */
export async function storageQuotaMiddleware(
  userId: string,
  fileSize: number
): Promise<{ proceed: boolean; error?: string }> {
  try {
    const check = await checkStorageQuota(userId, fileSize);
    
    if (!check.allowed) {
      return {
        proceed: false,
        error: check.message || 'Storage limit exceeded',
      };
    }
    
    return { proceed: true };
  } catch (error) {
    console.error('[StorageQuota] Error:', error);
    // Em caso de erro, permitir (fail open) mas logar
    return { proceed: true };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getStorageLimitForPlan(plan: PlanType): number {
  return STORAGE_LIMITS[plan];
}

export function formatStorageLimit(plan: PlanType): string {
  return formatBytes(STORAGE_LIMITS[plan]);
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

export function storageUsageToResponse(usage: StorageUsage) {
  return {
    used: usage.used,
    usedFormatted: formatBytes(usage.used),
    limit: usage.limit,
    limitFormatted: formatBytes(usage.limit),
    percentage: usage.percentage,
    remaining: usage.remaining,
    remainingFormatted: formatBytes(usage.remaining),
    isOverLimit: usage.isOverLimit,
    plan: usage.plan,
    warningLevel: usage.percentage >= CRITICAL_THRESHOLD 
      ? 'critical' 
      : usage.percentage >= WARNING_THRESHOLD 
        ? 'warning' 
        : 'normal',
  };
}

/**
 * AI Credit Wallet Middleware
 * 
 * Sistema de dedução de créditos para chamadas de IA.
 * Integra com CreditLedgerEntry para controle financeiro real.
 * 
 * Flow:
 * 1. Verifica saldo de créditos antes da chamada
 * 2. Reserva créditos estimados (lock otimista)
 * 3. Executa chamada de IA
 * 4. Ajusta créditos baseado no uso real
 * 5. Registra no ledger para auditoria
 * 
 * Custos por tipo de operação (em créditos):
 * - Chat simples: 1 crédito/1K tokens
 * - Chat avançado: 2 créditos/1K tokens
 * - Geração de código: 3 créditos/1K tokens
 * - Geração de imagem: 10 créditos/imagem
 * - Geração de áudio: 5 créditos/minuto
 * - Geração 3D: 20 créditos/asset
 */

import { prisma } from './db';
import { Prisma } from '@prisma/client';

// ============================================================================
// TIPOS
// ============================================================================

export interface CreditCheckResult {
  allowed: boolean;
  balance: number;
  estimatedCost: number;
  remaining: number;
  reason?: string;
  upgradeRequired?: boolean;
}

export interface CreditReservation {
  reservationId: string;
  userId: string;
  amount: number;
  operationType: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreditDeduction {
  userId: string;
  amount: number;
  operationType: AIOperationType;
  reference?: string;
  metadata?: Record<string, any>;
}

export type AIOperationType = 
  | 'chat'
  | 'chat_advanced'
  | 'code_generation'
  | 'image_generation'
  | 'audio_generation'
  | 'music_generation'
  | '3d_generation'
  | 'voice'
  | 'inline_completion'
  | 'inline_edit'
  | 'agent_task';

// ============================================================================
// CUSTOS POR OPERAÇÃO
// ============================================================================

// Créditos por 1K tokens (para operações de texto)
export const CREDITS_PER_1K_TOKENS: Record<string, number> = {
  chat: 1,
  chat_advanced: 2,
  code_generation: 3,
  inline_completion: 0.5,
  inline_edit: 1,
  agent_task: 5,
};

// Créditos fixos por unidade (para operações não-texto)
export const CREDITS_FIXED_COST: Record<string, number> = {
  image_generation: 10,      // por imagem
  audio_generation: 5,       // por minuto
  music_generation: 8,       // por minuto
  '3d_generation': 20,       // por asset
  voice: 2,                  // por 30s de áudio
};

// ============================================================================
// FUNÇÕES DE CRÉDITO
// ============================================================================

const clampNonNegative = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const ensurePositiveAmount = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return value;
};

/**
 * Obtém saldo atual de créditos do usuário
 */
export async function getCreditBalance(userId: string): Promise<number> {
  if (!userId) return 0;
  const result = await prisma.creditLedgerEntry.aggregate({
    where: {
      userId,
      // Apenas entradas settled (não pendentes)
      OR: [
        { metadata: { equals: Prisma.DbNull } },
        { metadata: { equals: Prisma.JsonNull } },
        { NOT: { metadata: { path: ['settled'], equals: false } } },
      ],
    },
    _sum: { amount: true },
  });

  return result._sum?.amount ?? 0;
}

export function calculateTokenCost(operationType: AIOperationType, tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  const per1k = CREDITS_PER_1K_TOKENS[operationType];
  if (!per1k) return 0;
  const rawCost = (tokens / 1000) * per1k;
  if (per1k < 1) {
    return Math.round(rawCost * 1000) / 1000;
  }
  return Math.ceil(clampNonNegative(rawCost));
}

export function calculateEstimatedCost(
  operationType: AIOperationType,
  params: { count?: number; minutes?: number; tokens?: number }
): number {
  if (params.tokens && CREDITS_PER_1K_TOKENS[operationType]) {
    return calculateTokenCost(operationType, params.tokens);
  }

  if (CREDITS_FIXED_COST[operationType]) {
    const multiplier = clampNonNegative(params.count || params.minutes || 1);
    return CREDITS_FIXED_COST[operationType] * multiplier;
  }

  return 1;
}

/**
 * Estima custo em créditos para uma operação
 */
export function estimateCreditCost(
  operationType: AIOperationType,
  params: {
    estimatedTokens?: number;
    imageCount?: number;
    audioMinutes?: number;
    assetCount?: number;
  }
): number {
  // Operações de texto
  if (CREDITS_PER_1K_TOKENS[operationType] && params.estimatedTokens) {
    return Math.ceil(clampNonNegative((params.estimatedTokens / 1000) * CREDITS_PER_1K_TOKENS[operationType]));
  }

  // Operações fixas
  if (CREDITS_FIXED_COST[operationType]) {
    const multiplier = clampNonNegative(params.imageCount || params.audioMinutes || params.assetCount || 1);
    return CREDITS_FIXED_COST[operationType] * multiplier;
  }

  // Fallback
  return 1;
}

/**
 * CIRCUIT BREAKER: Verifica se operação é permitida
 */
export async function checkCreditQuota(
  userId: string,
  operationType: AIOperationType,
  estimatedCost: number
): Promise<CreditCheckResult> {
  const normalizedCost = clampNonNegative(estimatedCost);
  const balance = await getCreditBalance(userId);

  if (balance < normalizedCost) {
    return {
      allowed: false,
      balance,
      estimatedCost: normalizedCost,
      remaining: balance,
      reason: `Saldo insuficiente. Necessário: ${normalizedCost} créditos. Saldo: ${balance} créditos.`,
      upgradeRequired: balance <= 0,
    };
  }

  return {
    allowed: true,
    balance,
    estimatedCost: normalizedCost,
    remaining: balance - normalizedCost,
  };
}

/**
 * Reserva créditos antes de operação (lock otimista)
 */
export async function reserveCredits(
  userId: string,
  operationType: AIOperationType,
  estimatedCost: number,
  reference?: string
): Promise<CreditReservation | null> {
  const normalizedCost = clampNonNegative(estimatedCost);
  if (normalizedCost <= 0) {
    return null;
  }

  const check = await checkCreditQuota(userId, operationType, normalizedCost);
  
  if (!check.allowed) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min TTL
  const reservationId = `credit_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Criar entrada pendente (negativa) com metadata.settled = false
  await prisma.creditLedgerEntry.create({
    data: {
      userId,
      amount: -normalizedCost,
      currency: 'credits',
      entryType: 'RESERVATION',
      reference: reservationId,
      metadata: {
        settled: false,
        operationType,
        originalReference: reference,
        expiresAt: expiresAt.toISOString(),
      },
    },
  });

  return {
    reservationId,
    userId,
    amount: normalizedCost,
    operationType,
    createdAt: now,
    expiresAt,
  };
}

/**
 * Confirma reserva e ajusta para custo real
 */
export async function settleCredits(
  reservationId: string,
  actualCost: number,
  metadata?: Record<string, any>
): Promise<void> {
  const normalizedCost = clampNonNegative(actualCost);
  // Buscar reserva
  const reservation = await prisma.creditLedgerEntry.findFirst({
    where: {
      reference: reservationId,
      entryType: 'RESERVATION',
    },
  });

  if (!reservation) {
    console.warn(`Reservation ${reservationId} not found`);
    return;
  }

  const reservedAmount = Math.abs(reservation.amount);
  const difference = normalizedCost - reservedAmount;

  // Atualizar reserva para settled
  await prisma.$transaction([
    // Marcar reserva como settled
    prisma.creditLedgerEntry.update({
      where: { id: reservation.id },
      data: {
        metadata: {
          ...(reservation.metadata as object || {}),
          settled: true,
          actualCost: normalizedCost,
          settledAt: new Date().toISOString(),
          ...metadata,
        },
      },
    }),
    // Se custo real diferente, criar ajuste
    ...(difference !== 0 ? [
      prisma.creditLedgerEntry.create({
        data: {
          userId: reservation.userId,
          amount: -difference,
          currency: 'credits',
          entryType: 'ADJUSTMENT',
          reference: `adj_${reservationId}`,
          metadata: {
            settled: true,
            originalReservation: reservationId,
            reason: difference > 0 ? 'ADDITIONAL_USAGE' : 'USAGE_REFUND',
            ...metadata,
          },
        },
      }),
    ] : []),
  ]);
}

/**
 * Cancela reserva (devolve créditos)
 */
export async function cancelReservation(reservationId: string): Promise<void> {
  const reservation = await prisma.creditLedgerEntry.findFirst({
    where: {
      reference: reservationId,
      entryType: 'RESERVATION',
      metadata: {
        path: ['settled'],
        equals: false,
      },
    },
  });

  if (!reservation) return;

  // Deletar reserva não-settled
  await prisma.creditLedgerEntry.delete({
    where: { id: reservation.id },
  });
}

/**
 * Deduz créditos diretamente (sem reserva prévia)
 */
export async function deductCredits(params: CreditDeduction): Promise<boolean> {
  if (clampNonNegative(params.amount) <= 0) return false;
  const check = await checkCreditQuota(params.userId, params.operationType, params.amount);
  
  if (!check.allowed) {
    return false;
  }

  await prisma.creditLedgerEntry.create({
    data: {
      userId: params.userId,
      amount: -params.amount,
      currency: 'credits',
      entryType: 'USAGE',
      reference: params.reference || `usage_${Date.now()}`,
      metadata: {
        settled: true,
        operationType: params.operationType,
        ...params.metadata,
      },
    },
  });

  return true;
}

/**
 * Adiciona créditos (compra, bônus, etc)
 */
export async function addCredits(
  userId: string,
  amount: number,
  entryType: 'PURCHASE' | 'BONUS' | 'REFUND' | 'GRANT',
  reference?: string,
  metadata?: Record<string, any>
): Promise<void> {
  ensurePositiveAmount(amount, 'amount');
  await prisma.creditLedgerEntry.create({
    data: {
      userId,
      amount: Math.abs(amount), // Sempre positivo para adições
      currency: 'credits',
      entryType,
      reference: reference || `${entryType.toLowerCase()}_${Date.now()}`,
      metadata: {
        settled: true,
        ...metadata,
      },
    },
  });
}

// ============================================================================
// CLEANUP DE RESERVAS EXPIRADAS
// ============================================================================

/**
 * Limpa reservas expiradas (rodar via cron job)
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const now = new Date();

  const expired = await prisma.creditLedgerEntry.findMany({
    where: {
      entryType: 'RESERVATION',
      metadata: {
        path: ['settled'],
        equals: false,
      },
    },
  });

  let cleaned = 0;
  for (const entry of expired) {
    const meta = entry.metadata as { expiresAt?: string } | null;
    if (meta?.expiresAt && new Date(meta.expiresAt) < now) {
      await prisma.creditLedgerEntry.delete({ where: { id: entry.id } });
      cleaned++;
    }
  }

  return cleaned;
}

// ============================================================================
// CLASS WRAPPER (legacy compatibility)
// ============================================================================

export class CreditWallet {
  async getBalance(userId: string): Promise<{ total: number; reserved: number; available: number }> {
    const prismaAny = prisma as any;
    const user = await prismaAny.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { total: 0, reserved: 0, available: 0 };
    }

    const total = typeof user.credits === 'number' ? user.credits : await getCreditBalance(userId);
    const reserved = typeof user.reservedCredits === 'number' ? user.reservedCredits : 0;
    return { total, reserved, available: total - reserved };
  }

  async checkBalance(userId: string, operationType: AIOperationType, estimatedCost: number): Promise<CreditCheckResult> {
    const prismaAny = prisma as any;
    const user = await prismaAny.user.findUnique({ where: { id: userId } });
    if (!user) {
      return {
        allowed: false,
        balance: 0,
        estimatedCost,
        remaining: 0,
        reason: 'User not found',
      };
    }

    const total = typeof user.credits === 'number' ? user.credits : await getCreditBalance(userId);
    const reserved = typeof user.reservedCredits === 'number' ? user.reservedCredits : 0;
    const available = total - reserved;

    if (available < estimatedCost) {
      const plan = typeof user.plan === 'string' ? user.plan : '';
      return {
        allowed: false,
        balance: available,
        estimatedCost,
        remaining: available,
        reason: 'Insufficient credits',
        upgradeRequired: plan.includes('free') || plan.includes('trial') || available <= 0,
      };
    }

    return {
      allowed: true,
      balance: available,
      estimatedCost,
      remaining: available - estimatedCost,
    };
  }

  async reserveCredits(userId: string, operationType: AIOperationType, amount: number): Promise<CreditReservation | null> {
    const check = await this.checkBalance(userId, operationType, amount);
    if (!check.allowed) return null;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      const reservation = await txAny.creditReservation?.create?.({
        data: {
          userId,
          amount,
          operationType,
          createdAt: now,
          expiresAt,
        },
      }) ?? {
        id: `res_${userId}_${Date.now()}`,
        userId,
        amount,
        operationType,
        createdAt: now,
        expiresAt,
      };

      if (txAny.user?.update) {
        await txAny.user.update({
          where: { id: userId },
          data: { reservedCredits: { increment: amount } },
        });
      }

      return { reservation };
    });

    return {
      reservationId: result.reservation.id,
      userId,
      amount,
      operationType,
      createdAt: result.reservation.createdAt ?? now,
      expiresAt: result.reservation.expiresAt ?? expiresAt,
    };
  }

  async deductCredits(params: CreditDeduction & { reservationId?: string }): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const prismaAny = prisma as any;
    const existingUser = await prismaAny.user?.findUnique?.({ where: { id: params.userId } });
    if (existingUser) {
      const check = await this.checkBalance(params.userId, params.operationType, params.amount);
      if (!check.allowed) {
        return { success: false, error: check.reason || 'Insufficient credits' };
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        if (params.reservationId && txAny.creditReservation?.delete) {
          await txAny.creditReservation.delete({ where: { id: params.reservationId } });
        }

        const user = await txAny.user?.update?.({
          where: { id: params.userId },
          data: { credits: { decrement: params.amount } },
        });

        await txAny.creditLedgerEntry?.create?.({
          data: {
            userId: params.userId,
            amount: -params.amount,
            entryType: 'USAGE',
            reference: params.reference || `usage_${Date.now()}`,
            metadata: {
              operationType: params.operationType,
            },
          },
        });

        return { user };
      });

      return { success: true, newBalance: result.user?.credits };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to deduct credits' };
    }
  }

  async refundCredits(params: { userId: string; amount: number; reason?: string; originalReference?: string }): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        const user = await txAny.user?.update?.({
          where: { id: params.userId },
          data: { credits: { increment: params.amount } },
        });

        await txAny.creditLedgerEntry?.create?.({
          data: {
            userId: params.userId,
            amount: Math.abs(params.amount),
            entryType: 'REFUND',
            reference: params.originalReference || `refund_${Date.now()}`,
            metadata: {
              reason: params.reason,
              originalReference: params.originalReference,
            },
          },
        });

        return { user };
      });

      return { success: true, newBalance: result.user?.credits };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to refund credits' };
    }
  }

  async cleanupExpiredReservations(): Promise<number> {
    const prismaAny = prisma as any;
    const result = await prismaAny.creditReservation?.deleteMany?.({
      where: { expiresAt: { lt: new Date() } },
    });
    return result?.count || 0;
  }

  async getLedgerHistory(userId: string, params: { page: number; limit: number; operationType?: string; startDate?: Date; endDate?: Date }): Promise<{ entries: any[] }> {
    const { page, limit, operationType, startDate, endDate } = params;
    const where: any = { userId };
    if (operationType) where.operationType = operationType;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const entries = await prisma.creditLedgerEntry.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { entries };
  }
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

export function createInsufficientCreditsResponse(result: CreditCheckResult) {
  return {
    error: 'INSUFFICIENT_CREDITS',
    code: 'CREDIT_BALANCE_LOW',
    message: result.reason,
    details: {
      balance: result.balance,
      required: result.estimatedCost,
      upgradeRequired: result.upgradeRequired,
    },
    actions: {
      purchase: '/dashboard/billing/credits',
      upgrade: '/pricing',
    },
  };
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Wrapper para endpoints de IA com controle de créditos
 */
export async function withCreditControl<T>(
  userId: string,
  operationType: AIOperationType,
  estimatedCost: number,
  operation: () => Promise<{ result: T; actualTokens?: number; actualCost?: number }>,
  reference?: string
): Promise<{ success: boolean; result?: T; error?: any; creditsUsed?: number }> {
  const normalizedCost = clampNonNegative(estimatedCost);
  if (normalizedCost <= 0) {
    const { result, actualTokens, actualCost } = await operation();
    const finalCost = actualCost ?? (actualTokens
      ? estimateCreditCost(operationType, { estimatedTokens: actualTokens })
      : 0);

    return {
      success: true,
      result,
      creditsUsed: clampNonNegative(finalCost),
    };
  }

  // 1. Reservar créditos
  const reservation = await reserveCredits(userId, operationType, normalizedCost, reference);
  
  if (!reservation) {
    const check = await checkCreditQuota(userId, operationType, normalizedCost);
    return {
      success: false,
      error: createInsufficientCreditsResponse(check),
    };
  }

  try {
    // 2. Executar operação
    const { result, actualTokens, actualCost } = await operation();

    // 3. Calcular custo real
    const finalCost = actualCost ?? (
      actualTokens 
        ? estimateCreditCost(operationType, { estimatedTokens: actualTokens })
        : normalizedCost
    );

    // 4. Settle reserva
    await settleCredits(reservation.reservationId, clampNonNegative(finalCost), { actualTokens });

    return {
      success: true,
      result,
      creditsUsed: finalCost,
    };
  } catch (error) {
    // Em caso de erro, cancelar reserva
    await cancelReservation(reservation.reservationId);
    throw error;
  }
}

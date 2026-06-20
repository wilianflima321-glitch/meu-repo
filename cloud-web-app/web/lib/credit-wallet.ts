import { logger } from '@/lib/observability/logger';
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
import type { CreditCheckResult, CreditDeduction, CreditMetadata, CreditReservation } from './credit-wallet-types';
import {
  clampNonNegative,
  ensurePositiveAmount,
  estimateCreditCost,
} from './credit-wallet-costs';
import type { AIOperationType } from './credit-wallet-costs';
export {
  CREDITS_FIXED_COST,
  CREDITS_PER_1K_TOKENS,
  calculateEstimatedCost,
  calculateTokenCost,
  estimateCreditCost,
} from './credit-wallet-costs';
export type { AIOperationType } from './credit-wallet-costs';
export type { CreditCheckResult, CreditDeduction, CreditMetadata, CreditReservation } from './credit-wallet-types';
export { CreditWallet } from './credit-wallet-legacy';

/**
 * Obtém saldo atual de créditos do usuário
 */
export async function getCreditBalance(userId: string, client: any = prisma): Promise<number> {
  if (!userId) return 0;
  const now = new Date();

  // Sum of all settled entries
  const settledResult = await client.creditLedgerEntry.aggregate({
    where: {
      userId,
      OR: [
        { metadata: { equals: Prisma.DbNull } },
        { metadata: { equals: Prisma.JsonNull } },
        { NOT: { metadata: { path: ['settled'], equals: false } } },
      ],
    },
    _sum: { amount: true },
  });

  // Fetch active (unsettled and not expired) reservations
  const activeReservationsResult = await client.creditLedgerEntry.findMany({
    where: {
      userId,
      entryType: 'RESERVATION',
      metadata: {
        path: ['settled'],
        equals: false,
      },
    },
    select: { amount: true, metadata: true },
  });

  const activeReservationsTotal = activeReservationsResult
    .filter((entry: any) => {
      const meta = entry.metadata as any;
      if (meta && typeof meta === 'object' && meta.expiresAt) {
        return new Date(meta.expiresAt) > now;
      }
      return false;
    })
    .reduce((sum: number, entry: any) => sum + entry.amount, 0);

  return (settledResult._sum?.amount ?? 0) + activeReservationsTotal;
}

export async function checkCreditQuota(
  userId: string,
  operationType: AIOperationType,
  estimatedCost: number,
  client: any = prisma
): Promise<CreditCheckResult> {
  const normalizedCost = clampNonNegative(estimatedCost);
  const balance = await getCreditBalance(userId, client);

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

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min TTL
  const reservationId = `credit_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return await prisma.$transaction(async (tx) => {
    // 1. Mutex: Lock the user row to prevent TOCTOU race conditions
    await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

    const check = await checkCreditQuota(userId, operationType, normalizedCost, tx);

    if (!check.allowed) {
      return null;
    }

    // Criar entrada pendente (negativa) com metadata.settled = false
    await tx.creditLedgerEntry.create({
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
      reference,
    };
  });
}

export async function settleCredits(
  reservationId: string,
  actualCost: number,
  metadata?: CreditMetadata
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
    logger.warn(`Reservation ${reservationId} not found`);
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

  return await prisma.$transaction(async (tx) => {
    // Lock the user row to prevent TOCTOU race conditions
    await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${params.userId} FOR UPDATE`;

    const check = await checkCreditQuota(params.userId, params.operationType, params.amount, tx);

    if (!check.allowed) {
      return false;
    }

    await tx.creditLedgerEntry.create({
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
  });
}

/**
 * Adiciona créditos (compra, bônus, etc)
 */
export async function addCredits(
  userId: string,
  amount: number,
  entryType: 'PURCHASE' | 'BONUS' | 'REFUND' | 'GRANT',
  reference?: string,
  metadata?: CreditMetadata
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
): Promise<{ success: boolean; result?: T; error?: unknown; creditsUsed?: number }> {
  const normalizedCost = clampNonNegative(estimatedCost);

  // BYOK Bypass
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { byokKey: true }
  });

  if (user?.byokKey || normalizedCost <= 0) {
    const { result, actualTokens, actualCost } = await operation();
    const finalCost = actualCost ?? (actualTokens
      ? estimateCreditCost(operationType, { estimatedTokens: actualTokens })
      : 0);

    return {
      success: true,
      result,
      creditsUsed: user?.byokKey ? 0 : clampNonNegative(finalCost),
    };
  }

  // 1. Reservar créditos
  const reservation = await reserveCredits(userId, operationType, normalizedCost, reference);

  if (!reservation) {
    // Para retornar a resposta de erro rica, chamamos checkCreditQuota novamente (somente leitura)
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

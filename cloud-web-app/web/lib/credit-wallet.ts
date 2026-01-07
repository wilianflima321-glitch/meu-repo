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
const CREDITS_PER_1K_TOKENS: Record<string, number> = {
  chat: 1,
  chat_advanced: 2,
  code_generation: 3,
  inline_completion: 0.5,
  inline_edit: 1,
  agent_task: 5,
};

// Créditos fixos por unidade (para operações não-texto)
const FIXED_CREDITS: Record<string, number> = {
  image_generation: 10,      // por imagem
  audio_generation: 5,       // por minuto
  music_generation: 8,       // por minuto
  '3d_generation': 20,       // por asset
  voice: 2,                  // por 30s de áudio
};

// ============================================================================
// FUNÇÕES DE CRÉDITO
// ============================================================================

/**
 * Obtém saldo atual de créditos do usuário
 */
export async function getCreditBalance(userId: string): Promise<number> {
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
    return Math.ceil((params.estimatedTokens / 1000) * CREDITS_PER_1K_TOKENS[operationType]);
  }

  // Operações fixas
  if (FIXED_CREDITS[operationType]) {
    const multiplier = params.imageCount || params.audioMinutes || params.assetCount || 1;
    return FIXED_CREDITS[operationType] * multiplier;
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
  const balance = await getCreditBalance(userId);

  if (balance < estimatedCost) {
    return {
      allowed: false,
      balance,
      estimatedCost,
      remaining: balance,
      reason: `Saldo insuficiente. Necessário: ${estimatedCost} créditos. Saldo: ${balance} créditos.`,
      upgradeRequired: balance <= 0,
    };
  }

  return {
    allowed: true,
    balance,
    estimatedCost,
    remaining: balance - estimatedCost,
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
  const check = await checkCreditQuota(userId, operationType, estimatedCost);
  
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
      amount: -estimatedCost,
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
    amount: estimatedCost,
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
  const difference = actualCost - reservedAmount;

  // Atualizar reserva para settled
  await prisma.$transaction([
    // Marcar reserva como settled
    prisma.creditLedgerEntry.update({
      where: { id: reservation.id },
      data: {
        metadata: {
          ...(reservation.metadata as object || {}),
          settled: true,
          actualCost,
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
): Promise<{ success: boolean; result?: T; error?: any; creditsUsed?: number }> {
  // 1. Reservar créditos
  const reservation = await reserveCredits(userId, operationType, estimatedCost, reference);
  
  if (!reservation) {
    const check = await checkCreditQuota(userId, operationType, estimatedCost);
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
        : estimatedCost
    );

    // 4. Settle reserva
    await settleCredits(reservation.reservationId, finalCost, { actualTokens });

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

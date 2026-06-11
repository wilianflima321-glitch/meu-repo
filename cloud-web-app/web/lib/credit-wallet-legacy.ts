import { Prisma } from '@prisma/client';
import { prisma } from './db';
import type { AIOperationType } from './credit-wallet-costs';
import { getCreditBalance } from './credit-wallet';
import type { CreditCheckResult, CreditDeduction, CreditReservation } from './credit-wallet-types';
import { asLegacyCreditPrisma } from './credit-wallet-types';

type CreditLedgerHistoryEntry = Awaited<ReturnType<typeof prisma.creditLedgerEntry.findMany>>[number];

// ============================================================================
// CLASS WRAPPER (legacy compatibility)
// ============================================================================

export class CreditWallet {
  async getBalance(userId: string): Promise<{ total: number; reserved: number; available: number }> {
    const legacyPrisma = asLegacyCreditPrisma(prisma);
    const user = await legacyPrisma.user?.findUnique?.({ where: { id: userId } }) ?? null;
    if (!user) {
      return { total: 0, reserved: 0, available: 0 };
    }

    const total = typeof user.credits === 'number' ? user.credits : await getCreditBalance(userId);
    const reserved = typeof user.reservedCredits === 'number' ? user.reservedCredits : 0;
    return { total, reserved, available: total - reserved };
  }

  async checkBalance(userId: string, operationType: AIOperationType, estimatedCost: number): Promise<CreditCheckResult> {
    const legacyPrisma = asLegacyCreditPrisma(prisma);
    const user = await legacyPrisma.user?.findUnique?.({ where: { id: userId } }) ?? null;
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
      const txLegacy = asLegacyCreditPrisma(tx);
      const reservation = await txLegacy.creditReservation?.create?.({
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

      if (txLegacy.user?.update) {
        await txLegacy.user.update({
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
    const legacyPrisma = asLegacyCreditPrisma(prisma);
    const existingUser = await legacyPrisma.user?.findUnique?.({ where: { id: params.userId } });
    if (existingUser) {
      const check = await this.checkBalance(params.userId, params.operationType, params.amount);
      if (!check.allowed) {
        return { success: false, error: check.reason || 'Insufficient credits' };
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const txLegacy = asLegacyCreditPrisma(tx);
        if (params.reservationId && txLegacy.creditReservation?.delete) {
          await txLegacy.creditReservation.delete({ where: { id: params.reservationId } });
        }

        const user = await txLegacy.user?.update?.({
          where: { id: params.userId },
          data: { credits: { decrement: params.amount } },
        });

        await txLegacy.creditLedgerEntry?.create?.({
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
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to deduct credits' };
    }
  }

  async refundCredits(params: { userId: string; amount: number; reason?: string; originalReference?: string }): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const txLegacy = asLegacyCreditPrisma(tx);
        const user = await txLegacy.user?.update?.({
          where: { id: params.userId },
          data: { credits: { increment: params.amount } },
        });

        await txLegacy.creditLedgerEntry?.create?.({
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
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to refund credits' };
    }
  }

  async cleanupExpiredReservations(): Promise<number> {
    const legacyPrisma = asLegacyCreditPrisma(prisma);
    const result = await legacyPrisma.creditReservation?.deleteMany?.({
      where: { expiresAt: { lt: new Date() } },
    });
    return result?.count || 0;
  }

  async getLedgerHistory(userId: string, params: { page: number; limit: number; operationType?: string; startDate?: Date; endDate?: Date }): Promise<{ entries: CreditLedgerHistoryEntry[] }> {
    const { page, limit, operationType, startDate, endDate } = params;
    const where: Prisma.CreditLedgerEntryWhereInput = { userId };
    if (operationType) {
      where.metadata = { path: ['operationType'], equals: operationType };
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const entries = await prisma.creditLedgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { entries };
  }
}


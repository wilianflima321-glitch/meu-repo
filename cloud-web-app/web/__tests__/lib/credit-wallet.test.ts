/**
 * Credit Wallet Tests
 * 
 * Testes unitários para o sistema de créditos de IA.
 * Verifica dedução, reserva, balanceamento e edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to define mocks before they're used
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  creditLedgerEntry: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  creditReservation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => fn({
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditLedgerEntry: {
      create: vi.fn(),
    },
    creditReservation: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

import {
  CreditWallet,
  CreditCheckResult,
  CreditReservation,
  AIOperationType,
  CREDITS_PER_1K_TOKENS,
  CREDITS_FIXED_COST,
  calculateTokenCost,
  calculateEstimatedCost,
} from '@/lib/credit-wallet';
import { prisma } from '@/lib/db';

describe('CreditWallet', () => {
  let wallet: CreditWallet;
  
  beforeEach(() => {
    wallet = new CreditWallet();
    vi.clearAllMocks();
  });

  describe('calculateTokenCost', () => {
    it('should calculate cost for chat operation correctly', () => {
      const cost = calculateTokenCost('chat', 1000);
      expect(cost).toBe(CREDITS_PER_1K_TOKENS.chat);
    });

    it('should calculate cost for advanced chat operation', () => {
      const cost = calculateTokenCost('chat_advanced', 2000);
      expect(cost).toBe(CREDITS_PER_1K_TOKENS.chat_advanced * 2);
    });

    it('should calculate cost for code generation', () => {
      const cost = calculateTokenCost('code_generation', 5000);
      expect(cost).toBe(CREDITS_PER_1K_TOKENS.code_generation * 5);
    });

    it('should round up partial tokens', () => {
      const cost = calculateTokenCost('chat', 1500);
      expect(cost).toBe(Math.ceil(1.5 * CREDITS_PER_1K_TOKENS.chat));
    });

    it('should handle zero tokens', () => {
      const cost = calculateTokenCost('chat', 0);
      expect(cost).toBe(0);
    });

    it('should handle inline completion (fractional cost)', () => {
      const cost = calculateTokenCost('inline_completion', 1000);
      expect(cost).toBe(CREDITS_PER_1K_TOKENS.inline_completion);
    });
  });

  describe('calculateEstimatedCost', () => {
    it('should estimate cost for image generation', () => {
      const cost = calculateEstimatedCost('image_generation', { count: 2 });
      expect(cost).toBe(CREDITS_FIXED_COST.image_generation * 2);
    });

    it('should estimate cost for 3D generation', () => {
      const cost = calculateEstimatedCost('3d_generation', { count: 1 });
      expect(cost).toBe(CREDITS_FIXED_COST['3d_generation']);
    });

    it('should estimate cost for audio generation by minutes', () => {
      const cost = calculateEstimatedCost('audio_generation', { minutes: 5 });
      expect(cost).toBe(CREDITS_FIXED_COST.audio_generation * 5);
    });

    it('should default to 1 count when not specified', () => {
      const cost = calculateEstimatedCost('image_generation', {});
      expect(cost).toBe(CREDITS_FIXED_COST.image_generation);
    });
  });

  describe('checkBalance', () => {
    it('should allow operation when balance is sufficient', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 100,
        plan: 'pro',
      });

      const result = await wallet.checkBalance('user1', 'chat', 50);
      
      expect(result.allowed).toBe(true);
      expect(result.balance).toBe(100);
      expect(result.estimatedCost).toBe(50);
      expect(result.remaining).toBe(50);
    });

    it('should deny operation when balance is insufficient', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 10,
        plan: 'free',
      });

      const result = await wallet.checkBalance('user1', 'image_generation', 20);
      
      expect(result.allowed).toBe(false);
      expect(result.balance).toBe(10);
      expect(result.reason).toContain('Insufficient');
      expect(result.upgradeRequired).toBe(true);
    });

    it('should deny operation for non-existent user', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue(null);

      const result = await wallet.checkBalance('invalid', 'chat', 10);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should include reserved credits in calculation', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 100,
        reservedCredits: 30,
        plan: 'pro',
      });

      const result = await wallet.checkBalance('user1', 'chat', 80);
      
      expect(result.allowed).toBe(false);
      expect(result.balance).toBe(70); // 100 - 30 reserved
    });
  });

  describe('reserveCredits', () => {
    it('should create a reservation successfully', async () => {
      const mockReservation = {
        id: 'res1',
        userId: 'user1',
        amount: 50,
        operationType: 'chat',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
      };

      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 100,
        reservedCredits: 0,
      });

      (mockPrisma.$transaction).mockImplementation(async (fn) => {
        return {
          reservation: mockReservation,
          user: { credits: 100, reservedCredits: 50 },
        };
      });

      const reservation = await wallet.reserveCredits('user1', 'chat', 50);
      
      expect(reservation).toBeTruthy();
      expect(reservation?.amount).toBe(50);
    });

    it('should fail reservation when insufficient balance', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 20,
        reservedCredits: 10,
      });

      const reservation = await wallet.reserveCredits('user1', 'chat', 50);
      
      expect(reservation).toBeNull();
    });

    it('should set correct expiration time (5 minutes)', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 100,
        reservedCredits: 0,
      });

      (mockPrisma.$transaction).mockImplementation(async () => ({
        reservation: {
          id: 'res1',
          expiresAt: new Date(now + 300000),
        },
      }));

      const reservation = await wallet.reserveCredits('user1', 'chat', 10);
      
      expect(reservation?.expiresAt.getTime()).toBe(now + 300000);
      
      vi.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits and create ledger entry', async () => {
      (mockPrisma.$transaction).mockImplementation(async () => ({
        user: { id: 'user1', credits: 50 },
        ledgerEntry: {
          id: 'ledger1',
          userId: 'user1',
          amount: -50,
          type: 'deduction',
        },
      }));

      const result = await wallet.deductCredits({
        userId: 'user1',
        amount: 50,
        operationType: 'chat',
        reference: 'test-ref',
      });
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(50);
    });

    it('should release reservation when deducting', async () => {
      const releaseReservation = vi.fn();
      
      (mockPrisma.$transaction).mockImplementation(async (fn) => {
        await fn({
          creditReservation: { delete: releaseReservation },
          user: { update: vi.fn().mockResolvedValue({ credits: 50 }) },
          creditLedgerEntry: { create: vi.fn() },
        });
        return { user: { credits: 50 } };
      });

      await wallet.deductCredits({
        userId: 'user1',
        amount: 50,
        operationType: 'chat',
        reservationId: 'res1',
      });
      
      expect(releaseReservation).toHaveBeenCalled();
    });

    it('should handle deduction failure gracefully', async () => {
      (mockPrisma.$transaction).mockRejectedValue(new Error('DB Error'));

      const result = await wallet.deductCredits({
        userId: 'user1',
        amount: 50,
        operationType: 'chat',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('DB Error');
    });

    it('should prevent negative balance', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 10,
      });

      const result = await wallet.deductCredits({
        userId: 'user1',
        amount: 50,
        operationType: 'chat',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });
  });

  describe('refundCredits', () => {
    it('should refund credits and create ledger entry', async () => {
      (mockPrisma.$transaction).mockResolvedValue({
        user: { id: 'user1', credits: 150 },
        ledgerEntry: {
          id: 'ledger1',
          userId: 'user1',
          amount: 50,
          type: 'refund',
        },
      });

      const result = await wallet.refundCredits({
        userId: 'user1',
        amount: 50,
        reason: 'API failure',
        originalReference: 'original-ref',
      });
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(150);
    });

    it('should include metadata in refund ledger entry', async () => {
      const createLedger = vi.fn();
      
      (mockPrisma.$transaction).mockImplementation(async (fn) => {
        await fn({
          user: { update: vi.fn().mockResolvedValue({ credits: 150 }) },
          creditLedgerEntry: { create: createLedger },
        });
        return { user: { credits: 150 } };
      });

      await wallet.refundCredits({
        userId: 'user1',
        amount: 50,
        reason: 'API timeout',
        originalReference: 'ref123',
      });
      
      expect(createLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              reason: 'API timeout',
              originalReference: 'ref123',
            }),
          }),
        })
      );
    });
  });

  describe('cleanupExpiredReservations', () => {
    it('should delete expired reservations', async () => {
      ((mockPrisma as any).creditReservation.deleteMany).mockResolvedValue({
        count: 5,
      });

      const count = await wallet.cleanupExpiredReservations();
      
      expect(count).toBe(5);
      expect((mockPrisma as any).creditReservation.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('getBalance', () => {
    it('should return user balance with reserved credits', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 100,
        reservedCredits: 20,
      });

      const balance = await wallet.getBalance('user1');
      
      expect(balance.total).toBe(100);
      expect(balance.reserved).toBe(20);
      expect(balance.available).toBe(80);
    });

    it('should return zero balance for non-existent user', async () => {
      (mockPrisma.user.findUnique).mockResolvedValue(null);

      const balance = await wallet.getBalance('invalid');
      
      expect(balance.total).toBe(0);
      expect(balance.available).toBe(0);
    });
  });

  describe('getLedgerHistory', () => {
    it('should return paginated ledger entries', async () => {
      const mockEntries = [
        { id: '1', amount: -10, createdAt: new Date() },
        { id: '2', amount: -5, createdAt: new Date() },
      ];

      (mockPrisma.creditLedgerEntry.findMany).mockResolvedValue(mockEntries);

      const history = await wallet.getLedgerHistory('user1', { page: 1, limit: 10 });
      
      expect(history.entries).toHaveLength(2);
      expect(mockPrisma.creditLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user1' },
          take: 10,
          skip: 0,
        })
      );
    });

    it('should filter by operation type', async () => {
      await wallet.getLedgerHistory('user1', { 
        page: 1, 
        limit: 10, 
        operationType: 'image_generation' 
      });
      
      expect(mockPrisma.creditLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { 
            userId: 'user1',
            operationType: 'image_generation',
          },
        })
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await wallet.getLedgerHistory('user1', { 
        page: 1, 
        limit: 10, 
        startDate,
        endDate,
      });
      
      expect(mockPrisma.creditLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent reservations', async () => {
      const reservationPromises = [
        wallet.reserveCredits('user1', 'chat', 30),
        wallet.reserveCredits('user1', 'chat', 30),
        wallet.reserveCredits('user1', 'chat', 30),
      ];

      (mockPrisma.user.findUnique).mockResolvedValue({
        id: 'user1',
        credits: 100,
        reservedCredits: 0,
      });

      // Should handle race conditions
      await expect(Promise.all(reservationPromises)).resolves.toBeDefined();
    });

    it('should handle very large token counts', () => {
      const cost = calculateTokenCost('chat', 1000000);
      expect(cost).toBe(1000 * CREDITS_PER_1K_TOKENS.chat);
    });

    it('should handle decimal token counts', () => {
      const cost = calculateTokenCost('chat', 1234);
      expect(cost).toBeGreaterThan(1 * CREDITS_PER_1K_TOKENS.chat);
      expect(cost).toBeLessThanOrEqual(2 * CREDITS_PER_1K_TOKENS.chat);
    });
  });
});

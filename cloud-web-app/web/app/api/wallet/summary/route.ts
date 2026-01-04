import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

function isSettled(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') return true;
  const settled = (meta as any).settled;
  return settled !== false;
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const [balanceAgg, entries] = await prisma.$transaction([
      prisma.creditLedgerEntry.aggregate({
        where: {
          userId: user.userId,
          OR: [
            { metadata: { equals: Prisma.DbNull } },
            { metadata: { equals: Prisma.JsonNull } },
            { NOT: { metadata: { path: ['settled'], equals: false } } },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.creditLedgerEntry.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, amount: true, currency: true, entryType: true, reference: true, metadata: true, createdAt: true },
      }),
    ]);

    const currentBalance = balanceAgg._sum?.amount ?? 0;

    let rolling = currentBalance;
    const transactions = entries.map((e) => {
      const balance_after = rolling;
      if (isSettled(e.metadata)) {
        rolling -= e.amount;
      }

      return {
        id: e.id,
        amount: e.amount,
        currency: e.currency,
        entry_type: e.entryType,
        created_at: e.createdAt.toISOString(),
        reference: e.reference ?? null,
        metadata: (e.metadata as any) ?? null,
        balance_after,
      };
    });

    return NextResponse.json({
      balance: currentBalance,
      currency: 'credits',
      transactions,
    });
  } catch (error) {
    console.error('Wallet summary error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

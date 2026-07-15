import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';
import { applyCreditBalanceDelta, getCreditBalance } from '@/lib/credit-wallet';

const routeLogger = createComponentLogger('api/credits/transfer/route');

export const dynamic = 'force-dynamic';

type TransferBody = {
  target_user_id: string;
  amount: number;
  currency?: string;
  reference?: string;
};

function normalizeCurrency(currency: unknown): string {
  const c = String(currency ?? 'credits').trim().toLowerCase();
  return c || 'credits';
}

/**
 * Block 6G.2 / DEBT-FIN-012 — lock both users in sorted UUID order so A↔B
 * concurrent transfers cannot deadlock.
 */
async function lockUsersSorted(
  tx: { $queryRaw: typeof prisma.$queryRaw },
  userIdA: string,
  userIdB: string,
): Promise<void> {
  const [first, second] = [userIdA, userIdB].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  // Two sequential locks in UUID order — never lock B then A.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${first} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${second} FOR UPDATE`;
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const body: TransferBody = await req.json();

    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'INVALID_AMOUNT', message: 'Campo "amount" deve ser um inteiro > 0.' },
        { status: 400 }
      );
    }

    const currency = normalizeCurrency(body?.currency);
    if (currency !== 'credits') {
      return NextResponse.json(
        { error: 'UNSUPPORTED_CURRENCY', message: 'Only currency="credits" is supported.' },
        { status: 400 }
      );
    }

    const rawTarget = String(body?.target_user_id ?? '').trim();
    if (!rawTarget) {
      return NextResponse.json(
        { error: 'INVALID_TARGET', message: 'Field "target_user_id" is required (userId or email).' },
        { status: 400 }
      );
    }

    const receiver = await prisma.user.findFirst({
      where: {
        OR: [{ id: rawTarget }, { email: rawTarget.toLowerCase() }],
      },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'TARGET_NOT_FOUND', message: 'Recipient not found.' },
        { status: 404 }
      );
    }

    if (receiver.id === user.userId) {
      return NextResponse.json(
        { error: 'INVALID_TARGET', message: 'Transfers to yourself are not allowed.' },
        { status: 400 }
      );
    }

    const transferId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const reference = body?.reference ? String(body.reference).slice(0, 160) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 6G.2: sorted dual-user locks — closes DEBT-FIN-012
      await lockUsersSorted(tx, user.userId, receiver.id);

      const senderBalance = await getCreditBalance(user.userId, tx);

      if (senderBalance < amount) {
        throw Object.assign(new Error('INSUFFICIENT_BALANCE'), { code: 'INSUFFICIENT_BALANCE' });
      }

      const senderEntry = await tx.creditLedgerEntry.create({
        data: {
          userId: user.userId,
          amount: -amount,
          currency,
          entryType: 'debit',
          reference,
          metadata: {
            transfer_id: transferId,
            direction: 'out',
            to_user_id: receiver.id,
            settled: true,
          },
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          entryType: true,
          reference: true,
          metadata: true,
          createdAt: true,
        },
      });

      const receiverEntry = await tx.creditLedgerEntry.create({
        data: {
          userId: receiver.id,
          amount,
          currency,
          entryType: 'credit',
          reference,
          metadata: {
            transfer_id: transferId,
            direction: 'in',
            from_user_id: user.userId,
            settled: true,
          },
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          entryType: true,
          reference: true,
          metadata: true,
          createdAt: true,
        },
      });

      const [balanceAfter, receiverBalanceAfter] = await Promise.all([
        applyCreditBalanceDelta(user.userId, -amount, tx),
        applyCreditBalanceDelta(receiver.id, amount, tx),
      ]);

      return { senderEntry, receiverEntry, balanceAfter, receiverBalanceAfter };
    }, {
      isolationLevel: 'Serializable',
      timeout: 10_000,
    });

    return NextResponse.json({
      transfer_id: transferId,
      sender_entry: {
        id: result.senderEntry.id,
        amount: Math.abs(result.senderEntry.amount),
        currency: result.senderEntry.currency,
        entry_type: result.senderEntry.entryType,
        created_at: result.senderEntry.createdAt.toISOString(),
        reference: result.senderEntry.reference ?? null,
        metadata: (result.senderEntry.metadata as Record<string, unknown> | null) ?? null,
        balance_after: result.balanceAfter,
      },
      receiver_entry: {
        id: result.receiverEntry.id,
        amount: result.receiverEntry.amount,
        currency: result.receiverEntry.currency,
        entry_type: result.receiverEntry.entryType,
        created_at: result.receiverEntry.createdAt.toISOString(),
        reference: result.receiverEntry.reference ?? null,
        metadata: (result.receiverEntry.metadata as Record<string, unknown> | null) ?? null,
        balance_after: result.receiverBalanceAfter,
      },
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { error: 'INSUFFICIENT_BALANCE', message: 'Saldo insuficiente.' },
        { status: 400 }
      );
    }

    routeLogger.error('Transfer credits error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

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

    // ====================================================================
    // DEBT-FIN-006: Atomic transfer with SELECT ... FOR UPDATE
    //
    // Uses an interactive Prisma transaction to:
    // 1. Lock the sender's balance rows with FOR UPDATE (prevents concurrent reads)
    // 2. Verify balance >= amount INSIDE the lock
    // 3. Create both ledger entries atomically
    //
    // This eliminates the TOCTOU race condition where two concurrent
    // transfers could both pass the balance check before either writes.
    // ====================================================================
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Lock sender's settled ledger rows with FOR UPDATE
      // This blocks any concurrent transaction from reading until we commit.
      const balanceRows = await tx.$queryRaw<{ total: bigint | null }[]>`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM "CreditLedgerEntry"
        WHERE "userId" = ${user.userId}
          AND (
            metadata IS NULL
            OR metadata::jsonb IS NULL
            OR NOT (metadata::jsonb @> '{"settled": false}')
          )
        FOR UPDATE
      `;

      const senderBalance = Number(balanceRows[0]?.total ?? 0);

      if (senderBalance < amount) {
        throw Object.assign(
          new Error('INSUFFICIENT_BALANCE'),
          { code: 'INSUFFICIENT_BALANCE' }
        );
      }

      // Step 2: Create both ledger entries atomically
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
        select: { id: true, amount: true, currency: true, entryType: true, reference: true, metadata: true, createdAt: true },
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
        select: { id: true, amount: true, currency: true, entryType: true, reference: true, metadata: true, createdAt: true },
      });

      return { senderEntry, receiverEntry, balanceAfter: senderBalance - amount };
    }, {
      // Transaction isolation level for stronger consistency
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
        metadata: (result.senderEntry.metadata as any) ?? null,
        balance_after: result.balanceAfter,
      },
      receiver_entry: {
        id: result.receiverEntry.id,
        amount: result.receiverEntry.amount,
        currency: result.receiverEntry.currency,
        entry_type: result.receiverEntry.entryType,
        created_at: result.receiverEntry.createdAt.toISOString(),
        reference: result.receiverEntry.reference ?? null,
        metadata: (result.receiverEntry.metadata as any) ?? null,
        balance_after: null,
      },
    });
  } catch (error) {
    // Handle the controlled INSUFFICIENT_BALANCE error from the transaction
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


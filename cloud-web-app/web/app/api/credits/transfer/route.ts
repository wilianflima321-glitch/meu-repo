import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { Prisma } from '@prisma/client';
import { enforceRateLimit } from '@/lib/server/rate-limit';

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

async function getSettledBalance(userId: string): Promise<number> {
  const agg = await prisma.creditLedgerEntry.aggregate({
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
  return agg._sum?.amount ?? 0;
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'credits-transfer-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many credit transfer requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
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
        { error: 'UNSUPPORTED_CURRENCY', message: 'Apenas currency="credits" é suportado.' },
        { status: 400 }
      );
    }

    const rawTarget = String(body?.target_user_id ?? '').trim();
    if (!rawTarget) {
      return NextResponse.json(
        { error: 'INVALID_TARGET', message: 'Campo "target_user_id" é obrigatório (userId ou email).' },
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
        { error: 'TARGET_NOT_FOUND', message: 'Destinatário não encontrado.' },
        { status: 404 }
      );
    }

    if (receiver.id === user.userId) {
      return NextResponse.json(
        { error: 'INVALID_TARGET', message: 'Não é permitido transferir para si mesmo.' },
        { status: 400 }
      );
    }

    const senderBalance = await getSettledBalance(user.userId);
    if (senderBalance < amount) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_BALANCE', message: 'Saldo insuficiente.' },
        { status: 400 }
      );
    }

    const transferId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const reference = body?.reference ? String(body.reference).slice(0, 160) : null;

    const [senderEntry, receiverEntry] = await prisma.$transaction([
      prisma.creditLedgerEntry.create({
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
      }),
      prisma.creditLedgerEntry.create({
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
      }),
    ]);

    return NextResponse.json({
      transfer_id: transferId,
      sender_entry: {
        id: senderEntry.id,
        amount: Math.abs(senderEntry.amount),
        currency: senderEntry.currency,
        entry_type: senderEntry.entryType,
        created_at: senderEntry.createdAt.toISOString(),
        reference: senderEntry.reference ?? null,
        metadata: (senderEntry.metadata as any) ?? null,
        balance_after: null,
      },
      receiver_entry: {
        id: receiverEntry.id,
        amount: receiverEntry.amount,
        currency: receiverEntry.currency,
        entry_type: receiverEntry.entryType,
        created_at: receiverEntry.createdAt.toISOString(),
        reference: receiverEntry.reference ?? null,
        metadata: (receiverEntry.metadata as any) ?? null,
        balance_after: null,
      },
    });
  } catch (error) {
    console.error('Transfer credits error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

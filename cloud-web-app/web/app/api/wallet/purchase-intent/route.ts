import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

type PurchaseIntentBody = {
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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'wallet-purchase-intent-post',
      key: user.userId,
      max: 30,
      windowMs: 60 * 60 * 1000,
      message: 'Too many purchase intent attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    await requireEntitlementsForUser(user.userId);

    const body: PurchaseIntentBody = await req.json().catch(() => ({} as PurchaseIntentBody));

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
        { error: 'UNSUPPORTED_CURRENCY', message: 'Apenas currency="credits" é suportado no momento.' },
        { status: 400 }
      );
    }

    // Real-or-fail: este endpoint registra uma SOLICITAÇÃO de compra (pendente)
    // e não credita automaticamente (evita "créditos grátis" sem settlement).
    const intentId = `pi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const entry = await prisma.creditLedgerEntry.create({
      data: {
        userId: user.userId,
        amount,
        currency,
        entryType: 'credit',
        reference: body?.reference ? String(body.reference).slice(0, 160) : null,
        metadata: {
          intent_id: intentId,
          status: 'pending',
          settled: false,
          requested_at: new Date().toISOString(),
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

    return NextResponse.json({
      intent_id: intentId,
      entry: {
        id: entry.id,
        amount: entry.amount,
        currency: entry.currency,
        entry_type: entry.entryType,
        created_at: entry.createdAt.toISOString(),
        reference: entry.reference ?? null,
        metadata: (entry.metadata as any) ?? null,
        balance_after: null,
      },
    });
  } catch (error) {
    console.error('Purchase intent error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}



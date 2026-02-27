/**
 * Wallet Transactions API
 * GET /api/wallet/transactions - Lista transações recentes
 * 
 * Retorna histórico de uso e compras de créditos
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'wallet-transactions-get',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many wallet transaction requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const entries = await prisma.creditLedgerEntry.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
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

    const transactions = entries.map(entry => ({
      id: entry.id,
      type: entry.amount > 0 ? 'purchase' : entry.entryType === 'bonus' ? 'bonus' : 'usage',
      amount: entry.amount,
      description: getTransactionDescription(entry.entryType, entry.reference, entry.metadata),
      timestamp: entry.createdAt.toISOString(),
    }));

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Wallet transactions error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

function getTransactionDescription(
  entryType: string, 
  reference: string | null, 
  metadata: any
): string {
  if (entryType === 'purchase') {
    return `Compra de créditos`;
  }
  if (entryType === 'bonus') {
    return metadata?.reason || 'Bônus de créditos';
  }
  if (entryType === 'usage') {
    if (reference?.startsWith('ai_')) {
      return 'Geração de IA';
    }
    if (reference?.startsWith('render_')) {
      return 'Renderização';
    }
    if (reference?.startsWith('build_')) {
      return 'Build de projeto';
    }
    return 'Uso de créditos';
  }
  if (entryType === 'refund') {
    return 'Reembolso';
  }
  return 'Transação';
}

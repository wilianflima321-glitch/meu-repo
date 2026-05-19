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
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/wallet/transactions/route');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
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
    routeLogger.error('Wallet transactions error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

function getTransactionDescription(
  entryType: string, 
  reference: string | null, 
  metadata: unknown
): string {
  if (entryType === 'purchase') {
    return `Credit purchase`;
  }
  if (entryType === 'bonus') {
    const reason = typeof metadata === 'object' && metadata !== null && 'reason' in metadata ? metadata.reason : null;
    return typeof reason === 'string' ? reason : 'B?nus de cr?ditos';
  }
  if (entryType === 'usage') {
    if (reference?.startsWith('ai_')) {
      return 'AI generation';
    }
    if (reference?.startsWith('render_')) {
      return 'Rendering';
    }
    if (reference?.startsWith('build_')) {
      return 'Project build';
    }
    return 'Credit usage';
  }
  if (entryType === 'refund') {
    return 'Reembolso';
  }
  return 'Transaction';
}

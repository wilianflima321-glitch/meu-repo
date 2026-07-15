/**
 * GET /api/billing/usage/receipts — Block 6H.7
 * Itemized wallet ledger rows (real CreditLedgerEntry). Pool/PAYG lanes appear when metadata present.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'

const log = createComponentLogger('api.billing.usage.receipts')

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const limitRaw = Number(req.nextUrl.searchParams.get('limit') || 50)
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50))

    const entries = await prisma.creditLedgerEntry.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        currency: true,
        entryType: true,
        reference: true,
        metadata: true,
        createdAt: true,
      },
    })

    const receipts = entries.map((entry) => {
      const meta =
        entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
          ? (entry.metadata as Record<string, unknown>)
          : {}
      const model = typeof meta.model === 'string' ? meta.model : typeof meta.modelId === 'string' ? meta.modelId : null
      const rawTokens =
        typeof meta.rawTokens === 'number'
          ? meta.rawTokens
          : typeof meta.tokens === 'number'
            ? meta.tokens
            : null
      const weightedTokens =
        typeof meta.weightedTokens === 'number'
          ? meta.weightedTokens
          : typeof meta.weighted === 'number'
            ? meta.weighted
            : null
      const lane =
        typeof meta.lane === 'string'
          ? meta.lane
          : typeof meta.spendLane === 'string'
            ? meta.spendLane
            : entry.entryType.startsWith('CREATIVE')
              ? 'creative'
              : entry.amount < 0
                ? 'wallet'
                : 'credit'

      return {
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        entryType: entry.entryType,
        amount: entry.amount,
        currency: entry.currency,
        reference: entry.reference,
        model,
        rawTokens,
        weightedTokens,
        lane,
      }
    })

    return NextResponse.json({
      success: true,
      receipts,
      capabilityStatus: 'IMPLEMENTED',
      note:
        'Wallet ledger rows are authoritative. Subscription pool debits may omit model metadata until spend-session enrichment.',
    })
  } catch (error) {
    log.error('receipts failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

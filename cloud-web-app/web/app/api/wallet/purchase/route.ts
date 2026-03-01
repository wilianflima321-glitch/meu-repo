import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

const PACKAGE_AMOUNTS: Record<string, number> = {
  'pack-500': 500,
  'pack-1500': 1500,
  'pack-5000': 5000,
  'pack-15000': 15000,
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    await requireEntitlementsForUser(user.userId)

    const body = await req.json().catch(() => ({}))
    const packageId = typeof body?.packageId === 'string' ? body.packageId.trim() : ''
    const amount = PACKAGE_AMOUNTS[packageId]

    if (!amount) {
      return NextResponse.json(
        {
          error: 'INVALID_PACKAGE',
          message: 'Unknown credit package.',
          capability: 'WALLET_PURCHASE',
          capabilityStatus: 'PARTIAL',
        },
        { status: 400 }
      )
    }

    const intentId = `pi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    await prisma.creditLedgerEntry.create({
      data: {
        userId: user.userId,
        amount,
        currency: 'credits',
        entryType: 'credit',
        reference: packageId,
        metadata: {
          intent_id: intentId,
          package_id: packageId,
          status: 'pending',
          settled: false,
          requested_at: new Date().toISOString(),
          source: 'wallet_purchase_api',
        },
      },
    })

    return NextResponse.json({
      success: true,
      intentId,
      checkoutUrl: null,
      capability: 'WALLET_PURCHASE',
      capabilityStatus: 'PARTIAL',
      message: 'Purchase intent registered. Settlement remains gated by payment runtime.',
    })
  } catch (error) {
    console.error('wallet purchase error:', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

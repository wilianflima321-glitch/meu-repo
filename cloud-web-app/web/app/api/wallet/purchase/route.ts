/**
 * POST /api/wallet/purchase
 * Block 6B — real Stripe Checkout for prepaid AI credits (packs + custom ≥ $5).
 * Fail-closed when Stripe secret is missing — never returns success + null checkoutUrl.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { optionalEnv } from '@/lib/env'
import { getStripe } from '@/lib/stripe'
import { buildAppUrl } from '@/lib/server/app-origin'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  creditsForCustomUsd,
  getWalletCreditPack,
  parseCustomUsdAmount,
  totalCreditsForPack,
} from '@/lib/billing/wallet-credit-packs'

const routeLogger = createComponentLogger('api/wallet/purchase/route')
export const dynamic = 'force-dynamic'

type PurchaseBody = {
  packageId?: string
  customUsd?: number
  successUrl?: string
  cancelUrl?: string
}

function stripeSecretReady(): boolean {
  const key = optionalEnv('STRIPE_SECRET_KEY')
  if (!key?.trim()) return false
  const lowered = key.toLowerCase()
  return !lowered.includes('replace_me') && !lowered.includes('replace-with') && !key.endsWith('...')
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    await requireEntitlementsForUser(user.userId)

    if (!stripeSecretReady()) {
      return NextResponse.json(
        {
          error: 'STRIPE_NOT_CONFIGURED',
          message:
            'Wallet purchase is held until Stripe is configured. The IDE stays unlocked — use BYOK or subscription pools.',
          capability: 'WALLET_PURCHASE',
          capabilityStatus: 'HELD',
          ideLocked: false,
          checkoutUrl: null,
        },
        { status: 503 },
      )
    }

    const body = (await req.json().catch(() => ({}))) as PurchaseBody
    const packageId = typeof body.packageId === 'string' ? body.packageId.trim() : ''
    const customUsd = parseCustomUsdAmount(body.customUsd)

    let unitAmountCents: number
    let creditGrant: number
    let productName: string
    let resolvedPackageId: string | null = null
    let bonusCredits = 0

    if (packageId) {
      const pack = getWalletCreditPack(packageId)
      if (!pack) {
        return NextResponse.json(
          {
            error: 'INVALID_PACKAGE',
            message: 'Unknown credit package.',
            capability: 'WALLET_PURCHASE',
            capabilityStatus: 'IMPLEMENTED',
            ideLocked: false,
          },
          { status: 400 },
        )
      }
      unitAmountCents = pack.unitAmountCents
      creditGrant = totalCreditsForPack(pack)
      bonusCredits = pack.bonusCredits
      productName = `Aethel AI credits — ${pack.name}`
      resolvedPackageId = pack.id
    } else if (customUsd !== null) {
      unitAmountCents = Math.round(customUsd * 100)
      creditGrant = creditsForCustomUsd(customUsd)
      productName = `Aethel AI credits — custom $${customUsd.toFixed(2)}`
    } else {
      return NextResponse.json(
        {
          error: 'INVALID_PURCHASE',
          message: 'Provide packageId or customUsd (min $5, max $500).',
          capability: 'WALLET_PURCHASE',
          capabilityStatus: 'IMPLEMENTED',
          ideLocked: false,
        },
        { status: 400 },
      )
    }

    const intentId = `pi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    const origin = buildAppUrl('', req).replace(/\/+$/, '')
    const successUrl =
      (typeof body.successUrl === 'string' && body.successUrl.trim()) ||
      `${origin}/billing?wallet=success&intent=${encodeURIComponent(intentId)}`
    const cancelUrl =
      (typeof body.cancelUrl === 'string' && body.cancelUrl.trim()) ||
      `${origin}/billing?wallet=cancelled`

    await prisma.creditLedgerEntry.create({
      data: {
        userId: user.userId,
        amount: 0,
        currency: 'credits',
        entryType: 'PENDING_PURCHASE',
        reference: intentId,
        metadata: {
          intent_id: intentId,
          package_id: resolvedPackageId,
          credits: creditGrant,
          bonus_credits: bonusCredits,
          amount_usd_cents: unitAmountCents,
          status: 'pending',
          settled: false,
          requested_at: new Date().toISOString(),
          source: 'wallet_purchase_api',
        },
      },
    })

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: user.userId,
      customer_email: user.email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmountCents,
            product_data: {
              name: productName,
              description: `${creditGrant} AI credits (prepaid wallet)`,
            },
          },
        },
      ],
      metadata: {
        kind: 'wallet_credit_purchase',
        userId: user.userId,
        intentId,
        packageId: resolvedPackageId || '',
        credits: String(creditGrant),
        bonusCredits: String(bonusCredits),
        amountUsdCents: String(unitAmountCents),
      },
    })

    if (!session.url) {
      routeLogger.error('stripe_checkout_missing_url', undefined, { intentId })
      return NextResponse.json(
        {
          error: 'CHECKOUT_URL_MISSING',
          message: 'Stripe did not return a checkout URL.',
          capability: 'WALLET_PURCHASE',
          capabilityStatus: 'HELD',
          ideLocked: false,
        },
        { status: 502 },
      )
    }

    routeLogger.info('wallet_checkout_created', {
      intentId,
      userId: user.userId,
      credits: creditGrant,
      unitAmountCents,
    })

    return NextResponse.json({
      success: true,
      intentId,
      checkoutUrl: session.url,
      sessionId: session.id,
      credits: creditGrant,
      amountUsdCents: unitAmountCents,
      packageId: resolvedPackageId,
      capability: 'WALLET_PURCHASE',
      capabilityStatus: 'IMPLEMENTED',
      ideLocked: false,
    })
  } catch (error) {
    routeLogger.error('wallet purchase error:', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

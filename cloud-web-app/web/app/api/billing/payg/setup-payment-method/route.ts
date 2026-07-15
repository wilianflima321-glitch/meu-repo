/**
 * POST /api/billing/payg/setup-payment-method — Stripe Checkout mode=setup (6C.4).
 * Saves card for off-session PAYG invoice flush. Never invents a fake PM.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { buildAppUrl } from '@/lib/server/app-origin'
import {
  billingRuntimeCapabilityResponse,
  getBillingRuntimeState,
} from '@/lib/server/billing-runtime'
import { createComponentLogger } from '@/lib/observability/logger'

const routeLogger = createComponentLogger('api/billing/payg/setup-payment-method')
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const billingRuntime = await getBillingRuntimeState()
    if (!billingRuntime.checkoutReady) {
      return billingRuntimeCapabilityResponse('checkout', billingRuntime)
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, stripeCustomerId: true },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      successUrl?: string
      cancelUrl?: string
    }

    const stripe = getStripe()
    let stripeCustomerId = dbUser.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email || undefined,
        metadata: { userId: dbUser.id },
      })
      stripeCustomerId = customer.id
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { stripeCustomerId },
      })
    }

    const origin = buildAppUrl('', req).replace(/\/+$/, '')
    const successUrl =
      (typeof body.successUrl === 'string' && body.successUrl.trim()) ||
      `${origin}/billing?payg=pm_success`
    const cancelUrl =
      (typeof body.cancelUrl === 'string' && body.cancelUrl.trim()) ||
      `${origin}/billing?payg=pm_cancelled`

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomerId,
      client_reference_id: dbUser.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ['card'],
      metadata: {
        kind: 'payg_payment_method_setup',
        userId: dbUser.id,
      },
    })

    if (!session.url) {
      return NextResponse.json(
        {
          error: 'CHECKOUT_URL_MISSING',
          message: 'Stripe did not return a setup checkout URL.',
          capability: 'PAYG_PAYMENT_METHOD',
          capabilityStatus: 'HELD',
          ideLocked: false,
        },
        { status: 502 },
      )
    }

    routeLogger.info('payg_pm_setup_session', { userId: dbUser.id, sessionId: session.id })
    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      capability: 'PAYG_PAYMENT_METHOD',
      capabilityStatus: 'IMPLEMENTED',
      ideLocked: false,
    })
  } catch (error) {
    routeLogger.error('payg_pm_setup_failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

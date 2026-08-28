/**
 * Billing Checkout API
 * POST /api/billing/checkout - Create checkout session
 *
 * Block 6D.3 — modular Pro/Studio line items when Price IDs live;
 * honest HELD / legacy_single otherwise. Enterprise = Contact Sales (6D.6).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { optionalEnv } from '@/lib/env'
import { getStripe } from '@/lib/stripe'
import { buildAppUrl } from '@/lib/server/app-origin'
import { billingRuntimeCapabilityResponse, getBillingRuntimeState } from '@/lib/server/billing-runtime'
import { createComponentLogger } from '@/lib/observability/logger'
import { resolveSubscriptionCheckoutLineItems } from '@/lib/billing/stripe-plan-reconcile'

const routeLogger = createComponentLogger('api/billing/checkout/route')

const CAPABILITY = 'PAYMENT_GATEWAY_RUNTIME'
// capability: 'PAYMENT_GATEWAY_RUNTIME'

export const dynamic = 'force-dynamic'

interface CheckoutRequest {
  planId: string
  interval?: 'month' | 'year'
  successUrl?: string
  cancelUrl?: string
}

export async function POST(req: NextRequest) {
  let requestedInterval: 'month' | 'year' = 'month'
  try {
    const user = requireAuth(req)
    const body: CheckoutRequest = await req.json()

    const { planId, interval = 'month', successUrl, cancelUrl } = body
    if (interval !== 'month' && interval !== 'year') {
      return NextResponse.json(
        { error: 'INVALID_INTERVAL', message: 'Valid intervals: month, year.' },
        { status: 400 },
      )
    }
    requestedInterval = interval === 'year' ? 'year' : 'month'

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const validPlans = ['starter', 'pro', 'studio', 'enterprise']
    if (!validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID. Valid plans: starter, pro, studio, enterprise' },
        { status: 400 },
      )
    }

    if (planId === 'enterprise') {
      return NextResponse.json(
        {
          error: 'ENTERPRISE_CONTACT_SALES',
          message: 'Enterprise upgrades are handled through contact sales.',
          contactSalesUrl: '/contact-sales',
          capability: 'ENTERPRISE_CHECKOUT',
          capabilityStatus: 'HELD',
          ideLocked: false,
        },
        { status: 409 },
      )
    }

    const lineItemsResult = resolveSubscriptionCheckoutLineItems(planId, requestedInterval)
    if (!lineItemsResult.ok) {
      return NextResponse.json(
        {
          error: 'STRIPE_PRICE_HELD',
          message: lineItemsResult.message,
          required: lineItemsResult.requiredEnv,
          capability: 'SUBSCRIPTION_CHECKOUT',
          capabilityStatus: 'HELD',
          ideLocked: false,
          checkoutUrl: null,
        },
        { status: 503 },
      )
    }

    const billingRuntime = await getBillingRuntimeState()
    if (!billingRuntime.checkoutReady) {
      return billingRuntimeCapabilityResponse('checkout', billingRuntime)
    }

    const stripe = getStripe()

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let stripeCustomerId = dbUser.stripeCustomerId || null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: { userId: dbUser.id },
      })
      stripeCustomerId = customer.id
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { stripeCustomerId },
      })
    }

    const appUrl = (
      billingRuntime.gateway.checkoutOrigin ||
      optionalEnv('NEXT_PUBLIC_APP_URL') ||
      buildAppUrl('', req)
    ).replace(/\/+$/, '')
    const resolvedSuccessUrl =
      successUrl ||
      `${appUrl}/billing/success?plan=${encodeURIComponent(planId)}&interval=${encodeURIComponent(requestedInterval)}`
    const resolvedCancelUrl = cancelUrl || `${appUrl}/billing/cancel`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: dbUser.id,
      metadata: {
        userId: dbUser.id,
        planId,
        interval: requestedInterval,
        checkoutMode: lineItemsResult.mode,
      },
      line_items: lineItemsResult.lineItems,
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'STRIPE_SESSION_NO_URL', message: 'Stripe returned a checkout session without URL.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      checkoutMode: lineItemsResult.mode,
      capability: 'SUBSCRIPTION_CHECKOUT',
      capabilityStatus: lineItemsResult.capabilityStatus,
      ideLocked: false,
    })
  } catch (error) {
    routeLogger.error('Checkout error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if ((error as { code?: string })?.code === 'ENV_NOT_SET') {
      return NextResponse.json(
        {
          error: 'STRIPE_NOT_CONFIGURED',
          message: (error as Error).message,
          capability: 'SUBSCRIPTION_CHECKOUT',
          capabilityStatus: 'HELD',
          ideLocked: false,
          checkoutUrl: null,
        },
        { status: 503 },
      )
    }

    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

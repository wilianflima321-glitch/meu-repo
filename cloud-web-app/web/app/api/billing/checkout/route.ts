/**
 * Billing Checkout API
 * POST /api/billing/checkout - Create checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { optionalEnv } from '@/lib/env';
import { getStripe, getStripePriceIdForPlan } from '@/lib/stripe';
import { readPaymentGatewayConfig } from '@/lib/server/payment-gateway-config';
import { notImplementedCapability } from '@/lib/server/capability-response';
import { buildAppUrl } from '@/lib/server/app-origin';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

interface CheckoutRequest {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}

function resolveReturnUrl(value: unknown, fallback: string, allowedOrigin: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  try {
    const candidate = new URL(value, allowedOrigin)
    if (candidate.origin !== allowedOrigin) return fallback
    return candidate.toString()
  } catch {
    return fallback
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'billing-checkout',
      key: user.userId,
      max: 12,
      windowMs: 60 * 60 * 1000,
      message: 'Too many checkout attempts. Please wait before trying again.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body: CheckoutRequest = await req.json();

    const planIdRaw = typeof body.planId === 'string' ? body.planId : '';
    const planId = planIdRaw.trim().toLowerCase();
    const { successUrl, cancelUrl } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Validate plan exists.
    const validPlans = ['starter', 'basic', 'pro', 'studio', 'enterprise'];
    if (!validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID. Valid plans: starter, basic, pro, studio, enterprise' },
        { status: 400 }
      );
    }

    const gatewayConfig = await readPaymentGatewayConfig();
    if (!gatewayConfig.checkoutEnabled) {
      return NextResponse.json(
        { error: 'CHECKOUT_DISABLED', message: 'Checkout is temporarily disabled by admin.' },
        { status: 503 }
      );
    }
    if (gatewayConfig.activeGateway !== 'stripe') {
      return notImplementedCapability({
        error: 'PAYMENT_GATEWAY_NOT_IMPLEMENTED',
        message: `Active gateway "${gatewayConfig.activeGateway}" is not available in this build.`,
        capability: 'PAYMENT_GATEWAY_RUNTIME',
        milestone: 'P1',
        metadata: { activeGateway: gatewayConfig.activeGateway },
      });
    }

    // Stripe (real-or-fail)
    const stripe = getStripe();
    const priceId = getStripePriceIdForPlan(planId);

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure Stripe customer
    let stripeCustomerId = dbUser.stripeCustomerId || null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: { userId: dbUser.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { stripeCustomerId },
      });
    }

    const appUrl = (gatewayConfig.checkoutOrigin || optionalEnv('NEXT_PUBLIC_APP_URL') || buildAppUrl('', req)).replace(/\/+$/, '');
    const successFallback = `${appUrl}/billing/success?plan=${encodeURIComponent(planId)}`;
    const cancelFallback = `${appUrl}/billing/cancel`;
    const resolvedSuccessUrl = resolveReturnUrl(successUrl, successFallback, appUrl);
    const resolvedCancelUrl = resolveReturnUrl(cancelUrl, cancelFallback, appUrl);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: dbUser.id,
      metadata: { userId: dbUser.id, planId },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'STRIPE_SESSION_NO_URL', message: 'Stripe returned a checkout session without URL.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if ((error as any)?.code === 'ENV_NOT_SET') {
      return NextResponse.json(
        {
          error: 'STRIPE_NOT_CONFIGURED',
          message: (error as Error).message,
          required: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_BASIC', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_STUDIO', 'STRIPE_PRICE_ENTERPRISE'],
        },
        { status: 503 }
      );
    }

    if ((error as any)?.code === 'INVALID_PLAN') {
      return NextResponse.json(
        { error: 'Invalid plan ID. Valid plans: starter, basic, pro, studio, enterprise' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

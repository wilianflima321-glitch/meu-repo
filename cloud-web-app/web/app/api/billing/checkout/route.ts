/**
 * Billing Checkout API
 * POST /api/billing/checkout - Create checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { optionalEnv } from '@/lib/env';
import { getStripe, getStripePriceIdForPlan } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

interface CheckoutRequest {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const body: CheckoutRequest = await req.json();

    const { planId, successUrl, cancelUrl } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Validate plan exists - Planos alinhados com estratégia 2025
    // SEM FREE TIER - Todos os planos são pagos para garantir zero prejuízo
    const validPlans = ['starter', 'basic', 'pro', 'studio', 'enterprise'];
    if (!validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID. Valid plans: starter, basic, pro, studio, enterprise' },
        { status: 400 }
      );
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

    const appUrl = optionalEnv('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
    const resolvedSuccessUrl = successUrl || `${appUrl}/billing/success?plan=${encodeURIComponent(planId)}`;
    const resolvedCancelUrl = cancelUrl || `${appUrl}/billing/cancel`;

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
        { error: 'STRIPE_SESSION_NO_URL', message: 'Stripe retornou sessão sem URL.' },
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

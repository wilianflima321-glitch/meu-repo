/**
 * Billing Checkout API
 * POST /api/billing/checkout - Create checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Plan pricing (USD) - Margem mínima 89%
    const planPrices: Record<string, number> = {
      starter: 3,     // $3/mês - R$15
      basic: 9,       // $9/mês - R$45
      pro: 29,        // $29/mês - R$149
      studio: 79,     // $79/mês - R$399
      enterprise: 199 // $199/mês - R$999
    };

    // For paid plans, create a mock checkout session
    // In production, integrate with Stripe:
    // const session = await stripe.checkout.sessions.create({...})

    const checkoutSessionId = `cs_mock_${Date.now()}_${user.userId}`;

    // Store pending subscription
    await prisma.subscription.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        plan: planId,
        status: 'pending',
        stripeCustomerId: `cus_mock_${user.userId}`,
        stripeSubscriptionId: checkoutSessionId,
      },
      update: {
        plan: planId,
        status: 'pending',
        stripeSubscriptionId: checkoutSessionId,
      },
    });

    // Mock checkout URL
    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing/checkout/${checkoutSessionId}`;

    return NextResponse.json({
      success: true,
      checkoutUrl,
      sessionId: checkoutSessionId,
      message: 'Checkout session created (mock)',
    });
  } catch (error) {
    console.error('Checkout error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

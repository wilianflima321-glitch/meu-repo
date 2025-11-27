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

    // Validate plan exists
    const validPlans = ['free', 'starter', 'pro', 'enterprise'];
    if (!validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    // Free plan - just update subscription
    if (planId === 'free') {
      const subscription = await prisma.subscription.upsert({
        where: { userId: user.userId },
        create: {
          userId: user.userId,
          plan: 'free',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
        update: {
          plan: 'free',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        subscription,
        message: 'Free plan activated',
      });
    }

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

/**
 * Billing Webhook API
 * POST /api/billing/webhook - Handle payment provider webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    // In production, verify webhook signature from Stripe
    // const signature = req.headers.get('stripe-signature');
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (type) {
      case 'checkout.session.completed': {
        const { sessionId, userId, planId } = data;

        await prisma.subscription.update({
          where: { userId },
          data: {
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });

        await prisma.payment.create({
          data: {
            userId,
            amount: data.amount || 0,
            currency: data.currency || 'USD',
            status: 'succeeded',
            stripePaymentIntentId: sessionId,
          },
        });

        break;
      }

      case 'subscription.updated': {
        const { userId, status, currentPeriodEnd } = data;

        await prisma.subscription.update({
          where: { userId },
          data: {
            status,
            currentPeriodEnd: new Date(currentPeriodEnd),
          },
        });

        break;
      }

      case 'subscription.deleted': {
        const { userId } = data;

        await prisma.subscription.update({
          where: { userId },
          data: {
            status: 'canceled',
          },
        });

        break;
      }

      case 'payment.failed': {
        const { userId, paymentIntentId } = data;

        await prisma.payment.create({
          data: {
            userId,
            amount: data.amount || 0,
            currency: data.currency || 'USD',
            status: 'failed',
            stripePaymentIntentId: paymentIntentId,
          },
        });

        break;
      }

      default:
        console.log('Unhandled webhook event:', type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

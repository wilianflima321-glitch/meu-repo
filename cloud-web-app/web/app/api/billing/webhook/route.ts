/**
 * Billing Webhook API
 * POST /api/billing/webhook - Handle payment provider webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { requireEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: 'billing-webhook-post',
      key: getRequestIp(req),
      max: 1800,
      windowMs: 60 * 60 * 1000,
      message: 'Too many webhook requests. Please retry later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'MISSING_SIGNATURE', message: 'Header stripe-signature ausente.' },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    const stripe = getStripe();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      return NextResponse.json(
        { error: 'INVALID_SIGNATURE', message: (err as Error).message },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = String(session.metadata?.userId || session.client_reference_id || '');
        const planId = String(session.metadata?.planId || '');
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : '';

        if (!userId || !subscriptionId) {
          return NextResponse.json(
            { error: 'MISSING_DATA', message: 'checkout.session.completed sem userId/subscription.' },
            { status: 400 }
          );
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price'],
        });

        const priceId = subscription.items.data[0]?.price?.id;
        if (!priceId) {
          return NextResponse.json(
            { error: 'MISSING_PRICE', message: 'Subscription sem price id.' },
            { status: 400 }
          );
        }

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          update: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });

        // Atualiza o plano do usuário para UX (enforcement deve checar Subscription.status)
        if (planId) {
          await prisma.user.update({
            where: { id: userId },
            data: { plan: planId },
          });
        }

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : '';
        if (!stripeCustomerId) break;

        const user = await prisma.user.findFirst({ where: { stripeCustomerId } });
        if (!user) break;

        const stripePaymentId = invoice.id;
        const amount = Number(invoice.amount_paid ?? invoice.amount_due ?? 0);
        const currency = String(invoice.currency || 'usd');
        const status = event.type === 'invoice.paid' ? 'succeeded' : 'failed';

        await prisma.payment.upsert({
          where: { stripePaymentId },
          create: {
            userId: user.id,
            stripePaymentId,
            amount,
            currency,
            status,
          },
          update: {
            amount,
            currency,
            status,
          },
        });
        break;
      }

      default:
        // Eventos não necessários ainda
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);

    if ((error as any)?.code === 'ENV_NOT_SET') {
      return NextResponse.json(
        { error: 'STRIPE_NOT_CONFIGURED', message: (error as Error).message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

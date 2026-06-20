/**
 * Billing Webhook API
 * POST /api/billing/webhook - Handle payment provider webhooks
 *
 * DEBT-FIN-005: Reconcilia Price IDs modulares do Stripe com planos internos
 * e rebaixa automaticamente User.plan para 'free' em caso de cancelamento,
 * expiração ou inadimplência, fechando a brecha de Pro vitalício gratuito.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { requireEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { billingRuntimeCapabilityResponse, getBillingRuntimeState } from '@/lib/server/billing-runtime';
import { syncCreatorPayoutAccountStatus } from '@/lib/server/stripe-connect';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

// ============================================================================
// STRIPE PRICE ID → PLAN RECONCILIATION MAP
// Modular pricing: each subscription can have Base + optional IA addon items.
// Legacy Basic Price ID is mapped to Pro+IA rights (grandfathered).
// ============================================================================

/**
 * Maps a Stripe Price ID to the internal plan it represents.
 * A subscription may contain multiple items; we resolve the highest-tier plan.
 */
const PRICE_ID_TO_PLAN: Record<string, { plan: string; component: 'base' | 'ia_addon' }> = {
  // Pro
  'price_pro_base_15': { plan: 'pro', component: 'base' },
  'price_pro_ia_addon_14': { plan: 'pro', component: 'ia_addon' },
  // Studio
  'price_studio_base_45': { plan: 'studio', component: 'base' },
  'price_studio_ia_addon_34': { plan: 'studio', component: 'ia_addon' },
  // Starter
  'price_starter_9': { plan: 'starter', component: 'base' },
  // Legacy Basic ($29) → grandfathered as Pro+IA (Option A from contracts_planning §6)
  'price_basic_29': { plan: 'pro', component: 'base' },
};

/** Plan tier order for resolving the highest active plan from multiple items */
const PLAN_TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  basic: 2,
  pro: 3,
  studio: 4,
  enterprise: 5,
};

/**
 * Given a list of active Stripe Price IDs in a subscription,
 * resolves the canonical internal plan name and BYOK status.
 */
function reconcilePlanFromPriceIds(priceIds: string[]): { plan: string; hasIaAddon: boolean } {
  let highestPlan = 'free';
  let highestTier = 0;
  let hasIaAddon = false;

  for (const priceId of priceIds) {
    const mapping = PRICE_ID_TO_PLAN[priceId];
    if (!mapping) continue;

    if (mapping.component === 'ia_addon') {
      hasIaAddon = true;
    }

    const tier = PLAN_TIER_ORDER[mapping.plan] ?? 0;
    if (tier > highestTier) {
      highestTier = tier;
      highestPlan = mapping.plan;
    }
  }

  // Legacy Basic Price ID implicitly includes IA addon (grandfathered)
  if (priceIds.includes('price_basic_29')) {
    hasIaAddon = true;
  }

  return { plan: highestPlan, hasIaAddon };
}

/** Statuses that indicate a subscription is no longer granting paid access */
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
]);

/** Statuses that indicate degraded/at-risk access (grace period) */
const AT_RISK_SUBSCRIPTION_STATUSES = new Set([
  'past_due',
  'incomplete',
]);

export async function POST(req: NextRequest) {
  try {
    const billingRuntime = await getBillingRuntimeState();
    if (!billingRuntime.webhookReady) {
      return billingRuntimeCapabilityResponse('webhook', billingRuntime);
    }

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
      // ================================================================
      // CHECKOUT COMPLETED — New subscription created
      // ================================================================
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

        const priceIds = subscription.items.data
          .map((item) => item.price?.id)
          .filter((id): id is string => !!id);
        const primaryPriceId = priceIds[0] || '';

        if (!primaryPriceId) {
          return NextResponse.json(
            { error: 'MISSING_PRICE', message: 'Subscription sem price id.' },
            { status: 400 }
          );
        }

        // Reconcile plan from modular Price IDs
        const reconciled = reconcilePlanFromPriceIds(priceIds);
        const resolvedPlan = planId || reconciled.plan;

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: primaryPriceId,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          update: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: primaryPriceId,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });

        // Update user plan and verification timestamp
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: resolvedPlan,
            planVerifiedAt: new Date(),
          },
        });

        logger.info('stripe.checkout.completed', {
          component: 'billing-webhook',
          userId,
          resolvedPlan,
          priceIds,
          hasIaAddon: reconciled.hasIaAddon,
        });

        break;
      }

      // ================================================================
      // SUBSCRIPTION UPDATED/DELETED — Reconcile plan or downgrade
      // DEBT-FIN-005: Critical fix for "Pro forever" vulnerability
      // ================================================================
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Update subscription record status
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });

        // Find the user associated with this subscription
        const subRecord = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          select: { userId: true },
        });

        if (subRecord) {
          if (INACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
            // ── DOWNGRADE: subscription is fully canceled/expired ──
            await prisma.user.update({
              where: { id: subRecord.userId },
              data: {
                plan: 'free',
                planVerifiedAt: new Date(),
              },
            });

            logger.info('stripe.subscription.downgraded', {
              component: 'billing-webhook',
              userId: subRecord.userId,
              reason: subscription.status,
              eventType: event.type,
              subscriptionId: subscription.id,
            });
          } else if (AT_RISK_SUBSCRIPTION_STATUSES.has(subscription.status)) {
            // ── AT RISK: keep plan active but log warning for monitoring ──
            logger.warn('stripe.subscription.at_risk', {
              component: 'billing-webhook',
              userId: subRecord.userId,
              status: subscription.status,
              subscriptionId: subscription.id,
            });
          } else if (subscription.status === 'active') {
            // ── REACTIVATION or plan change: reconcile from Price IDs ──
            const activePriceIds = subscription.items.data
              .map((item) => item.price?.id)
              .filter((id): id is string => !!id);
            const reconciled = reconcilePlanFromPriceIds(activePriceIds);

            if (reconciled.plan !== 'free') {
              await prisma.user.update({
                where: { id: subRecord.userId },
                data: {
                  plan: reconciled.plan,
                  planVerifiedAt: new Date(),
                },
              });

              logger.info('stripe.subscription.reconciled', {
                component: 'billing-webhook',
                userId: subRecord.userId,
                resolvedPlan: reconciled.plan,
                hasIaAddon: reconciled.hasIaAddon,
                activePriceIds,
              });
            }
          }
        }

        break;
      }

      // ================================================================
      // INVOICE EVENTS — Payment tracking
      // ================================================================
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

        // On failed payment for recurring invoices, log for monitoring
        if (event.type === 'invoice.payment_failed') {
          logger.warn('stripe.invoice.payment_failed', {
            component: 'billing-webhook',
            userId: user.id,
            invoiceId: invoice.id,
            amountDue: invoice.amount_due,
          });
        }

        break;
      }

      // ================================================================
      // CONNECT — Marketplace creator payout account sync
      // ================================================================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const synced = await syncCreatorPayoutAccountStatus(account);
        logger.info('stripe.connect.account.updated', {
          component: 'billing-webhook',
          stripeAccountId: account.id,
          synced: Boolean(synced),
        });
        break;
      }

      default:
        // Unhandled event types are silently acknowledged
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('stripe.webhook.failed', error, { component: 'billing-webhook' });

    if ((error as { code?: string })?.code === 'ENV_NOT_SET') {
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

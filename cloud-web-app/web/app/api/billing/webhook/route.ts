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
import { recordSaleTransaction, markTransactionDisputed } from '@/lib/marketplace/transactions';
import { calculateRevenueSplit, RevenueLane } from '@/lib/marketplace/payouts';
import { multiplayerCostGuard } from '@/lib/redis-cost-guard';
import { logger } from '@/lib/observability/logger';
import {
  AT_RISK_SUBSCRIPTION_STATUSES,
  INACTIVE_SUBSCRIPTION_STATUSES,
  downgradeUserPlanData,
  reconcilePlanFromPriceIds,
} from '@/lib/billing/stripe-plan-reconcile';

export const dynamic = 'force-dynamic';

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

        // ── PAYG payment method setup (Checkout mode=setup) — 6C.4 ──
        if (session.metadata?.kind === 'payg_payment_method_setup') {
          const userId = String(session.metadata?.userId || session.client_reference_id || '');
          if (!userId) {
            logger.error('stripe.payg_pm.missing_user', new Error('Missing userId on setup session'), {
              component: 'billing-webhook',
              sessionId: session.id,
            });
            break;
          }

          const stripe = getStripe();
          let paymentMethodId: string | null = null;
          const setupIntentRef = session.setup_intent;
          if (typeof setupIntentRef === 'string') {
            const si = await stripe.setupIntents.retrieve(setupIntentRef);
            paymentMethodId =
              typeof si.payment_method === 'string'
                ? si.payment_method
                : si.payment_method?.id || null;
          } else if (setupIntentRef && typeof setupIntentRef === 'object') {
            paymentMethodId =
              typeof setupIntentRef.payment_method === 'string'
                ? setupIntentRef.payment_method
                : setupIntentRef.payment_method?.id || null;
          }

          if (!paymentMethodId) {
            logger.error('stripe.payg_pm.missing_pm', new Error('Setup session without payment_method'), {
              component: 'billing-webhook',
              sessionId: session.id,
              userId,
            });
            break;
          }

          const customerId =
            typeof session.customer === 'string' ? session.customer : session.customer?.id || null;

          await prisma.user.update({
            where: { id: userId },
            data: {
              stripePaymentMethodId: paymentMethodId,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            },
          });

          if (customerId) {
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            }).catch((error) => {
              logger.warn('stripe.payg_pm.default_pm_failed', {
                component: 'billing-webhook',
                userId,
                error: error instanceof Error ? error.message : String(error),
              });
            });
          }

          logger.info('stripe.payg_pm.saved', {
            component: 'billing-webhook',
            userId,
            paymentMethodId,
          });
          break;
        }

        // ── Marketplace one-off item purchase (Connect destination charge) ──
        // Handled separately from subscription checkout below: it has
        // mode='payment', not 'subscription', and settles funds directly to
        // the creator's connected account via transfer_data.destination.
        if (session.metadata?.kind === 'marketplace_sale') {
          const itemId = String(session.metadata?.itemId || '');
          const buyerId = String(session.metadata?.buyerId || session.client_reference_id || '');
          const creatorId = String(session.metadata?.creatorId || '');
          const paymentIntentId =
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;

          if (!itemId || !buyerId || !creatorId) {
            logger.error('stripe.marketplace_sale.missing_metadata', new Error('Missing marketplace_sale metadata'), {
              component: 'billing-webhook',
              sessionId: session.id,
            });
            break;
          }

          const [item, buyer] = await Promise.all([
            prisma.marketplaceItem.findUnique({ where: { id: itemId } }),
            prisma.user.findUnique({ where: { id: buyerId } }),
          ]);

          if (!item || !buyer) {
            logger.error('stripe.marketplace_sale.entity_not_found', new Error('Item or buyer not found'), {
              component: 'billing-webhook',
              sessionId: session.id,
              itemId,
              buyerId,
            });
            break;
          }

          const amountCents = Number(session.amount_total ?? item.price);
          // Law XII / H.0: Universal Store = 30/70 via RevenueLane (never hardcode).
          const { creatorCents, platformCents } = calculateRevenueSplit(
            amountCents,
            RevenueLane.UNIVERSAL_STORE,
          );

          await recordSaleTransaction({
            itemId: item.id,
            itemTitle: item.title,
            buyerId: buyer.id,
            buyerEmail: buyer.email,
            creatorId,
            amountCents,
            creatorCents,
            platformCents,
            currency: String(session.currency || 'usd'),
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
          });

          await prisma.marketplaceItem.update({
            where: { id: item.id },
            data: { downloads: { increment: 1 } },
          });

          await prisma.installedExtension.upsert({
            where: { userId_extensionId: { userId: buyer.id, extensionId: item.id } },
            update: {},
            create: { userId: buyer.id, extensionId: item.id },
          });

          logger.info('stripe.marketplace_sale.recorded', {
            component: 'billing-webhook',
            itemId: item.id,
            creatorId,
            buyerId: buyer.id,
            amountCents,
            creatorCents,
            platformCents,
          });

          // OMNI-PLAN PILAR 5, "A Lei dos 12%": this sale's platform cut
          // offsets/unlocks that game's dedicated-server scaling — see
          // lib/redis-cost-guard.ts#recordRevenueCreditFromSale.
          //
          // `item.gameId` (Prisma `MarketplaceItem.gameId` -> `PublishedGame`)
          // is the source of truth as of the schema migration adding that
          // column; `session.metadata?.gameId` is kept as a secondary fallback
          // for the rare case a caller stamped it directly on the Checkout
          // Session without persisting it on the item row. Most marketplace
          // items (IDE templates/plugins) are still not scoped to a game and
          // correctly no-op here rather than crediting the wrong entity.
          const gameId = item.gameId || String(session.metadata?.gameId || '');
          if (gameId) {
            await multiplayerCostGuard.recordRevenueCreditFromSale(gameId, platformCents);
          }

          break;
        }

        // ── Prepaid AI Credit Wallet purchase (mode=payment) ──
        if (session.metadata?.kind === 'wallet_credit_purchase') {
          const walletUserId = String(session.metadata?.userId || session.client_reference_id || '');
          const intentId = String(session.metadata?.intentId || '');
          const packageId = String(session.metadata?.packageId || '') || null;
          const credits = Number(session.metadata?.credits || 0);
          const bonusCredits = Number(session.metadata?.bonusCredits || 0);
          const amountUsdCents = Number(session.metadata?.amountUsdCents || session.amount_total || 0);

          if (!walletUserId || !intentId) {
            logger.error('stripe.wallet_purchase.missing_metadata', new Error('Missing wallet purchase metadata'), {
              component: 'billing-webhook',
              sessionId: session.id,
            });
            break;
          }

          const { settleWalletCreditPurchase } = await import('@/lib/billing/wallet-purchase-settle');
          const settled = await settleWalletCreditPurchase({
            userId: walletUserId,
            intentId,
            stripeCheckoutSessionId: session.id,
            packageId,
            credits,
            bonusCredits,
            amountUsdCents,
          });

          if (!settled.ok) {
            logger.error('stripe.wallet_purchase.settle_failed', new Error(settled.message), {
              component: 'billing-webhook',
              sessionId: session.id,
              code: settled.code,
            });
            break;
          }

          logger.info('stripe.wallet_purchase.settled', {
            component: 'billing-webhook',
            sessionId: session.id,
            userId: walletUserId,
            credits: settled.credits,
          });
          break;
        }

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
            // ── DOWNGRADE: subscription is fully canceled/expired (6D.1 / DEBT-FIN-005) ──
            await prisma.user.update({
              where: { id: subRecord.userId },
              data: downgradeUserPlanData(),
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

      // ================================================================
      // DISPUTES — Chargeback protection for the marketplace ledger.
      // A disputed sale must never count toward a creator's available or
      // pending balance (see lib/marketplace/transactions.ts#computeCreatorBalances).
      // ================================================================
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : '';
        if (paymentIntentId) {
          await markTransactionDisputed(paymentIntentId);
          logger.warn('stripe.charge.dispute.created', {
            component: 'billing-webhook',
            paymentIntentId,
            disputeId: dispute.id,
            reason: dispute.reason,
          });
        }
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

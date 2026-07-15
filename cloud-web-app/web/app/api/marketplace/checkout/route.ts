/**
 * Marketplace Checkout API
 * POST /api/marketplace/checkout - Create a real Stripe Checkout Session for a
 * single paid MarketplaceItem, using a Connect destination charge so funds
 * settle directly with the creator's connected account minus the platform's
 * application fee (Universal Store 30/70 — Law XII / RevenueLane.UNIVERSAL_STORE).
 *
 * This is the real money-movement counterpart to the cart persisted in
 * /api/marketplace/cart — the cart only tracks intent; this route is where a
 * purchase actually becomes a charge. Only one item per session is supported
 * today because Stripe Checkout can only route a destination charge to a
 * single connected account per session; multi-creator cart checkout needs
 * either N sequential sessions or Stripe's newer multi-party split (tracked
 * separately, not required for a correct single-item purchase flow).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { optionalEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { buildAppUrl } from '@/lib/server/app-origin';
import { billingRuntimeCapabilityResponse, getBillingRuntimeState } from '@/lib/server/billing-runtime';
import { getCreatorPayoutAccount } from '@/lib/server/stripe-connect';
import { calculateRevenueSplit, RevenueLane } from '@/lib/marketplace/payouts';
import { createComponentLogger } from '@/lib/observability/logger';
import { enforceRouteRateLimit, MARKETPLACE_CHECKOUT_RATE_LIMIT } from '@/lib/server/route-rate-limit';

const routeLogger = createComponentLogger('api/marketplace/checkout/route');

export const dynamic = 'force-dynamic';

interface MarketplaceCheckoutRequest {
  itemId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const rateLimited = await enforceRouteRateLimit({
      req,
      capability: 'MARKETPLACE_CHECKOUT',
      route: '/api/marketplace/checkout',
      config: MARKETPLACE_CHECKOUT_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

    const user = requireAuth(req);
    await requireFeatureForUser(user.userId, 'marketplace');

    const body: MarketplaceCheckoutRequest = await req.json();
    const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : '';
    if (!itemId) {
      return NextResponse.json({ error: 'ITEM_ID_REQUIRED', message: 'itemId is required' }, { status: 400 });
    }

    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: 'ASSET_NOT_FOUND', message: 'Marketplace asset not found' }, { status: 404 });
    }

    if (item.price <= 0) {
      return NextResponse.json(
        { error: 'ASSET_IS_FREE', message: 'Free assets should be installed via /api/marketplace/install, not checkout.' },
        { status: 400 }
      );
    }

    if (item.authorId === user.userId) {
      return NextResponse.json({ error: 'CANNOT_BUY_OWN_ASSET', message: 'Creators cannot purchase their own listings.' }, { status: 400 });
    }

    const creatorAccount = await getCreatorPayoutAccount(item.authorId);
    if (!creatorAccount || !creatorAccount.chargesEnabled) {
      return NextResponse.json(
        {
          error: 'CREATOR_PAYOUTS_NOT_READY',
          message: 'This creator has not finished Stripe Connect onboarding yet; the item cannot be purchased.',
        },
        { status: 409 }
      );
    }

    const billingRuntime = await getBillingRuntimeState();
    if (!billingRuntime.checkoutReady) {
      return billingRuntimeCapabilityResponse('checkout', billingRuntime);
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripe = getStripe();

    let stripeCustomerId = dbUser.stripeCustomerId || null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: { userId: dbUser.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: dbUser.id }, data: { stripeCustomerId } });
    }

    // Law XII / H.0: Universal Store listings = 30/70 (not IAP 12%).
    const split = calculateRevenueSplit(item.price, RevenueLane.UNIVERSAL_STORE);
    const currency = (creatorAccount.defaultCurrency || 'usd').toLowerCase();

    const appUrl = (billingRuntime.gateway.checkoutOrigin || optionalEnv('NEXT_PUBLIC_APP_URL') || buildAppUrl('', req)).replace(/\/+$/, '');
    const resolvedSuccessUrl = body.successUrl || `${appUrl}/marketplace?purchase=success&item=${encodeURIComponent(item.id)}`;
    const resolvedCancelUrl = body.cancelUrl || `${appUrl}/marketplace?purchase=cancelled&item=${encodeURIComponent(item.id)}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerId,
      client_reference_id: dbUser.id,
      metadata: {
        kind: 'marketplace_sale',
        itemId: item.id,
        buyerId: dbUser.id,
        creatorId: item.authorId,
        revenueLane: RevenueLane.UNIVERSAL_STORE,
        ...(item.gameId ? { gameId: item.gameId } : {}),
      },
      payment_intent_data: {
        application_fee_amount: split.platformCents,
        transfer_data: {
          destination: creatorAccount.stripeAccountId,
        },
        metadata: {
          kind: 'marketplace_sale',
          itemId: item.id,
          buyerId: dbUser.id,
          creatorId: item.authorId,
          ...(item.gameId ? { gameId: item.gameId } : {}),
        },
      },
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: item.price,
            product_data: {
              name: item.title,
              metadata: { itemId: item.id },
            },
          },
          quantity: 1,
        },
      ],
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
      split: { creatorCents: split.creatorCents, platformCents: split.platformCents },
    });
  } catch (error) {
    routeLogger.error('Marketplace checkout error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    if ((error as { code?: string })?.code === 'ENV_NOT_SET') {
      return NextResponse.json(
        { error: 'STRIPE_NOT_CONFIGURED', message: (error as Error).message },
        { status: 503 }
      );
    }

    return apiInternalError('Failed to create marketplace checkout session');
  }
}

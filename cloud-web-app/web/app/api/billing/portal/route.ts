/**
 * Stripe Customer Portal API
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { optionalEnv } from '@/lib/env';
import { buildAppUrl } from '@/lib/server/app-origin';
import { enforceRateLimit } from '@/lib/server/rate-limit';

function resolveAppUrl(req?: NextRequest): string {
  const explicit = optionalEnv('NEXT_PUBLIC_APP_URL') || optionalEnv('NEXTAUTH_URL');
  return (explicit || buildAppUrl('', req)).replace(/\/+$/, '');
}

function handleStripeConfigError(error: unknown): NextResponse | null {
  if ((error as any)?.code === 'ENV_NOT_SET') {
    return NextResponse.json(
      { error: 'STRIPE_NOT_CONFIGURED', message: (error as Error).message },
      { status: 503 }
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const auth = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'billing-portal-post',
      key: auth.userId,
      max: 24,
      windowMs: 60 * 60 * 1000,
      message: 'Too many billing portal session requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${resolveAppUrl(req)}/billing`,
      configuration: await getOrCreatePortalConfiguration(stripe, req),
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('[billing/portal:POST] Error:', error);
    const mapped = handleStripeConfigError(error);
    if (mapped) return mapped;
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const stripe = getStripe();
    const auth = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'billing-portal-get',
      key: auth.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many billing info requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        plan: true,
        trialEndsAt: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({
        hasSubscription: false,
        plan: user?.plan || 'starter_trial',
        canAccessPortal: false,
        subscription: null,
        invoices: [],
        paymentMethods: [],
        trial: user?.trialEndsAt
          ? {
              endsAt: user.trialEndsAt,
              isActive: new Date(user.trialEndsAt) > new Date(),
              daysRemaining: Math.max(
                0,
                Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              ),
            }
          : null,
      });
    }

    let subscription: Stripe.Subscription | null = null;
    if (user.stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      } catch {
        subscription = null;
      }
    }

    const [invoiceList, paymentMethodList] = await Promise.all([
      stripe.invoices
        .list({ customer: user.stripeCustomerId, limit: 10 })
        .then((res) => res.data)
        .catch(() => [] as Stripe.Invoice[]),
      stripe.paymentMethods
        .list({ customer: user.stripeCustomerId, type: 'card' })
        .then((res) => res.data)
        .catch(() => [] as Stripe.PaymentMethod[]),
    ]);

    return NextResponse.json({
      hasSubscription: !!subscription && subscription.status === 'active',
      plan: user.plan,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: subscription.cancel_at,
          }
        : null,
      trial: user.trialEndsAt
        ? {
            endsAt: user.trialEndsAt,
            isActive: new Date(user.trialEndsAt) > new Date(),
            daysRemaining: Math.max(
              0,
              Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            ),
          }
        : null,
      invoices: invoiceList.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      })),
      paymentMethods: paymentMethodList.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === subscription?.default_payment_method,
      })),
      canAccessPortal: true,
    });
  } catch (error) {
    console.error('[billing/portal:GET] Error:', error);
    const mapped = handleStripeConfigError(error);
    if (mapped) return mapped;
    return NextResponse.json({ error: 'Failed to fetch billing info' }, { status: 500 });
  }
}

async function getOrCreatePortalConfiguration(stripe: Stripe, req?: NextRequest): Promise<string> {
  const appUrl = resolveAppUrl(req);
  const configs = await stripe.billingPortal.configurations.list({ limit: 1 });

  if (configs.data.length > 0 && configs.data[0].is_default) {
    return configs.data[0].id;
  }

  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Aethel Engine - Manage your subscription',
      privacy_policy_url: `${appUrl}/legal/privacy`,
      terms_of_service_url: `${appUrl}/legal/terms`,
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'name', 'address', 'phone', 'tax_id'],
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price', 'quantity', 'promotion_code'],
        proration_behavior: 'create_prorations',
        products: await getProductsForPortal(stripe),
      },
    },
      default_return_url: `${appUrl}/billing`,
  });

  return config.id;
}

async function getProductsForPortal(stripe: Stripe) {
  const products = await stripe.products.list({ active: true, limit: 10 });

  return products.data
    .filter((p) => p.metadata.plan_type)
    .map((product) => ({
      product: product.id,
      prices: product.default_price ? [product.default_price as string] : [],
    }));
}

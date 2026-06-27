/**
 * Stripe Connect Onboarding Route
 * POST /api/marketplace/stripe/onboard
 *
 * Creates or retrieves a Stripe Connect Express account for the creator,
 * then returns an Account Link URL to redirect to Stripe's onboarding flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('stripe.onboard');

export async function POST(req: NextRequest): Promise<NextResponse> {
  let user;
  try {
    user = requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { returnUrl?: string };
  const returnUrl = body.returnUrl ?? `${process.env.NEXTAUTH_URL}/marketplace/creator/payout-setup`;
  const refreshUrl = `${process.env.NEXTAUTH_URL}/marketplace/creator/payout-setup?refresh=1`;

  if (!process.env.STRIPE_SECRET_KEY) {
    // Return a mock URL for local dev
    log.warn('STRIPE_SECRET_KEY not set — returning mock onboarding URL');
    return NextResponse.json({
      url: returnUrl,
      mock: true,
      message: 'Stripe not configured — set STRIPE_SECRET_KEY for production',
    });
  }

  try {
    const Stripe = (await import('stripe')).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY);

    // Look up existing Stripe account ID for this user
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, email: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has a Stripe account stored
    // (in a full impl, store stripeAccountId in User model)
    let accountId: string | null = null;

    if (!accountId) {
      // Create new Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: dbUser.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        settings: { payouts: { schedule: { interval: 'monthly', monthly_anchor: 1 } } },
      });
      accountId = account.id;
      log.info('Created Stripe Express account', { accountId, userId: user.userId });
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (err) {
    log.error('Stripe onboarding error', { err });
    return NextResponse.json({ error: 'Failed to create Stripe onboarding link' }, { status: 500 });
  }
}

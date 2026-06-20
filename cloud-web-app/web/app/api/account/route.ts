/**
 * Account Erasure (LGPD/GDPR right to be forgotten)
 * DELETE /api/account
 *
 * IMPROVE-COMPLIANCE-001: Self-serve, irreversible account deletion.
 * Removes the User row; all owned records (projects, files, sessions,
 * chat threads, usage, payments, subscription, etc.) cascade via Prisma
 * onDelete: Cascade.
 *
 * Safety: requires an explicit confirmation payload that matches the
 * account email and the literal string "DELETE". Best-effort cancels the
 * Stripe subscription before deletion (non-blocking).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { getStripe } from '@/lib/stripe';
import { apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/account/route');

export const dynamic = 'force-dynamic';

type DeleteBody = {
  confirmation?: unknown;
  email?: unknown;
};

async function bestEffortCancelStripe(stripeSubscriptionId: string | null): Promise<boolean> {
  if (!stripeSubscriptionId) return false;
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(stripeSubscriptionId);
    return true;
  } catch (error) {
    // Stripe not configured or already canceled — never block erasure on this.
    routeLogger.warn('account.delete.stripe_cancel_skipped', {
      stripeSubscriptionId,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return false;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = auth.userId;

    let body: DeleteBody = {};
    try {
      body = (await req.json()) as DeleteBody;
    } catch {
      body = {};
    }

    const confirmation = typeof body.confirmation === 'string' ? body.confirmation.trim() : '';
    const confirmEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeSubscriptionId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    if (confirmation !== 'DELETE' || confirmEmail !== user.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: 'CONFIRMATION_REQUIRED',
          message:
            'Send { "confirmation": "DELETE", "email": "<your account email>" } to permanently erase this account.',
        },
        { status: 400 }
      );
    }

    const stripeCanceled = await bestEffortCancelStripe(user.stripeSubscriptionId);

    await prisma.user.delete({ where: { id: userId } });

    routeLogger.info('account.deleted', {
      userId,
      stripeCanceled,
    });

    const res = NextResponse.json({
      success: true,
      message: 'Account permanently deleted. All associated data has been erased.',
      stripeCanceled,
    });
    // Invalidate the auth cookie on the client.
    res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  } catch (error) {
    routeLogger.error('account.delete.failed', error);
    return apiInternalError();
  }
}

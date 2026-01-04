import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// GET /api/billing/subscription
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const [dbUser, subscription] = await prisma.$transaction([
      prisma.user.findUnique({ where: { id: user.userId }, select: { id: true, plan: true, stripeCustomerId: true } }),
      prisma.subscription.findUnique({ where: { userId: user.userId } }),
    ]);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        plan: dbUser.plan,
        stripeCustomerId: dbUser.stripeCustomerId,
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
              stripeSubscriptionId: subscription.stripeSubscriptionId,
              stripePriceId: subscription.stripePriceId,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Billing subscription error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

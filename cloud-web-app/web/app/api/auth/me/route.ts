import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

const routeLogger = createComponentLogger('api.auth.me');

type OptionalCreditBalanceClient = {
  creditBalance?: {
    findUnique(args: { where: { userId: string } }): Promise<{ balance: number } | null>;
  };
};

function trialStatus(trialEndsAt: Date | null) {
  if (!trialEndsAt) return null;

  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return {
    endsAt: trialEndsAt.toISOString(),
    isActive: trialEndsAt.getTime() > Date.now(),
    daysRemaining,
  };
}

/**
 * GET /api/auth/me
 *
 * Returns authenticated user data.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        plan: true,
        trialEndsAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let credits: number | null = null;
    let plan: string | null = null;

    try {
      const optionalPrisma = prisma as typeof prisma & OptionalCreditBalanceClient;
      const creditBalance = await optionalPrisma.creditBalance?.findUnique({
        where: { userId: user.id },
      });
      if (creditBalance) {
        credits = creditBalance.balance;
      }
    } catch {
      // Optional model may not exist.
    }

    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });
      if (subscription) {
        plan = subscription.stripePriceId || 'pro';
      }
    } catch {
      // Optional model may not exist.
    }

    const trial = trialStatus(user.trialEndsAt);

    const authHeader = request.headers.get('authorization');
    const tokenStr = (authHeader && authHeader.startsWith('Bearer ')) 
      ? authHeader.substring(7) 
      : request.cookies.get('token')?.value;

    return NextResponse.json({
      ...user,
      credits,
      trial,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      plan: plan || user.plan || (trial?.isActive ? 'starter_trial' : 'free'),
      authenticated: true,
      token: tokenStr || null,
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    const message = err?.message || '';

    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    if (err?.code === 'AUTH_NOT_CONFIGURED' || message.includes('AUTH_NOT_CONFIGURED')) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          error: 'AUTH_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    routeLogger.error('auth.me.failed', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

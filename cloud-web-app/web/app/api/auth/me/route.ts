import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 *
 * Returns authenticated user data.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-me',
      key: authUser.userId,
      max: 180,
      windowMs: 60 * 1000,
      message: 'Too many auth profile checks. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
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
      const creditBalance = await (prisma as any).creditBalance?.findUnique?.({
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

    return NextResponse.json({
      ...user,
      credits,
      plan: plan || 'free',
      authenticated: true,
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

    console.error('[auth/me] Error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

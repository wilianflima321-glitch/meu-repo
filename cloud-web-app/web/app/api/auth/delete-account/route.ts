import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-delete-account',
      key: user.userId,
      max: 8,
      windowMs: 60 * 60 * 1000,
      message: 'Too many account deletion attempts. Please retry later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    await prisma.user.delete({
      where: { id: user.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

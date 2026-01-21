import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    const sessionId = ctx.params.id;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: user.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session revoke error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

function getCurrentToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return req.cookies.get('token')?.value ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const currentToken = getCurrentToken(req);

    const sessions = await prisma.session.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: currentToken ? s.token === currentToken : false,
      })),
    });
  } catch (error) {
    console.error('Sessions error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const currentToken = getCurrentToken(req);

    if (currentToken) {
      await prisma.session.deleteMany({
        where: {
          userId: user.userId,
          token: { not: currentToken },
        },
      });
    } else {
      await prisma.session.deleteMany({
        where: { userId: user.userId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sessions delete error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

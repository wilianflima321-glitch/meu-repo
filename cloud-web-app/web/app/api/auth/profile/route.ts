import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
        // Em alguns schemas, role existe; manter compatibilidade.
        // Se não existir, Prisma vai acusar em build/typecheck (mas neste repo já usamos role no token).
        role: true as any,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      plan: user.plan ?? undefined,
      role: (user as any).role ?? undefined,
    });
  } catch (error) {
    console.error('Profile error:', error);

		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
		return apiInternalError();
  }
}

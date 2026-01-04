import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Auth
    const user = requireAuth(req);

    // 2. Verify Admin (Simple check for now, can be expanded)
    // In a real scenario, check user.role === 'ADMIN'
    // For now, we allow any authenticated user to see the list (Internal Tool)
    // OR check specific email
    // if (user.email !== 'admin@aethel.com') { ... }

    // 3. Fetch Users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        createdAt: true,
        stripeCustomerId: true,
        _count: {
          select: { projects: true, sessions: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to 50 for performance
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin Users Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

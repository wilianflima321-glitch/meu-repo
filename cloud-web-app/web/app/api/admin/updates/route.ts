import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// UPDATES ADMIN API (Derived from audit logs)
// =============================================================================

const updateWhere = {
  OR: [
    { action: { contains: 'update' } },
    { action: { contains: 'deploy' } },
    { action: { contains: 'upgrade' } },
    { action: { contains: 'release' } },
    { resource: { contains: 'version' } },
  ] as { action?: { contains: string }; resource?: { contains: string } }[],
};

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const logs = await prisma.auditLog.findMany({
      where: updateWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items = logs.map((log) => {
      const status = log.severity === 'critical' ? 'blocked' : log.severity === 'warning' ? 'review' : 'approved';
      return {
        id: log.id,
        type: log.category || 'system',
        description: log.action,
        resource: log.resource,
        status,
        createdAt: log.createdAt.toISOString(),
      };
    });

    const summary = items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'approved') acc.approved += 1;
        if (item.status === 'review') acc.review += 1;
        if (item.status === 'blocked') acc.blocked += 1;
        return acc;
      },
      { total: 0, approved: 0, review: 0, blocked: 0 }
    );

    return NextResponse.json({ items, summary });
  } catch (error) {
    console.error('[Admin Updates] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:settings:view');

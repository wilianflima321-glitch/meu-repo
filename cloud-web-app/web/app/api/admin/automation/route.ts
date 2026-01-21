import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// AUTOMATION ADMIN API (Derived from audit logs)
// =============================================================================

const automationWhere = {
  OR: [
    { action: { contains: 'automation' } },
    { action: { contains: 'workflow' } },
    { resource: { contains: 'automation' } },
  ] as { action?: { contains: string }; resource?: { contains: string } }[],
};

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const logs = await prisma.auditLog.findMany({
      where: automationWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items = logs.map((log) => ({
      id: log.id,
      action: log.action,
      category: log.category,
      severity: log.severity,
      resource: log.resource,
      createdAt: log.createdAt.toISOString(),
    }));

    const summary = items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.severity === 'critical') acc.critical += 1;
        if (item.severity === 'warning') acc.warning += 1;
        return acc;
      },
      { total: 0, warning: 0, critical: 0 }
    );

    return NextResponse.json({ items, summary });
  } catch (error) {
    console.error('[Admin Automation] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch automation data' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:settings:view');

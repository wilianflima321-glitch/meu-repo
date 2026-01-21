import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// SECURITY OVERVIEW ADMIN API
// =============================================================================

const truthy = (value?: string) => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const where = {
      OR: [
        { category: 'security' },
        { action: { contains: 'security' } },
        { resource: { contains: 'security' } },
      ] as { category?: string; action?: { contains: string }; resource?: { contains: string } }[],
    };

    const [logs, total, warning, critical] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, severity: 'warning' } }),
      prisma.auditLog.count({ where: { ...where, severity: 'critical' } }),
    ]);

    const settings = {
      enforce2FA: truthy(process.env.SECURITY_ENFORCE_2FA),
      blockSuspiciousIps: truthy(process.env.SECURITY_BLOCK_SUSPICIOUS_IPS),
    };

    return NextResponse.json({
      settings,
      stats: { total, warning, critical },
      logs: logs.map((log) => ({
        id: log.id,
        adminEmail: log.adminEmail,
        action: log.action,
        category: log.category,
        severity: log.severity,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Admin Security] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch security overview' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:dashboard:metrics');

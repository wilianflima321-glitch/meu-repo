import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

const ACTIONS = ['IDE_SETTINGS_UPDATE', 'IDE_SETTINGS_PUBLISH'];

export const GET = withAdminAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

      const logs = await prisma.auditLog.findMany({
        where: {
          action: { in: ACTIONS },
          resource: 'ide-settings',
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const items = logs.map((log) => ({
        id: log.id,
        action: log.action,
        adminEmail: log.adminEmail,
        adminRole: log.adminRole,
        severity: log.severity,
        createdAt: log.createdAt.toISOString(),
        metadata: log.metadata,
      }));

      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin IDE Settings History] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
  },
  'ops:settings:view'
);

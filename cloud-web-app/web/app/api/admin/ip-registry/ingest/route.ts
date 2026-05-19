import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/admin/ip-registry/ingest/route');

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const { ip } = (await request.json()) as { ip?: string };
      if (!ip) {
        return NextResponse.json({ error: 'IP is required' }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          action: 'IP_REGISTRY_INGEST',
          category: 'security',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ip-registry',
          metadata: { ip },
        },
      });

      return NextResponse.json({ status: 'accepted' });
    } catch (error) {
      routeLogger.error('[Admin IP Registry Ingest] Error:', error);
      return NextResponse.json({ error: 'Failed to ingest IP' }, { status: 500 });
    }
  },
  'ops:settings:edit'
);

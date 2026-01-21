import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { key, enabled } = body as { key?: string; enabled?: boolean };
      if (!key || typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
      }

      const flag = await prisma.featureFlag.update({
        where: { key },
        data: { enabled },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FEATURE_FLAG_TOGGLE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'feature-flags',
          metadata: { key, enabled },
        },
      });

      return NextResponse.json({ item: flag });
    } catch (error) {
      console.error('[Admin Feature Flags Toggle] Error:', error);
      return NextResponse.json({ error: 'Failed to toggle flag' }, { status: 500 });
    }
  },
  'ops:settings:feature_flags'
);

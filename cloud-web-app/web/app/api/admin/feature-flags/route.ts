import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// FEATURE FLAGS ADMIN API
// =============================================================================

export const GET = withAdminAuth(
  async () => {
    try {
      const flags = await prisma.featureFlag.findMany({ orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ items: flags });
    } catch (error) {
      console.error('[Admin Feature Flags] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 });
    }
  },
  'ops:settings:feature_flags'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { key, name, description, type, percentage, rules, environments, enabled } = body as {
        key?: string;
        name?: string;
        description?: string;
        type?: string;
        percentage?: number;
        rules?: any;
        environments?: any;
        enabled?: boolean;
      };

      if (!key || !name) {
        return NextResponse.json({ error: 'Key e name são obrigatórios' }, { status: 400 });
      }

      const flag = await prisma.featureFlag.upsert({
        where: { key },
        create: {
          key,
          name,
          description: description || null,
          type: type || 'boolean',
          percentage: typeof percentage === 'number' ? percentage : null,
          rules: rules ?? null,
          environments: environments ?? null,
          enabled: enabled ?? true,
          createdBy: user.id,
        },
        update: {
          name,
          description: description || null,
          type: type || 'boolean',
          percentage: typeof percentage === 'number' ? percentage : null,
          rules: rules ?? null,
          environments: environments ?? null,
          enabled: enabled ?? true,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FEATURE_FLAG_UPSERT',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'feature-flags',
          metadata: { key: flag.key, type: flag.type },
        },
      });

      return NextResponse.json({ item: flag });
    } catch (error) {
      console.error('[Admin Feature Flags] Error:', error);
      return NextResponse.json({ error: 'Failed to upsert flag' }, { status: 500 });
    }
  },
  'ops:settings:feature_flags'
);

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import { DEFAULT_SETTINGS, SETTING_DEFINITIONS } from '@/lib/settings/settings-service';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/admin/ide-settings/publish/route');

type IdeSettingRow = {
  key: string;
  value: unknown;
};

const resolveScope = (env?: string) => {
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'staging';
};

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const { searchParams } = new URL(request.url);
      const from = resolveScope(searchParams.get('from') || undefined);
      const to = resolveScope(searchParams.get('to') || undefined);

      if (from === to) {
        return NextResponse.json({ error: 'Invalid environments' }, { status: 400 });
      }

      const ideSetting = (prisma as any).ideSetting;

      const [globalSettings, fromSettings] = await Promise.all([
        ideSetting.findMany({ where: { scope: 'global' } }),
        ideSetting.findMany({ where: { scope: from } }),
      ]);

      const toMap = (rows: IdeSettingRow[]) =>
        rows.reduce((acc: Record<string, unknown>, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});

      const resolved = {
        ...DEFAULT_SETTINGS,
        ...toMap(globalSettings),
        ...toMap(fromSettings),
      };

      const keys = Object.keys(SETTING_DEFINITIONS);

      const operations = keys.map((key) =>
        ideSetting.upsert({
          where: { key_scope: { key, scope: to } },
          create: {
            key,
            value: resolved[key],
            scope: to,
            updatedBy: user.id,
          },
          update: {
            value: resolved[key],
            updatedBy: user.id,
          },
        })
      );

      await prisma.$transaction(operations);

      await prisma.auditLog.create({
        data: {
          action: 'IDE_SETTINGS_PUBLISH',
          category: 'system',
          severity: 'warning',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ide-settings',
          metadata: {
            from,
            to,
            keys: keys.length,
          } as any,
        },
      });

      return NextResponse.json({ status: 'ok', from, to, keys: keys.length });
    } catch (error) {
      routeLogger.error('[Admin IDE Settings Publish] Error:', error);
      return NextResponse.json({ error: 'Failed to publish IDE settings' }, { status: 500 });
    }
  },
  'ops:settings:edit'
);

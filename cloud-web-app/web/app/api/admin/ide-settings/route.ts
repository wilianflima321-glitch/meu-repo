import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import {
  DEFAULT_SETTINGS,
  SETTING_CATEGORIES,
  SETTING_DEFINITIONS,
} from '@/lib/settings/settings-service';

// =============================================================================
// IDE SETTINGS ADMIN API
// =============================================================================

type UpdatePayload = {
  updates: Record<string, unknown>;
  reason?: string;
  environment?: 'staging' | 'production';
};

const resolveScope = (env?: string) => {
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'staging';
};

const sanitizeReason = (reason?: string) => {
  if (!reason) return null;
  const trimmed = reason.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 500);
};

const normalizeUpdates = (updates: Record<string, unknown>) => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned;
};

const requireIdeSettingModel = () => {
  const ideSetting = (prisma as any).ideSetting;
  if (!ideSetting) {
    throw new Error('IDE settings model not configured');
  }
  return ideSetting;
};

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = resolveScope(searchParams.get('env') || undefined);
    const ideSetting = requireIdeSettingModel();
    const [globalSettings, envSettings] = await Promise.all([
      ideSetting.findMany({
        where: { scope: 'global' },
        orderBy: { key: 'asc' },
      }),
      ideSetting.findMany({
        where: { scope: environment },
        orderBy: { key: 'asc' },
      }),
    ]);

    const toMap = (rows: any[]) =>
      rows.reduce((acc: Record<string, unknown>, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

    const values = {
      ...DEFAULT_SETTINGS,
      ...toMap(globalSettings),
      ...toMap(envSettings),
    };

    return NextResponse.json({
      categories: SETTING_CATEGORIES,
      definitions: SETTING_DEFINITIONS,
      values,
      environment,
    });
  } catch (error) {
    console.error('[Admin IDE Settings] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch IDE settings' }, { status: 500 });
  }
}

async function putHandler(request: NextRequest, context: { user: { id: string; email: string; role: string } }) {
  try {
    const body = (await request.json()) as UpdatePayload;
    const updates = normalizeUpdates(body?.updates || {});
    const environment = resolveScope(body?.environment);

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const allowedKeys = new Set(Object.keys(SETTING_DEFINITIONS));
    const invalidKeys = Object.keys(updates).filter((key) => !allowedKeys.has(key));
    if (invalidKeys.length > 0) {
      return NextResponse.json({ error: 'Invalid setting keys', invalidKeys }, { status: 400 });
    }

    const ideSetting = requireIdeSettingModel();
    const operations = Object.entries(updates).map(([key, value]) => {
      const definition = (SETTING_DEFINITIONS as Record<string, any>)[key];
      if (definition?.default !== undefined && typeof value !== typeof definition.default) {
        throw new Error(`Invalid type for ${key}`);
      }

      return ideSetting.upsert({
        where: { key_scope: { key, scope: environment } },
        create: {
          key,
          value,
          scope: environment,
          updatedBy: context.user.id,
        },
        update: {
          value,
          updatedBy: context.user.id,
        },
      });
    });

    await prisma.$transaction(operations);

    await prisma.auditLog.create({
      data: {
        action: 'IDE_SETTINGS_UPDATE',
        category: 'system',
        severity: 'info',
        adminId: context.user.id,
        adminEmail: context.user.email,
        adminRole: context.user.role,
        resource: 'ide-settings',
        metadata: {
          updates,
          reason: sanitizeReason(body?.reason),
          environment,
        } as any,
      },
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[Admin IDE Settings] Error:', error);
    return NextResponse.json({ error: 'Failed to update IDE settings' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:settings:view');
export const PUT = withAdminAuth(putHandler, 'ops:settings:edit');

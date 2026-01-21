import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// AI SETTINGS ADMIN API
// =============================================================================

type AiSettingsPayload = {
  model: string;
  creditCost: number;
  maxTokens: number;
  policy: string;
  enabled: boolean;
};

type UpdatePayload = Partial<AiSettingsPayload> & { environment?: 'staging' | 'production' };

const DEFAULTS: AiSettingsPayload = {
  model: 'gpt-4',
  creditCost: 0.01,
  maxTokens: 1000,
  policy: 'Bloquear conteúdo prejudicial',
  enabled: true,
};

const KEYS = {
  model: 'ai.model',
  creditCost: 'ai.creditCost',
  maxTokens: 'ai.maxTokens',
  policy: 'ai.policy',
  enabled: 'ai.enabled',
} as const;

const resolveScope = (env?: string) => {
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'staging';
};

export const GET = withAdminAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const environment = resolveScope(searchParams.get('env') || undefined);

      const ideSetting = (prisma as any).ideSetting;
      const rows = await ideSetting.findMany({
        where: { scope: environment, key: { in: Object.values(KEYS) } },
      });

      const map = rows.reduce((acc: Record<string, any>, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      const data: AiSettingsPayload = {
        model: (map[KEYS.model] as string) ?? DEFAULTS.model,
        creditCost: Number(map[KEYS.creditCost] ?? DEFAULTS.creditCost),
        maxTokens: Number(map[KEYS.maxTokens] ?? DEFAULTS.maxTokens),
        policy: (map[KEYS.policy] as string) ?? DEFAULTS.policy,
        enabled: Boolean(map[KEYS.enabled] ?? DEFAULTS.enabled),
      };

      return NextResponse.json({ data, environment });
    } catch (error) {
      console.error('[Admin AI Settings] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 });
    }
  },
  'ops:agents:config'
);

export const PUT = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = (await request.json()) as UpdatePayload;
      const environment = resolveScope(body?.environment);

      const updates: Partial<AiSettingsPayload> = {
        model: body.model,
        creditCost: body.creditCost,
        maxTokens: body.maxTokens,
        policy: body.policy,
        enabled: body.enabled,
      };

      const ideSetting = (prisma as any).ideSetting;
      const operations = Object.entries(KEYS)
        .filter(([field]) => updates[field as keyof AiSettingsPayload] !== undefined)
        .map(([field, key]) =>
          ideSetting.upsert({
            where: { key_scope: { key, scope: environment } },
            create: {
              key,
              value: updates[field as keyof AiSettingsPayload],
              scope: environment,
              updatedBy: user.id,
            },
            update: {
              value: updates[field as keyof AiSettingsPayload],
              updatedBy: user.id,
            },
          })
        );

      if (operations.length === 0) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
      }

      await prisma.$transaction(operations);

      await prisma.auditLog.create({
        data: {
          action: 'AI_SETTINGS_UPDATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ai-settings',
          metadata: {
            environment,
            updates,
          } as any,
        },
      });

      return NextResponse.json({ status: 'ok' });
    } catch (error) {
      console.error('[Admin AI Settings] Error:', error);
      return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 });
    }
  },
  'ops:agents:config'
);

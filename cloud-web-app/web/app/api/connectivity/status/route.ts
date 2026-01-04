import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { optionalEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

type EndpointStatus = {
  url: string;
  healthy: boolean;
  latency_ms: number | null;
  status_code?: number | null;
  error?: string | null;
};

type ServiceStatus = {
  name: string;
  status: string;
  endpoints: EndpointStatus[];
  latency_ms?: number;
  message?: string;
};

async function time<T>(fn: () => Promise<T>): Promise<{ ok: boolean; latency_ms: number; error?: string } & ({ value: T } | { value?: undefined })> {
  const start = Date.now();
  try {
    const value = await fn();
    return { ok: true, latency_ms: Date.now() - start, value };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const appUrl = optionalEnv('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';

    const dbProbe = await time(async () => {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    });

    const stripeConfigured = Boolean(optionalEnv('STRIPE_SECRET_KEY'));

    const services: ServiceStatus[] = [
      {
        name: 'web_api',
        status: 'healthy',
        endpoints: [
          {
            url: `${appUrl}/api/health`,
            healthy: true,
            latency_ms: null,
            status_code: null,
          },
        ],
        message: 'API Next.js ativa (health disponível).',
      },
      {
        name: 'database',
        status: dbProbe.ok ? 'healthy' : 'down',
        endpoints: [
          {
            url: 'postgresql://DATABASE_URL',
            healthy: dbProbe.ok,
            latency_ms: dbProbe.latency_ms,
            error: dbProbe.ok ? null : dbProbe.error ?? 'DB probe failed',
          },
        ],
        latency_ms: dbProbe.latency_ms,
        message: dbProbe.ok ? 'Conexão ok.' : 'Falha na conexão com banco.',
      },
      {
        name: 'stripe',
        status: stripeConfigured ? 'healthy' : 'degraded',
        endpoints: [
          {
            url: 'stripe://STRIPE_SECRET_KEY',
            healthy: stripeConfigured,
            latency_ms: null,
            error: stripeConfigured ? null : 'Stripe não configurado',
          },
        ],
        message: stripeConfigured ? 'Stripe configurado.' : 'Stripe ausente (checkout retorna 503).',
      },
    ];

    const anyDown = services.some((s) => s.status === 'down');
    const anyDegraded = services.some((s) => s.status === 'degraded');

    const overall_status = anyDown ? 'down' : anyDegraded ? 'degraded' : 'healthy';

    return NextResponse.json({
      overall_status,
      timestamp: new Date().toISOString(),
      services,
    });
  } catch (error) {
    console.error('Connectivity status error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

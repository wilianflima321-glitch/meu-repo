import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { getUsageStatus } from '@/lib/plan-limits';
import { createComponentLogger } from '@/lib/observability/logger';
import { localEvidenceJson, shouldUseLocalEvidenceFallback } from '@/lib/server/local-evidence-fallback';

const routeLogger = createComponentLogger('api/usage/status/route');

export const dynamic = 'force-dynamic';

/**
 * API de Status de Uso
 * GET /api/usage/status
 *
 * Retorna o uso atual do usuário e limites do plano.
 * Usado pelo frontend para exibir barras de progresso, alertas, etc.
 */
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);

    const status = await getUsageStatus(user.userId);

    return NextResponse.json({
      success: true,
      data: {
        plan: status.plan,
        usage: {
          tokens: {
            used: status.usage.tokensUsed,
            limit: status.usage.tokensLimit,
            remaining: status.usage.tokensRemaining,
            percentUsed: status.usage.percentUsed,
          },
          requestsToday: {
            used: status.usage.requestsUsedToday,
            limit: status.usage.requestsDailyLimit,
            remaining: status.usage.requestsDailyRemaining,
          },
        },
        limits: {
          tokensPerMonth: status.limits.tokensPerMonth,
          requestsPerDay: status.limits.requestsPerDay,
          projectsMax: status.limits.projectsMax,
          storageGB: status.limits.storageGB,
          concurrentSessions: status.limits.concurrentSessions,
          maxAgents: status.limits.maxAgents,
          maxTokensPerRequest: status.limits.maxTokensPerRequest,
        },
        features: status.limits.features,
        models: status.limits.models,
        isOverLimit: !status.allowed,
        message: status.reason,
      }
    });

  } catch (error) {
    routeLogger.error('Usage Status Error:', error);

    if (shouldUseLocalEvidenceFallback(req, error)) {
      return localEvidenceJson(
        req,
        error,
        {
          success: true,
          data: {
            plan: 'free',
            usage: {
              tokens: { used: 0, limit: 100000, remaining: 100000, percentUsed: 0 },
              requestsToday: { used: 0, limit: 12, remaining: 12 },
            },
            limits: {
              tokensPerMonth: 100000,
              requestsPerDay: 12,
              projectsMax: 10,
              storageGB: 0.25,
              concurrentSessions: 1,
              maxAgents: 1,
              maxTokensPerRequest: 4000,
            },
            features: ['chat', 'editor', 'preview'],
            models: ['free-models'],
            isOverLimit: false,
            message: 'Local evidence fallback: usage service is held until backing storage is configured.',
          },
        },
        { surface: 'usage.status', state: 'held' },
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'USAGE_ERROR',
      message: error instanceof Error ? error.message : 'Error getting usage status'
    }, { status: 500 });
  }
}

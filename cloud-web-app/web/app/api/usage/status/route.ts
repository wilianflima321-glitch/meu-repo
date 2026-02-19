import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { getUsageStatus } from '@/lib/plan-limits';
import { getCreditBalance } from '@/lib/credit-wallet';
import { enforceRateLimit } from '@/lib/server/rate-limit';

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
    const rateLimitResponse = await enforceRateLimit({
      scope: 'usage-status-get',
      key: user.userId,
      max: 1800,
      windowMs: 60 * 60 * 1000,
      message: 'Too many usage status checks. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const [status, creditBalance] = await Promise.all([
      getUsageStatus(user.userId),
      getCreditBalance(user.userId),
    ]);
    
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
          }
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
        usageEntitlement: {
          creditBalance,
          variableUsageAllowed: creditBalance > 0,
          blockedReason: creditBalance > 0 ? null : 'CREDITS_EXHAUSTED',
        },
      }
    });

  } catch (error) {
    console.error('Usage Status Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'USAGE_ERROR',
      message: error instanceof Error ? error.message : 'Erro ao obter status de uso'
    }, { status: 500 });
  }
}

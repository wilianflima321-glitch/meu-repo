import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { getUsageStatus } from '@/lib/plan-limits';

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

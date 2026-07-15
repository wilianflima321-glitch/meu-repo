/**
 * Billing Usage API - Consumo de Recursos do Usuário
 * 
 * GET: Retorna dados de consumo atualizados baseados nos limites reais definidos em lib/plans.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { getBuildMinutesUsed } from '@/lib/build-minutes';
import { getPlanById, isPlanId, type PlanId } from '@/lib/plans';
import { createComponentLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

const routeLogger = createComponentLogger('api.billing.usage');

interface UsageHistoryItem {
  date: string;
  aiTokens: number;
  storage: number;
  buildMinutes: number;
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const authUser = getUserFromRequest(req);
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authUser.userId;

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Agregar uso de diferentes fontes (UsageBucket, se existir)
    let tokensUsed = 0;
    let requestsUsed = 0;
    try {
      const bucket = await prisma.usageBucket.findFirst({
        where: {
          userId,
        },
        orderBy: { id: 'desc' },
      });
      if (bucket) {
        tokensUsed = bucket.tokens || 0;
        requestsUsed = bucket.requests || 0;
      }
    } catch {
      // UsageBucket pode não existir - usar valores default
    }

    // Centralized plan limits with trial normalization and Free as factual fallback.
    const rawPlan = String(user.plan || 'free').replace('_trial', '');
    const normalizedPlanId: PlanId = isPlanId(rawPlan) ? rawPlan : 'free';
    const planDef = getPlanById(normalizedPlanId) || getPlanById('free');
    if (!planDef) {
      throw Object.assign(new Error('PLAN_NOT_FOUND: free'), { code: 'PLAN_NOT_FOUND' });
    }
    const planId = planDef.id;
    const planLimits = planDef.limits;

    // Contar colaboradores em projetos do usuário
    let collaboratorCount = 0;
    try {
      const projects = await prisma.project.findMany({
        where: { userId: userId },
        include: { members: true },
      });
      collaboratorCount = projects.reduce((sum, p) => sum + (p.members?.length || 0), 0);
    } catch {
      collaboratorCount = 0;
    }

    // Calcular storage usado (estimar baseado em arquivos)
    let storageUsed = 0;
    try {
      const files = await prisma.file.findMany({
        where: { project: { userId: userId } },
        select: { content: true },
      });
      // Estimar tamanho baseado no conteúdo
      storageUsed = files.reduce((sum, f) => sum + (f.content?.length || 0), 0);
    } catch {
      storageUsed = 0;
    }

    // Histórico (sem dados agregados ainda)
    const history: UsageHistoryItem[] = [];

    // Calcular data de renovação
    const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let buildMinutesUsed = 0;
    try {
      buildMinutesUsed = await getBuildMinutesUsed(userId);
    } catch {
      buildMinutesUsed = 0;
    }

    const response = {
      success: true,
      data: {
        plan: {
          id: planId,
          name: planDef.name,
          renewsAt: renewsAt.toISOString(),
        },
        usage: {
          aiTokens: {
            used: tokensUsed || 0,
            limit: planLimits.tokensPerMonth,
          },
          storage: {
            used: Math.round(storageUsed / (1024 * 1024)), // Convert to MB
            limit: Math.round(planLimits.storage / (1024 * 1024)), // Convert bytes to MB
          },
          buildMinutes: {
            used: buildMinutesUsed,
            limit: planId === 'enterprise' ? -1 : 1000, // Exemplo de limite dinâmico
          },
          gpuHours: {
            used: 0,
            limit: planId === 'enterprise' ? -1 : 100,
          },
          apiCalls: {
            used: requestsUsed || 0,
            limit: planLimits.requestsPerDay * 30, // Estimativa mensal baseada em dia
          },
          collaborators: {
            used: collaboratorCount,
            limit: planLimits.collaborators,
          },
        },
        history,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    routeLogger.error('[Billing Usage API] Error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

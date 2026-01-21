/**
 * Billing Usage API - Consumo de Recursos do Usuário
 * 
 * GET: Retorna dados de consumo atualizados
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { getBuildMinutesUsed } from '@/lib/build-minutes';

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

    // Definir limites baseados no plano
    const planLimits = getPlanLimits(user.plan || 'free');

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
          id: user.plan || 'free',
          name: getPlanName(user.plan || 'free'),
          renewsAt: renewsAt.toISOString(),
        },
        usage: {
          aiTokens: {
            used: tokensUsed || 0,
            limit: planLimits.aiTokens,
          },
          storage: {
            used: Math.round(storageUsed / (1024 * 1024)), // Convert to MB
            limit: planLimits.storage,
          },
          buildMinutes: {
            used: buildMinutesUsed,
            limit: planLimits.buildMinutes,
          },
          gpuHours: {
            used: 0,
            limit: planLimits.gpuHours,
          },
          apiCalls: {
            used: requestsUsed || 0,
            limit: planLimits.apiCalls,
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
    console.error('[Billing Usage API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

interface PlanLimits {
  aiTokens: number;
  storage: number; // MB
  buildMinutes: number;
  gpuHours: number;
  apiCalls: number;
  collaborators: number;
}

function getPlanLimits(planId: string): PlanLimits {
  const plans: Record<string, PlanLimits> = {
    free: {
      aiTokens: 10_000,
      storage: 500,
      buildMinutes: 60,
      gpuHours: 1,
      apiCalls: 1_000,
      collaborators: 1,
    },
    starter: {
      aiTokens: 100_000,
      storage: 5_000,
      buildMinutes: 300,
      gpuHours: 10,
      apiCalls: 10_000,
      collaborators: 3,
    },
    basic: {
      aiTokens: 500_000,
      storage: 20_000,
      buildMinutes: 1_000,
      gpuHours: 50,
      apiCalls: 50_000,
      collaborators: 5,
    },
    pro: {
      aiTokens: 2_000_000,
      storage: 100_000,
      buildMinutes: 5_000,
      gpuHours: 200,
      apiCalls: 200_000,
      collaborators: 15,
    },
    studio: {
      aiTokens: 10_000_000,
      storage: 500_000,
      buildMinutes: 20_000,
      gpuHours: 1_000,
      apiCalls: 1_000_000,
      collaborators: 50,
    },
    enterprise: {
      aiTokens: 100_000_000,
      storage: 5_000_000,
      buildMinutes: 100_000,
      gpuHours: 10_000,
      apiCalls: 10_000_000,
      collaborators: 500,
    },
  };

  return plans[planId] || plans.free;
}

function getPlanName(planId: string): string {
  const names: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    basic: 'Basic',
    pro: 'Pro',
    studio: 'Studio',
    enterprise: 'Enterprise',
  };
  return names[planId] || 'Free';
}

// Histórico ainda não agregado; retornar vazio até termos agregações reais.

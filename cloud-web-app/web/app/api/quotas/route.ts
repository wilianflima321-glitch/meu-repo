/**
 * Quotas API - Aethel Engine
 * GET /api/quotas - Obtém quotas do usuário
 * GET /api/quotas/check - Verifica se ação é permitida
 * 
 * Integra com o sistema de rate limiting em lib/rate-limiting.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { getPlanLimits, getUsageStatus, recordTokenUsage } from '@/lib/plan-limits';
import { getUserStorageUsed } from '@/lib/storage-quota';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

function getUserPlan(plan: string): string {
  return plan.replace('_trial', '');
}

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'quotas-get',
      key: user.userId,
      max: 720,
      windowMs: 60 * 60 * 1000,
      message: 'Too many quota status requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
    // Busca usuário para pegar plano
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    });
    
    const plan = getUserPlan(dbUser?.plan || 'starter');
    const limits = getPlanLimits(plan);
    const usageStatus = await getUsageStatus(user.userId);

    const storageUsedBytes = await getUserStorageUsed(user.userId);
    const storageUsedMb = Math.round(storageUsedBytes / (1024 * 1024));
    const storageLimitMb = limits.storageGB < 0 ? -1 : Math.round(limits.storageGB * 1024);

    const projectsCount = await prisma.project.count({
      where: { userId: user.userId },
    });

    const quotaStatus = [
      {
        resource: 'ai_tokens',
        used: usageStatus.usage.tokensUsed,
        limit: limits.tokensPerMonth,
        unlimited: limits.tokensPerMonth === -1,
        remaining: limits.tokensPerMonth === -1 ? -1 : Math.max(0, limits.tokensPerMonth - usageStatus.usage.tokensUsed),
        percentage: limits.tokensPerMonth > 0
          ? Math.min(100, Math.round((usageStatus.usage.tokensUsed / limits.tokensPerMonth) * 100))
          : 0,
        period: 'month' as const,
      },
      {
        resource: 'storage_mb',
        used: storageUsedMb,
        limit: storageLimitMb,
        unlimited: storageLimitMb === -1,
        remaining: storageLimitMb === -1 ? -1 : Math.max(0, storageLimitMb - storageUsedMb),
        percentage: storageLimitMb > 0
          ? Math.min(100, Math.round((storageUsedMb / storageLimitMb) * 100))
          : 0,
        period: 'month' as const,
      },
      {
        resource: 'projects',
        used: projectsCount,
        limit: limits.projectsMax,
        unlimited: limits.projectsMax === -1,
        remaining: limits.projectsMax === -1 ? -1 : Math.max(0, limits.projectsMax - projectsCount),
        percentage: limits.projectsMax > 0
          ? Math.min(100, Math.round((projectsCount / limits.projectsMax) * 100))
          : 0,
        period: 'month' as const,
      },
    ];
    
    return NextResponse.json({
      success: true,
      plan,
      period: getMonthKey(),
      quotas: quotaStatus,
    });
  } catch (error) {
    console.error('Failed to get quotas:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'quotas-post',
      key: user.userId,
      max: 420,
      windowMs: 60 * 60 * 1000,
      message: 'Too many quota operation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    
    const action = body?.action;
    const resource = body?.resource;
    const amount = typeof body?.amount === 'number' && Number.isFinite(body.amount) ? body.amount : 1;
    
    // Busca usuário para pegar plano
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    });
    
    const plan = getUserPlan(dbUser?.plan || 'starter');
    const limits = getPlanLimits(plan);
    const usageStatus = await getUsageStatus(user.userId);
    const storageUsedBytes = await getUserStorageUsed(user.userId);
    const storageUsedMb = Math.round(storageUsedBytes / (1024 * 1024));
    const projectsCount = await prisma.project.count({ where: { userId: user.userId } });

    let currentUsage = 0;
    let limit = -1;
    if (resource === 'ai_tokens') {
      currentUsage = usageStatus.usage.tokensUsed;
      limit = limits.tokensPerMonth;
    } else if (resource === 'storage_mb') {
      currentUsage = storageUsedMb;
      limit = limits.storageGB < 0 ? -1 : Math.round(limits.storageGB * 1024);
    } else if (resource === 'projects') {
      currentUsage = projectsCount;
      limit = limits.projectsMax;
    } else {
      return NextResponse.json(
        { success: false, error: 'Unknown resource' },
        { status: 400 }
      );
    }
    
    if (action === 'check') {
      // Apenas verifica se pode usar
      const canUse = limit === -1 || (currentUsage + amount) <= limit;
      
      return NextResponse.json({
        success: true,
        allowed: canUse,
        current: currentUsage,
        requested: amount,
        limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - currentUsage),
      });
    }
    
    if (action === 'consume') {
      // Verifica e consome
      if (limit !== -1 && (currentUsage + amount) > limit) {
        return NextResponse.json({
          success: false,
          error: 'Quota exceeded',
          current: currentUsage,
          limit,
        }, { status: 429 });
      }

      if (resource !== 'ai_tokens') {
        return NextResponse.json(
          { success: false, error: 'Consume supported only for ai_tokens' },
          { status: 400 }
        );
      }

      await recordTokenUsage(user.userId, amount);
      
      return NextResponse.json({
        success: true,
        consumed: amount,
        current: currentUsage + amount,
        limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - currentUsage - amount),
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "check" or "consume"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process quota:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

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
import { getCreditBalance } from '@/lib/credit-wallet';
import { getCreativeCreditBalance } from '@/lib/billing/creative-wallet';
import { loadPaygSnapshot } from '@/lib/billing/payg-policy';
import { getCreativeEntitlements } from '@/lib/creative-provider-matrix';
import type { PlanId } from '@/lib/plans';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/quotas/route');

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
    
    // Busca usuário para pegar plano
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    });
    
    const plan = getUserPlan(dbUser?.plan || 'starter');
    const limits = getPlanLimits(plan);
    const [usageStatus, storageUsedBytes, projectsCount, walletBalance, paygSnap, creativeBalance] = await Promise.all([
      getUsageStatus(user.userId),
      getUserStorageUsed(user.userId),
      prisma.project.count({
        where: { userId: user.userId },
      }),
      getCreditBalance(user.userId),
      loadPaygSnapshot(user.userId),
      getCreativeCreditBalance(user.userId),
    ]);

    const creativeEntitlements = getCreativeEntitlements(plan as PlanId);
    const creativeIncluded = creativeEntitlements.includedCreativeCreditsPerMonth ?? 0;
    const creativeUnlimited = creativeIncluded < 0;

    const storageUsedMb = Math.round(storageUsedBytes / (1024 * 1024));
    const storageLimitMb = limits.storageGB < 0 ? -1 : Math.round(limits.storageGB * 1024);

    const paygEnabled = Boolean(paygSnap?.enabled);

    const quotaStatus = [
      {
        resource: 'ai_tokens_fast',
        used: usageStatus.usage.tokensFastUsed,
        limit: limits.tokensFastPerMonth,
        unlimited: limits.tokensFastPerMonth === -1,
        remaining: limits.tokensFastPerMonth === -1 ? -1 : usageStatus.usage.tokensFastRemaining,
        percentage: limits.tokensFastPerMonth > 0
          ? Math.min(100, Math.round((usageStatus.usage.tokensFastUsed / limits.tokensFastPerMonth) * 100))
          : 0,
        period: 'month' as const,
      },
      {
        resource: 'ai_tokens_premium_raw',
        used: usageStatus.usage.tokensPremiumRawUsed,
        limit: limits.tokensPremiumRawPerMonth,
        unlimited: limits.tokensPremiumRawPerMonth === -1,
        remaining: limits.tokensPremiumRawPerMonth === -1 ? -1 : usageStatus.usage.tokensPremiumRawRemaining,
        percentage: limits.tokensPremiumRawPerMonth > 0
          ? Math.min(100, Math.round((usageStatus.usage.tokensPremiumRawUsed / limits.tokensPremiumRawPerMonth) * 100))
          : 0,
        period: 'month' as const,
      },
      {
        resource: 'ai_tokens_weighted',
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
        resource: 'ai_wallet_credits',
        used: 0,
        limit: -1,
        unlimited: true,
        remaining: walletBalance,
        balance: walletBalance,
        percentage: 0,
        period: 'lifetime' as const,
      },
      {
        resource: 'ai_requests_daily',
        used: usageStatus.usage.requestsUsedToday,
        limit: limits.requestsPerDay,
        unlimited: limits.requestsPerDay === -1,
        remaining: limits.requestsPerDay === -1 ? -1 : usageStatus.usage.requestsDailyRemaining,
        percentage: limits.requestsPerDay > 0
          ? Math.min(100, Math.round((usageStatus.usage.requestsUsedToday / limits.requestsPerDay) * 100))
          : 0,
        period: 'day' as const,
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
        limit: limits.cloudProjectsMax,
        unlimited: limits.cloudProjectsMax === -1,
        remaining: limits.cloudProjectsMax === -1 ? -1 : Math.max(0, limits.cloudProjectsMax - projectsCount),
        percentage: limits.cloudProjectsMax > 0
          ? Math.min(100, Math.round((projectsCount / limits.cloudProjectsMax) * 100))
          : 0,
        period: 'month' as const,
      },
    ];
    
    return NextResponse.json({
      success: true,
      plan,
      period: getMonthKey(),
      wallet: {
        balance: walletBalance,
        currency: 'credits',
      },
      paygEnabled,
      payg: paygSnap
        ? {
            enabled: paygSnap.enabled,
            spendCapUsdCents: paygSnap.spendCapUsdCents,
            accruedUsdCents: paygSnap.accruedUsdCents,
            remainingCapUsdCents:
              paygSnap.spendCapUsdCents == null
                ? null
                : Math.max(0, paygSnap.spendCapUsdCents - paygSnap.accruedUsdCents),
            periodKey: paygSnap.periodKey,
            hasPaymentMethod: paygSnap.hasPaymentMethod,
          }
        : null,
      dualPool: {
        fast: {
          used: usageStatus.usage.tokensFastUsed,
          limit: limits.tokensFastPerMonth,
          remaining: limits.tokensFastPerMonth === -1 ? -1 : usageStatus.usage.tokensFastRemaining,
        },
        premium: {
          used: usageStatus.usage.tokensPremiumRawUsed,
          limit: limits.tokensPremiumRawPerMonth,
          remaining:
            limits.tokensPremiumRawPerMonth === -1
              ? -1
              : usageStatus.usage.tokensPremiumRawRemaining,
        },
      },
      creativeWallet: {
        balance: creativeUnlimited ? -1 : creativeBalance,
        unlimited: creativeUnlimited,
        includedPerMonth: creativeIncluded < 0 ? -1 : creativeIncluded,
        separateFromLlmPools: true,
        currency: 'credits',
      },
      quotas: quotaStatus,
      ideLocked: false,
    });
  } catch (error) {
    routeLogger.error('Failed to get quotas:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
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
      limit = limits.cloudProjectsMax;
    } else if (resource === 'ai_requests_daily') {
      currentUsage = usageStatus.usage.requestsUsedToday;
      limit = limits.requestsPerDay;
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
    routeLogger.error('Failed to process quota:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

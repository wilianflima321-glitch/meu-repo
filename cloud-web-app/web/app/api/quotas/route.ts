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

export const dynamic = 'force-dynamic';

// Quotas por plano (em produção, vem do banco)
const PLAN_QUOTAS: Record<string, Record<string, { limit: number; period: 'day' | 'month' }>> = {
  starter: {
    ai_tokens: { limit: 10000, period: 'month' },
    storage_mb: { limit: 500, period: 'month' },
    builds: { limit: 10, period: 'month' },
    exports: { limit: 5, period: 'month' },
    projects: { limit: 3, period: 'month' },
  },
  basic: {
    ai_tokens: { limit: 50000, period: 'month' },
    storage_mb: { limit: 2000, period: 'month' },
    builds: { limit: 50, period: 'month' },
    exports: { limit: 20, period: 'month' },
    projects: { limit: 10, period: 'month' },
  },
  pro: {
    ai_tokens: { limit: 200000, period: 'month' },
    storage_mb: { limit: 10000, period: 'month' },
    builds: { limit: 200, period: 'month' },
    exports: { limit: 100, period: 'month' },
    projects: { limit: 50, period: 'month' },
  },
  studio: {
    ai_tokens: { limit: 1000000, period: 'month' },
    storage_mb: { limit: 50000, period: 'month' },
    builds: { limit: -1, period: 'month' }, // -1 = unlimited
    exports: { limit: -1, period: 'month' },
    projects: { limit: -1, period: 'month' },
  },
  enterprise: {
    ai_tokens: { limit: -1, period: 'month' },
    storage_mb: { limit: -1, period: 'month' },
    builds: { limit: -1, period: 'month' },
    exports: { limit: -1, period: 'month' },
    projects: { limit: -1, period: 'month' },
  },
};

// Armazena uso atual (em produção, usar Redis)
const userUsage = new Map<string, Map<string, number>>();

function getUserPlan(plan: string): string {
  // Remove sufixo _trial
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
    const quotas = PLAN_QUOTAS[plan] || PLAN_QUOTAS.starter;
    
    // Obtém uso atual
    const monthKey = getMonthKey();
    const usageKey = `${user.userId}:${monthKey}`;
    const usage = userUsage.get(usageKey) || new Map();
    
    const quotaStatus = Object.entries(quotas).map(([resource, config]) => {
      const used = usage.get(resource) || 0;
      const limit = config.limit;
      
      return {
        resource,
        used,
        limit,
        unlimited: limit === -1,
        remaining: limit === -1 ? -1 : Math.max(0, limit - used),
        percentage: limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100)),
        period: config.period,
      };
    });
    
    return NextResponse.json({
      success: true,
      plan,
      period: monthKey,
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
    const body = await request.json();
    
    const { action, resource, amount = 1 } = body;
    
    // Busca usuário para pegar plano
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    });
    
    const plan = getUserPlan(dbUser?.plan || 'starter');
    const quotas = PLAN_QUOTAS[plan] || PLAN_QUOTAS.starter;
    const resourceQuota = quotas[resource];
    
    if (!resourceQuota) {
      return NextResponse.json(
        { success: false, error: 'Unknown resource' },
        { status: 400 }
      );
    }
    
    const monthKey = getMonthKey();
    const usageKey = `${user.userId}:${monthKey}`;
    
    let usage = userUsage.get(usageKey);
    if (!usage) {
      usage = new Map();
      userUsage.set(usageKey, usage);
    }
    
    const currentUsage = usage.get(resource) || 0;
    
    if (action === 'check') {
      // Apenas verifica se pode usar
      const canUse = resourceQuota.limit === -1 || (currentUsage + amount) <= resourceQuota.limit;
      
      return NextResponse.json({
        success: true,
        allowed: canUse,
        current: currentUsage,
        requested: amount,
        limit: resourceQuota.limit,
        remaining: resourceQuota.limit === -1 ? -1 : Math.max(0, resourceQuota.limit - currentUsage),
      });
    }
    
    if (action === 'consume') {
      // Verifica e consome
      if (resourceQuota.limit !== -1 && (currentUsage + amount) > resourceQuota.limit) {
        return NextResponse.json({
          success: false,
          error: 'Quota exceeded',
          current: currentUsage,
          limit: resourceQuota.limit,
        }, { status: 429 });
      }
      
      usage.set(resource, currentUsage + amount);
      
      return NextResponse.json({
        success: true,
        consumed: amount,
        current: currentUsage + amount,
        limit: resourceQuota.limit,
        remaining: resourceQuota.limit === -1 ? -1 : Math.max(0, resourceQuota.limit - currentUsage - amount),
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

/**
 * Quota Enforcement Middleware
 * Checks user plan limits before allowing API requests.
 * Returns rate-limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { PLAN_LIMITS, type PlanLimits } from '@/lib/plan-limits'

export interface QuotaCheckResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
  plan: string
  reason?: string
}

type QuotaAction = 'ai_request' | 'project_create' | 'storage_write' | 'preview_provision'

/**
 * Check if a user has remaining quota for the given action.
 */
function getRemaining(limit: number, count: number): number {
  if (limit === -1) return 999999;
  return Math.max(0, limit - count);
}

/**
 * Check if a user has remaining quota for the given action.
 */
export async function checkQuota(
  userId: string,
  action: QuotaAction
): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS['free'];

  // Calculate reset time (start of next day UTC)
  const now = new Date();
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  // Get today's usage from the database
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (action) {
    case 'ai_request': {
      const usageCount = await prisma.auditLog.count({
        where: {
          userId,
          action: { startsWith: 'ai_' },
          createdAt: { gte: startOfDay },
        },
      });
      const limit = limits.requestsPerDay;
      const remaining = getRemaining(limit, usageCount);
      return {
        allowed: remaining > 0,
        remaining,
        limit,
        resetAt,
        plan,
        reason: remaining <= 0 ? 'Daily AI request limit reached. Upgrade your plan for more.' : undefined,
      };
    }

    case 'project_create': {
      const projectCount = await prisma.project.count({ where: { userId } });
      const limit = limits.cloudProjectsMax;
      const remaining = getRemaining(limit, projectCount);
      return {
        allowed: remaining > 0,
        remaining,
        limit,
        resetAt,
        plan,
        reason: remaining <= 0 ? 'Cloud-synced project limit reached. Upgrade your plan to create more.' : undefined,
      };
    }

    case 'storage_write': {
      const storageUsed = (await prisma.user.findUnique({
        where: { id: userId },
        select: { storageUsed: true },
      }))?.storageUsed || 0;
      const limitBytes = limits.storageGB * 1024 * 1024 * 1024;
      const remaining = getRemaining(limitBytes, storageUsed);
      return {
        allowed: remaining > 0,
        remaining,
        limit: limitBytes,
        resetAt,
        plan,
        reason: remaining <= 0 ? 'Storage limit reached. Upgrade your plan.' : undefined,
      };
    }

    case 'preview_provision': {
      // Check concurrency: count active sessions
      const activeSessions = await prisma.auditLog.count({
        where: {
          userId,
          action: 'preview_provision',
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 min
        },
      });
      const limit = limits.concurrentSessions;
      const remaining = getRemaining(limit, activeSessions);
      return {
        allowed: remaining > 0,
        remaining,
        limit,
        resetAt,
        plan,
        reason: remaining <= 0 ? 'Concurrent session limit reached.' : undefined,
      };
    }

    default:
      return { allowed: true, remaining: 999, limit: 999, resetAt, plan };
  }
}

/**
 * Middleware helper: enforce quota and return 429 if exceeded.
 * Adds standard rate-limit headers to the response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  quota: QuotaCheckResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(quota.limit))
  response.headers.set('X-RateLimit-Remaining', String(quota.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.floor(quota.resetAt.getTime() / 1000)))
  response.headers.set('X-Plan', quota.plan)
  return response
}

/**
 * Full quota enforcement: check and return 429 if over limit.
 */
export async function enforceQuota(
  req: NextRequest,
  action: QuotaAction
): Promise<{ allowed: true; quota: QuotaCheckResult } | { allowed: false; response: NextResponse }> {
  const auth = getUserFromRequest(req)
  if (!auth?.userId) {
    return {
      allowed: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const quota = await checkQuota(auth.userId, action)

  if (!quota.allowed) {
    const response = NextResponse.json(
      {
        error: 'QUOTA_EXCEEDED',
        message: quota.reason || 'Plan limit exceeded.',
        plan: quota.plan,
        limit: quota.limit,
        remaining: 0,
        resetAt: quota.resetAt.toISOString(),
        upgradeUrl: '/billing',
      },
      { status: 429 }
    )
    return { allowed: false, response: addRateLimitHeaders(response, quota) }
  }

  return { allowed: true, quota }
}

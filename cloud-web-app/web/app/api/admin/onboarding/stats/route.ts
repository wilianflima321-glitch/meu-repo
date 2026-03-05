import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { prisma } from '@/lib/db'

type Funnel = {
  signups: number
  onboardingEntries: number
  firstProjectCreated: number
  firstAiSuccess: number
  firstIdeOpened: number
  firstValueCompleted: number
}

type OnboardingStatsResponse = {
  success: true
  capability: 'ADMIN_ONBOARDING_STATS'
  capabilityStatus: 'IMPLEMENTED'
  window: {
    days: number
    startAt: string
    endAt: string
  }
  totals: {
    uniqueUsers: number
    totalActions: number
    onboardingActions: number
    analyticsActions: number
  }
  firstValue: {
    completionRateFromSignup: number | null
    completionRateFromEntry: number | null
    medianFirstValueTimeMs: number | null
    sampleSize: number
    sloTargetMs: number
    sloStatus: 'pass' | 'fail' | 'insufficient_sample'
  }
  funnel: Funnel
  actionCounts: Record<string, number>
  lastActivity: string | null
}

function clampDays(raw: string | null): number {
  const parsed = Number.parseInt(raw || '', 10)
  if (Number.isNaN(parsed)) return 7
  return Math.max(1, Math.min(parsed, 30))
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
  }
  return sorted[middle]
}

function parseMsWithDefault(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const handler = async (req: NextRequest) => {
  const firstValueSloTargetMs = parseMsWithDefault(process.env.AETHEL_FIRST_VALUE_SLO_MS, 90_000)
  const minSloSample = parseMsWithDefault(process.env.AETHEL_FIRST_VALUE_MIN_SAMPLE, 10)
  const days = clampDays(new URL(req.url).searchParams.get('days'))
  const endAt = new Date()
  const startAt = new Date(endAt.getTime() - days * 24 * 60 * 60 * 1000)

  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startAt },
      OR: [
        { action: { startsWith: 'onboarding.' } },
        { action: 'analytics:register' },
        { action: 'analytics:settings_change' },
        { action: 'analytics:project_create' },
        { action: 'analytics:ai_chat' },
        { action: 'analytics:editor_open' },
        { action: 'analytics_metric:first_value_time' },
      ],
    },
    select: {
      action: true,
      userId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20000,
  })

  const uniqueUsers = new Set(logs.map((entry) => entry.userId).filter(Boolean)).size
  const actionCounts: Record<string, number> = {}

  const funnel: Funnel = {
    signups: 0,
    onboardingEntries: 0,
    firstProjectCreated: 0,
    firstAiSuccess: 0,
    firstIdeOpened: 0,
    firstValueCompleted: 0,
  }

  const firstValueDurations: number[] = []
  let onboardingActions = 0
  let analyticsActions = 0

  for (const entry of logs) {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1
    const metadata = toObject(entry.metadata)
    const payload = toObject(metadata.payload)

    if (entry.action.startsWith('onboarding.')) onboardingActions += 1
    if (entry.action.startsWith('analytics:') || entry.action.startsWith('analytics_metric:')) {
      analyticsActions += 1
    }

    if (entry.action === 'analytics:register') {
      funnel.signups += 1
      continue
    }

    if (entry.action === 'analytics:settings_change') {
      if (payload.section === 'onboarding' && payload.action === 'entry') funnel.onboardingEntries += 1
      if (payload.section === 'first-value-guide' && payload.action === 'completed') {
        funnel.firstValueCompleted += 1
      }
      continue
    }

    if (entry.action === 'analytics:project_create') {
      if (payload.source === 'first-value-guide' && payload.milestone === 'first-project-created') {
        funnel.firstProjectCreated += 1
      }
      continue
    }

    if (entry.action === 'analytics:ai_chat') {
      if (payload.source === 'first-value-guide' && payload.milestone === 'first-ai-success') {
        funnel.firstAiSuccess += 1
      }
      continue
    }

    if (entry.action === 'analytics:editor_open') {
      if (payload.source === 'first-value-guide' && payload.milestone === 'first-ide-opened') {
        funnel.firstIdeOpened += 1
      }
      continue
    }

    if (entry.action === 'analytics_metric:first_value_time') {
      const value = typeof metadata.value === 'number' ? metadata.value : null
      if (value !== null && Number.isFinite(value)) {
        firstValueDurations.push(Math.round(value))
      }
    }
  }

  const completionRateFromSignup =
    funnel.signups > 0 ? Number(((funnel.firstValueCompleted / funnel.signups) * 100).toFixed(2)) : null
  const completionRateFromEntry =
    funnel.onboardingEntries > 0
      ? Number(((funnel.firstValueCompleted / funnel.onboardingEntries) * 100).toFixed(2))
      : null
  const medianFirstValueTimeMs = computeMedian(firstValueDurations)
  const sloStatus: 'pass' | 'fail' | 'insufficient_sample' =
    firstValueDurations.length < minSloSample
      ? 'insufficient_sample'
      : medianFirstValueTimeMs !== null && medianFirstValueTimeMs <= firstValueSloTargetMs
        ? 'pass'
        : 'fail'

  const response: OnboardingStatsResponse = {
    success: true,
    capability: 'ADMIN_ONBOARDING_STATS',
    capabilityStatus: 'IMPLEMENTED',
    window: {
      days,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    },
    totals: {
      uniqueUsers,
      totalActions: logs.length,
      onboardingActions,
      analyticsActions,
    },
    firstValue: {
      completionRateFromSignup,
      completionRateFromEntry,
      medianFirstValueTimeMs,
      sampleSize: firstValueDurations.length,
      sloTargetMs: firstValueSloTargetMs,
      sloStatus,
    },
    funnel,
    actionCounts,
    lastActivity: logs[0]?.createdAt?.toISOString() ?? null,
  }

  return NextResponse.json(response)
}

export const GET = withAdminAuth(handler, 'ops:users:view')

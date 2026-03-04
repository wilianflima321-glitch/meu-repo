import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { prisma } from '@/lib/db'

const CAPABILITY = 'ADMIN_ANALYTICS_BASELINE'

type BaselineMetricSummary = {
  count: number
  avg: number | null
  p50: number | null
  p95: number | null
  lastValue: number | null
  lastSeenAt: string | null
  target: number | null
  unit: string
  status: 'ok' | 'warn' | 'no_data'
}

type FunnelSummary = {
  landingViews: number
  signups: number
  logins: number
  dashboardViews: number
  projectCreates: number
  aiChats: number
  ideOpens: number
  firstValueProjectCreated: number
  firstValueAiSuccess: number
  firstValueIdeOpen: number
  firstValueCompleted: number
}

type FunnelConversions = {
  signupToProjectCreate: number | null
  signupToAiChat: number | null
  signupToIdeOpen: number | null
  signupToFirstValueComplete: number | null
  projectCreateToFirstValueComplete: number | null
}

function clampDays(input: string | null): number {
  const parsed = Number.parseInt(String(input ?? ''), 10)
  if (Number.isNaN(parsed)) return 7
  return Math.max(1, Math.min(parsed, 30))
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  if (sorted.length === 1) return sorted[0]
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

function summarizeMetric(values: number[], timestamps: Date[], target: number | null, unit: string): BaselineMetricSummary {
  if (values.length === 0) {
    return {
      count: 0,
      avg: null,
      p50: null,
      p95: null,
      lastValue: null,
      lastSeenAt: null,
      target,
      unit,
      status: 'no_data',
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const avg = values.reduce((acc, item) => acc + item, 0) / values.length
  const p50 = percentile(sorted, 50)
  const p95 = percentile(sorted, 95)
  const lastValue = values[values.length - 1]
  const lastSeenAt = timestamps.length > 0 ? timestamps[timestamps.length - 1].toISOString() : null

  const status = target === null || p95 === null ? 'warn' : p95 <= target ? 'ok' : 'warn'
  return {
    count: values.length,
    avg: Number(avg.toFixed(2)),
    p50: p50 === null ? null : Number(p50.toFixed(2)),
    p95: p95 === null ? null : Number(p95.toFixed(2)),
    lastValue: Number(lastValue.toFixed(2)),
    lastSeenAt,
    target,
    unit,
    status,
  }
}

function ratio(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null
  return Number(((part / whole) * 100).toFixed(2))
}

function incrementFunnelFromEvent(
  funnel: FunnelSummary,
  action: string,
  metadata: Record<string, unknown>
): FunnelSummary {
  const payload = toObject(metadata.payload)

  if (action === 'analytics:project_create') {
    const next = { ...funnel, projectCreates: funnel.projectCreates + 1 }
    if (
      payload.source === 'first-value-guide' &&
      payload.milestone === 'first-project-created'
    ) {
      next.firstValueProjectCreated += 1
    }
    return next
  }
  if (action === 'analytics:register') {
    return { ...funnel, signups: funnel.signups + 1 }
  }
  if (action === 'analytics:login') {
    return { ...funnel, logins: funnel.logins + 1 }
  }
  if (action === 'analytics:ai_chat') {
    const next = { ...funnel, aiChats: funnel.aiChats + 1 }
    if (
      payload.source === 'first-value-guide' &&
      payload.milestone === 'first-ai-success'
    ) {
      next.firstValueAiSuccess += 1
    }
    return next
  }
  if (action === 'analytics:editor_open') {
    const next = { ...funnel, ideOpens: funnel.ideOpens + 1 }
    if (
      payload.source === 'first-value-guide' &&
      payload.milestone === 'first-ide-opened'
    ) {
      next.firstValueIdeOpen += 1
    }
    return next
  }
  if (action === 'analytics:settings_change') {
    if (
      payload.section === 'first-value-guide' &&
      payload.action === 'completed'
    ) {
      return { ...funnel, firstValueCompleted: funnel.firstValueCompleted + 1 }
    }
    return funnel
  }
  if (action === 'analytics:page_load') {
    const label = typeof metadata.label === 'string' ? metadata.label.toLowerCase() : ''
    if (label === 'landing') {
      return { ...funnel, landingViews: funnel.landingViews + 1 }
    }
    if (label === 'dashboard') {
      return { ...funnel, dashboardViews: funnel.dashboardViews + 1 }
    }
  }
  return funnel
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  const days = clampDays(new URL(request.url).searchParams.get('days'))
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const logs = await prisma.auditLog.findMany({
    where: {
      category: 'analytics',
      createdAt: { gte: start },
      OR: [
        { action: { startsWith: 'analytics_metric:' } },
        { action: 'analytics:page_load' },
        { action: 'analytics:register' },
        { action: 'analytics:login' },
        { action: 'analytics:project_create' },
        { action: 'analytics:ai_chat' },
        { action: 'analytics:editor_open' },
        { action: 'analytics:settings_change' },
      ],
    },
    select: {
      action: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 10000,
  })

  const metricBuckets: Record<string, { values: number[]; timestamps: Date[]; unit: string }> = {}
  let funnel: FunnelSummary = {
    landingViews: 0,
    signups: 0,
    logins: 0,
    dashboardViews: 0,
    projectCreates: 0,
    aiChats: 0,
    ideOpens: 0,
    firstValueProjectCreated: 0,
    firstValueAiSuccess: 0,
    firstValueIdeOpen: 0,
    firstValueCompleted: 0,
  }

  for (const entry of logs) {
    const metadata = toObject(entry.metadata)
    funnel = incrementFunnelFromEvent(funnel, entry.action, metadata)

    if (!entry.action.startsWith('analytics_metric:')) {
      continue
    }

    const name = entry.action.replace('analytics_metric:', '')
    const value = asNumber(metadata.value)
    if (value === null) continue

    const unit = typeof metadata.unit === 'string' && metadata.unit.trim() ? metadata.unit : 'ms'
    if (!metricBuckets[name]) {
      metricBuckets[name] = { values: [], timestamps: [], unit }
    }

    metricBuckets[name].values.push(value)
    metricBuckets[name].timestamps.push(entry.createdAt)
  }

  const webVitalsTargets: Record<string, { target: number | null; unit: string }> = {
    FCP: { target: 1800, unit: 'ms' },
    LCP: { target: 2500, unit: 'ms' },
    CLS: { target: 0.1, unit: 'count' },
    TTI: { target: 3800, unit: 'ms' },
    ai_chat_latency: { target: 2500, unit: 'ms' },
    first_value_time: { target: 15000, unit: 'ms' },
  }

  const performance = Object.fromEntries(
    Object.entries(webVitalsTargets).map(([name, targetDef]) => {
      const bucket = metricBuckets[name]
      const summary = summarizeMetric(
        bucket?.values ?? [],
        bucket?.timestamps ?? [],
        targetDef.target,
        bucket?.unit ?? targetDef.unit
      )
      return [name, summary]
    })
  ) as Record<string, BaselineMetricSummary>

  const funnelConversions: FunnelConversions = {
    signupToProjectCreate: ratio(funnel.projectCreates, funnel.signups),
    signupToAiChat: ratio(funnel.aiChats, funnel.signups),
    signupToIdeOpen: ratio(funnel.ideOpens, funnel.signups),
    signupToFirstValueComplete: ratio(funnel.firstValueCompleted, funnel.signups),
    projectCreateToFirstValueComplete: ratio(funnel.firstValueCompleted, funnel.firstValueProjectCreated),
  }

  const missingSamples = Object.entries(performance)
    .filter(([, summary]) => summary.count === 0)
    .map(([metric]) => metric)
  const firstValueMetric = performance.first_value_time
  const firstValue = {
    medianMs: firstValueMetric?.p50 ?? null,
    p95Ms: firstValueMetric?.p95 ?? null,
    samples: firstValueMetric?.count ?? 0,
  }

  return NextResponse.json({
    success: true,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    window: {
      days,
      startAt: start.toISOString(),
      endAt: now.toISOString(),
    },
    totals: {
      analyticsRecords: logs.length,
      metricSamples: Object.values(metricBuckets).reduce((acc, bucket) => acc + bucket.values.length, 0),
    },
    performance,
    funnel,
    funnelConversions,
    firstValue,
    dataQuality: {
      missingSamples,
      hasAnyMissingSamples: missingSamples.length > 0,
    },
    updatedAt: now.toISOString(),
  })
}, 'ops:dashboard:metrics')

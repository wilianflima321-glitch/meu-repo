import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { apiInternalError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type AnalyticsEventPayload = {
  category?: string
  action?: string
  label?: string
  value?: number
  projectId?: string
  metadata?: Record<string, unknown>
}

type AnalyticsMetricPayload = {
  name?: string
  value?: number
  unit?: string
  tags?: Record<string, string>
}

const MAX_BATCH_ITEMS = 200

function normalizeEvent(event: AnalyticsEventPayload, index: number) {
  const action = typeof event.action === 'string' && event.action.trim() ? event.action.trim() : `event_${index + 1}`
  const category = typeof event.category === 'string' && event.category.trim() ? event.category.trim() : 'analytics'

  return {
    action: `analytics:${action}`,
    category: 'analytics',
    severity: 'info',
    resource: category,
    targetType: event.projectId ? 'project' : 'session',
    targetId: event.projectId ?? null,
    metadata: {
      label: event.label ?? null,
      value: typeof event.value === 'number' ? event.value : null,
      payload: event.metadata ?? null,
    },
  }
}

function normalizeMetric(metric: AnalyticsMetricPayload, index: number) {
  const name = typeof metric.name === 'string' && metric.name.trim() ? metric.name.trim() : `metric_${index + 1}`
  return {
    action: `analytics_metric:${name}`,
    category: 'analytics',
    severity: 'info',
    resource: 'performance',
    metadata: {
      value: typeof metric.value === 'number' ? metric.value : null,
      unit: metric.unit ?? null,
      tags: metric.tags ?? null,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const body = await request.json().catch(() => ({}))
    const rawEvents = Array.isArray(body?.events) ? (body.events as AnalyticsEventPayload[]) : []
    const rawMetrics = Array.isArray(body?.metrics) ? (body.metrics as AnalyticsMetricPayload[]) : []

    const events = rawEvents.slice(0, MAX_BATCH_ITEMS).map(normalizeEvent)
    const metrics = rawMetrics.slice(0, MAX_BATCH_ITEMS).map(normalizeMetric)

    const logs = [...events, ...metrics]
    if (logs.length === 0) {
      return NextResponse.json({ success: true, accepted: 0 })
    }

    const createData = logs.map((entry) => ({
      userId: user?.userId ?? null,
      action: entry.action,
      category: entry.category,
      severity: entry.severity,
      resource: entry.resource,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata,
      userAgent: request.headers.get('user-agent') ?? null,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
    }))

    await prisma.auditLog.createMany({
      data: createData,
      skipDuplicates: false,
    })

    return NextResponse.json({
      success: true,
      accepted: createData.length,
      dropped: rawEvents.length + rawMetrics.length - createData.length,
    })
  } catch (error) {
    console.error('Failed to persist analytics batch:', error)
    return apiInternalError('Failed to persist analytics batch')
  }
}

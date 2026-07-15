import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'

const routeLogger = createComponentLogger('api.me.audit-log')

const auditLogSelect = {
  id: true,
  adminId: true,
  userId: true,
  action: true,
  category: true,
  severity: true,
  targetType: true,
  targetId: true,
  targetEmail: true,
  resource: true,
  reason: true,
  metadata: true,
  ipAddress: true,
  userAgent: true,
  requestId: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect

type AuditLogRow = Prisma.AuditLogGetPayload<{ select: typeof auditLogSelect }>
type SafeMetadataValue = string | number | boolean

type SafeAuditEvent = {
  id: string
  action: string
  title: string
  category: string
  severity: string
  actor: 'you' | 'aethel_operator' | 'system'
  target: string | null
  resource: string | null
  reason: string | null
  metadata: Record<string, SafeMetadataValue>
  requestId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

const SAFE_METADATA_KEYS = new Set([
  'amount',
  'deploymentId',
  'entryType',
  'model',
  'plan',
  'projectId',
  'provider',
  'reference',
  'resource',
  'runtimeTarget',
  'source',
  'status',
  'workspaceId',
])

function clampLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '20', 10)
  if (!Number.isFinite(parsed)) return 20
  return Math.min(Math.max(parsed, 1), 50)
}

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function sanitizeMetadata(metadata: Prisma.JsonValue | null): Record<string, SafeMetadataValue> {
  if (!isJsonObject(metadata)) return {}

  const safe: Record<string, SafeMetadataValue> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value
    }
  }
  return safe
}

function summarizeAction(action: string): string {
  return action
    .replace(/[_.:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase()) || 'Account event'
}

function maskIpAddress(ipAddress: string | null): string | null {
  if (!ipAddress) return null
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ipAddress)) {
    const parts = ipAddress.split('.')
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`
  }
  if (ipAddress.includes(':')) {
    return `${ipAddress.split(':').slice(0, 3).join(':')}::`
  }
  return 'redacted'
}

function compactUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null
  return userAgent.length > 90 ? `${userAgent.slice(0, 87)}...` : userAgent
}

function resolveActor(row: AuditLogRow, currentUserId: string): SafeAuditEvent['actor'] {
  if (row.userId === currentUserId || row.adminId === currentUserId) return 'you'
  if (row.adminId) return 'aethel_operator'
  return 'system'
}

function resolveTarget(row: AuditLogRow): string | null {
  if (row.targetType && row.targetId) return `${row.targetType}:${row.targetId}`
  if (row.targetType) return row.targetType
  return row.targetId || row.targetEmail || null
}

function toSafeEvent(row: AuditLogRow, currentUserId: string): SafeAuditEvent {
  return {
    id: row.id,
    action: row.action,
    title: summarizeAction(row.action),
    category: row.category,
    severity: row.severity,
    actor: resolveActor(row, currentUserId),
    target: resolveTarget(row),
    resource: row.resource,
    reason: row.reason,
    metadata: sanitizeMetadata(row.metadata),
    requestId: row.requestId,
    ipAddress: maskIpAddress(row.ipAddress),
    userAgent: compactUserAgent(row.userAgent),
    createdAt: row.createdAt.toISOString(),
  }
}

function buildSummary(events: SafeAuditEvent[]) {
  const categories = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.category] = (acc[event.category] || 0) + 1
    return acc
  }, {})

  return {
    totalReturned: events.length,
    critical: events.filter((event) => event.severity === 'critical').length,
    warnings: events.filter((event) => event.severity === 'warning').length,
    categories,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const { searchParams } = new URL(request.url)
    const limit = clampLimit(searchParams.get('limit'))
    const category = searchParams.get('category')
    const severity = searchParams.get('severity')

    const where: Prisma.AuditLogWhereInput = {
      OR: [
        { userId: auth.userId },
        { adminId: auth.userId },
        { targetType: 'user', targetId: auth.userId },
        { targetEmail: auth.email },
      ],
    }

    if (category && category !== 'all') where.category = category
    if (severity && severity !== 'all') where.severity = severity

    const rows = await prisma.auditLog.findMany({
      where,
      select: auditLogSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const events = rows.map((row) => toSafeEvent(row, auth.userId))

    return NextResponse.json({
      events,
      summary: buildSummary(events),
      privacy: {
        metadata: 'allowlisted',
        ipAddress: 'masked',
        adminIdentity: 'redacted',
      },
    })
  } catch (error) {
    routeLogger.error('me.audit_log.failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

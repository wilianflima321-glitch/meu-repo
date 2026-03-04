import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { capabilityResponse } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'TELEMETRY_EVENT_INGEST'
const MAX_METADATA_BYTES = 32 * 1024

type TelemetryEventBody = {
  type?: unknown
  event?: unknown
  timestamp?: unknown
  source?: unknown
  data?: unknown
  payload?: unknown
  metadata?: unknown
  context?: unknown
  severity?: unknown
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function sanitizeEventType(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '_')
    .replace(/^[_:. -]+|[_:. -]+$/g, '')

  return normalized.slice(0, 120)
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  const normalized = JSON.parse(JSON.stringify(value ?? {}))
  return normalized as Prisma.InputJsonValue
}

function resolveCategory(eventType: string): 'analytics' | 'telemetry' {
  return eventType.startsWith('analytics.') || eventType.startsWith('analytics:') ? 'analytics' : 'telemetry'
}

function resolveAction(category: 'analytics' | 'telemetry', eventType: string): string {
  if (category === 'analytics') {
    const normalized = eventType.replace(/^analytics[.:]/, '')
    return `analytics:${normalized || 'event'}`
  }
  return `telemetry:${eventType}`
}

export async function POST(request: NextRequest) {
  let body: TelemetryEventBody
  try {
    body = (await request.json()) as TelemetryEventBody
  } catch {
    return capabilityResponse({
      error: 'TELEMETRY_EVENT_INVALID_JSON',
      message: 'Telemetry event payload is not valid JSON.',
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'invalid_json' },
    })
  }

  const rawType = asString(body.type) || asString(body.event)
  if (!rawType) {
    return capabilityResponse({
      error: 'TELEMETRY_EVENT_TYPE_REQUIRED',
      message: 'Telemetry event type is required.',
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'missing_type' },
    })
  }

  const eventType = sanitizeEventType(rawType)
  if (!eventType) {
    return capabilityResponse({
      error: 'TELEMETRY_EVENT_TYPE_INVALID',
      message: 'Telemetry event type is invalid.',
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'invalid_type' },
    })
  }

  const user = getUserFromRequest(request)
  const category = resolveCategory(eventType)
  const action = resolveAction(category, eventType)
  const source = asString(body.source) || 'client'
  const severity = asString(body.severity) || 'info'
  const metadata = {
    eventType,
    timestamp: asString(body.timestamp) || new Date().toISOString(),
    payload: body.data ?? body.payload ?? null,
    metadata: asObject(body.metadata),
    context: asObject(body.context),
  }

  const metadataBytes = Buffer.byteLength(JSON.stringify(metadata), 'utf8')
  if (metadataBytes > MAX_METADATA_BYTES) {
    return capabilityResponse({
      error: 'TELEMETRY_EVENT_TOO_LARGE',
      message: 'Telemetry event payload is too large.',
      status: 413,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        reason: 'payload_too_large',
        maxBytes: MAX_METADATA_BYTES,
        actualBytes: metadataBytes,
      },
    })
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.userId ?? null,
        action,
        category,
        severity,
        resource: source,
        metadata: toInputJsonValue(metadata),
        userAgent: request.headers.get('user-agent') ?? null,
        ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
        requestId: request.headers.get('x-request-id') ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to ingest telemetry event:', error)
    return capabilityResponse({
      error: 'TELEMETRY_EVENT_PERSIST_FAILED',
      message: 'Telemetry event could not be persisted.',
      status: 500,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'db_write_failed' },
    })
  }

  return NextResponse.json({
    success: true,
    accepted: true,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    category,
    action,
    source,
    eventType,
    timestamp: metadata.timestamp,
  })
}

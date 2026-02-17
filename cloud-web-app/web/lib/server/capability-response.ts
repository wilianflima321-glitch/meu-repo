import { NextResponse } from 'next/server'

type CapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'DEPRECATED'

type CapabilityResponseOptions = {
  error: string
  message: string
  status: number
  capability: string
  capabilityStatus?: CapabilityStatus
  milestone?: string
  runtimeMode?: string
  metadata?: Record<string, unknown>
  headers?: Record<string, string>
}

function stringifyMeta(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function capabilityResponse(options: CapabilityResponseOptions) {
  const capabilityStatus = options.capabilityStatus || 'NOT_IMPLEMENTED'

  const payload = {
    error: options.error,
    message: options.message,
    capability: options.capability,
    capabilityStatus,
    ...(options.milestone ? { milestone: options.milestone } : {}),
    ...(options.runtimeMode ? { runtimeMode: options.runtimeMode } : {}),
    ...(options.metadata || {}),
  }

  const headers: Record<string, string> = {
    'x-aethel-capability': options.capability,
    'x-aethel-capability-status': capabilityStatus,
    ...(options.runtimeMode ? { 'x-aethel-runtime-mode': options.runtimeMode } : {}),
    ...(options.headers || {}),
  }

  if (options.metadata) {
    for (const [key, value] of Object.entries(options.metadata)) {
      headers[`x-aethel-meta-${key}`] = stringifyMeta(value)
    }
  }

  return NextResponse.json(payload, { status: options.status, headers })
}

export function notImplementedCapability(options: {
  error?: string
  message: string
  capability: string
  milestone?: string
  runtimeMode?: string
  metadata?: Record<string, unknown>
  status?: number
  headers?: Record<string, string>
}) {
  return capabilityResponse({
    error: options.error || 'NOT_IMPLEMENTED',
    message: options.message,
    status: options.status || 501,
    capability: options.capability,
    capabilityStatus: 'NOT_IMPLEMENTED',
    milestone: options.milestone,
    runtimeMode: options.runtimeMode,
    metadata: options.metadata,
    headers: options.headers,
  })
}

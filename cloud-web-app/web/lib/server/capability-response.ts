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

/**
 * HTTP header values must be ByteString-safe (code units 0–255) for undici /
 * NextResponse serialization. Arbitrary capability metadata may embed non-ASCII
 * text (e.g. compiler diagnostics containing em-dashes), which would otherwise
 * throw "Cannot convert argument to a ByteString ..." and turn a clean 4xx into
 * a 500. Code points outside the safe set are percent-encoded as their UTF-8
 * bytes so the information survives losslessly while the header stays valid.
 */
function toHeaderSafe(value: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) as number
    const keep = code === 0x09 || (code >= 0x20 && code <= 0x7e) || (code >= 0x80 && code <= 0xff)
    if (keep) {
      out += char
    } else {
      const bytes = new TextEncoder().encode(char)
      for (const byte of bytes) {
        out += `%${byte.toString(16).padStart(2, '0').toUpperCase()}`
      }
    }
  }
  return out
}

/** Header names must be RFC 7230 tokens; coerce arbitrary metadata keys. */
function toHeaderToken(input: string): string {
  const sanitized = input.replace(/[^a-zA-Z0-9_-]/g, '_')
  return sanitized || 'meta'
}

export function capabilityResponse(options: CapabilityResponseOptions) {
  const capabilityStatus = options.capabilityStatus || 'NOT_IMPLEMENTED'
  const metadata = options.metadata || {}

  const payload = {
    error: options.error,
    message: options.message,
    capability: options.capability,
    capabilityStatus,
    ...(options.milestone ? { milestone: options.milestone } : {}),
    ...(options.runtimeMode ? { runtimeMode: options.runtimeMode } : {}),
    metadata,
    // Compatibility alias (kept while consumers migrate to payload.metadata)
    ...metadata,
  }

  const headers: Record<string, string> = {
    'x-aethel-capability': options.capability,
    'x-aethel-capability-status': capabilityStatus,
    ...(options.runtimeMode ? { 'x-aethel-runtime-mode': options.runtimeMode } : {}),
    ...(options.headers || {}),
  }

  if (Object.keys(metadata).length > 0) {
    for (const [key, value] of Object.entries(metadata)) {
      headers[`x-aethel-meta-${toHeaderToken(key)}`] = toHeaderSafe(stringifyMeta(value))
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

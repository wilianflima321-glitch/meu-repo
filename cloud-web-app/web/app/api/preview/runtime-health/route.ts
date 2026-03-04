import { NextRequest, NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

const LOCAL_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const LOCAL_ALLOWED_PORTS = new Set(['', '3000', '3001', '4173', '5173', '8080', '4200'])

function isAllowedRuntimeUrl(url: URL): boolean {
  if (!['http:', 'https:'].includes(url.protocol)) return false
  const hostAllowed = LOCAL_ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith('.localhost')
  if (!hostAllowed) return false
  return LOCAL_ALLOWED_PORTS.has(url.port)
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url')?.trim()
  if (!target) {
    return capabilityResponse({
      error: 'RUNTIME_URL_REQUIRED',
      message: 'Missing runtime URL for health check.',
      status: 400,
      capability: 'IDE_PREVIEW_RUNTIME_HEALTH',
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'missing_url' },
    })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return capabilityResponse({
      error: 'RUNTIME_URL_INVALID',
      message: 'Runtime URL is invalid.',
      status: 400,
      capability: 'IDE_PREVIEW_RUNTIME_HEALTH',
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'invalid_url' },
    })
  }

  if (!isAllowedRuntimeUrl(parsed)) {
    return capabilityResponse({
      error: 'RUNTIME_URL_NOT_ALLOWED',
      message: 'Runtime URL host is not allowed for server-side probe.',
      status: 403,
      capability: 'IDE_PREVIEW_RUNTIME_HEALTH',
      capabilityStatus: 'PARTIAL',
      metadata: {
        reason: 'blocked_host',
        hostname: parsed.hostname,
        port: parsed.port || 'default',
      },
    })
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    const latencyMs = Date.now() - startedAt

    return NextResponse.json(
      {
        status: response.ok ? 'reachable' : 'unhealthy',
        reachable: response.ok,
        httpStatus: response.status,
        latencyMs,
      },
      {
        status: 200,
        headers: {
          'x-aethel-capability': 'IDE_PREVIEW_RUNTIME_HEALTH',
          'x-aethel-capability-status': 'PARTIAL',
        },
      }
    )
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network'
    return NextResponse.json(
      {
        status: 'unreachable',
        reachable: false,
        reason,
        latencyMs,
      },
      {
        status: 200,
        headers: {
          'x-aethel-capability': 'IDE_PREVIEW_RUNTIME_HEALTH',
          'x-aethel-capability-status': 'PARTIAL',
        },
      }
    )
  } finally {
    clearTimeout(timeout)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  DEFAULT_RUNTIME_CANDIDATES,
  discoverPreviewRuntime,
  normalizeRuntimeCandidate,
  probeRuntimeUrl,
} from '@/lib/server/preview-runtime'
import {
  PREVIEW_PROVISION_RATE_LIMIT,
  enforcePreviewRuntimeRateLimit,
} from '@/lib/server/preview-runtime-rate-limit'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_PROVISION'
const DEFAULT_TIMEOUT_MS = 12_000

export const dynamic = 'force-dynamic'

type ProvisionBody = {
  projectId?: unknown
}

function parseTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS
  return Math.max(1000, Math.min(parsed, 30_000))
}

function parseProjectId(raw: unknown): string {
  if (typeof raw !== 'string') return 'default'
  const normalized = raw.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return normalized || 'default'
}

async function localFallbackDiscover() {
  const payload = await discoverPreviewRuntime(DEFAULT_RUNTIME_CANDIDATES, 1800)
  return payload.preferredRuntimeUrl
}

export async function POST(request: NextRequest) {
  const rateLimited = enforcePreviewRuntimeRateLimit({
    req: request,
    capability: CAPABILITY,
    route: '/api/preview/runtime-provision',
    config: PREVIEW_PROVISION_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited

  try {
    const auth = requireAuth(request)
    const body = (await request.json().catch(() => null)) as ProvisionBody | null
    const projectId = parseProjectId(body?.projectId)

    const provisionEndpoint = String(process.env.AETHEL_PREVIEW_PROVISION_ENDPOINT || '').trim()
    const provisionToken = String(process.env.AETHEL_PREVIEW_PROVISION_TOKEN || '').trim()
    const timeoutMs = parseTimeoutMs(process.env.AETHEL_PREVIEW_PROVISION_TIMEOUT_MS)

    if (!provisionEndpoint) {
      const localRuntime = await localFallbackDiscover()
      if (!localRuntime) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_BACKEND_NOT_CONFIGURED',
          status: 503,
          message: 'Managed preview provision backend is not configured.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'local_fallback',
            preferredRuntimeUrl: null,
            setupEnv: 'AETHEL_PREVIEW_PROVISION_ENDPOINT',
          },
        })
      }

      return NextResponse.json(
        {
          success: true,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          runtimeUrl: localRuntime,
          metadata: {
            mode: 'local_fallback',
            managed: false,
          },
        },
        {
          headers: {
            'x-aethel-capability': CAPABILITY,
            'x-aethel-capability-status': 'PARTIAL',
          },
        },
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(provisionEndpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(provisionToken ? { Authorization: `Bearer ${provisionToken}` } : {}),
        },
        body: JSON.stringify({
          projectId,
          userId: auth.userId,
        }),
      })
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_FAILED',
          status: 503,
          message: 'Managed preview provision request failed.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            projectId,
            upstreamStatus: response.status,
            upstreamError:
              typeof payload?.error === 'string'
                ? payload.error
                : typeof payload?.message === 'string'
                  ? payload.message
                  : 'unknown',
          },
        })
      }

      const candidate =
        typeof payload?.runtimeUrl === 'string'
          ? payload.runtimeUrl
          : typeof payload?.previewUrl === 'string'
            ? payload.previewUrl
            : ''
      const runtimeUrl = normalizeRuntimeCandidate(candidate)
      if (!runtimeUrl) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_INVALID_URL',
          status: 502,
          message: 'Provision backend returned an invalid or blocked runtime URL.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            projectId,
          },
        })
      }

      const probe = await probeRuntimeUrl(runtimeUrl, 3000)
      if (!probe.reachable) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_UNHEALTHY',
          status: 503,
          message: 'Provisioned runtime is not reachable yet.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            projectId,
            runtimeUrl,
            probeStatus: probe.status,
            latencyMs: probe.latencyMs,
            httpStatus: probe.httpStatus,
            reason: probe.reason,
          },
        })
      }

      return NextResponse.json(
        {
          success: true,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          runtimeUrl,
          metadata: {
            mode: 'managed',
            managed: true,
            projectId,
            latencyMs: probe.latencyMs,
            httpStatus: probe.httpStatus,
          },
        },
        {
          headers: {
            'x-aethel-capability': CAPABILITY,
            'x-aethel-capability-status': 'PARTIAL',
          },
        },
      )
    } catch (error) {
      return capabilityResponse({
        error: 'RUNTIME_PROVISION_EXCEPTION',
        status: 503,
        message: error instanceof Error ? error.message : 'Managed preview provision failed.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          mode: 'managed',
          projectId,
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return capabilityResponse({
      error: 'RUNTIME_PROVISION_EXCEPTION',
      status: 503,
      message: error instanceof Error ? error.message : 'Managed preview provision failed.',
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        mode: 'managed',
      },
    })
  }
}

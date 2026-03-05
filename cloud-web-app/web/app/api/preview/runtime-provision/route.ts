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
const DEFAULT_READY_WAIT_MS = 10_000
const DEFAULT_READY_POLL_MS = 1_200

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

function parseReadyWaitMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_READY_WAIT_MS
  return Math.max(0, Math.min(parsed, 60_000))
}

function parseReadyPollMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_READY_POLL_MS
  return Math.max(200, Math.min(parsed, 5_000))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForRuntimeReady(runtimeUrl: string, waitBudgetMs: number, pollMs: number) {
  const startedAt = Date.now()
  let attempts = 0
  let latest = await probeRuntimeUrl(runtimeUrl, 3000)
  attempts += 1
  if (latest.reachable || waitBudgetMs <= 0) {
    return {
      probe: latest,
      attempts,
      elapsedMs: Date.now() - startedAt,
    }
  }

  while (Date.now() - startedAt < waitBudgetMs) {
    const remainingMs = waitBudgetMs - (Date.now() - startedAt)
    if (remainingMs <= 0) break
    await sleep(Math.min(pollMs, remainingMs))
    latest = await probeRuntimeUrl(runtimeUrl, 3000)
    attempts += 1
    if (latest.reachable) break
  }

  return {
    probe: latest,
    attempts,
    elapsedMs: Date.now() - startedAt,
  }
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
    const readyWaitMs = parseReadyWaitMs(process.env.AETHEL_PREVIEW_PROVISION_READY_WAIT_MS)
    const readyPollMs = parseReadyPollMs(process.env.AETHEL_PREVIEW_PROVISION_READY_POLL_MS)

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

      const readiness = await waitForRuntimeReady(runtimeUrl, readyWaitMs, readyPollMs)
      if (!readiness.probe.reachable) {
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
            probeStatus: readiness.probe.status,
            latencyMs: readiness.probe.latencyMs,
            httpStatus: readiness.probe.httpStatus,
            reason: readiness.probe.reason,
            readyAttempts: readiness.attempts,
            readyElapsedMs: readiness.elapsedMs,
            readyWaitMs,
            readyPollMs,
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
            latencyMs: readiness.probe.latencyMs,
            httpStatus: readiness.probe.httpStatus,
            readyAttempts: readiness.attempts,
            readyElapsedMs: readiness.elapsedMs,
            readyWaitMs,
            readyPollMs,
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

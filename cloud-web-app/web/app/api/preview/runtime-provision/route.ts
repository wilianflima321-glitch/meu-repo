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
import {
  getManagedPreviewProviderConfig,
  parseConfiguredProvisionEndpoints,
} from '@/lib/server/preview-provider-config'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_PROVISION'
const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_READY_WAIT_MS = 10_000
const DEFAULT_READY_POLL_MS = 1_200

export const dynamic = 'force-dynamic'

type ProvisionBody = {
  projectId?: unknown
}

type ManagedProvisionAttempt = {
  endpoint: string
  status?: number
  error?: string
  mode: 'upstream_error' | 'invalid_runtime_url' | 'request_exception'
}

type ManagedProvisionSuccess = {
  runtimeUrl: string
  endpoint: string
  attempt: number
  totalEndpoints: number
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

function parseProvisionEndpoints(rawSingle: string, rawList: string): string[] {
  return parseConfiguredProvisionEndpoints(rawSingle, rawList)
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

async function callManagedProvisionEndpoint(params: {
  endpoint: string
  projectId: string
  userId: string
  timeoutMs: number
  provisionToken: string
}): Promise<{
  success?: ManagedProvisionSuccess
  failure?: ManagedProvisionAttempt
}> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs)
  try {
    const response = await fetch(params.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(params.provisionToken ? { Authorization: `Bearer ${params.provisionToken}` } : {}),
      },
      body: JSON.stringify({
        projectId: params.projectId,
        userId: params.userId,
      }),
    })
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!response.ok) {
      return {
        failure: {
          endpoint: params.endpoint,
          status: response.status,
          mode: 'upstream_error',
          error:
            typeof payload?.error === 'string'
              ? payload.error
              : typeof payload?.message === 'string'
                ? payload.message
                : 'unknown',
        },
      }
    }

    const candidate =
      typeof payload?.runtimeUrl === 'string'
        ? payload.runtimeUrl
        : typeof payload?.previewUrl === 'string'
          ? payload.previewUrl
          : ''
    const runtimeUrl = normalizeRuntimeCandidate(candidate)
    if (!runtimeUrl) {
      return {
        failure: {
          endpoint: params.endpoint,
          status: response.status,
          mode: 'invalid_runtime_url',
          error: 'invalid_or_blocked_runtime_url',
        },
      }
    }

    return {
      success: {
        runtimeUrl,
        endpoint: params.endpoint,
        attempt: 0,
        totalEndpoints: 0,
      },
    }
  } catch (error) {
    return {
      failure: {
        endpoint: params.endpoint,
        mode: 'request_exception',
        error: error instanceof Error ? error.message : 'request_exception',
      },
    }
  } finally {
    clearTimeout(timeout)
  }
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
    const provisionEndpointsCsv = String(process.env.AETHEL_PREVIEW_PROVISION_ENDPOINTS || '').trim()
    const provisionToken = String(process.env.AETHEL_PREVIEW_PROVISION_TOKEN || '').trim()
    const providerConfig =
      getManagedPreviewProviderConfig(process.env.AETHEL_PREVIEW_PROVIDER) ||
      (provisionEndpoint || provisionEndpointsCsv ? getManagedPreviewProviderConfig('custom-endpoint') : null)
    const timeoutMs = parseTimeoutMs(process.env.AETHEL_PREVIEW_PROVISION_TIMEOUT_MS)
    const readyWaitMs = parseReadyWaitMs(process.env.AETHEL_PREVIEW_PROVISION_READY_WAIT_MS)
    const readyPollMs = parseReadyPollMs(process.env.AETHEL_PREVIEW_PROVISION_READY_POLL_MS)
    const provisionEndpoints = parseConfiguredProvisionEndpoints(provisionEndpoint, provisionEndpointsCsv)

    if (providerConfig?.id === 'webcontainers') {
      return capabilityResponse({
        error: 'RUNTIME_PROVISION_BROWSER_SIDE_PROVIDER',
        status: 501,
        message: 'WebContainers is declared as the managed preview provider, but browser-side runtime wiring is not active in this route.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          mode: 'browser_side_provider',
          provider: providerConfig.id,
          setupEnv: providerConfig.setupEnv,
        },
      })
    }

    if (provisionEndpoints.length === 0) {
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
            provider: providerConfig?.id || null,
            setupEnv: providerConfig?.setupEnv || ['AETHEL_PREVIEW_PROVISION_ENDPOINT', 'AETHEL_PREVIEW_PROVISION_ENDPOINTS'],
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

    const failures: ManagedProvisionAttempt[] = []
    let managedSuccess: ManagedProvisionSuccess | null = null

    for (let index = 0; index < provisionEndpoints.length; index += 1) {
      const endpoint = provisionEndpoints[index]
      const attemptResult = await callManagedProvisionEndpoint({
        endpoint,
        projectId,
        userId: auth.userId,
        timeoutMs,
        provisionToken,
      })
      if (attemptResult.success) {
        managedSuccess = {
          ...attemptResult.success,
          attempt: index + 1,
          totalEndpoints: provisionEndpoints.length,
        }
        break
      }
      if (attemptResult.failure) {
        failures.push(attemptResult.failure)
        if (
          attemptResult.failure.mode === 'invalid_runtime_url' &&
          index === provisionEndpoints.length - 1
        ) {
          return capabilityResponse({
            error: 'RUNTIME_PROVISION_INVALID_URL',
            status: 502,
            message: 'Provision backend returned an invalid or blocked runtime URL.',
            capability: CAPABILITY,
            capabilityStatus: 'PARTIAL',
            metadata: {
              mode: 'managed',
              provider: providerConfig?.id || 'custom-endpoint',
              projectId,
              endpoint,
              attempt: index + 1,
              totalEndpoints: provisionEndpoints.length,
            },
          })
        }
      }
    }

    if (!managedSuccess) {
      return capabilityResponse({
        error: 'RUNTIME_PROVISION_FAILED',
        status: 503,
        message: 'Managed preview provision request failed.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          mode: 'managed',
          provider: providerConfig?.id || 'custom-endpoint',
          projectId,
          attempts: failures,
          attemptCount: failures.length,
          totalEndpoints: provisionEndpoints.length,
        },
      })
    }

    try {
      const readiness = await waitForRuntimeReady(
        managedSuccess.runtimeUrl,
        readyWaitMs,
        readyPollMs
      )
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
            runtimeUrl: managedSuccess.runtimeUrl,
            endpoint: managedSuccess.endpoint,
            attempt: managedSuccess.attempt,
            totalEndpoints: managedSuccess.totalEndpoints,
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
          runtimeUrl: managedSuccess.runtimeUrl,
          metadata: {
            mode: 'managed',
            managed: true,
            provider: providerConfig?.id || 'custom-endpoint',
            projectId,
            endpoint: managedSuccess.endpoint,
            attempt: managedSuccess.attempt,
            totalEndpoints: managedSuccess.totalEndpoints,
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
          provider: providerConfig?.id || 'custom-endpoint',
          projectId,
          endpoint: managedSuccess.endpoint,
          attempt: managedSuccess.attempt,
          totalEndpoints: managedSuccess.totalEndpoints,
        },
      })
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
        provider: providerConfig?.id || null,
      },
    })
  }
}

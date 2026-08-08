import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { capabilityResponse } from '@/lib/server/capability-response'
import { normalizeRuntimeCandidate } from '@/lib/server/preview-runtime'
import {
  PREVIEW_PROVISION_RATE_LIMIT,
  enforcePreviewRuntimeRateLimit,
} from '@/lib/server/preview-runtime-rate-limit'
import { getManagedPreviewProviderConfig } from '@/lib/server/preview-provider-config'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'
import { orchestratePreviewSession } from '@/lib/production/preview-orchestrator'
import { createMemoryCostGuardLedger } from '@/lib/production/creative-cost-guard'

import {
  callManagedProvisionEndpoint,
  localFallbackDiscover,
  parseE2BInstallTimeoutMs,
  parseE2BMaxFileSizeMb,
  parseE2BMaxFiles,
  parseE2BPort,
  parseE2BTimeoutMs,
  parseE2BUploadBatch,
  parseProjectId,
  parseProvisionEndpoints,
  parseReadyPollMs,
  parseReadyWaitMs,
  parseTimeoutMs,
  provisionWithE2B,
  resolveE2BWorkdir,
  waitForRuntimeReady,
  type ManagedProvisionAttempt,
  type ManagedProvisionSuccess,
  type ProvisionBody,
} from './runtime-provision.helpers'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_PROVISION'

export const dynamic = 'force-dynamic'


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
    const e2bApiKey = String(process.env.E2B_API_KEY || '').trim()
    const e2bTemplateId = String(process.env.AETHEL_PREVIEW_E2B_TEMPLATE || '').trim()
    const e2bPort = parseE2BPort(process.env.AETHEL_PREVIEW_E2B_PORT)
    const e2bTimeoutMs = parseE2BTimeoutMs(process.env.AETHEL_PREVIEW_E2B_TIMEOUT_MS)
    const e2bWorkdir = resolveE2BWorkdir(process.env.AETHEL_PREVIEW_E2B_WORKDIR)
    const e2bMaxFiles = parseE2BMaxFiles(process.env.AETHEL_PREVIEW_E2B_MAX_FILES)
    const e2bMaxFileSizeBytes = parseE2BMaxFileSizeMb(process.env.AETHEL_PREVIEW_E2B_MAX_FILE_SIZE_MB) * 1024 * 1024
    const e2bUploadBatch = parseE2BUploadBatch(process.env.AETHEL_PREVIEW_E2B_UPLOAD_BATCH_SIZE)
    const e2bInstallTimeoutMs = parseE2BInstallTimeoutMs(process.env.AETHEL_PREVIEW_E2B_INSTALL_TIMEOUT_MS)
    const workspaceRoot = getScopedWorkspaceRoot(auth.userId, projectId)
    const providerConfig =
      getManagedPreviewProviderConfig(process.env.AETHEL_PREVIEW_PROVIDER) ||
      (provisionEndpoint || provisionEndpointsCsv ? getManagedPreviewProviderConfig('custom-endpoint') : null)
    const timeoutMs = parseTimeoutMs(process.env.AETHEL_PREVIEW_PROVISION_TIMEOUT_MS)
    const readyWaitMs = parseReadyWaitMs(process.env.AETHEL_PREVIEW_PROVISION_READY_WAIT_MS)
    const readyPollMs = parseReadyPollMs(process.env.AETHEL_PREVIEW_PROVISION_READY_POLL_MS)
    const provisionEndpoints = parseProvisionEndpoints(provisionEndpoint, provisionEndpointsCsv)
    const managedProviderId =
      providerConfig?.id || (provisionEndpoints.length > 0 ? 'custom-endpoint' : null)
    const localProviderId = 'local'

    if (providerConfig?.id === 'webcontainers') {
      return capabilityResponse({
        error: 'RUNTIME_PROVISION_BROWSER_SIDE_PROVIDER',
        status: 501,
        message: 'WebContainers is declared as a managed provider, but the browser runtime is not active on this route.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          mode: 'browser_side_provider',
          strategy: 'browser-side',
          provider: providerConfig.id,
          setupEnv: providerConfig.setupEnv,
        },
      })
    }

    const failures: ManagedProvisionAttempt[] = []
    let managedSuccess: ManagedProvisionSuccess | null = null
    let managedMetadata: Record<string, unknown> | null = null

    if (providerConfig?.id === 'e2b' && provisionEndpoints.length === 0) {
      const workspaceStat = await fs.stat(workspaceRoot).catch(() => null)
      if (!workspaceStat || !workspaceStat.isDirectory()) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_FAILED',
          status: 503,
          message: 'Workspace root nao encontrado para provisionamento E2B.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            strategy: 'managed',
            provider: providerConfig.id,
            projectId,
            workspaceRoot,
          },
        })
      }
      if (!e2bApiKey) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_FAILED',
          status: 503,
          message: 'Provisionamento E2B exige E2B_API_KEY.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            strategy: 'managed',
            provider: providerConfig.id,
            projectId,
            missing: ['E2B_API_KEY'],
          },
        })
      }
      if (!e2bTemplateId) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_FAILED',
          status: 503,
          message: 'Provisionamento E2B exige AETHEL_PREVIEW_E2B_TEMPLATE.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            strategy: 'managed',
            provider: providerConfig.id,
            projectId,
            missing: ['AETHEL_PREVIEW_E2B_TEMPLATE'],
          },
        })
      }
      try {
        const e2bResult = await provisionWithE2B({
          apiKey: e2bApiKey,
          templateId: e2bTemplateId,
          port: e2bPort,
          timeoutMs: e2bTimeoutMs,
          workspaceRoot,
          workdir: e2bWorkdir,
          maxFiles: e2bMaxFiles,
          maxFileSizeBytes: e2bMaxFileSizeBytes,
          uploadBatchSize: e2bUploadBatch,
          installTimeoutMs: e2bInstallTimeoutMs,
        })
        const normalized = normalizeRuntimeCandidate(e2bResult.runtimeUrl)
        if (!normalized) {
          return capabilityResponse({
            error: 'RUNTIME_PROVISION_INVALID_URL',
            status: 502,
            message: 'E2B retornou uma URL de runtime invalida ou bloqueada.',
            capability: CAPABILITY,
            capabilityStatus: 'PARTIAL',
            metadata: {
              mode: 'managed',
              strategy: 'managed',
              provider: providerConfig.id,
              projectId,
              runtimeUrl: e2bResult.runtimeUrl,
              host: e2bResult.host,
              sandboxId: e2bResult.sandboxId,
            },
          })
        }
        managedSuccess = {
          runtimeUrl: normalized,
          endpoint: 'e2b',
          attempt: 1,
          totalEndpoints: 1,
        }
        managedMetadata = {
          sandboxId: e2bResult.sandboxId,
          filesCount: e2bResult.filesCount,
          totalBytes: e2bResult.totalBytes,
          startMode: e2bResult.startMode,
          workdir: e2bWorkdir,
        }
      } catch (error) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_FAILED',
          status: 503,
          message: error instanceof Error ? error.message : 'Failed to provision E2B.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            strategy: 'managed',
            provider: providerConfig?.id || 'e2b',
            projectId,
          },
        })
      }
    } else if (provisionEndpoints.length === 0) {
      // Use L.8 PreviewOrchestrator for robust local provisioning (zero-MVP daemon support)
      const costAdapter = createMemoryCostGuardLedger()
      const orchestratorResult = await orchestratePreviewSession({
        userId: auth.userId,
        projectId,
        projectRootPath: workspaceRoot,
        preferredStrategy: 'local-dev-server',
        costAdapter,
      })

      if (!orchestratorResult.ok || !orchestratorResult.url || !orchestratorResult.ready) {
        return capabilityResponse({
          error: orchestratorResult.url
            ? 'RUNTIME_PROVISION_UNHEALTHY'
            : 'RUNTIME_PROVISION_BACKEND_NOT_CONFIGURED',
          status: 503,
          message: orchestratorResult.message || 'L.8 Orchestrator failed to provision a reachable preview URL.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'local_fallback',
            strategy: 'local',
            preferredRuntimeUrl: null,
            provider: localProviderId,
            sandboxSessionId: orchestratorResult.sandboxSessionId ?? null,
            sandboxId: orchestratorResult.sandboxId ?? orchestratorResult.sandboxSessionId ?? null,
            setupEnv: providerConfig?.setupEnv || ['AETHEL_PREVIEW_PROVISION_ENDPOINT', 'AETHEL_PREVIEW_PROVISION_ENDPOINTS'],
          },
        })
      }

      const localRuntime = orchestratorResult.url
      const sandboxId =
        orchestratorResult.sandboxId ?? orchestratorResult.sandboxSessionId ?? null

      return NextResponse.json(
        {
          success: true,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          runtimeUrl: localRuntime,
          strategy: 'local',
          provider: localProviderId,
          sandboxId,
          metadata: {
            mode: 'local_fallback',
            strategy: 'local',
            provider: localProviderId,
            managed: false,
            ready: true,
            latencyMs: orchestratorResult.latencyMs ?? null,
            sandboxSessionId: sandboxId,
            // IDE workbench sync path reads metadata.sandboxId
            sandboxId,
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

    if (!managedSuccess) {
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
              message: 'Backend de provisionamento retornou URL invalida ou bloqueada.',
              capability: CAPABILITY,
              capabilityStatus: 'PARTIAL',
              metadata: {
                mode: 'managed',
                strategy: 'managed',
                provider: managedProviderId || 'custom-endpoint',
                projectId,
                endpoint,
                attempt: index + 1,
                totalEndpoints: provisionEndpoints.length,
              },
            })
          }
        }
      }
    }

    if (!managedSuccess) {
      return capabilityResponse({
        error: 'RUNTIME_PROVISION_FAILED',
        status: 503,
        message: 'Failed to request managed provisioning.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
      metadata: {
        mode: 'managed',
        strategy: 'managed',
        provider: managedProviderId || 'custom-endpoint',
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
          message: 'Runtime provisionado ainda nao esta acessivel.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            strategy: 'managed',
            projectId,
            provider: managedProviderId || providerConfig?.id || 'custom-endpoint',
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
          strategy: 'managed',
          provider: managedProviderId || 'custom-endpoint',
          metadata: {
            mode: 'managed',
            managed: true,
            strategy: 'managed',
            provider: managedProviderId || 'custom-endpoint',
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
            ...(managedMetadata || {}),
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
        message: error instanceof Error ? error.message : 'Failed to provision managed preview.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          mode: 'managed',
          strategy: 'managed',
          provider: managedProviderId || 'custom-endpoint',
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
      message: error instanceof Error ? error.message : 'Failed to provision managed preview.',
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        mode: 'managed',
        strategy: 'managed',
        provider: null,
      },
    })
  }
}

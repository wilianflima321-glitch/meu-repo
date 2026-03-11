import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
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
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_PROVISION'
const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_READY_WAIT_MS = 10_000
const DEFAULT_READY_POLL_MS = 1_200
const DEFAULT_E2B_TIMEOUT_MS = 300_000
const DEFAULT_E2B_PORT = 3000
const DEFAULT_E2B_WORKDIR = '/workspace'
const DEFAULT_E2B_MAX_FILES = 2000
const DEFAULT_E2B_MAX_FILE_SIZE_MB = 5
const DEFAULT_E2B_UPLOAD_BATCH = 200
const DEFAULT_E2B_INSTALL_TIMEOUT_MS = 180_000

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

function parseE2BTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_TIMEOUT_MS
  return Math.max(30_000, Math.min(parsed, 3_600_000))
}

function parseE2BPort(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_PORT
  return Math.max(80, Math.min(parsed, 65_535))
}

function parseE2BMaxFiles(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_MAX_FILES
  return Math.max(10, Math.min(parsed, 20_000))
}

function parseE2BMaxFileSizeMb(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_MAX_FILE_SIZE_MB
  return Math.max(1, Math.min(parsed, 100))
}

function parseE2BUploadBatch(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_UPLOAD_BATCH
  return Math.max(10, Math.min(parsed, 1000))
}

function parseE2BInstallTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_INSTALL_TIMEOUT_MS
  return Math.max(30_000, Math.min(parsed, 900_000))
}

function resolveE2BWorkdir(raw: string | undefined): string {
  const value = String(raw ?? '').trim()
  if (!value) return DEFAULT_E2B_WORKDIR
  if (!value.startsWith('/')) return `/${value}`
  return value
}

type WorkspaceFileEntry = {
  absolutePath: string
  relativePath: string
  size: number
}

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.cache',
  '.idea',
  '.vscode',
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.aethel',
])

const SKIP_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
])

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.bmp',
  '.tiff',
  '.mp3',
  '.wav',
  '.ogg',
  '.mp4',
  '.mov',
  '.m4v',
  '.webm',
  '.glb',
  '.gltf',
  '.fbx',
  '.obj',
  '.usd',
  '.usdz',
  '.zip',
  '.gz',
  '.tar',
  '.wasm',
  '.bin',
])

function toPosixPath(input: string): string {
  return input.replace(/\\/g, '/')
}

function isBinaryFile(relativePath: string): boolean {
  const ext = path.extname(relativePath).toLowerCase()
  if (!ext) return false
  return BINARY_EXTENSIONS.has(ext)
}

async function collectWorkspaceFiles(params: {
  root: string
  maxFiles: number
  maxFileSizeBytes: number
}): Promise<WorkspaceFileEntry[]> {
  const results: WorkspaceFileEntry[] = []

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (results.length >= params.maxFiles) return
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        await walk(entryPath)
        continue
      }
      if (!entry.isFile()) continue
      if (SKIP_FILES.has(entry.name)) continue
      const stat = await fs.stat(entryPath).catch(() => null)
      if (!stat) continue
      if (stat.size > params.maxFileSizeBytes) continue
      const relativePath = toPosixPath(path.relative(params.root, entryPath))
      results.push({
        absolutePath: entryPath,
        relativePath,
        size: stat.size,
      })
    }
  }

  await walk(params.root)
  return results
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

async function syncWorkspaceToSandbox(params: {
  sandbox: any
  workspaceRoot: string
  workdir: string
  maxFiles: number
  maxFileSizeBytes: number
  batchSize: number
}) {
  const files = await collectWorkspaceFiles({
    root: params.workspaceRoot,
    maxFiles: params.maxFiles,
    maxFileSizeBytes: params.maxFileSizeBytes,
  })

  const entries = await Promise.all(
    files.map(async (file) => {
      const data = await fs.readFile(file.absolutePath)
      const isBinary = isBinaryFile(file.relativePath)
      const payload = isBinary ? bufferToArrayBuffer(data) : data.toString('utf8')
      const sandboxPath = toPosixPath(path.posix.join(params.workdir, file.relativePath))
      return {
        path: sandboxPath,
        data: payload,
        size: file.size,
      }
    })
  )

  let totalBytes = 0
  for (const entry of entries) totalBytes += entry.size

  for (let i = 0; i < entries.length; i += params.batchSize) {
    const batch = entries.slice(i, i + params.batchSize).map(({ path: filePath, data }) => ({
      path: filePath,
      data,
    }))
    await params.sandbox.files.writeFiles(batch)
  }

  return {
    filesCount: entries.length,
    totalBytes,
  }
}

async function startSandboxRuntime(params: {
  sandbox: any
  workdir: string
  port: number
  installTimeoutMs: number
}) {
  const packageJsonPath = path.posix.join(params.workdir, 'package.json')
  const indexHtmlPath = path.posix.join(params.workdir, 'index.html')
  const hasPackageJson = await params.sandbox.files.exists(packageJsonPath)
  if (hasPackageJson) {
    await params.sandbox.commands.run('npm install --no-audit --no-fund', {
      cwd: params.workdir,
      timeoutMs: params.installTimeoutMs,
    })
    await params.sandbox.commands.run(`npm run dev -- --hostname 0.0.0.0 --port ${params.port}`, {
      cwd: params.workdir,
      background: true,
    })
    return {
      mode: 'node-dev',
      command: 'npm run dev',
    }
  }

  const hasIndexHtml = await params.sandbox.files.exists(indexHtmlPath)
  if (hasIndexHtml) {
    await params.sandbox.commands.run(`python3 -m http.server ${params.port} --bind 0.0.0.0`, {
      cwd: params.workdir,
      background: true,
    })
    return {
      mode: 'static',
      command: 'python3 -m http.server',
    }
  }

  throw new Error('No package.json or index.html found in workspace.')
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

async function provisionWithE2B(params: {
  apiKey: string
  templateId: string
  port: number
  timeoutMs: number
  workspaceRoot: string
  workdir: string
  maxFiles: number
  maxFileSizeBytes: number
  uploadBatchSize: number
  installTimeoutMs: number
}): Promise<{
  runtimeUrl: string
  sandboxId: string
  host: string
  filesCount: number
  totalBytes: number
  startMode: string
}> {
  const module = await import('e2b')
  const Sandbox = (module as { default?: any; Sandbox?: any }).default || (module as { Sandbox?: any }).Sandbox
  if (!Sandbox) {
    throw new Error('E2B SDK not available')
  }
  const sandbox = await Sandbox.create(params.templateId, {
    apiKey: params.apiKey,
    timeoutMs: params.timeoutMs,
  })
  const syncResult = await syncWorkspaceToSandbox({
    sandbox,
    workspaceRoot: params.workspaceRoot,
    workdir: params.workdir,
    maxFiles: params.maxFiles,
    maxFileSizeBytes: params.maxFileSizeBytes,
    batchSize: params.uploadBatchSize,
  })
  const startResult = await startSandboxRuntime({
    sandbox,
    workdir: params.workdir,
    port: params.port,
    installTimeoutMs: params.installTimeoutMs,
  })
  const host = sandbox.getHost(params.port)
  return {
    runtimeUrl: `https://${host}`,
    sandboxId: sandbox.sandboxId || 'unknown',
    host,
    filesCount: syncResult.filesCount,
    totalBytes: syncResult.totalBytes,
    startMode: startResult.mode,
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

    const failures: ManagedProvisionAttempt[] = []
    let managedSuccess: ManagedProvisionSuccess | null = null
    let managedMetadata: Record<string, unknown> | null = null

    if (providerConfig?.id === 'e2b' && provisionEndpoints.length === 0) {
      const workspaceStat = await fs.stat(workspaceRoot).catch(() => null)
      if (!workspaceStat || !workspaceStat.isDirectory()) {
        return capabilityResponse({
          error: 'RUNTIME_PROVISION_FAILED',
          status: 503,
          message: 'Workspace root not found for E2B provisioning.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
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
          message: 'E2B provisioning requires E2B_API_KEY.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
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
          message: 'E2B provisioning requires AETHEL_PREVIEW_E2B_TEMPLATE.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
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
            message: 'E2B returned an invalid or blocked runtime URL.',
            capability: CAPABILITY,
            capabilityStatus: 'PARTIAL',
            metadata: {
              mode: 'managed',
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
          message: error instanceof Error ? error.message : 'E2B provision failed.',
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            mode: 'managed',
            provider: providerConfig?.id || 'e2b',
            projectId,
          },
        })
      }
    } else if (provisionEndpoints.length === 0) {
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

import path from 'node:path'
import fs from 'node:fs/promises'
import {
  DEFAULT_RUNTIME_CANDIDATES,
  discoverPreviewRuntime,
  normalizeRuntimeCandidate,
  probeRuntimeUrl,
} from '@/lib/server/preview-runtime'
import { parseConfiguredProvisionEndpoints } from '@/lib/server/preview-provider-config'
import { loadE2BModule, resolveE2BSandboxCtor, type E2BSandboxLike } from '@/lib/server/e2b-runtime'

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

export type ProvisionBody = {
  projectId?: unknown
}

export type ManagedProvisionAttempt = {
  endpoint: string
  status?: number
  error?: string
  mode: 'upstream_error' | 'invalid_runtime_url' | 'request_exception'
}

export type ManagedProvisionSuccess = {
  runtimeUrl: string
  endpoint: string
  attempt: number
  totalEndpoints: number
}

export function parseTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS
  return Math.max(1000, Math.min(parsed, 30_000))
}

export function parseProjectId(raw: unknown): string {
  if (typeof raw !== 'string') return 'default'
  const normalized = raw.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return normalized || 'default'
}

export function parseProvisionEndpoints(rawSingle: string, rawList: string): string[] {
  return parseConfiguredProvisionEndpoints(rawSingle, rawList)
}

export function parseReadyWaitMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_READY_WAIT_MS
  return Math.max(0, Math.min(parsed, 60_000))
}

export function parseReadyPollMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_READY_POLL_MS
  return Math.max(200, Math.min(parsed, 5_000))
}

export function parseE2BTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_TIMEOUT_MS
  return Math.max(30_000, Math.min(parsed, 3_600_000))
}

export function parseE2BPort(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_PORT
  return Math.max(80, Math.min(parsed, 65_535))
}

export function parseE2BMaxFiles(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_MAX_FILES
  return Math.max(10, Math.min(parsed, 20_000))
}

export function parseE2BMaxFileSizeMb(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_MAX_FILE_SIZE_MB
  return Math.max(1, Math.min(parsed, 100))
}

export function parseE2BUploadBatch(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_UPLOAD_BATCH
  return Math.max(10, Math.min(parsed, 1000))
}

export function parseE2BInstallTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_E2B_INSTALL_TIMEOUT_MS
  return Math.max(30_000, Math.min(parsed, 900_000))
}

export function resolveE2BWorkdir(raw: string | undefined): string {
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
  const view = new Uint8Array(buffer.byteLength)
  view.set(buffer)
  return view.buffer
}

async function syncWorkspaceToSandbox(params: {
  sandbox: E2BSandboxLike
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
  sandbox: E2BSandboxLike
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

export async function waitForRuntimeReady(runtimeUrl: string, waitBudgetMs: number, pollMs: number) {
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

export async function localFallbackDiscover() {
  const payload = await discoverPreviewRuntime(DEFAULT_RUNTIME_CANDIDATES, 1800)
  return payload.preferredRuntimeUrl
}

export async function callManagedProvisionEndpoint(params: {
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

export async function provisionWithE2B(params: {
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
  const e2bModule = await loadE2BModule()
  const Sandbox = resolveE2BSandboxCtor(e2bModule)
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

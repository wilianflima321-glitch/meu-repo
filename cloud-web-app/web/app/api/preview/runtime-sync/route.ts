import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { capabilityResponse } from '@/lib/server/capability-response'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_SYNC'
const DEFAULT_MAX_FILES = 2000
const DEFAULT_MAX_FILE_SIZE_MB = 5
const DEFAULT_UPLOAD_BATCH = 200

export const dynamic = 'force-dynamic'

type SyncBody = {
  projectId?: unknown
  sandboxId?: unknown
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

function parseProjectId(raw: unknown): string {
  if (typeof raw !== 'string') return 'default'
  const normalized = raw.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return normalized || 'default'
}

function parseSandboxId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

function parseMaxFiles(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_FILES
  return Math.max(10, Math.min(parsed, 20_000))
}

function parseMaxFileSizeMb(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_FILE_SIZE_MB
  return Math.max(1, Math.min(parsed, 100))
}

function parseUploadBatch(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_UPLOAD_BATCH
  return Math.max(10, Math.min(parsed, 1000))
}

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

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const body = (await request.json().catch(() => null)) as SyncBody | null
    const projectId = parseProjectId(body?.projectId)
    const sandboxId = parseSandboxId(body?.sandboxId)
    const e2bApiKey = String(process.env.E2B_API_KEY || '').trim()
    const workdir = String(process.env.AETHEL_PREVIEW_E2B_WORKDIR || '/workspace').trim() || '/workspace'
    const maxFiles = parseMaxFiles(process.env.AETHEL_PREVIEW_E2B_MAX_FILES)
    const maxFileSizeBytes = parseMaxFileSizeMb(process.env.AETHEL_PREVIEW_E2B_MAX_FILE_SIZE_MB) * 1024 * 1024
    const uploadBatch = parseUploadBatch(process.env.AETHEL_PREVIEW_E2B_UPLOAD_BATCH_SIZE)

    if (!sandboxId) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_MISSING_SANDBOX',
        status: 400,
        message: 'sandboxId is required for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId },
      })
    }
    if (!e2bApiKey) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_MISSING_API_KEY',
        status: 503,
        message: 'E2B_API_KEY is required for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId },
      })
    }

    const workspaceRoot = getScopedWorkspaceRoot(auth.userId, projectId)
    const workspaceStat = await fs.stat(workspaceRoot).catch(() => null)
    if (!workspaceStat || !workspaceStat.isDirectory()) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_WORKSPACE_NOT_FOUND',
        status: 404,
        message: 'Workspace root not found for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId, workspaceRoot },
      })
    }

    const module = await import('e2b')
    const Sandbox = (module as { default?: any; Sandbox?: any }).default || (module as { Sandbox?: any }).Sandbox
    if (!Sandbox) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_SDK_UNAVAILABLE',
        status: 503,
        message: 'E2B SDK not available.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId },
      })
    }

    const sandbox = await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
    const syncResult = await syncWorkspaceToSandbox({
      sandbox,
      workspaceRoot,
      workdir: workdir.startsWith('/') ? workdir : `/${workdir}`,
      maxFiles,
      maxFileSizeBytes,
      batchSize: uploadBatch,
    })

    return NextResponse.json(
      {
        success: true,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          projectId,
          sandboxId,
          workdir,
          filesCount: syncResult.filesCount,
          totalBytes: syncResult.totalBytes,
        },
      },
      {
        headers: {
          'x-aethel-capability': CAPABILITY,
          'x-aethel-capability-status': 'PARTIAL',
        },
      }
    )
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return capabilityResponse({
      error: 'RUNTIME_SYNC_FAILED',
      status: 503,
      message: error instanceof Error ? error.message : 'Runtime sync failed.',
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }
}

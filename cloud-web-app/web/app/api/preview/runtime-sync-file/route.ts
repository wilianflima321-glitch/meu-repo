import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { capabilityResponse } from '@/lib/server/capability-response'
import { getScopedWorkspaceRoot, resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_SYNC_FILE'
const DEFAULT_MAX_FILE_SIZE_MB = 5

export const dynamic = 'force-dynamic'

type SyncFileBody = {
  projectId?: unknown
  sandboxId?: unknown
  path?: unknown
}

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

function parsePath(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

function parseMaxFileSizeMb(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_FILE_SIZE_MB
  return Math.max(1, Math.min(parsed, 100))
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  if (!ext) return false
  return BINARY_EXTENSIONS.has(ext)
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const body = (await request.json().catch(() => null)) as SyncFileBody | null
    const projectId = parseProjectId(body?.projectId)
    const sandboxId = parseSandboxId(body?.sandboxId)
    const filePath = parsePath(body?.path)
    const e2bApiKey = String(process.env.E2B_API_KEY || '').trim()
    const workdirRaw = String(process.env.AETHEL_PREVIEW_E2B_WORKDIR || '/workspace').trim()
    const workdir = workdirRaw.startsWith('/') ? workdirRaw : `/${workdirRaw}`
    const maxFileSizeBytes = parseMaxFileSizeMb(process.env.AETHEL_PREVIEW_E2B_MAX_FILE_SIZE_MB) * 1024 * 1024

    if (!sandboxId) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_FILE_MISSING_SANDBOX',
        status: 400,
        message: 'sandboxId is required for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId },
      })
    }
    if (!filePath) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_FILE_MISSING_PATH',
        status: 400,
        message: 'path is required for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId },
      })
    }
    if (!e2bApiKey) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_FILE_MISSING_API_KEY',
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
        error: 'RUNTIME_SYNC_FILE_WORKSPACE_NOT_FOUND',
        status: 404,
        message: 'Workspace root not found for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId, workspaceRoot },
      })
    }

    const { absolutePath } = resolveScopedWorkspacePath({
      userId: auth.userId,
      projectId,
      requestedPath: filePath,
    })

    const stat = await fs.stat(absolutePath).catch(() => null)
    if (!stat || !stat.isFile()) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_FILE_NOT_FOUND',
        status: 404,
        message: 'File not found for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId, path: filePath },
      })
    }
    if (stat.size > maxFileSizeBytes) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_FILE_TOO_LARGE',
        status: 413,
        message: 'File exceeds max size for runtime sync.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId, path: filePath, size: stat.size, maxFileSizeBytes },
      })
    }

    const module = await import('e2b')
    const Sandbox = (module as { default?: any; Sandbox?: any }).default || (module as { Sandbox?: any }).Sandbox
    if (!Sandbox) {
      return capabilityResponse({
        error: 'RUNTIME_SYNC_FILE_SDK_UNAVAILABLE',
        status: 503,
        message: 'E2B SDK not available.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { projectId, sandboxId },
      })
    }

    const sandbox = await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
    const data = await fs.readFile(absolutePath)
    const payload = isBinaryFile(filePath) ? bufferToArrayBuffer(data) : data.toString('utf8')
    const relativePath = path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/')
    const sandboxPath = path.posix.join(workdir, relativePath)
    await sandbox.files.write(sandboxPath, payload)

    return NextResponse.json(
      {
        success: true,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          projectId,
          sandboxId,
          path: filePath,
          sandboxPath,
          size: stat.size,
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
      error: 'RUNTIME_SYNC_FILE_FAILED',
      status: 503,
      message: error instanceof Error ? error.message : 'Runtime sync failed.',
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { buildAppUrl } from '@/lib/server/app-origin'
import { getScopedProjectId, getScopedWorkspaceRoot, toVirtualWorkspacePath } from '@/lib/server/workspace-scope'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'ADMIN_AI_CORE_LOOP_PRODUCTION_PROBE'
const DEFAULT_RUNS = 6
const MAX_RUNS = 50
const MAX_SCAN_DEPTH = 5
const IGNORED_DIRS = new Set(['.git', '.next', 'node_modules', 'dist', 'build', '.turbo', '.vercel'])
const EXTENSION_PRIORITY = ['ts', 'tsx', 'js', 'jsx', 'md', 'json', 'css', 'html']

type ProbeBody = {
  runs?: unknown
  projectId?: unknown
}

type ProbeCandidate = {
  absolutePath: string
  virtualPath: string
}

function parseRuns(value: unknown): number {
  const parsed = typeof value === 'number' ? Math.floor(value) : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_RUNS
  return Math.max(1, Math.min(parsed, MAX_RUNS))
}

function scorePath(filePath: string): number {
  const ext = String(filePath.split('.').pop() || '').toLowerCase()
  const idx = EXTENSION_PRIORITY.indexOf(ext)
  return idx >= 0 ? idx : EXTENSION_PRIORITY.length + 1
}

function createProbeSuffix(filePath: string, runIndex: number): string {
  const ext = String(filePath.split('.').pop() || '').toLowerCase()
  const tag = `core-loop-production-probe-${runIndex + 1}`
  if (['ts', 'tsx', 'js', 'jsx', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'swift', 'kt'].includes(ext)) {
    return `\n// ${tag}\n`
  }
  if (['py', 'sh', 'rb', 'yml', 'yaml', 'toml', 'ini'].includes(ext)) {
    return `\n# ${tag}\n`
  }
  if (ext === 'md') return `\n<!-- ${tag} -->\n`
  return `\n/* ${tag} */\n`
}

async function scanProbeCandidates(root: string): Promise<ProbeCandidate[]> {
  const candidates: ProbeCandidate[] = []

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > MAX_SCAN_DEPTH) return
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        await walk(fullPath, depth + 1)
        continue
      }
      if (!entry.isFile()) continue
      const ext = String(entry.name.split('.').pop() || '').toLowerCase()
      if (!EXTENSION_PRIORITY.includes(ext)) continue
      candidates.push({
        absolutePath: fullPath,
        virtualPath: toVirtualWorkspacePath(fullPath, root),
      })
      if (candidates.length >= 200) return
    }
  }

  await walk(root, 0)
  return candidates.sort((a, b) => {
    const scoreA = scorePath(a.virtualPath)
    const scoreB = scorePath(b.virtualPath)
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.virtualPath.localeCompare(b.virtualPath)
  })
}

export const POST = withAdminAuth(async (request: NextRequest, { user }) => {
  const body = (await request.json().catch(() => null)) as ProbeBody | null
  const runs = parseRuns(body?.runs)
  const projectId = getScopedProjectId(request, body as unknown as Record<string, unknown>)
  const workspaceRoot = getScopedWorkspaceRoot(user.id, projectId)
  await fs.mkdir(workspaceRoot, { recursive: true })

  const candidates = await scanProbeCandidates(workspaceRoot)
  const selected = candidates[0]
  if (!selected) {
    return NextResponse.json(
      {
        error: 'PRODUCTION_PROBE_FILE_NOT_FOUND',
        message: 'No candidate file available in scoped workspace for production probe.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
      },
      {
        status: 404,
        headers: {
          'x-aethel-capability': CAPABILITY,
          'x-aethel-capability-status': 'PARTIAL',
        },
      }
    )
  }

  const original = await fs.readFile(selected.absolutePath, 'utf8').catch(() => '')
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'PRODUCTION_PROBE_AUTH_MISSING',
        message: 'Authorization header is required for delegated production probe apply calls.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
      },
      {
        status: 401,
        headers: {
          'x-aethel-capability': CAPABILITY,
          'x-aethel-capability-status': 'PARTIAL',
        },
      }
    )
  }

  const applyUrl = buildAppUrl('/api/ai/change/apply', request)
  let applySuccess = 0
  let applyBlocked = 0
  let applyFailed = 0
  const errors: string[] = []

  for (let index = 0; index < runs; index += 1) {
    const fullDocument = `${original}${createProbeSuffix(selected.virtualPath, index)}`
    try {
      const response = await fetch(applyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'x-project-id': projectId,
        },
        body: JSON.stringify({
          projectId,
          filePath: selected.virtualPath,
          original,
          fullDocument,
          executionMode: 'sandbox',
        }),
      })

      if (response.ok) {
        applySuccess += 1
        continue
      }

      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null
      const reason = payload?.error || payload?.message || `HTTP_${response.status}`
      if (
        reason.includes('APPROVAL_REQUIRED') ||
        reason.includes('FULL_ACCESS_GRANT_REQUIRED') ||
        reason.includes('VALIDATION_BLOCKED')
      ) {
        applyBlocked += 1
      } else {
        applyFailed += 1
      }
      errors.push(reason)
    } catch (error) {
      applyFailed += 1
      errors.push(error instanceof Error ? error.message : 'unknown_error')
    }
  }

  return NextResponse.json(
    {
      success: true,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      message: 'Production evidence probe executed.',
      metadata: {
        samplePolicy: 'production_only_for_promotion',
        runSource: 'production',
        projectId,
        selectedFile: selected.virtualPath,
        runs,
        totals: {
          applySuccess,
          applyBlocked,
          applyFailed,
        },
        errors: errors.slice(0, 12),
      },
    },
    {
      status: 200,
      headers: {
        'x-aethel-capability': CAPABILITY,
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:agents:config')

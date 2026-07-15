import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger';
import {
  acquireAgentSurfaceLocks,
  buildAgentSurfaceLockSnapshot,
  listActiveAgentSurfaceLocks,
  previewAgentSurfaceLockRequest,
  releaseAgentSurfaceLock,
  type AgentSurfaceLockSource,
} from '@/lib/production/agent-surface-locks'

const logger = createComponentLogger('api.projects.production-state.agent-locks')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

type AgentLockAction = 'preview' | 'acquire' | 'release'

const MAX_LOCK_PATHS = 100
const MIN_TTL_MS = 60_000
const MAX_TTL_MS = 60 * 60 * 1000
const DEFAULT_SOURCE: AgentSurfaceLockSource = 'session'

async function loadProjectForAgentLocks(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      userId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })
}

function canWriteAgentLocks(project: Awaited<ReturnType<typeof loadProjectForAgentLocks>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAgent(value: unknown): string {
  if (typeof value !== 'string') return 'Producer Agent'
  const trimmed = value.trim()
  return trimmed || 'Producer Agent'
}

function normalizePaths(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim())
    .filter(Boolean)
    .slice(0, MAX_LOCK_PATHS)
}

function normalizeAction(value: unknown): AgentLockAction {
  if (value === 'acquire' || value === 'release') return value
  return 'preview'
}

function normalizeSource(value: unknown): AgentSurfaceLockSource {
  if (value === 'tool' || value === 'session') return value
  return DEFAULT_SOURCE
}

function normalizeTtlMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(MIN_TTL_MS, Math.min(MAX_TTL_MS, Math.floor(value)))
}

function buildPayload(projectId: string) {
  const locks = listActiveAgentSurfaceLocks({ projectId })
  return {
    locks,
    snapshot: buildAgentSurfaceLockSnapshot({ projectId, locks }),
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAgentLocks(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(buildPayload(project.id))
  } catch (error) {
    logger.error('agent_locks.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAgentLocks(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as unknown
    const record = isRecord(body) ? body : {}
    const action = normalizeAction(record.action)
    const agent = normalizeAgent(record.agent)
    const paths = normalizePaths(record.paths)

    if (action === 'preview') {
      const decision = previewAgentSurfaceLockRequest({
        projectId: project.id,
        agent,
        ownerUserId: user.userId,
        paths,
      })

      return NextResponse.json({
        action,
        decision,
        ...buildPayload(project.id),
      })
    }

    if (!canWriteAgentLocks(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'release') {
      const lockId = typeof record.lockId === 'string' ? record.lockId.trim() : ''
      if (!lockId) {
        return NextResponse.json({ error: 'MISSING_LOCK_ID', message: 'release requires lockId.' }, { status: 400 })
      }

      releaseAgentSurfaceLock(lockId)
      const payload = buildPayload(project.id)

      logger.info('agent_locks.released', {
        userId: user.userId,
        projectId: project.id,
        lockId,
      })

      return NextResponse.json({
        action,
        released: true,
        lockId,
        ...payload,
      })
    }

    if (paths.length === 0) {
      return NextResponse.json({ error: 'MISSING_PATHS', message: 'acquire requires at least one path.' }, { status: 400 })
    }

    const decision = acquireAgentSurfaceLocks({
      projectId: project.id,
      agent,
      ownerUserId: user.userId,
      paths,
      source: normalizeSource(record.source),
      reason: typeof record.reason === 'string' && record.reason.trim() ? record.reason.trim() : 'agent-locks-api',
      runId: typeof record.runId === 'string' && record.runId.trim() ? record.runId.trim() : undefined,
      ttlMs: normalizeTtlMs(record.ttlMs),
    })
    const payload = buildPayload(project.id)

    if (!decision.allowed) {
      logger.warn('agent_locks.acquire_blocked', {
        userId: user.userId,
        projectId: project.id,
        agent,
        paths,
        conflicts: decision.metadata.conflicts,
      })

      return NextResponse.json(
        {
          action,
          decision,
          ...payload,
        },
        { status: decision.status }
      )
    }

    logger.info('agent_locks.acquired', {
      userId: user.userId,
      projectId: project.id,
      agent,
      lockId: decision.lock.id,
      paths: decision.lock.paths,
    })

    return NextResponse.json({
      action,
      decision,
      ...payload,
    })
  } catch (error) {
    logger.error('agent_locks.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

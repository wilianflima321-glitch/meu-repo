export type AgentSurfaceLockSource = 'apply' | 'tool' | 'session'

export interface AgentSurfaceLock {
  id: string
  projectId: string
  agent: string
  ownerUserId: string
  paths: string[]
  source: AgentSurfaceLockSource
  reason: string
  acquiredAt: string
  expiresAt: string
}

export type AgentSurfaceLockDecision =
  | {
      allowed: true
      lock: AgentSurfaceLock
      metadata: Record<string, unknown>
    }
  | {
      allowed: false
      code: 'AGENT_SURFACE_LOCKED'
      status: 423
      message: string
      metadata: Record<string, unknown>
    }

const DEFAULT_LOCK_TTL_MS = 15 * 60 * 1000
const locks = new Map<string, AgentSurfaceLock>()

function normalizePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

function lockKey(projectId: string, path: string): string {
  return `${projectId}:${normalizePath(path)}`
}

function isSameOrNestedPath(a: string, b: string): boolean {
  const left = normalizePath(a)
  const right = normalizePath(b)
  if (!left || !right) return false
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map(normalizePath).filter(Boolean)))
}

function nowIso(nowMs: number): string {
  return new Date(nowMs).toISOString()
}

function isExpired(lock: AgentSurfaceLock, nowMs: number): boolean {
  return Date.parse(lock.expiresAt) <= nowMs
}

function pruneExpiredLocks(nowMs: number): void {
  for (const [key, lock] of locks.entries()) {
    if (isExpired(lock, nowMs)) {
      locks.delete(key)
    }
  }
}

function findConflictingLocks(input: {
  projectId: string
  agent: string
  ownerUserId: string
  paths: string[]
  nowMs: number
}): AgentSurfaceLock[] {
  const conflicts = new Map<string, AgentSurfaceLock>()

  for (const lock of locks.values()) {
    if (lock.projectId !== input.projectId || isExpired(lock, input.nowMs)) continue
    const sameOwner = lock.agent === input.agent && lock.ownerUserId === input.ownerUserId
    if (sameOwner) continue
    if (lock.paths.some((lockedPath) => input.paths.some((path) => isSameOrNestedPath(lockedPath, path)))) {
      conflicts.set(lock.id, lock)
    }
  }

  return Array.from(conflicts.values())
}

export function acquireAgentSurfaceLocks(input: {
  projectId: string
  agent: string
  ownerUserId: string
  paths: string[]
  source: AgentSurfaceLockSource
  reason: string
  runId?: string
  now?: string
  ttlMs?: number
}): AgentSurfaceLockDecision {
  const paths = unique(input.paths)
  const nowMs = input.now ? Date.parse(input.now) : Date.now()
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now()
  pruneExpiredLocks(safeNowMs)

  if (paths.length === 0) {
    const lock: AgentSurfaceLock = {
      id: input.runId ?? `agent-lock-${safeNowMs.toString(36)}`,
      projectId: input.projectId,
      agent: input.agent,
      ownerUserId: input.ownerUserId,
      paths,
      source: input.source,
      reason: input.reason,
      acquiredAt: nowIso(safeNowMs),
      expiresAt: nowIso(safeNowMs + (input.ttlMs ?? DEFAULT_LOCK_TTL_MS)),
    }
    return { allowed: true, lock, metadata: { paths } }
  }

  const conflicts = findConflictingLocks({
    projectId: input.projectId,
    agent: input.agent,
    ownerUserId: input.ownerUserId,
    paths,
    nowMs: safeNowMs,
  })

  if (conflicts.length > 0) {
    return {
      allowed: false,
      code: 'AGENT_SURFACE_LOCKED',
      status: 423,
      message: 'Another agent already owns one of these surfaces. Review or wait for the lock before writing.',
      metadata: {
        projectId: input.projectId,
        agent: input.agent,
        paths,
        conflicts: conflicts.map((lock) => ({
          id: lock.id,
          agent: lock.agent,
          ownerUserId: lock.ownerUserId,
          paths: lock.paths,
          expiresAt: lock.expiresAt,
          source: lock.source,
        })),
      },
    }
  }

  const lock: AgentSurfaceLock = {
    id: input.runId ?? `agent-lock-${safeNowMs.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    agent: input.agent,
    ownerUserId: input.ownerUserId,
    paths,
    source: input.source,
    reason: input.reason,
    acquiredAt: nowIso(safeNowMs),
    expiresAt: nowIso(safeNowMs + (input.ttlMs ?? DEFAULT_LOCK_TTL_MS)),
  }

  for (const path of paths) {
    locks.set(lockKey(input.projectId, path), lock)
  }

  return {
    allowed: true,
    lock,
    metadata: {
      lockId: lock.id,
      expiresAt: lock.expiresAt,
      paths,
    },
  }
}

export function releaseAgentSurfaceLock(lockId: string): void {
  for (const [key, lock] of locks.entries()) {
    if (lock.id === lockId) {
      locks.delete(key)
    }
  }
}

export function listActiveAgentSurfaceLocks(input?: { projectId?: string; now?: string }): AgentSurfaceLock[] {
  const nowMs = input?.now ? Date.parse(input.now) : Date.now()
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now()
  pruneExpiredLocks(safeNowMs)

  const uniqueLocks = new Map<string, AgentSurfaceLock>()
  for (const lock of locks.values()) {
    if (input?.projectId && lock.projectId !== input.projectId) continue
    uniqueLocks.set(lock.id, lock)
  }

  return Array.from(uniqueLocks.values()).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
}

export function clearAgentSurfaceLocksForTests(): void {
  locks.clear()
}

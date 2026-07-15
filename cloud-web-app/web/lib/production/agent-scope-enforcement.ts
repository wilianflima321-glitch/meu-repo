import type { AgentHandoffPacket } from './agent-handoff-packet'

export type AgentScopeDecision =
  | {
      allowed: true
      enforcement: 'skipped' | 'passed'
      reason: string
      metadata: Record<string, unknown>
    }
  | {
      allowed: false
      code:
        | 'AGENT_SCOPE_MANIFEST_REQUIRED'
        | 'AGENT_SCOPE_STALE_MANIFEST'
        | 'AGENT_SCOPE_READ_ONLY'
        | 'AGENT_SCOPE_BLOCKED'
        | 'AGENT_SCOPE_OUTSIDE_OWNERSHIP'
      status: number
      message: string
      metadata: Record<string, unknown>
    }

export interface EvaluateAgentApplyScopeInput {
  packet: AgentHandoffPacket | null
  virtualPaths: string[]
  enforceAgentScope: boolean
  broadEdit: boolean
  pathModifiedAt?: Record<string, string | Date | null | undefined>
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

function isOwnedPath(path: string, ownedSurface: string): boolean {
  const normalizedPath = normalizePath(path)
  const normalizedSurface = normalizePath(ownedSurface)
  if (!normalizedPath || !normalizedSurface) return false
  if (normalizedPath === normalizedSurface) return true
  if (normalizedSurface.endsWith('/')) return normalizedPath.startsWith(normalizedSurface)
  return normalizedPath.startsWith(`${normalizedSurface}/`)
}

function toTime(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const time = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function normalizeModifiedAtMap(input: Record<string, string | Date | null | undefined> | undefined): Record<string, string | Date | null | undefined> {
  if (!input) return {}
  return Object.entries(input).reduce((acc, [path, value]) => {
    acc[normalizePath(path)] = value
    return acc
  }, {} as Record<string, string | Date | null | undefined>)
}

function findOwnedSurface(
  path: string,
  surfaces: AgentHandoffPacket['cartography']['ownedSurfaces']
): AgentHandoffPacket['cartography']['ownedSurfaces'][number] | null {
  const normalizedPath = normalizePath(path)
  return (
    surfaces
      .filter((surface) => isOwnedPath(normalizedPath, surface.path))
      .sort((a, b) => normalizePath(b.path).length - normalizePath(a.path).length)[0] ?? null
  )
}

export function evaluateAgentApplyScope({
  packet,
  virtualPaths,
  enforceAgentScope,
  broadEdit,
  pathModifiedAt,
}: EvaluateAgentApplyScopeInput): AgentScopeDecision {
  const paths = virtualPaths.map(normalizePath).filter(Boolean)
  const shouldEnforce = enforceAgentScope || broadEdit

  if (!shouldEnforce) {
    return {
      allowed: true,
      enforcement: 'skipped',
      reason: 'Single-file legacy apply without explicit agent scope.',
      metadata: { broadEdit, enforceAgentScope, paths },
    }
  }

  if (!packet || !packet.cartography.manifestId) {
    return {
      allowed: false,
      code: 'AGENT_SCOPE_MANIFEST_REQUIRED',
      status: 428,
      message: 'Broad or agent-scoped apply requires a fresh Repository Cartography manifest first.',
      metadata: { broadEdit, enforceAgentScope, paths },
    }
  }

  if (packet.status === 'blocked') {
    return {
      allowed: false,
      code: 'AGENT_SCOPE_BLOCKED',
      status: 423,
      message: 'Agent scope is blocked by the current handoff packet.',
      metadata: {
        agent: packet.agent,
        lane: packet.workContract.lane,
        scopeMode: packet.workContract.scopeLock.mode,
        blockers: packet.blockers,
        paths,
      },
    }
  }

  if (packet.workContract.scopeLock.mode === 'read-only') {
    return {
      allowed: false,
      code: 'AGENT_SCOPE_READ_ONLY',
      status: 423,
      message: 'Agent is in read-only planning mode and cannot apply changes yet.',
      metadata: {
        agent: packet.agent,
        lane: packet.workContract.lane,
        scopeMode: packet.workContract.scopeLock.mode,
        scopeRule: packet.workContract.scopeLock.rule,
        paths,
      },
    }
  }

  const ownedSurfaces = packet.workContract.scopeLock.surfaces.map(normalizePath).filter(Boolean)
  const outsideScope = paths.filter((path) => !ownedSurfaces.some((surface) => isOwnedPath(path, surface)))
  if (outsideScope.length > 0) {
    return {
      allowed: false,
      code: 'AGENT_SCOPE_OUTSIDE_OWNERSHIP',
      status: 409,
      message: 'Agent apply is outside declared Repository Cartography ownership.',
      metadata: {
        agent: packet.agent,
        lane: packet.workContract.lane,
        scopeMode: packet.workContract.scopeLock.mode,
        ownedSurfaces,
        outsideScope,
        paths,
      },
    }
  }

  const manifestGeneratedAt = toTime(packet.cartography.manifestGeneratedAt)
  if (manifestGeneratedAt) {
    const modifiedAtMap = normalizeModifiedAtMap(pathModifiedAt)
    const stalePaths = paths
      .map((path) => {
        const ownedSurface = findOwnedSurface(path, packet.cartography.ownedSurfaces)
        const modifiedAt = toTime(modifiedAtMap[path] ?? ownedSurface?.lastModified)
        return modifiedAt && modifiedAt > manifestGeneratedAt + 1_000
          ? {
              path,
              modifiedAt: new Date(modifiedAt).toISOString(),
              manifestGeneratedAt: new Date(manifestGeneratedAt).toISOString(),
            }
          : null
      })
      .filter((item): item is { path: string; modifiedAt: string; manifestGeneratedAt: string } => Boolean(item))

    if (stalePaths.length > 0) {
      return {
        allowed: false,
        code: 'AGENT_SCOPE_STALE_MANIFEST',
        status: 409,
        message: 'Repository Cartography is stale for this surface. Rescan context before agent apply.',
        metadata: {
          agent: packet.agent,
          lane: packet.workContract.lane,
          manifestId: packet.cartography.manifestId,
          stalePaths,
          paths,
        },
      }
    }
  }

  return {
    allowed: true,
    enforcement: 'passed',
    reason: 'Agent apply stayed inside declared Repository Cartography ownership.',
    metadata: {
      agent: packet.agent,
      status: packet.status,
      lane: packet.workContract.lane,
      scopeMode: packet.workContract.scopeLock.mode,
      manifestId: packet.cartography.manifestId,
      paths,
    },
  }
}

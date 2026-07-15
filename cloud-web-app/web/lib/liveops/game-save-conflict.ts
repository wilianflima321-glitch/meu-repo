/**
 * F.1 — GameSave conflict policy helpers (pure, client-safe).
 * Durable authority uses these for upsert decisions; Vitest covers all branches.
 */

export type GameSaveConflictPolicy =
  | 'last_write_wins'
  | 'server_wins'
  | 'client_wins'
  | 'reject_conflict'

export type GameSaveConflictAction = 'accept' | 'keep_server' | 'conflict'

export interface GameSaveConflictSide {
  checksum: string
  revisedAt: string
  revision: number
}

export interface GameSaveConflictDecision {
  action: GameSaveConflictAction
  reason: string
  policy: GameSaveConflictPolicy
  winner?: 'incoming' | 'server'
}

function parseRevisedAtMs(iso: string): number {
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

/**
 * Resolve whether an incoming write should replace the durable server record.
 * Same checksum → idempotent accept (no conflict).
 * `reject_conflict` requires explicit client resolve when checksums differ.
 */
export function resolveGameSaveConflict(input: {
  server: GameSaveConflictSide | null
  incoming: GameSaveConflictSide
  policy?: GameSaveConflictPolicy
}): GameSaveConflictDecision {
  const policy = input.policy ?? 'last_write_wins'
  const server = input.server
  const incoming = input.incoming

  if (!server) {
    return {
      action: 'accept',
      reason: 'no_server_record',
      policy,
      winner: 'incoming',
    }
  }

  if (server.checksum === incoming.checksum) {
    return {
      action: 'accept',
      reason: 'idempotent_same_checksum',
      policy,
      winner: 'incoming',
    }
  }

  if (incoming.revision > server.revision) {
    if (policy === 'server_wins') {
      return {
        action: 'keep_server',
        reason: 'server_wins_policy',
        policy,
        winner: 'server',
      }
    }
    if (policy === 'reject_conflict') {
      return {
        action: 'conflict',
        reason: 'checksum_mismatch_reject',
        policy,
      }
    }
    return {
      action: 'accept',
      reason: 'incoming_revision_ahead',
      policy,
      winner: 'incoming',
    }
  }

  if (incoming.revision < server.revision) {
    if (policy === 'client_wins') {
      return {
        action: 'accept',
        reason: 'client_wins_policy',
        policy,
        winner: 'incoming',
      }
    }
    if (policy === 'reject_conflict') {
      return {
        action: 'conflict',
        reason: 'revision_behind_reject',
        policy,
      }
    }
    if (policy === 'last_write_wins') {
      const incomingMs = parseRevisedAtMs(incoming.revisedAt)
      const serverMs = parseRevisedAtMs(server.revisedAt)
      if (incomingMs > serverMs) {
        return {
          action: 'accept',
          reason: 'last_write_wins_clock',
          policy,
          winner: 'incoming',
        }
      }
      return {
        action: 'keep_server',
        reason: 'last_write_wins_server_newer',
        policy,
        winner: 'server',
      }
    }
    return {
      action: 'keep_server',
      reason: 'server_revision_ahead',
      policy,
      winner: 'server',
    }
  }

  // Same revision, different checksum → concurrent write
  if (policy === 'client_wins') {
    return {
      action: 'accept',
      reason: 'client_wins_same_revision',
      policy,
      winner: 'incoming',
    }
  }
  if (policy === 'server_wins') {
    return {
      action: 'keep_server',
      reason: 'server_wins_same_revision',
      policy,
      winner: 'server',
    }
  }
  if (policy === 'last_write_wins') {
    const incomingMs = parseRevisedAtMs(incoming.revisedAt)
    const serverMs = parseRevisedAtMs(server.revisedAt)
    if (incomingMs > serverMs) {
      return {
        action: 'accept',
        reason: 'last_write_wins_same_revision',
        policy,
        winner: 'incoming',
      }
    }
    if (incomingMs < serverMs) {
      return {
        action: 'keep_server',
        reason: 'last_write_wins_same_revision_server',
        policy,
        winner: 'server',
      }
    }
  }

  return {
    action: 'conflict',
    reason: 'concurrent_checksum_mismatch',
    policy,
  }
}

export function isValidGameSaveConflictPolicy(
  value: unknown,
): value is GameSaveConflictPolicy {
  return (
    value === 'last_write_wins' ||
    value === 'server_wins' ||
    value === 'client_wins' ||
    value === 'reject_conflict'
  )
}

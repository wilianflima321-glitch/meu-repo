/**
 * F.2 — Anonymous Arcade playtime → authenticated ledger handoff.
 *
 * Guest sessions spool `session_playtime_seconds` in TelemetrySpool (IndexedDB).
 * Ingest requires auth (401 leaves rows unsynced — Law II). On login / when a
 * session identity becomes available, flush unsynced events into the
 * authenticated user's PlayerGameStats. No anonymous server ledger / PII theater.
 */

import { flushPlaytimeSpool, type PlaytimeFlushResult } from '@/lib/liveops/playtime-client'
import type { TelemetrySpool } from '@/lib/liveops/telemetry-spool'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('playtime-auth-handoff')

export type PlaytimeAuthHandoffResult = PlaytimeFlushResult & {
  attempted: boolean
  reason?: string
}

let inFlight: Promise<PlaytimeAuthHandoffResult> | null = null

/**
 * Flush unsynced F.2 playtime into the authenticated user ledger.
 * Uses cookie and/or Bearer — empty spool / 401 leave rows unsynced (Law II).
 * Safe to call multiple times; coalesces concurrent calls (unless a test spool is supplied).
 */
export async function handoffAnonymousPlaytimeAfterAuth(input?: {
  spool?: TelemetrySpool
  fetchImpl?: typeof fetch
  endpoint?: string
  limit?: number
}): Promise<PlaytimeAuthHandoffResult> {
  const run = async (): Promise<PlaytimeAuthHandoffResult> => {
    const flush = await flushPlaytimeSpool({
      spool: input?.spool,
      endpoint: input?.endpoint,
      limit: input?.limit,
      fetchImpl: input?.fetchImpl,
    })
    const result: PlaytimeAuthHandoffResult = {
      attempted: true,
      ...flush,
      reason: flush.ok
        ? flush.marked > 0
          ? 'MERGED'
          : 'EMPTY_OR_ALREADY_SYNCED'
        : flush.error === 'HTTP_401'
          ? 'UNAUTHENTICATED'
          : flush.error ?? 'FLUSH_FAILED',
    }
    log.info('playtime_auth_handoff', {
      marked: result.marked,
      flushed: result.flushed,
      rejected: result.rejected,
      ok: result.ok,
      reason: result.reason,
    })
    return result
  }

  // Test / explicit spool bypasses global in-flight coalesce so suites stay isolated.
  if (input?.spool) return run()

  if (inFlight) return inFlight
  inFlight = run().finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Fire-and-forget handoff after login/register (does not block navigation). */
export function schedulePlaytimeAuthHandoff(): void {
  if (typeof window === 'undefined') return
  void handoffAnonymousPlaytimeAfterAuth().catch((err) => {
    log.warn('playtime_auth_handoff_schedule_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  })
}

/**
 * Client helper — enqueue session_playtime_seconds into TelemetrySpool and flush to ingest.
 */

import { authHeaders } from '@/lib/auth'
import {
  getDefaultTelemetrySpool,
  SESSION_PLAYTIME_EVENT,
  type TelemetrySpool,
  type TelemetrySpoolRecord,
} from '@/lib/liveops/telemetry-spool'

export interface PlaytimeFlushResult {
  flushed: number
  marked: number
  rejected: number
  ok: boolean
  error?: string
}

export async function enqueueSessionPlaytime(input: {
  gameId: string
  sessionId: string
  deltaSeconds: number
  spool?: TelemetrySpool
}): Promise<TelemetrySpoolRecord> {
  const spool = input.spool ?? getDefaultTelemetrySpool()
  const delta = Math.floor(Number(input.deltaSeconds))
  if (!input.gameId?.trim() || !input.sessionId?.trim() || !Number.isFinite(delta) || delta <= 0) {
    throw new Error('PLAYTIME_ENQUEUE_INVALID')
  }
  return spool.enqueue({
    event: SESSION_PLAYTIME_EVENT,
    gameId: input.gameId.trim(),
    sessionId: input.sessionId.trim(),
    payload: { deltaSeconds: delta },
  })
}

export async function flushPlaytimeSpool(input: {
  spool?: TelemetrySpool
  endpoint?: string
  limit?: number
  fetchImpl?: typeof fetch
}): Promise<PlaytimeFlushResult> {
  const spool = input.spool ?? getDefaultTelemetrySpool()
  const endpoint = input.endpoint ?? '/api/liveops/playtime'
  const fetchImpl = input.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined)
  if (!fetchImpl) {
    return { flushed: 0, marked: 0, rejected: 0, ok: false, error: 'FETCH_UNAVAILABLE' }
  }

  const batch = await spool.peekUnsynced(input.limit ?? 100)
  const playtime = batch.filter((r) => r.event === SESSION_PLAYTIME_EVENT)
  if (!playtime.length) {
    return { flushed: 0, marked: 0, rejected: 0, ok: true }
  }

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      // Cookie + Bearer (F.2 durable ingest) — anonymous 401 leaves rows unsynced (Law II).
      // After login, handoffAnonymousPlaytimeAfterAuth flushes remaining rows into the user ledger.
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        events: playtime.map((r) => ({
          id: r.id,
          event: r.event,
          gameId: r.gameId,
          sessionId: r.sessionId,
          ts: r.ts,
          deltaSeconds: Number(r.payload.deltaSeconds ?? 0),
        })),
      }),
    })
    if (!res.ok) {
      return {
        flushed: playtime.length,
        marked: 0,
        rejected: playtime.length,
        ok: false,
        error: `HTTP_${res.status}`,
      }
    }
    const body = (await res.json()) as {
      acceptedIds?: string[]
      rejected?: number
    }
    const accepted = body.acceptedIds ?? []
    const marked = await spool.markSynced(accepted)
    return {
      flushed: playtime.length,
      marked,
      rejected: body.rejected ?? Math.max(0, playtime.length - accepted.length),
      ok: true,
    }
  } catch (err) {
    // Offline / network — leave unsynced (Law II store-and-forward)
    return {
      flushed: playtime.length,
      marked: 0,
      rejected: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

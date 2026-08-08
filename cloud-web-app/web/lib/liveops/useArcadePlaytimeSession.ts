/**
 * F.2 — Arcade runtime playtime emission.
 * Ticks real session deltas into TelemetrySpool and flushes to /api/liveops/playtime.
 * Unauthenticated / offline flushes leave rows unsynced (Law II store-and-forward).
 * On auth (token present), flushes unsynced guest events into the user ledger.
 * Never invents playtime counters — only wall-clock while the session is active.
 */

'use client'

import { useEffect, useRef } from 'react'

import { handoffAnonymousPlaytimeAfterAuth } from '@/lib/liveops/playtime-auth-handoff'
import {
  enqueueSessionPlaytime,
  flushPlaytimeSpool,
} from '@/lib/liveops/playtime-client'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('useArcadePlaytimeSession')

/** Wall-clock sample cadence while Arcade iframe is playing. */
export const ARCADE_PLAYTIME_TICK_MS = 30_000

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `arcade_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function emitDelta(input: {
  gameId: string
  sessionId: string
  deltaSeconds: number
}): Promise<void> {
  const delta = Math.floor(input.deltaSeconds)
  if (!input.gameId || !input.sessionId || delta <= 0) return
  try {
    await enqueueSessionPlaytime({
      gameId: input.gameId,
      sessionId: input.sessionId,
      deltaSeconds: delta,
    })
    const flush = await flushPlaytimeSpool({})
    if (!flush.ok) {
      log.info('arcade_playtime_flush_deferred', {
        gameId: input.gameId,
        error: flush.error,
        flushed: flush.flushed,
        marked: flush.marked,
      })
    }
  } catch (err) {
    log.warn('arcade_playtime_emit_failed', {
      gameId: input.gameId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * While `active`, samples wall-clock playtime for `gameId` and spools/flushes F.2 events.
 * Also attempts anon→auth handoff whenever a token is present (OAuth return / late login).
 */
export function useArcadePlaytimeSession(input: {
  gameId: string | null | undefined
  active: boolean
  tickMs?: number
}): void {
  const gameId = input.gameId?.trim() || ''
  const active = input.active === true && Boolean(gameId)
  const tickMs = input.tickMs ?? ARCADE_PLAYTIME_TICK_MS

  const sessionIdRef = useRef<string>('')
  const lastSampleRef = useRef<number>(0)

  // Cookie/Bearer may appear after OAuth redirect — attempt guest spool merge once per mount.
  useEffect(() => {
    void handoffAnonymousPlaytimeAfterAuth()
  }, [])

  useEffect(() => {
    if (!active) {
      sessionIdRef.current = ''
      lastSampleRef.current = 0
      return
    }

    sessionIdRef.current = newSessionId()
    lastSampleRef.current = Date.now()

    const sample = () => {
      const now = Date.now()
      const prev = lastSampleRef.current
      lastSampleRef.current = now
      const deltaSeconds = Math.floor((now - prev) / 1000)
      if (deltaSeconds <= 0) return
      void emitDelta({
        gameId,
        sessionId: sessionIdRef.current,
        deltaSeconds,
      })
    }

    const timer = window.setInterval(sample, tickMs)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') sample()
    }
    const onPageHide = () => sample()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    log.info('arcade_playtime_session_started', {
      gameId,
      sessionId: sessionIdRef.current,
      tickMs,
    })

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      sample()
      log.info('arcade_playtime_session_stopped', {
        gameId,
        sessionId: sessionIdRef.current,
      })
      sessionIdRef.current = ''
      lastSampleRef.current = 0
    }
  }, [active, gameId, tickMs])
}

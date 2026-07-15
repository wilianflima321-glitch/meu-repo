import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import { SESSION_PLAYTIME_EVENT } from '@/lib/liveops/telemetry-spool'
import {
  getPlayerGameStats,
  listPlayerGameStatsForUser,
  recordSessionPlaytime,
} from '@/lib/liveops/player-playtime-authority'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/liveops/playtime/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'LIVEOPS_PLAYTIME_INGEST'
const MAX_BATCH = 100

type PlaytimeEventBody = {
  id?: string
  event?: string
  gameId?: string | null
  sessionId?: string
  ts?: string
  deltaSeconds?: number
}

/**
 * F.2 — durable player playtime ingest (TelemetrySpool flush target).
 * POST batch of session_playtime_seconds → PlayerGameStats authority.
 * GET stats for authenticated user (+ optional gameId).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req)
    const userId = auth?.userId
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
        },
        { status: 401 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const events: PlaytimeEventBody[] = Array.isArray(body?.events)
      ? body.events
      : body?.event || body?.deltaSeconds
        ? [body as PlaytimeEventBody]
        : []

    if (!events.length) {
      return NextResponse.json(
        {
          error: 'PLAYTIME_EVENTS_REQUIRED',
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
        },
        { status: 400 },
      )
    }
    if (events.length > MAX_BATCH) {
      return NextResponse.json(
        {
          error: 'PLAYTIME_BATCH_TOO_LARGE',
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
          maxBatch: MAX_BATCH,
        },
        { status: 413 },
      )
    }

    const acceptedIds: string[] = []
    const rejected: Array<{ id?: string; code: string }> = []
    const statsByGame = new Map<string, Awaited<ReturnType<typeof recordSessionPlaytime>>>()

    for (const event of events) {
      const id = typeof event.id === 'string' ? event.id : undefined
      const name = event.event ?? SESSION_PLAYTIME_EVENT
      if (name !== SESSION_PLAYTIME_EVENT) {
        rejected.push({ id, code: 'EVENT_NOT_PLAYTIME' })
        continue
      }
      const gameId = String(event.gameId || '').trim()
      const delta = Math.floor(Number(event.deltaSeconds))
      if (!gameId || !Number.isFinite(delta) || delta <= 0) {
        rejected.push({ id, code: 'PLAYTIME_DELTA_INVALID' })
        continue
      }
      try {
        const stats = await recordSessionPlaytime({
          userId,
          gameId,
          deltaSeconds: delta,
          sessionId: event.sessionId,
          playedAt: event.ts,
        })
        statsByGame.set(gameId, stats)
        if (id) acceptedIds.push(id)
        else acceptedIds.push(`anon_${acceptedIds.length}`)
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code?: string }).code)
            : 'PLAYTIME_PERSIST_FAILED'
        rejected.push({ id, code })
      }
    }

    log.info('playtime_ingest', {
      userId,
      accepted: acceptedIds.length,
      rejected: rejected.length,
    })

    return NextResponse.json({
      success: rejected.length === 0,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      accepted: acceptedIds.length,
      rejected: rejected.length,
      acceptedIds,
      rejectedEvents: rejected.length ? rejected : undefined,
      stats: [...statsByGame.values()],
    })
  } catch (error) {
    log.error('playtime_ingest_failed', { error })
    return NextResponse.json(
      {
        error: 'PLAYTIME_INGEST_FAILED',
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gameId = req.nextUrl.searchParams.get('gameId')?.trim()
  if (gameId) {
    const stats = await getPlayerGameStats(auth.userId, gameId)
    return NextResponse.json({
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      stats,
    })
  }

  const list = await listPlayerGameStatsForUser(auth.userId)
  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    stats: list,
  })
}

/**
 * AI-v1-g / J.10 — duplex WebRTC realtime session endpoint.
 * Honesty: full-duplex WebRTC room remains [HELD].
 * Shipped CORE path is push-to-talk → POST /api/agents/live-voice/direction.
 * This route fail-closes with HELD payload (no fake LIVE room without CostGuard).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  LIVE_VOICE_CORE_LANE,
  LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  LIVE_VOICE_HONESTY,
} from '@/lib/production/live-voice-operator'
import { AI_CORE_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'

const log = createComponentLogger('api/ai/voice/realtime-session')

export async function POST(req: NextRequest) {
  const rateLimited = enforceAiCoreRateLimit({
    req,
    capability: 'ai.voice.realtime-session',
    route: '/api/ai/voice/realtime-session',
    config: AI_CORE_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited

  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  log.info('realtime_session_held', {
    userId: user.userId,
    duplex: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  })

  return NextResponse.json(
    {
      error: 'VOICE_DUPLEX_WEBRTC_HELD',
      message: LIVE_VOICE_HONESTY.duplexWebRtcHeld,
      capabilityStatus: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
      duplexWebRtcStatus: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
      executionLane: LIVE_VOICE_CORE_LANE,
      honesty: LIVE_VOICE_HONESTY,
      nextAction: 'POST /api/agents/live-voice/direction (CostGuard metered push-to-talk)',
    },
    { status: 503 },
  )
}

export async function GET() {
  return NextResponse.json({
    capability: 'ai.voice.realtime-session',
    duplexWebRtcStatus: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
    executionLane: LIVE_VOICE_CORE_LANE,
    honesty: LIVE_VOICE_HONESTY,
  })
}

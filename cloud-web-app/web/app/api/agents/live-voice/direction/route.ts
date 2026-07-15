/**
 * AI-v1-g / J.10 — POST governed LiveVoice direction turn.
 * CostGuard via CreativeBridge; audible generate→play; duplex WebRTC remains HELD.
 */

import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { createMemoryCostGuardLedger } from '@/lib/production/creative-cost-guard'
import {
  LIVE_VOICE_CORE_LANE,
  LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  LIVE_VOICE_HONESTY,
  runLiveVoiceDirectionTurn,
} from '@/lib/production/live-voice-operator'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = createComponentLogger('api/agents/live-voice/direction')

/** In-process ledger for session demos without live wallet wire — fail-closed still applies via planId. */
const demoLedger = createMemoryCostGuardLedger()

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string
      directionText?: string
      voiceId?: string
      sessionId?: string
      planId?: string
      byokProfileId?: string
      claimFullDuplexWebRtcLive?: boolean
      claimFakeWebRtcRoomLive?: boolean
    }

    const projectId = body.projectId?.trim()
    const directionText = body.directionText?.trim()

    if (!projectId || !directionText) {
      return NextResponse.json(
        { error: 'projectId and directionText are required' },
        { status: 400 },
      )
    }

    demoLedger.grant(user.userId, 100_000)

    const result = await runLiveVoiceDirectionTurn({
      projectId,
      userId: user.userId,
      directionText,
      voiceId: body.voiceId,
      sessionId: body.sessionId,
      planId: body.planId ?? 'pro',
      byokProfileId: body.byokProfileId,
      adapter: demoLedger,
      claimFullDuplexWebRtcLive: body.claimFullDuplexWebRtcLive,
      claimFakeWebRtcRoomLive: body.claimFakeWebRtcRoomLive,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          blockedReason: result.blockedReason,
          message: result.message,
          honesty: result.honesty,
          duplexWebRtcStatus: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
          executionLane: LIVE_VOICE_CORE_LANE,
        },
        { status: result.blockedReason === 'cost_guard' ? 402 : 422 },
      )
    }

    return NextResponse.json({
      success: true,
      turn: {
        sessionId: result.turn.sessionId,
        turnId: result.turn.turnId,
        directionText: result.turn.directionText,
        executionLane: result.turn.executionLane,
        duplexWebRtcStatus: result.turn.duplexWebRtcStatus,
        playbackSource: result.turn.playbackSource,
        waveform: result.turn.waveform,
        lipsync: result.turn.lipsync,
        pcmBase64: result.turn.pcmBase64,
        mimeHint: result.turn.mimeHint,
      },
      artifactId: result.artifactId,
      evidenceReceiptId: result.evidenceReceiptId,
      honesty: result.honesty,
      duplexWebRtcStatus: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
      executionLane: LIVE_VOICE_CORE_LANE,
      evidenceKinds: result.ledger.events.map((e) => e.kind),
    })
  } catch (error) {
    log.error('live_voice_direction_failed', error instanceof Error ? error : new Error(String(error)))
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to run LiveVoice direction turn')
  }
}

export async function GET() {
  return NextResponse.json({
    capability: 'live-voice-direction',
    executionLane: LIVE_VOICE_CORE_LANE,
    duplexWebRtcStatus: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
    honesty: LIVE_VOICE_HONESTY,
  })
}

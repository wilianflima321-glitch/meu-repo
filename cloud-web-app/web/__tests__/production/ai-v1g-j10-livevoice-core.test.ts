/**
 * AI-v1-g — J.10 LiveVoice CORE
 * Governed push-to-talk / generate→play + CostGuard + ledger.
 * Full-duplex WebRTC remains HELD.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
} from '@/lib/production/creative-cost-guard'
import {
  __resetLiveVoiceOperatorForTests,
  LIVE_VOICE_CORE_LANE,
  LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  LIVE_VOICE_HONESTY,
  buildLiveVoiceWaveformAndLipsync,
  estimateLiveVoiceTurnTokenWeight,
  evaluateLiveVoiceShipClaim,
  runLiveVoiceDirectionTurn,
  synthesizeFormantLiveVoicePcm,
} from '@/lib/production/live-voice-operator'
import {
  dispatchNexusSquad,
  resolveNexusCreativeOperatorHint,
} from '@/lib/production/nexus-squad-dispatch'

describe('AI-v1-g J.10 LiveVoice CORE', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetLiveVoiceOperatorForTests()
  })

  it('commits audible direction turn via Bridge + ledger (waveform + lipsync)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const result = await runLiveVoiceDirectionTurn({
      projectId: 'proj-j10',
      userId: 'u1',
      directionText: 'Director: tighten the camera push on the boss intro beat.',
      planId: 'pro',
      adapter,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.turn.executionLane).toBe(LIVE_VOICE_CORE_LANE)
    expect(result.turn.duplexWebRtcStatus).toBe('HELD')
    expect(result.turn.waveform.rms).toBeGreaterThan(0.012)
    expect(result.turn.waveform.peaks.length).toBeGreaterThan(0)
    expect(result.turn.lipsync.length).toBeGreaterThan(0)
    expect(result.turn.pcmBase64.length).toBeGreaterThan(64)
    expect(result.ledger.events.some((e) => e.kind === 'artifact')).toBe(true)
    expect(result.ledger.events.some((e) => e.kind === 'cost' || e.kind === 'validation')).toBe(true)
    expect(result.honesty.productLabel).toBe(LIVE_VOICE_HONESTY.productLabel)
    expect(LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS).toBe('HELD')
  })

  it('fail-closed on CostGuard free tier without BYOK', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const result = await runLiveVoiceDirectionTurn({
      projectId: 'proj-j10',
      userId: 'u1',
      directionText: 'Say the player name with conviction.',
      planId: 'free',
      adapter,
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.blockedReason).toBe('cost_guard')
  })

  it('rejects fake duplex WebRTC LIVE claims', () => {
    const duplex = evaluateLiveVoiceShipClaim({ claimFullDuplexWebRtcLive: true })
    expect(duplex.allowed).toBe(false)
    expect(duplex.reason).toBe('duplex_webrtc_held')
    expect(duplex.message).toBe(LIVE_VOICE_HONESTY.duplexWebRtcHeld)

    const fakeRoom = evaluateLiveVoiceShipClaim({ claimFakeWebRtcRoomLive: true })
    expect(fakeRoom.allowed).toBe(false)
    expect(fakeRoom.reason).toBe('duplex_webrtc_held')
  })

  it('rejects claimFullDuplexWebRtcLive on direction path', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const result = await runLiveVoiceDirectionTurn({
      projectId: 'proj-j10',
      userId: 'u1',
      directionText: 'Live voice direction turn',
      planId: 'pro',
      adapter,
      claimFullDuplexWebRtcLive: true,
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.blockedReason).toBe('duplex_webrtc_held')
  })

  it('formant synth + waveform builder never ship silence', () => {
    const synth = synthesizeFormantLiveVoicePcm('Hello Aethel LiveVoice', 44100)
    expect(synth.playbackSource).toBe('formant-synth')
    const { waveform, lipsync } = buildLiveVoiceWaveformAndLipsync(synth.samples, synth.sampleRate)
    expect(waveform.rms).toBeGreaterThan(0.012)
    expect(lipsync.some((f) => f.energy > 0.01)).toBe(true)
    expect(estimateLiveVoiceTurnTokenWeight('Hello')).toBeGreaterThanOrEqual(200)
  })

  it('prefers Bridge TTS when synthesizer returns audible PCM', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const formant = synthesizeFormantLiveVoicePcm('Bridge path speech', 44100)

    const result = await runLiveVoiceDirectionTurn({
      projectId: 'proj-j10',
      userId: 'u1',
      directionText: 'Bridge path speech',
      planId: 'pro',
      adapter,
      bridgeSynthesizer: async () => ({
        samples: formant.samples,
        sampleRate: 44100,
        playbackSource: 'bridge-tts',
        providerId: 'test-bridge-tts',
      }),
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.turn.playbackSource).toBe('bridge-tts')
  })

  it('Nexus dispatch routes LiveVoice missions to live-voice hint', () => {
    const hint = resolveNexusCreativeOperatorHint(
      'Run LiveVoice push-to-talk direction for the cinematic beat',
    )
    expect(hint.kind).toBe('live-voice')

    const squad = dispatchNexusSquad({
      missionId: 'm-j10',
      maestroModelId: 'test',
      planId: 'pro',
      userPrompt: 'Governed LiveVoice generate-play turn with waveform and CostGuard',
      targetFilePath: 'cinematics/boss-intro.md',
    })
    expect(squad.creativeOperator.kind).toBe('live-voice')
    expect(squad.maestro.criticalTask.successCriteria).toContain('CostGuard settle')
    expect(
      squad.maestro.criticalTask.successCriteria.some((c) => /WebRTC.*HELD|duplex.*HELD/i.test(c)),
    ).toBe(true)
  })
})

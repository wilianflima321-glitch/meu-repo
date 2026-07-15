/**
 * AI-v1-g / J.10 — LiveVoice CORE
 * Governed direction path: push-to-talk / generate→play via Bridge TTS or
 * audible formant fill + waveform + lipsync energy → CostGuard → evidence ledger.
 *
 * Honesty: full-duplex WebRTC / continuous mic streaming remains [HELD].
 * Do not market a fake WebRTC room as LIVE.
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  assertAudibleVoiceBuffer,
  fillVoiceWaveform,
  measureChannelRms,
  VOICE_AUDIBLE_RMS_MIN,
} from '@/lib/audio/voice-waveform'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'

const log = createComponentLogger('live-voice-operator')

/** Full-duplex WebRTC / continuous PCM room — not shipped as live product path. */
export const LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS = 'HELD' as const
/** Alias for UI honesty badge */
export const LIVE_VOICE_WEBRTC_SHIP_STATUS = LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS

/** CORE execution lane that is LIVE. */
export const LIVE_VOICE_CORE_LANE = 'push-to-talk-generate-play' as const

export const LIVE_VOICE_HONESTY = {
  productLabel: 'LiveVoice · governed direction',
  coreLaneLive:
    'Shipped CORE: push-to-talk / generate→play with audible Bridge TTS or formant + waveform + lipsync energy.',
  duplexWebRtcHeld:
    'Full-duplex WebRTC / continuous mic streaming room remains [HELD] — not a fake LIVE room.',
  costGuardRequired: 'CostGuard reserve/settle required per voice turn (Trava I / Law IX).',
  noSilentSuccess: 'Silent buffers are fail-closed — silence is not a shipped voice artifact.',
  libraryFirstSpeech:
    'Speech/VO is Plan B generative (#64); Foley stays library-first — LiveVoice is direction speech only.',
} as const

export type LiveVoiceBlockReason =
  | 'cost_guard'
  | 'empty_artifact'
  | 'provider_down'
  | 'invalid_input'
  | 'duplex_webrtc_held'
  | 'silent_buffer'

export type LiveVoicePlaybackSource = 'bridge-tts' | 'formant-synth'

export interface LiveVoiceLipsyncFrame {
  timeSec: number
  energy: number
  viseme: 'sil' | 'PP' | 'FF' | 'TH' | 'DD' | 'kk' | 'CH' | 'SS' | 'nn' | 'RR' | 'aa' | 'E' | 'I' | 'O' | 'U'
}

export interface LiveVoiceWaveformSummary {
  sampleRate: number
  frameCount: number
  durationSec: number
  rms: number
  peak: number
  pcmHash: string
  /** Downsampled absolute peaks 0–1 for UI bars (max 64). */
  peaks: number[]
}

export interface LiveVoiceTurnArtifact {
  sessionId: string
  turnId: string
  directionText: string
  executionLane: typeof LIVE_VOICE_CORE_LANE
  duplexWebRtcStatus: typeof LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS
  playbackSource: LiveVoicePlaybackSource
  waveform: LiveVoiceWaveformSummary
  lipsync: LiveVoiceLipsyncFrame[]
  /** Base64 PCM float32 little-endian mono — playable after decode client-side. */
  pcmBase64: string
  mimeHint: 'audio/pcm;rate=44100;channels=1;encoding=float32'
}

export interface LiveVoiceDirectionSuccess {
  success: true
  turn: LiveVoiceTurnArtifact
  artifactId: string
  evidenceReceiptId: string
  honesty: typeof LIVE_VOICE_HONESTY
  ledger: TaskEvidenceLedger
  bridge?: { success: boolean; blockedReason?: string }
}

export interface LiveVoiceDirectionDenied {
  success: false
  blockedReason: LiveVoiceBlockReason
  message: string
  honesty: typeof LIVE_VOICE_HONESTY
  ledger: TaskEvidenceLedger
  bridge?: { success: boolean; blockedReason?: string }
}

export type LiveVoiceDirectionResult = LiveVoiceDirectionSuccess | LiveVoiceDirectionDenied

export interface LiveVoiceSynthesizeResult {
  samples: Float32Array
  sampleRate: number
  playbackSource: LiveVoicePlaybackSource
  providerId: string
}

/** Optional Bridge TTS provider — returns mono float32 PCM or null to fall back to formant. */
export type LiveVoiceBridgeSynthesizer = (input: {
  text: string
  voiceId?: string
}) => Promise<LiveVoiceSynthesizeResult | null>

function digest(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function float32ToBase64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
  return Buffer.from(bytes).toString('base64')
}

function energyToViseme(energy: number): LiveVoiceLipsyncFrame['viseme'] {
  if (energy < 0.02) return 'sil'
  if (energy < 0.05) return 'PP'
  if (energy < 0.08) return 'FF'
  if (energy < 0.12) return 'TH'
  if (energy < 0.16) return 'DD'
  if (energy < 0.2) return 'kk'
  if (energy < 0.25) return 'CH'
  if (energy < 0.3) return 'SS'
  if (energy < 0.35) return 'nn'
  if (energy < 0.4) return 'RR'
  if (energy < 0.5) return 'aa'
  if (energy < 0.6) return 'E'
  if (energy < 0.7) return 'I'
  if (energy < 0.85) return 'O'
  return 'U'
}

/**
 * Build waveform peaks + lipsync energy frames from audible PCM (reuse Block 8 helpers).
 */
export function buildLiveVoiceWaveformAndLipsync(
  samples: Float32Array,
  sampleRate = 44100,
  frameRate = 30,
): { waveform: LiveVoiceWaveformSummary; lipsync: LiveVoiceLipsyncFrame[] } {
  const rms = assertAudibleVoiceBuffer(samples, 'LiveVoice')
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]!))
  }

  const peakCount = Math.min(64, Math.max(8, Math.floor(samples.length / 512)))
  const peaks: number[] = []
  const window = Math.max(1, Math.floor(samples.length / peakCount))
  for (let p = 0; p < peakCount; p++) {
    let localPeak = 0
    const start = p * window
    const end = Math.min(samples.length, start + window)
    for (let i = start; i < end; i++) {
      localPeak = Math.max(localPeak, Math.abs(samples[i]!))
    }
    peaks.push(Math.min(1, localPeak))
  }

  const frameCount = Math.max(1, Math.floor((samples.length / sampleRate) * frameRate))
  const samplesPerFrame = Math.max(1, Math.floor(sampleRate / frameRate))
  const lipsync: LiveVoiceLipsyncFrame[] = []
  for (let f = 0; f < frameCount; f++) {
    const start = f * samplesPerFrame
    const end = Math.min(samples.length, start + samplesPerFrame)
    let energy = 0
    const len = Math.max(1, end - start)
    for (let i = start; i < end; i++) {
      energy += Math.abs(samples[i]!)
    }
    energy /= len
    lipsync.push({
      timeSec: f / frameRate,
      energy,
      viseme: energyToViseme(energy),
    })
  }

  const pcmHash = digest(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)).slice(0, 32)

  return {
    waveform: {
      sampleRate,
      frameCount: samples.length,
      durationSec: samples.length / sampleRate,
      rms,
      peak,
      pcmHash,
      peaks,
    },
    lipsync,
  }
}

/**
 * Default audible synth — formant fill (AUDIO-002). Never silent.
 */
export function synthesizeFormantLiveVoicePcm(
  text: string,
  sampleRate = 44100,
  voiceId?: string,
): LiveVoiceSynthesizeResult {
  const durationSec = Math.min(12, Math.max(0.45, text.trim().length * 0.055))
  const frameCount = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(frameCount)
  const genderHint =
    voiceId?.toLowerCase().includes('female') || voiceId?.toLowerCase().includes('nova')
      ? 'female'
      : voiceId?.toLowerCase().includes('male') || voiceId?.toLowerCase().includes('onyx')
        ? 'male'
        : 'neutral'
  fillVoiceWaveform(samples, {
    text,
    profile: { gender: genderHint, pitch: 1, speed: 1 },
    emotionIntensity: 0.4,
  })
  assertAudibleVoiceBuffer(samples, 'LiveVoice.formant')
  return {
    samples,
    sampleRate,
    playbackSource: 'formant-synth',
    providerId: 'aethel-formant-livevoice',
  }
}

export function evaluateLiveVoiceShipClaim(input: {
  claimFullDuplexWebRtcLive?: boolean
  claimFakeWebRtcRoomLive?: boolean
}): { allowed: boolean; reason?: LiveVoiceBlockReason; message: string } {
  if (input.claimFullDuplexWebRtcLive || input.claimFakeWebRtcRoomLive) {
    return {
      allowed: false,
      reason: 'duplex_webrtc_held',
      message: LIVE_VOICE_HONESTY.duplexWebRtcHeld,
    }
  }
  return { allowed: true, message: LIVE_VOICE_HONESTY.coreLaneLive }
}

/**
 * Estimate Creative credits for a voice turn (chars → weight; Law IX metered).
 */
export function estimateLiveVoiceTurnTokenWeight(text: string, durationSecHint?: number): number {
  const chars = Math.max(1, text.trim().length)
  const duration = durationSecHint ?? Math.min(12, Math.max(0.45, chars * 0.055))
  // ~500 creative-weighted units per 1k chars (matrix) + per-minute floor
  const charWeight = Math.ceil((chars / 1000) * 500)
  const minuteWeight = Math.ceil(Math.max(1, duration / 60) * 800)
  return Math.max(200, charWeight + minuteWeight)
}

export async function runLiveVoiceDirectionTurn(input: {
  projectId: string
  userId: string
  directionText: string
  voiceId?: string
  sessionId?: string
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  estimatedTokenWeight?: number
  adapter: CostGuardLedgerAdapter
  /** Prefer Bridge TTS when provided; null/throw → formant CORE path. */
  bridgeSynthesizer?: LiveVoiceBridgeSynthesizer
  claimFullDuplexWebRtcLive?: boolean
  claimFakeWebRtcRoomLive?: boolean
}): Promise<LiveVoiceDirectionResult> {
  let ledger = createTaskEvidenceLedger({
    taskId: `lvt-${randomUUID().slice(0, 8)}`,
    projectId: input.projectId,
    mission: `J.10 LiveVoice direction: ${input.directionText.slice(0, 80)}`,
    ownerAgent: 'LiveVoice',
  })

  const claim = evaluateLiveVoiceShipClaim({
    claimFullDuplexWebRtcLive: input.claimFullDuplexWebRtcLive,
    claimFakeWebRtcRoomLive: input.claimFakeWebRtcRoomLive,
  })
  if (!claim.allowed) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'LiveVoice claim rejected',
      summary: claim.message,
      refs: [`claim:${claim.reason}`],
      actor: 'LiveVoice',
    })
    return {
      success: false,
      blockedReason: claim.reason!,
      message: claim.message,
      honesty: LIVE_VOICE_HONESTY,
      ledger,
    }
  }

  const directionText = input.directionText?.trim() ?? ''
  if (!directionText) {
    return {
      success: false,
      blockedReason: 'invalid_input',
      message: 'directionText is required for a LiveVoice turn',
      honesty: LIVE_VOICE_HONESTY,
      ledger,
    }
  }

  let synth: LiveVoiceSynthesizeResult
  try {
    const remote = input.bridgeSynthesizer
      ? await input.bridgeSynthesizer({ text: directionText, voiceId: input.voiceId })
      : null
    if (remote && remote.samples.length > 0) {
      const rms = measureChannelRms(remote.samples)
      if (rms < VOICE_AUDIBLE_RMS_MIN) {
        throw new Error('Bridge TTS returned silent buffer')
      }
      synth = remote
    } else {
      synth = synthesizeFormantLiveVoicePcm(directionText, 44100, input.voiceId)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'provider_down'
    if (/silent/i.test(message)) {
      ledger = appendTaskEvidence(ledger, {
        kind: 'validation',
        title: 'Silent voice buffer rejected',
        summary: message,
        refs: ['voice:silent-fail-closed'],
        actor: 'LiveVoice',
      })
      return {
        success: false,
        blockedReason: 'silent_buffer',
        message: LIVE_VOICE_HONESTY.noSilentSuccess,
        honesty: LIVE_VOICE_HONESTY,
        ledger,
      }
    }
    // Soft-fail Bridge → formant CORE (audible)
    try {
      synth = synthesizeFormantLiveVoicePcm(directionText, 44100, input.voiceId)
      ledger = appendTaskEvidence(ledger, {
        kind: 'validation',
        title: 'Bridge TTS unavailable — formant CORE',
        summary: message,
        refs: ['playback:formant-fallback'],
        actor: 'LiveVoice',
      })
    } catch (formantErr) {
      return {
        success: false,
        blockedReason: 'provider_down',
        message: formantErr instanceof Error ? formantErr.message : message,
        honesty: LIVE_VOICE_HONESTY,
        ledger,
      }
    }
  }

  let waveform: LiveVoiceWaveformSummary
  let lipsync: LiveVoiceLipsyncFrame[]
  try {
    const built = buildLiveVoiceWaveformAndLipsync(synth.samples, synth.sampleRate)
    waveform = built.waveform
    lipsync = built.lipsync
  } catch (err) {
    const message = err instanceof Error ? err.message : 'silent buffer'
    return {
      success: false,
      blockedReason: 'silent_buffer',
      message,
      honesty: LIVE_VOICE_HONESTY,
      ledger,
    }
  }

  const sessionId = input.sessionId ?? `lvs_${randomUUID().slice(0, 12)}`
  const turnId = `lvt_${randomUUID().slice(0, 12)}`
  const turn: LiveVoiceTurnArtifact = {
    sessionId,
    turnId,
    directionText,
    executionLane: LIVE_VOICE_CORE_LANE,
    duplexWebRtcStatus: LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
    playbackSource: synth.playbackSource,
    waveform,
    lipsync,
    pcmBase64: float32ToBase64(synth.samples),
    mimeHint: 'audio/pcm;rate=44100;channels=1;encoding=float32',
  }

  if (waveform.durationSec < 0.05 || waveform.rms < VOICE_AUDIBLE_RMS_MIN) {
    return {
      success: false,
      blockedReason: 'empty_artifact',
      message: 'LiveVoice turn produced no audible artifact',
      honesty: LIVE_VOICE_HONESTY,
      ledger,
    }
  }

  const weight =
    input.estimatedTokenWeight ??
    estimateLiveVoiceTurnTokenWeight(directionText, waveform.durationSec)

  const { result: bridge, ledger: bridgeLedger } = await dispatchCreativeArtifact({
    request: {
      domain: 'voice',
      prompt: directionText,
      projectId: input.projectId,
      userId: input.userId,
      evidenceKind: 'live-voice-turn',
      costGuard: {
        estimatedTokenWeight: weight,
        byokProfileId: input.byokProfileId,
        usageBucketId: input.usageBucketId,
        planId: input.planId ?? 'pro',
      },
      requiresFusionWrite: false,
    },
    adapter: input.adapter,
    ledger,
    provider: async () => ({
      artifactId: turn.turnId,
      provider: synth.providerId,
      costUsd: 0,
      actualTokenWeight: weight,
      empty: false,
      previewUrl: `livevoice://${turn.sessionId}/${turn.turnId}`,
    }),
  })

  ledger = bridgeLedger

  if (!bridge.success) {
    return {
      success: false,
      blockedReason:
        bridge.blockedReason === 'empty_artifact'
          ? 'empty_artifact'
          : bridge.blockedReason === 'provider_down'
            ? 'provider_down'
            : 'cost_guard',
      message: `CreativeBridge blocked LiveVoice: ${bridge.blockedReason ?? 'unknown'}`,
      honesty: LIVE_VOICE_HONESTY,
      ledger,
      bridge: { success: false, blockedReason: bridge.blockedReason },
    }
  }

  ledger = appendTaskEvidence(ledger, {
    kind: 'artifact',
    title: 'LiveVoice turn audible artifact',
    summary: `lane=${LIVE_VOICE_CORE_LANE}; source=${synth.playbackSource}; rms=${waveform.rms.toFixed(4)}; frames=${lipsync.length}`,
    refs: [
      `session:${sessionId}`,
      `turn:${turnId}`,
      `pcm:${waveform.pcmHash}`,
      `playback:${synth.playbackSource}`,
      `lipsync-frames:${lipsync.length}`,
    ],
    actor: 'LiveVoice',
  })
  ledger = appendTaskEvidence(ledger, {
    kind: 'validation',
    title: 'Duplex WebRTC honesty',
    summary: LIVE_VOICE_HONESTY.duplexWebRtcHeld,
    refs: [`webrtc:${LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS}`],
    actor: 'LiveVoice',
  })
  ledger = appendTaskEvidence(ledger, {
    kind: 'cost',
    title: 'LiveVoice turn metered',
    summary: `weight=${weight}; plan=${input.planId ?? 'pro'}`,
    refs: [`receipt:${bridge.evidenceReceiptId}`, `weight:${weight}`],
    actor: 'LiveVoice',
  })

  log.info('live_voice_turn_ok', {
    sessionId,
    turnId,
    playbackSource: synth.playbackSource,
    rms: waveform.rms,
    durationSec: waveform.durationSec,
  })

  return {
    success: true,
    turn,
    artifactId: turn.turnId,
    evidenceReceiptId: bridge.evidenceReceiptId,
    honesty: LIVE_VOICE_HONESTY,
    ledger,
    bridge: { success: true },
  }
}

export function __resetLiveVoiceOperatorForTests() {
  // Stateless operator — reserved for future session caches.
}

/**
 * Block 8 / AUDIO-002 — audible voice waveform helpers.
 * Success implies measurable energy; silent buffers fail closed.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('voice-waveform')

/** Minimum RMS for a buffer to count as audible (not silence). */
export const VOICE_AUDIBLE_RMS_MIN = 0.012

export interface VoiceWaveformProfile {
  pitch?: number
  speed?: number
  gender?: 'male' | 'female' | 'neutral' | string
}

export interface FillVoiceWaveformInput {
  text: string
  profile?: VoiceWaveformProfile
  emotionIntensity?: number
}

export function measureChannelRms(channel: Float32Array): number {
  if (channel.length === 0) return 0
  let sum = 0
  for (let i = 0; i < channel.length; i++) {
    const s = channel[i]!
    sum += s * s
  }
  return Math.sqrt(sum / channel.length)
}

/**
 * Formant-ish local VO preview — fills channel with non-silent speech-like energy.
 * Not neural TTS; Plan B neural path is `/api/ai/voice/generate` via Bridge.
 */
export function fillVoiceWaveform(channel: Float32Array, input: FillVoiceWaveformInput): number {
  const text = (input.text || '').trim() || 'a'
  const pitch = Math.max(0.5, Math.min(2, input.profile?.pitch ?? 1))
  const gender = input.profile?.gender ?? 'neutral'
  const baseFreq =
    gender === 'female' ? 210 : gender === 'male' ? 110 : 160
  const f0 = baseFreq * pitch
  const emotion = Math.max(0, Math.min(1, input.emotionIntensity ?? 0.35))
  const chars = text.toLowerCase()

  for (let i = 0; i < channel.length; i++) {
    const t = i / Math.max(1, channel.length)
    const charIndex = Math.min(chars.length - 1, Math.floor(t * chars.length))
    const ch = chars.charCodeAt(charIndex) || 97
    const vowelBoost = /[aeiou]/.test(chars[charIndex]!) ? 1.35 : 0.75
    const formant1 = Math.sin(2 * Math.PI * f0 * (i / 44100) * (1 + (ch % 7) * 0.03))
    const formant2 = Math.sin(2 * Math.PI * f0 * 2.4 * (i / 44100))
    const formant3 = Math.sin(2 * Math.PI * f0 * 3.7 * (i / 44100))
    const noise = (Math.random() * 2 - 1) * 0.04 * (0.4 + emotion)
    const envelope = Math.sin(Math.PI * Math.min(1, t * 8)) * Math.sin(Math.PI * Math.min(1, (1 - t) * 8) || 1)
    const amp = (0.18 + emotion * 0.12) * vowelBoost * Math.max(0.15, envelope)
    channel[i] = (formant1 * 0.55 + formant2 * 0.3 + formant3 * 0.15 + noise) * amp
  }

  return measureChannelRms(channel)
}

export function assertAudibleVoiceBuffer(channel: Float32Array, context = 'generateVoice'): number {
  const rms = measureChannelRms(channel)
  if (rms < VOICE_AUDIBLE_RMS_MIN) {
    log.warn('voice_buffer_silent_fail_closed', { context, rms })
    throw new Error(
      `[HELD] ${context}: buffer RMS ${rms.toFixed(5)} < ${VOICE_AUDIBLE_RMS_MIN} — silence is not a shipped voice artifact`,
    )
  }
  return rms
}

export function isAudibleVoiceBuffer(channel: Float32Array): boolean {
  return measureChannelRms(channel) >= VOICE_AUDIBLE_RMS_MIN
}

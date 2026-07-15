/**
 * Block 8 / AUDIO-001 — synthetic impulse responses for ConvolverNode wet path.
 */

import type { ReverbPreset } from '@/lib/audio/spatial-audio-contracts'

export interface ImpulseParams {
  durationSec: number
  decay: number
  wet: number
}

export const REVERB_PRESET_PARAMS: Record<ReverbPreset, ImpulseParams> = {
  none: { durationSec: 0, decay: 0, wet: 0 },
  small_room: { durationSec: 0.4, decay: 2.5, wet: 0.25 },
  medium_room: { durationSec: 0.8, decay: 3.2, wet: 0.35 },
  large_hall: { durationSec: 1.6, decay: 4.5, wet: 0.45 },
  cathedral: { durationSec: 2.8, decay: 6, wet: 0.55 },
  cave: { durationSec: 1.4, decay: 5, wet: 0.5 },
  tunnel: { durationSec: 1.1, decay: 4, wet: 0.4 },
  outdoor: { durationSec: 0.35, decay: 1.8, wet: 0.15 },
  underwater: { durationSec: 1.2, decay: 3.5, wet: 0.6 },
}

/** Fill a stereo IR buffer (pure) — used by SpatialAudioManagerCore.setReverbPreset. */
export function fillImpulseResponseChannels(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  preset: Exclude<ReverbPreset, 'none'>,
): void {
  const params = REVERB_PRESET_PARAMS[preset]
  const length = left.length
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-params.decay * t)
    const noiseL = (Math.random() * 2 - 1) * envelope
    const noiseR = (Math.random() * 2 - 1) * envelope
    left[i] = noiseL
    right[i] = noiseR
  }
  // Soft first reflection
  if (length > 4) {
    left[0] = 0
    right[0] = 0
    left[1] = 0.4 * params.wet
    right[2] = 0.35 * params.wet
  }
}

export function impulseFrameCount(sampleRate: number, preset: ReverbPreset): number {
  const params = REVERB_PRESET_PARAMS[preset]
  if (preset === 'none' || params.durationSec <= 0) return 0
  return Math.max(1, Math.floor(params.durationSec * sampleRate))
}

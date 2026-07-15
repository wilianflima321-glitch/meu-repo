import type { ReverbPreset, ReverbSettings } from './spatial-audio-contracts'

export const REVERB_PRESETS: Record<ReverbPreset, ReverbSettings> = {
  none: { decay: 0, preDelay: 0, wetDry: 0 },
  small_room: { decay: 0.5, preDelay: 0.01, wetDry: 0.3 },
  medium_room: { decay: 1, preDelay: 0.02, wetDry: 0.4 },
  large_hall: { decay: 2.5, preDelay: 0.03, wetDry: 0.5 },
  cathedral: { decay: 4, preDelay: 0.04, wetDry: 0.6 },
  cave: { decay: 3, preDelay: 0.05, wetDry: 0.7 },
  tunnel: { decay: 2, preDelay: 0.02, wetDry: 0.5 },
  outdoor: { decay: 0.3, preDelay: 0.01, wetDry: 0.2 },
  underwater: { decay: 1.5, preDelay: 0.03, wetDry: 0.6 },
}

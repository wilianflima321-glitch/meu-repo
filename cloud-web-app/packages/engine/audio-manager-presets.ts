import type { ReverbPreset } from './audio-manager-contracts'

export const ReverbPresets: Record<string, ReverbPreset> = {
  room: {
    name: 'Room',
    decay: 0.5,
    preDelay: 0.01,
    wetMix: 0.2,
  },
  hall: {
    name: 'Hall',
    decay: 2.0,
    preDelay: 0.02,
    wetMix: 0.3,
  },
  cathedral: {
    name: 'Cathedral',
    decay: 5.0,
    preDelay: 0.05,
    wetMix: 0.4,
  },
  cave: {
    name: 'Cave',
    decay: 3.0,
    preDelay: 0.1,
    wetMix: 0.5,
  },
  outdoor: {
    name: 'Outdoor',
    decay: 0.3,
    preDelay: 0.005,
    wetMix: 0.1,
  },
}

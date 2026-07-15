import type * as THREE from 'three'

export interface AudioSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  ambientVolume: number
  voiceVolume: number
  muted: boolean
  spatialEnabled: boolean
  maxDistance: number
  rolloffFactor: number
  dopplerFactor: number
}

export interface SoundSettings {
  volume: number
  pitch: number
  loop: boolean
  spatial: boolean
  minDistance: number
  maxDistance: number
  rolloffFactor: number
  coneInnerAngle: number
  coneOuterAngle: number
  coneOuterGain: number
  category: 'sfx' | 'music' | 'ambient' | 'voice'
}

export interface AudioZone {
  id: string
  name: string
  bounds: THREE.Box3
  reverbPreset: ReverbPreset
  volume: number
  priority: number
}

export type ReverbPreset = 'none' | 'small_room' | 'medium_room' | 'large_hall' | 'cathedral' | 'cave' | 'tunnel' | 'outdoor' | 'underwater'

export interface ReverbSettings {
  decay: number
  preDelay: number
  wetDry: number
}

export interface AudioClip {
  id: string
  name: string
  buffer: AudioBuffer
  duration: number
}

export interface ActiveSound {
  id: string
  clipId: string
  source: AudioBufferSourceNode
  gainNode: GainNode
  pannerNode?: PannerNode
  filterNode?: BiquadFilterNode
  position?: THREE.Vector3
  settings: SoundSettings
  startTime: number
  pauseTime?: number
  onComplete?: () => void
}

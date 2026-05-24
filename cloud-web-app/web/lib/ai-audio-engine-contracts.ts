export interface EmotionalContext {
  joy: number
  sadness: number
  anger: number
  fear: number
  surprise: number
  disgust: number
  trust: number
  anticipation: number
  intensity: number
  valence: number
  arousal: number
}

export interface SceneContext {
  type: 'combat' | 'exploration' | 'dialogue' | 'cutscene' | 'puzzle' | 'stealth' | 'chase' | 'boss' | 'victory' | 'defeat' | 'menu' | 'custom'
  environment: 'interior' | 'exterior' | 'underwater' | 'space' | 'cave' | 'forest' | 'city' | 'desert' | 'snow' | 'custom'
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night'
  weather: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'
  emotion: EmotionalContext
  characters: CharacterContext[]
  events: string[]
  metadata: Record<string, unknown>
}

export interface CharacterContext {
  id: string
  name: string
  role: 'player' | 'ally' | 'enemy' | 'npc' | 'narrator'
  emotion: EmotionalContext
  position?: { x: number; y: number; z: number }
  voiceProfile?: VoiceProfile
}

export interface VoiceProfile {
  id: string
  name: string
  gender: 'male' | 'female' | 'neutral'
  age: 'child' | 'young' | 'adult' | 'elderly'
  accent?: string
  pitch: number
  speed: number
  breathiness: number
  roughness: number
  emotionMod: {
    joyPitchMod: number
    sadnessPitchMod: number
    angerSpeedMod: number
    fearBreathMod: number
  }
}

export interface MusicParameters {
  genre: 'orchestral' | 'electronic' | 'ambient' | 'rock' | 'jazz' | 'folk' | 'world' | 'hybrid'
  tempo: number
  key: string
  mode: 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian'
  instruments: InstrumentConfig[]
  dynamics: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff'
  articulation: 'legato' | 'staccato' | 'marcato' | 'tenuto' | 'accent'
  texture: 'sparse' | 'medium' | 'dense'
  repetition: number
  variation: number
}

export interface InstrumentConfig {
  type: string
  family: 'strings' | 'brass' | 'woodwind' | 'percussion' | 'keys' | 'synth' | 'vocal' | 'other'
  volume: number
  pan: number
  enabled: boolean
  layer?: string
  filter?: {
    type: 'lowpass' | 'highpass' | 'bandpass'
    frequency: number
    resonance: number
  }
}

export interface MusicStem {
  id: string
  name: string
  category: 'melody' | 'harmony' | 'bass' | 'drums' | 'percussion' | 'ambient' | 'fx'
  audioUrl?: string
  audioBuffer?: AudioBuffer
  volume: number
  pan: number
  enabled: boolean
  conditions?: {
    minIntensity?: number
    maxIntensity?: number
    emotions?: string[]
    events?: string[]
  }
}

export interface MusicComposition {
  id: string
  name: string
  description: string
  parameters: MusicParameters
  stems: MusicStem[]
  duration: number
  loopStart?: number
  loopEnd?: number
  stingers: {
    start?: string
    end?: string
    victory?: string
    defeat?: string
    custom?: Record<string, string>
  }
  emotionProfile: EmotionalContext
  tags: string[]
}

export interface SFXParameters {
  category: 'footstep' | 'impact' | 'weapon' | 'explosion' | 'ambient' | 'ui' | 'foley' | 'creature' | 'vehicle' | 'magic' | 'custom'
  material?: 'wood' | 'metal' | 'stone' | 'dirt' | 'grass' | 'water' | 'snow' | 'sand' | 'glass' | 'flesh' | 'cloth'
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  intensity: number
  distance: number
  duration: number
  pitchVariation: number
  reverb: number
  spatial: boolean
  position?: { x: number; y: number; z: number }
}

export interface FoleyEvent {
  id: string
  type: 'footstep' | 'cloth' | 'impact' | 'handle' | 'gesture' | 'breath' | 'custom'
  source: string
  material: string
  velocity: number
  weight: number
  timestamp: number
  position?: { x: number; y: number; z: number }
}

export interface AmbientLayer {
  id: string
  name: string
  category: 'background' | 'weather' | 'wildlife' | 'urban' | 'indoor' | 'mechanical'
  mode: 'loop' | 'events'
  baseVolume: number
  contextModulation: {
    timeOfDay: Record<string, number>
    weather: Record<string, number>
    intensity: { min: number; max: number }
  }
  audioUrl?: string
  audioBuffer?: AudioBuffer
  spatial?: {
    enabled: boolean
    minDistance: number
    maxDistance: number
    positions?: { x: number; y: number; z: number }[]
  }
}

export interface VoiceRequest {
  text: string
  profile: VoiceProfile
  emotion?: EmotionalContext
  priority: number
}

export interface LipSyncData {
  duration: number
  frameRate: number
  keyframes: LipSyncKeyframe[]
}

export interface LipSyncKeyframe {
  time: number
  viseme: string
  weight: number
}

export interface AudioAnalysisData {
  frequencyData: Uint8Array
  timeData: Uint8Array
}

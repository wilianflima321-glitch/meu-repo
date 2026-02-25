export interface EmotionalContext {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  trust: number;
  anticipation: number;
  intensity: number;
  valence: number;
  arousal: number;
}

export interface SceneContext {
  type:
    | 'combat'
    | 'exploration'
    | 'dialogue'
    | 'cutscene'
    | 'puzzle'
    | 'stealth'
    | 'chase'
    | 'boss'
    | 'victory'
    | 'defeat'
    | 'menu'
    | 'custom';
  environment:
    | 'interior'
    | 'exterior'
    | 'underwater'
    | 'space'
    | 'cave'
    | 'forest'
    | 'city'
    | 'desert'
    | 'snow'
    | 'custom';
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  weather: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  emotion: EmotionalContext;
  characters: CharacterContext[];
  events: string[];
  metadata: Record<string, any>;
}

export interface CharacterContext {
  id: string;
  name: string;
  role: string;
  emotion: EmotionalContext;
  distance: number;
  voiceProfile?: VoiceProfile;
}

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  age: 'child' | 'young' | 'adult' | 'elderly';
  accent?: string;
  language: string;
  pitch: number;
  speed: number;
  clarity: number;
  emotionalRange: number;
  customSettings?: Record<string, any>;
}

export interface MusicParameters {
  tempo: number;
  key: string;
  mode: 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian';
  timeSignature?: [number, number];
  intensity?: number;
  complexity?: number;
  genre:
    | 'orchestral'
    | 'electronic'
    | 'ambient'
    | 'rock'
    | 'jazz'
    | 'ethnic'
    | 'hybrid'
    | 'folk';
  instrumentation?: string[];
  dynamics: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
  harmonicTension?: number;
  rhythmicDensity?: number;
  melodyProminence?: number;
  bassPresence?: number;
  percussionIntensity?: number;
  effects?: string[];
  articulation?: 'legato' | 'staccato' | 'tenuto' | 'marcato';
  texture?: 'sparse' | 'medium' | 'dense';
  repetition?: number;
  variation?: number;
  instruments: InstrumentConfig[];
}

export interface InstrumentConfig {
  id?: string;
  name?: string;
  type?: string;
  family: 'strings' | 'brass' | 'woodwind' | 'percussion' | 'keys' | 'synth' | 'voice';
  volume: number;
  pan: number;
  reverb?: number;
  delay?: number;
  eq?: {
    low: number;
    mid: number;
    high: number;
  };
  filter?: {
    type: 'lowpass' | 'highpass' | 'bandpass';
    frequency: number;
    resonance?: number;
  };
  enabled: boolean;
}

export interface MusicStem {
  id: string;
  name: string;
  category: 'rhythm' | 'bass' | 'harmony' | 'melody' | 'fx' | 'atmosphere' | 'drums' | 'ambient';
  audioBuffer?: AudioBuffer;
  audioUrl?: string;
  volume: number;
  pan?: number;
  enabled: boolean;
  loop?: boolean;
  syncToBeat?: boolean;
  fadeInTime?: number;
  fadeOutTime?: number;
  triggerConditions?: {
    sceneTypes?: string[];
    emotionThreshold?: number;
    intensityRange?: [number, number];
  };
  conditions?: {
    minIntensity?: number;
    maxIntensity?: number;
    emotions?: string[];
    events?: string[];
  };
}

export interface MusicComposition {
  id: string;
  name: string;
  description?: string;
  duration: number;
  bpm?: number;
  key?: string;
  parameters: MusicParameters;
  stems: MusicStem[];
  masterBuffer?: AudioBuffer;
  markers?: Array<{
    time: number;
    label: string;
    type: 'verse' | 'chorus' | 'bridge' | 'transition' | 'climax' | 'ending';
  }>;
  emotionProfile: EmotionalContext;
  metadata?: {
    generatedAt: number;
    generationTime: number;
    model?: string;
    prompt?: string;
  };
  stingers?: Record<string, string>;
  tags?: string[];
}

export interface SFXParameters {
  type?: 'footstep' | 'impact' | 'explosion' | 'ambient' | 'ui' | 'weapon' | 'magic' | 'custom' | 'foley';
  category?: 'footstep' | 'impact' | 'explosion' | 'ambient' | 'ui' | 'weapon' | 'magic' | 'custom' | 'foley';
  material?: 'wood' | 'metal' | 'stone' | 'water' | 'grass' | 'sand' | 'snow' | 'flesh';
  intensity: number;
  pitch?: number;
  duration: number;
  spatial?: boolean | {
    x: number;
    y: number;
    z: number;
    distance: number;
  };
  position?: { x: number; y: number; z: number };
  distance?: number;
  pitchVariation?: number;
  reverb?: number;
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  variation?: number;
  layers?: string[];
  customParams?: Record<string, any>;
}

export interface FoleyEvent {
  id: string;
  type: string;
  timestamp: number;
  source: {
    entityId: string;
    position: { x: number; y: number; z: number };
    velocity?: { x: number; y: number; z: number };
  };
  position?: { x: number; y: number; z: number };
  velocity?: number;
  weight?: number;
  material?: SFXParameters['material'];
  context: SceneContext;
  priority: number;
}

export interface AmbientLayer {
  id: string;
  name: string;
  category: 'background' | 'weather' | 'wildlife' | 'urban' | 'indoor' | 'mechanical';
  mode: 'loop' | 'events';
  baseVolume: number;
  contextModulation: {
    timeOfDay: Record<string, number>;
    weather: Record<string, number>;
    intensity: { min: number; max: number };
  };
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  spatial?: {
    enabled: boolean;
    minDistance: number;
    maxDistance: number;
    positions?: { x: number; y: number; z: number }[];
  };
}

export interface VoiceRequest {
  text: string;
  profile: VoiceProfile;
  emotion?: EmotionalContext;
  priority: number;
}

export interface LipSyncData {
  duration: number;
  frameRate: number;
  keyframes: LipSyncKeyframe[];
}

export interface LipSyncKeyframe {
  time: number;
  viseme: string;
  weight: number;
}

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
}

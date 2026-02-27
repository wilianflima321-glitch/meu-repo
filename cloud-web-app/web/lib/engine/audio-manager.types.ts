export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AudioListenerConfig {
  position: Vector3;
  forward: Vector3;
  up: Vector3;
}

export interface AudioSourceConfig {
  name: string;
  url?: string;
  buffer?: AudioBuffer;
  spatial?: boolean;
  position?: Vector3;
  volume?: number;
  pitch?: number;
  loop?: boolean;
  autoplay?: boolean;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  coneInnerAngle?: number;
  coneOuterAngle?: number;
  coneOuterGain?: number;
  distanceModel?: 'linear' | 'inverse' | 'exponential';
  reverb?: boolean;
  reverbMix?: number;
  lowPassFilter?: number;
  highPassFilter?: number;
  group?: string;
}

export interface AudioGroupConfig {
  name: string;
  volume?: number;
  muted?: boolean;
  effects?: AudioEffectConfig[];
}

export interface AudioEffectConfig {
  type: 'reverb' | 'delay' | 'distortion' | 'compressor' | 'eq';
  params: Record<string, number>;
}

export interface ReverbPreset {
  name: string;
  decay: number;
  preDelay: number;
  wetMix: number;
}

export interface AudioSnapshot {
  masterVolume: number;
  groups: { name: string; volume: number; muted: boolean }[];
  sources: { id: string; volume: number; position?: Vector3 }[];
}

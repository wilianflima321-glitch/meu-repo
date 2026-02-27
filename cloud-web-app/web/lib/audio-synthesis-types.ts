/**
 * Shared contracts for the audio synthesis runtime.
 */

export type OscillatorShape = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass' | 'lowshelf' | 'highshelf' | 'peaking';
export type DistortionType = 'soft' | 'hard' | 'fuzz' | 'bitcrush';

export interface EnvelopeConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface OscillatorConfig {
  shape: OscillatorShape;
  frequency: number;
  detune: number;
  gain: number;
  customWaveform?: Float32Array;
}

export interface FilterConfig {
  type: FilterType;
  frequency: number;
  q: number;
  gain: number;
}

export interface LFOConfig {
  shape: OscillatorShape;
  frequency: number;
  depth: number;
  target: 'frequency' | 'gain' | 'filter' | 'pan';
}

export interface EffectConfig {
  type: string;
  params: Record<string, number>;
  wet: number;
}

export interface SynthVoiceConfig {
  oscillators: OscillatorConfig[];
  filter?: FilterConfig;
  envelope: EnvelopeConfig;
  filterEnvelope?: EnvelopeConfig;
  lfos?: LFOConfig[];
}

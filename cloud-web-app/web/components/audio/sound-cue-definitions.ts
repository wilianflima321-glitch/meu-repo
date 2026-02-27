/**
 * Sound cue node contracts and static definitions extracted from the editor surface.
 */

export type SoundNodeType =
  | 'output'
  | 'wave_player'
  | 'random'
  | 'sequence'
  | 'mixer'
  | 'crossfade'
  | 'modulator_lfo'
  | 'modulator_envelope'
  | 'modulator_random'
  | 'effect_reverb'
  | 'effect_delay'
  | 'effect_filter'
  | 'effect_distortion'
  | 'effect_compressor'
  | 'effect_eq'
  | 'attenuation'
  | 'branch'
  | 'looper'
  | 'concatenator';

export interface SoundPin {
  id: string;
  name: string;
  type: 'audio' | 'control' | 'trigger';
  direction: 'input' | 'output';
}

export interface SoundNodeDefinition {
  type: SoundNodeType;
  name: string;
  category: string;
  color: string;
  inputs: SoundPin[];
  outputs: SoundPin[];
  parameters: SoundParameter[];
}

export interface SoundParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'enum' | 'asset';
  value: unknown;
  min?: number;
  max?: number;
  options?: string[];
}

export interface SoundCueNode {
  id: string;
  type: SoundNodeType;
  position: { x: number; y: number };
  parameters: Record<string, unknown>;
}

export interface SoundCueConnection {
  id: string;
  sourceNode: string;
  sourcePin: string;
  targetNode: string;
  targetPin: string;
}

export interface SoundCue {
  id: string;
  name: string;
  nodes: SoundCueNode[];
  connections: SoundCueConnection[];
  parameters: SoundCueParameter[];
}

export interface SoundCueParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool';
  defaultValue: number | boolean;
  min?: number;
  max?: number;
}

// ============================================================================
// NODE DEFINITIONS
// ============================================================================

export const nodeDefinitions: Record<SoundNodeType, SoundNodeDefinition> = {
  output: {
    type: 'output',
    name: 'Output',
    category: 'Core',
    color: '#ef4444',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
    ],
    outputs: [],
    parameters: [
      { id: 'volume', name: 'Master Volume', type: 'float', value: 1, min: 0, max: 2 },
    ],
  },
  wave_player: {
    type: 'wave_player',
    name: 'Wave Player',
    category: 'Source',
    color: '#22c55e',
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'sound', name: 'Sound', type: 'asset', value: '' },
      { id: 'volume', name: 'Volume', type: 'float', value: 1, min: 0, max: 2 },
      { id: 'pitch', name: 'Pitch', type: 'float', value: 1, min: 0.1, max: 4 },
      { id: 'loop', name: 'Loop', type: 'bool', value: false },
      { id: 'startTime', name: 'Start Time', type: 'float', value: 0, min: 0, max: 60 },
    ],
  },
  random: {
    type: 'random',
    name: 'Random',
    category: 'Source',
    color: '#22c55e',
    inputs: [
      { id: 'in0', name: 'In 0', type: 'audio', direction: 'input' },
      { id: 'in1', name: 'In 1', type: 'audio', direction: 'input' },
      { id: 'in2', name: 'In 2', type: 'audio', direction: 'input' },
      { id: 'in3', name: 'In 3', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'weights', name: 'Weights', type: 'float', value: 1 },
      { id: 'noRepeat', name: 'No Repeat', type: 'bool', value: true },
    ],
  },
  sequence: {
    type: 'sequence',
    name: 'Sequence',
    category: 'Source',
    color: '#22c55e',
    inputs: [
      { id: 'in0', name: 'In 0', type: 'audio', direction: 'input' },
      { id: 'in1', name: 'In 1', type: 'audio', direction: 'input' },
      { id: 'in2', name: 'In 2', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'loop', name: 'Loop', type: 'bool', value: false },
    ],
  },
  mixer: {
    type: 'mixer',
    name: 'Mixer',
    category: 'Routing',
    color: '#3b82f6',
    inputs: [
      { id: 'in0', name: 'In 0', type: 'audio', direction: 'input' },
      { id: 'in1', name: 'In 1', type: 'audio', direction: 'input' },
      { id: 'in2', name: 'In 2', type: 'audio', direction: 'input' },
      { id: 'in3', name: 'In 3', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'gain0', name: 'Gain 0', type: 'float', value: 1, min: 0, max: 2 },
      { id: 'gain1', name: 'Gain 1', type: 'float', value: 1, min: 0, max: 2 },
      { id: 'gain2', name: 'Gain 2', type: 'float', value: 1, min: 0, max: 2 },
      { id: 'gain3', name: 'Gain 3', type: 'float', value: 1, min: 0, max: 2 },
    ],
  },
  crossfade: {
    type: 'crossfade',
    name: 'Crossfade',
    category: 'Routing',
    color: '#3b82f6',
    inputs: [
      { id: 'inA', name: 'Input A', type: 'audio', direction: 'input' },
      { id: 'inB', name: 'Input B', type: 'audio', direction: 'input' },
      { id: 'blend', name: 'Blend', type: 'control', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'blend', name: 'Blend', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'curve', name: 'Curve', type: 'enum', value: 'linear', options: ['linear', 'equal_power', 'exponential'] },
    ],
  },
  modulator_lfo: {
    type: 'modulator_lfo',
    name: 'LFO',
    category: 'Modulation',
    color: '#8b5cf6',
    inputs: [],
    outputs: [
      { id: 'control', name: 'Control', type: 'control', direction: 'output' },
    ],
    parameters: [
      { id: 'frequency', name: 'Frequency', type: 'float', value: 1, min: 0.01, max: 20 },
      { id: 'amplitude', name: 'Amplitude', type: 'float', value: 1, min: 0, max: 1 },
      { id: 'offset', name: 'Offset', type: 'float', value: 0, min: -1, max: 1 },
      { id: 'waveform', name: 'Waveform', type: 'enum', value: 'sine', options: ['sine', 'square', 'triangle', 'sawtooth'] },
    ],
  },
  modulator_envelope: {
    type: 'modulator_envelope',
    name: 'Envelope',
    category: 'Modulation',
    color: '#8b5cf6',
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', direction: 'input' },
    ],
    outputs: [
      { id: 'control', name: 'Control', type: 'control', direction: 'output' },
    ],
    parameters: [
      { id: 'attack', name: 'Attack', type: 'float', value: 0.01, min: 0, max: 5 },
      { id: 'decay', name: 'Decay', type: 'float', value: 0.1, min: 0, max: 5 },
      { id: 'sustain', name: 'Sustain', type: 'float', value: 0.7, min: 0, max: 1 },
      { id: 'release', name: 'Release', type: 'float', value: 0.3, min: 0, max: 10 },
    ],
  },
  modulator_random: {
    type: 'modulator_random',
    name: 'Random',
    category: 'Modulation',
    color: '#8b5cf6',
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', direction: 'input' },
    ],
    outputs: [
      { id: 'control', name: 'Control', type: 'control', direction: 'output' },
    ],
    parameters: [
      { id: 'min', name: 'Min', type: 'float', value: 0, min: -1, max: 1 },
      { id: 'max', name: 'Max', type: 'float', value: 1, min: -1, max: 1 },
      { id: 'mode', name: 'Mode', type: 'enum', value: 'continuous', options: ['continuous', 'stepped', 'triggered'] },
    ],
  },
  effect_reverb: {
    type: 'effect_reverb',
    name: 'Reverb',
    category: 'Effects',
    color: '#f59e0b',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'roomSize', name: 'Room Size', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'damping', name: 'Damping', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'wetLevel', name: 'Wet Level', type: 'float', value: 0.3, min: 0, max: 1 },
      { id: 'dryLevel', name: 'Dry Level', type: 'float', value: 0.7, min: 0, max: 1 },
      { id: 'width', name: 'Width', type: 'float', value: 1, min: 0, max: 1 },
    ],
  },
  effect_delay: {
    type: 'effect_delay',
    name: 'Delay',
    category: 'Effects',
    color: '#f59e0b',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'delayTime', name: 'Delay Time', type: 'float', value: 0.3, min: 0, max: 2 },
      { id: 'feedback', name: 'Feedback', type: 'float', value: 0.3, min: 0, max: 0.95 },
      { id: 'wetLevel', name: 'Wet Level', type: 'float', value: 0.3, min: 0, max: 1 },
      { id: 'sync', name: 'Sync to Tempo', type: 'bool', value: false },
    ],
  },
  effect_filter: {
    type: 'effect_filter',
    name: 'Filter',
    category: 'Effects',
    color: '#f59e0b',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
      { id: 'cutoff', name: 'Cutoff', type: 'control', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'type', name: 'Type', type: 'enum', value: 'lowpass', options: ['lowpass', 'highpass', 'bandpass', 'notch'] },
      { id: 'cutoff', name: 'Cutoff', type: 'float', value: 1000, min: 20, max: 20000 },
      { id: 'resonance', name: 'Resonance', type: 'float', value: 0.5, min: 0, max: 1 },
    ],
  },
  effect_distortion: {
    type: 'effect_distortion',
    name: 'Distortion',
    category: 'Effects',
    color: '#f59e0b',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'drive', name: 'Drive', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'tone', name: 'Tone', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'type', name: 'Type', type: 'enum', value: 'soft', options: ['soft', 'hard', 'fuzz', 'bitcrush'] },
    ],
  },
  effect_compressor: {
    type: 'effect_compressor',
    name: 'Compressor',
    category: 'Effects',
    color: '#f59e0b',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
      { id: 'sidechain', name: 'Sidechain', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'threshold', name: 'Threshold', type: 'float', value: -20, min: -60, max: 0 },
      { id: 'ratio', name: 'Ratio', type: 'float', value: 4, min: 1, max: 20 },
      { id: 'attack', name: 'Attack', type: 'float', value: 0.01, min: 0.001, max: 0.5 },
      { id: 'release', name: 'Release', type: 'float', value: 0.1, min: 0.01, max: 2 },
      { id: 'makeupGain', name: 'Makeup Gain', type: 'float', value: 0, min: 0, max: 24 },
    ],
  },
  effect_eq: {
    type: 'effect_eq',
    name: 'EQ',
    category: 'Effects',
    color: '#f59e0b',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'lowGain', name: 'Low', type: 'float', value: 0, min: -12, max: 12 },
      { id: 'midGain', name: 'Mid', type: 'float', value: 0, min: -12, max: 12 },
      { id: 'highGain', name: 'High', type: 'float', value: 0, min: -12, max: 12 },
      { id: 'lowFreq', name: 'Low Freq', type: 'float', value: 200, min: 20, max: 500 },
      { id: 'highFreq', name: 'High Freq', type: 'float', value: 4000, min: 1000, max: 16000 },
    ],
  },
  attenuation: {
    type: 'attenuation',
    name: 'Attenuation',
    category: '3D',
    color: '#10b981',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'minDistance', name: 'Min Distance', type: 'float', value: 1, min: 0, max: 100 },
      { id: 'maxDistance', name: 'Max Distance', type: 'float', value: 50, min: 1, max: 1000 },
      { id: 'falloff', name: 'Falloff', type: 'enum', value: 'inverse', options: ['linear', 'inverse', 'logarithmic', 'custom'] },
      { id: 'spatialization', name: 'Spatialization', type: 'bool', value: true },
      { id: 'dopplerEffect', name: 'Doppler Effect', type: 'bool', value: false },
    ],
  },
  branch: {
    type: 'branch',
    name: 'Branch',
    category: 'Logic',
    color: '#ec4899',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
      { id: 'condition', name: 'Condition', type: 'control', direction: 'input' },
    ],
    outputs: [
      { id: 'true', name: 'True', type: 'audio', direction: 'output' },
      { id: 'false', name: 'False', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'threshold', name: 'Threshold', type: 'float', value: 0.5, min: 0, max: 1 },
    ],
  },
  looper: {
    type: 'looper',
    name: 'Looper',
    category: 'Logic',
    color: '#ec4899',
    inputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'loopCount', name: 'Loop Count', type: 'int', value: -1, min: -1, max: 100 },
      { id: 'crossfade', name: 'Crossfade', type: 'float', value: 0.05, min: 0, max: 1 },
    ],
  },
  concatenator: {
    type: 'concatenator',
    name: 'Concatenator',
    category: 'Logic',
    color: '#ec4899',
    inputs: [
      { id: 'intro', name: 'Intro', type: 'audio', direction: 'input' },
      { id: 'loop', name: 'Loop', type: 'audio', direction: 'input' },
      { id: 'outro', name: 'Outro', type: 'audio', direction: 'input' },
    ],
    outputs: [
      { id: 'audio', name: 'Audio', type: 'audio', direction: 'output' },
    ],
    parameters: [
      { id: 'loopCount', name: 'Loop Count', type: 'int', value: 1, min: 0, max: 100 },
    ],
  },
};

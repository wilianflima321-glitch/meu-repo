/**
 * Built-in synth preset catalog for audio synthesis runtime.
 */

import type { SynthVoiceConfig } from './audio-synthesis-types';

export const SynthPresets = {
  lead: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sawtooth', frequency: 440, detune: 0, gain: 0.5 },
      { shape: 'sawtooth', frequency: 440, detune: 7, gain: 0.5 },
    ],
    filter: { type: 'lowpass', frequency: 2000, q: 2, gain: 0 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
  }),
  
  pad: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sine', frequency: 440, detune: 0, gain: 0.4 },
      { shape: 'triangle', frequency: 440, detune: 5, gain: 0.3 },
      { shape: 'sine', frequency: 880, detune: 0, gain: 0.15 },
    ],
    filter: { type: 'lowpass', frequency: 3000, q: 0.5, gain: 0 },
    envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.5 },
  }),
  
  bass: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sawtooth', frequency: 110, detune: 0, gain: 0.6 },
      { shape: 'square', frequency: 110, detune: -5, gain: 0.4 },
    ],
    filter: { type: 'lowpass', frequency: 800, q: 4, gain: 0 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
    filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.2 },
  }),
  
  pluck: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'triangle', frequency: 440, detune: 0, gain: 0.8 },
    ],
    filter: { type: 'lowpass', frequency: 5000, q: 1, gain: 0 },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    filterEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.1 },
  }),
  
  organ: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sine', frequency: 440, detune: 0, gain: 0.5 },
      { shape: 'sine', frequency: 880, detune: 0, gain: 0.25 },
      { shape: 'sine', frequency: 1320, detune: 0, gain: 0.125 },
      { shape: 'sine', frequency: 1760, detune: 0, gain: 0.0625 },
    ],
    envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.1 },
  }),
  
  strings: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sawtooth', frequency: 440, detune: 0, gain: 0.3 },
      { shape: 'sawtooth', frequency: 440, detune: 10, gain: 0.3 },
      { shape: 'sawtooth', frequency: 440, detune: -10, gain: 0.3 },
    ],
    filter: { type: 'lowpass', frequency: 4000, q: 1, gain: 0 },
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 0.5 },
    lfos: [
      { shape: 'sine', frequency: 5, depth: 3, target: 'frequency' },
    ],
  }),
};

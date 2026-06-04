'use client';

import type { AudioChannel, ChannelConfig } from './audio-engine.types';

export type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export const DEFAULT_AUDIO_CHANNELS: AudioChannel[] = ['master', 'bgm', 'sfx', 'ambient', 'voice', 'ui'];
export const DEFAULT_CROSSFADE_DURATION_MS = 2000;

export function createDefaultChannelConfig(channel: AudioChannel): ChannelConfig {
  return {
    volume: channel === 'master' ? 1 : 0.8,
    muted: false,
    ducking: channel === 'bgm' || channel === 'ambient' ? 0.3 : 0,
  };
}

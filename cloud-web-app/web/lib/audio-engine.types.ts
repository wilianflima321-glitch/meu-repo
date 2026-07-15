import type { Howl } from 'howler';

export type AudioChannel = 'master' | 'bgm' | 'sfx' | 'ambient' | 'voice' | 'ui';

export interface AudioTrack {
    id: string;
    name: string;
    src: string | string[];
    channel: AudioChannel;
    volume: number;
    loop: boolean;
    sprite?: Record<string, [number, number, boolean?]>;
    preload?: boolean;
    html5?: boolean;
    format?: string[];
    metadata?: Record<string, unknown>;
}

export interface AudioInstance {
    id: string;
    trackId: string;
    howl: Howl;
    soundId?: number;
    channel: AudioChannel;
    state: 'loading' | 'playing' | 'paused' | 'stopped' | 'ended';
    position?: { x: number; y: number; z: number };
    fadeTarget?: number;
}

export interface ChannelConfig {
    volume: number;
    muted: boolean;
    ducking: number;
}

export interface AudioEffect {
    type: 'reverb' | 'delay' | 'eq' | 'compressor' | 'lowpass' | 'highpass';
    enabled: boolean;
    params: Record<string, number>;
}

export interface PlayOptions {
    volume?: number;
    channel?: AudioChannel;
    rate?: number;
    loop?: boolean;
    sprite?: string;
    fade?: number;
    position?: { x: number; y: number; z: number };
    onEnd?: () => void;
    onLoad?: () => void;
    onError?: (error: unknown) => void;
}

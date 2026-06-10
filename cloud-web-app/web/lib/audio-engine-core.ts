'use client';

import { Howl, Howler } from 'howler';

import { createComponentLogger, logger } from '@/lib/observability/logger';
import { DEFAULT_AUDIO_CHANNELS, DEFAULT_CROSSFADE_DURATION_MS, createDefaultChannelConfig, type AudioContextWindow } from './audio-engine.defaults';
import {
    calculateEffectiveVolume,
    createAudioInstanceId,
    resolveAudioSources,
} from './audio-engine.mix';
import type {
    AudioChannel,
    AudioInstance,
    AudioTrack,
    ChannelConfig,
    PlayOptions,
} from './audio-engine.types';

const log = createComponentLogger('audio-engine');

export class AethelAudioEngineCore {
    protected tracks: Map<string, AudioTrack> = new Map();
    protected instances: Map<string, AudioInstance> = new Map();
    protected channels: Map<AudioChannel, ChannelConfig> = new Map();
    protected playlist: string[] = [];
    protected playlistIndex = 0;
    protected playlistShuffle = false;
    protected crossfadeDuration = DEFAULT_CROSSFADE_DURATION_MS;
    protected duckingEnabled = true;
    protected listeners: Map<string, Set<(data: unknown) => void>> = new Map();
    protected audioContext: AudioContext | null = null;
    protected masterGain: GainNode | null = null;

    constructor() {
        this.initializeChannels();
        this.initializeWebAudio();

        log.info('🎵 Aethel Audio Engine initialized');
    }

    private initializeChannels(): void {
        DEFAULT_AUDIO_CHANNELS.forEach(channel => {
            this.channels.set(channel, createDefaultChannelConfig(channel));
        });
    }

    private initializeWebAudio(): void {
        try {
            const AudioContextCtor = window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
            if (!AudioContextCtor) {
                throw new Error('Web Audio API not available');
            }
            this.audioContext = new AudioContextCtor();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            // Resume on user interaction
            const resumeAudio = () => {
                if (this.audioContext?.state === 'suspended') {
                    this.audioContext.resume();
                }
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
            };

            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
        } catch (err) {
            logger.warn('Web Audio API not available:', err);
        }
    }

    protected updateDucking(): void {
        // Implemented by the mix layer.
    }

    protected playNextInPlaylist(): void {
        // Implemented by the mix layer.
    }

    // ========================================================================
    // EVENT SYSTEM
    // ========================================================================

    public on<T = unknown>(event: string, callback: (data: T) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback as (data: unknown) => void);

        return () => {
            this.listeners.get(event)?.delete(callback as (data: unknown) => void);
        };
    }

    protected emit(event: string, data: unknown): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    // ========================================================================
    // TRACK MANAGEMENT
    // ========================================================================

    /**
     * Registra uma track para uso futuro
     */
    public register(track: AudioTrack): void {
        this.tracks.set(track.id, track);
        this.emit('track-registered', track);

        // Preload if requested
        if (track.preload) {
            this.preload(track.id);
        }
    }

    /**
     * Registra múltiplas tracks
     */
    public registerBatch(tracks: AudioTrack[]): void {
        tracks.forEach(track => this.register(track));
    }

    /**
     * Remove uma track
     */
    public unregister(trackId: string): void {
        const track = this.tracks.get(trackId);
        if (!track) return;

        // Stop any playing instances
        this.stopByTrack(trackId);

        this.tracks.delete(trackId);
        this.emit('track-unregistered', { trackId });
    }

    /**
     * Preload uma track
     */
    public preload(trackId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const track = this.tracks.get(trackId);
            if (!track) {
                reject(new Error(`Track not found: ${trackId}`));
                return;
            }

            const howl = new Howl({
                src: resolveAudioSources(track.src),
                volume: 0,
                preload: true,
                format: track.format,
                onload: () => {
                    howl.unload();
                    resolve();
                },
                onloaderror: (_, error) => {
                    reject(error);
                }
            });
        });
    }

    // ========================================================================
    // PLAYBACK
    // ========================================================================

    /**
     * Reproduz uma track
     */
    public play(trackId: string, options: PlayOptions = {}): string {
        const track = this.tracks.get(trackId);
        if (!track) {
            throw new Error(`Track not found: ${trackId}`);
        }

        // Generate instance ID
        const instanceId = createAudioInstanceId(trackId);

        // Calculate effective volume
        const channelConfig = this.channels.get(track.channel)!;
        const masterConfig = this.channels.get('master')!;
        const effectiveVolume = calculateEffectiveVolume({
            track,
            options,
            channel: channelConfig,
            master: masterConfig,
        });

        // Create Howl instance
        const howl = new Howl({
            src: resolveAudioSources(track.src),
            volume: options.fade ? 0 : effectiveVolume,
            loop: options.loop ?? track.loop,
            sprite: track.sprite,
            html5: track.html5,
            format: track.format,
            rate: options.rate || 1,
            onplay: (soundId) => {
                const instance = this.instances.get(instanceId);
                if (instance) {
                    instance.soundId = soundId;
                    instance.state = 'playing';
                }
                this.emit('play', { instanceId, trackId });
                this.updateDucking();
            },
            onpause: () => {
                const instance = this.instances.get(instanceId);
                if (instance) instance.state = 'paused';
                this.emit('pause', { instanceId, trackId });
            },
            onstop: () => {
                const instance = this.instances.get(instanceId);
                if (instance) instance.state = 'stopped';
                this.emit('stop', { instanceId, trackId });
                this.updateDucking();
            },
            onend: () => {
                const instance = this.instances.get(instanceId);
                if (instance) instance.state = 'ended';
                this.emit('end', { instanceId, trackId });
                options.onEnd?.();

                // Handle playlist
                if (track.channel === 'bgm' && this.playlist.length > 0) {
                    this.playNextInPlaylist();
                }

                // Cleanup
                if (!howl.loop()) {
                    this.instances.delete(instanceId);
                }

                this.updateDucking();
            },
            onload: () => {
                options.onLoad?.();
            },
            onloaderror: (_, error) => {
                options.onError?.(error);
                this.emit('error', { instanceId, trackId, error });
            }
        });

        // Create instance
        const instance: AudioInstance = {
            id: instanceId,
            trackId,
            howl,
            channel: track.channel,
            state: 'loading',
            position: options.position
        };

        this.instances.set(instanceId, instance);

        // Play
        const soundId = options.sprite
            ? howl.play(options.sprite)
            : howl.play();

        instance.soundId = soundId;

        // Apply 3D position if provided
        if (options.position) {
            howl.pos(options.position.x, options.position.y, options.position.z, soundId);
        }

        // Fade in if requested
        if (options.fade) {
            howl.fade(0, effectiveVolume, options.fade, soundId);
        }

        return instanceId;
    }

    /**
     * Pausa uma instância
     */
    public pause(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.howl.pause(instance.soundId);
        }
    }

    /**
     * Resume uma instância pausada
     */
    public resume(instanceId?: string): void {
        if (instanceId) {
            const instance = this.instances.get(instanceId);
            if (instance && instance.state === 'paused') {
                instance.howl.play(instance.soundId);
            }
            return;
        }

        Howler.mute(false);
        this.audioContext?.resume();
        this.emit('resumed', {});
    }

    /**
     * Para uma instância
     */
    public stop(instanceId: string, fade?: number): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        if (fade) {
            instance.howl.fade(instance.howl.volume(), 0, fade, instance.soundId);
            setTimeout(() => {
                instance.howl.stop(instance.soundId);
                instance.howl.unload();
                this.instances.delete(instanceId);
            }, fade);
        } else {
            instance.howl.stop(instance.soundId);
            instance.howl.unload();
            this.instances.delete(instanceId);
        }
    }

    /**
     * Para todas as instâncias de uma track
     */
    public stopByTrack(trackId: string, fade?: number): void {
        this.instances.forEach((instance, id) => {
            if (instance.trackId === trackId) {
                this.stop(id, fade);
            }
        });
    }

    /**
     * Para todas as instâncias de um canal
     */
    public stopChannel(channel: AudioChannel, fade?: number): void {
        this.instances.forEach((instance, id) => {
            if (instance.channel === channel) {
                this.stop(id, fade);
            }
        });
    }

    /**
     * Para tudo
     */
    public stopAll(fade?: number): void {
        this.instances.forEach((_, id) => {
            this.stop(id, fade);
        });
    }

}

/**
 * AETHEL ENGINE - AUDIO ENGINE
 * ============================
 * 
 * Motor de áudio profissional usando Howler.js para preview
 * e Web Audio API para efeitos avançados.
 * 
 * Funcionalidades:
 * - Playback de música e efeitos sonoros
 * - Sistema de camadas de áudio (BGM, SFX, Ambient, Voice, UI)
 * - Mixagem com controle de volume por canal
 * - Efeitos: Reverb, Delay, EQ, Compressor
 * - Spatial Audio (3D posicional)
 * - Crossfade entre músicas
 * - Playlist e queue system
 * - Ducking automático para diálogos
 */

'use client';

import { Howl, Howler } from 'howler';

// ============================================================================
// TYPES
// ============================================================================

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
    metadata?: Record<string, any>;
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
    ducking: number; // 0-1, amount to duck when voice is playing
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
    onError?: (error: any) => void;
}

// ============================================================================
// AUDIO ENGINE CLASS
// ============================================================================

class AethelAudioEngine {
    private tracks: Map<string, AudioTrack> = new Map();
    private instances: Map<string, AudioInstance> = new Map();
    private channels: Map<AudioChannel, ChannelConfig> = new Map();
    private playlist: string[] = [];
    private playlistIndex = 0;
    private playlistShuffle = false;
    private crossfadeDuration = 2000;
    private duckingEnabled = true;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private effects: Map<AudioChannel, AudioEffect[]> = new Map();
    
    constructor() {
        this.initializeChannels();
        this.initializeWebAudio();
        
        console.log('🎵 Aethel Audio Engine initialized');
    }
    
    private initializeChannels(): void {
        const defaultChannels: AudioChannel[] = ['master', 'bgm', 'sfx', 'ambient', 'voice', 'ui'];
        
        defaultChannels.forEach(channel => {
            this.channels.set(channel, {
                volume: channel === 'master' ? 1 : 0.8,
                muted: false,
                ducking: channel === 'bgm' || channel === 'ambient' ? 0.3 : 0
            });
        });
    }
    
    private initializeWebAudio(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
            console.warn('Web Audio API not available:', err);
        }
    }
    
    // ========================================================================
    // EVENT SYSTEM
    // ========================================================================
    
    public on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }
    
    private emit(event: string, data: any): void {
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
                src: Array.isArray(track.src) ? track.src : [track.src],
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
        const instanceId = `${trackId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Calculate effective volume
        const channelConfig = this.channels.get(track.channel)!;
        const masterConfig = this.channels.get('master')!;
        const effectiveVolume = (options.volume ?? track.volume) * 
                               channelConfig.volume * 
                               masterConfig.volume;
        
        // Create Howl instance
        const howl = new Howl({
            src: Array.isArray(track.src) ? track.src : [track.src],
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
    
    // ========================================================================
    // VOLUME & MIXING
    // ========================================================================
    
    /**
     * Define volume de um canal
     */
    public setChannelVolume(channel: AudioChannel, volume: number): void {
        const config = this.channels.get(channel);
        if (!config) return;
        
        config.volume = Math.max(0, Math.min(1, volume));
        this.updateChannelVolumes(channel);
        this.emit('channel-volume', { channel, volume: config.volume });
    }
    
    /**
     * Obtém volume de um canal
     */
    public getChannelVolume(channel: AudioChannel): number {
        return this.channels.get(channel)?.volume ?? 0;
    }
    
    /**
     * Muta/desmuta um canal
     */
    public muteChannel(channel: AudioChannel, muted: boolean): void {
        const config = this.channels.get(channel);
        if (!config) return;
        
        config.muted = muted;
        this.updateChannelVolumes(channel);
        this.emit('channel-mute', { channel, muted });
    }
    
    /**
     * Define volume master
     */
    public setMasterVolume(volume: number): void {
        this.setChannelVolume('master', volume);
        Howler.volume(volume);
    }
    
    /**
     * Define volume de uma instância
     */
    public setInstanceVolume(instanceId: string, volume: number, fade?: number): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;
        
        const channelConfig = this.channels.get(instance.channel)!;
        const masterConfig = this.channels.get('master')!;
        const effectiveVolume = volume * channelConfig.volume * masterConfig.volume;
        
        if (fade) {
            instance.howl.fade(instance.howl.volume(), effectiveVolume, fade, instance.soundId);
        } else {
            instance.howl.volume(effectiveVolume, instance.soundId);
        }
    }
    
    private updateChannelVolumes(channel: AudioChannel): void {
        const channelConfig = this.channels.get(channel)!;
        const masterConfig = this.channels.get('master')!;
        
        this.instances.forEach(instance => {
            if (instance.channel === channel || channel === 'master') {
                const instChannel = this.channels.get(instance.channel)!;
                const volume = instChannel.muted || masterConfig.muted
                    ? 0
                    : instChannel.volume * masterConfig.volume;
                
                instance.howl.volume(volume, instance.soundId);
            }
        });
    }
    
    // ========================================================================
    // DUCKING (Auto-lower BGM when voice plays)
    // ========================================================================
    
    private updateDucking(): void {
        if (!this.duckingEnabled) return;
        
        // Check if any voice is playing
        let voicePlaying = false;
        this.instances.forEach(instance => {
            if (instance.channel === 'voice' && instance.state === 'playing') {
                voicePlaying = true;
            }
        });
        
        // Duck other channels
        this.channels.forEach((config, channel) => {
            if (config.ducking > 0) {
                const targetVolume = voicePlaying 
                    ? config.volume * (1 - config.ducking)
                    : config.volume;
                
                this.instances.forEach(instance => {
                    if (instance.channel === channel) {
                        const masterConfig = this.channels.get('master')!;
                        instance.howl.fade(
                            instance.howl.volume(),
                            targetVolume * masterConfig.volume,
                            200,
                            instance.soundId
                        );
                    }
                });
            }
        });
    }
    
    /**
     * Habilita/desabilita ducking automático
     */
    public setDuckingEnabled(enabled: boolean): void {
        this.duckingEnabled = enabled;
        if (!enabled) {
            // Restore volumes
            this.channels.forEach((_, channel) => {
                this.updateChannelVolumes(channel);
            });
        }
    }
    
    // ========================================================================
    // SPATIAL AUDIO
    // ========================================================================
    
    /**
     * Define posição do listener (câmera/jogador)
     */
    public setListenerPosition(x: number, y: number, z: number): void {
        Howler.pos(x, y, z);
    }
    
    /**
     * Define orientação do listener
     */
    public setListenerOrientation(
        forwardX: number, forwardY: number, forwardZ: number,
        upX: number, upY: number, upZ: number
    ): void {
        Howler.orientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
    
    /**
     * Define posição de uma instância de áudio
     */
    public setInstancePosition(instanceId: string, x: number, y: number, z: number): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.position = { x, y, z };
            instance.howl.pos(x, y, z, instance.soundId);
        }
    }
    
    // ========================================================================
    // PLAYLIST
    // ========================================================================
    
    /**
     * Define playlist de músicas
     */
    public setPlaylist(trackIds: string[], shuffle = false): void {
        this.playlist = [...trackIds];
        this.playlistShuffle = shuffle;
        this.playlistIndex = 0;
        
        if (shuffle) {
            this.shufflePlaylist();
        }
        
        this.emit('playlist-set', { tracks: this.playlist, shuffle });
    }
    
    /**
     * Inicia a playlist
     */
    public startPlaylist(): void {
        if (this.playlist.length === 0) return;
        
        this.stopChannel('bgm', this.crossfadeDuration);
        
        setTimeout(() => {
            this.play(this.playlist[this.playlistIndex], {
                channel: 'bgm' as any,
                fade: this.crossfadeDuration / 2
            });
        }, this.crossfadeDuration / 2);
    }
    
    /**
     * Próxima música da playlist
     */
    public playNextInPlaylist(): void {
        this.playlistIndex = (this.playlistIndex + 1) % this.playlist.length;
        
        // Crossfade
        this.stopChannel('bgm', this.crossfadeDuration);
        
        setTimeout(() => {
            this.play(this.playlist[this.playlistIndex], {
                fade: this.crossfadeDuration / 2
            });
        }, this.crossfadeDuration / 2);
    }
    
    /**
     * Música anterior da playlist
     */
    public playPreviousInPlaylist(): void {
        this.playlistIndex = this.playlistIndex === 0 
            ? this.playlist.length - 1 
            : this.playlistIndex - 1;
        
        this.stopChannel('bgm', this.crossfadeDuration);
        
        setTimeout(() => {
            this.play(this.playlist[this.playlistIndex], {
                fade: this.crossfadeDuration / 2
            });
        }, this.crossfadeDuration / 2);
    }
    
    private shufflePlaylist(): void {
        for (let i = this.playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
        }
    }
    
    /**
     * Define duração do crossfade
     */
    public setCrossfadeDuration(ms: number): void {
        this.crossfadeDuration = ms;
    }
    
    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    /**
     * Obtém estado atual de uma instância
     */
    public getInstanceState(instanceId: string): AudioInstance | undefined {
        return this.instances.get(instanceId);
    }
    
    /**
     * Obtém todas as instâncias ativas
     */
    public getActiveInstances(): AudioInstance[] {
        return Array.from(this.instances.values()).filter(i => i.state === 'playing');
    }
    
    /**
     * Obtém progresso de uma instância (0-1)
     */
    public getProgress(instanceId: string): number {
        const instance = this.instances.get(instanceId);
        if (!instance) return 0;
        
        const seek = instance.howl.seek(instance.soundId) as number;
        const duration = instance.howl.duration(instance.soundId);
        
        return duration > 0 ? seek / duration : 0;
    }
    
    /**
     * Define posição de seek
     */
    public seek(instanceId: string, position: number): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.howl.seek(position, instance.soundId);
        }
    }
    
    /**
     * Obtém duração de uma track
     */
    public getDuration(instanceId: string): number {
        const instance = this.instances.get(instanceId);
        return instance?.howl.duration(instance.soundId) || 0;
    }
    
    /**
     * Obtém todas as tracks registradas
     */
    public getTracks(): AudioTrack[] {
        return Array.from(this.tracks.values());
    }
    
    /**
     * Obtém configuração de canais
     */
    public getChannelConfig(): Map<AudioChannel, ChannelConfig> {
        return new Map(this.channels);
    }
    
    /**
     * Suspende todo o áudio
     */
    public suspend(): void {
        Howler.mute(true);
        this.audioContext?.suspend();
        this.emit('suspended', {});
    }
    
    
    /**
     * Limpa tudo
     */
    public dispose(): void {
        this.stopAll();
        Howler.unload();
        this.audioContext?.close();
        this.tracks.clear();
        this.instances.clear();
        this.listeners.clear();
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let audioEngineInstance: AethelAudioEngine | null = null;

export function getAudioEngine(): AethelAudioEngine {
    if (!audioEngineInstance) {
        audioEngineInstance = new AethelAudioEngine();
    }
    return audioEngineInstance;
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useAudio() {
    const engine = useMemo(() => getAudioEngine(), []);
    const [activeInstances, setActiveInstances] = useState<AudioInstance[]>([]);
    const [channelVolumes, setChannelVolumes] = useState<Record<AudioChannel, number>>({
        master: 1,
        bgm: 0.8,
        sfx: 0.8,
        ambient: 0.8,
        voice: 0.8,
        ui: 0.8
    });
    
    useEffect(() => {
        const updateInstances = () => {
            setActiveInstances(engine.getActiveInstances());
        };
        
        const updateVolume = (data: { channel: AudioChannel; volume: number }) => {
            setChannelVolumes(prev => ({ ...prev, [data.channel]: data.volume }));
        };
        
        const unsub1 = engine.on('play', updateInstances);
        const unsub2 = engine.on('stop', updateInstances);
        const unsub3 = engine.on('end', updateInstances);
        const unsub4 = engine.on('channel-volume', updateVolume);
        
        return () => {
            unsub1();
            unsub2();
            unsub3();
            unsub4();
        };
    }, [engine]);
    
    const play = useCallback((trackId: string, options?: PlayOptions) => {
        return engine.play(trackId, options);
    }, [engine]);
    
    const stop = useCallback((instanceId: string, fade?: number) => {
        engine.stop(instanceId, fade);
    }, [engine]);
    
    const pause = useCallback((instanceId: string) => {
        engine.pause(instanceId);
    }, [engine]);
    
    const resume = useCallback((instanceId: string) => {
        engine.resume(instanceId);
    }, [engine]);
    
    const setVolume = useCallback((channel: AudioChannel, volume: number) => {
        engine.setChannelVolume(channel, volume);
    }, [engine]);
    
    const register = useCallback((track: AudioTrack) => {
        engine.register(track);
    }, [engine]);
    
    return {
        engine,
        activeInstances,
        channelVolumes,
        play,
        stop,
        pause,
        resume,
        setVolume,
        register,
        setPlaylist: engine.setPlaylist.bind(engine),
        startPlaylist: engine.startPlaylist.bind(engine),
        nextTrack: engine.playNextInPlaylist.bind(engine),
        prevTrack: engine.playPreviousInPlaylist.bind(engine)
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AethelAudioEngine };

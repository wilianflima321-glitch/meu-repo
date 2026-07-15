'use client';

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
import { Howler } from 'howler';

import { AethelAudioEngineCore } from './audio-engine-core';
import {
    calculateChannelOutputVolume,
    calculateDuckedVolume,
    calculateInstanceVolume,
    clampVolume,
    hasPlayingVoice,
    nextPlaylistIndex,
    previousPlaylistIndex,
    shufflePlaylist,
} from './audio-engine.mix';
import type {
    AudioChannel,
    AudioInstance,
    AudioTrack,
    ChannelConfig,
} from './audio-engine.types';

export type {
    AudioChannel,
    AudioEffect,
    AudioInstance,
    AudioTrack,
    ChannelConfig,
    PlayOptions,
} from './audio-engine.types';

// ============================================================================
// AUDIO ENGINE CLASS
// ============================================================================

class AethelAudioEngine extends AethelAudioEngineCore {
    // ========================================================================
    // VOLUME & MIXING
    // ========================================================================

    /**
     * Define volume de um canal
     */
    public setChannelVolume(channel: AudioChannel, volume: number): void {
        const config = this.channels.get(channel);
        if (!config) return;

        config.volume = clampVolume(volume);
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
        const effectiveVolume = calculateInstanceVolume({
            volume,
            channel: channelConfig,
            master: masterConfig,
        });

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
                const volume = calculateChannelOutputVolume({
                    channel: instChannel,
                    master: masterConfig,
                });

                instance.howl.volume(volume, instance.soundId);
            }
        });
    }

    // ========================================================================
    // DUCKING (Auto-lower BGM when voice plays)
    // ========================================================================

    protected override updateDucking(): void {
        if (!this.duckingEnabled) return;

        // Check if any voice is playing
        const voicePlaying = hasPlayingVoice(this.instances.values());

        // Duck other channels
        this.channels.forEach((config, channel) => {
            if (config.ducking > 0) {
                this.instances.forEach(instance => {
                    if (instance.channel === channel) {
                        const masterConfig = this.channels.get('master')!;
                        const targetVolume = calculateDuckedVolume({
                            channel: config,
                            master: masterConfig,
                            voicePlaying,
                        });
                        instance.howl.fade(
                            instance.howl.volume(),
                            targetVolume,
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
            this.playlist = shufflePlaylist(this.playlist);
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
                channel: 'bgm',
                fade: this.crossfadeDuration / 2
            });
        }, this.crossfadeDuration / 2);
    }

    /**
     * Próxima música da playlist
     */
    public playNextInPlaylist(): void {
        this.playlistIndex = nextPlaylistIndex(this.playlistIndex, this.playlist.length);

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
        this.playlistIndex = previousPlaylistIndex(this.playlistIndex, this.playlist.length);

        this.stopChannel('bgm', this.crossfadeDuration);

        setTimeout(() => {
            this.play(this.playlist[this.playlistIndex], {
                fade: this.crossfadeDuration / 2
            });
        }, this.crossfadeDuration / 2);
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

export { useAudio } from './audio-engine-react';

// ============================================================================
// EXPORTS
// ============================================================================

export { AethelAudioEngine };

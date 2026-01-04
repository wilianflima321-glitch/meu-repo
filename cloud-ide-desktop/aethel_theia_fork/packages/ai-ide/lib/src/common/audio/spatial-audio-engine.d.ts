import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * AETHEL SPATIAL AUDIO ENGINE
 * ============================================================================
 *
 * Sistema de áudio 3D AAA completo:
 * - HRTF (Head-Related Transfer Function) para binaural 3D
 * - Reverb dinâmico baseado em geometria
 * - Oclusão e obstrução de som
 * - Propagação de som (portais, reflexões)
 * - Mixer com DSP effects
 * - Music system (layers, transitions)
 * - Voice management (dialogue, VO)
 * - Ambisonics support
 * - Real-time audio analysis
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}
export interface AudioSourceConfig {
    /** Audio file or buffer */
    source: string | AudioBuffer;
    /** Volume (0-1) */
    volume: number;
    /** Pitch multiplier */
    pitch: number;
    /** Loop */
    loop: boolean;
    /** Spatial settings */
    spatial: {
        enabled: boolean;
        position: Vector3;
        /** Min distance (full volume) */
        minDistance: number;
        /** Max distance (silence) */
        maxDistance: number;
        /** Rolloff model */
        rolloff: 'linear' | 'inverse' | 'exponential' | 'custom';
        /** Custom rolloff curve */
        customRolloff?: {
            distance: number;
            volume: number;
        }[];
        /** Directional cone */
        cone?: {
            innerAngle: number;
            outerAngle: number;
            outerVolume: number;
            direction: Vector3;
        };
    };
    /** Mixer channel */
    channel: string;
    /** Priority (for voice limiting) */
    priority: number;
    /** Occlusion */
    occlusionEnabled: boolean;
}
export interface AudioSource {
    id: string;
    config: AudioSourceConfig;
    state: 'stopped' | 'playing' | 'paused';
    currentTime: number;
    duration: number;
    /** Runtime data */
    gainNode?: GainNode;
    pannerNode?: PannerNode;
    sourceNode?: AudioBufferSourceNode;
    /** Calculated values */
    effectiveVolume: number;
    occlusionFactor: number;
    reverbMix: number;
}
export interface AudioListener {
    position: Vector3;
    forward: Vector3;
    up: Vector3;
    velocity: Vector3;
}
export interface ReverbZone {
    id: string;
    bounds: {
        min: Vector3;
        max: Vector3;
    };
    /** Reverb parameters */
    preset: ReverbPreset | 'custom';
    customParams?: {
        decayTime: number;
        earlyReflectionsDelay: number;
        earlyReflectionsGain: number;
        lateReflectionsDelay: number;
        lateReflectionsGain: number;
        diffusion: number;
        density: number;
        lowFrequencyDecay: number;
        highFrequencyDecay: number;
        preDelay: number;
    };
    /** Blend weight */
    weight: number;
    /** Priority */
    priority: number;
}
export declare enum ReverbPreset {
    None = "none",
    Room = "room",
    Hall = "hall",
    Cave = "cave",
    Arena = "arena",
    Forest = "forest",
    Underwater = "underwater",
    Bathroom = "bathroom",
    Church = "church",
    Hangar = "hangar"
}
export interface OcclusionSettings {
    enabled: boolean;
    /** Ray count for occlusion check */
    rayCount: number;
    /** Low-pass filter frequency when occluded */
    occludedFrequency: number;
    /** Volume reduction when occluded */
    occludedVolumeReduction: number;
    /** Obstruction (partial blocking) */
    obstructionEnabled: boolean;
}
export interface OcclusionResult {
    sourceId: string;
    occlusionFactor: number;
    obstructionFactor: number;
    materialAbsorption: number;
}
export interface SoundPortal {
    id: string;
    position: Vector3;
    normal: Vector3;
    size: {
        width: number;
        height: number;
    };
    /** Connected rooms */
    roomA: string;
    roomB: string;
    /** Transmission loss */
    transmissionLoss: number;
    /** Open state (for doors) */
    openness: number;
}
export interface PropagationPath {
    sourceId: string;
    listenerId: string;
    /** Path segments */
    segments: {
        type: 'direct' | 'reflection' | 'portal' | 'diffraction';
        distance: number;
        attenuation: number;
        delay: number;
    }[];
    /** Total values */
    totalDistance: number;
    totalAttenuation: number;
    totalDelay: number;
}
export interface MixerChannel {
    id: string;
    name: string;
    /** Volume */
    volume: number;
    /** Mute/Solo */
    muted: boolean;
    soloed: boolean;
    /** Effects chain */
    effects: AudioEffect[];
    /** Output bus */
    outputBus: string;
    /** Ducking */
    ducking?: {
        sideChainInput: string;
        threshold: number;
        ratio: number;
        attack: number;
        release: number;
    };
}
export interface AudioEffect {
    type: 'eq' | 'compressor' | 'limiter' | 'reverb' | 'delay' | 'chorus' | 'flanger' | 'distortion' | 'lowpass' | 'highpass';
    enabled: boolean;
    params: Record<string, number>;
}
export interface MusicTrack {
    id: string;
    /** Layers (stems) */
    layers: {
        name: string;
        source: string;
        volume: number;
        enabled: boolean;
    }[];
    /** BPM for synchronization */
    bpm: number;
    /** Time signature */
    timeSignature: {
        beats: number;
        noteValue: number;
    };
    /** Loop points */
    loopStart: number;
    loopEnd: number;
    /** Transition points (beats where transitions are allowed) */
    transitionPoints: number[];
    /** Tags for dynamic selection */
    tags: string[];
    /** Intensity level (for adaptive music) */
    intensity: number;
}
export interface MusicState {
    currentTrack?: string;
    currentBeat: number;
    currentMeasure: number;
    /** Active layers */
    activeLayers: Set<string>;
    /** Pending transition */
    pendingTransition?: {
        targetTrack: string;
        transitionType: 'immediate' | 'next_beat' | 'next_measure' | 'crossfade';
        crossfadeDuration?: number;
    };
}
export interface DialogueLine {
    id: string;
    audioFile: string;
    text: string;
    speaker: string;
    duration: number;
    /** Lip sync data */
    lipSyncData?: {
        visemes: {
            time: number;
            viseme: string;
        }[];
    };
    /** Subtitles */
    subtitleKey?: string;
    /** Priority */
    priority: number;
}
export interface DialogueQueue {
    lines: DialogueLine[];
    currentIndex: number;
    state: 'idle' | 'playing' | 'waiting';
}
export declare class SpatialAudioEngine {
    private audioContext?;
    private masterGain?;
    private listener;
    private sources;
    private audioBufferCache;
    private channels;
    private channelNodes;
    private reverbZones;
    private convolverNodes;
    private currentReverbMix;
    private occlusionSettings;
    private portals;
    private propagationCache;
    private musicState;
    private musicTracks;
    private dialogueQueue;
    private hrtfEnabled;
    private hrtfPanner?;
    private readonly onSourceEndedEmitter;
    readonly onSourceEnded: Event<string>;
    private readonly onDialogueLineEndedEmitter;
    readonly onDialogueLineEnded: Event<DialogueLine>;
    private readonly onMusicTransitionEmitter;
    readonly onMusicTransition: Event<{
        from?: string;
        to: string;
    }>;
    initialize(): Promise<void>;
    private setupDefaultChannels;
    private loadHRTF;
    private startUpdateLoop;
    dispose(): void;
    setListenerTransform(position: Vector3, forward: Vector3, up: Vector3): void;
    setListenerVelocity(velocity: Vector3): void;
    playSource(config: AudioSourceConfig): Promise<string>;
    stopSource(sourceId: string): void;
    pauseSource(sourceId: string): void;
    setSourcePosition(sourceId: string, position: Vector3): void;
    setSourceVolume(sourceId: string, volume: number): void;
    private loadAudioBuffer;
    private getDistanceModel;
    createChannel(config: MixerChannel): void;
    setChannelVolume(channelId: string, volume: number): void;
    setChannelMuted(channelId: string, muted: boolean): void;
    private getChannelInput;
    private getChannelOutput;
    private updateChannelState;
    private createEffectNode;
    addReverbZone(zone: ReverbZone): void;
    removeReverbZone(zoneId: string): void;
    private updateReverbForListener;
    private updateReverbConvolver;
    private isPointInBox;
    setOcclusionCallback(callback: (from: Vector3, to: Vector3) => number): void;
    private occlusionRaycast?;
    private updateOcclusion;
    private calculateOcclusion;
    private applyOcclusionFilter;
    addPortal(portal: SoundPortal): void;
    removePortal(portalId: string): void;
    private calculatePropagationPath;
    loadMusicTrack(track: MusicTrack): void;
    playMusic(trackId: string, fadeInDuration?: number): Promise<void>;
    transitionToMusic(trackId: string, transitionType: 'immediate' | 'next_beat' | 'next_measure' | 'crossfade', crossfadeDuration?: number): void;
    setMusicLayerEnabled(layerName: string, enabled: boolean): void;
    private executeMusicTransition;
    queueDialogue(lines: DialogueLine[]): void;
    private playNextDialogue;
    skipDialogue(): void;
    private update;
    private updateMusicBeat;
    private checkMusicTransition;
    private generateSourceId;
    private distance;
    private lerp;
    getStatistics(): AudioStatistics;
}
export interface AudioStatistics {
    activeSources: number;
    channelCount: number;
    reverbZoneCount: number;
    portalCount: number;
    musicState: string;
    dialogueState: string;
    hrtfEnabled: boolean;
}

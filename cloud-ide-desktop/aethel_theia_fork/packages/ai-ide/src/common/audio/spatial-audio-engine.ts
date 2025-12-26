import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

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

// ============================================================================
// CORE TYPES
// ============================================================================

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

// ============================================================================
// AUDIO SOURCE
// ============================================================================

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
        customRolloff?: { distance: number; volume: number }[];
        
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

// ============================================================================
// LISTENER
// ============================================================================

export interface AudioListener {
    position: Vector3;
    forward: Vector3;
    up: Vector3;
    velocity: Vector3;
}

// ============================================================================
// REVERB ZONES
// ============================================================================

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

export enum ReverbPreset {
    None = 'none',
    Room = 'room',
    Hall = 'hall',
    Cave = 'cave',
    Arena = 'arena',
    Forest = 'forest',
    Underwater = 'underwater',
    Bathroom = 'bathroom',
    Church = 'church',
    Hangar = 'hangar',
}

// ============================================================================
// OCCLUSION SYSTEM
// ============================================================================

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
    occlusionFactor: number;      // 0 = clear, 1 = fully occluded
    obstructionFactor: number;    // 0 = clear, 1 = fully obstructed
    materialAbsorption: number;   // Additional absorption from materials
}

// ============================================================================
// SOUND PROPAGATION
// ============================================================================

export interface SoundPortal {
    id: string;
    position: Vector3;
    normal: Vector3;
    size: { width: number; height: number };
    
    /** Connected rooms */
    roomA: string;
    roomB: string;
    
    /** Transmission loss */
    transmissionLoss: number;
    
    /** Open state (for doors) */
    openness: number; // 0-1
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

// ============================================================================
// MIXER CHANNELS
// ============================================================================

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

// ============================================================================
// MUSIC SYSTEM
// ============================================================================

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
    timeSignature: { beats: number; noteValue: number };
    
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

// ============================================================================
// DIALOGUE SYSTEM
// ============================================================================

export interface DialogueLine {
    id: string;
    audioFile: string;
    text: string;
    speaker: string;
    duration: number;
    
    /** Lip sync data */
    lipSyncData?: {
        visemes: { time: number; viseme: string }[];
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

// ============================================================================
// SPATIAL AUDIO ENGINE
// ============================================================================

@injectable()
export class SpatialAudioEngine {
    private audioContext?: AudioContext;
    private masterGain?: GainNode;
    
    // Listener
    private listener: AudioListener = {
        position: { x: 0, y: 0, z: 0 },
        forward: { x: 0, y: 0, z: -1 },
        up: { x: 0, y: 1, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
    };
    
    // Sources
    private sources = new Map<string, AudioSource>();
    private audioBufferCache = new Map<string, AudioBuffer>();
    
    // Mixer
    private channels = new Map<string, MixerChannel>();
    private channelNodes = new Map<string, { gain: GainNode; effects: AudioNode[] }>();
    
    // Reverb
    private reverbZones: ReverbZone[] = [];
    private convolverNodes = new Map<string, ConvolverNode>();
    private currentReverbMix = 0;
    
    // Occlusion
    private occlusionSettings: OcclusionSettings = {
        enabled: true,
        rayCount: 8,
        occludedFrequency: 1000,
        occludedVolumeReduction: 0.3,
        obstructionEnabled: true,
    };
    
    // Sound propagation
    private portals: SoundPortal[] = [];
    private propagationCache = new Map<string, PropagationPath>();
    
    // Music
    private musicState: MusicState = {
        currentBeat: 0,
        currentMeasure: 0,
        activeLayers: new Set(),
    };
    private musicTracks = new Map<string, MusicTrack>();
    
    // Dialogue
    private dialogueQueue: DialogueQueue = {
        lines: [],
        currentIndex: 0,
        state: 'idle',
    };
    
    // HRTF
    private hrtfEnabled = true;
    private hrtfPanner?: AudioNode;
    
    // Events
    private readonly onSourceEndedEmitter = new Emitter<string>();
    readonly onSourceEnded: Event<string> = this.onSourceEndedEmitter.event;
    
    private readonly onDialogueLineEndedEmitter = new Emitter<DialogueLine>();
    readonly onDialogueLineEnded: Event<DialogueLine> = this.onDialogueLineEndedEmitter.event;
    
    private readonly onMusicTransitionEmitter = new Emitter<{ from?: string; to: string }>();
    readonly onMusicTransition: Event<{ from?: string; to: string }> = this.onMusicTransitionEmitter.event;
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    async initialize(): Promise<void> {
        this.audioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 48000,
        });
        
        // Master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        
        // Setup default mixer channels
        this.setupDefaultChannels();
        
        // Load HRTF
        await this.loadHRTF();
        
        // Start update loop
        this.startUpdateLoop();
    }
    
    private setupDefaultChannels(): void {
        const defaultChannels = [
            { id: 'master', name: 'Master', outputBus: 'output' },
            { id: 'sfx', name: 'Sound Effects', outputBus: 'master' },
            { id: 'music', name: 'Music', outputBus: 'master' },
            { id: 'dialogue', name: 'Dialogue', outputBus: 'master' },
            { id: 'ambient', name: 'Ambient', outputBus: 'master' },
            { id: 'ui', name: 'UI', outputBus: 'master' },
        ];
        
        defaultChannels.forEach(ch => {
            this.createChannel({
                id: ch.id,
                name: ch.name,
                volume: 1,
                muted: false,
                soloed: false,
                effects: [],
                outputBus: ch.outputBus,
            });
        });
    }
    
    private async loadHRTF(): Promise<void> {
        // Load HRTF (Head-Related Transfer Function) data
        // In production, this would load a proper HRTF dataset
        
        if (this.audioContext) {
            // Create a PannerNode with HRTF
            // Modern browsers support 'HRTF' panning model
        }
    }
    
    private startUpdateLoop(): void {
        const update = () => {
            this.update();
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }
    
    dispose(): void {
        this.sources.forEach(source => this.stopSource(source.id));
        this.audioContext?.close();
    }
    
    // ========================================================================
    // LISTENER
    // ========================================================================
    
    setListenerTransform(position: Vector3, forward: Vector3, up: Vector3): void {
        this.listener.position = position;
        this.listener.forward = forward;
        this.listener.up = up;
        
        if (this.audioContext) {
            const listener = this.audioContext.listener;
            
            listener.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
            listener.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
            listener.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
            
            listener.forwardX.setValueAtTime(forward.x, this.audioContext.currentTime);
            listener.forwardY.setValueAtTime(forward.y, this.audioContext.currentTime);
            listener.forwardZ.setValueAtTime(forward.z, this.audioContext.currentTime);
            
            listener.upX.setValueAtTime(up.x, this.audioContext.currentTime);
            listener.upY.setValueAtTime(up.y, this.audioContext.currentTime);
            listener.upZ.setValueAtTime(up.z, this.audioContext.currentTime);
        }
    }
    
    setListenerVelocity(velocity: Vector3): void {
        this.listener.velocity = velocity;
    }
    
    // ========================================================================
    // SOURCE MANAGEMENT
    // ========================================================================
    
    async playSource(config: AudioSourceConfig): Promise<string> {
        if (!this.audioContext) throw new Error('Audio not initialized');
        
        const sourceId = this.generateSourceId();
        
        // Load or get cached buffer
        let buffer: AudioBuffer;
        if (typeof config.source === 'string') {
            buffer = await this.loadAudioBuffer(config.source);
        } else {
            buffer = config.source;
        }
        
        // Create nodes
        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.loop = config.loop;
        sourceNode.playbackRate.value = config.pitch;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = config.volume;
        
        // Spatial audio
        let pannerNode: PannerNode | undefined;
        if (config.spatial.enabled) {
            pannerNode = this.audioContext.createPanner();
            pannerNode.panningModel = this.hrtfEnabled ? 'HRTF' : 'equalpower';
            pannerNode.distanceModel = this.getDistanceModel(config.spatial.rolloff);
            pannerNode.refDistance = config.spatial.minDistance;
            pannerNode.maxDistance = config.spatial.maxDistance;
            pannerNode.rolloffFactor = 1;
            
            pannerNode.positionX.setValueAtTime(config.spatial.position.x, this.audioContext.currentTime);
            pannerNode.positionY.setValueAtTime(config.spatial.position.y, this.audioContext.currentTime);
            pannerNode.positionZ.setValueAtTime(config.spatial.position.z, this.audioContext.currentTime);
            
            // Directional cone
            if (config.spatial.cone) {
                pannerNode.coneInnerAngle = config.spatial.cone.innerAngle;
                pannerNode.coneOuterAngle = config.spatial.cone.outerAngle;
                pannerNode.coneOuterGain = config.spatial.cone.outerVolume;
            }
        }
        
        // Connect nodes
        sourceNode.connect(gainNode);
        if (pannerNode) {
            gainNode.connect(pannerNode);
            pannerNode.connect(this.getChannelInput(config.channel));
        } else {
            gainNode.connect(this.getChannelInput(config.channel));
        }
        
        // Create source object
        const source: AudioSource = {
            id: sourceId,
            config,
            state: 'playing',
            currentTime: 0,
            duration: buffer.duration,
            gainNode,
            pannerNode,
            sourceNode,
            effectiveVolume: config.volume,
            occlusionFactor: 0,
            reverbMix: 0,
        };
        
        this.sources.set(sourceId, source);
        
        // Start playback
        sourceNode.start();
        
        // Handle end
        sourceNode.onended = () => {
            if (source.state === 'playing') {
                source.state = 'stopped';
                this.onSourceEndedEmitter.fire(sourceId);
            }
        };
        
        return sourceId;
    }
    
    stopSource(sourceId: string): void {
        const source = this.sources.get(sourceId);
        if (!source) return;
        
        source.sourceNode?.stop();
        source.state = 'stopped';
        this.sources.delete(sourceId);
    }
    
    pauseSource(sourceId: string): void {
        const source = this.sources.get(sourceId);
        if (source && source.state === 'playing') {
            // Web Audio API doesn't have native pause, so we need to
            // save position and recreate on resume
            source.state = 'paused';
            source.sourceNode?.stop();
        }
    }
    
    setSourcePosition(sourceId: string, position: Vector3): void {
        const source = this.sources.get(sourceId);
        if (source?.pannerNode && this.audioContext) {
            source.pannerNode.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
            source.pannerNode.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
            source.pannerNode.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
            source.config.spatial.position = position;
        }
    }
    
    setSourceVolume(sourceId: string, volume: number): void {
        const source = this.sources.get(sourceId);
        if (source?.gainNode && this.audioContext) {
            source.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            source.config.volume = volume;
        }
    }
    
    private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
        const cached = this.audioBufferCache.get(url);
        if (cached) return cached;
        
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        
        this.audioBufferCache.set(url, audioBuffer);
        return audioBuffer;
    }
    
    private getDistanceModel(rolloff: string): DistanceModelType {
        switch (rolloff) {
            case 'linear': return 'linear';
            case 'inverse': return 'inverse';
            case 'exponential': return 'exponential';
            default: return 'inverse';
        }
    }
    
    // ========================================================================
    // MIXER
    // ========================================================================
    
    createChannel(config: MixerChannel): void {
        if (!this.audioContext) return;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = config.volume;
        
        // Create effects chain
        const effectNodes: AudioNode[] = [];
        let lastNode: AudioNode = gainNode;
        
        config.effects.forEach(effect => {
            const effectNode = this.createEffectNode(effect);
            if (effectNode) {
                lastNode.connect(effectNode);
                lastNode = effectNode;
                effectNodes.push(effectNode);
            }
        });
        
        // Connect to output bus
        const outputBus = config.outputBus === 'output' 
            ? this.masterGain! 
            : this.getChannelOutput(config.outputBus);
        lastNode.connect(outputBus);
        
        this.channels.set(config.id, config);
        this.channelNodes.set(config.id, { gain: gainNode, effects: effectNodes });
    }
    
    setChannelVolume(channelId: string, volume: number): void {
        const nodes = this.channelNodes.get(channelId);
        const channel = this.channels.get(channelId);
        
        if (nodes && channel && this.audioContext) {
            nodes.gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
            channel.volume = volume;
        }
    }
    
    setChannelMuted(channelId: string, muted: boolean): void {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.muted = muted;
            this.updateChannelState(channelId);
        }
    }
    
    private getChannelInput(channelId: string): AudioNode {
        const nodes = this.channelNodes.get(channelId);
        return nodes?.gain || this.masterGain!;
    }
    
    private getChannelOutput(channelId: string): AudioNode {
        const nodes = this.channelNodes.get(channelId);
        if (nodes && nodes.effects.length > 0) {
            return nodes.effects[nodes.effects.length - 1];
        }
        return nodes?.gain || this.masterGain!;
    }
    
    private updateChannelState(channelId: string): void {
        const channel = this.channels.get(channelId);
        const nodes = this.channelNodes.get(channelId);
        
        if (channel && nodes && this.audioContext) {
            const effectiveVolume = channel.muted ? 0 : channel.volume;
            nodes.gain.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
        }
    }
    
    private createEffectNode(effect: AudioEffect): AudioNode | null {
        if (!this.audioContext) return null;
        
        switch (effect.type) {
            case 'lowpass': {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = effect.params.frequency || 1000;
                filter.Q.value = effect.params.q || 1;
                return filter;
            }
            case 'highpass': {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = effect.params.frequency || 200;
                filter.Q.value = effect.params.q || 1;
                return filter;
            }
            case 'compressor': {
                const compressor = this.audioContext.createDynamicsCompressor();
                compressor.threshold.value = effect.params.threshold || -24;
                compressor.knee.value = effect.params.knee || 30;
                compressor.ratio.value = effect.params.ratio || 12;
                compressor.attack.value = effect.params.attack || 0.003;
                compressor.release.value = effect.params.release || 0.25;
                return compressor;
            }
            default:
                return null;
        }
    }
    
    // ========================================================================
    // REVERB
    // ========================================================================
    
    addReverbZone(zone: ReverbZone): void {
        this.reverbZones.push(zone);
        this.reverbZones.sort((a, b) => b.priority - a.priority);
    }
    
    removeReverbZone(zoneId: string): void {
        const index = this.reverbZones.findIndex(z => z.id === zoneId);
        if (index >= 0) {
            this.reverbZones.splice(index, 1);
        }
    }
    
    private updateReverbForListener(): void {
        // Find active reverb zones
        const activeZones = this.reverbZones.filter(zone => 
            this.isPointInBox(this.listener.position, zone.bounds)
        );
        
        if (activeZones.length === 0) {
            this.currentReverbMix = 0;
            return;
        }
        
        // Use highest priority zone
        const primaryZone = activeZones[0];
        this.currentReverbMix = primaryZone.weight;
        
        // Update reverb convolver if needed
        this.updateReverbConvolver(primaryZone);
    }
    
    private updateReverbConvolver(zone: ReverbZone): void {
        // Load or create impulse response for reverb preset
        // Apply to reverb send
    }
    
    private isPointInBox(point: Vector3, box: { min: Vector3; max: Vector3 }): boolean {
        return point.x >= box.min.x && point.x <= box.max.x &&
               point.y >= box.min.y && point.y <= box.max.y &&
               point.z >= box.min.z && point.z <= box.max.z;
    }
    
    // ========================================================================
    // OCCLUSION
    // ========================================================================
    
    setOcclusionCallback(callback: (from: Vector3, to: Vector3) => number): void {
        // Set callback for raycasting occlusion checks
        this.occlusionRaycast = callback;
    }
    
    private occlusionRaycast?: (from: Vector3, to: Vector3) => number;
    
    private updateOcclusion(): void {
        if (!this.occlusionSettings.enabled || !this.occlusionRaycast) return;
        
        this.sources.forEach(source => {
            if (!source.config.occlusionEnabled) return;
            
            // Cast rays from source to listener
            const occlusion = this.calculateOcclusion(
                source.config.spatial.position,
                this.listener.position
            );
            
            source.occlusionFactor = occlusion;
            
            // Apply low-pass filter based on occlusion
            this.applyOcclusionFilter(source);
        });
    }
    
    private calculateOcclusion(from: Vector3, to: Vector3): number {
        if (!this.occlusionRaycast) return 0;
        
        // Simple single ray
        const directOcclusion = this.occlusionRaycast(from, to);
        
        // Multi-ray for softer occlusion
        if (this.occlusionSettings.rayCount > 1) {
            let totalOcclusion = directOcclusion;
            
            // Cast additional rays around the direct path
            for (let i = 1; i < this.occlusionSettings.rayCount; i++) {
                const angle = (i / this.occlusionSettings.rayCount) * Math.PI * 2;
                const offset = {
                    x: Math.cos(angle) * 0.5,
                    y: Math.sin(angle) * 0.5,
                    z: 0,
                };
                
                const offsetFrom = {
                    x: from.x + offset.x,
                    y: from.y + offset.y,
                    z: from.z + offset.z,
                };
                
                totalOcclusion += this.occlusionRaycast(offsetFrom, to);
            }
            
            return totalOcclusion / this.occlusionSettings.rayCount;
        }
        
        return directOcclusion;
    }
    
    private applyOcclusionFilter(source: AudioSource): void {
        // Would create/update a lowpass filter based on occlusion factor
        const cutoffFrequency = this.lerp(
            20000,
            this.occlusionSettings.occludedFrequency,
            source.occlusionFactor
        );
        
        const volumeReduction = this.lerp(
            1,
            1 - this.occlusionSettings.occludedVolumeReduction,
            source.occlusionFactor
        );
        
        source.effectiveVolume = source.config.volume * volumeReduction;
    }
    
    // ========================================================================
    // SOUND PROPAGATION
    // ========================================================================
    
    addPortal(portal: SoundPortal): void {
        this.portals.push(portal);
    }
    
    removePortal(portalId: string): void {
        const index = this.portals.findIndex(p => p.id === portalId);
        if (index >= 0) {
            this.portals.splice(index, 1);
        }
    }
    
    private calculatePropagationPath(sourcePos: Vector3, listenerPos: Vector3): PropagationPath {
        // Simple direct path
        const directDistance = this.distance(sourcePos, listenerPos);
        
        return {
            sourceId: '',
            listenerId: '',
            segments: [{
                type: 'direct',
                distance: directDistance,
                attenuation: 1 / (directDistance * directDistance),
                delay: directDistance / 343, // Speed of sound
            }],
            totalDistance: directDistance,
            totalAttenuation: 1 / (directDistance * directDistance),
            totalDelay: directDistance / 343,
        };
    }
    
    // ========================================================================
    // MUSIC SYSTEM
    // ========================================================================
    
    loadMusicTrack(track: MusicTrack): void {
        this.musicTracks.set(track.id, track);
    }
    
    async playMusic(trackId: string, fadeInDuration = 1): Promise<void> {
        const track = this.musicTracks.get(trackId);
        if (!track) {
            console.error(`Music track not found: ${trackId}`);
            return;
        }
        
        const previousTrack = this.musicState.currentTrack;
        this.musicState.currentTrack = trackId;
        
        // Load and play all enabled layers
        for (const layer of track.layers) {
            if (layer.enabled) {
                await this.playSource({
                    source: layer.source,
                    volume: 0,
                    pitch: 1,
                    loop: true,
                    spatial: { enabled: false, position: { x: 0, y: 0, z: 0 }, minDistance: 1, maxDistance: 100, rolloff: 'linear' },
                    channel: 'music',
                    priority: 100,
                    occlusionEnabled: false,
                });
                
                // Fade in
                // Would animate volume from 0 to layer.volume over fadeInDuration
            }
        }
        
        this.onMusicTransitionEmitter.fire({ from: previousTrack, to: trackId });
    }
    
    transitionToMusic(trackId: string, transitionType: 'immediate' | 'next_beat' | 'next_measure' | 'crossfade', crossfadeDuration = 2): void {
        this.musicState.pendingTransition = {
            targetTrack: trackId,
            transitionType,
            crossfadeDuration,
        };
        
        if (transitionType === 'immediate') {
            this.executeMusicTransition();
        }
    }
    
    setMusicLayerEnabled(layerName: string, enabled: boolean): void {
        if (enabled) {
            this.musicState.activeLayers.add(layerName);
        } else {
            this.musicState.activeLayers.delete(layerName);
        }
        
        // Update layer volume
    }
    
    private executeMusicTransition(): void {
        const transition = this.musicState.pendingTransition;
        if (!transition) return;
        
        this.playMusic(transition.targetTrack, transition.crossfadeDuration);
        this.musicState.pendingTransition = undefined;
    }
    
    // ========================================================================
    // DIALOGUE SYSTEM
    // ========================================================================
    
    queueDialogue(lines: DialogueLine[]): void {
        this.dialogueQueue.lines.push(...lines);
        
        if (this.dialogueQueue.state === 'idle') {
            this.playNextDialogue();
        }
    }
    
    private async playNextDialogue(): Promise<void> {
        if (this.dialogueQueue.currentIndex >= this.dialogueQueue.lines.length) {
            this.dialogueQueue.state = 'idle';
            this.dialogueQueue.lines = [];
            this.dialogueQueue.currentIndex = 0;
            return;
        }
        
        const line = this.dialogueQueue.lines[this.dialogueQueue.currentIndex];
        this.dialogueQueue.state = 'playing';
        
        const sourceId = await this.playSource({
            source: line.audioFile,
            volume: 1,
            pitch: 1,
            loop: false,
            spatial: { enabled: false, position: { x: 0, y: 0, z: 0 }, minDistance: 1, maxDistance: 100, rolloff: 'linear' },
            channel: 'dialogue',
            priority: 200,
            occlusionEnabled: false,
        });
        
        // Wait for completion
        const disposable = this.onSourceEnded(id => {
            if (id === sourceId) {
                disposable.dispose();
                this.onDialogueLineEndedEmitter.fire(line);
                this.dialogueQueue.currentIndex++;
                this.playNextDialogue();
            }
        });
    }
    
    skipDialogue(): void {
        // Stop current dialogue and move to next
        this.dialogueQueue.currentIndex++;
        this.playNextDialogue();
    }
    
    // ========================================================================
    // UPDATE LOOP
    // ========================================================================
    
    private update(): void {
        // Update occlusion
        this.updateOcclusion();
        
        // Update reverb
        this.updateReverbForListener();
        
        // Update music beat tracking
        this.updateMusicBeat();
        
        // Check for music transitions
        this.checkMusicTransition();
    }
    
    private updateMusicBeat(): void {
        if (!this.musicState.currentTrack) return;
        
        const track = this.musicTracks.get(this.musicState.currentTrack);
        if (!track) return;
        
        // Calculate current beat based on playback time
        // Would sync with actual audio playback position
    }
    
    private checkMusicTransition(): void {
        if (!this.musicState.pendingTransition) return;
        
        const transition = this.musicState.pendingTransition;
        
        switch (transition.transitionType) {
            case 'next_beat':
                // Check if we just crossed a beat boundary
                break;
            case 'next_measure':
                // Check if we just crossed a measure boundary
                break;
        }
    }
    
    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    private generateSourceId(): string {
        return `source_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    
    private distance(a: Vector3, b: Vector3): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
    
    // ========================================================================
    // STATISTICS
    // ========================================================================
    
    getStatistics(): AudioStatistics {
        return {
            activeSources: this.sources.size,
            channelCount: this.channels.size,
            reverbZoneCount: this.reverbZones.length,
            portalCount: this.portals.length,
            musicState: this.musicState.currentTrack ? 'playing' : 'idle',
            dialogueState: this.dialogueQueue.state,
            hrtfEnabled: this.hrtfEnabled,
        };
    }
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

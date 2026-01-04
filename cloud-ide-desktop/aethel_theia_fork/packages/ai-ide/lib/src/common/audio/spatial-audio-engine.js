"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialAudioEngine = exports.ReverbPreset = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
var ReverbPreset;
(function (ReverbPreset) {
    ReverbPreset["None"] = "none";
    ReverbPreset["Room"] = "room";
    ReverbPreset["Hall"] = "hall";
    ReverbPreset["Cave"] = "cave";
    ReverbPreset["Arena"] = "arena";
    ReverbPreset["Forest"] = "forest";
    ReverbPreset["Underwater"] = "underwater";
    ReverbPreset["Bathroom"] = "bathroom";
    ReverbPreset["Church"] = "church";
    ReverbPreset["Hangar"] = "hangar";
})(ReverbPreset || (exports.ReverbPreset = ReverbPreset = {}));
// ============================================================================
// SPATIAL AUDIO ENGINE
// ============================================================================
let SpatialAudioEngine = class SpatialAudioEngine {
    constructor() {
        // Listener
        this.listener = {
            position: { x: 0, y: 0, z: 0 },
            forward: { x: 0, y: 0, z: -1 },
            up: { x: 0, y: 1, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
        };
        // Sources
        this.sources = new Map();
        this.audioBufferCache = new Map();
        // Mixer
        this.channels = new Map();
        this.channelNodes = new Map();
        // Reverb
        this.reverbZones = [];
        this.convolverNodes = new Map();
        this.currentReverbMix = 0;
        // Occlusion
        this.occlusionSettings = {
            enabled: true,
            rayCount: 8,
            occludedFrequency: 1000,
            occludedVolumeReduction: 0.3,
            obstructionEnabled: true,
        };
        // Sound propagation
        this.portals = [];
        this.propagationCache = new Map();
        // Music
        this.musicState = {
            currentBeat: 0,
            currentMeasure: 0,
            activeLayers: new Set(),
        };
        this.musicTracks = new Map();
        // Dialogue
        this.dialogueQueue = {
            lines: [],
            currentIndex: 0,
            state: 'idle',
        };
        // HRTF
        this.hrtfEnabled = true;
        // Events
        this.onSourceEndedEmitter = new common_1.Emitter();
        this.onSourceEnded = this.onSourceEndedEmitter.event;
        this.onDialogueLineEndedEmitter = new common_1.Emitter();
        this.onDialogueLineEnded = this.onDialogueLineEndedEmitter.event;
        this.onMusicTransitionEmitter = new common_1.Emitter();
        this.onMusicTransition = this.onMusicTransitionEmitter.event;
    }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    async initialize() {
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
    setupDefaultChannels() {
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
    async loadHRTF() {
        // Load HRTF (Head-Related Transfer Function) data
        // In production, this would load a proper HRTF dataset
        if (this.audioContext) {
            // Create a PannerNode with HRTF
            // Modern browsers support 'HRTF' panning model
        }
    }
    startUpdateLoop() {
        const update = () => {
            this.update();
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }
    dispose() {
        this.sources.forEach(source => this.stopSource(source.id));
        this.audioContext?.close();
    }
    // ========================================================================
    // LISTENER
    // ========================================================================
    setListenerTransform(position, forward, up) {
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
    setListenerVelocity(velocity) {
        this.listener.velocity = velocity;
    }
    // ========================================================================
    // SOURCE MANAGEMENT
    // ========================================================================
    async playSource(config) {
        if (!this.audioContext)
            throw new Error('Audio not initialized');
        const sourceId = this.generateSourceId();
        // Load or get cached buffer
        let buffer;
        if (typeof config.source === 'string') {
            buffer = await this.loadAudioBuffer(config.source);
        }
        else {
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
        let pannerNode;
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
        }
        else {
            gainNode.connect(this.getChannelInput(config.channel));
        }
        // Create source object
        const source = {
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
    stopSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source)
            return;
        source.sourceNode?.stop();
        source.state = 'stopped';
        this.sources.delete(sourceId);
    }
    pauseSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (source && source.state === 'playing') {
            // Web Audio API doesn't have native pause, so we need to
            // save position and recreate on resume
            source.state = 'paused';
            source.sourceNode?.stop();
        }
    }
    setSourcePosition(sourceId, position) {
        const source = this.sources.get(sourceId);
        if (source?.pannerNode && this.audioContext) {
            source.pannerNode.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
            source.pannerNode.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
            source.pannerNode.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
            source.config.spatial.position = position;
        }
    }
    setSourceVolume(sourceId, volume) {
        const source = this.sources.get(sourceId);
        if (source?.gainNode && this.audioContext) {
            source.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            source.config.volume = volume;
        }
    }
    async loadAudioBuffer(url) {
        const cached = this.audioBufferCache.get(url);
        if (cached)
            return cached;
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.audioBufferCache.set(url, audioBuffer);
        return audioBuffer;
    }
    getDistanceModel(rolloff) {
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
    createChannel(config) {
        if (!this.audioContext)
            return;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = config.volume;
        // Create effects chain
        const effectNodes = [];
        let lastNode = gainNode;
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
            ? this.masterGain
            : this.getChannelOutput(config.outputBus);
        lastNode.connect(outputBus);
        this.channels.set(config.id, config);
        this.channelNodes.set(config.id, { gain: gainNode, effects: effectNodes });
    }
    setChannelVolume(channelId, volume) {
        const nodes = this.channelNodes.get(channelId);
        const channel = this.channels.get(channelId);
        if (nodes && channel && this.audioContext) {
            nodes.gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
            channel.volume = volume;
        }
    }
    setChannelMuted(channelId, muted) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.muted = muted;
            this.updateChannelState(channelId);
        }
    }
    getChannelInput(channelId) {
        const nodes = this.channelNodes.get(channelId);
        return nodes?.gain || this.masterGain;
    }
    getChannelOutput(channelId) {
        const nodes = this.channelNodes.get(channelId);
        if (nodes && nodes.effects.length > 0) {
            return nodes.effects[nodes.effects.length - 1];
        }
        return nodes?.gain || this.masterGain;
    }
    updateChannelState(channelId) {
        const channel = this.channels.get(channelId);
        const nodes = this.channelNodes.get(channelId);
        if (channel && nodes && this.audioContext) {
            const effectiveVolume = channel.muted ? 0 : channel.volume;
            nodes.gain.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
        }
    }
    createEffectNode(effect) {
        if (!this.audioContext)
            return null;
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
    addReverbZone(zone) {
        this.reverbZones.push(zone);
        this.reverbZones.sort((a, b) => b.priority - a.priority);
    }
    removeReverbZone(zoneId) {
        const index = this.reverbZones.findIndex(z => z.id === zoneId);
        if (index >= 0) {
            this.reverbZones.splice(index, 1);
        }
    }
    updateReverbForListener() {
        // Find active reverb zones
        const activeZones = this.reverbZones.filter(zone => this.isPointInBox(this.listener.position, zone.bounds));
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
    updateReverbConvolver(zone) {
        // Load or create impulse response for reverb preset
        // Apply to reverb send
    }
    isPointInBox(point, box) {
        return point.x >= box.min.x && point.x <= box.max.x &&
            point.y >= box.min.y && point.y <= box.max.y &&
            point.z >= box.min.z && point.z <= box.max.z;
    }
    // ========================================================================
    // OCCLUSION
    // ========================================================================
    setOcclusionCallback(callback) {
        // Set callback for raycasting occlusion checks
        this.occlusionRaycast = callback;
    }
    updateOcclusion() {
        if (!this.occlusionSettings.enabled || !this.occlusionRaycast)
            return;
        this.sources.forEach(source => {
            if (!source.config.occlusionEnabled)
                return;
            // Cast rays from source to listener
            const occlusion = this.calculateOcclusion(source.config.spatial.position, this.listener.position);
            source.occlusionFactor = occlusion;
            // Apply low-pass filter based on occlusion
            this.applyOcclusionFilter(source);
        });
    }
    calculateOcclusion(from, to) {
        if (!this.occlusionRaycast)
            return 0;
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
    applyOcclusionFilter(source) {
        // Would create/update a lowpass filter based on occlusion factor
        const cutoffFrequency = this.lerp(20000, this.occlusionSettings.occludedFrequency, source.occlusionFactor);
        const volumeReduction = this.lerp(1, 1 - this.occlusionSettings.occludedVolumeReduction, source.occlusionFactor);
        source.effectiveVolume = source.config.volume * volumeReduction;
    }
    // ========================================================================
    // SOUND PROPAGATION
    // ========================================================================
    addPortal(portal) {
        this.portals.push(portal);
    }
    removePortal(portalId) {
        const index = this.portals.findIndex(p => p.id === portalId);
        if (index >= 0) {
            this.portals.splice(index, 1);
        }
    }
    calculatePropagationPath(sourcePos, listenerPos) {
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
    loadMusicTrack(track) {
        this.musicTracks.set(track.id, track);
    }
    async playMusic(trackId, fadeInDuration = 1) {
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
    transitionToMusic(trackId, transitionType, crossfadeDuration = 2) {
        this.musicState.pendingTransition = {
            targetTrack: trackId,
            transitionType,
            crossfadeDuration,
        };
        if (transitionType === 'immediate') {
            this.executeMusicTransition();
        }
    }
    setMusicLayerEnabled(layerName, enabled) {
        if (enabled) {
            this.musicState.activeLayers.add(layerName);
        }
        else {
            this.musicState.activeLayers.delete(layerName);
        }
        // Update layer volume
    }
    executeMusicTransition() {
        const transition = this.musicState.pendingTransition;
        if (!transition)
            return;
        this.playMusic(transition.targetTrack, transition.crossfadeDuration);
        this.musicState.pendingTransition = undefined;
    }
    // ========================================================================
    // DIALOGUE SYSTEM
    // ========================================================================
    queueDialogue(lines) {
        this.dialogueQueue.lines.push(...lines);
        if (this.dialogueQueue.state === 'idle') {
            this.playNextDialogue();
        }
    }
    async playNextDialogue() {
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
    skipDialogue() {
        // Stop current dialogue and move to next
        this.dialogueQueue.currentIndex++;
        this.playNextDialogue();
    }
    // ========================================================================
    // UPDATE LOOP
    // ========================================================================
    update() {
        // Update occlusion
        this.updateOcclusion();
        // Update reverb
        this.updateReverbForListener();
        // Update music beat tracking
        this.updateMusicBeat();
        // Check for music transitions
        this.checkMusicTransition();
    }
    updateMusicBeat() {
        if (!this.musicState.currentTrack)
            return;
        const track = this.musicTracks.get(this.musicState.currentTrack);
        if (!track)
            return;
        // Calculate current beat based on playback time
        // Would sync with actual audio playback position
    }
    checkMusicTransition() {
        if (!this.musicState.pendingTransition)
            return;
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
    generateSourceId() {
        return `source_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    distance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    // ========================================================================
    // STATISTICS
    // ========================================================================
    getStatistics() {
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
};
exports.SpatialAudioEngine = SpatialAudioEngine;
exports.SpatialAudioEngine = SpatialAudioEngine = __decorate([
    (0, inversify_1.injectable)()
], SpatialAudioEngine);

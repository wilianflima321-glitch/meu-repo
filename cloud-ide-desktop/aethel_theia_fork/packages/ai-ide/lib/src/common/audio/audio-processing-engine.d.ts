/**
 * AUDIO PROCESSING ENGINE - Motor de Processamento de Áudio
 *
 * Sistema profissional de processamento de áudio com:
 * - Multi-track mixing
 * - Processadores de dinâmica (compressor, limiter, gate)
 * - Equalização paramétrica
 * - Efeitos (reverb, delay, chorus, etc)
 * - Análise de áudio
 * - Geração por AI
 * - Mastering tools
 */
export interface AudioBuffer {
    sampleRate: number;
    channels: number;
    length: number;
    duration: number;
    data: Float32Array[];
}
export interface AudioFormat {
    sampleRate: number;
    bitDepth: 16 | 24 | 32;
    channels: number;
    codec: 'pcm' | 'mp3' | 'aac' | 'flac' | 'ogg' | 'opus';
    bitrate?: number;
}
export interface TimeSelection {
    start: number;
    end: number;
    duration: number;
}
export interface AudioProject {
    id: string;
    name: string;
    created: number;
    modified: number;
    settings: AudioProjectSettings;
    tracks: AudioTrack[];
    masterBus: MasterBus;
    sends: SendBus[];
    markers: AudioMarker[];
    tempo?: TempoMap;
    metadata: AudioMetadata;
}
export interface AudioProjectSettings {
    sampleRate: number;
    bitDepth: 16 | 24 | 32;
    channels: number;
    tempo: number;
    timeSignature: {
        numerator: number;
        denominator: number;
    };
    keySignature?: string;
    snapToGrid: boolean;
    gridSize: 'bar' | 'beat' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';
}
export interface AudioTrack {
    id: string;
    name: string;
    type: 'audio' | 'midi' | 'instrument' | 'aux' | 'master';
    index: number;
    color?: string;
    clips: AudioClip[];
    input: AudioInput;
    output: AudioOutput;
    sends: TrackSend[];
    inserts: AudioEffect[];
    volume: number;
    pan: number;
    mute: boolean;
    solo: boolean;
    arm: boolean;
    automation: AutomationLane[];
    frozen: boolean;
    locked: boolean;
    height: number;
}
export interface AudioInput {
    type: 'none' | 'hardware' | 'bus' | 'sidechain';
    source?: string;
    channel?: number;
}
export interface AudioOutput {
    type: 'master' | 'bus' | 'hardware';
    destination: string;
}
export interface TrackSend {
    busId: string;
    level: number;
    preFader: boolean;
}
export interface AudioClip {
    id: string;
    trackId: string;
    name: string;
    sourceFile?: string;
    sourceBuffer?: AudioBuffer;
    startSample: number;
    endSample: number;
    sourceIn: number;
    sourceOut: number;
    gain: number;
    fadeIn: FadeConfig;
    fadeOut: FadeConfig;
    pitch: number;
    timeStretch: number;
    stretchMode: 'elastic' | 'slice' | 'repitch';
    warpMarkers?: WarpMarker[];
    effects: AudioEffect[];
    muted: boolean;
    locked: boolean;
    color?: string;
}
export interface FadeConfig {
    duration: number;
    curve: 'linear' | 'exponential' | 'logarithmic' | 's-curve' | 'equal-power';
}
export interface WarpMarker {
    sourceSample: number;
    targetSample: number;
}
export interface MasterBus {
    id: string;
    volume: number;
    inserts: AudioEffect[];
    metering: MeteringConfig;
    limiter?: LimiterConfig;
}
export interface SendBus {
    id: string;
    name: string;
    type: 'aux' | 'reverb' | 'delay' | 'custom';
    inserts: AudioEffect[];
    volume: number;
    returnTo: string;
}
export interface MeteringConfig {
    type: 'peak' | 'rms' | 'lufs';
    integration: number;
    peakHold: number;
}
export type AudioEffectType = 'eq' | 'compressor' | 'limiter' | 'gate' | 'expander' | 'reverb' | 'delay' | 'chorus' | 'flanger' | 'phaser' | 'distortion' | 'saturation' | 'filter' | 'pitch-shift' | 'vocoder' | 'de-esser' | 'de-noise' | 'transient' | 'stereo-width' | 'analyzer';
export interface AudioEffect {
    id: string;
    type: AudioEffectType;
    name: string;
    enabled: boolean;
    parameters: EffectParameter[];
    preset?: string;
    mix: number;
}
export interface EffectParameter {
    id: string;
    name: string;
    value: number;
    defaultValue: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    curve?: 'linear' | 'exponential' | 'logarithmic';
    automation?: AutomationData;
}
export interface EQConfig {
    bands: EQBand[];
    analyzer: boolean;
}
export interface EQBand {
    frequency: number;
    gain: number;
    q: number;
    type: 'lowshelf' | 'highshelf' | 'peaking' | 'lowpass' | 'highpass' | 'notch';
    enabled: boolean;
}
export interface CompressorConfig {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
    sidechain?: {
        enabled: boolean;
        source?: string;
        filter?: {
            type: 'lowpass' | 'highpass' | 'bandpass';
            frequency: number;
        };
    };
}
export interface LimiterConfig {
    ceiling: number;
    release: number;
    lookahead: number;
    truePeak: boolean;
}
export interface GateConfig {
    threshold: number;
    attack: number;
    hold: number;
    release: number;
    range: number;
    sidechain?: {
        enabled: boolean;
        source?: string;
    };
}
export interface ReverbConfig {
    type: 'room' | 'hall' | 'plate' | 'spring' | 'chamber' | 'convolution';
    preDelay: number;
    decay: number;
    size: number;
    damping: number;
    diffusion: number;
    earlyReflections: number;
    modulation?: number;
    irFile?: string;
}
export interface DelayConfig {
    time: number;
    sync: boolean;
    feedback: number;
    pingPong: boolean;
    filter: {
        lowCut: number;
        highCut: number;
    };
    modulation?: {
        rate: number;
        depth: number;
    };
}
export interface AutomationLane {
    id: string;
    parameter: string;
    points: AutomationPoint[];
    mode: 'read' | 'write' | 'touch' | 'latch';
    visible: boolean;
}
export interface AutomationPoint {
    sample: number;
    value: number;
    curve: 'linear' | 'exponential' | 'logarithmic' | 's-curve' | 'step';
    tension?: number;
}
export interface AutomationData {
    points: AutomationPoint[];
}
export interface TempoMap {
    changes: TempoChange[];
}
export interface TempoChange {
    sample: number;
    tempo: number;
    timeSignature?: {
        numerator: number;
        denominator: number;
    };
}
export interface AudioMarker {
    id: string;
    sample: number;
    name: string;
    color?: string;
    type: 'marker' | 'region-start' | 'region-end' | 'loop-start' | 'loop-end';
}
export interface AudioAnalysis {
    duration: number;
    sampleRate: number;
    channels: number;
    peakLevel: number[];
    rmsLevel: number[];
    lufs?: {
        integrated: number;
        shortTerm: number;
        momentary: number;
        range: number;
    };
    spectrum?: Float32Array[];
    spectralCentroid?: number[];
    dynamicRange: number;
    crestFactor: number;
    tempo?: number;
    beatPositions?: number[];
    silence?: Array<{
        start: number;
        end: number;
    }>;
    clipping?: number[];
    mfcc?: Float32Array[];
    chromagram?: Float32Array[];
}
export interface AudioMetadata {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    genre?: string;
    comment?: string;
    bpm?: number;
    key?: string;
    isrc?: string;
    tags: string[];
}
export declare class AudioProcessingEngine {
    private currentProject;
    private audioContext;
    private sampleRate;
    /**
     * Cria novo projeto de áudio
     */
    createProject(name: string, settings?: Partial<AudioProjectSettings>): AudioProject;
    /**
     * Cria track
     */
    createTrack(name: string, type: AudioTrack['type']): AudioTrack;
    /**
     * Adiciona clip à track
     */
    addClip(trackId: string, buffer: AudioBuffer, startSample: number, name?: string): AudioClip;
    /**
     * Move clip
     */
    moveClip(clipId: string, newStartSample: number, newTrackId?: string): void;
    /**
     * Split clip
     */
    splitClip(clipId: string, sample: number): [AudioClip, AudioClip];
    /**
     * Aplica fade
     */
    setFade(clipId: string, edge: 'in' | 'out', duration: number, curve?: FadeConfig['curve']): void;
    /**
     * Aplica fade a buffer
     */
    applyFade(buffer: AudioBuffer, fade: FadeConfig, edge: 'in' | 'out'): AudioBuffer;
    /**
     * Calcula ganho de fade
     */
    private calculateFadeGain;
    /**
     * Normaliza buffer
     */
    normalize(buffer: AudioBuffer, targetLevel?: number): AudioBuffer;
    /**
     * Aplica ganho
     */
    applyGain(buffer: AudioBuffer, gainDb: number): AudioBuffer;
    /**
     * Reverse buffer
     */
    reverse(buffer: AudioBuffer): AudioBuffer;
    /**
     * Mix buffers
     */
    mixBuffers(buffers: Array<{
        buffer: AudioBuffer;
        gain: number;
        pan: number;
    }>): AudioBuffer;
    /**
     * Aplica EQ
     */
    applyEQ(buffer: AudioBuffer, config: EQConfig): AudioBuffer;
    /**
     * Aplica filtro biquad
     */
    private applyBiquadFilter;
    /**
     * Aplica compressor
     */
    applyCompressor(buffer: AudioBuffer, config: CompressorConfig): AudioBuffer;
    /**
     * Aplica limiter
     */
    applyLimiter(buffer: AudioBuffer, config: LimiterConfig): AudioBuffer;
    /**
     * Aplica reverb simples
     */
    applyReverb(buffer: AudioBuffer, config: ReverbConfig): AudioBuffer;
    /**
     * Aplica delay
     */
    applyDelay(buffer: AudioBuffer, config: DelayConfig): AudioBuffer;
    /**
     * Analisa buffer de áudio
     */
    analyzeAudio(buffer: AudioBuffer): AudioAnalysis;
    /**
     * Detecta silêncio
     */
    private detectSilence;
    /**
     * Detecta clipping
     */
    private detectClipping;
    /**
     * Detecta tempo (BPM)
     */
    private detectTempo;
    /**
     * Detecta posições de beats
     */
    private detectBeats;
    /**
     * Calcula espectro (FFT simples)
     */
    calculateSpectrum(buffer: AudioBuffer, windowSize?: number): Float32Array[];
    /**
     * FFT simples (Cooley-Tukey)
     */
    private fft;
    /**
     * Cria buffer vazio
     */
    createEmptyBuffer(length: number, channels: number, sampleRate: number): AudioBuffer;
    /**
     * Clona buffer
     */
    cloneBuffer(buffer: AudioBuffer): AudioBuffer;
    /**
     * Mix para mono
     */
    mixToMono(buffer: AudioBuffer): AudioBuffer;
    /**
     * Encontra track por ID
     */
    private findTrack;
    /**
     * Encontra clip por ID
     */
    private findClip;
    /**
     * Converte linear para dB
     */
    private linearToDb;
    /**
     * Converte dB para linear
     */
    private dbToLinear;
    /**
     * Gera ID único
     */
    private generateId;
}

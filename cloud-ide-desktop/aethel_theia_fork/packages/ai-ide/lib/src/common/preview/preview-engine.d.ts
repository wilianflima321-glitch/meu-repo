/**
 * PREVIEW ENGINE - Sistema Unificado de Preview/Playback
 *
 * Sistema completo para:
 * - Preview em tempo real de todos os tipos de mídia
 * - Playback com controles profissionais
 * - Múltiplos viewports
 * - Picture-in-Picture
 * - Comparação A/B
 * - Scopes e análises
 *
 * INTEGRAÇÃO COM ENGINES DE MÍDIA:
 * - VideoTimelineEngine: Timeline de vídeo multi-track
 * - AudioProcessingEngine: Processamento e mixagem de áudio
 * - Scene3DEngine: Renderização e preview 3D
 */
type EventCallback<T> = (data: T) => void;
type Event<T> = (callback: EventCallback<T>) => {
    dispose: () => void;
};
export declare const VideoTimelineEngineSymbol: unique symbol;
export declare const AudioProcessingEngineSymbol: unique symbol;
export declare const Scene3DEngineSymbol: unique symbol;
export interface IVideoTimelineEngine {
    getCurrentProject(): VideoProjectRef | null;
    getFrame(frameNumber: number): Promise<ImageData | null>;
    getClipAt(time: number, trackId?: string): VideoClipRef | null;
    renderFrame(time: number, quality: 'draft' | 'preview' | 'full'): Promise<RenderResult>;
    getTimelineState(): TimelineStateRef;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
}
export interface IAudioProcessingEngine {
    getCurrentProject(): AudioProjectRef | null;
    getAudioBuffer(startTime: number, duration: number): Promise<Float32Array[]>;
    getMasterLevel(): AudioLevelInfo;
    getTrackLevels(): Map<string, AudioLevelInfo>;
    schedulePlayback(time: number, duration?: number): AudioScheduleHandle;
    cancelPlayback(handle: AudioScheduleHandle): void;
    setMasterVolume(volume: number): void;
    getMasterVolume(): number;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
}
export interface IScene3DEngine {
    getCurrentScene(): Scene3DRef | null;
    renderFrame(camera?: string, options?: Render3DOptions): Promise<ImageData>;
    getActiveCamera(): Camera3DRef | null;
    setActiveCamera(cameraId: string): void;
    getCameras(): Camera3DRef[];
    getViewportTransform(): Transform3DRef;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
}
export interface VideoProjectRef {
    id: string;
    name: string;
    duration: number;
    frameRate: number;
    resolution: {
        width: number;
        height: number;
    };
}
export interface VideoClipRef {
    id: string;
    name: string;
    trackId: string;
    startTime: number;
    endTime: number;
    mediaPath?: string;
}
export interface TimelineStateRef {
    currentTime: number;
    currentFrame: number;
    inPoint: number;
    outPoint: number;
    isPlaying: boolean;
}
export interface AudioProjectRef {
    id: string;
    name: string;
    sampleRate: number;
    channels: number;
    duration: number;
}
export interface AudioLevelInfo {
    peak: number;
    rms: number;
    lufs?: number;
}
export interface AudioScheduleHandle {
    id: string;
    cancel(): void;
}
export interface Scene3DRef {
    id: string;
    name: string;
    objectCount: number;
}
export interface Camera3DRef {
    id: string;
    name: string;
    type: 'perspective' | 'orthographic';
    active: boolean;
}
export interface Transform3DRef {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    scale: {
        x: number;
        y: number;
        z: number;
    };
}
export interface Render3DOptions {
    width?: number;
    height?: number;
    quality?: 'draft' | 'preview' | 'full';
    antialiasing?: boolean;
    shadows?: boolean;
}
export interface RenderResult {
    imageData: ImageData | null;
    renderTime: number;
    cached: boolean;
}
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'buffering' | 'seeking';
export type PreviewQuality = 'draft' | 'preview' | 'full' | 'proxy';
export type ViewportMode = 'single' | 'split-h' | 'split-v' | 'quad' | 'custom';
export type CompareMode = 'side-by-side' | 'split' | 'overlay' | 'difference' | 'wipe';
export interface Viewport {
    id: string;
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    source?: ViewportSource;
    zoom: number;
    pan: {
        x: number;
        y: number;
    };
    settings: ViewportSettings;
    overlays: ViewportOverlay[];
    active: boolean;
}
export interface ViewportSource {
    type: 'timeline' | 'composition' | 'asset' | 'stream' | 'camera';
    id: string;
    trackId?: string;
    cameraId?: string;
}
export interface ViewportSettings {
    showSafeArea: boolean;
    safeAreaType: 'action' | 'title' | 'both';
    showGrid: boolean;
    gridSize: number;
    showRulers: boolean;
    backgroundColor: string;
    checkerboard: boolean;
    showGuides: boolean;
    snapToGuides: boolean;
    lockAspectRatio: boolean;
    aspectRatio: string;
    channelView: 'rgb' | 'r' | 'g' | 'b' | 'a' | 'luminance';
    hdrToneMapping: boolean;
    exposure: number;
}
export interface ViewportOverlay {
    id: string;
    type: OverlayType;
    enabled: boolean;
    settings: Record<string, unknown>;
}
export type OverlayType = 'safe-area' | 'grid' | 'center-cross' | 'thirds' | 'golden-ratio' | 'mask' | 'annotation' | 'timecode' | 'scope';
export interface PlaybackController {
    id: string;
    state: PlaybackState;
    currentTime: number;
    currentFrame: number;
    inPoint: number;
    outPoint: number;
    duration: number;
    speed: number;
    loop: boolean;
    loopMode: 'full' | 'in-out' | 'selection';
    volume: number;
    muted: boolean;
    soloTracks: Set<string>;
    mutedTracks: Set<string>;
    frameRate: number;
    dropFrame: boolean;
    bufferAhead: number;
    bufferBehind: number;
    bufferedRanges: TimeRange[];
}
export interface TimeRange {
    start: number;
    end: number;
}
export interface PlaybackOptions {
    startTime?: number;
    endTime?: number;
    speed?: number;
    loop?: boolean;
    reverse?: boolean;
    audioOnly?: boolean;
    videoOnly?: boolean;
}
export interface VideoScope {
    id: string;
    type: ScopeType;
    enabled: boolean;
    settings: ScopeSettings;
    width: number;
    height: number;
}
export type ScopeType = 'waveform' | 'vectorscope' | 'histogram' | 'parade' | 'loudness';
export interface ScopeSettings {
    waveformMode?: 'luma' | 'rgb' | 'parade';
    waveformScale?: number;
    vectorscopeTargets?: boolean;
    vectorscopeSize?: number;
    histogramChannels?: ('r' | 'g' | 'b' | 'luma')[];
    histogramLog?: boolean;
    loudnessStandard?: 'ebu-r128' | 'atsc-a85' | 'custom';
    targetLufs?: number;
}
export interface CompareSession {
    id: string;
    mode: CompareMode;
    sourceA: ViewportSource;
    sourceB: ViewportSource;
    wipePosition?: number;
    wipeAngle?: number;
    opacity?: number;
    blendMode?: string;
    syncPlayback: boolean;
}
export interface RenderBuffer {
    id: string;
    type: 'video' | 'audio' | 'image';
    width?: number;
    height?: number;
    pixelFormat?: string;
    colorSpace?: string;
    channels?: number;
    sampleRate?: number;
    data: ArrayBuffer | null;
    pts: number;
    duration: number;
}
export interface FrameBuffer {
    frame: number;
    time: number;
    videoBuffer?: RenderBuffer;
    audioBuffer?: RenderBuffer;
    ready: boolean;
    rendered: boolean;
}
export declare class PreviewEngine {
    private viewports;
    private activeViewportId?;
    private viewportMode;
    private playback;
    private compareSession?;
    private scopes;
    private frameBuffer;
    private bufferSize;
    private quality;
    private resolution;
    private rafId?;
    private lastFrameTime;
    private listeners;
    private canvas?;
    private gl?;
    private audioContext?;
    private videoEngine?;
    private audioEngine?;
    private scene3DEngine?;
    private currentAudioSchedule?;
    private engineEventCleanups;
    private readonly onFrameRenderedEmitter;
    readonly onFrameRendered: Event<{
        frame: number;
        time: number;
    }>;
    private readonly onPlaybackStateChangedEmitter;
    readonly onPlaybackStateChanged: Event<PlaybackController>;
    private readonly onMediaEngineConnectedEmitter;
    readonly onMediaEngineConnected: Event<{
        type: 'video' | 'audio' | '3d';
    }>;
    constructor();
    /**
     * Conecta o VideoTimelineEngine
     */
    setVideoEngine(engine: IVideoTimelineEngine): void;
    /**
     * Conecta o AudioProcessingEngine
     */
    setAudioEngine(engine: IAudioProcessingEngine): void;
    /**
     * Conecta o Scene3DEngine
     */
    setScene3DEngine(engine: IScene3DEngine): void;
    /**
     * Configura eventos do VideoTimelineEngine
     */
    private setupVideoEngineEvents;
    /**
     * Configura eventos do AudioProcessingEngine
     */
    private setupAudioEngineEvents;
    /**
     * Configura eventos do Scene3DEngine
     */
    private setupScene3DEngineEvents;
    private createPlaybackController;
    private setupDefaultViewport;
    /**
     * Inicializa com canvas
     */
    initialize(canvas: HTMLCanvasElement): void;
    /**
     * Cria viewport
     */
    createViewport(options?: Partial<Viewport>): Viewport;
    /**
     * Remove viewport
     */
    removeViewport(viewportId: string): void;
    /**
     * Define viewport ativo
     */
    setActiveViewport(viewportId: string): void;
    /**
     * Define fonte do viewport
     */
    setViewportSource(viewportId: string, source: ViewportSource): void;
    /**
     * Atualiza zoom
     */
    setZoom(viewportId: string, zoom: number, center?: {
        x: number;
        y: number;
    }): void;
    /**
     * Fit to viewport
     */
    fitToViewport(viewportId: string): void;
    /**
     * Define modo de layout
     */
    setViewportMode(mode: ViewportMode): void;
    private arrangeViewports;
    /**
     * Inicia playback
     */
    play(options?: PlaybackOptions): void;
    /**
     * Pausa playback
     */
    pause(): void;
    /**
     * Para playback
     */
    stop(): void;
    /**
     * Toggle play/pause
     */
    togglePlayPause(): void;
    /**
     * Seek para tempo específico
     */
    seek(time: number): void;
    /**
     * Seek para frame
     */
    seekToFrame(frame: number): void;
    /**
     * Step forward/backward
     */
    step(frames?: number): void;
    /**
     * Go to in point
     */
    goToInPoint(): void;
    /**
     * Go to out point
     */
    goToOutPoint(): void;
    /**
     * Define in point
     */
    setInPoint(time?: number): void;
    /**
     * Define out point
     */
    setOutPoint(time?: number): void;
    /**
     * Define velocidade
     */
    setSpeed(speed: number): void;
    /**
     * Define volume
     */
    setVolume(volume: number): void;
    /**
     * Toggle mute
     */
    toggleMute(): void;
    /**
     * Define loop
     */
    setLoop(loop: boolean, mode?: 'full' | 'in-out' | 'selection'): void;
    /**
     * Define duração
     */
    setDuration(duration: number): void;
    /**
     * Define frame rate
     */
    setFrameRate(fps: number, dropFrame?: boolean): void;
    private startRenderLoop;
    private stopRenderLoop;
    private updatePlaybackTime;
    private requestRender;
    private renderFrame;
    /**
     * Busca frame dos engines de mídia conectados
     */
    private fetchFrameFromEngines;
    private renderViewport;
    /**
     * Renderiza imagem no viewport
     */
    private renderImageToViewport;
    private renderPlaceholder;
    private drawCheckerboard;
    private renderOverlays;
    private drawSafeArea;
    private drawGrid;
    private drawCenterCross;
    private drawThirds;
    private drawTimecode;
    /**
     * Adiciona scope
     */
    addScope(type: ScopeType, settings?: Partial<ScopeSettings>): VideoScope;
    /**
     * Remove scope
     */
    removeScope(scopeId: string): void;
    private updateScopes;
    private calculateWaveform;
    private calculateVectorscope;
    private calculateHistogram;
    /**
     * Inicia comparação A/B
     */
    startCompare(sourceA: ViewportSource, sourceB: ViewportSource, mode?: CompareMode): CompareSession;
    /**
     * Atualiza posição do wipe
     */
    setWipePosition(position: number): void;
    /**
     * Encerra comparação
     */
    endCompare(): void;
    private prebufferFrames;
    private requestFrameRender;
    private clearBufferOutsideRange;
    /**
     * Define qualidade de preview
     */
    setQuality(quality: PreviewQuality): void;
    /**
     * Define resolução customizada
     */
    setResolution(width: number, height: number): void;
    private clearBuffer;
    private timeToFrame;
    private frameToTime;
    /**
     * Formata timecode
     */
    formatTimecode(time: number, fps: number, dropFrame?: boolean): string;
    /**
     * Parse timecode
     */
    parseTimecode(timecode: string, fps: number): number;
    private generateId;
    /**
     * Agenda playback de áudio sincronizado com o vídeo
     */
    private scheduleAudioPlayback;
    /**
     * Atualiza volume do áudio
     */
    private updateAudioVolume;
    getPlaybackState(): PlaybackController;
    getViewport(id: string): Viewport | undefined;
    getActiveViewport(): Viewport | undefined;
    getAllViewports(): Viewport[];
    getScopes(): VideoScope[];
    getCurrentTime(): number;
    getCurrentFrame(): number;
    /**
     * Retorna se os engines de mídia estão conectados
     */
    getEngineStatus(): {
        video: boolean;
        audio: boolean;
        scene3d: boolean;
    };
    /**
     * Retorna informações do projeto de vídeo atual
     */
    getVideoProject(): VideoProjectRef | null;
    /**
     * Retorna informações do projeto de áudio atual
     */
    getAudioProject(): AudioProjectRef | null;
    /**
     * Retorna informações da cena 3D atual
     */
    getCurrentScene(): Scene3DRef | null;
    /**
     * Retorna lista de câmeras disponíveis (para 3D)
     */
    getAvailableCameras(): Camera3DRef[];
    /**
     * Define câmera ativa para preview 3D
     */
    setActiveCamera(cameraId: string): void;
    /**
     * Retorna níveis de áudio atuais
     */
    getAudioLevels(): {
        master: AudioLevelInfo;
        tracks: Map<string, AudioLevelInfo>;
    } | null;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
    private emit;
    dispose(): void;
}
export {};

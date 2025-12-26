import { injectable, inject, optional } from 'inversify';

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

// ============================================================================
// LOCAL EVENT SYSTEM (Theia-compatible pattern)
// ============================================================================

type EventCallback<T> = (data: T) => void;

class Emitter<T> {
    private callbacks: Set<EventCallback<T>> = new Set();
    
    get event(): (callback: EventCallback<T>) => { dispose: () => void } {
        return (callback: EventCallback<T>) => {
            this.callbacks.add(callback);
            return {
                dispose: () => this.callbacks.delete(callback)
            };
        };
    }
    
    fire(data: T): void {
        this.callbacks.forEach(cb => cb(data));
    }
    
    dispose(): void {
        this.callbacks.clear();
    }
}

// Type alias for Event (function signature)
type Event<T> = (callback: EventCallback<T>) => { dispose: () => void };

// Forward declarations para evitar imports circulares
export const VideoTimelineEngineSymbol = Symbol('VideoTimelineEngine');
export const AudioProcessingEngineSymbol = Symbol('AudioProcessingEngine');
export const Scene3DEngineSymbol = Symbol('Scene3DEngine');

// ============================================================================
// INTERFACES PARA INTEGRAÇÃO COM ENGINES
// ============================================================================

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

// Reference types para evitar dependências diretas
export interface VideoProjectRef {
    id: string;
    name: string;
    duration: number;
    frameRate: number;
    resolution: { width: number; height: number };
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
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
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

// ============================================================================
// TYPES BASE
// ============================================================================

export type PlaybackState = 
    | 'stopped'
    | 'playing'
    | 'paused'
    | 'buffering'
    | 'seeking';

export type PreviewQuality = 
    | 'draft'      // Rápido, baixa qualidade
    | 'preview'    // Balanceado
    | 'full'       // Qualidade final
    | 'proxy';     // Usando proxies

export type ViewportMode = 
    | 'single'
    | 'split-h'
    | 'split-v'
    | 'quad'
    | 'custom';

export type CompareMode = 
    | 'side-by-side'
    | 'split'
    | 'overlay'
    | 'difference'
    | 'wipe';

// ============================================================================
// VIEWPORT
// ============================================================================

export interface Viewport {
    id: string;
    name: string;
    
    // Dimensões
    width: number;
    height: number;
    x: number;
    y: number;
    
    // Conteúdo
    source?: ViewportSource;
    
    // Zoom/Pan
    zoom: number;
    pan: { x: number; y: number };
    
    // Configurações
    settings: ViewportSettings;
    
    // Overlays
    overlays: ViewportOverlay[];
    
    // Estado
    active: boolean;
}

export interface ViewportSource {
    type: 'timeline' | 'composition' | 'asset' | 'stream' | 'camera';
    id: string;
    
    // Para timeline
    trackId?: string;
    
    // Para câmera
    cameraId?: string;
}

export interface ViewportSettings {
    // Exibição
    showSafeArea: boolean;
    safeAreaType: 'action' | 'title' | 'both';
    showGrid: boolean;
    gridSize: number;
    showRulers: boolean;
    
    // Background
    backgroundColor: string;
    checkerboard: boolean;
    
    // Guias
    showGuides: boolean;
    snapToGuides: boolean;
    
    // Aspect ratio
    lockAspectRatio: boolean;
    aspectRatio: string;
    
    // Canais
    channelView: 'rgb' | 'r' | 'g' | 'b' | 'a' | 'luminance';
    
    // HDR
    hdrToneMapping: boolean;
    exposure: number;
}

export interface ViewportOverlay {
    id: string;
    type: OverlayType;
    enabled: boolean;
    settings: Record<string, unknown>;
}

export type OverlayType = 
    | 'safe-area'
    | 'grid'
    | 'center-cross'
    | 'thirds'
    | 'golden-ratio'
    | 'mask'
    | 'annotation'
    | 'timecode'
    | 'scope';

// ============================================================================
// PLAYBACK
// ============================================================================

export interface PlaybackController {
    id: string;
    
    // Estado
    state: PlaybackState;
    
    // Posição
    currentTime: number;
    currentFrame: number;
    
    // Range
    inPoint: number;
    outPoint: number;
    duration: number;
    
    // Velocidade
    speed: number;
    
    // Loop
    loop: boolean;
    loopMode: 'full' | 'in-out' | 'selection';
    
    // Áudio
    volume: number;
    muted: boolean;
    soloTracks: Set<string>;
    mutedTracks: Set<string>;
    
    // Frame rate
    frameRate: number;
    dropFrame: boolean;
    
    // Buffer
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

// ============================================================================
// SCOPES
// ============================================================================

export interface VideoScope {
    id: string;
    type: ScopeType;
    enabled: boolean;
    
    // Configurações
    settings: ScopeSettings;
    
    // Dimensões
    width: number;
    height: number;
}

export type ScopeType = 
    | 'waveform'
    | 'vectorscope'
    | 'histogram'
    | 'parade'
    | 'loudness';

export interface ScopeSettings {
    // Waveform
    waveformMode?: 'luma' | 'rgb' | 'parade';
    waveformScale?: number;
    
    // Vectorscope
    vectorscopeTargets?: boolean;
    vectorscopeSize?: number;
    
    // Histogram
    histogramChannels?: ('r' | 'g' | 'b' | 'luma')[];
    histogramLog?: boolean;
    
    // Loudness
    loudnessStandard?: 'ebu-r128' | 'atsc-a85' | 'custom';
    targetLufs?: number;
}

// ============================================================================
// COMPARE
// ============================================================================

export interface CompareSession {
    id: string;
    mode: CompareMode;
    
    // Fontes
    sourceA: ViewportSource;
    sourceB: ViewportSource;
    
    // Para wipe
    wipePosition?: number;
    wipeAngle?: number;
    
    // Para overlay
    opacity?: number;
    blendMode?: string;
    
    // Sincronização
    syncPlayback: boolean;
}

// ============================================================================
// RENDER BUFFER
// ============================================================================

export interface RenderBuffer {
    id: string;
    type: 'video' | 'audio' | 'image';
    
    // Para vídeo/imagem
    width?: number;
    height?: number;
    pixelFormat?: string;
    colorSpace?: string;
    
    // Para áudio
    channels?: number;
    sampleRate?: number;
    
    // Buffer
    data: ArrayBuffer | null;
    
    // Timestamps
    pts: number;
    duration: number;
}

export interface FrameBuffer {
    frame: number;
    time: number;
    
    // Dados
    videoBuffer?: RenderBuffer;
    audioBuffer?: RenderBuffer;
    
    // Estado
    ready: boolean;
    rendered: boolean;
}

// ============================================================================
// PREVIEW ENGINE
// ============================================================================

@injectable()
export class PreviewEngine {
    // Viewports
    private viewports: Map<string, Viewport> = new Map();
    private activeViewportId?: string;
    private viewportMode: ViewportMode = 'single';
    
    // Playback
    private playback: PlaybackController;
    
    // Compare
    private compareSession?: CompareSession;
    
    // Scopes
    private scopes: Map<string, VideoScope> = new Map();
    
    // Buffers
    private frameBuffer: Map<number, FrameBuffer> = new Map();
    private bufferSize: number = 30;
    
    // Qualidade
    private quality: PreviewQuality = 'preview';
    private resolution: { width: number; height: number } = { width: 1920, height: 1080 };
    
    // RAF
    private rafId?: number;
    private lastFrameTime: number = 0;
    
    // Eventos
    private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
    
    // Canvas/WebGL
    private canvas?: HTMLCanvasElement;
    private gl?: WebGL2RenderingContext;
    private audioContext?: AudioContext;

    // ========================================================================
    // MEDIA ENGINE INTEGRATIONS
    // ========================================================================
    
    @inject(VideoTimelineEngineSymbol) @optional()
    private videoEngine?: IVideoTimelineEngine;
    
    @inject(AudioProcessingEngineSymbol) @optional()
    private audioEngine?: IAudioProcessingEngine;
    
    @inject(Scene3DEngineSymbol) @optional()
    private scene3DEngine?: IScene3DEngine;
    
    // Audio scheduling
    private currentAudioSchedule?: AudioScheduleHandle;
    
    // Engine event handlers
    private engineEventCleanups: (() => void)[] = [];

    // Emitters para eventos Theia
    private readonly onFrameRenderedEmitter = new Emitter<{ frame: number; time: number }>();
    readonly onFrameRendered: Event<{ frame: number; time: number }> = this.onFrameRenderedEmitter.event;
    
    private readonly onPlaybackStateChangedEmitter = new Emitter<PlaybackController>();
    readonly onPlaybackStateChanged: Event<PlaybackController> = this.onPlaybackStateChangedEmitter.event;
    
    private readonly onMediaEngineConnectedEmitter = new Emitter<{ type: 'video' | 'audio' | '3d' }>();
    readonly onMediaEngineConnected: Event<{ type: 'video' | 'audio' | '3d' }> = this.onMediaEngineConnectedEmitter.event;

    constructor() {
        this.playback = this.createPlaybackController();
        this.setupDefaultViewport();
    }

    // ========================================================================
    // MEDIA ENGINE SETTERS (Para conexão em runtime)
    // ========================================================================
    
    /**
     * Conecta o VideoTimelineEngine
     */
    setVideoEngine(engine: IVideoTimelineEngine): void {
        this.videoEngine = engine;
        this.setupVideoEngineEvents();
        this.onMediaEngineConnectedEmitter.fire({ type: 'video' });
        
        // Sincronizar com projeto atual
        const project = engine.getCurrentProject();
        if (project) {
            this.setDuration(project.duration);
            this.setFrameRate(project.frameRate);
            this.resolution = project.resolution;
        }
    }
    
    /**
     * Conecta o AudioProcessingEngine
     */
    setAudioEngine(engine: IAudioProcessingEngine): void {
        this.audioEngine = engine;
        this.setupAudioEngineEvents();
        this.onMediaEngineConnectedEmitter.fire({ type: 'audio' });
    }
    
    /**
     * Conecta o Scene3DEngine
     */
    setScene3DEngine(engine: IScene3DEngine): void {
        this.scene3DEngine = engine;
        this.setupScene3DEngineEvents();
        this.onMediaEngineConnectedEmitter.fire({ type: '3d' });
    }
    
    /**
     * Configura eventos do VideoTimelineEngine
     */
    private setupVideoEngineEvents(): void {
        if (!this.videoEngine) return;
        
        const handleTimelineChange = (data: unknown) => {
            const state = data as TimelineStateRef;
            if (this.playback.state !== 'playing') {
                this.playback.currentTime = state.currentTime;
                this.playback.currentFrame = state.currentFrame;
                this.requestRender();
            }
        };
        
        const handleProjectLoaded = (data: unknown) => {
            const project = data as VideoProjectRef;
            this.setDuration(project.duration);
            this.setFrameRate(project.frameRate);
            this.resolution = project.resolution;
            this.clearBuffer();
            this.requestRender();
        };
        
        this.videoEngine.on('timelineChanged', handleTimelineChange);
        this.videoEngine.on('projectLoaded', handleProjectLoaded);
        
        this.engineEventCleanups.push(() => {
            this.videoEngine?.off('timelineChanged', handleTimelineChange);
            this.videoEngine?.off('projectLoaded', handleProjectLoaded);
        });
    }
    
    /**
     * Configura eventos do AudioProcessingEngine
     */
    private setupAudioEngineEvents(): void {
        if (!this.audioEngine) return;
        
        const handleLevelUpdate = (data: unknown) => {
            const levels = data as { master: AudioLevelInfo; tracks: Map<string, AudioLevelInfo> };
            this.emit('audioLevels', levels);
        };
        
        this.audioEngine.on('levelUpdate', handleLevelUpdate);
        
        this.engineEventCleanups.push(() => {
            this.audioEngine?.off('levelUpdate', handleLevelUpdate);
        });
    }
    
    /**
     * Configura eventos do Scene3DEngine
     */
    private setupScene3DEngineEvents(): void {
        if (!this.scene3DEngine) return;
        
        const handleCameraChange = (data: unknown) => {
            const camera = data as Camera3DRef;
            this.emit('cameraChanged', camera);
            this.requestRender();
        };
        
        const handleSceneUpdate = () => {
            this.requestRender();
        };
        
        this.scene3DEngine.on('cameraChanged', handleCameraChange);
        this.scene3DEngine.on('sceneUpdated', handleSceneUpdate);
        
        this.engineEventCleanups.push(() => {
            this.scene3DEngine?.off('cameraChanged', handleCameraChange);
            this.scene3DEngine?.off('sceneUpdated', handleSceneUpdate);
        });
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    private createPlaybackController(): PlaybackController {
        return {
            id: this.generateId(),
            state: 'stopped',
            currentTime: 0,
            currentFrame: 0,
            inPoint: 0,
            outPoint: 0,
            duration: 0,
            speed: 1,
            loop: false,
            loopMode: 'full',
            volume: 1,
            muted: false,
            soloTracks: new Set(),
            mutedTracks: new Set(),
            frameRate: 30,
            dropFrame: false,
            bufferAhead: 2,
            bufferBehind: 1,
            bufferedRanges: [],
        };
    }

    private setupDefaultViewport(): void {
        const viewport: Viewport = {
            id: 'main',
            name: 'Main Viewport',
            width: 1920,
            height: 1080,
            x: 0,
            y: 0,
            zoom: 1,
            pan: { x: 0, y: 0 },
            settings: {
                showSafeArea: false,
                safeAreaType: 'both',
                showGrid: false,
                gridSize: 50,
                showRulers: true,
                backgroundColor: '#1a1a1a',
                checkerboard: true,
                showGuides: true,
                snapToGuides: true,
                lockAspectRatio: true,
                aspectRatio: '16:9',
                channelView: 'rgb',
                hdrToneMapping: true,
                exposure: 0,
            },
            overlays: [],
            active: true,
        };

        this.viewports.set(viewport.id, viewport);
        this.activeViewportId = viewport.id;
    }

    /**
     * Inicializa com canvas
     */
    initialize(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        
        // Tentar WebGL2
        this.gl = canvas.getContext('webgl2', {
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
        }) || undefined;

        if (!this.gl) {
            console.warn('WebGL2 not available, falling back to 2D');
        }

        // Audio context
        this.audioContext = new AudioContext();

        this.emit('initialized', { canvas });
    }

    // ========================================================================
    // VIEWPORT MANAGEMENT
    // ========================================================================

    /**
     * Cria viewport
     */
    createViewport(options: Partial<Viewport> = {}): Viewport {
        const viewport: Viewport = {
            id: this.generateId(),
            name: options.name || `Viewport ${this.viewports.size + 1}`,
            width: options.width || 960,
            height: options.height || 540,
            x: options.x || 0,
            y: options.y || 0,
            zoom: options.zoom || 1,
            pan: options.pan || { x: 0, y: 0 },
            settings: {
                showSafeArea: false,
                safeAreaType: 'both',
                showGrid: false,
                gridSize: 50,
                showRulers: false,
                backgroundColor: '#1a1a1a',
                checkerboard: true,
                showGuides: false,
                snapToGuides: true,
                lockAspectRatio: true,
                aspectRatio: '16:9',
                channelView: 'rgb',
                hdrToneMapping: true,
                exposure: 0,
                ...options.settings,
            },
            overlays: options.overlays || [],
            active: false,
        };

        this.viewports.set(viewport.id, viewport);
        this.emit('viewportCreated', viewport);

        return viewport;
    }

    /**
     * Remove viewport
     */
    removeViewport(viewportId: string): void {
        if (viewportId === 'main') {
            throw new Error('Cannot remove main viewport');
        }

        this.viewports.delete(viewportId);

        if (this.activeViewportId === viewportId) {
            this.activeViewportId = 'main';
        }

        this.emit('viewportRemoved', { viewportId });
    }

    /**
     * Define viewport ativo
     */
    setActiveViewport(viewportId: string): void {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return;

        // Desativar anterior
        if (this.activeViewportId) {
            const prev = this.viewports.get(this.activeViewportId);
            if (prev) prev.active = false;
        }

        viewport.active = true;
        this.activeViewportId = viewportId;

        this.emit('activeViewportChanged', viewport);
    }

    /**
     * Define fonte do viewport
     */
    setViewportSource(viewportId: string, source: ViewportSource): void {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return;

        viewport.source = source;
        this.requestRender();

        this.emit('viewportSourceChanged', { viewportId, source });
    }

    /**
     * Atualiza zoom
     */
    setZoom(viewportId: string, zoom: number, center?: { x: number; y: number }): void {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return;

        const oldZoom = viewport.zoom;
        viewport.zoom = Math.max(0.1, Math.min(10, zoom));

        // Ajustar pan para manter centro
        if (center) {
            const ratio = viewport.zoom / oldZoom;
            viewport.pan.x = center.x - (center.x - viewport.pan.x) * ratio;
            viewport.pan.y = center.y - (center.y - viewport.pan.y) * ratio;
        }

        this.requestRender();
        this.emit('viewportZoomChanged', { viewportId, zoom: viewport.zoom });
    }

    /**
     * Fit to viewport
     */
    fitToViewport(viewportId: string): void {
        const viewport = this.viewports.get(viewportId);
        if (!viewport) return;

        const contentWidth = this.resolution.width;
        const contentHeight = this.resolution.height;

        const scaleX = viewport.width / contentWidth;
        const scaleY = viewport.height / contentHeight;
        viewport.zoom = Math.min(scaleX, scaleY);

        viewport.pan = {
            x: (viewport.width - contentWidth * viewport.zoom) / 2,
            y: (viewport.height - contentHeight * viewport.zoom) / 2,
        };

        this.requestRender();
    }

    /**
     * Define modo de layout
     */
    setViewportMode(mode: ViewportMode): void {
        this.viewportMode = mode;

        // Reorganizar viewports baseado no modo
        this.arrangeViewports();

        this.emit('viewportModeChanged', { mode });
    }

    private arrangeViewports(): void {
        const viewportList = Array.from(this.viewports.values());
        const containerWidth = this.canvas?.width || 1920;
        const containerHeight = this.canvas?.height || 1080;

        switch (this.viewportMode) {
            case 'single':
                if (viewportList[0]) {
                    viewportList[0].width = containerWidth;
                    viewportList[0].height = containerHeight;
                    viewportList[0].x = 0;
                    viewportList[0].y = 0;
                }
                break;

            case 'split-h':
                const halfWidth = containerWidth / 2;
                viewportList.forEach((vp, i) => {
                    vp.width = halfWidth;
                    vp.height = containerHeight;
                    vp.x = i * halfWidth;
                    vp.y = 0;
                });
                break;

            case 'split-v':
                const halfHeight = containerHeight / 2;
                viewportList.forEach((vp, i) => {
                    vp.width = containerWidth;
                    vp.height = halfHeight;
                    vp.x = 0;
                    vp.y = i * halfHeight;
                });
                break;

            case 'quad':
                const quadW = containerWidth / 2;
                const quadH = containerHeight / 2;
                viewportList.forEach((vp, i) => {
                    vp.width = quadW;
                    vp.height = quadH;
                    vp.x = (i % 2) * quadW;
                    vp.y = Math.floor(i / 2) * quadH;
                });
                break;
        }

        this.requestRender();
    }

    // ========================================================================
    // PLAYBACK CONTROL
    // ========================================================================

    /**
     * Inicia playback
     */
    play(options: PlaybackOptions = {}): void {
        if (this.playback.state === 'playing') return;

        this.playback.state = 'playing';
        
        if (options.speed !== undefined) {
            this.playback.speed = options.speed;
        }

        if (options.startTime !== undefined) {
            this.playback.currentTime = options.startTime;
        }

        this.playback.loop = options.loop ?? this.playback.loop;

        // Iniciar audio context local
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Agendar playback de áudio via AudioProcessingEngine
        if (this.audioEngine && !options.videoOnly) {
            this.scheduleAudioPlayback();
        }
        
        // Sincronizar volume do engine de áudio
        if (this.audioEngine) {
            this.audioEngine.setMasterVolume(
                this.playback.muted ? 0 : this.playback.volume
            );
        }

        this.lastFrameTime = performance.now();
        this.startRenderLoop();
        
        this.onPlaybackStateChangedEmitter.fire({ ...this.playback });
        this.emit('playbackStarted', { time: this.playback.currentTime });
    }

    /**
     * Pausa playback
     */
    pause(): void {
        if (this.playback.state !== 'playing') return;

        this.playback.state = 'paused';
        this.stopRenderLoop();
        
        // Cancelar playback de áudio agendado
        if (this.currentAudioSchedule) {
            this.currentAudioSchedule.cancel();
            this.currentAudioSchedule = undefined;
        }
        
        this.onPlaybackStateChangedEmitter.fire({ ...this.playback });
        this.emit('playbackPaused', { time: this.playback.currentTime });
    }

    /**
     * Para playback
     */
    stop(): void {
        this.playback.state = 'stopped';
        this.playback.currentTime = this.playback.inPoint;
        this.playback.currentFrame = this.timeToFrame(this.playback.inPoint);
        
        this.stopRenderLoop();
        
        // Cancelar playback de áudio
        if (this.currentAudioSchedule) {
            this.currentAudioSchedule.cancel();
            this.currentAudioSchedule = undefined;
        }
        
        this.requestRender();
        this.onPlaybackStateChangedEmitter.fire({ ...this.playback });

        this.emit('playbackStopped', {});
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause(): void {
        if (this.playback.state === 'playing') {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Seek para tempo específico
     */
    seek(time: number): void {
        const clampedTime = Math.max(
            this.playback.inPoint,
            Math.min(this.playback.outPoint, time)
        );

        this.playback.currentTime = clampedTime;
        this.playback.currentFrame = this.timeToFrame(clampedTime);

        this.clearBufferOutsideRange(clampedTime);
        this.prebufferFrames(clampedTime);
        this.requestRender();

        this.emit('seeked', { time: clampedTime, frame: this.playback.currentFrame });
    }

    /**
     * Seek para frame
     */
    seekToFrame(frame: number): void {
        const time = this.frameToTime(frame);
        this.seek(time);
    }

    /**
     * Step forward/backward
     */
    step(frames: number = 1): void {
        const newFrame = this.playback.currentFrame + frames;
        this.seekToFrame(newFrame);
    }

    /**
     * Go to in point
     */
    goToInPoint(): void {
        this.seek(this.playback.inPoint);
    }

    /**
     * Go to out point
     */
    goToOutPoint(): void {
        this.seek(this.playback.outPoint);
    }

    /**
     * Define in point
     */
    setInPoint(time?: number): void {
        this.playback.inPoint = time ?? this.playback.currentTime;
        this.emit('inPointChanged', { time: this.playback.inPoint });
    }

    /**
     * Define out point
     */
    setOutPoint(time?: number): void {
        this.playback.outPoint = time ?? this.playback.currentTime;
        this.emit('outPointChanged', { time: this.playback.outPoint });
    }

    /**
     * Define velocidade
     */
    setSpeed(speed: number): void {
        this.playback.speed = Math.max(-8, Math.min(8, speed));
        this.emit('speedChanged', { speed: this.playback.speed });
    }

    /**
     * Define volume
     */
    setVolume(volume: number): void {
        this.playback.volume = Math.max(0, Math.min(1, volume));
        this.emit('volumeChanged', { volume: this.playback.volume });
    }

    /**
     * Toggle mute
     */
    toggleMute(): void {
        this.playback.muted = !this.playback.muted;
        this.emit('muteChanged', { muted: this.playback.muted });
    }

    /**
     * Define loop
     */
    setLoop(loop: boolean, mode?: 'full' | 'in-out' | 'selection'): void {
        this.playback.loop = loop;
        if (mode) {
            this.playback.loopMode = mode;
        }
        this.emit('loopChanged', { loop, mode: this.playback.loopMode });
    }

    /**
     * Define duração
     */
    setDuration(duration: number): void {
        this.playback.duration = duration;
        this.playback.outPoint = duration;
    }

    /**
     * Define frame rate
     */
    setFrameRate(fps: number, dropFrame: boolean = false): void {
        this.playback.frameRate = fps;
        this.playback.dropFrame = dropFrame;
    }

    // ========================================================================
    // RENDER LOOP
    // ========================================================================

    private startRenderLoop(): void {
        if (this.rafId) return;

        const render = (timestamp: number) => {
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;

            if (this.playback.state === 'playing') {
                this.updatePlaybackTime(deltaTime);
            }

            this.renderFrame();

            this.rafId = requestAnimationFrame(render);
        };

        this.rafId = requestAnimationFrame(render);
    }

    private stopRenderLoop(): void {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = undefined;
        }
    }

    private updatePlaybackTime(deltaMs: number): void {
        const deltaSeconds = (deltaMs / 1000) * this.playback.speed;
        let newTime = this.playback.currentTime + deltaSeconds;

        // Determinar limites de loop
        let loopStart = this.playback.inPoint;
        let loopEnd = this.playback.outPoint;

        if (this.playback.loopMode === 'full') {
            loopStart = 0;
            loopEnd = this.playback.duration;
        }

        // Loop ou parar
        if (newTime >= loopEnd) {
            if (this.playback.loop) {
                newTime = loopStart + (newTime - loopEnd);
            } else {
                newTime = loopEnd;
                this.pause();
            }
        } else if (newTime < loopStart) {
            if (this.playback.loop) {
                newTime = loopEnd - (loopStart - newTime);
            } else {
                newTime = loopStart;
                this.pause();
            }
        }

        this.playback.currentTime = newTime;
        this.playback.currentFrame = this.timeToFrame(newTime);

        this.emit('timeUpdate', {
            time: this.playback.currentTime,
            frame: this.playback.currentFrame,
        });
    }

    private requestRender(): void {
        if (this.playback.state !== 'playing') {
            requestAnimationFrame(() => this.renderFrame());
        }
    }

    private async renderFrame(): Promise<void> {
        if (!this.canvas) return;

        const frame = this.playback.currentFrame;
        const time = this.playback.currentTime;
        let buffer = this.frameBuffer.get(frame);

        // Se não tiver buffer, tentar buscar dos engines
        if (!buffer || !buffer.ready) {
            buffer = await this.fetchFrameFromEngines(frame, time);
        }

        // Renderizar cada viewport
        for (const [, viewport] of this.viewports) {
            await this.renderViewport(viewport, buffer);
        }

        // Renderizar overlays
        this.renderOverlays();

        // Renderizar scopes
        this.updateScopes(buffer);

        // Prefetch próximos frames
        if (this.playback.state === 'playing') {
            this.prebufferFrames(this.playback.currentTime);
        }
        
        // Emitir evento de frame renderizado
        this.onFrameRenderedEmitter.fire({ frame, time });
    }

    /**
     * Busca frame dos engines de mídia conectados
     */
    private async fetchFrameFromEngines(frame: number, time: number): Promise<FrameBuffer> {
        const buffer: FrameBuffer = {
            frame,
            time,
            ready: false,
            rendered: false,
        };

        // Tentar VideoTimelineEngine
        if (this.videoEngine) {
            try {
                const quality = this.quality === 'full' ? 'full' : 
                              this.quality === 'draft' ? 'draft' : 'preview';
                              
                const result = await this.videoEngine.renderFrame(time, quality);
                
                if (result.imageData) {
                    buffer.videoBuffer = {
                        id: `video_${frame}`,
                        type: 'video',
                        width: result.imageData.width,
                        height: result.imageData.height,
                        data: result.imageData.data.buffer,
                        pts: time,
                        duration: 1 / this.playback.frameRate,
                    };
                    buffer.ready = true;
                    buffer.rendered = true;
                }
            } catch (error) {
                console.warn('Failed to render from VideoTimelineEngine:', error);
            }
        }

        // Tentar Scene3DEngine se não tivermos vídeo
        if (this.scene3DEngine && !buffer.ready) {
            try {
                const options: Render3DOptions = {
                    width: this.resolution.width,
                    height: this.resolution.height,
                    quality: this.quality === 'full' ? 'full' : 
                            this.quality === 'draft' ? 'draft' : 'preview',
                    antialiasing: this.quality !== 'draft',
                    shadows: this.quality === 'full',
                };
                
                const imageData = await this.scene3DEngine.renderFrame(undefined, options);
                
                if (imageData) {
                    buffer.videoBuffer = {
                        id: `3d_${frame}`,
                        type: 'image',
                        width: imageData.width,
                        height: imageData.height,
                        data: imageData.data.buffer,
                        pts: time,
                        duration: 1 / this.playback.frameRate,
                    };
                    buffer.ready = true;
                    buffer.rendered = true;
                }
            } catch (error) {
                console.warn('Failed to render from Scene3DEngine:', error);
            }
        }

        // Buscar áudio
        if (this.audioEngine) {
            try {
                const audioDuration = 1 / this.playback.frameRate; // Um frame de áudio
                const audioData = await this.audioEngine.getAudioBuffer(time, audioDuration);
                
                if (audioData && audioData.length > 0) {
                    const samples = audioData[0].length;
                    const channels = audioData.length;
                    
                    // Converter para buffer interleaved
                    const interleaved = new Float32Array(samples * channels);
                    for (let s = 0; s < samples; s++) {
                        for (let c = 0; c < channels; c++) {
                            interleaved[s * channels + c] = audioData[c][s];
                        }
                    }
                    
                    buffer.audioBuffer = {
                        id: `audio_${frame}`,
                        type: 'audio',
                        channels,
                        sampleRate: 48000, // Assumindo 48kHz
                        data: interleaved.buffer,
                        pts: time,
                        duration: audioDuration,
                    };
                }
            } catch (error) {
                console.warn('Failed to get audio from AudioProcessingEngine:', error);
            }
        }

        // Armazenar no cache
        this.frameBuffer.set(frame, buffer);
        
        return buffer;
    }

    private async renderViewport(viewport: Viewport, buffer?: FrameBuffer): Promise<void> {
        // Se tivermos dados de vídeo/3D, renderizar no canvas
        if (buffer?.videoBuffer?.data) {
            await this.renderImageToViewport(viewport, buffer.videoBuffer);
            return;
        }
        
        // Se o viewport tem fonte 3D específica
        if (viewport.source?.type === 'camera' && this.scene3DEngine) {
            try {
                const imageData = await this.scene3DEngine.renderFrame(viewport.source.cameraId);
                if (imageData) {
                    const renderBuffer: RenderBuffer = {
                        id: `3d_viewport_${viewport.id}`,
                        type: 'image',
                        width: imageData.width,
                        height: imageData.height,
                        data: imageData.data.buffer,
                        pts: this.playback.currentTime,
                        duration: 0,
                    };
                    await this.renderImageToViewport(viewport, renderBuffer);
                    return;
                }
            } catch (error) {
                console.warn('Failed to render 3D to viewport:', error);
            }
        }

        // Fallback: renderizar placeholder
        this.renderPlaceholder(viewport);
    }
    
    /**
     * Renderiza imagem no viewport
     */
    private async renderImageToViewport(viewport: Viewport, buffer: RenderBuffer): Promise<void> {
        const ctx = this.canvas?.getContext('2d');
        if (!ctx || !buffer.data || !buffer.width || !buffer.height) {
            this.renderPlaceholder(viewport);
            return;
        }
        
        try {
            // Criar ImageData a partir do buffer
            const imageData = new ImageData(
                new Uint8ClampedArray(buffer.data),
                buffer.width,
                buffer.height
            );
            
            // Criar bitmap para melhor performance
            const bitmap = await createImageBitmap(imageData);
            
            // Aplicar transformações do viewport
            ctx.save();
            ctx.translate(viewport.x, viewport.y);
            ctx.translate(viewport.pan.x, viewport.pan.y);
            ctx.scale(viewport.zoom, viewport.zoom);
            
            // Desenhar
            ctx.drawImage(
                bitmap,
                0,
                0,
                viewport.width / viewport.zoom,
                viewport.height / viewport.zoom
            );
            
            ctx.restore();
            bitmap.close();
        } catch (error) {
            console.warn('Failed to render image to viewport:', error);
            this.renderPlaceholder(viewport);
        }
    }

    private renderPlaceholder(viewport: Viewport): void {
        const ctx = this.canvas?.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = viewport.settings.backgroundColor;
        ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);

        if (viewport.settings.checkerboard) {
            this.drawCheckerboard(ctx, viewport);
        }
    }

    private drawCheckerboard(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport
    ): void {
        const size = 10;
        const colors = ['#2a2a2a', '#3a3a3a'];

        for (let y = 0; y < viewport.height; y += size) {
            for (let x = 0; x < viewport.width; x += size) {
                const color = colors[((x + y) / size) % 2 | 0];
                ctx.fillStyle = color;
                ctx.fillRect(
                    viewport.x + x,
                    viewport.y + y,
                    size,
                    size
                );
            }
        }
    }

    private renderOverlays(): void {
        const ctx = this.canvas?.getContext('2d');
        if (!ctx) return;

        for (const [, viewport] of this.viewports) {
            for (const overlay of viewport.overlays) {
                if (!overlay.enabled) continue;

                switch (overlay.type) {
                    case 'safe-area':
                        this.drawSafeArea(ctx, viewport, overlay.settings);
                        break;
                    case 'grid':
                        this.drawGrid(ctx, viewport, overlay.settings);
                        break;
                    case 'center-cross':
                        this.drawCenterCross(ctx, viewport);
                        break;
                    case 'thirds':
                        this.drawThirds(ctx, viewport);
                        break;
                    case 'timecode':
                        this.drawTimecode(ctx, viewport);
                        break;
                }
            }
        }
    }

    private drawSafeArea(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport,
        settings: Record<string, unknown>
    ): void {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        const actionInset = 0.05;
        const titleInset = 0.1;

        // Action safe (95%)
        const actionRect = {
            x: viewport.x + viewport.width * actionInset,
            y: viewport.y + viewport.height * actionInset,
            width: viewport.width * (1 - actionInset * 2),
            height: viewport.height * (1 - actionInset * 2),
        };
        ctx.strokeRect(actionRect.x, actionRect.y, actionRect.width, actionRect.height);

        // Title safe (90%)
        const titleRect = {
            x: viewport.x + viewport.width * titleInset,
            y: viewport.y + viewport.height * titleInset,
            width: viewport.width * (1 - titleInset * 2),
            height: viewport.height * (1 - titleInset * 2),
        };
        ctx.strokeRect(titleRect.x, titleRect.y, titleRect.width, titleRect.height);

        ctx.setLineDash([]);
    }

    private drawGrid(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport,
        settings: Record<string, unknown>
    ): void {
        const gridSize = viewport.settings.gridSize;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let x = viewport.x; x < viewport.x + viewport.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, viewport.y);
            ctx.lineTo(x, viewport.y + viewport.height);
            ctx.stroke();
        }

        for (let y = viewport.y; y < viewport.y + viewport.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(viewport.x, y);
            ctx.lineTo(viewport.x + viewport.width, y);
            ctx.stroke();
        }
    }

    private drawCenterCross(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport
    ): void {
        const cx = viewport.x + viewport.width / 2;
        const cy = viewport.y + viewport.height / 2;
        const size = 20;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
    }

    private drawThirds(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport
    ): void {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        const third = { w: viewport.width / 3, h: viewport.height / 3 };

        // Linhas verticais
        ctx.beginPath();
        ctx.moveTo(viewport.x + third.w, viewport.y);
        ctx.lineTo(viewport.x + third.w, viewport.y + viewport.height);
        ctx.moveTo(viewport.x + third.w * 2, viewport.y);
        ctx.lineTo(viewport.x + third.w * 2, viewport.y + viewport.height);

        // Linhas horizontais
        ctx.moveTo(viewport.x, viewport.y + third.h);
        ctx.lineTo(viewport.x + viewport.width, viewport.y + third.h);
        ctx.moveTo(viewport.x, viewport.y + third.h * 2);
        ctx.lineTo(viewport.x + viewport.width, viewport.y + third.h * 2);
        ctx.stroke();
    }

    private drawTimecode(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport
    ): void {
        const timecode = this.formatTimecode(
            this.playback.currentTime,
            this.playback.frameRate,
            this.playback.dropFrame
        );

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(viewport.x + 10, viewport.y + 10, 150, 30);

        ctx.font = '16px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(timecode, viewport.x + 20, viewport.y + 30);
    }

    // ========================================================================
    // SCOPES
    // ========================================================================

    /**
     * Adiciona scope
     */
    addScope(type: ScopeType, settings: Partial<ScopeSettings> = {}): VideoScope {
        const scope: VideoScope = {
            id: this.generateId(),
            type,
            enabled: true,
            settings: {
                ...settings,
            },
            width: 256,
            height: 256,
        };

        this.scopes.set(scope.id, scope);
        this.emit('scopeAdded', scope);

        return scope;
    }

    /**
     * Remove scope
     */
    removeScope(scopeId: string): void {
        this.scopes.delete(scopeId);
        this.emit('scopeRemoved', { scopeId });
    }

    private updateScopes(buffer?: FrameBuffer): void {
        if (!buffer?.videoBuffer?.data) return;

        for (const [, scope] of this.scopes) {
            if (!scope.enabled) continue;

            switch (scope.type) {
                case 'waveform':
                    this.calculateWaveform(buffer.videoBuffer, scope);
                    break;
                case 'vectorscope':
                    this.calculateVectorscope(buffer.videoBuffer, scope);
                    break;
                case 'histogram':
                    this.calculateHistogram(buffer.videoBuffer, scope);
                    break;
            }
        }
    }

    private calculateWaveform(buffer: RenderBuffer, scope: VideoScope): void {
        // Implementação de waveform
    }

    private calculateVectorscope(buffer: RenderBuffer, scope: VideoScope): void {
        // Implementação de vectorscope
    }

    private calculateHistogram(buffer: RenderBuffer, scope: VideoScope): void {
        // Implementação de histogram
    }

    // ========================================================================
    // COMPARE
    // ========================================================================

    /**
     * Inicia comparação A/B
     */
    startCompare(
        sourceA: ViewportSource,
        sourceB: ViewportSource,
        mode: CompareMode = 'split'
    ): CompareSession {
        this.compareSession = {
            id: this.generateId(),
            mode,
            sourceA,
            sourceB,
            wipePosition: 0.5,
            wipeAngle: 0,
            opacity: 0.5,
            syncPlayback: true,
        };

        this.emit('compareStarted', this.compareSession);
        this.requestRender();

        return this.compareSession;
    }

    /**
     * Atualiza posição do wipe
     */
    setWipePosition(position: number): void {
        if (!this.compareSession) return;

        this.compareSession.wipePosition = Math.max(0, Math.min(1, position));
        this.requestRender();
    }

    /**
     * Encerra comparação
     */
    endCompare(): void {
        this.compareSession = undefined;
        this.emit('compareEnded', {});
        this.requestRender();
    }

    // ========================================================================
    // BUFFERING
    // ========================================================================

    private prebufferFrames(currentTime: number): void {
        const currentFrame = this.timeToFrame(currentTime);
        const fps = this.playback.frameRate;
        
        // Calcular frames para buffer
        const ahead = Math.ceil(this.playback.bufferAhead * fps);
        const behind = Math.ceil(this.playback.bufferBehind * fps);

        for (let offset = -behind; offset <= ahead; offset++) {
            const frame = currentFrame + offset;
            if (frame >= 0 && !this.frameBuffer.has(frame)) {
                this.requestFrameRender(frame);
            }
        }
    }

    private requestFrameRender(frame: number): void {
        // Solicitar render do frame
        const buffer: FrameBuffer = {
            frame,
            time: this.frameToTime(frame),
            ready: false,
            rendered: false,
        };

        this.frameBuffer.set(frame, buffer);

        // Simular render assíncrono
        setTimeout(() => {
            buffer.ready = true;
            buffer.rendered = true;
            this.emit('frameBuffered', { frame });
        }, 10);
    }

    private clearBufferOutsideRange(currentTime: number): void {
        const currentFrame = this.timeToFrame(currentTime);
        const fps = this.playback.frameRate;
        const ahead = Math.ceil(this.playback.bufferAhead * fps * 2);
        const behind = Math.ceil(this.playback.bufferBehind * fps * 2);

        for (const [frame] of this.frameBuffer) {
            if (frame < currentFrame - behind || frame > currentFrame + ahead) {
                this.frameBuffer.delete(frame);
            }
        }
    }

    // ========================================================================
    // QUALITY
    // ========================================================================

    /**
     * Define qualidade de preview
     */
    setQuality(quality: PreviewQuality): void {
        this.quality = quality;

        // Ajustar resolução baseado na qualidade
        switch (quality) {
            case 'draft':
                this.resolution = { width: 640, height: 360 };
                break;
            case 'preview':
                this.resolution = { width: 1280, height: 720 };
                break;
            case 'full':
                this.resolution = { width: 1920, height: 1080 };
                break;
            case 'proxy':
                this.resolution = { width: 960, height: 540 };
                break;
        }

        this.clearBuffer();
        this.requestRender();

        this.emit('qualityChanged', { quality, resolution: this.resolution });
    }

    /**
     * Define resolução customizada
     */
    setResolution(width: number, height: number): void {
        this.resolution = { width, height };
        this.clearBuffer();
        this.requestRender();
    }

    private clearBuffer(): void {
        this.frameBuffer.clear();
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private timeToFrame(time: number): number {
        return Math.floor(time * this.playback.frameRate);
    }

    private frameToTime(frame: number): number {
        return frame / this.playback.frameRate;
    }

    /**
     * Formata timecode
     */
    formatTimecode(
        time: number,
        fps: number,
        dropFrame: boolean = false
    ): string {
        const totalFrames = Math.floor(time * fps);
        
        const hours = Math.floor(totalFrames / (fps * 3600));
        const minutes = Math.floor((totalFrames % (fps * 3600)) / (fps * 60));
        const seconds = Math.floor((totalFrames % (fps * 60)) / fps);
        const frames = totalFrames % fps;

        const separator = dropFrame ? ';' : ':';

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0'),
            frames.toString().padStart(2, '0'),
        ].join(separator);
    }

    /**
     * Parse timecode
     */
    parseTimecode(timecode: string, fps: number): number {
        const parts = timecode.split(/[:;]/).map(Number);
        if (parts.length !== 4) return 0;

        const [hours, minutes, seconds, frames] = parts;
        const totalFrames = 
            hours * fps * 3600 +
            minutes * fps * 60 +
            seconds * fps +
            frames;

        return totalFrames / fps;
    }

    private generateId(): string {
        return `prev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // ========================================================================
    // AUDIO SCHEDULING
    // ========================================================================
    
    /**
     * Agenda playback de áudio sincronizado com o vídeo
     */
    private scheduleAudioPlayback(): void {
        if (!this.audioEngine) return;
        
        // Cancelar schedule anterior
        if (this.currentAudioSchedule) {
            this.currentAudioSchedule.cancel();
        }
        
        // Calcular duração até out point ou fim
        const duration = this.playback.loop 
            ? undefined // Loop infinito
            : this.playback.outPoint - this.playback.currentTime;
        
        this.currentAudioSchedule = this.audioEngine.schedulePlayback(
            this.playback.currentTime,
            duration
        );
    }
    
    /**
     * Atualiza volume do áudio
     */
    private updateAudioVolume(): void {
        if (!this.audioEngine) return;
        
        const effectiveVolume = this.playback.muted ? 0 : this.playback.volume;
        this.audioEngine.setMasterVolume(effectiveVolume);
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    getPlaybackState(): PlaybackController {
        return { ...this.playback };
    }

    getViewport(id: string): Viewport | undefined {
        return this.viewports.get(id);
    }

    getActiveViewport(): Viewport | undefined {
        return this.activeViewportId 
            ? this.viewports.get(this.activeViewportId)
            : undefined;
    }

    getAllViewports(): Viewport[] {
        return Array.from(this.viewports.values());
    }

    getScopes(): VideoScope[] {
        return Array.from(this.scopes.values());
    }

    getCurrentTime(): number {
        return this.playback.currentTime;
    }

    getCurrentFrame(): number {
        return this.playback.currentFrame;
    }
    
    /**
     * Retorna se os engines de mídia estão conectados
     */
    getEngineStatus(): { video: boolean; audio: boolean; scene3d: boolean } {
        return {
            video: !!this.videoEngine,
            audio: !!this.audioEngine,
            scene3d: !!this.scene3DEngine,
        };
    }
    
    /**
     * Retorna informações do projeto de vídeo atual
     */
    getVideoProject(): VideoProjectRef | null {
        return this.videoEngine?.getCurrentProject() ?? null;
    }
    
    /**
     * Retorna informações do projeto de áudio atual
     */
    getAudioProject(): AudioProjectRef | null {
        return this.audioEngine?.getCurrentProject() ?? null;
    }
    
    /**
     * Retorna informações da cena 3D atual
     */
    getCurrentScene(): Scene3DRef | null {
        return this.scene3DEngine?.getCurrentScene() ?? null;
    }
    
    /**
     * Retorna lista de câmeras disponíveis (para 3D)
     */
    getAvailableCameras(): Camera3DRef[] {
        return this.scene3DEngine?.getCameras() ?? [];
    }
    
    /**
     * Define câmera ativa para preview 3D
     */
    setActiveCamera(cameraId: string): void {
        this.scene3DEngine?.setActiveCamera(cameraId);
    }
    
    /**
     * Retorna níveis de áudio atuais
     */
    getAudioLevels(): { master: AudioLevelInfo; tracks: Map<string, AudioLevelInfo> } | null {
        if (!this.audioEngine) return null;
        
        return {
            master: this.audioEngine.getMasterLevel(),
            tracks: this.audioEngine.getTrackLevels(),
        };
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    on(event: string, callback: (data: unknown) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (data: unknown) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: unknown): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    dispose(): void {
        this.stopRenderLoop();
        
        // Cancelar playback de áudio
        if (this.currentAudioSchedule) {
            this.currentAudioSchedule.cancel();
            this.currentAudioSchedule = undefined;
        }
        
        // Limpar event handlers dos engines
        this.engineEventCleanups.forEach(cleanup => cleanup());
        this.engineEventCleanups = [];
        
        // Limpar referências aos engines
        this.videoEngine = undefined;
        this.audioEngine = undefined;
        this.scene3DEngine = undefined;
        
        // Fechar audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Dispose emitters
        this.onFrameRenderedEmitter.dispose();
        this.onPlaybackStateChangedEmitter.dispose();
        this.onMediaEngineConnectedEmitter.dispose();

        this.frameBuffer.clear();
        this.viewports.clear();
        this.scopes.clear();
        this.listeners.clear();
    }
}

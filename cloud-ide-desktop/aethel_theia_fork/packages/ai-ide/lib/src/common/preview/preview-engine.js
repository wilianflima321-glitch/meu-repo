"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewEngine = exports.Scene3DEngineSymbol = exports.AudioProcessingEngineSymbol = exports.VideoTimelineEngineSymbol = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.callbacks = new Set();
    }
    get event() {
        return (callback) => {
            this.callbacks.add(callback);
            return {
                dispose: () => this.callbacks.delete(callback)
            };
        };
    }
    fire(data) {
        this.callbacks.forEach(cb => cb(data));
    }
    dispose() {
        this.callbacks.clear();
    }
}
// Forward declarations para evitar imports circulares
exports.VideoTimelineEngineSymbol = Symbol('VideoTimelineEngine');
exports.AudioProcessingEngineSymbol = Symbol('AudioProcessingEngine');
exports.Scene3DEngineSymbol = Symbol('Scene3DEngine');
// ============================================================================
// PREVIEW ENGINE
// ============================================================================
let PreviewEngine = class PreviewEngine {
    constructor() {
        // Viewports
        this.viewports = new Map();
        this.viewportMode = 'single';
        // Scopes
        this.scopes = new Map();
        // Buffers
        this.frameBuffer = new Map();
        this.bufferSize = 30;
        // Qualidade
        this.quality = 'preview';
        this.resolution = { width: 1920, height: 1080 };
        this.lastFrameTime = 0;
        // Eventos
        this.listeners = new Map();
        // Engine event handlers
        this.engineEventCleanups = [];
        // Emitters para eventos Theia
        this.onFrameRenderedEmitter = new Emitter();
        this.onFrameRendered = this.onFrameRenderedEmitter.event;
        this.onPlaybackStateChangedEmitter = new Emitter();
        this.onPlaybackStateChanged = this.onPlaybackStateChangedEmitter.event;
        this.onMediaEngineConnectedEmitter = new Emitter();
        this.onMediaEngineConnected = this.onMediaEngineConnectedEmitter.event;
        this.playback = this.createPlaybackController();
        this.setupDefaultViewport();
    }
    // ========================================================================
    // MEDIA ENGINE SETTERS (Para conexão em runtime)
    // ========================================================================
    /**
     * Conecta o VideoTimelineEngine
     */
    setVideoEngine(engine) {
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
    setAudioEngine(engine) {
        this.audioEngine = engine;
        this.setupAudioEngineEvents();
        this.onMediaEngineConnectedEmitter.fire({ type: 'audio' });
    }
    /**
     * Conecta o Scene3DEngine
     */
    setScene3DEngine(engine) {
        this.scene3DEngine = engine;
        this.setupScene3DEngineEvents();
        this.onMediaEngineConnectedEmitter.fire({ type: '3d' });
    }
    /**
     * Configura eventos do VideoTimelineEngine
     */
    setupVideoEngineEvents() {
        if (!this.videoEngine)
            return;
        const handleTimelineChange = (data) => {
            const state = data;
            if (this.playback.state !== 'playing') {
                this.playback.currentTime = state.currentTime;
                this.playback.currentFrame = state.currentFrame;
                this.requestRender();
            }
        };
        const handleProjectLoaded = (data) => {
            const project = data;
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
    setupAudioEngineEvents() {
        if (!this.audioEngine)
            return;
        const handleLevelUpdate = (data) => {
            const levels = data;
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
    setupScene3DEngineEvents() {
        if (!this.scene3DEngine)
            return;
        const handleCameraChange = (data) => {
            const camera = data;
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
    createPlaybackController() {
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
    setupDefaultViewport() {
        const viewport = {
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
    initialize(canvas) {
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
    createViewport(options = {}) {
        const viewport = {
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
    removeViewport(viewportId) {
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
    setActiveViewport(viewportId) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport)
            return;
        // Desativar anterior
        if (this.activeViewportId) {
            const prev = this.viewports.get(this.activeViewportId);
            if (prev)
                prev.active = false;
        }
        viewport.active = true;
        this.activeViewportId = viewportId;
        this.emit('activeViewportChanged', viewport);
    }
    /**
     * Define fonte do viewport
     */
    setViewportSource(viewportId, source) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport)
            return;
        viewport.source = source;
        this.requestRender();
        this.emit('viewportSourceChanged', { viewportId, source });
    }
    /**
     * Atualiza zoom
     */
    setZoom(viewportId, zoom, center) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport)
            return;
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
    fitToViewport(viewportId) {
        const viewport = this.viewports.get(viewportId);
        if (!viewport)
            return;
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
    setViewportMode(mode) {
        this.viewportMode = mode;
        // Reorganizar viewports baseado no modo
        this.arrangeViewports();
        this.emit('viewportModeChanged', { mode });
    }
    arrangeViewports() {
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
    play(options = {}) {
        if (this.playback.state === 'playing')
            return;
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
            this.audioEngine.setMasterVolume(this.playback.muted ? 0 : this.playback.volume);
        }
        this.lastFrameTime = performance.now();
        this.startRenderLoop();
        this.onPlaybackStateChangedEmitter.fire({ ...this.playback });
        this.emit('playbackStarted', { time: this.playback.currentTime });
    }
    /**
     * Pausa playback
     */
    pause() {
        if (this.playback.state !== 'playing')
            return;
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
    stop() {
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
    togglePlayPause() {
        if (this.playback.state === 'playing') {
            this.pause();
        }
        else {
            this.play();
        }
    }
    /**
     * Seek para tempo específico
     */
    seek(time) {
        const clampedTime = Math.max(this.playback.inPoint, Math.min(this.playback.outPoint, time));
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
    seekToFrame(frame) {
        const time = this.frameToTime(frame);
        this.seek(time);
    }
    /**
     * Step forward/backward
     */
    step(frames = 1) {
        const newFrame = this.playback.currentFrame + frames;
        this.seekToFrame(newFrame);
    }
    /**
     * Go to in point
     */
    goToInPoint() {
        this.seek(this.playback.inPoint);
    }
    /**
     * Go to out point
     */
    goToOutPoint() {
        this.seek(this.playback.outPoint);
    }
    /**
     * Define in point
     */
    setInPoint(time) {
        this.playback.inPoint = time ?? this.playback.currentTime;
        this.emit('inPointChanged', { time: this.playback.inPoint });
    }
    /**
     * Define out point
     */
    setOutPoint(time) {
        this.playback.outPoint = time ?? this.playback.currentTime;
        this.emit('outPointChanged', { time: this.playback.outPoint });
    }
    /**
     * Define velocidade
     */
    setSpeed(speed) {
        this.playback.speed = Math.max(-8, Math.min(8, speed));
        this.emit('speedChanged', { speed: this.playback.speed });
    }
    /**
     * Define volume
     */
    setVolume(volume) {
        this.playback.volume = Math.max(0, Math.min(1, volume));
        this.emit('volumeChanged', { volume: this.playback.volume });
    }
    /**
     * Toggle mute
     */
    toggleMute() {
        this.playback.muted = !this.playback.muted;
        this.emit('muteChanged', { muted: this.playback.muted });
    }
    /**
     * Define loop
     */
    setLoop(loop, mode) {
        this.playback.loop = loop;
        if (mode) {
            this.playback.loopMode = mode;
        }
        this.emit('loopChanged', { loop, mode: this.playback.loopMode });
    }
    /**
     * Define duração
     */
    setDuration(duration) {
        this.playback.duration = duration;
        this.playback.outPoint = duration;
    }
    /**
     * Define frame rate
     */
    setFrameRate(fps, dropFrame = false) {
        this.playback.frameRate = fps;
        this.playback.dropFrame = dropFrame;
    }
    // ========================================================================
    // RENDER LOOP
    // ========================================================================
    startRenderLoop() {
        if (this.rafId)
            return;
        const render = (timestamp) => {
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
    stopRenderLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = undefined;
        }
    }
    updatePlaybackTime(deltaMs) {
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
            }
            else {
                newTime = loopEnd;
                this.pause();
            }
        }
        else if (newTime < loopStart) {
            if (this.playback.loop) {
                newTime = loopEnd - (loopStart - newTime);
            }
            else {
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
    requestRender() {
        if (this.playback.state !== 'playing') {
            requestAnimationFrame(() => this.renderFrame());
        }
    }
    async renderFrame() {
        if (!this.canvas)
            return;
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
    async fetchFrameFromEngines(frame, time) {
        const buffer = {
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
            }
            catch (error) {
                console.warn('Failed to render from VideoTimelineEngine:', error);
            }
        }
        // Tentar Scene3DEngine se não tivermos vídeo
        if (this.scene3DEngine && !buffer.ready) {
            try {
                const options = {
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
            }
            catch (error) {
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
            }
            catch (error) {
                console.warn('Failed to get audio from AudioProcessingEngine:', error);
            }
        }
        // Armazenar no cache
        this.frameBuffer.set(frame, buffer);
        return buffer;
    }
    async renderViewport(viewport, buffer) {
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
                    const renderBuffer = {
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
            }
            catch (error) {
                console.warn('Failed to render 3D to viewport:', error);
            }
        }
        // Fallback: renderizar placeholder
        this.renderPlaceholder(viewport);
    }
    /**
     * Renderiza imagem no viewport
     */
    async renderImageToViewport(viewport, buffer) {
        const ctx = this.canvas?.getContext('2d');
        if (!ctx || !buffer.data || !buffer.width || !buffer.height) {
            this.renderPlaceholder(viewport);
            return;
        }
        try {
            // Criar ImageData a partir do buffer
            const imageData = new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height);
            // Criar bitmap para melhor performance
            const bitmap = await createImageBitmap(imageData);
            // Aplicar transformações do viewport
            ctx.save();
            ctx.translate(viewport.x, viewport.y);
            ctx.translate(viewport.pan.x, viewport.pan.y);
            ctx.scale(viewport.zoom, viewport.zoom);
            // Desenhar
            ctx.drawImage(bitmap, 0, 0, viewport.width / viewport.zoom, viewport.height / viewport.zoom);
            ctx.restore();
            bitmap.close();
        }
        catch (error) {
            console.warn('Failed to render image to viewport:', error);
            this.renderPlaceholder(viewport);
        }
    }
    renderPlaceholder(viewport) {
        const ctx = this.canvas?.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = viewport.settings.backgroundColor;
        ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
        if (viewport.settings.checkerboard) {
            this.drawCheckerboard(ctx, viewport);
        }
    }
    drawCheckerboard(ctx, viewport) {
        const size = 10;
        const colors = ['#2a2a2a', '#3a3a3a'];
        for (let y = 0; y < viewport.height; y += size) {
            for (let x = 0; x < viewport.width; x += size) {
                const color = colors[((x + y) / size) % 2 | 0];
                ctx.fillStyle = color;
                ctx.fillRect(viewport.x + x, viewport.y + y, size, size);
            }
        }
    }
    renderOverlays() {
        const ctx = this.canvas?.getContext('2d');
        if (!ctx)
            return;
        for (const [, viewport] of this.viewports) {
            for (const overlay of viewport.overlays) {
                if (!overlay.enabled)
                    continue;
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
    drawSafeArea(ctx, viewport, settings) {
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
    drawGrid(ctx, viewport, settings) {
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
    drawCenterCross(ctx, viewport) {
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
    drawThirds(ctx, viewport) {
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
    drawTimecode(ctx, viewport) {
        const timecode = this.formatTimecode(this.playback.currentTime, this.playback.frameRate, this.playback.dropFrame);
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
    addScope(type, settings = {}) {
        const scope = {
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
    removeScope(scopeId) {
        this.scopes.delete(scopeId);
        this.emit('scopeRemoved', { scopeId });
    }
    updateScopes(buffer) {
        if (!buffer?.videoBuffer?.data)
            return;
        for (const [, scope] of this.scopes) {
            if (!scope.enabled)
                continue;
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
    calculateWaveform(buffer, scope) {
        // Implementação de waveform
    }
    calculateVectorscope(buffer, scope) {
        // Implementação de vectorscope
    }
    calculateHistogram(buffer, scope) {
        // Implementação de histogram
    }
    // ========================================================================
    // COMPARE
    // ========================================================================
    /**
     * Inicia comparação A/B
     */
    startCompare(sourceA, sourceB, mode = 'split') {
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
    setWipePosition(position) {
        if (!this.compareSession)
            return;
        this.compareSession.wipePosition = Math.max(0, Math.min(1, position));
        this.requestRender();
    }
    /**
     * Encerra comparação
     */
    endCompare() {
        this.compareSession = undefined;
        this.emit('compareEnded', {});
        this.requestRender();
    }
    // ========================================================================
    // BUFFERING
    // ========================================================================
    prebufferFrames(currentTime) {
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
    requestFrameRender(frame) {
        // Solicitar render do frame
        const buffer = {
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
    clearBufferOutsideRange(currentTime) {
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
    setQuality(quality) {
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
    setResolution(width, height) {
        this.resolution = { width, height };
        this.clearBuffer();
        this.requestRender();
    }
    clearBuffer() {
        this.frameBuffer.clear();
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    timeToFrame(time) {
        return Math.floor(time * this.playback.frameRate);
    }
    frameToTime(frame) {
        return frame / this.playback.frameRate;
    }
    /**
     * Formata timecode
     */
    formatTimecode(time, fps, dropFrame = false) {
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
    parseTimecode(timecode, fps) {
        const parts = timecode.split(/[:;]/).map(Number);
        if (parts.length !== 4)
            return 0;
        const [hours, minutes, seconds, frames] = parts;
        const totalFrames = hours * fps * 3600 +
            minutes * fps * 60 +
            seconds * fps +
            frames;
        return totalFrames / fps;
    }
    generateId() {
        return `prev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // ========================================================================
    // AUDIO SCHEDULING
    // ========================================================================
    /**
     * Agenda playback de áudio sincronizado com o vídeo
     */
    scheduleAudioPlayback() {
        if (!this.audioEngine)
            return;
        // Cancelar schedule anterior
        if (this.currentAudioSchedule) {
            this.currentAudioSchedule.cancel();
        }
        // Calcular duração até out point ou fim
        const duration = this.playback.loop
            ? undefined // Loop infinito
            : this.playback.outPoint - this.playback.currentTime;
        this.currentAudioSchedule = this.audioEngine.schedulePlayback(this.playback.currentTime, duration);
    }
    /**
     * Atualiza volume do áudio
     */
    updateAudioVolume() {
        if (!this.audioEngine)
            return;
        const effectiveVolume = this.playback.muted ? 0 : this.playback.volume;
        this.audioEngine.setMasterVolume(effectiveVolume);
    }
    // ========================================================================
    // GETTERS
    // ========================================================================
    getPlaybackState() {
        return { ...this.playback };
    }
    getViewport(id) {
        return this.viewports.get(id);
    }
    getActiveViewport() {
        return this.activeViewportId
            ? this.viewports.get(this.activeViewportId)
            : undefined;
    }
    getAllViewports() {
        return Array.from(this.viewports.values());
    }
    getScopes() {
        return Array.from(this.scopes.values());
    }
    getCurrentTime() {
        return this.playback.currentTime;
    }
    getCurrentFrame() {
        return this.playback.currentFrame;
    }
    /**
     * Retorna se os engines de mídia estão conectados
     */
    getEngineStatus() {
        return {
            video: !!this.videoEngine,
            audio: !!this.audioEngine,
            scene3d: !!this.scene3DEngine,
        };
    }
    /**
     * Retorna informações do projeto de vídeo atual
     */
    getVideoProject() {
        return this.videoEngine?.getCurrentProject() ?? null;
    }
    /**
     * Retorna informações do projeto de áudio atual
     */
    getAudioProject() {
        return this.audioEngine?.getCurrentProject() ?? null;
    }
    /**
     * Retorna informações da cena 3D atual
     */
    getCurrentScene() {
        return this.scene3DEngine?.getCurrentScene() ?? null;
    }
    /**
     * Retorna lista de câmeras disponíveis (para 3D)
     */
    getAvailableCameras() {
        return this.scene3DEngine?.getCameras() ?? [];
    }
    /**
     * Define câmera ativa para preview 3D
     */
    setActiveCamera(cameraId) {
        this.scene3DEngine?.setActiveCamera(cameraId);
    }
    /**
     * Retorna níveis de áudio atuais
     */
    getAudioLevels() {
        if (!this.audioEngine)
            return null;
        return {
            master: this.audioEngine.getMasterLevel(),
            tracks: this.audioEngine.getTrackLevels(),
        };
    }
    // ========================================================================
    // EVENTS
    // ========================================================================
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }
    emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
    // ========================================================================
    // CLEANUP
    // ========================================================================
    dispose() {
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
};
exports.PreviewEngine = PreviewEngine;
__decorate([
    (0, inversify_1.inject)(exports.VideoTimelineEngineSymbol),
    (0, inversify_1.optional)(),
    __metadata("design:type", Object)
], PreviewEngine.prototype, "videoEngine", void 0);
__decorate([
    (0, inversify_1.inject)(exports.AudioProcessingEngineSymbol),
    (0, inversify_1.optional)(),
    __metadata("design:type", Object)
], PreviewEngine.prototype, "audioEngine", void 0);
__decorate([
    (0, inversify_1.inject)(exports.Scene3DEngineSymbol),
    (0, inversify_1.optional)(),
    __metadata("design:type", Object)
], PreviewEngine.prototype, "scene3DEngine", void 0);
exports.PreviewEngine = PreviewEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], PreviewEngine);

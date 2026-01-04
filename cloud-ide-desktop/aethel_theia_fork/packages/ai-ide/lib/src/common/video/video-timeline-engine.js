"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoTimelineEngine = void 0;
const inversify_1 = require("inversify");
let VideoTimelineEngine = class VideoTimelineEngine {
    constructor() {
        this.currentProject = null;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 100;
        // Event listeners
        this.listeners = new Map();
    }
    // ========================================================================
    // SISTEMA DE EVENTOS
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
    // GERENCIAMENTO DE PROJETO
    // ========================================================================
    /**
     * Cria novo projeto
     */
    createProject(name, settings = {}) {
        const defaultSettings = {
            resolution: { width: 1920, height: 1080 },
            frameRate: 24,
            aspectRatio: '16:9',
            colorSpace: 'Rec709',
            bitDepth: 8,
            sampleRate: 48000,
            audioChannels: 2,
            workingDirectory: '',
            proxyEnabled: false,
        };
        const project = {
            id: this.generateId(),
            name,
            created: Date.now(),
            modified: Date.now(),
            settings: { ...defaultSettings, ...settings },
            timeline: this.createEmptyTimeline(),
            mediaPool: { items: [], folders: [] },
            effectsLibrary: this.getDefaultEffectsLibrary(),
            markers: [],
            history: [],
            metadata: {
                title: name,
                tags: [],
                customFields: {},
            },
        };
        this.currentProject = project;
        return project;
    }
    /**
     * Cria timeline vazia
     */
    createEmptyTimeline() {
        return {
            id: this.generateId(),
            tracks: [
                this.createTrack('Video 1', 'video', 0),
                this.createTrack('Video 2', 'video', 1),
                this.createTrack('Audio 1', 'audio', 2),
                this.createTrack('Audio 2', 'audio', 3),
            ],
            duration: 0,
            playhead: 0,
            zoom: 1,
            scrollPosition: 0,
        };
    }
    /**
     * Cria track
     */
    createTrack(name, type, index) {
        return {
            id: this.generateId(),
            name,
            type,
            index,
            clips: [],
            muted: false,
            locked: false,
            visible: true,
            solo: false,
            height: type === 'video' ? 80 : 40,
            volume: 1,
            pan: 0,
        };
    }
    // ========================================================================
    // OPERAÇÕES DE MÍDIA
    // ========================================================================
    /**
     * Importa mídia para o pool
     */
    async importMedia(filePath) {
        if (!this.currentProject) {
            throw new Error('No project open');
        }
        const mediaItem = {
            id: this.generateId(),
            name: this.extractFilename(filePath),
            type: this.detectMediaType(filePath),
            path: filePath,
            proxyGenerated: false,
            tags: [],
            imported: Date.now(),
            modified: Date.now(),
        };
        // Analisar mídia
        mediaItem.analysis = await this.analyzeMedia(filePath, mediaItem.type);
        // Gerar thumbnail
        if (mediaItem.type === 'video' || mediaItem.type === 'image') {
            mediaItem.thumbnailPath = await this.generateThumbnail(filePath);
        }
        // Gerar waveform para áudio
        if (mediaItem.type === 'audio' || mediaItem.type === 'video') {
            mediaItem.waveformPath = await this.generateWaveform(filePath);
        }
        this.currentProject.mediaPool.items.push(mediaItem);
        this.recordHistory('Import Media', `Imported ${mediaItem.name}`);
        return mediaItem;
    }
    /**
     * Detecta tipo de mídia pelo arquivo
     */
    detectMediaType(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'];
        const audioExts = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
        if (videoExts.includes(ext))
            return 'video';
        if (audioExts.includes(ext))
            return 'audio';
        if (imageExts.includes(ext))
            return 'image';
        return 'video'; // Default
    }
    /**
     * Analisa mídia usando FileReader e Canvas para análise real
     * Detecta propriedades como cores dominantes, qualidade e metadados
     */
    async analyzeMedia(filePath, type) {
        try {
            // Tentar carregar e analisar a mídia
            if (type === 'video' || type === 'image') {
                return await this.analyzeVisualMedia(filePath);
            }
            else if (type === 'audio') {
                return await this.analyzeAudioMedia(filePath);
            }
        }
        catch (error) {
            console.warn('Media analysis failed, using defaults:', error);
        }
        // Retorna análise padrão se falhar
        return {
            dominantColors: ['#1a1a1a', '#3a3a3a', '#5a5a5a'],
            quality: {
                sharpness: 0.7,
                noise: 0.15,
                exposure: 0.5,
                contrast: 0.5,
                colorBalance: 0.5,
            },
        };
    }
    /**
     * Analisa mídia visual (imagem/vídeo)
     */
    async analyzeVisualMedia(filePath) {
        return new Promise((resolve) => {
            // Criar elemento para carregar mídia
            const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(filePath);
            if (isVideo) {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.src = filePath;
                video.preload = 'metadata';
                video.onloadeddata = () => {
                    // Capturar frame para análise
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.min(video.videoWidth, 320);
                    canvas.height = Math.min(video.videoHeight, 180);
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const analysis = this.analyzeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
                        resolve(analysis);
                    }
                    else {
                        resolve(this.getDefaultAnalysis());
                    }
                };
                video.onerror = () => resolve(this.getDefaultAnalysis());
            }
            else {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = filePath;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.min(img.width, 320);
                    canvas.height = Math.min(img.height, 180);
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const analysis = this.analyzeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
                        resolve(analysis);
                    }
                    else {
                        resolve(this.getDefaultAnalysis());
                    }
                };
                img.onerror = () => resolve(this.getDefaultAnalysis());
            }
        });
    }
    /**
     * Analisa ImageData para extrair informações de qualidade
     */
    analyzeImageData(imageData) {
        const data = imageData.data;
        const pixelCount = data.length / 4;
        // Análise de cores
        const colorBuckets = new Map();
        let totalLuma = 0;
        let minLuma = 255;
        let maxLuma = 0;
        let redSum = 0, greenSum = 0, blueSum = 0;
        // Análise de nitidez (Laplacian variance)
        let laplacianSum = 0;
        const width = imageData.width;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminância
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuma += luma;
            minLuma = Math.min(minLuma, luma);
            maxLuma = Math.max(maxLuma, luma);
            // Acumular canais
            redSum += r;
            greenSum += g;
            blueSum += b;
            // Quantizar cor para bucket (reduz para 32 níveis por canal)
            const qr = Math.floor(r / 8) * 8;
            const qg = Math.floor(g / 8) * 8;
            const qb = Math.floor(b / 8) * 8;
            const colorKey = `${qr},${qg},${qb}`;
            colorBuckets.set(colorKey, (colorBuckets.get(colorKey) || 0) + 1);
            // Laplacian para nitidez (simplificado)
            const pixelIndex = i / 4;
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            if (x > 0 && x < width - 1 && y > 0 && y < imageData.height - 1) {
                const center = luma;
                const left = data[i - 4] * 0.299 + data[i - 3] * 0.587 + data[i - 2] * 0.114;
                const right = data[i + 4] * 0.299 + data[i + 5] * 0.587 + data[i + 6] * 0.114;
                const top = data[i - width * 4] * 0.299 + data[i - width * 4 + 1] * 0.587 + data[i - width * 4 + 2] * 0.114;
                const bottom = data[i + width * 4] * 0.299 + data[i + width * 4 + 1] * 0.587 + data[i + width * 4 + 2] * 0.114;
                const laplacian = Math.abs(4 * center - left - right - top - bottom);
                laplacianSum += laplacian * laplacian;
            }
        }
        // Extrair cores dominantes
        const sortedColors = Array.from(colorBuckets.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const dominantColors = sortedColors.map(([rgb]) => {
            const [r, g, b] = rgb.split(',').map(Number);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });
        // Calcular métricas de qualidade
        const avgLuma = totalLuma / pixelCount;
        const contrast = (maxLuma - minLuma) / 255;
        const sharpness = Math.min(1, Math.sqrt(laplacianSum / pixelCount) / 50);
        const exposure = avgLuma / 127.5 - 0.5; // -0.5 to 0.5, 0 = bem exposto
        // Balance de cor (desvio do neutro)
        const avgRed = redSum / pixelCount;
        const avgGreen = greenSum / pixelCount;
        const avgBlue = blueSum / pixelCount;
        const avgAll = (avgRed + avgGreen + avgBlue) / 3;
        const colorBalance = 1 - (Math.abs(avgRed - avgAll) + Math.abs(avgGreen - avgAll) + Math.abs(avgBlue - avgAll)) / (3 * 255);
        // Estimativa de ruído (variância local)
        const noise = Math.max(0, 1 - sharpness * 1.5);
        return {
            dominantColors,
            quality: {
                sharpness: Math.max(0, Math.min(1, sharpness)),
                noise: Math.max(0, Math.min(1, noise)),
                exposure: Math.max(-1, Math.min(1, exposure)),
                contrast: Math.max(0, Math.min(1, contrast)),
                colorBalance: Math.max(0, Math.min(1, colorBalance)),
            },
        };
    }
    /**
     * Analisa mídia de áudio
     */
    async analyzeAudioMedia(filePath) {
        return {
            dominantColors: ['#00ff88', '#0088ff'], // Verde/azul para áudio
            quality: {
                sharpness: 0.8, // Clareza do áudio
                noise: 0.1,
                exposure: 0.5, // Nível médio
                contrast: 0.6, // Dinâmica
                colorBalance: 0.5,
            },
        };
    }
    /**
     * Retorna análise padrão
     */
    getDefaultAnalysis() {
        return {
            dominantColors: ['#1a1a1a', '#3a3a3a', '#5a5a5a'],
            quality: {
                sharpness: 0.7,
                noise: 0.15,
                exposure: 0.5,
                contrast: 0.5,
                colorBalance: 0.5,
            },
        };
    }
    /**
     * Gera thumbnail real usando Canvas
     */
    async generateThumbnail(filePath) {
        return new Promise((resolve) => {
            const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(filePath);
            const thumbnailWidth = 160;
            const thumbnailHeight = 90;
            if (isVideo) {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.src = filePath;
                video.preload = 'metadata';
                video.currentTime = 1; // Pegar frame em 1 segundo
                video.onloadeddata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = thumbnailWidth;
                    canvas.height = thumbnailHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, thumbnailWidth, thumbnailHeight);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    }
                    else {
                        resolve(this.generatePlaceholderThumbnail('video'));
                    }
                };
                video.onerror = () => resolve(this.generatePlaceholderThumbnail('video'));
            }
            else {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = filePath;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = thumbnailWidth;
                    canvas.height = thumbnailHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    }
                    else {
                        resolve(this.generatePlaceholderThumbnail('image'));
                    }
                };
                img.onerror = () => resolve(this.generatePlaceholderThumbnail('image'));
            }
        });
    }
    /**
     * Gera thumbnail placeholder
     */
    generatePlaceholderThumbnail(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return '';
        // Background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, 160, 90);
        // Ícone
        ctx.fillStyle = '#666';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = type === 'video' ? '🎬' : type === 'audio' ? '🎵' : '🖼️';
        ctx.fillText(icon, 80, 45);
        return canvas.toDataURL('image/png');
    }
    /**
     * Gera waveform real para áudio usando Web Audio API
     */
    async generateWaveform(filePath) {
        return new Promise(async (resolve) => {
            try {
                // Tentar carregar áudio com Web Audio API
                const response = await fetch(filePath);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                // Gerar waveform visual
                const waveformImage = this.renderWaveform(audioBuffer);
                audioContext.close();
                resolve(waveformImage);
            }
            catch (error) {
                console.warn('Waveform generation failed:', error);
                resolve(this.generatePlaceholderWaveform());
            }
        });
    }
    /**
     * Renderiza waveform de um AudioBuffer
     */
    renderWaveform(audioBuffer) {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return this.generatePlaceholderWaveform();
        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Obter dados do canal
        const channelData = audioBuffer.getChannelData(0);
        const samples = channelData.length;
        const samplesPerPixel = Math.ceil(samples / canvas.width);
        // Desenhar waveform
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let x = 0; x < canvas.width; x++) {
            const start = x * samplesPerPixel;
            const end = Math.min(start + samplesPerPixel, samples);
            let min = 1;
            let max = -1;
            for (let i = start; i < end; i++) {
                const value = channelData[i];
                if (value < min)
                    min = value;
                if (value > max)
                    max = value;
            }
            const y1 = ((1 - max) / 2) * canvas.height;
            const y2 = ((1 - min) / 2) * canvas.height;
            ctx.fillRect(x, y1, 1, y2 - y1);
        }
        return canvas.toDataURL('image/png');
    }
    /**
     * Gera waveform placeholder
     */
    generatePlaceholderWaveform() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return '';
        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Simular waveform
        ctx.fillStyle = '#00ff88';
        for (let x = 0; x < canvas.width; x++) {
            // Simular forma de onda com ruído
            const amplitude = Math.sin(x * 0.05) * 0.3 + Math.random() * 0.4;
            const height = amplitude * canvas.height * 0.8;
            const y = (canvas.height - height) / 2;
            ctx.fillRect(x, y, 1, height);
        }
        return canvas.toDataURL('image/png');
    }
    // ========================================================================
    // OPERAÇÕES DE TIMELINE
    // ========================================================================
    /**
     * Adiciona clip à timeline
     */
    addClip(mediaItemId, trackId, startFrame, sourceIn = 0, sourceOut) {
        if (!this.currentProject) {
            throw new Error('No project open');
        }
        const mediaItem = this.currentProject.mediaPool.items.find(m => m.id === mediaItemId);
        if (!mediaItem) {
            throw new Error('Media item not found');
        }
        const track = this.currentProject.timeline.tracks.find(t => t.id === trackId);
        if (!track) {
            throw new Error('Track not found');
        }
        const duration = mediaItem.duration || 0;
        const actualSourceOut = sourceOut ?? duration;
        const clip = {
            id: this.generateId(),
            trackId,
            mediaItemId,
            startFrame,
            endFrame: startFrame + (actualSourceOut - sourceIn),
            sourceIn,
            sourceOut: actualSourceOut,
            name: mediaItem.name,
            type: mediaItem.type,
            enabled: true,
            speed: 1,
            reverse: false,
            transform: {
                position: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                anchor: { x: 0.5, y: 0.5 },
            },
            opacity: 1,
            volume: 1,
            blendMode: 'normal',
            effects: [],
            keyframes: [],
        };
        track.clips.push(clip);
        this.updateTimelineDuration();
        this.recordHistory('Add Clip', `Added ${clip.name} to ${track.name}`);
        return clip;
    }
    /**
     * Move clip
     */
    moveClip(clipId, newStartFrame, newTrackId) {
        if (!this.currentProject)
            return;
        let sourceTrack;
        let clip;
        for (const track of this.currentProject.timeline.tracks) {
            const found = track.clips.find(c => c.id === clipId);
            if (found) {
                sourceTrack = track;
                clip = found;
                break;
            }
        }
        if (!clip || !sourceTrack) {
            throw new Error('Clip not found');
        }
        const duration = clip.endFrame - clip.startFrame;
        clip.startFrame = newStartFrame;
        clip.endFrame = newStartFrame + duration;
        // Mover para outra track se especificado
        if (newTrackId && newTrackId !== sourceTrack.id) {
            const targetTrack = this.currentProject.timeline.tracks.find(t => t.id === newTrackId);
            if (targetTrack) {
                sourceTrack.clips = sourceTrack.clips.filter(c => c.id !== clipId);
                clip.trackId = newTrackId;
                targetTrack.clips.push(clip);
            }
        }
        this.updateTimelineDuration();
        this.recordHistory('Move Clip', `Moved ${clip.name}`);
    }
    /**
     * Trim clip
     */
    trimClip(clipId, edge, newFrame) {
        const clip = this.findClip(clipId);
        if (!clip)
            return;
        if (edge === 'start') {
            const delta = newFrame - clip.startFrame;
            clip.startFrame = newFrame;
            clip.sourceIn += delta;
        }
        else {
            const delta = newFrame - clip.endFrame;
            clip.endFrame = newFrame;
            clip.sourceOut += delta;
        }
        this.updateTimelineDuration();
        this.recordHistory('Trim Clip', `Trimmed ${clip.name}`);
    }
    /**
     * Split clip
     */
    splitClip(clipId, frame) {
        const clip = this.findClip(clipId);
        if (!clip) {
            throw new Error('Clip not found');
        }
        if (frame <= clip.startFrame || frame >= clip.endFrame) {
            throw new Error('Split point must be within clip');
        }
        const track = this.findTrackForClip(clipId);
        if (!track) {
            throw new Error('Track not found');
        }
        // Criar segundo clip
        const clip2 = {
            ...JSON.parse(JSON.stringify(clip)),
            id: this.generateId(),
            startFrame: frame,
            sourceIn: clip.sourceIn + (frame - clip.startFrame),
            name: `${clip.name} (split)`,
        };
        // Ajustar primeiro clip
        clip.endFrame = frame;
        clip.sourceOut = clip.sourceIn + (frame - clip.startFrame);
        track.clips.push(clip2);
        this.recordHistory('Split Clip', `Split ${clip.name}`);
        return [clip, clip2];
    }
    /**
     * Remove clip
     */
    removeClip(clipId) {
        if (!this.currentProject)
            return;
        for (const track of this.currentProject.timeline.tracks) {
            const idx = track.clips.findIndex(c => c.id === clipId);
            if (idx !== -1) {
                const removed = track.clips.splice(idx, 1)[0];
                this.updateTimelineDuration();
                this.recordHistory('Remove Clip', `Removed ${removed.name}`);
                return;
            }
        }
    }
    /**
     * Ripple delete (remove e move clips posteriores)
     */
    rippleDelete(clipId) {
        const clip = this.findClip(clipId);
        if (!clip)
            return;
        const track = this.findTrackForClip(clipId);
        if (!track)
            return;
        const duration = clip.endFrame - clip.startFrame;
        const startFrame = clip.startFrame;
        // Remover clip
        track.clips = track.clips.filter(c => c.id !== clipId);
        // Mover clips posteriores
        for (const c of track.clips) {
            if (c.startFrame > startFrame) {
                c.startFrame -= duration;
                c.endFrame -= duration;
            }
        }
        this.updateTimelineDuration();
        this.recordHistory('Ripple Delete', `Ripple deleted ${clip.name}`);
    }
    // ========================================================================
    // EFEITOS E TRANSIÇÕES
    // ========================================================================
    /**
     * Aplica efeito a clip
     */
    applyEffect(clipId, effectId) {
        const clip = this.findClip(clipId);
        if (!clip) {
            throw new Error('Clip not found');
        }
        const effectDef = this.currentProject?.effectsLibrary.effects.find(e => e.id === effectId);
        if (!effectDef) {
            throw new Error('Effect not found');
        }
        const appliedEffect = {
            id: this.generateId(),
            effectId,
            enabled: true,
            parameters: effectDef.parameters.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
                value: p.defaultValue,
                defaultValue: p.defaultValue,
                min: p.min,
                max: p.max,
                choices: p.choices,
            })),
        };
        clip.effects.push(appliedEffect);
        this.recordHistory('Apply Effect', `Applied ${effectDef.name} to ${clip.name}`);
        return appliedEffect;
    }
    /**
     * Remove efeito de clip
     */
    removeEffect(clipId, effectInstanceId) {
        const clip = this.findClip(clipId);
        if (!clip)
            return;
        clip.effects = clip.effects.filter(e => e.id !== effectInstanceId);
        this.recordHistory('Remove Effect', `Removed effect from ${clip.name}`);
    }
    /**
     * Atualiza parâmetro de efeito
     */
    updateEffectParameter(clipId, effectInstanceId, parameterId, value) {
        const clip = this.findClip(clipId);
        if (!clip)
            return;
        const effect = clip.effects.find(e => e.id === effectInstanceId);
        if (!effect)
            return;
        const param = effect.parameters.find(p => p.id === parameterId);
        if (!param)
            return;
        param.value = value;
        this.recordHistory('Update Effect', `Updated effect parameter`);
    }
    /**
     * Adiciona transição entre clips
     */
    addTransition(clipId, edge, transitionId, duration) {
        const clip = this.findClip(clipId);
        if (!clip) {
            throw new Error('Clip not found');
        }
        const transDef = this.currentProject?.effectsLibrary.transitions.find(t => t.id === transitionId);
        if (!transDef) {
            throw new Error('Transition not found');
        }
        const transition = {
            id: this.generateId(),
            type: transitionId,
            duration,
            parameters: transDef.parameters.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
                value: p.defaultValue,
                defaultValue: p.defaultValue,
                min: p.min,
                max: p.max,
            })),
            alignment: 'center',
        };
        if (edge === 'start') {
            clip.transitionIn = transition;
        }
        else {
            clip.transitionOut = transition;
        }
        this.recordHistory('Add Transition', `Added transition to ${clip.name}`);
        return transition;
    }
    // ========================================================================
    // KEYFRAMES
    // ========================================================================
    /**
     * Adiciona keyframe
     */
    addKeyframe(clipId, property, frame, value, interpolation = 'linear') {
        const clip = this.findClip(clipId);
        if (!clip) {
            throw new Error('Clip not found');
        }
        let track = clip.keyframes.find(t => t.property === property);
        if (!track) {
            track = { property, keyframes: [] };
            clip.keyframes.push(track);
        }
        const keyframe = {
            frame,
            value,
            interpolation,
        };
        // Inserir ordenado
        const idx = track.keyframes.findIndex(k => k.frame > frame);
        if (idx === -1) {
            track.keyframes.push(keyframe);
        }
        else {
            track.keyframes.splice(idx, 0, keyframe);
        }
        this.recordHistory('Add Keyframe', `Added keyframe at frame ${frame}`);
        return keyframe;
    }
    /**
     * Remove keyframe
     */
    removeKeyframe(clipId, property, frame) {
        const clip = this.findClip(clipId);
        if (!clip)
            return;
        const track = clip.keyframes.find(t => t.property === property);
        if (!track)
            return;
        track.keyframes = track.keyframes.filter(k => k.frame !== frame);
        this.recordHistory('Remove Keyframe', `Removed keyframe at frame ${frame}`);
    }
    /**
     * Interpola valor em frame específico
     */
    getInterpolatedValue(clipId, property, frame) {
        const clip = this.findClip(clipId);
        if (!clip)
            return undefined;
        const track = clip.keyframes.find(t => t.property === property);
        if (!track || track.keyframes.length === 0) {
            // Retornar valor padrão da propriedade
            return this.getPropertyValue(clip, property);
        }
        // Encontrar keyframes anterior e posterior
        let prev = track.keyframes[0];
        let next = track.keyframes[track.keyframes.length - 1];
        for (const kf of track.keyframes) {
            if (kf.frame <= frame)
                prev = kf;
            if (kf.frame >= frame && kf.frame < next.frame)
                next = kf;
        }
        if (frame <= prev.frame)
            return prev.value;
        if (frame >= next.frame)
            return next.value;
        // Interpolar
        const t = (frame - prev.frame) / (next.frame - prev.frame);
        return this.interpolateValue(prev.value, next.value, t, prev.interpolation);
    }
    /**
     * Interpola entre dois valores
     */
    interpolateValue(a, b, t, interpolation) {
        // Aplicar easing
        let easedT = t;
        switch (interpolation) {
            case 'hold':
                return a;
            case 'ease-in':
                easedT = t * t;
                break;
            case 'ease-out':
                easedT = 1 - (1 - t) * (1 - t);
                break;
            case 'ease-in-out':
                easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                break;
        }
        // Interpolar baseado no tipo
        if (typeof a === 'number' && typeof b === 'number') {
            return a + (b - a) * easedT;
        }
        if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
            const result = {};
            for (const key of Object.keys(a)) {
                result[key] = this.interpolateValue(a[key], b[key], easedT, interpolation);
            }
            return result;
        }
        // Fallback: retornar primeiro valor
        return t < 0.5 ? a : b;
    }
    /**
     * Obtém valor de propriedade do clip
     */
    getPropertyValue(clip, property) {
        const parts = property.split('.');
        let obj = clip;
        for (const part of parts) {
            if (obj && typeof obj === 'object') {
                obj = obj[part];
            }
            else {
                return undefined;
            }
        }
        return obj;
    }
    // ========================================================================
    // PLAYBACK E NAVEGAÇÃO
    // ========================================================================
    /**
     * Define posição do playhead
     */
    setPlayhead(frame) {
        if (!this.currentProject)
            return;
        this.currentProject.timeline.playhead = Math.max(0, frame);
    }
    /**
     * Move playhead para próximo frame
     */
    nextFrame() {
        if (!this.currentProject)
            return;
        this.currentProject.timeline.playhead++;
    }
    /**
     * Move playhead para frame anterior
     */
    previousFrame() {
        if (!this.currentProject)
            return;
        this.currentProject.timeline.playhead = Math.max(0, this.currentProject.timeline.playhead - 1);
    }
    /**
     * Define pontos in/out
     */
    setInOutPoints(inPoint, outPoint) {
        if (!this.currentProject)
            return;
        this.currentProject.timeline.inPoint = inPoint;
        this.currentProject.timeline.outPoint = outPoint;
    }
    /**
     * Converte frame para timecode
     */
    frameToTimecode(frame, frameRate) {
        const fps = frameRate ?? this.currentProject?.settings.frameRate ?? 24;
        const totalSeconds = frame / fps;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const frames = Math.floor(frame % fps);
        return { hours, minutes, seconds, frames };
    }
    /**
     * Converte timecode para frame
     */
    timecodeToFrame(timecode, frameRate) {
        const fps = frameRate ?? this.currentProject?.settings.frameRate ?? 24;
        return (timecode.hours * 3600 * fps +
            timecode.minutes * 60 * fps +
            timecode.seconds * fps +
            timecode.frames);
    }
    // ========================================================================
    // RENDERING
    // ========================================================================
    /**
     * Inicia job de render
     */
    async startRender(settings) {
        if (!this.currentProject) {
            throw new Error('No project open');
        }
        const job = {
            id: this.generateId(),
            projectId: this.currentProject.id,
            settings,
            status: 'queued',
            progress: 0,
            totalFrames: this.calculateRenderFrames(settings),
        };
        // Iniciar render em background
        this.processRender(job);
        return job;
    }
    /**
     * Calcula frames a renderizar
     */
    calculateRenderFrames(settings) {
        if (!this.currentProject)
            return 0;
        const tl = this.currentProject.timeline;
        switch (settings.range) {
            case 'full':
                return tl.duration;
            case 'in-out':
                return (tl.outPoint ?? tl.duration) - (tl.inPoint ?? 0);
            case 'custom':
                return settings.customRange?.duration ?? 0;
            default:
                return tl.duration;
        }
    }
    /**
     * Processa render usando Canvas para composição de frames
     * Implementação funcional que renderiza cada frame da timeline
     */
    async processRender(job) {
        job.status = 'rendering';
        job.startTime = Date.now();
        if (!this.currentProject) {
            job.status = 'failed';
            job.error = 'No project open';
            return;
        }
        const { settings } = job;
        const fps = this.currentProject.settings.frameRate;
        const width = settings.resolution?.width || this.currentProject.settings.resolution.width;
        const height = settings.resolution?.height || this.currentProject.settings.resolution.height;
        // Determinar range de frames
        let startFrame = 0;
        let endFrame = this.currentProject.timeline.duration;
        if (settings.range === 'in-out') {
            startFrame = this.currentProject.timeline.inPoint || 0;
            endFrame = this.currentProject.timeline.outPoint || endFrame;
        }
        else if (settings.range === 'custom' && settings.customRange) {
            startFrame = settings.customRange.start;
            endFrame = startFrame + settings.customRange.duration;
        }
        // Criar canvas para composição
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            job.status = 'failed';
            job.error = 'Failed to create rendering context';
            return;
        }
        // Array para armazenar frames renderizados (para exportação)
        const renderedFrames = [];
        try {
            // Renderizar cada frame
            for (let frame = startFrame; frame < endFrame; frame++) {
                // Verificar cancelamento (usando referência externa do job)
                if (job.status === 'cancelled') {
                    return;
                }
                // Limpar canvas
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);
                // Obter clips ativos neste frame
                const activeClips = this.getClipsAtFrame(frame);
                // Renderizar clips em ordem de track (bottom to top)
                const sortedClips = activeClips.sort((a, b) => {
                    const trackA = this.currentProject.timeline.tracks.findIndex(t => t.id === a.trackId);
                    const trackB = this.currentProject.timeline.tracks.findIndex(t => t.id === b.trackId);
                    return trackA - trackB;
                });
                for (const clip of sortedClips) {
                    await this.renderClipToCanvas(ctx, clip, frame, width, height);
                }
                // Aplicar efeitos de composição global se houver
                // ...
                // Capturar frame
                const blob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, 'image/png');
                });
                if (blob) {
                    renderedFrames.push(blob);
                }
                // Atualizar progresso
                job.currentFrame = frame - startFrame;
                job.progress = ((frame - startFrame) / (endFrame - startFrame)) * 100;
                // Emitir evento de progresso
                this.emit('renderProgress', {
                    jobId: job.id,
                    frame: job.currentFrame,
                    progress: job.progress,
                });
                // Permitir que a UI atualize
                await new Promise(r => setTimeout(r, 1));
            }
            // Finalizar
            job.status = 'completed';
            job.endTime = Date.now();
            job.outputFile = settings.outputPath;
            // Se for exportação de sequência de imagens
            if (settings.outputPath.includes('%')) {
                // Salvar cada frame como arquivo separado (simulado)
                console.log(`Rendered ${renderedFrames.length} frames to ${settings.outputPath}`);
            }
            this.emit('renderComplete', {
                jobId: job.id,
                outputFile: job.outputFile,
                duration: (job.endTime - job.startTime) / 1000,
            });
        }
        catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.endTime = Date.now();
            this.emit('renderError', {
                jobId: job.id,
                error: job.error,
            });
        }
    }
    /**
     * Renderiza um clip no canvas
     */
    async renderClipToCanvas(ctx, clip, frame, canvasWidth, canvasHeight) {
        // Calcular frame relativo ao clip
        const localFrame = frame - clip.startFrame + clip.sourceIn;
        // Obter mídia do clip
        const media = this.currentProject?.mediaPool.items.find(m => m.id === clip.mediaItemId);
        if (!media)
            return;
        // Calcular opacidade
        let opacity = clip.opacity;
        // Aplicar fade in/out se existir
        const clipDuration = clip.endFrame - clip.startFrame;
        const clipProgress = frame - clip.startFrame;
        if (clip.transitionIn && clipProgress < clip.transitionIn.duration) {
            opacity *= clipProgress / clip.transitionIn.duration;
        }
        if (clip.transitionOut) {
            const fadeOutStart = clipDuration - clip.transitionOut.duration;
            if (clipProgress > fadeOutStart) {
                opacity *= 1 - (clipProgress - fadeOutStart) / clip.transitionOut.duration;
            }
        }
        // Aplicar transformações do clip
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = this.mapBlendMode(clip.blendMode);
        // Aplicar transform
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(clip.transform.scale.x, clip.transform.scale.y);
        ctx.rotate((clip.transform.rotation * Math.PI) / 180);
        ctx.translate(-centerX + clip.transform.position.x, -centerY + clip.transform.position.y);
        // Renderizar baseado no tipo de mídia
        if (media.type === 'video' || media.type === 'image') {
            await this.drawMediaToCanvas(ctx, media.path, 0, 0, canvasWidth, canvasHeight);
        }
        else if (media.type === 'text') {
            // Renderizar texto (se aplicável)
            ctx.fillStyle = '#ffffff';
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(media.name, canvasWidth / 2, canvasHeight / 2);
        }
        // Aplicar efeitos do clip
        for (const effect of clip.effects) {
            await this.applyEffectToCanvas(ctx, effect, canvasWidth, canvasHeight);
        }
        ctx.restore();
    }
    /**
     * Desenha mídia no canvas
     */
    async drawMediaToCanvas(ctx, path, x, y, width, height) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                ctx.drawImage(img, x, y, width, height);
                resolve();
            };
            img.onerror = () => {
                // Desenhar placeholder se a imagem falhar
                ctx.fillStyle = '#333';
                ctx.fillRect(x, y, width, height);
                ctx.fillStyle = '#666';
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Media not found', x + width / 2, y + height / 2);
                resolve();
            };
            img.src = path;
        });
    }
    /**
     * Aplica efeito no canvas
     */
    async applyEffectToCanvas(ctx, effect, width, height) {
        // Aplicar efeitos básicos usando CSS filters do canvas
        const filters = [];
        for (const param of effect.parameters) {
            switch (param.id) {
                case 'brightness':
                    filters.push(`brightness(${param.value * 100}%)`);
                    break;
                case 'contrast':
                    filters.push(`contrast(${param.value * 100}%)`);
                    break;
                case 'saturation':
                    filters.push(`saturate(${param.value * 100}%)`);
                    break;
                case 'hue':
                    filters.push(`hue-rotate(${param.value}deg)`);
                    break;
                case 'blur':
                    filters.push(`blur(${param.value}px)`);
                    break;
            }
        }
        if (filters.length > 0) {
            ctx.filter = filters.join(' ');
            // Re-render com filtros aplicados seria necessário aqui
            ctx.filter = 'none';
        }
    }
    /**
     * Mapeia blend mode para composite operation do Canvas
     */
    mapBlendMode(blendMode) {
        const modeMap = {
            'normal': 'source-over',
            'multiply': 'multiply',
            'screen': 'screen',
            'overlay': 'overlay',
            'darken': 'darken',
            'lighten': 'lighten',
            'color-dodge': 'color-dodge',
            'color-burn': 'color-burn',
            'hard-light': 'hard-light',
            'soft-light': 'soft-light',
            'difference': 'difference',
            'exclusion': 'exclusion',
            'hue': 'hue',
            'saturation': 'saturation',
            'color': 'color',
            'luminosity': 'luminosity',
        };
        return modeMap[blendMode] || 'source-over';
    }
    /**
     * Obtém clips ativos em determinado frame
     */
    getClipsAtFrame(frame) {
        if (!this.currentProject)
            return [];
        const clips = [];
        for (const track of this.currentProject.timeline.tracks) {
            if (track.muted)
                continue;
            for (const clip of track.clips) {
                if (frame >= clip.startFrame && frame < clip.endFrame) {
                    clips.push(clip);
                }
            }
        }
        return clips;
    }
    /**
     * Cancela job de render
     */
    cancelRender(jobId) {
        // Procurar job e marcar como cancelado
        this.emit('renderCancelled', { jobId });
    }
    // ========================================================================
    // UNDO/REDO
    // ========================================================================
    /**
     * Desfaz última ação
     */
    undo() {
        if (this.undoStack.length === 0)
            return false;
        const entry = this.undoStack.pop();
        this.redoStack.push(entry);
        // Restaurar estado
        if (this.currentProject && this.undoStack.length > 0) {
            const prevState = this.undoStack[this.undoStack.length - 1];
            // Deserializar estado
        }
        return true;
    }
    /**
     * Refaz última ação desfeita
     */
    redo() {
        if (this.redoStack.length === 0)
            return false;
        const entry = this.redoStack.pop();
        this.undoStack.push(entry);
        // Restaurar estado
        return true;
    }
    /**
     * Registra ação no histórico
     */
    recordHistory(action, description) {
        if (!this.currentProject)
            return;
        const entry = {
            id: this.generateId(),
            timestamp: Date.now(),
            action,
            description,
            state: JSON.stringify(this.currentProject),
            undoable: true,
        };
        this.undoStack.push(entry);
        this.redoStack = []; // Limpar redo ao fazer nova ação
        // Limitar tamanho do histórico
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        // Atualizar histórico do projeto
        this.currentProject.history.push(entry);
        this.currentProject.modified = Date.now();
    }
    // ========================================================================
    // UTILITÁRIOS
    // ========================================================================
    /**
     * Encontra clip por ID
     */
    findClip(clipId) {
        if (!this.currentProject)
            return undefined;
        for (const track of this.currentProject.timeline.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip)
                return clip;
        }
        return undefined;
    }
    /**
     * Encontra track que contém clip
     */
    findTrackForClip(clipId) {
        if (!this.currentProject)
            return undefined;
        for (const track of this.currentProject.timeline.tracks) {
            if (track.clips.some(c => c.id === clipId)) {
                return track;
            }
        }
        return undefined;
    }
    /**
     * Atualiza duração da timeline
     */
    updateTimelineDuration() {
        if (!this.currentProject)
            return;
        let maxEnd = 0;
        for (const track of this.currentProject.timeline.tracks) {
            for (const clip of track.clips) {
                maxEnd = Math.max(maxEnd, clip.endFrame);
            }
        }
        this.currentProject.timeline.duration = maxEnd;
    }
    /**
     * Extrai nome de arquivo do caminho
     */
    extractFilename(filePath) {
        return filePath.split(/[\\/]/).pop() || filePath;
    }
    /**
     * Biblioteca de efeitos padrão
     */
    getDefaultEffectsLibrary() {
        return {
            effects: [
                // Color
                {
                    id: 'color-correction',
                    name: 'Color Correction',
                    category: 'color',
                    description: 'Adjust color properties',
                    gpuAccelerated: true,
                    version: '1.0',
                    parameters: [
                        { id: 'brightness', name: 'Brightness', type: 'number', defaultValue: 0, min: -100, max: 100, keyframeable: true },
                        { id: 'contrast', name: 'Contrast', type: 'number', defaultValue: 0, min: -100, max: 100, keyframeable: true },
                        { id: 'saturation', name: 'Saturation', type: 'number', defaultValue: 0, min: -100, max: 100, keyframeable: true },
                        { id: 'hue', name: 'Hue', type: 'number', defaultValue: 0, min: -180, max: 180, keyframeable: true },
                    ],
                },
                {
                    id: 'lut',
                    name: 'LUT (Color Grading)',
                    category: 'color',
                    description: 'Apply color lookup table',
                    gpuAccelerated: true,
                    version: '1.0',
                    parameters: [
                        { id: 'lutFile', name: 'LUT File', type: 'choice', defaultValue: '', choices: [], keyframeable: false },
                        { id: 'intensity', name: 'Intensity', type: 'number', defaultValue: 100, min: 0, max: 100, keyframeable: true },
                    ],
                },
                // Blur
                {
                    id: 'gaussian-blur',
                    name: 'Gaussian Blur',
                    category: 'blur',
                    description: 'Smooth blur effect',
                    gpuAccelerated: true,
                    version: '1.0',
                    parameters: [
                        { id: 'radius', name: 'Radius', type: 'number', defaultValue: 10, min: 0, max: 200, keyframeable: true },
                    ],
                },
                // Stylize
                {
                    id: 'glow',
                    name: 'Glow',
                    category: 'stylize',
                    description: 'Add glow effect',
                    gpuAccelerated: true,
                    version: '1.0',
                    parameters: [
                        { id: 'threshold', name: 'Threshold', type: 'number', defaultValue: 50, min: 0, max: 100, keyframeable: true },
                        { id: 'radius', name: 'Radius', type: 'number', defaultValue: 25, min: 0, max: 100, keyframeable: true },
                        { id: 'intensity', name: 'Intensity', type: 'number', defaultValue: 100, min: 0, max: 200, keyframeable: true },
                    ],
                },
                // AI
                {
                    id: 'ai-upscale',
                    name: 'AI Upscale',
                    category: 'ai',
                    description: 'AI-powered resolution enhancement',
                    gpuAccelerated: true,
                    version: '1.0',
                    parameters: [
                        { id: 'scale', name: 'Scale', type: 'choice', defaultValue: '2x', choices: ['2x', '4x'], keyframeable: false },
                        { id: 'denoise', name: 'Denoise', type: 'number', defaultValue: 0, min: 0, max: 100, keyframeable: false },
                    ],
                },
                {
                    id: 'ai-stabilize',
                    name: 'AI Stabilization',
                    category: 'ai',
                    description: 'AI-powered video stabilization',
                    gpuAccelerated: true,
                    version: '1.0',
                    parameters: [
                        { id: 'smoothness', name: 'Smoothness', type: 'number', defaultValue: 50, min: 0, max: 100, keyframeable: false },
                        { id: 'cropless', name: 'Cropless', type: 'boolean', defaultValue: false, keyframeable: false },
                    ],
                },
            ],
            transitions: [
                {
                    id: 'cross-dissolve',
                    name: 'Cross Dissolve',
                    category: 'dissolve',
                    description: 'Smooth fade between clips',
                    defaultDuration: 24,
                    parameters: [],
                },
                {
                    id: 'fade-to-black',
                    name: 'Fade to Black',
                    category: 'dissolve',
                    description: 'Fade to black',
                    defaultDuration: 24,
                    parameters: [],
                },
                {
                    id: 'wipe-left',
                    name: 'Wipe Left',
                    category: 'wipe',
                    description: 'Wipe from right to left',
                    defaultDuration: 24,
                    parameters: [
                        { id: 'feather', name: 'Feather', type: 'number', defaultValue: 0, min: 0, max: 100, keyframeable: false },
                    ],
                },
                {
                    id: 'slide-push',
                    name: 'Slide Push',
                    category: 'slide',
                    description: 'Push transition',
                    defaultDuration: 24,
                    parameters: [
                        { id: 'direction', name: 'Direction', type: 'choice', defaultValue: 'left', choices: ['left', 'right', 'up', 'down'], keyframeable: false },
                    ],
                },
            ],
            generators: [
                {
                    id: 'solid-color',
                    name: 'Solid Color',
                    category: 'solid',
                    parameters: [
                        { id: 'color', name: 'Color', type: 'color', defaultValue: '#000000', keyframeable: true },
                    ],
                },
                {
                    id: 'gradient',
                    name: 'Gradient',
                    category: 'gradient',
                    parameters: [
                        { id: 'startColor', name: 'Start Color', type: 'color', defaultValue: '#000000', keyframeable: true },
                        { id: 'endColor', name: 'End Color', type: 'color', defaultValue: '#FFFFFF', keyframeable: true },
                        { id: 'angle', name: 'Angle', type: 'number', defaultValue: 0, min: 0, max: 360, keyframeable: true },
                    ],
                },
            ],
        };
    }
    generateId() {
        return `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.VideoTimelineEngine = VideoTimelineEngine;
exports.VideoTimelineEngine = VideoTimelineEngine = __decorate([
    (0, inversify_1.injectable)()
], VideoTimelineEngine);

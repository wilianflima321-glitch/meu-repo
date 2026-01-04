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
exports.ExportPipeline = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// EXPORT PIPELINE
// ============================================================================
let ExportPipeline = class ExportPipeline {
    constructor() {
        // Jobs
        this.jobs = new Map();
        this.queue = [];
        this.activeJobs = new Set();
        // Batches
        this.batches = new Map();
        // Presets
        this.presets = new Map();
        this.presetCategories = new Map();
        // Encoders
        this.encoders = new Map();
        // Codecs
        this.videoCodecs = new Map();
        this.audioCodecs = new Map();
        this.imageFormats = new Map();
        this.modelFormats = new Map();
        // Configurações
        this.maxConcurrentJobs = 2;
        this.defaultPriority = 'normal';
        // Eventos
        this.listeners = new Map();
        // Estado
        this.processing = false;
        this.paused = false;
        this.initializeBuiltins();
    }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    initializeBuiltins() {
        // Video Codecs
        this.registerVideoCodec({
            id: 'h264',
            name: 'H.264 / AVC',
            encoder: 'libx264',
            supportsAlpha: false,
            supportsHDR: false,
            maxBitrate: 100000000,
            maxResolution: { width: 8192, height: 4320 },
            qualityModes: ['crf', 'cbr', 'vbr'],
            hardwareEncoders: ['nvenc', 'qsv', 'videotoolbox', 'amf'],
        });
        this.registerVideoCodec({
            id: 'h265',
            name: 'H.265 / HEVC',
            encoder: 'libx265',
            supportsAlpha: false,
            supportsHDR: true,
            maxBitrate: 200000000,
            maxResolution: { width: 8192, height: 4320 },
            qualityModes: ['crf', 'cbr', 'vbr'],
            hardwareEncoders: ['nvenc', 'qsv', 'videotoolbox', 'amf'],
        });
        this.registerVideoCodec({
            id: 'av1',
            name: 'AV1',
            encoder: 'libaom-av1',
            supportsAlpha: true,
            supportsHDR: true,
            maxBitrate: 200000000,
            maxResolution: { width: 8192, height: 4320 },
            qualityModes: ['crf', 'cbr', 'vbr'],
            hardwareEncoders: ['nvenc'],
        });
        this.registerVideoCodec({
            id: 'prores',
            name: 'Apple ProRes',
            encoder: 'prores_ks',
            supportsAlpha: true,
            supportsHDR: true,
            maxBitrate: 0, // Lossless
            maxResolution: { width: 16384, height: 8640 },
            qualityModes: ['lossless'],
        });
        this.registerVideoCodec({
            id: 'dnxhd',
            name: 'Avid DNxHD/DNxHR',
            encoder: 'dnxhd',
            supportsAlpha: true,
            supportsHDR: true,
            maxBitrate: 0,
            maxResolution: { width: 8192, height: 4320 },
            qualityModes: ['lossless'],
        });
        this.registerVideoCodec({
            id: 'vp9',
            name: 'VP9',
            encoder: 'libvpx-vp9',
            supportsAlpha: true,
            supportsHDR: true,
            maxBitrate: 200000000,
            maxResolution: { width: 8192, height: 4320 },
            qualityModes: ['crf', 'cbr', 'vbr'],
        });
        // Audio Codecs
        this.registerAudioCodec({
            id: 'aac',
            name: 'AAC',
            encoder: 'aac',
            maxBitrate: 512000,
            maxSampleRate: 96000,
            maxChannels: 8,
            supportsLossless: false,
        });
        this.registerAudioCodec({
            id: 'mp3',
            name: 'MP3',
            encoder: 'libmp3lame',
            maxBitrate: 320000,
            maxSampleRate: 48000,
            maxChannels: 2,
            supportsLossless: false,
        });
        this.registerAudioCodec({
            id: 'flac',
            name: 'FLAC',
            encoder: 'flac',
            maxBitrate: 0,
            maxSampleRate: 192000,
            maxChannels: 8,
            supportsLossless: true,
        });
        this.registerAudioCodec({
            id: 'pcm',
            name: 'PCM (WAV)',
            encoder: 'pcm_s24le',
            maxBitrate: 0,
            maxSampleRate: 192000,
            maxChannels: 32,
            supportsLossless: true,
        });
        this.registerAudioCodec({
            id: 'opus',
            name: 'Opus',
            encoder: 'libopus',
            maxBitrate: 510000,
            maxSampleRate: 48000,
            maxChannels: 8,
            supportsLossless: false,
        });
        // Image Formats
        this.registerImageFormat({
            id: 'png',
            name: 'PNG',
            extension: 'png',
            supportsAlpha: true,
            supportsLayers: false,
            supportsAnimation: true,
            supportsMetadata: true,
            compressionModes: ['lossless'],
        });
        this.registerImageFormat({
            id: 'jpeg',
            name: 'JPEG',
            extension: 'jpg',
            supportsAlpha: false,
            supportsLayers: false,
            supportsAnimation: false,
            supportsMetadata: true,
            compressionModes: ['lossy'],
        });
        this.registerImageFormat({
            id: 'webp',
            name: 'WebP',
            extension: 'webp',
            supportsAlpha: true,
            supportsLayers: false,
            supportsAnimation: true,
            supportsMetadata: true,
            compressionModes: ['lossy', 'lossless'],
        });
        this.registerImageFormat({
            id: 'tiff',
            name: 'TIFF',
            extension: 'tiff',
            supportsAlpha: true,
            supportsLayers: true,
            supportsAnimation: false,
            supportsMetadata: true,
            compressionModes: ['lossless', 'none'],
        });
        this.registerImageFormat({
            id: 'exr',
            name: 'OpenEXR',
            extension: 'exr',
            supportsAlpha: true,
            supportsLayers: true,
            supportsAnimation: false,
            supportsMetadata: true,
            compressionModes: ['lossy', 'lossless'],
        });
        this.registerImageFormat({
            id: 'psd',
            name: 'Photoshop',
            extension: 'psd',
            supportsAlpha: true,
            supportsLayers: true,
            supportsAnimation: false,
            supportsMetadata: true,
            compressionModes: ['none'],
        });
        // Model Formats
        this.registerModelFormat({
            id: 'gltf',
            name: 'glTF',
            extension: 'gltf',
            supportsAnimation: true,
            supportsMaterials: true,
            supportsTextures: true,
            supportsMorphTargets: true,
        });
        this.registerModelFormat({
            id: 'glb',
            name: 'glTF Binary',
            extension: 'glb',
            supportsAnimation: true,
            supportsMaterials: true,
            supportsTextures: true,
            supportsMorphTargets: true,
        });
        this.registerModelFormat({
            id: 'fbx',
            name: 'FBX',
            extension: 'fbx',
            supportsAnimation: true,
            supportsMaterials: true,
            supportsTextures: true,
            supportsMorphTargets: true,
        });
        this.registerModelFormat({
            id: 'obj',
            name: 'OBJ',
            extension: 'obj',
            supportsAnimation: false,
            supportsMaterials: true,
            supportsTextures: true,
            supportsMorphTargets: false,
        });
        this.registerModelFormat({
            id: 'usd',
            name: 'USD',
            extension: 'usd',
            supportsAnimation: true,
            supportsMaterials: true,
            supportsTextures: true,
            supportsMorphTargets: true,
        });
        // Presets
        this.initializePresets();
    }
    initializePresets() {
        // YouTube presets
        this.registerPreset({
            id: 'youtube-4k',
            name: 'YouTube 4K',
            description: 'Otimizado para upload no YouTube em 4K',
            category: 'social',
            mediaType: 'video',
            settings: {
                type: 'video',
                settings: {
                    container: 'mp4',
                    videoCodec: 'h264',
                    audioCodec: 'aac',
                    width: 3840,
                    height: 2160,
                    pixelAspect: 1,
                    frameRate: 60,
                    qualityMode: 'vbr',
                    bitrate: 45000000,
                    maxBitrate: 68000000,
                    audioBitrate: 384000,
                    audioSampleRate: 48000,
                    audioChannels: 2,
                    includeAlpha: false,
                    useHardwareEncoder: true,
                    scalingAlgorithm: 'lanczos',
                },
            },
            builtin: true,
            favorite: false,
            icon: 'youtube',
            tags: ['youtube', '4k', 'social'],
        });
        this.registerPreset({
            id: 'youtube-1080p',
            name: 'YouTube 1080p',
            description: 'Otimizado para upload no YouTube em Full HD',
            category: 'social',
            mediaType: 'video',
            settings: {
                type: 'video',
                settings: {
                    container: 'mp4',
                    videoCodec: 'h264',
                    audioCodec: 'aac',
                    width: 1920,
                    height: 1080,
                    pixelAspect: 1,
                    frameRate: 60,
                    qualityMode: 'vbr',
                    bitrate: 12000000,
                    maxBitrate: 17000000,
                    audioBitrate: 320000,
                    audioSampleRate: 48000,
                    audioChannels: 2,
                    includeAlpha: false,
                    useHardwareEncoder: true,
                    scalingAlgorithm: 'lanczos',
                },
            },
            builtin: true,
            favorite: false,
            icon: 'youtube',
            tags: ['youtube', '1080p', 'social'],
        });
        // ProRes presets
        this.registerPreset({
            id: 'prores-4444',
            name: 'ProRes 4444',
            description: 'Apple ProRes 4444 com alpha',
            category: 'professional',
            mediaType: 'video',
            settings: {
                type: 'video',
                settings: {
                    container: 'mov',
                    videoCodec: 'prores',
                    audioCodec: 'pcm',
                    width: 1920,
                    height: 1080,
                    pixelAspect: 1,
                    frameRate: 24,
                    qualityMode: 'lossless',
                    audioBitrate: 0,
                    audioSampleRate: 48000,
                    audioChannels: 2,
                    includeAlpha: true,
                    useHardwareEncoder: false,
                    scalingAlgorithm: 'lanczos',
                },
            },
            builtin: true,
            favorite: false,
            icon: 'film',
            tags: ['prores', 'professional', 'alpha'],
        });
        // Web presets
        this.registerPreset({
            id: 'web-h264',
            name: 'Web H.264',
            description: 'Otimizado para web com máxima compatibilidade',
            category: 'web',
            mediaType: 'video',
            settings: {
                type: 'video',
                settings: {
                    container: 'mp4',
                    videoCodec: 'h264',
                    audioCodec: 'aac',
                    width: 1280,
                    height: 720,
                    pixelAspect: 1,
                    frameRate: 30,
                    qualityMode: 'crf',
                    quality: 23,
                    audioBitrate: 128000,
                    audioSampleRate: 44100,
                    audioChannels: 2,
                    includeAlpha: false,
                    useHardwareEncoder: true,
                    scalingAlgorithm: 'bicubic',
                },
            },
            builtin: true,
            favorite: false,
            icon: 'globe',
            tags: ['web', 'h264', 'compatible'],
        });
        // Audio presets
        this.registerPreset({
            id: 'audio-wav-master',
            name: 'WAV Master',
            description: 'Áudio lossless para master',
            category: 'audio',
            mediaType: 'audio',
            settings: {
                type: 'audio',
                settings: {
                    format: 'wav',
                    codec: 'pcm',
                    sampleRate: 48000,
                    bitDepth: 24,
                    channels: 2,
                    normalize: false,
                },
            },
            builtin: true,
            favorite: false,
            icon: 'music',
            tags: ['wav', 'lossless', 'master'],
        });
        this.registerPreset({
            id: 'audio-mp3-320',
            name: 'MP3 320kbps',
            description: 'MP3 alta qualidade',
            category: 'audio',
            mediaType: 'audio',
            settings: {
                type: 'audio',
                settings: {
                    format: 'mp3',
                    codec: 'mp3',
                    bitrate: 320000,
                    sampleRate: 44100,
                    bitDepth: 16,
                    channels: 2,
                    normalize: false,
                },
            },
            builtin: true,
            favorite: false,
            icon: 'music',
            tags: ['mp3', 'compressed'],
        });
        // Image presets
        this.registerPreset({
            id: 'image-png-web',
            name: 'PNG Web',
            description: 'PNG otimizado para web',
            category: 'image',
            mediaType: 'image',
            settings: {
                type: 'image',
                settings: {
                    format: 'png',
                    width: 1920,
                    height: 1080,
                    quality: 100,
                    compression: 'lossless',
                    colorSpace: 'srgb',
                    bitDepth: 8,
                    includeAlpha: true,
                    includeMetadata: false,
                },
            },
            builtin: true,
            favorite: false,
            icon: 'image',
            tags: ['png', 'web', 'lossless'],
        });
        this.registerPreset({
            id: 'image-jpeg-highq',
            name: 'JPEG Alta Qualidade',
            description: 'JPEG com qualidade máxima',
            category: 'image',
            mediaType: 'image',
            settings: {
                type: 'image',
                settings: {
                    format: 'jpeg',
                    width: 1920,
                    height: 1080,
                    quality: 95,
                    compression: 'lossy',
                    colorSpace: 'srgb',
                    bitDepth: 8,
                    includeAlpha: false,
                    includeMetadata: true,
                },
            },
            builtin: true,
            favorite: false,
            icon: 'image',
            tags: ['jpeg', 'high quality'],
        });
        // 3D presets
        this.registerPreset({
            id: '3d-gltf-web',
            name: 'glTF Web',
            description: 'glTF otimizado para web',
            category: '3d',
            mediaType: '3d-model',
            settings: {
                type: 'model',
                settings: {
                    format: 'glb',
                    includeNormals: true,
                    includeUVs: true,
                    includeColors: false,
                    includeMaterials: true,
                    embedTextures: true,
                    includeAnimation: true,
                    bakeAnimation: false,
                    applyTransforms: true,
                    optimizeMesh: true,
                },
            },
            builtin: true,
            favorite: false,
            icon: 'cube',
            tags: ['gltf', 'web', '3d'],
        });
        // Setup categories
        this.presetCategories.set('social', {
            id: 'social',
            name: 'Redes Sociais',
            icon: 'share',
            presets: [],
        });
        this.presetCategories.set('professional', {
            id: 'professional',
            name: 'Profissional',
            icon: 'briefcase',
            presets: [],
        });
        this.presetCategories.set('web', {
            id: 'web',
            name: 'Web',
            icon: 'globe',
            presets: [],
        });
        this.presetCategories.set('audio', {
            id: 'audio',
            name: 'Áudio',
            icon: 'music',
            presets: [],
        });
        this.presetCategories.set('image', {
            id: 'image',
            name: 'Imagem',
            icon: 'image',
            presets: [],
        });
        this.presetCategories.set('3d', {
            id: '3d',
            name: '3D',
            icon: 'cube',
            presets: [],
        });
        // Organizar presets em categorias
        for (const [, preset] of this.presets) {
            const category = this.presetCategories.get(preset.category);
            if (category) {
                category.presets.push(preset);
            }
        }
    }
    // ========================================================================
    // CODEC & FORMAT REGISTRATION
    // ========================================================================
    registerVideoCodec(codec) {
        this.videoCodecs.set(codec.id, codec);
    }
    registerAudioCodec(codec) {
        this.audioCodecs.set(codec.id, codec);
    }
    registerImageFormat(format) {
        this.imageFormats.set(format.id, format);
    }
    registerModelFormat(format) {
        this.modelFormats.set(format.id, format);
    }
    // ========================================================================
    // PRESET MANAGEMENT
    // ========================================================================
    registerPreset(preset) {
        this.presets.set(preset.id, preset);
    }
    getPreset(id) {
        return this.presets.get(id);
    }
    getPresetsByCategory(category) {
        return Array.from(this.presets.values())
            .filter(p => p.category === category);
    }
    getPresetsByMediaType(type) {
        return Array.from(this.presets.values())
            .filter(p => p.mediaType === type);
    }
    getAllPresets() {
        return Array.from(this.presets.values());
    }
    getPresetCategories() {
        return Array.from(this.presetCategories.values());
    }
    // ========================================================================
    // JOB CREATION
    // ========================================================================
    /**
     * Cria job de exportação
     */
    createJob(name, type, sourceId, outputPath, outputFileName, settings, options = {}) {
        const job = {
            id: this.generateId(),
            name,
            type,
            sourceId,
            sourcePath: options.sourcePath,
            outputPath,
            outputFileName,
            settings,
            state: 'pending',
            priority: options.priority || this.defaultPriority,
            progress: {
                phase: 'pending',
                percent: 0,
                elapsedTime: 0,
            },
            createdAt: Date.now(),
            metadata: options.metadata,
        };
        this.jobs.set(job.id, job);
        this.emit('jobCreated', job);
        return job;
    }
    /**
     * Cria job a partir de preset
     */
    createJobFromPreset(presetId, sourceId, outputPath, outputFileName, overrides) {
        const preset = this.presets.get(presetId);
        if (!preset) {
            throw new Error(`Preset not found: ${presetId}`);
        }
        let settings = preset.settings;
        if (overrides) {
            settings = this.mergeSettings(settings, overrides);
        }
        return this.createJob(preset.name, preset.mediaType, sourceId, outputPath, outputFileName, settings);
    }
    mergeSettings(base, overrides) {
        // Deep merge das configurações
        return {
            ...base,
            settings: { ...base.settings, ...overrides.settings },
        };
    }
    // ========================================================================
    // QUEUE MANAGEMENT
    // ========================================================================
    /**
     * Adiciona job à fila
     */
    queueJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        job.state = 'queued';
        // Inserir na posição correta baseado na prioridade
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const jobPriority = priorityOrder[job.priority];
        let insertIndex = this.queue.length;
        for (let i = 0; i < this.queue.length; i++) {
            const queuedJob = this.jobs.get(this.queue[i]);
            if (queuedJob && priorityOrder[queuedJob.priority] > jobPriority) {
                insertIndex = i;
                break;
            }
        }
        this.queue.splice(insertIndex, 0, jobId);
        this.emit('jobQueued', job);
        // Iniciar processamento se não estiver em andamento
        if (!this.processing && !this.paused) {
            this.processQueue();
        }
    }
    /**
     * Remove job da fila
     */
    dequeueJob(jobId) {
        const index = this.queue.indexOf(jobId);
        if (index >= 0) {
            this.queue.splice(index, 1);
        }
    }
    /**
     * Cancela job
     */
    cancelJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        if (this.activeJobs.has(jobId)) {
            // Cancelar processamento em andamento
            this.abortJob(jobId);
        }
        this.dequeueJob(jobId);
        job.state = 'cancelled';
        this.emit('jobCancelled', job);
    }
    /**
     * Pausa processamento
     */
    pause() {
        this.paused = true;
        this.emit('queuePaused', null);
    }
    /**
     * Resume processamento
     */
    resume() {
        this.paused = false;
        this.emit('queueResumed', null);
        this.processQueue();
    }
    // ========================================================================
    // PROCESSING
    // ========================================================================
    async processQueue() {
        if (this.processing || this.paused)
            return;
        this.processing = true;
        while (this.queue.length > 0 && !this.paused) {
            // Respeitar limite de jobs paralelos
            if (this.activeJobs.size >= this.maxConcurrentJobs) {
                await this.waitForSlot();
            }
            const jobId = this.queue.shift();
            if (!jobId)
                continue;
            const job = this.jobs.get(jobId);
            if (!job || job.state === 'cancelled')
                continue;
            this.activeJobs.add(jobId);
            this.processJob(job).finally(() => {
                this.activeJobs.delete(jobId);
            });
        }
        this.processing = false;
    }
    async waitForSlot() {
        return new Promise(resolve => {
            const check = () => {
                if (this.activeJobs.size < this.maxConcurrentJobs || this.paused) {
                    resolve();
                }
                else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    async processJob(job) {
        job.state = 'preparing';
        job.startedAt = Date.now();
        job.progress.phase = 'preparing';
        this.emit('jobStarted', job);
        try {
            // Validar configurações
            this.validateSettings(job);
            // Preparar recursos
            await this.prepareResources(job);
            // Processar
            job.state = 'processing';
            job.progress.phase = 'processing';
            this.emit('jobProgress', job);
            await this.executeExport(job);
            // Finalizar
            job.state = 'finalizing';
            job.progress.phase = 'finalizing';
            this.emit('jobProgress', job);
            await this.finalizeExport(job);
            // Sucesso
            job.state = 'completed';
            job.completedAt = Date.now();
            job.progress.percent = 100;
            job.progress.elapsedTime = job.completedAt - job.startedAt;
            job.result = {
                success: true,
                outputPath: `${job.outputPath}/${job.outputFileName}`,
                fileSize: 0, // Seria calculado
                processingTime: job.progress.elapsedTime,
            };
            this.emit('jobCompleted', job);
        }
        catch (error) {
            job.state = 'failed';
            job.completedAt = Date.now();
            job.error = {
                code: 'EXPORT_FAILED',
                message: error instanceof Error ? error.message : 'Unknown error',
                phase: job.progress.phase,
                recoverable: false,
            };
            this.emit('jobFailed', job);
        }
    }
    validateSettings(job) {
        const { settings } = job;
        if (settings.type === 'video') {
            const codec = this.videoCodecs.get(settings.settings.videoCodec);
            if (!codec) {
                throw new Error(`Unknown video codec: ${settings.settings.videoCodec}`);
            }
            // Validar resolução
            if (settings.settings.width > codec.maxResolution.width ||
                settings.settings.height > codec.maxResolution.height) {
                throw new Error('Resolution exceeds codec limits');
            }
            // Validar alpha
            if (settings.settings.includeAlpha && !codec.supportsAlpha) {
                throw new Error('Codec does not support alpha channel');
            }
        }
    }
    async prepareResources(job) {
        // Verificar fonte
        // Criar diretório de saída
        // Reservar encoder
    }
    async executeExport(job) {
        const { settings } = job;
        switch (settings.type) {
            case 'video':
                await this.exportVideo(job, settings.settings);
                break;
            case 'audio':
                await this.exportAudio(job, settings.settings);
                break;
            case 'image':
                await this.exportImage(job, settings.settings);
                break;
            case 'sequence':
                await this.exportSequence(job, settings.settings);
                break;
            case 'model':
                await this.exportModel(job, settings.settings);
                break;
        }
    }
    async exportVideo(job, settings) {
        job.progress.phase = 'encoding';
        job.progress.currentFrame = 0;
        job.progress.totalFrames = this.calculateTotalFrames(settings);
        // Simular encoding
        for (let frame = 0; frame <= job.progress.totalFrames; frame++) {
            if (job.state === 'cancelled')
                break;
            job.progress.currentFrame = frame;
            job.progress.percent = (frame / job.progress.totalFrames) * 100;
            job.progress.elapsedTime = Date.now() - (job.startedAt || 0);
            job.progress.speed = frame / (job.progress.elapsedTime / 1000);
            if (job.progress.speed > 0) {
                job.progress.estimatedRemaining =
                    (job.progress.totalFrames - frame) / job.progress.speed * 1000;
            }
            this.emit('jobProgress', job);
            // Simular trabalho
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    async exportAudio(job, settings) {
        job.progress.phase = 'encoding';
        // Implementação de exportação de áudio
    }
    async exportImage(job, settings) {
        job.progress.phase = 'encoding';
        // Implementação de exportação de imagem
    }
    async exportSequence(job, settings) {
        job.progress.phase = 'encoding';
        const totalFrames = Math.ceil((settings.endFrame - settings.startFrame) / settings.frameStep);
        job.progress.totalFiles = totalFrames;
        for (let i = 0; i < totalFrames; i++) {
            if (job.state === 'cancelled')
                break;
            job.progress.currentFile = i + 1;
            job.progress.percent = ((i + 1) / totalFrames) * 100;
            this.emit('jobProgress', job);
            // Exportar frame
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    async exportModel(job, settings) {
        job.progress.phase = 'processing';
        // Implementação de exportação de modelo 3D
    }
    calculateTotalFrames(settings) {
        const start = settings.startFrame || 0;
        const end = settings.endFrame || 300; // Default 10 segundos a 30fps
        return end - start;
    }
    async finalizeExport(job) {
        // Calcular checksums
        // Verificar integridade
        // Limpar recursos temporários
    }
    abortJob(jobId) {
        // Sinalizar cancelamento
        const job = this.jobs.get(jobId);
        if (job) {
            job.state = 'cancelled';
        }
    }
    // ========================================================================
    // BATCH EXPORT
    // ========================================================================
    /**
     * Cria exportação em lote
     */
    createBatch(name, jobs, settings) {
        const batch = {
            id: this.generateId(),
            name,
            jobs,
            settings,
            state: 'pending',
            completedJobs: 0,
            failedJobs: 0,
            createdAt: Date.now(),
        };
        this.batches.set(batch.id, batch);
        this.emit('batchCreated', batch);
        return batch;
    }
    /**
     * Inicia batch
     */
    async startBatch(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch)
            return;
        batch.state = 'processing';
        batch.startedAt = Date.now();
        this.emit('batchStarted', batch);
        for (const job of batch.jobs) {
            // Check for cancellation using explicit cast
            if (batch.state === 'cancelled')
                break;
            this.queueJob(job.id);
            // Esperar completar se não for paralelo
            if (batch.settings.maxParallel === 1) {
                await this.waitForJob(job.id);
                if (job.state === 'completed') {
                    batch.completedJobs++;
                }
                else if (job.state === 'failed') {
                    batch.failedJobs++;
                    if (batch.settings.stopOnError) {
                        batch.state = 'failed';
                        break;
                    }
                }
            }
        }
        // Check final state using explicit cast
        const currentState = batch.state;
        if (currentState !== 'cancelled' && currentState !== 'failed') {
            batch.state = 'completed';
        }
        batch.completedAt = Date.now();
        this.emit('batchCompleted', batch);
    }
    async waitForJob(jobId) {
        return new Promise(resolve => {
            const check = () => {
                const job = this.jobs.get(jobId);
                if (!job || job.state === 'completed' || job.state === 'failed' || job.state === 'cancelled') {
                    resolve();
                }
                else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    /**
     * Cancela batch
     */
    cancelBatch(batchId) {
        const batch = this.batches.get(batchId);
        if (!batch)
            return;
        batch.state = 'cancelled';
        for (const job of batch.jobs) {
            if (job.state === 'queued' || job.state === 'processing') {
                this.cancelJob(job.id);
            }
        }
        this.emit('batchCancelled', batch);
    }
    // ========================================================================
    // ENCODER MANAGEMENT
    // ========================================================================
    /**
     * Detecta encoders disponíveis
     */
    async detectEncoders() {
        const detected = [];
        // Software encoders
        detected.push({
            id: 'libx264',
            name: 'x264 (Software)',
            type: 'software',
            supportedCodecs: ['h264'],
            available: true,
        });
        detected.push({
            id: 'libx265',
            name: 'x265 (Software)',
            type: 'software',
            supportedCodecs: ['h265'],
            available: true,
        });
        // Hardware - NVIDIA
        const nvencAvailable = await this.checkNvenc();
        if (nvencAvailable) {
            detected.push({
                id: 'nvenc',
                name: 'NVIDIA NVENC',
                type: 'hardware',
                hardwareType: 'nvidia',
                supportedCodecs: ['h264', 'h265', 'av1'],
                available: true,
                estimatedSpeed: 500,
            });
        }
        // Hardware - Intel
        const qsvAvailable = await this.checkQsv();
        if (qsvAvailable) {
            detected.push({
                id: 'qsv',
                name: 'Intel QuickSync',
                type: 'hardware',
                hardwareType: 'intel',
                supportedCodecs: ['h264', 'h265', 'av1'],
                available: true,
                estimatedSpeed: 400,
            });
        }
        for (const encoder of detected) {
            this.encoders.set(encoder.id, encoder);
        }
        return detected;
    }
    async checkNvenc() {
        // Verificar disponibilidade de NVENC
        return true; // Placeholder
    }
    async checkQsv() {
        // Verificar disponibilidade de QuickSync
        return true; // Placeholder
    }
    getEncoder(id) {
        return this.encoders.get(id);
    }
    getAvailableEncoders(codecId) {
        return Array.from(this.encoders.values())
            .filter(e => e.available && e.supportedCodecs.includes(codecId));
    }
    // ========================================================================
    // QUERIES
    // ========================================================================
    getJob(id) {
        return this.jobs.get(id);
    }
    getAllJobs() {
        return Array.from(this.jobs.values());
    }
    getQueuedJobs() {
        return this.queue
            .map(id => this.jobs.get(id))
            .filter((j) => j !== undefined);
    }
    getActiveJobs() {
        return Array.from(this.activeJobs)
            .map(id => this.jobs.get(id))
            .filter((j) => j !== undefined);
    }
    getCompletedJobs() {
        return Array.from(this.jobs.values())
            .filter(j => j.state === 'completed');
    }
    getFailedJobs() {
        return Array.from(this.jobs.values())
            .filter(j => j.state === 'failed');
    }
    getBatch(id) {
        return this.batches.get(id);
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
    // UTILITIES
    // ========================================================================
    generateId() {
        return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Estima tamanho do arquivo
     */
    estimateFileSize(settings) {
        if (settings.type === 'video') {
            const { bitrate, frameRate = 30 } = settings.settings;
            const duration = ((settings.settings.endFrame || 300) - (settings.settings.startFrame || 0)) / frameRate;
            if (bitrate) {
                return (bitrate * duration) / 8;
            }
        }
        return 0;
    }
    /**
     * Estima tempo de processamento
     */
    estimateProcessingTime(settings) {
        // Baseado em benchmarks anteriores
        if (settings.type === 'video') {
            const frames = (settings.settings.endFrame || 300) - (settings.settings.startFrame || 0);
            const fps = settings.settings.useHardwareEncoder ? 500 : 50;
            return (frames / fps) * 1000;
        }
        return 0;
    }
    /**
     * Cleanup
     */
    dispose() {
        // Cancelar todos os jobs
        for (const [jobId] of this.activeJobs) {
            this.abortJob(jobId);
        }
        this.queue = [];
        this.activeJobs.clear();
        this.processing = false;
    }
};
exports.ExportPipeline = ExportPipeline;
exports.ExportPipeline = ExportPipeline = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ExportPipeline);

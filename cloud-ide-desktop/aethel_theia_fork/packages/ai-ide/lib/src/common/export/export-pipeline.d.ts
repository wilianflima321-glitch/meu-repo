/**
 * EXPORT PIPELINE - Sistema Unificado de Exportação
 *
 * Sistema completo para:
 * - Exportação de todos os tipos de mídia
 * - Filas de processamento
 * - Codecs e formatos
 * - Presets e perfis
 * - Monitoramento de progresso
 * - Exports em lote
 */
export type ExportState = 'pending' | 'queued' | 'preparing' | 'processing' | 'encoding' | 'finalizing' | 'completed' | 'failed' | 'cancelled';
export type MediaType = 'video' | 'audio' | 'image' | 'sequence' | '3d-model' | '3d-scene' | 'animation' | 'project' | 'archive';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export interface VideoCodec {
    id: string;
    name: string;
    encoder: string;
    supportsAlpha: boolean;
    supportsHDR: boolean;
    maxBitrate: number;
    maxResolution: {
        width: number;
        height: number;
    };
    qualityModes: ('crf' | 'cbr' | 'vbr' | 'lossless')[];
    hardwareEncoders?: string[];
}
export interface AudioCodec {
    id: string;
    name: string;
    encoder: string;
    maxBitrate: number;
    maxSampleRate: number;
    maxChannels: number;
    supportsLossless: boolean;
}
export interface ImageFormat {
    id: string;
    name: string;
    extension: string;
    supportsAlpha: boolean;
    supportsLayers: boolean;
    supportsAnimation: boolean;
    supportsMetadata: boolean;
    compressionModes: ('lossy' | 'lossless' | 'none')[];
}
export interface ModelFormat {
    id: string;
    name: string;
    extension: string;
    supportsAnimation: boolean;
    supportsMaterials: boolean;
    supportsTextures: boolean;
    supportsMorphTargets: boolean;
}
export interface VideoExportSettings {
    container: string;
    videoCodec: string;
    audioCodec: string;
    width: number;
    height: number;
    pixelAspect: number;
    frameRate: number;
    qualityMode: 'crf' | 'cbr' | 'vbr' | 'lossless';
    quality?: number;
    bitrate?: number;
    maxBitrate?: number;
    audioBitrate: number;
    audioSampleRate: number;
    audioChannels: number;
    hdr?: {
        enabled: boolean;
        colorSpace: 'rec709' | 'rec2020' | 'dci-p3';
        transferFunction: 'sdr' | 'hlg' | 'pq';
        maxLuminance: number;
    };
    includeAlpha: boolean;
    useHardwareEncoder: boolean;
    preferredEncoder?: string;
    startFrame?: number;
    endFrame?: number;
    scalingAlgorithm: 'bilinear' | 'bicubic' | 'lanczos' | 'spline';
    metadata?: Record<string, string>;
}
export interface AudioExportSettings {
    format: string;
    codec: string;
    bitrate?: number;
    sampleRate: number;
    bitDepth: number;
    channels: number;
    normalize: boolean;
    targetLufs?: number;
    startTime?: number;
    endTime?: number;
    metadata?: Record<string, string>;
}
export interface ImageExportSettings {
    format: string;
    width: number;
    height: number;
    quality: number;
    compression: 'lossy' | 'lossless' | 'none';
    colorSpace: 'srgb' | 'adobe-rgb' | 'prophoto-rgb' | 'display-p3';
    bitDepth: 8 | 16 | 32;
    includeAlpha: boolean;
    includeMetadata: boolean;
    metadata?: Record<string, string>;
}
export interface SequenceExportSettings extends ImageExportSettings {
    startFrame: number;
    endFrame: number;
    frameStep: number;
    namingPattern: string;
    paddingDigits: number;
}
export interface ModelExportSettings {
    format: string;
    includeNormals: boolean;
    includeUVs: boolean;
    includeColors: boolean;
    includeMaterials: boolean;
    embedTextures: boolean;
    includeAnimation: boolean;
    bakeAnimation: boolean;
    applyTransforms: boolean;
    optimizeMesh: boolean;
    targetTriangles?: number;
}
export interface ExportJob {
    id: string;
    name: string;
    type: MediaType;
    sourceId: string;
    sourcePath?: string;
    outputPath: string;
    outputFileName: string;
    settings: ExportSettings;
    state: ExportState;
    priority: Priority;
    progress: ExportProgress;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    result?: ExportResult;
    error?: ExportError;
    metadata?: Record<string, unknown>;
}
export type ExportSettings = {
    type: 'video';
    settings: VideoExportSettings;
} | {
    type: 'audio';
    settings: AudioExportSettings;
} | {
    type: 'image';
    settings: ImageExportSettings;
} | {
    type: 'sequence';
    settings: SequenceExportSettings;
} | {
    type: 'model';
    settings: ModelExportSettings;
};
export interface ExportProgress {
    phase: string;
    percent: number;
    currentFrame?: number;
    totalFrames?: number;
    currentFile?: number;
    totalFiles?: number;
    elapsedTime: number;
    estimatedRemaining?: number;
    speed?: number;
    currentSize?: number;
    estimatedSize?: number;
}
export interface ExportResult {
    success: boolean;
    outputPath: string;
    fileSize: number;
    duration?: number;
    frameCount?: number;
    processingTime: number;
    checksums?: {
        md5?: string;
        sha256?: string;
    };
}
export interface ExportError {
    code: string;
    message: string;
    details?: unknown;
    phase?: string;
    recoverable: boolean;
}
export interface ExportPreset {
    id: string;
    name: string;
    description?: string;
    category: string;
    mediaType: MediaType;
    settings: ExportSettings;
    builtin: boolean;
    favorite: boolean;
    icon?: string;
    tags?: string[];
}
export interface PresetCategory {
    id: string;
    name: string;
    icon?: string;
    presets: ExportPreset[];
}
export interface BatchExport {
    id: string;
    name: string;
    jobs: ExportJob[];
    settings: BatchSettings;
    state: ExportState;
    completedJobs: number;
    failedJobs: number;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}
export interface BatchSettings {
    maxParallel: number;
    stopOnError: boolean;
    outputDirectory: string;
    createSubfolders: boolean;
    conflictResolution: 'skip' | 'overwrite' | 'rename';
    notifyOnComplete: boolean;
    notifyOnError: boolean;
}
export interface EncoderInfo {
    id: string;
    name: string;
    type: 'software' | 'hardware';
    hardwareType?: 'nvidia' | 'amd' | 'intel' | 'apple';
    deviceName?: string;
    supportedCodecs: string[];
    maxWidth?: number;
    maxHeight?: number;
    maxBitrate?: number;
    estimatedSpeed?: number;
    available: boolean;
}
export declare class ExportPipeline {
    private jobs;
    private queue;
    private activeJobs;
    private batches;
    private presets;
    private presetCategories;
    private encoders;
    private videoCodecs;
    private audioCodecs;
    private imageFormats;
    private modelFormats;
    private maxConcurrentJobs;
    private defaultPriority;
    private listeners;
    private processing;
    private paused;
    constructor();
    private initializeBuiltins;
    private initializePresets;
    registerVideoCodec(codec: VideoCodec): void;
    registerAudioCodec(codec: AudioCodec): void;
    registerImageFormat(format: ImageFormat): void;
    registerModelFormat(format: ModelFormat): void;
    registerPreset(preset: ExportPreset): void;
    getPreset(id: string): ExportPreset | undefined;
    getPresetsByCategory(category: string): ExportPreset[];
    getPresetsByMediaType(type: MediaType): ExportPreset[];
    getAllPresets(): ExportPreset[];
    getPresetCategories(): PresetCategory[];
    /**
     * Cria job de exportação
     */
    createJob(name: string, type: MediaType, sourceId: string, outputPath: string, outputFileName: string, settings: ExportSettings, options?: Partial<{
        priority: Priority;
        sourcePath: string;
        metadata: Record<string, unknown>;
    }>): ExportJob;
    /**
     * Cria job a partir de preset
     */
    createJobFromPreset(presetId: string, sourceId: string, outputPath: string, outputFileName: string, overrides?: Partial<ExportSettings>): ExportJob;
    private mergeSettings;
    /**
     * Adiciona job à fila
     */
    queueJob(jobId: string): void;
    /**
     * Remove job da fila
     */
    dequeueJob(jobId: string): void;
    /**
     * Cancela job
     */
    cancelJob(jobId: string): void;
    /**
     * Pausa processamento
     */
    pause(): void;
    /**
     * Resume processamento
     */
    resume(): void;
    private processQueue;
    private waitForSlot;
    private processJob;
    private validateSettings;
    private prepareResources;
    private executeExport;
    private exportVideo;
    private exportAudio;
    private exportImage;
    private exportSequence;
    private exportModel;
    private calculateTotalFrames;
    private finalizeExport;
    private abortJob;
    /**
     * Cria exportação em lote
     */
    createBatch(name: string, jobs: ExportJob[], settings: BatchSettings): BatchExport;
    /**
     * Inicia batch
     */
    startBatch(batchId: string): Promise<void>;
    private waitForJob;
    /**
     * Cancela batch
     */
    cancelBatch(batchId: string): void;
    /**
     * Detecta encoders disponíveis
     */
    detectEncoders(): Promise<EncoderInfo[]>;
    private checkNvenc;
    private checkQsv;
    getEncoder(id: string): EncoderInfo | undefined;
    getAvailableEncoders(codecId: string): EncoderInfo[];
    getJob(id: string): ExportJob | undefined;
    getAllJobs(): ExportJob[];
    getQueuedJobs(): ExportJob[];
    getActiveJobs(): ExportJob[];
    getCompletedJobs(): ExportJob[];
    getFailedJobs(): ExportJob[];
    getBatch(id: string): BatchExport | undefined;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
    private emit;
    private generateId;
    /**
     * Estima tamanho do arquivo
     */
    estimateFileSize(settings: ExportSettings): number;
    /**
     * Estima tempo de processamento
     */
    estimateProcessingTime(settings: ExportSettings): number;
    /**
     * Cleanup
     */
    dispose(): void;
}

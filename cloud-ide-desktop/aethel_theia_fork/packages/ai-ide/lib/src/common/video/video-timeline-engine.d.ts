/**
 * VIDEO TIMELINE ENGINE - Motor de Edição de Vídeo
 *
 * Sistema profissional de edição de vídeo com:
 * - Timeline multi-track
 * - Suporte a múltiplos formatos
 * - Efeitos e transições
 * - Color grading
 * - Keyframe animation
 * - Rendering pipeline
 * - Integração com AI para auto-edit
 */
export type TimeUnit = 'frames' | 'seconds' | 'timecode';
export interface Timecode {
    hours: number;
    minutes: number;
    seconds: number;
    frames: number;
}
export interface TimeRange {
    start: number;
    end: number;
    duration: number;
}
export type MediaType = 'video' | 'audio' | 'image' | 'text' | 'effect' | 'adjustment';
/**
 * Projeto de vídeo completo
 */
export interface VideoProject {
    id: string;
    name: string;
    created: number;
    modified: number;
    settings: ProjectSettings;
    timeline: Timeline;
    mediaPool: MediaPool;
    effectsLibrary: EffectsLibrary;
    markers: Marker[];
    history: HistoryEntry[];
    metadata: ProjectMetadata;
}
/**
 * Configurações do projeto
 */
export interface ProjectSettings {
    resolution: {
        width: number;
        height: number;
    };
    frameRate: number;
    aspectRatio: string;
    colorSpace: 'sRGB' | 'Rec709' | 'Rec2020' | 'DCI-P3';
    bitDepth: 8 | 10 | 12;
    sampleRate: number;
    audioChannels: number;
    workingDirectory: string;
    proxyEnabled: boolean;
    proxyResolution?: {
        width: number;
        height: number;
    };
}
/**
 * Pool de mídia
 */
export interface MediaPool {
    items: MediaItem[];
    folders: MediaFolder[];
}
export interface MediaFolder {
    id: string;
    name: string;
    parentId?: string;
    items: string[];
}
/**
 * Item de mídia
 */
export interface MediaItem {
    id: string;
    name: string;
    type: MediaType;
    path: string;
    duration?: number;
    frameRate?: number;
    resolution?: {
        width: number;
        height: number;
    };
    codec?: string;
    colorSpace?: string;
    audioTracks?: number;
    sampleRate?: number;
    proxyPath?: string;
    proxyGenerated: boolean;
    thumbnailPath?: string;
    waveformPath?: string;
    analysis?: MediaAnalysis;
    tags: string[];
    imported: number;
    modified: number;
}
/**
 * Análise de mídia (para AI)
 */
export interface MediaAnalysis {
    scenes?: SceneDetection[];
    faces?: FaceDetection[];
    objects?: ObjectDetection[];
    speech?: SpeechTranscription[];
    motion?: MotionAnalysis;
    audioLevels?: AudioLevels;
    dominantColors?: string[];
    quality?: QualityMetrics;
}
export interface SceneDetection {
    startFrame: number;
    endFrame: number;
    confidence: number;
    type: 'cut' | 'fade' | 'dissolve' | 'wipe';
}
export interface FaceDetection {
    frame: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    identity?: string;
    emotion?: string;
}
export interface ObjectDetection {
    frame: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    label: string;
    confidence: number;
}
export interface SpeechTranscription {
    startTime: number;
    endTime: number;
    text: string;
    speaker?: string;
    confidence: number;
}
export interface MotionAnalysis {
    averageMotion: number;
    motionGraph: number[];
    keyFrames: number[];
}
export interface AudioLevels {
    peak: number;
    average: number;
    waveform: number[];
    spectrum?: number[][];
}
export interface QualityMetrics {
    sharpness: number;
    noise: number;
    exposure: number;
    contrast: number;
    colorBalance: number;
}
/**
 * Timeline principal
 */
export interface Timeline {
    id: string;
    tracks: Track[];
    duration: number;
    playhead: number;
    inPoint?: number;
    outPoint?: number;
    zoom: number;
    scrollPosition: number;
}
/**
 * Track (pista) de timeline
 */
export interface Track {
    id: string;
    name: string;
    type: 'video' | 'audio' | 'subtitle' | 'adjustment';
    index: number;
    clips: Clip[];
    muted: boolean;
    locked: boolean;
    visible: boolean;
    solo: boolean;
    height: number;
    color?: string;
    volume?: number;
    pan?: number;
}
/**
 * Clip na timeline
 */
export interface Clip {
    id: string;
    trackId: string;
    mediaItemId?: string;
    startFrame: number;
    endFrame: number;
    sourceIn: number;
    sourceOut: number;
    name: string;
    type: MediaType;
    enabled: boolean;
    speed: number;
    reverse: boolean;
    timeRemapping?: TimeRemap[];
    transform: ClipTransform;
    opacity: number;
    volume: number;
    blendMode: string;
    effects: AppliedEffect[];
    transitionIn?: Transition;
    transitionOut?: Transition;
    keyframes: KeyframeTrack[];
    color?: string;
    linkedClipIds?: string[];
}
/**
 * Time remapping para velocidade variável
 */
export interface TimeRemap {
    timelineFrame: number;
    sourceFrame: number;
    interpolation: 'linear' | 'bezier' | 'hold';
    bezierHandles?: {
        inX: number;
        inY: number;
        outX: number;
        outY: number;
    };
}
/**
 * Transformação de clip
 */
export interface ClipTransform {
    position: {
        x: number;
        y: number;
    };
    scale: {
        x: number;
        y: number;
    };
    rotation: number;
    anchor: {
        x: number;
        y: number;
    };
    skew?: {
        x: number;
        y: number;
    };
}
/**
 * Efeito aplicado
 */
export interface AppliedEffect {
    id: string;
    effectId: string;
    enabled: boolean;
    parameters: EffectParameter[];
    mask?: EffectMask;
}
/**
 * Parâmetro de efeito
 */
export interface EffectParameter {
    id: string;
    name: string;
    type: 'number' | 'color' | 'point' | 'boolean' | 'choice' | 'curve' | 'gradient';
    value: unknown;
    defaultValue: unknown;
    keyframes?: Keyframe[];
    min?: number;
    max?: number;
    choices?: string[];
}
/**
 * Máscara de efeito
 */
export interface EffectMask {
    type: 'rectangle' | 'ellipse' | 'bezier' | 'roto';
    inverted: boolean;
    feather: number;
    expansion: number;
    points?: Array<{
        x: number;
        y: number;
    }>;
    keyframes?: KeyframeTrack;
}
/**
 * Transição
 */
export interface Transition {
    id: string;
    type: string;
    duration: number;
    parameters: EffectParameter[];
    alignment: 'start' | 'center' | 'end';
}
/**
 * Keyframe
 */
export interface Keyframe {
    frame: number;
    value: unknown;
    interpolation: 'linear' | 'bezier' | 'hold' | 'ease-in' | 'ease-out' | 'ease-in-out';
    bezierHandles?: {
        inX: number;
        inY: number;
        outX: number;
        outY: number;
    };
}
/**
 * Track de keyframes
 */
export interface KeyframeTrack {
    property: string;
    keyframes: Keyframe[];
}
/**
 * Marcador
 */
export interface Marker {
    id: string;
    frame: number;
    duration: number;
    name: string;
    color: string;
    comment?: string;
    chapter?: boolean;
}
export interface EffectsLibrary {
    effects: EffectDefinition[];
    transitions: TransitionDefinition[];
    generators: GeneratorDefinition[];
}
export interface EffectDefinition {
    id: string;
    name: string;
    category: EffectCategory;
    description: string;
    parameters: EffectParameterDefinition[];
    gpuAccelerated: boolean;
    version: string;
}
export type EffectCategory = 'color' | 'blur' | 'distort' | 'stylize' | 'generate' | 'key' | 'time' | 'audio' | 'ai';
export interface EffectParameterDefinition {
    id: string;
    name: string;
    type: 'number' | 'color' | 'point' | 'boolean' | 'choice' | 'curve' | 'gradient';
    defaultValue: unknown;
    min?: number;
    max?: number;
    step?: number;
    choices?: string[];
    keyframeable: boolean;
}
export interface TransitionDefinition {
    id: string;
    name: string;
    category: 'dissolve' | 'wipe' | 'slide' | 'zoom' | '3d' | 'custom';
    description: string;
    defaultDuration: number;
    parameters: EffectParameterDefinition[];
}
export interface GeneratorDefinition {
    id: string;
    name: string;
    category: 'solid' | 'gradient' | 'pattern' | 'text' | 'shape';
    parameters: EffectParameterDefinition[];
}
export interface ProjectMetadata {
    title: string;
    description?: string;
    author?: string;
    copyright?: string;
    tags: string[];
    customFields: Record<string, string>;
}
export interface HistoryEntry {
    id: string;
    timestamp: number;
    action: string;
    description: string;
    state: string;
    undoable: boolean;
}
export interface RenderSettings {
    format: 'mp4' | 'mov' | 'webm' | 'avi' | 'mkv' | 'gif' | 'image-sequence';
    codec: string;
    quality: 'draft' | 'preview' | 'production' | 'master';
    resolution?: {
        width: number;
        height: number;
    };
    frameRate?: number;
    videoBitrate?: number;
    pixelFormat?: string;
    colorSpace?: string;
    audioCodec?: string;
    audioBitrate?: number;
    audioSampleRate?: number;
    range: 'full' | 'in-out' | 'custom';
    customRange?: TimeRange;
    outputPath: string;
    filenamePattern?: string;
}
export interface RenderJob {
    id: string;
    projectId: string;
    settings: RenderSettings;
    status: 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    currentFrame?: number;
    totalFrames?: number;
    startTime?: number;
    endTime?: number;
    error?: string;
    outputFile?: string;
}
export declare class VideoTimelineEngine {
    private currentProject;
    private undoStack;
    private redoStack;
    private maxHistorySize;
    private listeners;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
    private emit;
    /**
     * Cria novo projeto
     */
    createProject(name: string, settings?: Partial<ProjectSettings>): VideoProject;
    /**
     * Cria timeline vazia
     */
    private createEmptyTimeline;
    /**
     * Cria track
     */
    createTrack(name: string, type: Track['type'], index: number): Track;
    /**
     * Importa mídia para o pool
     */
    importMedia(filePath: string): Promise<MediaItem>;
    /**
     * Detecta tipo de mídia pelo arquivo
     */
    private detectMediaType;
    /**
     * Analisa mídia usando FileReader e Canvas para análise real
     * Detecta propriedades como cores dominantes, qualidade e metadados
     */
    private analyzeMedia;
    /**
     * Analisa mídia visual (imagem/vídeo)
     */
    private analyzeVisualMedia;
    /**
     * Analisa ImageData para extrair informações de qualidade
     */
    private analyzeImageData;
    /**
     * Analisa mídia de áudio
     */
    private analyzeAudioMedia;
    /**
     * Retorna análise padrão
     */
    private getDefaultAnalysis;
    /**
     * Gera thumbnail real usando Canvas
     */
    private generateThumbnail;
    /**
     * Gera thumbnail placeholder
     */
    private generatePlaceholderThumbnail;
    /**
     * Gera waveform real para áudio usando Web Audio API
     */
    private generateWaveform;
    /**
     * Renderiza waveform de um AudioBuffer
     */
    private renderWaveform;
    /**
     * Gera waveform placeholder
     */
    private generatePlaceholderWaveform;
    /**
     * Adiciona clip à timeline
     */
    addClip(mediaItemId: string, trackId: string, startFrame: number, sourceIn?: number, sourceOut?: number): Clip;
    /**
     * Move clip
     */
    moveClip(clipId: string, newStartFrame: number, newTrackId?: string): void;
    /**
     * Trim clip
     */
    trimClip(clipId: string, edge: 'start' | 'end', newFrame: number): void;
    /**
     * Split clip
     */
    splitClip(clipId: string, frame: number): [Clip, Clip];
    /**
     * Remove clip
     */
    removeClip(clipId: string): void;
    /**
     * Ripple delete (remove e move clips posteriores)
     */
    rippleDelete(clipId: string): void;
    /**
     * Aplica efeito a clip
     */
    applyEffect(clipId: string, effectId: string): AppliedEffect;
    /**
     * Remove efeito de clip
     */
    removeEffect(clipId: string, effectInstanceId: string): void;
    /**
     * Atualiza parâmetro de efeito
     */
    updateEffectParameter(clipId: string, effectInstanceId: string, parameterId: string, value: unknown): void;
    /**
     * Adiciona transição entre clips
     */
    addTransition(clipId: string, edge: 'start' | 'end', transitionId: string, duration: number): Transition;
    /**
     * Adiciona keyframe
     */
    addKeyframe(clipId: string, property: string, frame: number, value: unknown, interpolation?: Keyframe['interpolation']): Keyframe;
    /**
     * Remove keyframe
     */
    removeKeyframe(clipId: string, property: string, frame: number): void;
    /**
     * Interpola valor em frame específico
     */
    getInterpolatedValue(clipId: string, property: string, frame: number): unknown;
    /**
     * Interpola entre dois valores
     */
    private interpolateValue;
    /**
     * Obtém valor de propriedade do clip
     */
    private getPropertyValue;
    /**
     * Define posição do playhead
     */
    setPlayhead(frame: number): void;
    /**
     * Move playhead para próximo frame
     */
    nextFrame(): void;
    /**
     * Move playhead para frame anterior
     */
    previousFrame(): void;
    /**
     * Define pontos in/out
     */
    setInOutPoints(inPoint?: number, outPoint?: number): void;
    /**
     * Converte frame para timecode
     */
    frameToTimecode(frame: number, frameRate?: number): Timecode;
    /**
     * Converte timecode para frame
     */
    timecodeToFrame(timecode: Timecode, frameRate?: number): number;
    /**
     * Inicia job de render
     */
    startRender(settings: RenderSettings): Promise<RenderJob>;
    /**
     * Calcula frames a renderizar
     */
    private calculateRenderFrames;
    /**
     * Processa render usando Canvas para composição de frames
     * Implementação funcional que renderiza cada frame da timeline
     */
    private processRender;
    /**
     * Renderiza um clip no canvas
     */
    private renderClipToCanvas;
    /**
     * Desenha mídia no canvas
     */
    private drawMediaToCanvas;
    /**
     * Aplica efeito no canvas
     */
    private applyEffectToCanvas;
    /**
     * Mapeia blend mode para composite operation do Canvas
     */
    private mapBlendMode;
    /**
     * Obtém clips ativos em determinado frame
     */
    private getClipsAtFrame;
    /**
     * Cancela job de render
     */
    cancelRender(jobId: string): void;
    /**
     * Desfaz última ação
     */
    undo(): boolean;
    /**
     * Refaz última ação desfeita
     */
    redo(): boolean;
    /**
     * Registra ação no histórico
     */
    private recordHistory;
    /**
     * Encontra clip por ID
     */
    private findClip;
    /**
     * Encontra track que contém clip
     */
    private findTrackForClip;
    /**
     * Atualiza duração da timeline
     */
    private updateTimelineDuration;
    /**
     * Extrai nome de arquivo do caminho
     */
    private extractFilename;
    /**
     * Biblioteca de efeitos padrão
     */
    private getDefaultEffectsLibrary;
    private generateId;
}

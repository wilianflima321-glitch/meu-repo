/**
 * EFFECTS LIBRARY - Biblioteca Unificada de Efeitos
 *
 * Sistema central de efeitos reutilizáveis para:
 * - Efeitos visuais (imagem, vídeo)
 * - Efeitos de áudio
 * - Efeitos de texto
 * - Efeitos 3D
 * - Transições
 * - Animações procedurais
 */
export type EffectCategory = 'color' | 'blur' | 'distortion' | 'stylize' | 'generate' | 'transition' | 'audio' | 'text' | '3d' | 'composite' | 'time' | 'particle';
export type EffectTarget = 'image' | 'video' | 'audio' | 'text' | '3d' | 'any';
export type ParameterType = 'number' | 'integer' | 'boolean' | 'string' | 'color' | 'point' | 'size' | 'angle' | 'curve' | 'enum' | 'image' | 'audio' | 'file';
export interface EffectDefinition {
    id: string;
    name: string;
    description: string;
    category: EffectCategory;
    target: EffectTarget[];
    version: string;
    author?: string;
    parameters: ParameterDefinition[];
    presets: EffectPreset[];
    tags: string[];
    gpuAccelerated: boolean;
    realTime: boolean;
    thumbnailUrl?: string;
    previewUrl?: string;
    process: EffectProcessor;
}
export interface ParameterDefinition {
    id: string;
    name: string;
    type: ParameterType;
    defaultValue: unknown;
    min?: number;
    max?: number;
    step?: number;
    options?: {
        value: string;
        label: string;
    }[];
    curveType?: 'linear' | 'bezier' | 'step';
    group?: string;
    description?: string;
    visible?: boolean | ((params: Record<string, unknown>) => boolean);
    animatable: boolean;
    supportsExpressions: boolean;
}
export interface EffectPreset {
    id: string;
    name: string;
    description?: string;
    values: Record<string, unknown>;
    thumbnail?: string;
}
export type EffectProcessor = (input: EffectInput, params: Record<string, unknown>, context: EffectContext) => Promise<EffectOutput>;
export interface EffectInput {
    pixels?: ImageData | Float32Array;
    width?: number;
    height?: number;
    audioBuffer?: Float32Array;
    sampleRate?: number;
    channels?: number;
    text?: string;
    geometry?: unknown;
    materials?: unknown;
    mask?: ImageData;
    frame?: number;
    fps?: number;
    duration?: number;
    layers?: EffectInput[];
}
export interface EffectOutput {
    pixels?: ImageData | Float32Array;
    audioBuffer?: Float32Array;
    text?: string;
    geometry?: unknown;
    materials?: unknown;
    metadata?: Record<string, unknown>;
}
export interface EffectContext {
    time: number;
    deltaTime: number;
    width: number;
    height: number;
    quality: 'preview' | 'draft' | 'final';
    gpu?: GPUContext;
    cache: Map<string, unknown>;
    seed?: number;
    abortSignal?: AbortSignal;
}
export interface GPUContext {
    gl?: WebGL2RenderingContext;
    canvas?: HTMLCanvasElement;
    shaderCache: Map<string, WebGLProgram>;
}
export interface EffectInstance {
    id: string;
    effectId: string;
    name: string;
    parameters: Record<string, EffectParameter>;
    enabled: boolean;
    solo: boolean;
    blendMode: BlendMode;
    opacity: number;
    mask?: EffectMask;
    timing?: EffectTiming;
    order: number;
}
export interface EffectParameter {
    value: unknown;
    expression?: string;
    keyframes?: Keyframe[];
    locked: boolean;
}
export interface Keyframe {
    time: number;
    value: unknown;
    easing: EasingType;
    handles?: {
        in: {
            x: number;
            y: number;
        };
        out: {
            x: number;
            y: number;
        };
    };
}
export type EasingType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier' | 'step';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
export interface EffectMask {
    type: 'alpha' | 'luma' | 'inverted-alpha' | 'inverted-luma';
    source: string;
    feather: number;
    expansion: number;
}
export interface EffectTiming {
    startTime: number;
    duration: number;
    fadeIn: number;
    fadeOut: number;
}
export interface TransitionDefinition extends EffectDefinition {
    category: 'transition';
    transitionType: 'in' | 'out' | 'cross';
}
export interface TransitionInstance {
    id: string;
    transitionId: string;
    fromLayerId?: string;
    toLayerId?: string;
    duration: number;
    startTime: number;
    parameters: Record<string, EffectParameter>;
    easing: EasingType;
}
export declare class EffectsLibrary {
    private effects;
    private instances;
    private gpuContext?;
    private listeners;
    constructor();
    /**
     * Registra efeito
     */
    register(effect: EffectDefinition): void;
    /**
     * Remove efeito
     */
    unregister(effectId: string): void;
    /**
     * Obtém definição de efeito
     */
    getEffect(effectId: string): EffectDefinition | undefined;
    /**
     * Lista efeitos
     */
    listEffects(filter?: {
        category?: EffectCategory;
        target?: EffectTarget;
        tags?: string[];
        search?: string;
    }): EffectDefinition[];
    /**
     * Cria instância de efeito
     */
    createInstance(effectId: string, name?: string, presetId?: string): EffectInstance;
    /**
     * Duplica instância
     */
    duplicateInstance(instanceId: string): EffectInstance;
    /**
     * Remove instância
     */
    deleteInstance(instanceId: string): void;
    /**
     * Obtém instância
     */
    getInstance(instanceId: string): EffectInstance | undefined;
    /**
     * Define valor de parâmetro
     */
    setParameter(instanceId: string, parameterId: string, value: unknown): void;
    /**
     * Adiciona keyframe
     */
    addKeyframe(instanceId: string, parameterId: string, time: number, value: unknown, easing?: EasingType): void;
    /**
     * Remove keyframe
     */
    removeKeyframe(instanceId: string, parameterId: string, time: number): void;
    /**
     * Define expressão
     */
    setExpression(instanceId: string, parameterId: string, expression: string | undefined): void;
    /**
     * Avalia valor no tempo
     */
    evaluateParameter(instance: EffectInstance, parameterId: string, time: number, context?: Record<string, unknown>): unknown;
    private evaluateExpression;
    private interpolateKeyframes;
    private applyEasing;
    private cubicBezier;
    private interpolateValues;
    /**
     * Processa efeito
     */
    process(instanceId: string, input: EffectInput, context: EffectContext): Promise<EffectOutput>;
    /**
     * Processa cadeia de efeitos
     */
    processChain(instanceIds: string[], input: EffectInput, context: EffectContext): Promise<EffectOutput>;
    private calculateTimingFade;
    private blendPixels;
    private blendColor;
    /**
     * Inicializa contexto GPU
     */
    initGPU(canvas?: HTMLCanvasElement): void;
    /**
     * Obtém contexto GPU
     */
    getGPUContext(): GPUContext | undefined;
    private registerBuiltInEffects;
    private generateId;
    on(event: string, callback: (event: EffectEvent) => void): void;
    off(event: string, callback: (event: EffectEvent) => void): void;
    private emit;
}
export interface EffectEvent {
    effectId?: string;
    instanceId?: string;
    instance?: EffectInstance;
    parameterId?: string;
    value?: unknown;
    time?: number;
    expression?: string;
}

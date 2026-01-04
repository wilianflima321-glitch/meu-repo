import { Event } from '@theia/core/lib/common';
/**
 * Asset types that can be generated
 */
export type AssetType = 'texture' | 'sprite' | 'model-3d' | 'material' | 'animation' | 'audio-sfx' | 'audio-music' | 'voice' | 'terrain' | 'particle' | 'ui-element' | 'shader' | 'level' | 'character' | 'environment';
/**
 * Generation quality level
 */
export type QualityLevel = 'draft' | 'standard' | 'high' | 'ultra';
/**
 * Art style presets
 */
export type ArtStyle = 'realistic' | 'stylized' | 'pixel-art' | 'low-poly' | 'hand-painted' | 'anime' | 'cartoon' | 'sci-fi' | 'fantasy' | 'horror' | 'minimalist' | 'retro' | 'cyberpunk' | 'steampunk' | 'vaporwave';
/**
 * Texture generation parameters
 */
export interface TextureGenerationParams {
    type: 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'height' | 'ao' | 'emissive';
    width: number;
    height: number;
    prompt: string;
    style?: ArtStyle;
    seamless?: boolean;
    negativePrompt?: string;
    seed?: number;
    referenceImage?: ArrayBuffer;
}
/**
 * 3D Model generation parameters
 */
export interface Model3DGenerationParams {
    prompt: string;
    style?: ArtStyle;
    polyCount?: 'low' | 'medium' | 'high';
    textured?: boolean;
    rigged?: boolean;
    format?: 'gltf' | 'glb' | 'fbx' | 'obj';
    referenceImages?: ArrayBuffer[];
    lod?: boolean;
}
/**
 * Audio generation parameters
 */
export interface AudioGenerationParams {
    type: 'sfx' | 'music' | 'ambient' | 'voice';
    prompt: string;
    duration: number;
    sampleRate?: number;
    channels?: 1 | 2;
    format?: 'wav' | 'mp3' | 'ogg';
    genre?: string;
    tempo?: number;
    key?: string;
    mood?: string;
    voiceId?: string;
    language?: string;
    emotion?: string;
}
/**
 * Animation generation parameters
 */
export interface AnimationGenerationParams {
    type: 'skeletal' | 'morph' | 'sprite-sheet' | 'keyframe';
    prompt: string;
    duration: number;
    fps?: number;
    loop?: boolean;
    skeleton?: string;
    frameCount?: number;
    spriteWidth?: number;
    spriteHeight?: number;
}
/**
 * Character generation parameters
 */
export interface CharacterGenerationParams {
    prompt: string;
    style?: ArtStyle;
    bodyType?: 'humanoid' | 'creature' | 'robot' | 'custom';
    gender?: 'male' | 'female' | 'neutral';
    age?: 'child' | 'young' | 'adult' | 'elderly';
    includeTextures?: boolean;
    includeRig?: boolean;
    includeAnimations?: string[];
    referenceImages?: ArrayBuffer[];
    conceptArt?: ArrayBuffer;
}
/**
 * Environment generation parameters
 */
export interface EnvironmentGenerationParams {
    prompt: string;
    style?: ArtStyle;
    size: {
        width: number;
        height: number;
        depth: number;
    };
    includeTerrain?: boolean;
    terrainType?: 'flat' | 'hilly' | 'mountainous' | 'canyon';
    includeVegetation?: boolean;
    vegetationDensity?: number;
    includeProps?: boolean;
    propDensity?: number;
    timeOfDay?: 'dawn' | 'day' | 'dusk' | 'night';
    weather?: 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog';
}
/**
 * Generation request
 */
export interface GenerationRequest<T = unknown> {
    id: string;
    type: AssetType;
    params: T;
    quality: QualityLevel;
    priority: number;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    startTime?: Date;
    endTime?: Date;
    result?: GeneratedAsset;
    error?: string;
}
/**
 * Generated asset
 */
export interface GeneratedAsset {
    id: string;
    type: AssetType;
    name: string;
    data: ArrayBuffer | ArrayBuffer[];
    metadata: AssetMetadata;
    thumbnailData?: ArrayBuffer;
    variants?: GeneratedAsset[];
}
/**
 * Asset metadata
 */
export interface AssetMetadata {
    format: string;
    size: number;
    dimensions?: {
        width: number;
        height: number;
        depth?: number;
    };
    duration?: number;
    polyCount?: number;
    boneCount?: number;
    frameCount?: number;
    prompt: string;
    style?: ArtStyle;
    seed?: number;
    generationTime: number;
    modelUsed: string;
}
/**
 * Variation request
 */
export interface VariationRequest {
    sourceAsset: GeneratedAsset;
    variationType: 'color' | 'style' | 'detail' | 'random';
    strength: number;
    count: number;
}
/**
 * Upscale request
 */
export interface UpscaleRequest {
    sourceAsset: GeneratedAsset;
    targetScale: 2 | 4 | 8;
    enhanceDetails?: boolean;
}
/**
 * Generation provider configuration
 */
export interface GenerationProviderConfig {
    id: string;
    name: string;
    supportedTypes: AssetType[];
    apiEndpoint: string;
    apiKey?: string;
    modelId?: string;
    maxConcurrent: number;
    rateLimit: {
        requests: number;
        perSeconds: number;
    };
    /** Custom endpoint override for API calls */
    endpoint?: string;
}
export declare class AssetGenerationAI {
    private providers;
    private queue;
    private activeRequests;
    private completedAssets;
    private processing;
    private readonly onRequestQueuedEmitter;
    private readonly onProgressEmitter;
    private readonly onCompleteEmitter;
    private readonly onErrorEmitter;
    readonly onRequestQueued: Event<{
        requestId: string;
    }>;
    readonly onProgress: Event<{
        requestId: string;
        progress: number;
    }>;
    readonly onComplete: Event<{
        requestId: string;
        asset: GeneratedAsset;
    }>;
    readonly onError: Event<{
        requestId: string;
        error: string;
    }>;
    constructor();
    /**
     * Initialize default generation providers
     */
    private initializeDefaultProviders;
    /**
     * Register a generation provider
     */
    registerProvider(config: GenerationProviderConfig): void;
    /**
     * Get available providers for asset type
     */
    getProvidersForType(type: AssetType): GenerationProviderConfig[];
    /**
     * Generate texture
     */
    generateTexture(params: TextureGenerationParams, quality?: QualityLevel): Promise<string>;
    /**
     * Generate PBR texture set
     */
    generatePBRTextureSet(prompt: string, width: number, height: number, style?: ArtStyle): Promise<string[]>;
    /**
     * Generate seamless tileable texture
     */
    generateTileableTexture(prompt: string, size: number, style?: ArtStyle): Promise<string>;
    /**
     * Generate 3D model
     */
    generateModel3D(params: Model3DGenerationParams, quality?: QualityLevel): Promise<string>;
    /**
     * Generate low-poly model
     */
    generateLowPolyModel(prompt: string, textured?: boolean): Promise<string>;
    /**
     * Generate model with LOD levels
     */
    generateModelWithLOD(prompt: string, style?: ArtStyle): Promise<string>;
    /**
     * Generate audio
     */
    generateAudio(params: AudioGenerationParams, quality?: QualityLevel): Promise<string>;
    /**
     * Generate sound effect
     */
    generateSoundEffect(prompt: string, duration: number, format?: 'wav' | 'ogg'): Promise<string>;
    /**
     * Generate background music
     */
    generateMusic(prompt: string, duration: number, options?: {
        genre?: string;
        tempo?: number;
        mood?: string;
    }): Promise<string>;
    /**
     * Generate voice line
     */
    generateVoice(text: string, voiceId: string, options?: {
        emotion?: string;
        language?: string;
    }): Promise<string>;
    /**
     * Generate animation
     */
    generateAnimation(params: AnimationGenerationParams, quality?: QualityLevel): Promise<string>;
    /**
     * Generate sprite sheet animation
     */
    generateSpriteAnimation(prompt: string, frameCount: number, spriteSize: number): Promise<string>;
    /**
     * Generate skeletal animation
     */
    generateSkeletalAnimation(prompt: string, duration: number, skeletonId: string): Promise<string>;
    /**
     * Generate complete character
     */
    generateCharacter(params: CharacterGenerationParams, quality?: QualityLevel): Promise<string>;
    /**
     * Generate playable character
     */
    generatePlayableCharacter(prompt: string, style?: ArtStyle, animations?: string[]): Promise<string>;
    /**
     * Generate NPC character
     */
    generateNPC(prompt: string, style?: ArtStyle): Promise<string>;
    /**
     * Generate environment
     */
    generateEnvironment(params: EnvironmentGenerationParams, quality?: QualityLevel): Promise<string>;
    /**
     * Generate game level
     */
    generateLevel(prompt: string, size: {
        width: number;
        height: number;
        depth: number;
    }, style?: ArtStyle): Promise<string>;
    /**
     * Generate variations of an asset
     */
    generateVariations(request: VariationRequest): Promise<string[]>;
    /**
     * Upscale an asset
     */
    upscaleAsset(request: UpscaleRequest): Promise<string>;
    /**
     * Style transfer on existing asset
     */
    applyStyleTransfer(asset: GeneratedAsset, targetStyle: ArtStyle, strength?: number): Promise<string>;
    /**
     * Queue a generation request
     */
    private queueRequest;
    /**
     * Sort queue by priority
     */
    private sortQueue;
    /**
     * Process generation queue
     */
    private processQueue;
    /**
     * Process a single request
     */
    private processRequest;
    /**
     * Select best provider for asset type
     */
    private selectProvider;
    /**
     * Get provider ID for request
     */
    private getProviderForRequest;
    /**
     * Execute generation with provider
     */
    private executeGeneration;
    /**
     * Generate image-based asset (texture, sprite, etc.)
     */
    private generateImageAsset;
    /**
     * Generate 3D model asset
     */
    private generate3DAsset;
    /**
     * Generate audio asset
     */
    private generateAudioAsset;
    /**
     * Generate animation asset
     */
    private generateAnimationAsset;
    /**
     * Generate character asset
     */
    private generateCharacterAsset;
    /**
     * Generate environment asset
     */
    private generateEnvironmentAsset;
    /**
     * Create dummy image for placeholder
     */
    private createDummyImage;
    /**
     * Convert canvas to ArrayBuffer
     */
    private canvasToArrayBuffer;
    /**
     * Create placeholder GLTF data
     */
    private createPlaceholderGLTF;
    /**
     * Generate asset name from request
     */
    private generateAssetName;
    /**
     * Extract prompt from params
     */
    private extractPrompt;
    /**
     * Get request status
     */
    getRequestStatus(requestId: string): GenerationRequest | undefined;
    /**
     * Get completed asset
     */
    getAsset(assetId: string): GeneratedAsset | undefined;
    /**
     * Cancel request
     */
    cancelRequest(requestId: string): boolean;
    /**
     * Get queue length
     */
    getQueueLength(): number;
    /**
     * Get active request count
     */
    getActiveCount(): number;
    /**
     * Call OpenAI DALL-E API for image generation
     */
    private callOpenAIImageAPI;
    /**
     * Call Stability AI API for image generation
     */
    private callStabilityAPI;
    /**
     * Call ElevenLabs API for voice generation
     */
    private callElevenLabsAPI;
    /**
     * Call Suno API for music generation (when available)
     */
    private callMusicGenerationAPI;
    /**
     * Generate placeholder audio when APIs unavailable
     */
    private generatePlaceholderAudio;
}

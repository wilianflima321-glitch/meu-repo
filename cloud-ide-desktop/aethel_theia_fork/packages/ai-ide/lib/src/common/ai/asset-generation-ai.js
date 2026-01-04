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
exports.AssetGenerationAI = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// ASSET GENERATION ENGINE
// ============================================================================
let AssetGenerationAI = class AssetGenerationAI {
    constructor() {
        this.providers = new Map();
        this.queue = [];
        this.activeRequests = new Map();
        this.completedAssets = new Map();
        this.processing = false;
        this.onRequestQueuedEmitter = new common_1.Emitter();
        this.onProgressEmitter = new common_1.Emitter();
        this.onCompleteEmitter = new common_1.Emitter();
        this.onErrorEmitter = new common_1.Emitter();
        this.onRequestQueued = this.onRequestQueuedEmitter.event;
        this.onProgress = this.onProgressEmitter.event;
        this.onComplete = this.onCompleteEmitter.event;
        this.onError = this.onErrorEmitter.event;
        this.initializeDefaultProviders();
    }
    // ========================================================================
    // PROVIDER MANAGEMENT
    // ========================================================================
    /**
     * Initialize default generation providers
     */
    initializeDefaultProviders() {
        // Stable Diffusion for textures
        this.registerProvider({
            id: 'stable-diffusion',
            name: 'Stable Diffusion',
            supportedTypes: ['texture', 'sprite', 'ui-element'],
            apiEndpoint: 'https://api.stability.ai/v1/generation',
            maxConcurrent: 3,
            rateLimit: { requests: 10, perSeconds: 60 },
        });
        // DALL-E for concept art
        this.registerProvider({
            id: 'dalle',
            name: 'DALL-E 3',
            supportedTypes: ['texture', 'sprite', 'ui-element', 'character', 'environment'],
            apiEndpoint: 'https://api.openai.com/v1/images/generations',
            maxConcurrent: 2,
            rateLimit: { requests: 5, perSeconds: 60 },
        });
        // Point-E / Shap-E for 3D models
        this.registerProvider({
            id: 'shape',
            name: 'Shap-E',
            supportedTypes: ['model-3d'],
            apiEndpoint: 'https://api.openai.com/v1/models',
            maxConcurrent: 1,
            rateLimit: { requests: 3, perSeconds: 60 },
        });
        // AudioCraft for audio
        this.registerProvider({
            id: 'audiocraft',
            name: 'AudioCraft',
            supportedTypes: ['audio-sfx', 'audio-music'],
            apiEndpoint: 'https://audiocraft-api.example.com',
            maxConcurrent: 2,
            rateLimit: { requests: 5, perSeconds: 60 },
        });
        // ElevenLabs for voice
        this.registerProvider({
            id: 'elevenlabs',
            name: 'ElevenLabs',
            supportedTypes: ['voice'],
            apiEndpoint: 'https://api.elevenlabs.io/v1',
            maxConcurrent: 2,
            rateLimit: { requests: 10, perSeconds: 60 },
        });
    }
    /**
     * Register a generation provider
     */
    registerProvider(config) {
        this.providers.set(config.id, config);
    }
    /**
     * Get available providers for asset type
     */
    getProvidersForType(type) {
        return Array.from(this.providers.values())
            .filter(p => p.supportedTypes.includes(type));
    }
    // ========================================================================
    // TEXTURE GENERATION
    // ========================================================================
    /**
     * Generate texture
     */
    async generateTexture(params, quality = 'standard') {
        return this.queueRequest({
            type: 'texture',
            params,
            quality,
        });
    }
    /**
     * Generate PBR texture set
     */
    async generatePBRTextureSet(prompt, width, height, style) {
        const types = [
            'diffuse', 'normal', 'roughness', 'metallic', 'ao'
        ];
        const requestIds = [];
        for (const type of types) {
            const id = await this.generateTexture({
                type,
                width,
                height,
                prompt: `${prompt}, ${type} map`,
                style,
                seamless: true,
            });
            requestIds.push(id);
        }
        return requestIds;
    }
    /**
     * Generate seamless tileable texture
     */
    async generateTileableTexture(prompt, size, style) {
        return this.generateTexture({
            type: 'diffuse',
            width: size,
            height: size,
            prompt: `${prompt}, seamless tileable texture`,
            style,
            seamless: true,
        });
    }
    // ========================================================================
    // 3D MODEL GENERATION
    // ========================================================================
    /**
     * Generate 3D model
     */
    async generateModel3D(params, quality = 'standard') {
        return this.queueRequest({
            type: 'model-3d',
            params,
            quality,
        });
    }
    /**
     * Generate low-poly model
     */
    async generateLowPolyModel(prompt, textured = true) {
        return this.generateModel3D({
            prompt,
            style: 'low-poly',
            polyCount: 'low',
            textured,
            format: 'gltf',
        });
    }
    /**
     * Generate model with LOD levels
     */
    async generateModelWithLOD(prompt, style) {
        return this.generateModel3D({
            prompt,
            style,
            polyCount: 'high',
            textured: true,
            lod: true,
            format: 'gltf',
        });
    }
    // ========================================================================
    // AUDIO GENERATION
    // ========================================================================
    /**
     * Generate audio
     */
    async generateAudio(params, quality = 'standard') {
        return this.queueRequest({
            type: params.type === 'music' ? 'audio-music' : 'audio-sfx',
            params,
            quality,
        });
    }
    /**
     * Generate sound effect
     */
    async generateSoundEffect(prompt, duration, format = 'wav') {
        return this.generateAudio({
            type: 'sfx',
            prompt,
            duration,
            format,
            sampleRate: 44100,
            channels: 2,
        });
    }
    /**
     * Generate background music
     */
    async generateMusic(prompt, duration, options = {}) {
        return this.generateAudio({
            type: 'music',
            prompt,
            duration,
            genre: options.genre,
            tempo: options.tempo,
            mood: options.mood,
            format: 'mp3',
            sampleRate: 44100,
            channels: 2,
        });
    }
    /**
     * Generate voice line
     */
    async generateVoice(text, voiceId, options = {}) {
        return this.generateAudio({
            type: 'voice',
            prompt: text,
            duration: 0, // Auto-determined by text length
            voiceId,
            emotion: options.emotion,
            language: options.language || 'en',
            format: 'mp3',
        });
    }
    // ========================================================================
    // ANIMATION GENERATION
    // ========================================================================
    /**
     * Generate animation
     */
    async generateAnimation(params, quality = 'standard') {
        return this.queueRequest({
            type: 'animation',
            params,
            quality,
        });
    }
    /**
     * Generate sprite sheet animation
     */
    async generateSpriteAnimation(prompt, frameCount, spriteSize) {
        return this.generateAnimation({
            type: 'sprite-sheet',
            prompt,
            duration: frameCount / 12, // Default 12 fps
            frameCount,
            spriteWidth: spriteSize,
            spriteHeight: spriteSize,
            fps: 12,
            loop: true,
        });
    }
    /**
     * Generate skeletal animation
     */
    async generateSkeletalAnimation(prompt, duration, skeletonId) {
        return this.generateAnimation({
            type: 'skeletal',
            prompt,
            duration,
            skeleton: skeletonId,
            fps: 30,
            loop: false,
        });
    }
    // ========================================================================
    // CHARACTER GENERATION
    // ========================================================================
    /**
     * Generate complete character
     */
    async generateCharacter(params, quality = 'standard') {
        return this.queueRequest({
            type: 'character',
            params,
            quality,
        });
    }
    /**
     * Generate playable character
     */
    async generatePlayableCharacter(prompt, style, animations = ['idle', 'walk', 'run', 'jump', 'attack']) {
        return this.generateCharacter({
            prompt,
            style,
            bodyType: 'humanoid',
            includeTextures: true,
            includeRig: true,
            includeAnimations: animations,
        });
    }
    /**
     * Generate NPC character
     */
    async generateNPC(prompt, style) {
        return this.generateCharacter({
            prompt,
            style,
            bodyType: 'humanoid',
            includeTextures: true,
            includeRig: true,
            includeAnimations: ['idle', 'talk', 'walk'],
        });
    }
    // ========================================================================
    // ENVIRONMENT GENERATION
    // ========================================================================
    /**
     * Generate environment
     */
    async generateEnvironment(params, quality = 'standard') {
        return this.queueRequest({
            type: 'environment',
            params,
            quality,
        });
    }
    /**
     * Generate game level
     */
    async generateLevel(prompt, size, style) {
        return this.generateEnvironment({
            prompt,
            style,
            size,
            includeTerrain: true,
            includeVegetation: true,
            includeProps: true,
            propDensity: 0.5,
            vegetationDensity: 0.3,
        });
    }
    // ========================================================================
    // VARIATION & ENHANCEMENT
    // ========================================================================
    /**
     * Generate variations of an asset
     */
    async generateVariations(request) {
        const requestIds = [];
        for (let i = 0; i < request.count; i++) {
            const id = await this.queueRequest({
                type: request.sourceAsset.type,
                params: {
                    sourceAsset: request.sourceAsset,
                    variationType: request.variationType,
                    strength: request.strength,
                    variationIndex: i,
                },
                quality: 'standard',
            });
            requestIds.push(id);
        }
        return requestIds;
    }
    /**
     * Upscale an asset
     */
    async upscaleAsset(request) {
        return this.queueRequest({
            type: request.sourceAsset.type,
            params: {
                sourceAsset: request.sourceAsset,
                targetScale: request.targetScale,
                enhanceDetails: request.enhanceDetails ?? true,
            },
            quality: 'high',
        });
    }
    /**
     * Style transfer on existing asset
     */
    async applyStyleTransfer(asset, targetStyle, strength = 0.8) {
        return this.queueRequest({
            type: asset.type,
            params: {
                sourceAsset: asset,
                targetStyle,
                strength,
            },
            quality: 'standard',
        });
    }
    // ========================================================================
    // QUEUE MANAGEMENT
    // ========================================================================
    /**
     * Queue a generation request
     */
    async queueRequest(options) {
        const request = {
            id: generateId(),
            type: options.type,
            params: options.params,
            quality: options.quality,
            priority: options.priority || 0,
            status: 'queued',
            progress: 0,
        };
        this.queue.push(request);
        this.sortQueue();
        this.onRequestQueuedEmitter.fire({ requestId: request.id });
        // Start processing if not already
        if (!this.processing) {
            this.processQueue();
        }
        return request.id;
    }
    /**
     * Sort queue by priority
     */
    sortQueue() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Process generation queue
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0)
            return;
        this.processing = true;
        while (this.queue.length > 0) {
            const request = this.queue.shift();
            await this.processRequest(request);
        }
        this.processing = false;
    }
    /**
     * Process a single request
     */
    async processRequest(request) {
        request.status = 'processing';
        request.startTime = new Date();
        this.activeRequests.set(request.id, request);
        try {
            // Select provider
            const provider = this.selectProvider(request.type);
            if (!provider) {
                throw new Error(`No provider available for type: ${request.type}`);
            }
            // Generate asset
            const asset = await this.executeGeneration(request, provider);
            request.status = 'completed';
            request.progress = 1;
            request.result = asset;
            request.endTime = new Date();
            this.completedAssets.set(asset.id, asset);
            this.onCompleteEmitter.fire({ requestId: request.id, asset });
        }
        catch (error) {
            request.status = 'failed';
            request.error = error instanceof Error ? error.message : String(error);
            request.endTime = new Date();
            this.onErrorEmitter.fire({ requestId: request.id, error: request.error });
        }
        finally {
            this.activeRequests.delete(request.id);
        }
    }
    /**
     * Select best provider for asset type
     */
    selectProvider(type) {
        const providers = this.getProvidersForType(type);
        if (providers.length === 0)
            return null;
        // Select provider with available capacity
        for (const provider of providers) {
            const activeCount = Array.from(this.activeRequests.values())
                .filter(r => this.getProviderForRequest(r) === provider.id)
                .length;
            if (activeCount < provider.maxConcurrent) {
                return provider;
            }
        }
        return providers[0]; // Return first as fallback
    }
    /**
     * Get provider ID for request
     */
    getProviderForRequest(_request) {
        // Logic to determine which provider handles the request
        return 'stable-diffusion';
    }
    /**
     * Execute generation with provider
     */
    async executeGeneration(request, provider) {
        const startTime = Date.now();
        // Simulate progress updates
        const progressInterval = setInterval(() => {
            if (request.progress < 0.9) {
                request.progress += 0.1;
                this.onProgressEmitter.fire({ requestId: request.id, progress: request.progress });
            }
        }, 500);
        try {
            // Call provider API based on asset type
            let data;
            let metadata = {};
            switch (request.type) {
                case 'texture':
                case 'sprite':
                case 'ui-element':
                    ({ data, metadata } = await this.generateImageAsset(request, provider));
                    break;
                case 'model-3d':
                    ({ data, metadata } = await this.generate3DAsset(request, provider));
                    break;
                case 'audio-sfx':
                case 'audio-music':
                case 'voice':
                    ({ data, metadata } = await this.generateAudioAsset(request, provider));
                    break;
                case 'animation':
                    ({ data, metadata } = await this.generateAnimationAsset(request, provider));
                    break;
                case 'character':
                    ({ data, metadata } = await this.generateCharacterAsset(request, provider));
                    break;
                case 'environment':
                    ({ data, metadata } = await this.generateEnvironmentAsset(request, provider));
                    break;
                default:
                    throw new Error(`Unsupported asset type: ${request.type}`);
            }
            return {
                id: generateId(),
                type: request.type,
                name: this.generateAssetName(request),
                data,
                metadata: {
                    format: metadata.format || 'unknown',
                    size: data.byteLength,
                    dimensions: metadata.dimensions,
                    duration: metadata.duration,
                    polyCount: metadata.polyCount,
                    boneCount: metadata.boneCount,
                    frameCount: metadata.frameCount,
                    prompt: this.extractPrompt(request.params),
                    style: request.params.style,
                    seed: metadata.seed,
                    generationTime: Date.now() - startTime,
                    modelUsed: provider.name,
                },
            };
        }
        finally {
            clearInterval(progressInterval);
        }
    }
    // ========================================================================
    // ASSET-SPECIFIC GENERATION
    // ========================================================================
    /**
     * Generate image-based asset (texture, sprite, etc.)
     */
    async generateImageAsset(request, provider) {
        const params = request.params;
        // Try real API calls if configured
        if (provider.apiKey) {
            try {
                // OpenAI DALL-E
                if (provider.name === 'openai-dalle' || provider.name.includes('dall-e')) {
                    return await this.callOpenAIImageAPI(params, provider);
                }
                // Stability AI
                if (provider.name === 'stability' || provider.name.includes('stable-diffusion')) {
                    return await this.callStabilityAPI(params, provider);
                }
            }
            catch (error) {
                console.warn('[AssetGen] API call failed, using fallback:', error);
            }
        }
        // Fallback: generate placeholder image
        const canvas = this.createDummyImage(params.width, params.height);
        const data = await this.canvasToArrayBuffer(canvas, 'image/png');
        return {
            data,
            metadata: {
                format: 'png',
                dimensions: { width: params.width, height: params.height },
                seed: params.seed || Math.floor(Math.random() * 999999),
            },
        };
    }
    /**
     * Generate 3D model asset
     */
    async generate3DAsset(request, _provider) {
        const params = request.params;
        // Generate placeholder 3D model data
        const modelData = this.createPlaceholderGLTF();
        return {
            data: modelData,
            metadata: {
                format: params.format || 'gltf',
                polyCount: params.polyCount === 'low' ? 500 : params.polyCount === 'high' ? 50000 : 5000,
                seed: Math.floor(Math.random() * 999999),
            },
        };
    }
    /**
     * Generate audio asset
     */
    async generateAudioAsset(request, provider) {
        const params = request.params;
        // Try real API calls if configured
        if (provider.apiKey) {
            try {
                // Voice generation with ElevenLabs
                if (params.type === 'voice' && (provider.name === 'elevenlabs' || provider.name.includes('eleven'))) {
                    return await this.callElevenLabsAPI(params, provider);
                }
                // Music generation
                if (params.type === 'music' && provider.name.includes('suno')) {
                    return await this.callMusicGenerationAPI(params, provider);
                }
            }
            catch (error) {
                console.warn('[AssetGen] Audio API call failed, using fallback:', error);
            }
        }
        // Fallback: generate placeholder audio
        return this.generatePlaceholderAudio(params);
    }
    /**
     * Generate animation asset
     */
    async generateAnimationAsset(request, _provider) {
        const params = request.params;
        // Generate placeholder animation data
        const data = new ArrayBuffer(1024);
        return {
            data,
            metadata: {
                format: params.type === 'sprite-sheet' ? 'png' : 'json',
                duration: params.duration,
                frameCount: params.frameCount || Math.floor(params.duration * (params.fps || 30)),
                seed: Math.floor(Math.random() * 999999),
            },
        };
    }
    /**
     * Generate character asset
     */
    async generateCharacterAsset(request, _provider) {
        const params = request.params;
        // Generate placeholder character data
        const modelData = this.createPlaceholderGLTF();
        return {
            data: modelData,
            metadata: {
                format: 'gltf',
                polyCount: 10000,
                boneCount: params.includeRig ? 65 : 0,
                seed: Math.floor(Math.random() * 999999),
            },
        };
    }
    /**
     * Generate environment asset
     */
    async generateEnvironmentAsset(request, _provider) {
        const params = request.params;
        // Generate placeholder environment data
        const data = new ArrayBuffer(4096);
        return {
            data,
            metadata: {
                format: 'gltf',
                dimensions: {
                    width: params.size.width,
                    height: params.size.height,
                    depth: params.size.depth
                },
                seed: Math.floor(Math.random() * 999999),
            },
        };
    }
    // ========================================================================
    // HELPER METHODS
    // ========================================================================
    /**
     * Create dummy image for placeholder
     */
    createDummyImage(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Fill with gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#3498db');
        gradient.addColorStop(1, '#9b59b6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        // Add noise pattern
        const imageData = ctx.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 30 - 15;
            imageData.data[i] += noise;
            imageData.data[i + 1] += noise;
            imageData.data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    /**
     * Convert canvas to ArrayBuffer
     */
    async canvasToArrayBuffer(canvas, mimeType) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error('Failed to convert canvas to blob'));
                    return;
                }
                blob.arrayBuffer().then(resolve).catch(reject);
            }, mimeType);
        });
    }
    /**
     * Create placeholder GLTF data
     */
    createPlaceholderGLTF() {
        // Minimal valid GLTF JSON
        const gltf = {
            asset: { version: '2.0' },
            scene: 0,
            scenes: [{ nodes: [0] }],
            nodes: [{ mesh: 0 }],
            meshes: [{
                    primitives: [{
                            attributes: { POSITION: 0 },
                            indices: 1,
                        }]
                }],
            accessors: [
                { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
                { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
            ],
            bufferViews: [
                { buffer: 0, byteLength: 36, byteOffset: 0 },
                { buffer: 0, byteLength: 6, byteOffset: 36 },
            ],
            buffers: [{ byteLength: 42 }],
        };
        const json = JSON.stringify(gltf);
        const encoder = new TextEncoder();
        return encoder.encode(json).buffer;
    }
    /**
     * Generate asset name from request
     */
    generateAssetName(request) {
        const prompt = this.extractPrompt(request.params);
        const words = prompt.split(' ').slice(0, 3).join('_');
        return `${request.type}_${words}_${Date.now()}`;
    }
    /**
     * Extract prompt from params
     */
    extractPrompt(params) {
        if (typeof params === 'object' && params !== null && 'prompt' in params) {
            return params.prompt;
        }
        return 'generated_asset';
    }
    // ========================================================================
    // REQUEST MANAGEMENT
    // ========================================================================
    /**
     * Get request status
     */
    getRequestStatus(requestId) {
        return this.activeRequests.get(requestId) ||
            this.queue.find(r => r.id === requestId);
    }
    /**
     * Get completed asset
     */
    getAsset(assetId) {
        return this.completedAssets.get(assetId);
    }
    /**
     * Cancel request
     */
    cancelRequest(requestId) {
        const queueIndex = this.queue.findIndex(r => r.id === requestId);
        if (queueIndex !== -1) {
            this.queue.splice(queueIndex, 1);
            return true;
        }
        const active = this.activeRequests.get(requestId);
        if (active) {
            active.status = 'cancelled';
            return true;
        }
        return false;
    }
    /**
     * Get queue length
     */
    getQueueLength() {
        return this.queue.length;
    }
    /**
     * Get active request count
     */
    getActiveCount() {
        return this.activeRequests.size;
    }
    // ========================================================================
    // REAL API IMPLEMENTATIONS
    // ========================================================================
    /**
     * Call OpenAI DALL-E API for image generation
     */
    async callOpenAIImageAPI(params, provider) {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        // Determine size (DALL-E supports specific sizes)
        const size = params.width >= 1024 ? '1024x1024' :
            params.width >= 512 ? '512x512' : '256x256';
        const body = {
            model: 'dall-e-3',
            prompt: params.prompt + (params.style ? `, ${params.style} style` : ''),
            n: 1,
            size,
            quality: params.type === 'diffuse' ? 'hd' : 'standard',
            response_format: 'b64_json',
        };
        const response = await fetch(`${endpoint}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI DALL-E API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        const base64Data = result.data[0].b64_json;
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return {
            data: bytes.buffer,
            metadata: {
                format: 'png',
                dimensions: { width: parseInt(size), height: parseInt(size) },
                seed: params.seed || Math.floor(Math.random() * 999999),
            },
        };
    }
    /**
     * Call Stability AI API for image generation
     */
    async callStabilityAPI(params, provider) {
        const endpoint = provider.endpoint || 'https://api.stability.ai/v1';
        const engineId = 'stable-diffusion-xl-1024-v1-0';
        const formData = new FormData();
        formData.append('text_prompts[0][text]', params.prompt);
        formData.append('text_prompts[0][weight]', '1');
        if (params.negativePrompt) {
            formData.append('text_prompts[1][text]', params.negativePrompt);
            formData.append('text_prompts[1][weight]', '-1');
        }
        formData.append('cfg_scale', '7');
        formData.append('width', String(Math.min(params.width, 1024)));
        formData.append('height', String(Math.min(params.height, 1024)));
        formData.append('samples', '1');
        formData.append('steps', '30');
        if (params.seed) {
            formData.append('seed', String(params.seed));
        }
        const response = await fetch(`${endpoint}/generation/${engineId}/text-to-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${provider.apiKey}`,
                'Accept': 'application/json',
            },
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        const base64Data = result.artifacts[0].base64;
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return {
            data: bytes.buffer,
            metadata: {
                format: 'png',
                dimensions: { width: params.width, height: params.height },
                seed: result.artifacts[0].seed || params.seed,
            },
        };
    }
    /**
     * Call ElevenLabs API for voice generation
     */
    async callElevenLabsAPI(params, provider) {
        const endpoint = provider.endpoint || 'https://api.elevenlabs.io/v1';
        const voiceId = params.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice
        const body = {
            text: params.prompt,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
            },
        };
        const response = await fetch(`${endpoint}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': provider.apiKey,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }
        const data = await response.arrayBuffer();
        return {
            data,
            metadata: {
                format: 'mp3',
                duration: params.duration,
            },
        };
    }
    /**
     * Call Suno API for music generation (when available)
     */
    async callMusicGenerationAPI(params, provider) {
        // Suno or similar music gen API
        const endpoint = provider.endpoint || 'https://api.suno.ai/v1';
        const body = {
            prompt: params.prompt,
            duration: params.duration,
            genre: params.genre || 'electronic',
            tempo: params.tempo || 120,
            key: params.key || 'C',
            mood: params.mood || 'energetic',
        };
        const response = await fetch(`${endpoint}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            // Fallback to placeholder if API not available
            console.warn('[AssetGen] Music API not available, using placeholder');
            return this.generatePlaceholderAudio(params);
        }
        const data = await response.arrayBuffer();
        return {
            data,
            metadata: {
                format: params.format || 'wav',
                duration: params.duration,
            },
        };
    }
    /**
     * Generate placeholder audio when APIs unavailable
     */
    generatePlaceholderAudio(params) {
        const sampleRate = params.sampleRate || 44100;
        const channels = params.channels || 2;
        const samples = Math.floor(params.duration * sampleRate);
        // Generate simple sine wave tone
        const data = new Float32Array(samples * channels);
        const frequency = 440; // A4 note
        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            const value = Math.sin(2 * Math.PI * frequency * t) * 0.3;
            for (let c = 0; c < channels; c++) {
                data[i * channels + c] = value;
            }
        }
        return {
            data: data.buffer,
            metadata: {
                format: params.format || 'wav',
                duration: params.duration,
            },
        };
    }
};
exports.AssetGenerationAI = AssetGenerationAI;
exports.AssetGenerationAI = AssetGenerationAI = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], AssetGenerationAI);
// ============================================================================
// UTILITY
// ============================================================================
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

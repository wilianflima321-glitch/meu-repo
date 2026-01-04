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
exports.UnifiedRenderPipeline = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// UNIFIED RENDER PIPELINE
// ============================================================================
let UnifiedRenderPipeline = class UnifiedRenderPipeline {
    constructor() {
        this.targets = new Map();
        this.passes = [];
        this.stateStack = [];
        this.renderCache = new Map();
        this.currentState = this.createDefaultState();
    }
    // ========================================================================
    // RENDER TARGETS
    // ========================================================================
    /**
     * Cria render target
     */
    createRenderTarget(width, height, options = {}) {
        const target = {
            id: options.id || this.generateId(),
            name: options.name || 'Render Target',
            width,
            height,
            format: options.format || 'rgba8',
            colorSpace: options.colorSpace || 'sRGB',
            bitDepth: options.bitDepth || 8,
            samples: options.samples || 1,
            clearColor: options.clearColor || { r: 0, g: 0, b: 0, a: 0 },
            clearDepth: options.clearDepth ?? 1.0,
            clearStencil: options.clearStencil ?? 0,
            mipmaps: options.mipmaps ?? false,
            metadata: options.metadata || {},
        };
        // Alocar buffers
        target.colorBuffer = this.allocateColorBuffer(target);
        if (this.needsDepthBuffer(target.format)) {
            target.depthBuffer = new Float32Array(width * height);
        }
        this.targets.set(target.id, target);
        return target;
    }
    /**
     * Redimensiona render target
     */
    resizeRenderTarget(targetId, width, height) {
        const target = this.targets.get(targetId);
        if (!target)
            return;
        target.width = width;
        target.height = height;
        target.colorBuffer = this.allocateColorBuffer(target);
        if (target.depthBuffer) {
            target.depthBuffer = new Float32Array(width * height);
        }
        // Limpar cache
        this.renderCache.delete(`target_${targetId}`);
    }
    /**
     * Remove render target
     */
    destroyRenderTarget(targetId) {
        const target = this.targets.get(targetId);
        if (!target)
            return;
        target.colorBuffer = undefined;
        target.depthBuffer = undefined;
        target.stencilBuffer = undefined;
        this.targets.delete(targetId);
    }
    allocateColorBuffer(target) {
        const pixelCount = target.width * target.height;
        const bytesPerPixel = this.getBytesPerPixel(target.format);
        return new ArrayBuffer(pixelCount * bytesPerPixel);
    }
    getBytesPerPixel(format) {
        const formatSizes = {
            'rgba8': 4,
            'rgba16f': 8,
            'rgba32f': 16,
            'rgb8': 3,
            'rgb16f': 6,
            'rgb32f': 12,
            'rg8': 2,
            'rg16f': 4,
            'rg32f': 8,
            'r8': 1,
            'r16f': 2,
            'r32f': 4,
            'depth16': 2,
            'depth24': 3,
            'depth32f': 4,
            'depth24-stencil8': 4,
        };
        return formatSizes[format] || 4;
    }
    needsDepthBuffer(format) {
        return format.startsWith('depth');
    }
    // ========================================================================
    // RENDER PASSES
    // ========================================================================
    /**
     * Cria render pass
     */
    createRenderPass(name, targetId) {
        const pass = {
            id: this.generateId(),
            name,
            enabled: true,
            renderTargetId: targetId,
            clearFlags: { color: true, depth: true, stencil: false },
            sortMode: 'none',
            layerMask: 0xFFFFFFFF,
            queue: { commands: [], sorted: false },
        };
        this.passes.push(pass);
        return pass;
    }
    /**
     * Remove render pass
     */
    removeRenderPass(passId) {
        this.passes = this.passes.filter(p => p.id !== passId);
    }
    /**
     * Reordena passes
     */
    reorderPasses(passIds) {
        const passMap = new Map(this.passes.map(p => [p.id, p]));
        const newPasses = [];
        for (const id of passIds) {
            const pass = passMap.get(id);
            if (pass) {
                newPasses.push(pass);
            }
        }
        // Adicionar passes não mencionados no final
        for (const pass of this.passes) {
            if (!passIds.includes(pass.id)) {
                newPasses.push(pass);
            }
        }
        this.passes = newPasses;
    }
    // ========================================================================
    // RENDER COMMANDS
    // ========================================================================
    /**
     * Enfileira comando
     */
    enqueueCommand(passId, command) {
        const pass = this.passes.find(p => p.id === passId);
        if (!pass)
            return;
        pass.queue.commands.push(command);
        pass.queue.sorted = false;
    }
    /**
     * Cria comando de clear
     */
    createClearCommand(options) {
        return {
            type: 'clear',
            priority: -1000,
            layer: 0,
            sortKey: 0,
            data: options,
        };
    }
    /**
     * Cria comando de draw image
     */
    createDrawImageCommand(imageId, destRect, options = {}) {
        return {
            type: 'draw-image',
            priority: 0,
            layer: 0,
            sortKey: this.computeSortKey('draw-image', imageId),
            data: {
                imageId,
                destRect,
                opacity: options.opacity ?? 1.0,
                blendMode: options.blendMode || 'normal',
                sourceRect: options.sourceRect,
            },
        };
    }
    /**
     * Cria comando de composite
     */
    createCompositeCommand(sourceTargetId, destTargetId, blendMode, opacity) {
        return {
            type: 'composite',
            priority: 100,
            layer: 0,
            sortKey: 0,
            data: {
                sourceTargetId,
                destTargetId,
                blendMode,
                opacity,
            },
        };
    }
    /**
     * Cria comando de post-process
     */
    createPostProcessCommand(effectType, inputTargetId, outputTargetId, parameters = {}) {
        return {
            type: 'post-process',
            priority: 1000,
            layer: 0,
            sortKey: 0,
            data: {
                effectType,
                inputTargetId,
                outputTargetId,
                parameters,
            },
        };
    }
    // ========================================================================
    // RENDERING
    // ========================================================================
    /**
     * Executa pipeline completo
     */
    render() {
        for (const pass of this.passes) {
            if (!pass.enabled)
                continue;
            this.executePass(pass);
        }
    }
    /**
     * Executa um pass
     */
    executePass(pass) {
        const target = this.targets.get(pass.renderTargetId);
        if (!target)
            return;
        // Sort queue se necessário
        if (!pass.queue.sorted) {
            this.sortQueue(pass.queue, pass.sortMode);
        }
        // Set viewport
        const viewport = pass.viewport || { x: 0, y: 0, width: target.width, height: target.height };
        // Clear se necessário
        if (pass.clearFlags.color || pass.clearFlags.depth || pass.clearFlags.stencil) {
            this.executeClear(target, pass.clearFlags, target.clearColor, target.clearDepth, target.clearStencil);
        }
        // Executar comandos
        for (const command of pass.queue.commands) {
            // Verificar layer mask
            if ((1 << command.layer & pass.layerMask) === 0)
                continue;
            this.executeCommand(command, target, viewport);
        }
        // Limpar queue para próximo frame
        pass.queue.commands = [];
        pass.queue.sorted = false;
    }
    /**
     * Executa comando individual
     */
    executeCommand(command, target, viewport) {
        switch (command.type) {
            case 'clear':
                const clearData = command.data;
                this.executeClear(target, {
                    color: clearData.color ?? false,
                    depth: clearData.depth ?? false,
                    stencil: clearData.stencil ?? false
                }, clearData.clearColor || target.clearColor, clearData.clearDepth ?? target.clearDepth, clearData.clearStencil ?? target.clearStencil);
                break;
            case 'draw-image':
                this.executeDrawImage(target, command.data, viewport);
                break;
            case 'draw-sprite':
                this.executeDrawSprite(target, command.data, viewport);
                break;
            case 'draw-vector':
                this.executeDrawVector(target, command.data, viewport);
                break;
            case 'composite':
                this.executeComposite(command.data);
                break;
            case 'blit':
                this.executeBlit(command.data);
                break;
            case 'post-process':
                this.executePostProcess(command.data);
                break;
            case 'set-blend-mode':
                this.currentState.blendMode = command.data.mode;
                break;
        }
    }
    /**
     * Limpa render target
     */
    executeClear(target, flags, clearColor, clearDepth, clearStencil) {
        if (flags.color && target.colorBuffer) {
            const view = new Uint8ClampedArray(target.colorBuffer);
            const pixelCount = target.width * target.height;
            for (let i = 0; i < pixelCount; i++) {
                view[i * 4] = clearColor.r;
                view[i * 4 + 1] = clearColor.g;
                view[i * 4 + 2] = clearColor.b;
                view[i * 4 + 3] = clearColor.a;
            }
        }
        if (flags.depth && target.depthBuffer) {
            target.depthBuffer.fill(clearDepth);
        }
        if (flags.stencil && target.stencilBuffer) {
            target.stencilBuffer.fill(clearStencil);
        }
    }
    /**
     * Desenha imagem
     */
    executeDrawImage(target, data, viewport) {
        // Implementação simplificada - em produção usaria GPU
        const sourceImage = this.renderCache.get(data.imageId);
        if (!sourceImage || !target.colorBuffer)
            return;
        // Blit simples com blend mode
        // ... implementação de blit
    }
    /**
     * Desenha sprite
     */
    executeDrawSprite(target, data, viewport) {
        // Similar a draw image mas com transformações
    }
    /**
     * Desenha vetor
     */
    executeDrawVector(target, data, viewport) {
        // Rasterização de path vetorial
    }
    /**
     * Composite layers
     */
    executeComposite(data) {
        const source = this.targets.get(data.sourceTargetId);
        const dest = this.targets.get(data.destTargetId);
        if (!source || !dest || !source.colorBuffer || !dest.colorBuffer)
            return;
        const sourceView = new Uint8ClampedArray(source.colorBuffer);
        const destView = new Uint8ClampedArray(dest.colorBuffer);
        const pixelCount = Math.min(source.width * source.height, dest.width * dest.height);
        for (let i = 0; i < pixelCount; i++) {
            const idx = i * 4;
            const srcColor = {
                r: sourceView[idx],
                g: sourceView[idx + 1],
                b: sourceView[idx + 2],
                a: sourceView[idx + 3] * data.opacity,
            };
            const dstColor = {
                r: destView[idx],
                g: destView[idx + 1],
                b: destView[idx + 2],
                a: destView[idx + 3],
            };
            const result = this.blendPixel(dstColor, srcColor, data.blendMode);
            destView[idx] = result.r;
            destView[idx + 1] = result.g;
            destView[idx + 2] = result.b;
            destView[idx + 3] = result.a;
        }
    }
    /**
     * Blit entre targets
     */
    executeBlit(data) {
        const source = this.targets.get(data.sourceTargetId);
        if (!source || !source.colorBuffer)
            return;
        // Implementar blit com filtragem
    }
    /**
     * Aplica post-process
     */
    executePostProcess(data) {
        const input = this.targets.get(data.inputTargetId);
        const output = this.targets.get(data.outputTargetId);
        if (!input || !output || !input.colorBuffer || !output.colorBuffer)
            return;
        switch (data.effectType) {
            case 'bloom':
                this.applyBloom(input, output, data.parameters);
                break;
            case 'blur':
                this.applyBlur(input, output, data.parameters);
                break;
            case 'sharpen':
                this.applySharpen(input, output, data.parameters);
                break;
            case 'vignette':
                this.applyVignette(input, output, data.parameters);
                break;
            case 'color-grading':
                this.applyColorGrading(input, output, data.parameters);
                break;
            case 'tone-mapping':
                this.applyToneMapping(input, output, data.parameters);
                break;
            default:
                // Copiar direto
                if (output.colorBuffer.byteLength === input.colorBuffer.byteLength) {
                    new Uint8Array(output.colorBuffer).set(new Uint8Array(input.colorBuffer));
                }
        }
    }
    // ========================================================================
    // POST-PROCESS EFFECTS
    // ========================================================================
    applyBloom(input, output, params) {
        const threshold = params.threshold ?? 0.8;
        const intensity = params.intensity ?? 1.0;
        const radius = params.radius ?? 5;
        const inputView = new Uint8ClampedArray(input.colorBuffer);
        const outputView = new Uint8ClampedArray(output.colorBuffer);
        // 1. Extrair pixels brilhantes
        const bright = new Float32Array(input.width * input.height * 4);
        for (let i = 0; i < inputView.length; i += 4) {
            const luminance = (inputView[i] * 0.299 + inputView[i + 1] * 0.587 + inputView[i + 2] * 0.114) / 255;
            if (luminance > threshold) {
                bright[i] = inputView[i];
                bright[i + 1] = inputView[i + 1];
                bright[i + 2] = inputView[i + 2];
                bright[i + 3] = 255;
            }
        }
        // 2. Blur os pixels brilhantes
        const blurred = this.gaussianBlur(bright, input.width, input.height, radius);
        // 3. Adicionar ao original
        for (let i = 0; i < outputView.length; i += 4) {
            outputView[i] = Math.min(255, inputView[i] + blurred[i] * intensity);
            outputView[i + 1] = Math.min(255, inputView[i + 1] + blurred[i + 1] * intensity);
            outputView[i + 2] = Math.min(255, inputView[i + 2] + blurred[i + 2] * intensity);
            outputView[i + 3] = inputView[i + 3];
        }
    }
    applyBlur(input, output, params) {
        const radius = params.radius ?? 5;
        const inputView = new Uint8ClampedArray(input.colorBuffer);
        const blurred = this.gaussianBlur(new Float32Array(inputView), input.width, input.height, radius);
        const outputView = new Uint8ClampedArray(output.colorBuffer);
        for (let i = 0; i < outputView.length; i++) {
            outputView[i] = Math.round(blurred[i]);
        }
    }
    applySharpen(input, output, params) {
        const amount = params.amount ?? 1.0;
        const inputView = new Uint8ClampedArray(input.colorBuffer);
        const outputView = new Uint8ClampedArray(output.colorBuffer);
        // Unsharp mask
        const kernel = [
            0, -1 * amount, 0,
            -1 * amount, 1 + 4 * amount, -1 * amount,
            0, -1 * amount, 0,
        ];
        this.convolve(inputView, outputView, input.width, input.height, kernel, 3);
    }
    applyVignette(input, output, params) {
        const strength = params.strength ?? 0.5;
        const radius = params.radius ?? 0.75;
        const inputView = new Uint8ClampedArray(input.colorBuffer);
        const outputView = new Uint8ClampedArray(output.colorBuffer);
        const cx = input.width / 2;
        const cy = input.height / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        for (let y = 0; y < input.height; y++) {
            for (let x = 0; x < input.width; x++) {
                const dx = (x - cx) / cx;
                const dy = (y - cy) / cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const vignette = 1 - Math.pow(Math.max(0, dist - radius) / (1 - radius), 2) * strength;
                const idx = (y * input.width + x) * 4;
                outputView[idx] = Math.round(inputView[idx] * vignette);
                outputView[idx + 1] = Math.round(inputView[idx + 1] * vignette);
                outputView[idx + 2] = Math.round(inputView[idx + 2] * vignette);
                outputView[idx + 3] = inputView[idx + 3];
            }
        }
    }
    applyColorGrading(input, output, params) {
        const shadows = params.shadows || { r: 0, g: 0, b: 0, a: 0 };
        const midtones = params.midtones || { r: 128, g: 128, b: 128, a: 0 };
        const highlights = params.highlights || { r: 255, g: 255, b: 255, a: 0 };
        const saturation = params.saturation ?? 1.0;
        const contrast = params.contrast ?? 1.0;
        const exposure = params.exposure ?? 0;
        const inputView = new Uint8ClampedArray(input.colorBuffer);
        const outputView = new Uint8ClampedArray(output.colorBuffer);
        for (let i = 0; i < inputView.length; i += 4) {
            let r = inputView[i] / 255;
            let g = inputView[i + 1] / 255;
            let b = inputView[i + 2] / 255;
            // Exposure
            if (exposure !== 0) {
                const expFactor = Math.pow(2, exposure);
                r *= expFactor;
                g *= expFactor;
                b *= expFactor;
            }
            // Contrast
            r = (r - 0.5) * contrast + 0.5;
            g = (g - 0.5) * contrast + 0.5;
            b = (b - 0.5) * contrast + 0.5;
            // Saturation
            if (saturation !== 1) {
                const luma = r * 0.299 + g * 0.587 + b * 0.114;
                r = luma + (r - luma) * saturation;
                g = luma + (g - luma) * saturation;
                b = luma + (b - luma) * saturation;
            }
            // Clamp e output
            outputView[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
            outputView[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
            outputView[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
            outputView[i + 3] = inputView[i + 3];
        }
    }
    applyToneMapping(input, output, params) {
        const method = params.method ?? 'reinhard';
        const whitePoint = params.whitePoint ?? 1.0;
        const inputView = new Uint8ClampedArray(input.colorBuffer);
        const outputView = new Uint8ClampedArray(output.colorBuffer);
        for (let i = 0; i < inputView.length; i += 4) {
            let r = inputView[i] / 255;
            let g = inputView[i + 1] / 255;
            let b = inputView[i + 2] / 255;
            switch (method) {
                case 'reinhard':
                    r = r / (1 + r);
                    g = g / (1 + g);
                    b = b / (1 + b);
                    break;
                case 'aces':
                    // ACES filmic tone mapping
                    const a = 2.51;
                    const c = 0.03;
                    const d = 2.43;
                    const e = 0.59;
                    const f = 0.14;
                    r = Math.max(0, (r * (a * r + c)) / (r * (d * r + e) + f));
                    g = Math.max(0, (g * (a * g + c)) / (g * (d * g + e) + f));
                    b = Math.max(0, (b * (a * b + c)) / (b * (d * b + e) + f));
                    break;
                case 'uncharted2':
                    // Uncharted 2 tone mapping
                    const A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
                    const tonemap = (x) => ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
                    const W = 11.2;
                    const white = tonemap(W);
                    r = tonemap(r * whitePoint) / white;
                    g = tonemap(g * whitePoint) / white;
                    b = tonemap(b * whitePoint) / white;
                    break;
            }
            outputView[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
            outputView[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
            outputView[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
            outputView[i + 3] = inputView[i + 3];
        }
    }
    // ========================================================================
    // EXPORT
    // ========================================================================
    /**
     * Exporta render target
     */
    async exportTarget(targetId, options) {
        const target = this.targets.get(targetId);
        if (!target || !target.colorBuffer) {
            throw new Error('Render target not found');
        }
        // Redimensionar se necessário
        let buffer = target.colorBuffer;
        let width = target.width;
        let height = target.height;
        if (options.width || options.height || options.scale) {
            const result = this.resampleBuffer(target, options.width ?? Math.round(target.width * (options.scale ?? 1)), options.height ?? Math.round(target.height * (options.scale ?? 1)));
            buffer = result.buffer;
            width = result.width;
            height = result.height;
        }
        // Converter para formato de saída
        switch (options.format) {
            case 'png':
                return this.encodePNG(buffer, width, height, options);
            case 'jpeg':
                return this.encodeJPEG(buffer, width, height, options);
            case 'webp':
                return this.encodeWebP(buffer, width, height, options);
            default:
                return this.encodeRaw(buffer, width, height, options);
        }
    }
    resampleBuffer(target, newWidth, newHeight) {
        const oldView = new Uint8ClampedArray(target.colorBuffer);
        const newBuffer = new ArrayBuffer(newWidth * newHeight * 4);
        const newView = new Uint8ClampedArray(newBuffer);
        // Bilinear resampling
        const scaleX = target.width / newWidth;
        const scaleY = target.height / newHeight;
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const srcX = x * scaleX;
                const srcY = y * scaleY;
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = Math.min(x0 + 1, target.width - 1);
                const y1 = Math.min(y0 + 1, target.height - 1);
                const xFrac = srcX - x0;
                const yFrac = srcY - y0;
                for (let c = 0; c < 4; c++) {
                    const v00 = oldView[(y0 * target.width + x0) * 4 + c];
                    const v10 = oldView[(y0 * target.width + x1) * 4 + c];
                    const v01 = oldView[(y1 * target.width + x0) * 4 + c];
                    const v11 = oldView[(y1 * target.width + x1) * 4 + c];
                    const value = v00 * (1 - xFrac) * (1 - yFrac) +
                        v10 * xFrac * (1 - yFrac) +
                        v01 * (1 - xFrac) * yFrac +
                        v11 * xFrac * yFrac;
                    newView[(y * newWidth + x) * 4 + c] = Math.round(value);
                }
            }
        }
        return { buffer: newBuffer, width: newWidth, height: newHeight };
    }
    encodePNG(buffer, width, height, options) {
        // Simplified PNG encoding - real implementation would use a library
        // Return raw RGBA for now
        return buffer;
    }
    encodeJPEG(buffer, width, height, options) {
        // Simplified JPEG encoding
        return buffer;
    }
    encodeWebP(buffer, width, height, options) {
        // Simplified WebP encoding
        return buffer;
    }
    encodeRaw(buffer, width, height, options) {
        return buffer;
    }
    // ========================================================================
    // BLEND MODES
    // ========================================================================
    blendPixel(bottom, top, mode) {
        const b = { r: bottom.r / 255, g: bottom.g / 255, b: bottom.b / 255 };
        const t = { r: top.r / 255, g: top.g / 255, b: top.b / 255 };
        const ta = top.a / 255;
        let result;
        switch (mode) {
            case 'multiply':
                result = { r: b.r * t.r, g: b.g * t.g, b: b.b * t.b };
                break;
            case 'screen':
                result = {
                    r: 1 - (1 - b.r) * (1 - t.r),
                    g: 1 - (1 - b.g) * (1 - t.g),
                    b: 1 - (1 - b.b) * (1 - t.b)
                };
                break;
            case 'overlay':
                result = {
                    r: b.r < 0.5 ? 2 * b.r * t.r : 1 - 2 * (1 - b.r) * (1 - t.r),
                    g: b.g < 0.5 ? 2 * b.g * t.g : 1 - 2 * (1 - b.g) * (1 - t.g),
                    b: b.b < 0.5 ? 2 * b.b * t.b : 1 - 2 * (1 - b.b) * (1 - t.b),
                };
                break;
            case 'additive':
                result = {
                    r: Math.min(1, b.r + t.r),
                    g: Math.min(1, b.g + t.g),
                    b: Math.min(1, b.b + t.b),
                };
                break;
            default:
                result = t;
        }
        // Alpha composite
        const outA = ta + (bottom.a / 255) * (1 - ta);
        return {
            r: Math.round((b.r * (1 - ta) + result.r * ta) * 255),
            g: Math.round((b.g * (1 - ta) + result.g * ta) * 255),
            b: Math.round((b.b * (1 - ta) + result.b * ta) * 255),
            a: Math.round(outA * 255),
        };
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    gaussianBlur(data, width, height, radius) {
        const kernel = this.createGaussianKernel(radius);
        const temp = new Float32Array(data.length);
        const result = new Float32Array(data.length);
        // Horizontal pass
        this.convolve1D(data, temp, width, height, kernel, true);
        // Vertical pass
        this.convolve1D(temp, result, width, height, kernel, false);
        return result;
    }
    createGaussianKernel(radius) {
        const size = Math.ceil(radius * 2) + 1;
        const kernel = new Float32Array(size);
        const sigma = radius / 3;
        let sum = 0;
        for (let i = 0; i < size; i++) {
            const x = i - Math.floor(size / 2);
            kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
            sum += kernel[i];
        }
        // Normalizar
        for (let i = 0; i < size; i++) {
            kernel[i] /= sum;
        }
        return kernel;
    }
    convolve1D(input, output, width, height, kernel, horizontal) {
        const kHalf = Math.floor(kernel.length / 2);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let c = 0; c < 4; c++) {
                    let sum = 0;
                    for (let k = 0; k < kernel.length; k++) {
                        const offset = k - kHalf;
                        let px = x, py = y;
                        if (horizontal) {
                            px = Math.max(0, Math.min(width - 1, x + offset));
                        }
                        else {
                            py = Math.max(0, Math.min(height - 1, y + offset));
                        }
                        sum += input[(py * width + px) * 4 + c] * kernel[k];
                    }
                    output[(y * width + x) * 4 + c] = sum;
                }
            }
        }
    }
    convolve(input, output, width, height, kernel, kernelSize) {
        const kHalf = Math.floor(kernelSize / 2);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = 0; ky < kernelSize; ky++) {
                        for (let kx = 0; kx < kernelSize; kx++) {
                            const px = Math.max(0, Math.min(width - 1, x + kx - kHalf));
                            const py = Math.max(0, Math.min(height - 1, y + ky - kHalf));
                            sum += input[(py * width + px) * 4 + c] * kernel[ky * kernelSize + kx];
                        }
                    }
                    output[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(sum)));
                }
                output[(y * width + x) * 4 + 3] = input[(y * width + x) * 4 + 3];
            }
        }
    }
    sortQueue(queue, mode) {
        switch (mode) {
            case 'front-to-back':
                queue.commands.sort((a, b) => a.sortKey - b.sortKey);
                break;
            case 'back-to-front':
                queue.commands.sort((a, b) => b.sortKey - a.sortKey);
                break;
            case 'by-material':
                queue.commands.sort((a, b) => a.sortKey - b.sortKey);
                break;
            default:
                queue.commands.sort((a, b) => a.priority - b.priority);
        }
        queue.sorted = true;
    }
    computeSortKey(type, resourceId) {
        // Hash simples para agrupamento
        let hash = 0;
        for (let i = 0; i < resourceId.length; i++) {
            hash = ((hash << 5) - hash) + resourceId.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
    createDefaultState() {
        return {
            blendEnabled: true,
            blendMode: 'normal',
            depthTest: false,
            depthWrite: false,
            depthFunc: 'less',
            stencilTest: false,
            stencilFunc: 'always',
            stencilRef: 0,
            stencilMask: 0xFF,
            stencilFail: 'keep',
            stencilZFail: 'keep',
            stencilZPass: 'keep',
            cullFace: 'none',
            frontFace: 'ccw',
            scissorTest: false,
            colorMask: { r: true, g: true, b: true, a: true },
        };
    }
    generateId() {
        return `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    /**
     * Salva estado atual
     */
    pushState() {
        this.stateStack.push({ ...this.currentState });
    }
    /**
     * Restaura estado anterior
     */
    popState() {
        const state = this.stateStack.pop();
        if (state) {
            this.currentState = state;
        }
    }
    /**
     * Obtém render target
     */
    getRenderTarget(targetId) {
        return this.targets.get(targetId);
    }
    /**
     * Lista todos os targets
     */
    getAllTargets() {
        return Array.from(this.targets.values());
    }
};
exports.UnifiedRenderPipeline = UnifiedRenderPipeline;
exports.UnifiedRenderPipeline = UnifiedRenderPipeline = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], UnifiedRenderPipeline);

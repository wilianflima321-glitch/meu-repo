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
exports.EffectsLibrary = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// EFFECTS LIBRARY
// ============================================================================
let EffectsLibrary = class EffectsLibrary {
    constructor() {
        this.effects = new Map();
        this.instances = new Map();
        this.listeners = new Map();
        this.registerBuiltInEffects();
    }
    // ========================================================================
    // EFFECT REGISTRATION
    // ========================================================================
    /**
     * Registra efeito
     */
    register(effect) {
        this.effects.set(effect.id, effect);
        this.emit('effectRegistered', { effectId: effect.id });
    }
    /**
     * Remove efeito
     */
    unregister(effectId) {
        this.effects.delete(effectId);
        this.emit('effectUnregistered', { effectId });
    }
    /**
     * Obtém definição de efeito
     */
    getEffect(effectId) {
        return this.effects.get(effectId);
    }
    /**
     * Lista efeitos
     */
    listEffects(filter) {
        let effects = Array.from(this.effects.values());
        if (filter?.category) {
            effects = effects.filter(e => e.category === filter.category);
        }
        if (filter?.target) {
            effects = effects.filter(e => e.target.includes(filter.target));
        }
        if (filter?.tags && filter.tags.length > 0) {
            effects = effects.filter(e => filter.tags.some(tag => e.tags.includes(tag)));
        }
        if (filter?.search) {
            const search = filter.search.toLowerCase();
            effects = effects.filter(e => e.name.toLowerCase().includes(search) ||
                e.description.toLowerCase().includes(search) ||
                e.tags.some(t => t.toLowerCase().includes(search)));
        }
        return effects;
    }
    // ========================================================================
    // EFFECT INSTANCES
    // ========================================================================
    /**
     * Cria instância de efeito
     */
    createInstance(effectId, name, presetId) {
        const effect = this.effects.get(effectId);
        if (!effect) {
            throw new Error(`Effect not found: ${effectId}`);
        }
        // Obter valores iniciais
        let initialValues = {};
        if (presetId) {
            const preset = effect.presets.find(p => p.id === presetId);
            if (preset) {
                initialValues = { ...preset.values };
            }
        }
        // Construir parâmetros
        const parameters = {};
        for (const param of effect.parameters) {
            parameters[param.id] = {
                value: initialValues[param.id] ?? param.defaultValue,
                locked: false,
            };
        }
        const instance = {
            id: this.generateId(),
            effectId,
            name: name || effect.name,
            parameters,
            enabled: true,
            solo: false,
            blendMode: 'normal',
            opacity: 1,
            order: 0,
        };
        this.instances.set(instance.id, instance);
        this.emit('instanceCreated', { instanceId: instance.id, instance });
        return instance;
    }
    /**
     * Duplica instância
     */
    duplicateInstance(instanceId) {
        const original = this.instances.get(instanceId);
        if (!original) {
            throw new Error(`Instance not found: ${instanceId}`);
        }
        const duplicate = {
            ...JSON.parse(JSON.stringify(original)),
            id: this.generateId(),
            name: `${original.name} (copy)`,
        };
        this.instances.set(duplicate.id, duplicate);
        return duplicate;
    }
    /**
     * Remove instância
     */
    deleteInstance(instanceId) {
        this.instances.delete(instanceId);
        this.emit('instanceDeleted', { instanceId });
    }
    /**
     * Obtém instância
     */
    getInstance(instanceId) {
        return this.instances.get(instanceId);
    }
    // ========================================================================
    // PARAMETER MANAGEMENT
    // ========================================================================
    /**
     * Define valor de parâmetro
     */
    setParameter(instanceId, parameterId, value) {
        const instance = this.instances.get(instanceId);
        if (!instance)
            return;
        if (instance.parameters[parameterId]) {
            instance.parameters[parameterId].value = value;
            this.emit('parameterChanged', { instanceId, parameterId, value });
        }
    }
    /**
     * Adiciona keyframe
     */
    addKeyframe(instanceId, parameterId, time, value, easing = 'ease') {
        const instance = this.instances.get(instanceId);
        if (!instance || !instance.parameters[parameterId])
            return;
        const param = instance.parameters[parameterId];
        if (!param.keyframes) {
            param.keyframes = [];
        }
        // Remover keyframe existente no mesmo tempo
        param.keyframes = param.keyframes.filter(k => k.time !== time);
        // Adicionar novo
        param.keyframes.push({ time, value, easing });
        // Ordenar por tempo
        param.keyframes.sort((a, b) => a.time - b.time);
        this.emit('keyframeAdded', { instanceId, parameterId, time, value });
    }
    /**
     * Remove keyframe
     */
    removeKeyframe(instanceId, parameterId, time) {
        const instance = this.instances.get(instanceId);
        if (!instance?.parameters[parameterId]?.keyframes)
            return;
        instance.parameters[parameterId].keyframes =
            instance.parameters[parameterId].keyframes.filter(k => k.time !== time);
        this.emit('keyframeRemoved', { instanceId, parameterId, time });
    }
    /**
     * Define expressão
     */
    setExpression(instanceId, parameterId, expression) {
        const instance = this.instances.get(instanceId);
        if (!instance?.parameters[parameterId])
            return;
        instance.parameters[parameterId].expression = expression;
        this.emit('expressionChanged', { instanceId, parameterId, expression });
    }
    /**
     * Avalia valor no tempo
     */
    evaluateParameter(instance, parameterId, time, context) {
        const param = instance.parameters[parameterId];
        if (!param)
            return undefined;
        // Expressão tem prioridade
        if (param.expression) {
            return this.evaluateExpression(param.expression, time, context);
        }
        // Keyframes
        if (param.keyframes && param.keyframes.length > 0) {
            return this.interpolateKeyframes(param.keyframes, time);
        }
        // Valor estático
        return param.value;
    }
    evaluateExpression(expression, time, context) {
        // Contexto de expressão
        const exprContext = {
            time,
            ...context,
            Math,
            sin: Math.sin,
            cos: Math.cos,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            round: Math.round,
            min: Math.min,
            max: Math.max,
            clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
            lerp: (a, b, t) => a + (b - a) * t,
            random: () => Math.random(),
            noise: (t) => (Math.sin(t * 12.9898) * 43758.5453) % 1,
        };
        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function(...Object.keys(exprContext), `return ${expression}`);
            return fn(...Object.values(exprContext));
        }
        catch {
            return 0;
        }
    }
    interpolateKeyframes(keyframes, time) {
        if (keyframes.length === 0)
            return 0;
        if (keyframes.length === 1)
            return keyframes[0].value;
        // Encontrar keyframes vizinhos
        let prev = keyframes[0];
        let next = keyframes[keyframes.length - 1];
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (keyframes[i].time <= time && keyframes[i + 1].time >= time) {
                prev = keyframes[i];
                next = keyframes[i + 1];
                break;
            }
        }
        if (time <= prev.time)
            return prev.value;
        if (time >= next.time)
            return next.value;
        // Calcular t
        const t = (time - prev.time) / (next.time - prev.time);
        const easedT = this.applyEasing(t, next.easing, next.handles);
        // Interpolar
        return this.interpolateValues(prev.value, next.value, easedT);
    }
    applyEasing(t, easing, handles) {
        switch (easing) {
            case 'linear':
                return t;
            case 'ease':
                return t * t * (3 - 2 * t);
            case 'ease-in':
                return t * t;
            case 'ease-out':
                return t * (2 - t);
            case 'ease-in-out':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'cubic-bezier':
                if (handles) {
                    return this.cubicBezier(t, handles.out.x, handles.out.y, handles.in.x, handles.in.y);
                }
                return t;
            case 'step':
                return t < 1 ? 0 : 1;
            default:
                return t;
        }
    }
    cubicBezier(t, x1, y1, x2, y2) {
        // Aproximação simples de cubic bezier
        const cx = 3 * x1;
        const bx = 3 * (x2 - x1) - cx;
        const ax = 1 - cx - bx;
        const cy = 3 * y1;
        const by = 3 * (y2 - y1) - cy;
        const ay = 1 - cy - by;
        const sampleCurveY = (t) => ((ay * t + by) * t + cy) * t;
        return sampleCurveY(t);
    }
    interpolateValues(a, b, t) {
        // Números
        if (typeof a === 'number' && typeof b === 'number') {
            return a + (b - a) * t;
        }
        // Arrays (vetores/cores)
        if (Array.isArray(a) && Array.isArray(b)) {
            return a.map((av, i) => typeof av === 'number' && typeof b[i] === 'number'
                ? av + (b[i] - av) * t
                : av);
        }
        // Objetos com x, y, z
        if (typeof a === 'object' && typeof b === 'object' && a && b) {
            const result = {};
            for (const key of Object.keys(a)) {
                const av = a[key];
                const bv = b[key];
                if (typeof av === 'number' && typeof bv === 'number') {
                    result[key] = av + (bv - av) * t;
                }
                else {
                    result[key] = av;
                }
            }
            return result;
        }
        return t < 0.5 ? a : b;
    }
    // ========================================================================
    // EFFECT PROCESSING
    // ========================================================================
    /**
     * Processa efeito
     */
    async process(instanceId, input, context) {
        const instance = this.instances.get(instanceId);
        if (!instance || !instance.enabled) {
            return { pixels: input.pixels };
        }
        const effect = this.effects.get(instance.effectId);
        if (!effect) {
            return { pixels: input.pixels };
        }
        // Avaliar parâmetros
        const params = {};
        for (const [id, param] of Object.entries(instance.parameters)) {
            params[id] = this.evaluateParameter(instance, id, context.time);
        }
        // Aplicar timing fade
        let effectStrength = instance.opacity;
        if (instance.timing) {
            effectStrength *= this.calculateTimingFade(context.time, instance.timing);
        }
        // Processar
        try {
            const output = await effect.process(input, params, context);
            // Aplicar blend mode e opacidade
            if (output.pixels && input.pixels && effectStrength < 1) {
                output.pixels = this.blendPixels(input.pixels, output.pixels, instance.blendMode, effectStrength);
            }
            return output;
        }
        catch (error) {
            console.error(`Effect processing error: ${error}`);
            return { pixels: input.pixels };
        }
    }
    /**
     * Processa cadeia de efeitos
     */
    async processChain(instanceIds, input, context) {
        let currentInput = input;
        for (const instanceId of instanceIds) {
            const output = await this.process(instanceId, currentInput, context);
            currentInput = { ...input, ...output };
        }
        return currentInput;
    }
    calculateTimingFade(time, timing) {
        const { startTime, duration, fadeIn, fadeOut } = timing;
        const endTime = startTime + duration;
        if (time < startTime || time > endTime)
            return 0;
        let fade = 1;
        // Fade in
        if (fadeIn > 0 && time < startTime + fadeIn) {
            fade *= (time - startTime) / fadeIn;
        }
        // Fade out
        if (fadeOut > 0 && time > endTime - fadeOut) {
            fade *= (endTime - time) / fadeOut;
        }
        return fade;
    }
    blendPixels(bottom, top, mode, opacity) {
        const result = new ImageData(bottom.width, bottom.height);
        const bottomData = bottom.data;
        const topData = top.data;
        const resultData = result.data;
        for (let i = 0; i < bottomData.length; i += 4) {
            const br = bottomData[i] / 255;
            const bg = bottomData[i + 1] / 255;
            const bb = bottomData[i + 2] / 255;
            const ba = bottomData[i + 3] / 255;
            const tr = topData[i] / 255;
            const tg = topData[i + 1] / 255;
            const tb = topData[i + 2] / 255;
            const ta = (topData[i + 3] / 255) * opacity;
            let [r, g, b] = this.blendColor([br, bg, bb], [tr, tg, tb], mode);
            // Alpha compositing
            const a = ta + ba * (1 - ta);
            if (a > 0) {
                r = (r * ta + br * ba * (1 - ta)) / a;
                g = (g * ta + bg * ba * (1 - ta)) / a;
                b = (b * ta + bb * ba * (1 - ta)) / a;
            }
            resultData[i] = Math.round(r * 255);
            resultData[i + 1] = Math.round(g * 255);
            resultData[i + 2] = Math.round(b * 255);
            resultData[i + 3] = Math.round(a * 255);
        }
        return result;
    }
    blendColor(b, t, mode) {
        const blend = (bf, tf) => {
            switch (mode) {
                case 'normal': return tf;
                case 'multiply': return bf * tf;
                case 'screen': return 1 - (1 - bf) * (1 - tf);
                case 'overlay': return bf < 0.5 ? 2 * bf * tf : 1 - 2 * (1 - bf) * (1 - tf);
                case 'darken': return Math.min(bf, tf);
                case 'lighten': return Math.max(bf, tf);
                case 'color-dodge': return tf < 1 ? Math.min(1, bf / (1 - tf)) : 1;
                case 'color-burn': return tf > 0 ? 1 - Math.min(1, (1 - bf) / tf) : 0;
                case 'hard-light': return tf < 0.5 ? 2 * bf * tf : 1 - 2 * (1 - bf) * (1 - tf);
                case 'soft-light': return tf < 0.5
                    ? bf - (1 - 2 * tf) * bf * (1 - bf)
                    : bf + (2 * tf - 1) * (bf < 0.25 ? ((16 * bf - 12) * bf + 4) * bf : Math.sqrt(bf) - bf);
                case 'difference': return Math.abs(bf - tf);
                case 'exclusion': return bf + tf - 2 * bf * tf;
                default: return tf;
            }
        };
        return [blend(b[0], t[0]), blend(b[1], t[1]), blend(b[2], t[2])];
    }
    // ========================================================================
    // GPU CONTEXT
    // ========================================================================
    /**
     * Inicializa contexto GPU
     */
    initGPU(canvas) {
        const c = canvas || document.createElement('canvas');
        const gl = c.getContext('webgl2');
        if (gl) {
            this.gpuContext = {
                gl,
                canvas: c,
                shaderCache: new Map(),
            };
        }
    }
    /**
     * Obtém contexto GPU
     */
    getGPUContext() {
        return this.gpuContext;
    }
    // ========================================================================
    // BUILT-IN EFFECTS
    // ========================================================================
    registerBuiltInEffects() {
        // ====== COLOR EFFECTS ======
        this.register({
            id: 'brightness-contrast',
            name: 'Brightness/Contrast',
            description: 'Adjust brightness and contrast',
            category: 'color',
            target: ['image', 'video'],
            version: '1.0.0',
            parameters: [
                { id: 'brightness', name: 'Brightness', type: 'number', defaultValue: 0, min: -100, max: 100, animatable: true, supportsExpressions: true },
                { id: 'contrast', name: 'Contrast', type: 'number', defaultValue: 0, min: -100, max: 100, animatable: true, supportsExpressions: true },
            ],
            presets: [
                { id: 'high-contrast', name: 'High Contrast', values: { brightness: 10, contrast: 30 } },
                { id: 'low-key', name: 'Low Key', values: { brightness: -20, contrast: 20 } },
            ],
            tags: ['color', 'basic', 'correction'],
            gpuAccelerated: true,
            realTime: true,
            process: async (input, params) => {
                if (!input.pixels)
                    return {};
                const { brightness, contrast } = params;
                const data = input.pixels.data;
                const result = new Uint8ClampedArray(data.length);
                const b = brightness / 100;
                const c = (contrast + 100) / 100;
                const factor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
                for (let i = 0; i < data.length; i += 4) {
                    result[i] = Math.max(0, Math.min(255, factor * (data[i] + b * 255 - 128) + 128));
                    result[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] + b * 255 - 128) + 128));
                    result[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] + b * 255 - 128) + 128));
                    result[i + 3] = data[i + 3];
                }
                return { pixels: new ImageData(result, input.width, input.height) };
            },
        });
        this.register({
            id: 'hue-saturation',
            name: 'Hue/Saturation',
            description: 'Adjust hue, saturation, and lightness',
            category: 'color',
            target: ['image', 'video'],
            version: '1.0.0',
            parameters: [
                { id: 'hue', name: 'Hue', type: 'angle', defaultValue: 0, min: -180, max: 180, animatable: true, supportsExpressions: true },
                { id: 'saturation', name: 'Saturation', type: 'number', defaultValue: 0, min: -100, max: 100, animatable: true, supportsExpressions: true },
                { id: 'lightness', name: 'Lightness', type: 'number', defaultValue: 0, min: -100, max: 100, animatable: true, supportsExpressions: true },
            ],
            presets: [
                { id: 'vibrant', name: 'Vibrant', values: { hue: 0, saturation: 30, lightness: 5 } },
                { id: 'desaturated', name: 'Desaturated', values: { hue: 0, saturation: -50, lightness: 0 } },
                { id: 'warm', name: 'Warm', values: { hue: 10, saturation: 10, lightness: 0 } },
                { id: 'cool', name: 'Cool', values: { hue: -10, saturation: 10, lightness: 0 } },
            ],
            tags: ['color', 'hsl', 'correction'],
            gpuAccelerated: true,
            realTime: true,
            process: async (input, params) => {
                if (!input.pixels)
                    return {};
                const { hue, saturation, lightness } = params;
                const data = input.pixels.data;
                const result = new Uint8ClampedArray(data.length);
                const hueShift = hue / 360;
                const satMult = 1 + saturation / 100;
                const lightAdd = lightness / 100;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i] / 255;
                    const g = data[i + 1] / 255;
                    const b = data[i + 2] / 255;
                    // RGB to HSL
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    let h = 0, s = 0;
                    const l = (max + min) / 2;
                    if (max !== min) {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                            case r:
                                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                                break;
                            case g:
                                h = ((b - r) / d + 2) / 6;
                                break;
                            case b:
                                h = ((r - g) / d + 4) / 6;
                                break;
                        }
                    }
                    // Apply adjustments
                    h = (h + hueShift + 1) % 1;
                    s = Math.max(0, Math.min(1, s * satMult));
                    const newL = Math.max(0, Math.min(1, l + lightAdd));
                    // HSL to RGB
                    let newR, newG, newB;
                    if (s === 0) {
                        newR = newG = newB = newL;
                    }
                    else {
                        const hue2rgb = (p, q, t) => {
                            if (t < 0)
                                t += 1;
                            if (t > 1)
                                t -= 1;
                            if (t < 1 / 6)
                                return p + (q - p) * 6 * t;
                            if (t < 1 / 2)
                                return q;
                            if (t < 2 / 3)
                                return p + (q - p) * (2 / 3 - t) * 6;
                            return p;
                        };
                        const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
                        const p = 2 * newL - q;
                        newR = hue2rgb(p, q, h + 1 / 3);
                        newG = hue2rgb(p, q, h);
                        newB = hue2rgb(p, q, h - 1 / 3);
                    }
                    result[i] = Math.round(newR * 255);
                    result[i + 1] = Math.round(newG * 255);
                    result[i + 2] = Math.round(newB * 255);
                    result[i + 3] = data[i + 3];
                }
                return { pixels: new ImageData(result, input.width, input.height) };
            },
        });
        // ====== BLUR EFFECTS ======
        this.register({
            id: 'gaussian-blur',
            name: 'Gaussian Blur',
            description: 'Apply gaussian blur',
            category: 'blur',
            target: ['image', 'video'],
            version: '1.0.0',
            parameters: [
                { id: 'radius', name: 'Radius', type: 'number', defaultValue: 10, min: 0, max: 100, animatable: true, supportsExpressions: true },
            ],
            presets: [
                { id: 'subtle', name: 'Subtle', values: { radius: 3 } },
                { id: 'medium', name: 'Medium', values: { radius: 10 } },
                { id: 'heavy', name: 'Heavy', values: { radius: 30 } },
            ],
            tags: ['blur', 'smooth', 'basic'],
            gpuAccelerated: true,
            realTime: true,
            process: async (input, params, context) => {
                if (!input.pixels)
                    return {};
                const radius = Math.round(params.radius);
                if (radius <= 0)
                    return { pixels: input.pixels };
                // Box blur approximation (3 passes)
                let data = new Uint8ClampedArray(input.pixels.data);
                const w = input.width;
                const h = input.height;
                const boxBlur = (src, radius) => {
                    const dst = new Uint8ClampedArray(src.length);
                    // Horizontal pass
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            let r = 0, g = 0, b = 0, a = 0, count = 0;
                            for (let dx = -radius; dx <= radius; dx++) {
                                const nx = Math.max(0, Math.min(w - 1, x + dx));
                                const idx = (y * w + nx) * 4;
                                r += src[idx];
                                g += src[idx + 1];
                                b += src[idx + 2];
                                a += src[idx + 3];
                                count++;
                            }
                            const idx = (y * w + x) * 4;
                            dst[idx] = r / count;
                            dst[idx + 1] = g / count;
                            dst[idx + 2] = b / count;
                            dst[idx + 3] = a / count;
                        }
                    }
                    // Vertical pass
                    const dst2 = new Uint8ClampedArray(src.length);
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            let r = 0, g = 0, b = 0, a = 0, count = 0;
                            for (let dy = -radius; dy <= radius; dy++) {
                                const ny = Math.max(0, Math.min(h - 1, y + dy));
                                const idx = (ny * w + x) * 4;
                                r += dst[idx];
                                g += dst[idx + 1];
                                b += dst[idx + 2];
                                a += dst[idx + 3];
                                count++;
                            }
                            const idx = (y * w + x) * 4;
                            dst2[idx] = r / count;
                            dst2[idx + 1] = g / count;
                            dst2[idx + 2] = b / count;
                            dst2[idx + 3] = a / count;
                        }
                    }
                    return dst2;
                };
                // 3 passes for gaussian approximation
                const r1 = Math.round(radius * 0.8);
                data = boxBlur(data, Math.ceil(r1 / 3));
                data = boxBlur(data, Math.ceil(r1 / 3));
                data = boxBlur(data, Math.ceil(r1 / 3));
                // Create new ImageData - copy to standard ArrayBuffer first
                const resultBuffer = new ArrayBuffer(data.length);
                const resultView = new Uint8ClampedArray(resultBuffer);
                resultView.set(data);
                return { pixels: new ImageData(resultView, w, h) };
            },
        });
        // ====== DISTORTION EFFECTS ======
        this.register({
            id: 'wave',
            name: 'Wave Distortion',
            description: 'Apply wave distortion',
            category: 'distortion',
            target: ['image', 'video'],
            version: '1.0.0',
            parameters: [
                { id: 'amplitude', name: 'Amplitude', type: 'number', defaultValue: 20, min: 0, max: 100, animatable: true, supportsExpressions: true },
                { id: 'frequency', name: 'Frequency', type: 'number', defaultValue: 5, min: 0.1, max: 20, animatable: true, supportsExpressions: true },
                { id: 'phase', name: 'Phase', type: 'angle', defaultValue: 0, min: 0, max: 360, animatable: true, supportsExpressions: true },
                { id: 'direction', name: 'Direction', type: 'enum', defaultValue: 'horizontal', options: [
                        { value: 'horizontal', label: 'Horizontal' },
                        { value: 'vertical', label: 'Vertical' },
                        { value: 'both', label: 'Both' },
                    ], animatable: false, supportsExpressions: false },
            ],
            presets: [
                { id: 'gentle', name: 'Gentle Wave', values: { amplitude: 10, frequency: 3, phase: 0 } },
                { id: 'intense', name: 'Intense Wave', values: { amplitude: 30, frequency: 8, phase: 0 } },
            ],
            tags: ['distortion', 'wave', 'creative'],
            gpuAccelerated: true,
            realTime: true,
            process: async (input, params, context) => {
                if (!input.pixels)
                    return {};
                const { amplitude, frequency, phase, direction } = params;
                const src = input.pixels;
                const w = src.width;
                const h = src.height;
                const result = new Uint8ClampedArray(src.data.length);
                const phaseRad = (phase + context.time * 100) * Math.PI / 180;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let sx = x;
                        let sy = y;
                        if (direction === 'horizontal' || direction === 'both') {
                            sx = x + amplitude * Math.sin(2 * Math.PI * y * frequency / h + phaseRad);
                        }
                        if (direction === 'vertical' || direction === 'both') {
                            sy = y + amplitude * Math.sin(2 * Math.PI * x * frequency / w + phaseRad);
                        }
                        sx = Math.max(0, Math.min(w - 1, Math.round(sx)));
                        sy = Math.max(0, Math.min(h - 1, Math.round(sy)));
                        const srcIdx = (sy * w + sx) * 4;
                        const dstIdx = (y * w + x) * 4;
                        result[dstIdx] = src.data[srcIdx];
                        result[dstIdx + 1] = src.data[srcIdx + 1];
                        result[dstIdx + 2] = src.data[srcIdx + 2];
                        result[dstIdx + 3] = src.data[srcIdx + 3];
                    }
                }
                return { pixels: new ImageData(result, w, h) };
            },
        });
        // ====== STYLIZE EFFECTS ======
        this.register({
            id: 'vignette',
            name: 'Vignette',
            description: 'Add vignette effect',
            category: 'stylize',
            target: ['image', 'video'],
            version: '1.0.0',
            parameters: [
                { id: 'amount', name: 'Amount', type: 'number', defaultValue: 50, min: 0, max: 100, animatable: true, supportsExpressions: true },
                { id: 'roundness', name: 'Roundness', type: 'number', defaultValue: 50, min: 0, max: 100, animatable: true, supportsExpressions: true },
                { id: 'feather', name: 'Feather', type: 'number', defaultValue: 50, min: 0, max: 100, animatable: true, supportsExpressions: true },
                { id: 'color', name: 'Color', type: 'color', defaultValue: [0, 0, 0], animatable: true, supportsExpressions: false },
            ],
            presets: [
                { id: 'subtle', name: 'Subtle', values: { amount: 30, roundness: 50, feather: 70 } },
                { id: 'dramatic', name: 'Dramatic', values: { amount: 80, roundness: 30, feather: 40 } },
            ],
            tags: ['stylize', 'vignette', 'cinematic'],
            gpuAccelerated: true,
            realTime: true,
            process: async (input, params) => {
                if (!input.pixels)
                    return {};
                const { amount, roundness, feather, color } = params;
                const src = input.pixels;
                const w = src.width;
                const h = src.height;
                const result = new Uint8ClampedArray(src.data.length);
                const cx = w / 2;
                const cy = h / 2;
                const maxDist = Math.sqrt(cx * cx + cy * cy);
                const innerRadius = (1 - amount / 100) * maxDist;
                const outerRadius = maxDist;
                const featherDist = (feather / 100) * maxDist * 0.5;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const dx = x - cx;
                        const dy = y - cy;
                        // Ajustar por roundness
                        const r = roundness / 100;
                        const dist = Math.sqrt(dx * dx / (r + 0.5) + dy * dy / (r + 0.5));
                        // Calcular fator de vinheta
                        let factor = 0;
                        if (dist > innerRadius) {
                            factor = Math.min(1, (dist - innerRadius) / featherDist);
                        }
                        factor = factor * (amount / 100);
                        const idx = (y * w + x) * 4;
                        result[idx] = Math.round(src.data[idx] * (1 - factor) + color[0] * factor);
                        result[idx + 1] = Math.round(src.data[idx + 1] * (1 - factor) + color[1] * factor);
                        result[idx + 2] = Math.round(src.data[idx + 2] * (1 - factor) + color[2] * factor);
                        result[idx + 3] = src.data[idx + 3];
                    }
                }
                return { pixels: new ImageData(result, w, h) };
            },
        });
        // ====== TRANSITION EFFECTS ======
        this.register({
            id: 'cross-dissolve',
            name: 'Cross Dissolve',
            description: 'Smooth cross dissolve transition',
            category: 'transition',
            target: ['video'],
            version: '1.0.0',
            parameters: [
                { id: 'progress', name: 'Progress', type: 'number', defaultValue: 0, min: 0, max: 1, animatable: true, supportsExpressions: true },
            ],
            presets: [],
            tags: ['transition', 'dissolve', 'basic'],
            gpuAccelerated: true,
            realTime: true,
            process: async (input, params) => {
                if (!input.pixels || !input.layers || input.layers.length < 1) {
                    return { pixels: input.pixels };
                }
                const progress = params.progress;
                const from = input.pixels;
                const to = input.layers[0].pixels;
                const w = from.width;
                const h = from.height;
                const result = new Uint8ClampedArray(from.data.length);
                for (let i = 0; i < from.data.length; i += 4) {
                    result[i] = Math.round(from.data[i] * (1 - progress) + to.data[i] * progress);
                    result[i + 1] = Math.round(from.data[i + 1] * (1 - progress) + to.data[i + 1] * progress);
                    result[i + 2] = Math.round(from.data[i + 2] * (1 - progress) + to.data[i + 2] * progress);
                    result[i + 3] = Math.round(from.data[i + 3] * (1 - progress) + to.data[i + 3] * progress);
                }
                return { pixels: new ImageData(result, w, h) };
            },
        });
        this.register({
            id: 'wipe',
            name: 'Wipe',
            description: 'Wipe transition',
            category: 'transition',
            target: ['video'],
            version: '1.0.0',
            parameters: [
                { id: 'progress', name: 'Progress', type: 'number', defaultValue: 0, min: 0, max: 1, animatable: true, supportsExpressions: true },
                { id: 'direction', name: 'Direction', type: 'enum', defaultValue: 'left', options: [
                        { value: 'left', label: 'Left to Right' },
                        { value: 'right', label: 'Right to Left' },
                        { value: 'up', label: 'Bottom to Top' },
                        { value: 'down', label: 'Top to Bottom' },
                    ], animatable: false, supportsExpressions: false },
                { id: 'feather', name: 'Feather', type: 'number', defaultValue: 20, min: 0, max: 100, animatable: true, supportsExpressions: true },
            ],
            presets: [],
            tags: ['transition', 'wipe'],
            gpuAccelerated: true,
            realTime: true,
            process: async (input, params) => {
                if (!input.pixels || !input.layers || input.layers.length < 1) {
                    return { pixels: input.pixels };
                }
                const { progress, direction, feather } = params;
                const from = input.pixels;
                const to = input.layers[0].pixels;
                const w = from.width;
                const h = from.height;
                const result = new Uint8ClampedArray(from.data.length);
                const featherPx = (feather / 100) * Math.max(w, h) * 0.1;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let edge;
                        switch (direction) {
                            case 'left':
                                edge = x / w;
                                break;
                            case 'right':
                                edge = 1 - x / w;
                                break;
                            case 'up':
                                edge = 1 - y / h;
                                break;
                            case 'down':
                                edge = y / h;
                                break;
                            default: edge = x / w;
                        }
                        // Calculate blend factor with feather
                        let blend = 0;
                        if (progress > edge) {
                            blend = Math.min(1, (progress - edge) * w / featherPx);
                        }
                        const idx = (y * w + x) * 4;
                        result[idx] = Math.round(from.data[idx] * (1 - blend) + to.data[idx] * blend);
                        result[idx + 1] = Math.round(from.data[idx + 1] * (1 - blend) + to.data[idx + 1] * blend);
                        result[idx + 2] = Math.round(from.data[idx + 2] * (1 - blend) + to.data[idx + 2] * blend);
                        result[idx + 3] = Math.round(from.data[idx + 3] * (1 - blend) + to.data[idx + 3] * blend);
                    }
                }
                return { pixels: new ImageData(result, w, h) };
            },
        });
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    generateId() {
        return `fx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
};
exports.EffectsLibrary = EffectsLibrary;
exports.EffectsLibrary = EffectsLibrary = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], EffectsLibrary);

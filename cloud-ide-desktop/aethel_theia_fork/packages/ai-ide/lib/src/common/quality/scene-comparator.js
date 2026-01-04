"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneComparator = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// SCENE COMPARATOR - Implementação
// ============================================================================
let SceneComparator = class SceneComparator {
    constructor() {
        this.defaultConfig = {
            mode: 'sequential',
            aspects: ['visual', 'motion', 'narrative', 'style'],
            thresholds: {
                colorDifference: 0.1,
                positionDelta: 50,
                scaleDelta: 0.1,
                rotationDelta: 5,
                brightnessVariance: 0.15,
                contrastVariance: 0.15,
                motionSmoothness: 0.8,
                audioLevelVariance: 6,
                timingTolerance: 100,
            },
            ignoreMinorDifferences: true,
            generateVisualDiff: false,
            autoDetectIssues: true,
        };
    }
    /**
     * Compara uma sequência de elementos
     */
    async compareSequence(elements, config = {}) {
        const fullConfig = { ...this.defaultConfig, ...config };
        const reportId = this.generateId();
        const startTime = Date.now();
        // Ordenar elementos por índice
        const sorted = [...elements].sort((a, b) => a.index - b.index);
        // Executar comparações baseado no modo
        const comparisons = await this.executeComparisons(sorted, fullConfig);
        // Coletar todos os problemas
        const allIssues = comparisons.flatMap(c => c.issues);
        // Criar timeline de problemas
        const issueTimeline = this.createIssueTimeline(sorted, comparisons);
        // Calcular métricas
        const metrics = this.calculateSequenceMetrics(comparisons);
        // Gerar sumário
        const summary = this.generateSummary(comparisons, allIssues, metrics);
        // Gerar recomendações
        const recommendations = this.generateRecommendations(allIssues, metrics);
        return {
            id: reportId,
            timestamp: startTime,
            elementCount: elements.length,
            config: fullConfig,
            comparisons,
            summary,
            allIssues,
            issueTimeline,
            metrics,
            recommendations,
        };
    }
    /**
     * Compara dois elementos específicos
     */
    async comparePair(elementA, elementB, config = {}) {
        const fullConfig = { ...this.defaultConfig, ...config };
        const scores = {};
        const differences = [];
        const issues = [];
        // Comparar cada aspecto solicitado
        for (const aspect of fullConfig.aspects) {
            const aspectResult = await this.compareAspect(elementA, elementB, aspect, fullConfig.thresholds);
            scores[aspect] = aspectResult.score;
            differences.push(...aspectResult.differences);
            if (fullConfig.autoDetectIssues) {
                issues.push(...aspectResult.issues);
            }
        }
        // Calcular similaridade geral
        const aspectValues = Object.values(scores).filter(v => v !== undefined);
        const overallSimilarity = aspectValues.length > 0
            ? aspectValues.reduce((a, b) => a + b, 0) / aspectValues.length
            : 1;
        // Calcular score de continuidade
        const continuityScore = this.calculateContinuityScore(elementA, elementB, differences);
        // Gerar visual diff se solicitado
        let visualDiff;
        if (fullConfig.generateVisualDiff && elementA.visual && elementB.visual) {
            visualDiff = await this.generateVisualDiff(elementA, elementB, differences);
        }
        return {
            elementA: elementA.id,
            elementB: elementB.id,
            indexA: elementA.index,
            indexB: elementB.index,
            scores,
            overallSimilarity,
            differences,
            issues,
            continuityScore,
            visualDiff,
        };
    }
    /**
     * Verifica continuidade de uma sequência
     */
    async checkContinuity(elements, aspects = ['visual', 'motion', 'narrative']) {
        const report = await this.compareSequence(elements, {
            mode: 'sequential',
            aspects,
            autoDetectIssues: true,
        });
        const breaks = report.allIssues
            .filter(i => i.type === 'continuity-break' || i.type === 'jump-cut')
            .map(i => ({
            index: parseInt(i.affectedElements[0]?.split('_')[1] || '0'),
            severity: i.severity,
            description: i.description,
        }));
        return {
            continuous: breaks.filter(b => b.severity === 'error' || b.severity === 'critical').length === 0,
            breaks,
            score: report.metrics.continuityScore,
        };
    }
    /**
     * Encontra keyframes significativos em uma sequência
     */
    findKeyframes(elements, threshold = 0.3) {
        const keyframes = [0]; // Primeiro elemento sempre é keyframe
        for (let i = 1; i < elements.length; i++) {
            const similarity = this.quickCompare(elements[i - 1], elements[i]);
            if (similarity < (1 - threshold)) {
                keyframes.push(i);
            }
        }
        // Último elemento também é keyframe se não foi incluído
        if (!keyframes.includes(elements.length - 1)) {
            keyframes.push(elements.length - 1);
        }
        return keyframes;
    }
    // ========================================================================
    // MÉTODOS PRIVADOS - COMPARAÇÕES
    // ========================================================================
    async executeComparisons(elements, config) {
        const comparisons = [];
        switch (config.mode) {
            case 'sequential':
                for (let i = 0; i < elements.length - 1; i++) {
                    const comparison = await this.comparePair(elements[i], elements[i + 1], config);
                    comparisons.push(comparison);
                }
                break;
            case 'reference':
                if (config.referenceElement) {
                    const reference = elements.find(e => e.id === config.referenceElement);
                    if (reference) {
                        for (const element of elements) {
                            if (element.id !== reference.id) {
                                const comparison = await this.comparePair(reference, element, config);
                                comparisons.push(comparison);
                            }
                        }
                    }
                }
                break;
            case 'pairwise':
                for (let i = 0; i < elements.length; i++) {
                    for (let j = i + 1; j < elements.length; j++) {
                        const comparison = await this.comparePair(elements[i], elements[j], config);
                        comparisons.push(comparison);
                    }
                }
                break;
            case 'keyframe':
                const keyframes = config.keyframeIndices || this.findKeyframes(elements);
                for (let i = 0; i < keyframes.length - 1; i++) {
                    const comparison = await this.comparePair(elements[keyframes[i]], elements[keyframes[i + 1]], config);
                    comparisons.push(comparison);
                }
                break;
        }
        return comparisons;
    }
    async compareAspect(elementA, elementB, aspect, thresholds) {
        switch (aspect) {
            case 'visual':
                return this.compareVisual(elementA, elementB, thresholds);
            case 'motion':
                return this.compareMotion(elementA, elementB, thresholds);
            case 'audio':
                return this.compareAudio(elementA, elementB, thresholds);
            case 'narrative':
                return this.compareNarrative(elementA, elementB);
            case 'technical':
                return this.compareTechnical(elementA, elementB);
            case 'style':
                return this.compareStyle(elementA, elementB, thresholds);
            case 'timing':
                return this.compareTiming(elementA, elementB, thresholds);
            case 'spatial':
                return this.compareSpatial(elementA, elementB, thresholds);
            default:
                return { score: 1, differences: [], issues: [] };
        }
    }
    compareVisual(a, b, thresholds) {
        const differences = [];
        const issues = [];
        let scoreSum = 0;
        let scoreCount = 0;
        if (!a.visual || !b.visual) {
            return { score: 1, differences: [], issues: [] };
        }
        // Comparar brilho
        const brightnessDelta = Math.abs(a.visual.brightness - b.visual.brightness);
        if (brightnessDelta > 0) {
            differences.push({
                aspect: 'visual',
                property: 'brightness',
                valueA: a.visual.brightness,
                valueB: b.visual.brightness,
                delta: brightnessDelta,
                significant: brightnessDelta > thresholds.brightnessVariance,
                description: `Diferença de brilho: ${(brightnessDelta * 100).toFixed(1)}%`,
            });
            if (brightnessDelta > thresholds.brightnessVariance) {
                issues.push({
                    id: this.generateId(),
                    type: 'flicker',
                    severity: brightnessDelta > thresholds.brightnessVariance * 2 ? 'error' : 'warning',
                    aspect: 'visual',
                    description: `Mudança brusca de brilho entre elementos ${a.index} e ${b.index}`,
                    affectedElements: [a.id, b.id],
                    suggestion: 'Aplicar correção de exposição ou transição suave',
                    autoFixable: true,
                });
            }
            scoreSum += 1 - Math.min(brightnessDelta / thresholds.brightnessVariance, 1);
            scoreCount++;
        }
        // Comparar contraste
        const contrastDelta = Math.abs(a.visual.contrast - b.visual.contrast);
        if (contrastDelta > 0) {
            differences.push({
                aspect: 'visual',
                property: 'contrast',
                valueA: a.visual.contrast,
                valueB: b.visual.contrast,
                delta: contrastDelta,
                significant: contrastDelta > thresholds.contrastVariance,
                description: `Diferença de contraste: ${(contrastDelta * 100).toFixed(1)}%`,
            });
            scoreSum += 1 - Math.min(contrastDelta / thresholds.contrastVariance, 1);
            scoreCount++;
        }
        // Comparar cores dominantes
        if (a.visual.dominantColors && b.visual.dominantColors) {
            const colorSimilarity = this.compareColors(a.visual.dominantColors, b.visual.dominantColors);
            if (colorSimilarity < 1) {
                differences.push({
                    aspect: 'visual',
                    property: 'dominantColors',
                    valueA: a.visual.dominantColors,
                    valueB: b.visual.dominantColors,
                    delta: 1 - colorSimilarity,
                    significant: (1 - colorSimilarity) > thresholds.colorDifference,
                    description: `Diferença de cores: ${((1 - colorSimilarity) * 100).toFixed(1)}%`,
                });
                if ((1 - colorSimilarity) > thresholds.colorDifference) {
                    issues.push({
                        id: this.generateId(),
                        type: 'color-shift',
                        severity: (1 - colorSimilarity) > thresholds.colorDifference * 2 ? 'error' : 'warning',
                        aspect: 'visual',
                        description: `Mudança significativa de cor entre elementos ${a.index} e ${b.index}`,
                        affectedElements: [a.id, b.id],
                        suggestion: 'Verificar color grading e consistência de iluminação',
                        autoFixable: true,
                    });
                }
                scoreSum += colorSimilarity;
                scoreCount++;
            }
        }
        // Comparar resolução
        if (a.visual.width !== b.visual.width || a.visual.height !== b.visual.height) {
            differences.push({
                aspect: 'visual',
                property: 'resolution',
                valueA: `${a.visual.width}x${a.visual.height}`,
                valueB: `${b.visual.width}x${b.visual.height}`,
                delta: 1,
                significant: true,
                description: 'Resolução diferente',
            });
            issues.push({
                id: this.generateId(),
                type: 'resolution-mismatch',
                severity: 'error',
                aspect: 'visual',
                description: `Resolução diferente: ${a.visual.width}x${a.visual.height} vs ${b.visual.width}x${b.visual.height}`,
                affectedElements: [a.id, b.id],
                suggestion: 'Normalizar resolução para consistência',
                autoFixable: true,
            });
            scoreSum += 0;
            scoreCount++;
        }
        const score = scoreCount > 0 ? scoreSum / scoreCount : 1;
        return { score, differences, issues };
    }
    compareMotion(a, b, thresholds) {
        const differences = [];
        const issues = [];
        if (!a.motion || !b.motion) {
            return { score: 1, differences: [], issues: [] };
        }
        // Calcular suavidade do movimento
        const velocityDelta = this.vectorDistance(a.motion.velocity, b.motion.velocity);
        const accelerationMagnitude = this.vectorMagnitude(b.motion.acceleration);
        // Movimento suave tem aceleração baixa
        const smoothness = 1 - Math.min(accelerationMagnitude / 100, 1);
        if (smoothness < thresholds.motionSmoothness) {
            differences.push({
                aspect: 'motion',
                property: 'smoothness',
                valueA: a.motion.velocity,
                valueB: b.motion.velocity,
                delta: 1 - smoothness,
                significant: true,
                description: `Movimento não suave: ${(smoothness * 100).toFixed(1)}% de suavidade`,
            });
            issues.push({
                id: this.generateId(),
                type: 'motion-jump',
                severity: smoothness < thresholds.motionSmoothness * 0.5 ? 'error' : 'warning',
                aspect: 'motion',
                description: `Salto de movimento detectado entre elementos ${a.index} e ${b.index}`,
                affectedElements: [a.id, b.id],
                suggestion: 'Adicionar interpolação ou frames intermediários',
                autoFixable: true,
            });
        }
        // Comparar rotação
        const rotationDelta = this.vectorDistance(a.motion.rotation, b.motion.rotation);
        if (rotationDelta > thresholds.rotationDelta) {
            differences.push({
                aspect: 'motion',
                property: 'rotation',
                valueA: a.motion.rotation,
                valueB: b.motion.rotation,
                delta: rotationDelta,
                significant: true,
                description: `Mudança de rotação: ${rotationDelta.toFixed(1)}°`,
            });
        }
        const score = Math.max(smoothness, 0);
        return { score, differences, issues };
    }
    compareAudio(a, b, thresholds) {
        const differences = [];
        const issues = [];
        if (!a.audio || !b.audio) {
            return { score: 1, differences: [], issues: [] };
        }
        // Comparar nível de áudio
        const levelDelta = Math.abs(a.audio.level - b.audio.level);
        if (levelDelta > thresholds.audioLevelVariance) {
            differences.push({
                aspect: 'audio',
                property: 'level',
                valueA: a.audio.level,
                valueB: b.audio.level,
                delta: levelDelta,
                significant: true,
                description: `Diferença de nível: ${levelDelta.toFixed(1)}dB`,
            });
            // Detectar pop ou gap
            if (b.audio.level < -60) {
                issues.push({
                    id: this.generateId(),
                    type: 'audio-gap',
                    severity: 'warning',
                    aspect: 'audio',
                    description: `Silêncio detectado no elemento ${b.index}`,
                    affectedElements: [b.id],
                    suggestion: 'Verificar se silêncio é intencional',
                    autoFixable: false,
                });
            }
            else if (levelDelta > thresholds.audioLevelVariance * 2) {
                issues.push({
                    id: this.generateId(),
                    type: 'audio-pop',
                    severity: 'error',
                    aspect: 'audio',
                    description: `Mudança brusca de volume entre elementos ${a.index} e ${b.index}`,
                    affectedElements: [a.id, b.id],
                    suggestion: 'Aplicar fade ou normalização de áudio',
                    autoFixable: true,
                });
            }
        }
        const score = 1 - Math.min(levelDelta / (thresholds.audioLevelVariance * 3), 1);
        return { score, differences, issues };
    }
    compareNarrative(a, b) {
        const differences = [];
        const issues = [];
        let score = 1;
        if (!a.narrative || !b.narrative) {
            return { score: 1, differences: [], issues: [] };
        }
        // Verificar consistência de personagens
        const charactersA = new Set(a.narrative.characters);
        const charactersB = new Set(b.narrative.characters);
        // Personagens que aparecem em A mas não em B (potencial problema)
        const missingInB = [...charactersA].filter(c => !charactersB.has(c));
        const newInB = [...charactersB].filter(c => !charactersA.has(c));
        if (missingInB.length > 0) {
            differences.push({
                aspect: 'narrative',
                property: 'characters',
                valueA: a.narrative.characters,
                valueB: b.narrative.characters,
                delta: missingInB.length / charactersA.size,
                significant: true,
                description: `Personagens ausentes: ${missingInB.join(', ')}`,
            });
            // Pode ser problema ou pode ser intencional
            issues.push({
                id: this.generateId(),
                type: 'character-inconsistency',
                severity: 'info',
                aspect: 'narrative',
                description: `Personagens ${missingInB.join(', ')} não aparecem no elemento ${b.index}`,
                affectedElements: [a.id, b.id],
                suggestion: 'Verificar se ausência é intencional',
                autoFixable: false,
            });
            score -= 0.2;
        }
        // Verificar mudança de localização
        if (a.narrative.location !== b.narrative.location) {
            differences.push({
                aspect: 'narrative',
                property: 'location',
                valueA: a.narrative.location,
                valueB: b.narrative.location,
                delta: 1,
                significant: false,
                description: `Mudança de localização: ${a.narrative.location} → ${b.narrative.location}`,
            });
        }
        // Verificar mudança brusca de mood
        if (a.narrative.mood && b.narrative.mood && a.narrative.mood !== b.narrative.mood) {
            const moodConflict = this.detectMoodConflict(a.narrative.mood, b.narrative.mood);
            if (moodConflict) {
                differences.push({
                    aspect: 'narrative',
                    property: 'mood',
                    valueA: a.narrative.mood,
                    valueB: b.narrative.mood,
                    delta: 1,
                    significant: true,
                    description: `Mudança conflitante de mood: ${a.narrative.mood} → ${b.narrative.mood}`,
                });
                issues.push({
                    id: this.generateId(),
                    type: 'narrative-conflict',
                    severity: 'warning',
                    aspect: 'narrative',
                    description: `Mudança abrupta de mood de "${a.narrative.mood}" para "${b.narrative.mood}"`,
                    affectedElements: [a.id, b.id],
                    suggestion: 'Considerar transição gradual de mood',
                    autoFixable: false,
                });
                score -= 0.3;
            }
        }
        return { score: Math.max(score, 0), differences, issues };
    }
    compareTechnical(a, b) {
        const differences = [];
        const issues = [];
        let score = 1;
        if (!a.technical || !b.technical) {
            return { score: 1, differences: [], issues: [] };
        }
        // Verificar formato
        if (a.technical.format !== b.technical.format) {
            differences.push({
                aspect: 'technical',
                property: 'format',
                valueA: a.technical.format,
                valueB: b.technical.format,
                delta: 1,
                significant: true,
                description: `Formato diferente: ${a.technical.format} vs ${b.technical.format}`,
            });
            score -= 0.5;
        }
        // Verificar codec
        if (a.technical.codec !== b.technical.codec) {
            differences.push({
                aspect: 'technical',
                property: 'codec',
                valueA: a.technical.codec,
                valueB: b.technical.codec,
                delta: 1,
                significant: true,
                description: `Codec diferente: ${a.technical.codec} vs ${b.technical.codec}`,
            });
            score -= 0.2;
        }
        // Verificar frame rate
        if (a.technical.frameRate !== b.technical.frameRate) {
            differences.push({
                aspect: 'technical',
                property: 'frameRate',
                valueA: a.technical.frameRate,
                valueB: b.technical.frameRate,
                delta: Math.abs((a.technical.frameRate || 0) - (b.technical.frameRate || 0)),
                significant: true,
                description: `Frame rate diferente: ${a.technical.frameRate} vs ${b.technical.frameRate}`,
            });
            issues.push({
                id: this.generateId(),
                type: 'timing-mismatch',
                severity: 'error',
                aspect: 'technical',
                description: `Frame rates incompatíveis podem causar problemas de sincronização`,
                affectedElements: [a.id, b.id],
                suggestion: 'Normalizar frame rate antes de combinar',
                autoFixable: true,
            });
            score -= 0.4;
        }
        return { score: Math.max(score, 0), differences, issues };
    }
    compareStyle(a, b, thresholds) {
        const differences = [];
        const issues = [];
        let score = 1;
        if (!a.style || !b.style) {
            return { score: 1, differences: [], issues: [] };
        }
        // Verificar estilo artístico
        if (a.style.artStyle !== b.style.artStyle) {
            differences.push({
                aspect: 'style',
                property: 'artStyle',
                valueA: a.style.artStyle,
                valueB: b.style.artStyle,
                delta: 1,
                significant: true,
                description: `Estilo artístico diferente: ${a.style.artStyle} vs ${b.style.artStyle}`,
            });
            issues.push({
                id: this.generateId(),
                type: 'style-inconsistency',
                severity: 'warning',
                aspect: 'style',
                description: `Mudança de estilo artístico entre elementos ${a.index} e ${b.index}`,
                affectedElements: [a.id, b.id],
                suggestion: 'Manter consistência de estilo ou usar transição',
                autoFixable: false,
            });
            score -= 0.4;
        }
        // Verificar paleta de cores
        if (a.style.colorPalette && b.style.colorPalette) {
            const paletteSimilarity = this.compareColors(a.style.colorPalette, b.style.colorPalette);
            if (paletteSimilarity < (1 - thresholds.colorDifference)) {
                differences.push({
                    aspect: 'style',
                    property: 'colorPalette',
                    valueA: a.style.colorPalette,
                    valueB: b.style.colorPalette,
                    delta: 1 - paletteSimilarity,
                    significant: true,
                    description: `Paleta de cores divergente`,
                });
                score -= 0.2;
            }
        }
        // Verificar estilo de iluminação
        if (a.style.lightingStyle !== b.style.lightingStyle) {
            differences.push({
                aspect: 'style',
                property: 'lightingStyle',
                valueA: a.style.lightingStyle,
                valueB: b.style.lightingStyle,
                delta: 1,
                significant: true,
                description: `Estilo de iluminação diferente: ${a.style.lightingStyle} vs ${b.style.lightingStyle}`,
            });
            issues.push({
                id: this.generateId(),
                type: 'lighting-discontinuity',
                severity: 'warning',
                aspect: 'style',
                description: `Mudança de iluminação entre elementos ${a.index} e ${b.index}`,
                affectedElements: [a.id, b.id],
                suggestion: 'Verificar continuidade de iluminação',
                autoFixable: true,
            });
            score -= 0.3;
        }
        return { score: Math.max(score, 0), differences, issues };
    }
    compareTiming(a, b, thresholds) {
        const differences = [];
        const issues = [];
        let score = 1;
        // Verificar gap no timestamp
        if (a.timestamp !== undefined && b.timestamp !== undefined) {
            const expectedGap = (a.duration || 0);
            const actualGap = b.timestamp - a.timestamp;
            const gapDelta = Math.abs(actualGap - expectedGap);
            if (gapDelta > thresholds.timingTolerance) {
                differences.push({
                    aspect: 'timing',
                    property: 'timestamp',
                    valueA: a.timestamp,
                    valueB: b.timestamp,
                    delta: gapDelta,
                    significant: true,
                    description: `Gap de timing: esperado ${expectedGap}ms, atual ${actualGap}ms`,
                });
                if (actualGap > expectedGap) {
                    issues.push({
                        id: this.generateId(),
                        type: 'timing-mismatch',
                        severity: 'warning',
                        aspect: 'timing',
                        description: `Gap de ${gapDelta}ms entre elementos ${a.index} e ${b.index}`,
                        affectedElements: [a.id, b.id],
                        suggestion: 'Verificar se gap é intencional ou ajustar timing',
                        autoFixable: true,
                    });
                }
                score -= Math.min(gapDelta / (thresholds.timingTolerance * 5), 0.5);
            }
        }
        return { score: Math.max(score, 0), differences, issues };
    }
    compareSpatial(a, b, thresholds) {
        const differences = [];
        const issues = [];
        let score = 1;
        if (!a.spatial || !b.spatial) {
            return { score: 1, differences: [], issues: [] };
        }
        // Comparar posição
        const positionDelta = this.vectorDistance(a.spatial.position, b.spatial.position);
        if (positionDelta > thresholds.positionDelta) {
            differences.push({
                aspect: 'spatial',
                property: 'position',
                valueA: a.spatial.position,
                valueB: b.spatial.position,
                delta: positionDelta,
                significant: true,
                description: `Mudança de posição: ${positionDelta.toFixed(1)} unidades`,
            });
            issues.push({
                id: this.generateId(),
                type: 'spatial-discontinuity',
                severity: 'warning',
                aspect: 'spatial',
                description: `Teleporte detectado: objeto moveu ${positionDelta.toFixed(1)} unidades`,
                affectedElements: [a.id, b.id],
                suggestion: 'Adicionar interpolação de movimento',
                autoFixable: true,
            });
            score -= 0.3;
        }
        // Comparar escala
        const scaleA = this.vectorMagnitude(a.spatial.scale);
        const scaleB = this.vectorMagnitude(b.spatial.scale);
        const scaleDelta = Math.abs(scaleA - scaleB) / Math.max(scaleA, scaleB);
        if (scaleDelta > thresholds.scaleDelta) {
            differences.push({
                aspect: 'spatial',
                property: 'scale',
                valueA: a.spatial.scale,
                valueB: b.spatial.scale,
                delta: scaleDelta,
                significant: true,
                description: `Mudança de escala: ${(scaleDelta * 100).toFixed(1)}%`,
            });
            score -= 0.2;
        }
        return { score: Math.max(score, 0), differences, issues };
    }
    // ========================================================================
    // MÉTODOS UTILITÁRIOS
    // ========================================================================
    quickCompare(a, b) {
        let similarity = 1;
        // Comparação rápida de visuais
        if (a.visual && b.visual) {
            similarity -= Math.abs(a.visual.brightness - b.visual.brightness) * 0.5;
            similarity -= Math.abs(a.visual.contrast - b.visual.contrast) * 0.3;
        }
        return Math.max(similarity, 0);
    }
    compareColors(colorsA, colorsB) {
        if (colorsA.length === 0 || colorsB.length === 0)
            return 1;
        // Converter cores para RGB e calcular distância média
        let totalSimilarity = 0;
        const comparisons = Math.min(colorsA.length, colorsB.length);
        for (let i = 0; i < comparisons; i++) {
            const rgbA = this.hexToRgb(colorsA[i]);
            const rgbB = this.hexToRgb(colorsB[i]);
            if (rgbA && rgbB) {
                const distance = Math.sqrt(Math.pow(rgbA.r - rgbB.r, 2) +
                    Math.pow(rgbA.g - rgbB.g, 2) +
                    Math.pow(rgbA.b - rgbB.b, 2));
                // Normalizar para 0-1 (max distance é sqrt(3*255^2) ≈ 441)
                totalSimilarity += 1 - (distance / 441);
            }
        }
        return totalSimilarity / comparisons;
    }
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    }
    vectorDistance(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) +
            Math.pow(a.y - b.y, 2) +
            Math.pow(a.z - b.z, 2));
    }
    vectorMagnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }
    detectMoodConflict(moodA, moodB) {
        const conflictingPairs = [
            [['happy', 'joyful', 'cheerful'], ['sad', 'melancholic', 'depressing']],
            [['calm', 'peaceful', 'serene'], ['tense', 'anxious', 'frantic']],
            [['romantic', 'loving'], ['angry', 'hateful']],
            [['comedic', 'funny'], ['tragic', 'dramatic']],
        ];
        for (const [group1, group2] of conflictingPairs) {
            const aInGroup1 = group1.some(m => moodA.toLowerCase().includes(m));
            const bInGroup2 = group2.some(m => moodB.toLowerCase().includes(m));
            const aInGroup2 = group2.some(m => moodA.toLowerCase().includes(m));
            const bInGroup1 = group1.some(m => moodB.toLowerCase().includes(m));
            if ((aInGroup1 && bInGroup2) || (aInGroup2 && bInGroup1)) {
                return true;
            }
        }
        return false;
    }
    calculateContinuityScore(a, b, differences) {
        const significantDifferences = differences.filter(d => d.significant);
        const basePenalty = significantDifferences.length * 0.1;
        return Math.max(1 - basePenalty, 0);
    }
    async generateVisualDiff(a, b, differences) {
        // Placeholder - implementação real usaria canvas ou biblioteca de imagem
        return {
            type: 'heatmap',
            data: '',
            highlightedAreas: differences
                .filter(d => d.aspect === 'visual')
                .map((d, i) => ({
                x: i * 100,
                y: 0,
                width: 100,
                height: 100,
                severity: d.significant ? 'high' : 'low',
            })),
        };
    }
    createIssueTimeline(elements, comparisons) {
        const timeline = [];
        for (const comparison of comparisons) {
            if (comparison.issues.length > 0) {
                const element = elements.find(e => e.id === comparison.elementB);
                timeline.push({
                    index: comparison.indexB,
                    timestamp: element?.timestamp,
                    issues: comparison.issues,
                });
            }
        }
        return timeline.sort((a, b) => a.index - b.index);
    }
    calculateSequenceMetrics(comparisons) {
        if (comparisons.length === 0) {
            return {
                averageSimilarity: 1,
                minSimilarity: 1,
                maxSimilarity: 1,
                similarityVariance: 0,
                continuityScore: 1,
                styleConsistencyScore: 1,
                technicalQualityScore: 1,
            };
        }
        const similarities = comparisons.map(c => c.overallSimilarity);
        const continuities = comparisons.map(c => c.continuityScore);
        const styleScores = comparisons.map(c => c.scores.style || 1);
        const technicalScores = comparisons.map(c => c.scores.technical || 1);
        const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = (arr) => {
            const mean = avg(arr);
            return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
        };
        return {
            averageSimilarity: avg(similarities),
            minSimilarity: Math.min(...similarities),
            maxSimilarity: Math.max(...similarities),
            similarityVariance: variance(similarities),
            continuityScore: avg(continuities),
            styleConsistencyScore: avg(styleScores),
            technicalQualityScore: avg(technicalScores),
        };
    }
    generateSummary(comparisons, issues, metrics) {
        // Identificar áreas problemáticas (sequências de baixa similaridade)
        const problemAreas = [];
        let currentProblem = null;
        for (const comparison of comparisons) {
            if (comparison.overallSimilarity < 0.7) {
                if (!currentProblem) {
                    currentProblem = {
                        startIndex: comparison.indexA,
                        endIndex: comparison.indexB,
                        minSimilarity: comparison.overallSimilarity,
                    };
                }
                else {
                    currentProblem.endIndex = comparison.indexB;
                    currentProblem.minSimilarity = Math.min(currentProblem.minSimilarity, comparison.overallSimilarity);
                }
            }
            else if (currentProblem) {
                problemAreas.push({
                    startIndex: currentProblem.startIndex,
                    endIndex: currentProblem.endIndex,
                    severity: currentProblem.minSimilarity < 0.5 ? 'high' : 'medium',
                    description: `Baixa consistência entre elementos ${currentProblem.startIndex}-${currentProblem.endIndex}`,
                });
                currentProblem = null;
            }
        }
        // Calcular scores por aspecto
        const aspectScores = {};
        const aspectKeys = ['visual', 'motion', 'audio', 'narrative', 'technical', 'style', 'timing', 'spatial'];
        for (const aspect of aspectKeys) {
            const scores = comparisons
                .map(c => c.scores[aspect])
                .filter((s) => s !== undefined);
            if (scores.length > 0) {
                aspectScores[aspect] = scores.reduce((a, b) => a + b, 0) / scores.length;
            }
        }
        return {
            overallConsistency: metrics.averageSimilarity,
            aspectScores,
            totalIssues: issues.length,
            criticalIssues: issues.filter(i => i.severity === 'critical').length,
            warningIssues: issues.filter(i => i.severity === 'warning').length,
            problemAreas,
        };
    }
    generateRecommendations(issues, metrics) {
        const recommendations = [];
        // Baseado em issues
        const issueTypes = new Map();
        for (const issue of issues) {
            issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1);
        }
        if ((issueTypes.get('color-shift') || 0) > 2) {
            recommendations.push('Múltiplas mudanças de cor detectadas. Considere aplicar color grading uniforme em toda a sequência.');
        }
        if ((issueTypes.get('motion-jump') || 0) > 2) {
            recommendations.push('Saltos de movimento detectados. Adicione frames intermediários ou aplique motion blur.');
        }
        if ((issueTypes.get('audio-pop') || 0) > 0) {
            recommendations.push('Pops de áudio detectados. Aplique crossfade entre clips de áudio.');
        }
        if ((issueTypes.get('style-inconsistency') || 0) > 0) {
            recommendations.push('Inconsistências de estilo detectadas. Revise o style guide e garanta uniformidade visual.');
        }
        // Baseado em métricas
        if (metrics.continuityScore < 0.8) {
            recommendations.push(`Continuidade geral baixa (${(metrics.continuityScore * 100).toFixed(1)}%). Revise transições entre elementos.`);
        }
        if (metrics.similarityVariance > 0.1) {
            recommendations.push('Alta variação de similaridade. Alguns elementos podem estar muito diferentes do padrão.');
        }
        if (metrics.styleConsistencyScore < 0.85) {
            recommendations.push('Consistência de estilo pode ser melhorada. Verifique paleta de cores e iluminação.');
        }
        // Recomendação geral se poucos problemas
        if (recommendations.length === 0 && issues.length === 0) {
            recommendations.push('Excelente! Sequência apresenta alta consistência e qualidade. Pronta para produção.');
        }
        return recommendations;
    }
    generateId() {
        return `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.SceneComparator = SceneComparator;
exports.SceneComparator = SceneComparator = __decorate([
    (0, inversify_1.injectable)()
], SceneComparator);

import { injectable, inject } from 'inversify';

/**
 * SCENE COMPARATOR - Comparador de Cenas e Elementos
 * 
 * Sistema especializado em comparar cenas, frames, shots e qualquer
 * sequência de elementos para detectar inconsistências, erros de
 * continuidade e problemas de qualidade.
 * 
 * Usado para:
 * - Vídeo: comparar frames consecutivos
 * - Animação: verificar continuidade de movimento
 * - Áudio: detectar cortes abruptos
 * - Imagem: verificar consistência de estilo
 * - 3D: validar continuidade de iluminação/materiais
 * - Narrativa: verificar consistência de personagens/plot
 */

// ============================================================================
// TIPOS
// ============================================================================

export type ComparisonMode = 
    | 'sequential'      // Compara A com B, B com C, etc
    | 'reference'       // Compara todos com um elemento de referência
    | 'pairwise'        // Compara todos os pares possíveis
    | 'keyframe';       // Compara apenas com keyframes definidos

export type AspectType =
    | 'visual'          // Aspectos visuais (cor, composição, iluminação)
    | 'motion'          // Movimento e animação
    | 'audio'           // Aspectos sonoros
    | 'narrative'       // Aspectos narrativos
    | 'technical'       // Aspectos técnicos (resolução, codec, etc)
    | 'style'           // Estilo artístico
    | 'timing'          // Timing e ritmo
    | 'spatial';        // Posicionamento espacial

/**
 * Configuração de comparação
 */
export interface ComparisonConfig {
    mode: ComparisonMode;
    aspects: AspectType[];
    thresholds: ComparisonThresholds;
    referenceElement?: string;          // Para modo 'reference'
    keyframeIndices?: number[];         // Para modo 'keyframe'
    ignoreMinorDifferences: boolean;
    generateVisualDiff: boolean;
    autoDetectIssues: boolean;
}

/**
 * Thresholds de tolerância
 */
export interface ComparisonThresholds {
    colorDifference: number;            // 0-1, diferença de cor aceitável
    positionDelta: number;              // Em pixels/unidades
    scaleDelta: number;                 // 0-1, diferença de escala
    rotationDelta: number;              // Em graus
    brightnessVariance: number;         // 0-1
    contrastVariance: number;           // 0-1
    motionSmoothness: number;           // 0-1
    audioLevelVariance: number;         // Em dB
    timingTolerance: number;            // Em ms
}

/**
 * Elemento comparável (genérico)
 */
export interface ComparableElement {
    id: string;
    index: number;                      // Posição na sequência
    timestamp?: number;                 // Timestamp (se aplicável)
    duration?: number;                  // Duração (se aplicável)
    type: string;                       // Tipo do elemento
    
    // Dados visuais
    visual?: {
        width: number;
        height: number;
        colorHistogram?: number[];      // Histograma de cores
        dominantColors?: string[];      // Cores dominantes
        brightness: number;             // 0-1
        contrast: number;               // 0-1
        saturation: number;             // 0-1
        composition?: CompositionData;
    };
    
    // Dados de movimento
    motion?: {
        velocity: Vector3;
        acceleration: Vector3;
        rotation: Vector3;
        keyPoints?: KeyPoint[];
    };
    
    // Dados de áudio
    audio?: {
        level: number;                  // dB
        frequency: number[];            // Espectro de frequência
        tempo?: number;                 // BPM
        waveform?: number[];
    };
    
    // Dados narrativos
    narrative?: {
        characters: string[];
        location: string;
        mood: string;
        action: string;
        dialogue?: string;
    };
    
    // Dados técnicos
    technical?: {
        format: string;
        codec?: string;
        bitrate?: number;
        sampleRate?: number;
        frameRate?: number;
    };
    
    // Dados de estilo
    style?: {
        artStyle: string;
        colorPalette: string[];
        lightingStyle: string;
        cameraStyle?: string;
    };
    
    // Dados espaciais (3D)
    spatial?: {
        position: Vector3;
        rotation: Vector3;
        scale: Vector3;
        boundingBox?: BoundingBox;
    };

    // Metadados
    metadata: Record<string, unknown>;
}

/**
 * Vetor 3D
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

/**
 * Ponto chave para tracking
 */
export interface KeyPoint {
    id: string;
    position: Vector3;
    confidence: number;
}

/**
 * Dados de composição visual
 */
export interface CompositionData {
    ruleOfThirdsScore: number;          // 0-1
    symmetryScore: number;              // 0-1
    balanceScore: number;               // 0-1
    focalPoints: Array<{ x: number; y: number; strength: number }>;
    leadingLines?: Array<{ start: Vector3; end: Vector3 }>;
}

/**
 * Bounding box
 */
export interface BoundingBox {
    min: Vector3;
    max: Vector3;
}

/**
 * Resultado de comparação entre dois elementos
 */
export interface ElementComparison {
    elementA: string;
    elementB: string;
    indexA: number;
    indexB: number;
    
    // Scores por aspecto
    scores: AspectScores;
    
    // Score geral
    overallSimilarity: number;          // 0-1
    
    // Diferenças detectadas
    differences: DetectedDifference[];
    
    // Problemas identificados
    issues: ComparisonIssue[];
    
    // Continuidade
    continuityScore: number;            // 0-1
    
    // Visual diff (se habilitado)
    visualDiff?: VisualDiff;
}

/**
 * Scores por aspecto
 */
export interface AspectScores {
    visual?: number;
    motion?: number;
    audio?: number;
    narrative?: number;
    technical?: number;
    style?: number;
    timing?: number;
    spatial?: number;
}

/**
 * Diferença detectada
 */
export interface DetectedDifference {
    aspect: AspectType;
    property: string;
    valueA: unknown;
    valueB: unknown;
    delta: number;                      // Magnitude da diferença
    significant: boolean;               // Se passa do threshold
    description: string;
}

/**
 * Problema de comparação
 */
export interface ComparisonIssue {
    id: string;
    type: IssueType;
    severity: 'info' | 'warning' | 'error' | 'critical';
    aspect: AspectType;
    description: string;
    affectedElements: string[];
    suggestion?: string;
    autoFixable: boolean;
}

export type IssueType = 
    | 'jump-cut'                // Corte abrupto
    | 'color-shift'             // Mudança de cor
    | 'flicker'                 // Oscilação
    | 'motion-jump'             // Salto de movimento
    | 'audio-pop'               // Estouro de áudio
    | 'audio-gap'               // Silêncio inesperado
    | 'continuity-break'        // Quebra de continuidade
    | 'style-inconsistency'     // Inconsistência de estilo
    | 'narrative-conflict'      // Conflito narrativo
    | 'timing-mismatch'         // Dessincronização
    | 'resolution-mismatch'     // Resolução diferente
    | 'aspect-ratio-change'     // Mudança de proporção
    | 'lighting-discontinuity'  // Descontinuidade de luz
    | 'character-inconsistency' // Inconsistência de personagem
    | 'spatial-discontinuity';  // Descontinuidade espacial

/**
 * Diferença visual (para visualização)
 */
export interface VisualDiff {
    type: 'heatmap' | 'overlay' | 'sidebyside';
    data: string;                       // Base64 ou URL
    highlightedAreas: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        severity: string;
    }>;
}

/**
 * Relatório completo de comparação de sequência
 */
export interface SequenceComparisonReport {
    id: string;
    timestamp: number;
    elementCount: number;
    config: ComparisonConfig;
    
    // Comparações individuais
    comparisons: ElementComparison[];
    
    // Sumário
    summary: ComparisonSummary;
    
    // Todos os problemas encontrados
    allIssues: ComparisonIssue[];
    
    // Timeline de problemas
    issueTimeline: Array<{
        index: number;
        timestamp?: number;
        issues: ComparisonIssue[];
    }>;
    
    // Métricas gerais
    metrics: SequenceMetrics;
    
    // Recomendações
    recommendations: string[];
}

/**
 * Sumário de comparação
 */
export interface ComparisonSummary {
    overallConsistency: number;         // 0-1
    aspectScores: AspectScores;
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    problemAreas: Array<{
        startIndex: number;
        endIndex: number;
        severity: string;
        description: string;
    }>;
}

/**
 * Métricas da sequência
 */
export interface SequenceMetrics {
    averageSimilarity: number;
    minSimilarity: number;
    maxSimilarity: number;
    similarityVariance: number;
    continuityScore: number;
    styleConsistencyScore: number;
    technicalQualityScore: number;
}

// ============================================================================
// SCENE COMPARATOR - Implementação
// ============================================================================

@injectable()
export class SceneComparator {
    private defaultConfig: ComparisonConfig = {
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

    /**
     * Compara uma sequência de elementos
     */
    async compareSequence(
        elements: ComparableElement[],
        config: Partial<ComparisonConfig> = {}
    ): Promise<SequenceComparisonReport> {
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
    async comparePair(
        elementA: ComparableElement,
        elementB: ComparableElement,
        config: Partial<ComparisonConfig> = {}
    ): Promise<ElementComparison> {
        const fullConfig = { ...this.defaultConfig, ...config };
        
        const scores: AspectScores = {};
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];

        // Comparar cada aspecto solicitado
        for (const aspect of fullConfig.aspects) {
            const aspectResult = await this.compareAspect(
                elementA,
                elementB,
                aspect,
                fullConfig.thresholds
            );
            
            scores[aspect] = aspectResult.score;
            differences.push(...aspectResult.differences);
            
            if (fullConfig.autoDetectIssues) {
                issues.push(...aspectResult.issues);
            }
        }

        // Calcular similaridade geral
        const aspectValues = Object.values(scores).filter(v => v !== undefined) as number[];
        const overallSimilarity = aspectValues.length > 0
            ? aspectValues.reduce((a, b) => a + b, 0) / aspectValues.length
            : 1;

        // Calcular score de continuidade
        const continuityScore = this.calculateContinuityScore(elementA, elementB, differences);

        // Gerar visual diff se solicitado
        let visualDiff: VisualDiff | undefined;
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
    async checkContinuity(
        elements: ComparableElement[],
        aspects: AspectType[] = ['visual', 'motion', 'narrative']
    ): Promise<{
        continuous: boolean;
        breaks: Array<{
            index: number;
            severity: string;
            description: string;
        }>;
        score: number;
    }> {
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
    findKeyframes(
        elements: ComparableElement[],
        threshold: number = 0.3
    ): number[] {
        const keyframes: number[] = [0]; // Primeiro elemento sempre é keyframe

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

    private async executeComparisons(
        elements: ComparableElement[],
        config: ComparisonConfig
    ): Promise<ElementComparison[]> {
        const comparisons: ElementComparison[] = [];

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
                    const comparison = await this.comparePair(
                        elements[keyframes[i]],
                        elements[keyframes[i + 1]],
                        config
                    );
                    comparisons.push(comparison);
                }
                break;
        }

        return comparisons;
    }

    private async compareAspect(
        elementA: ComparableElement,
        elementB: ComparableElement,
        aspect: AspectType,
        thresholds: ComparisonThresholds
    ): Promise<{
        score: number;
        differences: DetectedDifference[];
        issues: ComparisonIssue[];
    }> {
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

    private compareVisual(
        a: ComparableElement,
        b: ComparableElement,
        thresholds: ComparisonThresholds
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];
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
            const colorSimilarity = this.compareColors(
                a.visual.dominantColors,
                b.visual.dominantColors
            );
            
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

    private compareMotion(
        a: ComparableElement,
        b: ComparableElement,
        thresholds: ComparisonThresholds
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];

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

    private compareAudio(
        a: ComparableElement,
        b: ComparableElement,
        thresholds: ComparisonThresholds
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];

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
            } else if (levelDelta > thresholds.audioLevelVariance * 2) {
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

    private compareNarrative(
        a: ComparableElement,
        b: ComparableElement
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];
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

    private compareTechnical(
        a: ComparableElement,
        b: ComparableElement
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];
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

    private compareStyle(
        a: ComparableElement,
        b: ComparableElement,
        thresholds: ComparisonThresholds
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];
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

    private compareTiming(
        a: ComparableElement,
        b: ComparableElement,
        thresholds: ComparisonThresholds
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];
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

    private compareSpatial(
        a: ComparableElement,
        b: ComparableElement,
        thresholds: ComparisonThresholds
    ): { score: number; differences: DetectedDifference[]; issues: ComparisonIssue[] } {
        const differences: DetectedDifference[] = [];
        const issues: ComparisonIssue[] = [];
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

    private quickCompare(a: ComparableElement, b: ComparableElement): number {
        let similarity = 1;
        
        // Comparação rápida de visuais
        if (a.visual && b.visual) {
            similarity -= Math.abs(a.visual.brightness - b.visual.brightness) * 0.5;
            similarity -= Math.abs(a.visual.contrast - b.visual.contrast) * 0.3;
        }
        
        return Math.max(similarity, 0);
    }

    private compareColors(colorsA: string[], colorsB: string[]): number {
        if (colorsA.length === 0 || colorsB.length === 0) return 1;
        
        // Converter cores para RGB e calcular distância média
        let totalSimilarity = 0;
        const comparisons = Math.min(colorsA.length, colorsB.length);
        
        for (let i = 0; i < comparisons; i++) {
            const rgbA = this.hexToRgb(colorsA[i]);
            const rgbB = this.hexToRgb(colorsB[i]);
            
            if (rgbA && rgbB) {
                const distance = Math.sqrt(
                    Math.pow(rgbA.r - rgbB.r, 2) +
                    Math.pow(rgbA.g - rgbB.g, 2) +
                    Math.pow(rgbA.b - rgbB.b, 2)
                );
                // Normalizar para 0-1 (max distance é sqrt(3*255^2) ≈ 441)
                totalSimilarity += 1 - (distance / 441);
            }
        }
        
        return totalSimilarity / comparisons;
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    }

    private vectorDistance(a: Vector3, b: Vector3): number {
        return Math.sqrt(
            Math.pow(a.x - b.x, 2) +
            Math.pow(a.y - b.y, 2) +
            Math.pow(a.z - b.z, 2)
        );
    }

    private vectorMagnitude(v: Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    private detectMoodConflict(moodA: string, moodB: string): boolean {
        const conflictingPairs: Array<[string[], string[]]> = [
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

    private calculateContinuityScore(
        a: ComparableElement,
        b: ComparableElement,
        differences: DetectedDifference[]
    ): number {
        const significantDifferences = differences.filter(d => d.significant);
        const basePenalty = significantDifferences.length * 0.1;
        return Math.max(1 - basePenalty, 0);
    }

    private async generateVisualDiff(
        a: ComparableElement,
        b: ComparableElement,
        differences: DetectedDifference[]
    ): Promise<VisualDiff> {
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

    private createIssueTimeline(
        elements: ComparableElement[],
        comparisons: ElementComparison[]
    ): Array<{ index: number; timestamp?: number; issues: ComparisonIssue[] }> {
        const timeline: Array<{ index: number; timestamp?: number; issues: ComparisonIssue[] }> = [];
        
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

    private calculateSequenceMetrics(comparisons: ElementComparison[]): SequenceMetrics {
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

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = (arr: number[]) => {
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

    private generateSummary(
        comparisons: ElementComparison[],
        issues: ComparisonIssue[],
        metrics: SequenceMetrics
    ): ComparisonSummary {
        // Identificar áreas problemáticas (sequências de baixa similaridade)
        const problemAreas: Array<{
            startIndex: number;
            endIndex: number;
            severity: string;
            description: string;
        }> = [];

        let currentProblem: {
            startIndex: number;
            endIndex: number;
            minSimilarity: number;
        } | null = null;

        for (const comparison of comparisons) {
            if (comparison.overallSimilarity < 0.7) {
                if (!currentProblem) {
                    currentProblem = {
                        startIndex: comparison.indexA,
                        endIndex: comparison.indexB,
                        minSimilarity: comparison.overallSimilarity,
                    };
                } else {
                    currentProblem.endIndex = comparison.indexB;
                    currentProblem.minSimilarity = Math.min(
                        currentProblem.minSimilarity,
                        comparison.overallSimilarity
                    );
                }
            } else if (currentProblem) {
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
        const aspectScores: AspectScores = {};
        const aspectKeys = ['visual', 'motion', 'audio', 'narrative', 'technical', 'style', 'timing', 'spatial'] as const;
        
        for (const aspect of aspectKeys) {
            const scores = comparisons
                .map(c => c.scores[aspect])
                .filter((s): s is number => s !== undefined);
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

    private generateRecommendations(
        issues: ComparisonIssue[],
        metrics: SequenceMetrics
    ): string[] {
        const recommendations: string[] = [];

        // Baseado em issues
        const issueTypes = new Map<IssueType, number>();
        for (const issue of issues) {
            issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1);
        }

        if ((issueTypes.get('color-shift') || 0) > 2) {
            recommendations.push(
                'Múltiplas mudanças de cor detectadas. Considere aplicar color grading uniforme em toda a sequência.'
            );
        }

        if ((issueTypes.get('motion-jump') || 0) > 2) {
            recommendations.push(
                'Saltos de movimento detectados. Adicione frames intermediários ou aplique motion blur.'
            );
        }

        if ((issueTypes.get('audio-pop') || 0) > 0) {
            recommendations.push(
                'Pops de áudio detectados. Aplique crossfade entre clips de áudio.'
            );
        }

        if ((issueTypes.get('style-inconsistency') || 0) > 0) {
            recommendations.push(
                'Inconsistências de estilo detectadas. Revise o style guide e garanta uniformidade visual.'
            );
        }

        // Baseado em métricas
        if (metrics.continuityScore < 0.8) {
            recommendations.push(
                `Continuidade geral baixa (${(metrics.continuityScore * 100).toFixed(1)}%). Revise transições entre elementos.`
            );
        }

        if (metrics.similarityVariance > 0.1) {
            recommendations.push(
                'Alta variação de similaridade. Alguns elementos podem estar muito diferentes do padrão.'
            );
        }

        if (metrics.styleConsistencyScore < 0.85) {
            recommendations.push(
                'Consistência de estilo pode ser melhorada. Verifique paleta de cores e iluminação.'
            );
        }

        // Recomendação geral se poucos problemas
        if (recommendations.length === 0 && issues.length === 0) {
            recommendations.push(
                'Excelente! Sequência apresenta alta consistência e qualidade. Pronta para produção.'
            );
        }

        return recommendations;
    }

    private generateId(): string {
        return `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

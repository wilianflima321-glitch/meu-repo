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
export type ComparisonMode = 'sequential' | 'reference' | 'pairwise' | 'keyframe';
export type AspectType = 'visual' | 'motion' | 'audio' | 'narrative' | 'technical' | 'style' | 'timing' | 'spatial';
/**
 * Configuração de comparação
 */
export interface ComparisonConfig {
    mode: ComparisonMode;
    aspects: AspectType[];
    thresholds: ComparisonThresholds;
    referenceElement?: string;
    keyframeIndices?: number[];
    ignoreMinorDifferences: boolean;
    generateVisualDiff: boolean;
    autoDetectIssues: boolean;
}
/**
 * Thresholds de tolerância
 */
export interface ComparisonThresholds {
    colorDifference: number;
    positionDelta: number;
    scaleDelta: number;
    rotationDelta: number;
    brightnessVariance: number;
    contrastVariance: number;
    motionSmoothness: number;
    audioLevelVariance: number;
    timingTolerance: number;
}
/**
 * Elemento comparável (genérico)
 */
export interface ComparableElement {
    id: string;
    index: number;
    timestamp?: number;
    duration?: number;
    type: string;
    visual?: {
        width: number;
        height: number;
        colorHistogram?: number[];
        dominantColors?: string[];
        brightness: number;
        contrast: number;
        saturation: number;
        composition?: CompositionData;
    };
    motion?: {
        velocity: Vector3;
        acceleration: Vector3;
        rotation: Vector3;
        keyPoints?: KeyPoint[];
    };
    audio?: {
        level: number;
        frequency: number[];
        tempo?: number;
        waveform?: number[];
    };
    narrative?: {
        characters: string[];
        location: string;
        mood: string;
        action: string;
        dialogue?: string;
    };
    technical?: {
        format: string;
        codec?: string;
        bitrate?: number;
        sampleRate?: number;
        frameRate?: number;
    };
    style?: {
        artStyle: string;
        colorPalette: string[];
        lightingStyle: string;
        cameraStyle?: string;
    };
    spatial?: {
        position: Vector3;
        rotation: Vector3;
        scale: Vector3;
        boundingBox?: BoundingBox;
    };
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
    ruleOfThirdsScore: number;
    symmetryScore: number;
    balanceScore: number;
    focalPoints: Array<{
        x: number;
        y: number;
        strength: number;
    }>;
    leadingLines?: Array<{
        start: Vector3;
        end: Vector3;
    }>;
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
    scores: AspectScores;
    overallSimilarity: number;
    differences: DetectedDifference[];
    issues: ComparisonIssue[];
    continuityScore: number;
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
    delta: number;
    significant: boolean;
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
export type IssueType = 'jump-cut' | 'color-shift' | 'flicker' | 'motion-jump' | 'audio-pop' | 'audio-gap' | 'continuity-break' | 'style-inconsistency' | 'narrative-conflict' | 'timing-mismatch' | 'resolution-mismatch' | 'aspect-ratio-change' | 'lighting-discontinuity' | 'character-inconsistency' | 'spatial-discontinuity';
/**
 * Diferença visual (para visualização)
 */
export interface VisualDiff {
    type: 'heatmap' | 'overlay' | 'sidebyside';
    data: string;
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
    comparisons: ElementComparison[];
    summary: ComparisonSummary;
    allIssues: ComparisonIssue[];
    issueTimeline: Array<{
        index: number;
        timestamp?: number;
        issues: ComparisonIssue[];
    }>;
    metrics: SequenceMetrics;
    recommendations: string[];
}
/**
 * Sumário de comparação
 */
export interface ComparisonSummary {
    overallConsistency: number;
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
export declare class SceneComparator {
    private defaultConfig;
    /**
     * Compara uma sequência de elementos
     */
    compareSequence(elements: ComparableElement[], config?: Partial<ComparisonConfig>): Promise<SequenceComparisonReport>;
    /**
     * Compara dois elementos específicos
     */
    comparePair(elementA: ComparableElement, elementB: ComparableElement, config?: Partial<ComparisonConfig>): Promise<ElementComparison>;
    /**
     * Verifica continuidade de uma sequência
     */
    checkContinuity(elements: ComparableElement[], aspects?: AspectType[]): Promise<{
        continuous: boolean;
        breaks: Array<{
            index: number;
            severity: string;
            description: string;
        }>;
        score: number;
    }>;
    /**
     * Encontra keyframes significativos em uma sequência
     */
    findKeyframes(elements: ComparableElement[], threshold?: number): number[];
    private executeComparisons;
    private compareAspect;
    private compareVisual;
    private compareMotion;
    private compareAudio;
    private compareNarrative;
    private compareTechnical;
    private compareStyle;
    private compareTiming;
    private compareSpatial;
    private quickCompare;
    private compareColors;
    private hexToRgb;
    private vectorDistance;
    private vectorMagnitude;
    private detectMoodConflict;
    private calculateContinuityScore;
    private generateVisualDiff;
    private createIssueTimeline;
    private calculateSequenceMetrics;
    private generateSummary;
    private generateRecommendations;
    private generateId;
}

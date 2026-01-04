/**
 * QUALITY ENGINE - Sistema Central de Garantia de Qualidade
 *
 * Este é o coração do sistema de perfeição da Aethel IDE.
 * Cada trabalho da IA passa por múltiplas camadas de validação
 * antes de ser considerado "pronto".
 *
 * Inspirado em: Pixar (Renderman), ILM, Adobe, Autodesk
 */
export type QualityLevel = 'draft' | 'preview' | 'production' | 'master';
export type ValidationSeverity = 'info' | 'warning' | 'error' | 'critical';
export type DomainType = 'video' | 'audio' | 'image' | '3d' | 'code' | 'text' | 'animation';
/**
 * Resultado de uma validação individual
 */
export interface ValidationResult {
    id: string;
    rule: string;
    passed: boolean;
    severity: ValidationSeverity;
    message: string;
    details?: Record<string, unknown>;
    location?: {
        frame?: number;
        timestamp?: number;
        line?: number;
        column?: number;
        layer?: string;
        node?: string;
    };
    suggestion?: string;
    autoFixable: boolean;
    autoFix?: () => Promise<void>;
}
/**
 * Relatório completo de qualidade
 */
export interface QualityReport {
    id: string;
    timestamp: number;
    domain: DomainType;
    qualityLevel: QualityLevel;
    overallScore: number;
    passed: boolean;
    validations: ValidationResult[];
    metrics: QualityMetrics;
    comparisons?: ComparisonResult[];
    recommendations: string[];
    processingTime: number;
}
/**
 * Métricas de qualidade por domínio
 */
export interface QualityMetrics {
    consistency: number;
    precision: number;
    coherence: number;
    completeness: number;
    domain: DomainSpecificMetrics;
}
/**
 * Métricas específicas por domínio
 */
export interface DomainSpecificMetrics {
    frameStability?: number;
    colorConsistency?: number;
    motionSmooth?: number;
    audioSync?: number;
    dynamicRange?: number;
    frequencyBalance?: number;
    noiseFloor?: number;
    peakLevel?: number;
    sharpness?: number;
    colorAccuracy?: number;
    noiseLevel?: number;
    artifactFree?: number;
    meshQuality?: number;
    uvCoverage?: number;
    normalAccuracy?: number;
    topologyClean?: number;
    syntaxCorrect?: number;
    typesSafe?: number;
    testCoverage?: number;
    securityScore?: number;
    grammarScore?: number;
    coherenceScore?: number;
    styleConsistency?: number;
    factAccuracy?: number;
}
/**
 * Resultado de comparação entre elementos
 */
export interface ComparisonResult {
    elementA: string;
    elementB: string;
    similarity: number;
    differences: Difference[];
    isConsistent: boolean;
}
/**
 * Diferença detectada entre elementos
 */
export interface Difference {
    type: 'color' | 'position' | 'size' | 'content' | 'style' | 'timing' | 'structure';
    severity: ValidationSeverity;
    description: string;
    valueA: unknown;
    valueB: unknown;
    threshold?: number;
}
/**
 * Regra de validação
 */
export interface ValidationRule {
    id: string;
    name: string;
    description: string;
    domain: DomainType | 'all';
    qualityLevels: QualityLevel[];
    severity: ValidationSeverity;
    enabled: boolean;
    validate: (content: unknown, context: ValidationContext) => Promise<ValidationResult>;
}
/**
 * Contexto para validação
 */
export interface ValidationContext {
    projectId: string;
    qualityLevel: QualityLevel;
    domain: DomainType;
    previousVersions?: unknown[];
    relatedElements?: unknown[];
    styleGuide?: StyleGuide;
    constraints?: QualityConstraints;
}
/**
 * Guia de estilo do projeto
 */
export interface StyleGuide {
    colors: {
        primary: string[];
        secondary: string[];
        accent: string[];
        forbidden: string[];
    };
    typography?: {
        fonts: string[];
        sizes: Record<string, number>;
    };
    spacing?: Record<string, number>;
    mood?: string;
    references?: string[];
}
/**
 * Restrições de qualidade
 */
export interface QualityConstraints {
    minResolution?: {
        width: number;
        height: number;
    };
    maxFileSize?: number;
    colorSpace?: string;
    bitDepth?: number;
    sampleRate?: number;
    frameRate?: number;
    codec?: string[];
}
export declare class QualityEngine {
    private rules;
    private reports;
    private thresholds;
    constructor();
    /**
     * Valida conteúdo contra todas as regras aplicáveis
     */
    validate(content: unknown, context: ValidationContext): Promise<QualityReport>;
    /**
     * Compara dois elementos para consistência
     */
    compare(elementA: unknown, elementB: unknown, context: ValidationContext): Promise<ComparisonResult>;
    /**
     * Compara sequência de elementos (cenas, frames, etc.) para detectar inconsistências
     */
    compareSequence(elements: unknown[], context: ValidationContext): Promise<ComparisonResult[]>;
    /**
     * Auto-corrige problemas que podem ser corrigidos automaticamente
     */
    autoFix(report: QualityReport): Promise<{
        fixed: number;
        remaining: number;
    }>;
    /**
     * Registra uma nova regra de validação
     */
    registerRule(rule: ValidationRule): void;
    /**
     * Obtém histórico de qualidade de um projeto
     */
    getQualityHistory(projectId: string): QualityReport[];
    /**
     * Obtém tendência de qualidade
     */
    getQualityTrend(projectId: string, window?: number): {
        improving: boolean;
        averageScore: number;
        trend: number;
    };
    private getApplicableRules;
    private calculateMetrics;
    private calculateConsistency;
    private calculatePrecision;
    private calculateCompleteness;
    private calculateDomainMetrics;
    private getMetricFromValidations;
    private calculateOverallScore;
    private generateRecommendations;
    private compareStructure;
    private compareDomain;
    private compareVideoElements;
    private compareAudioElements;
    private compareImageElements;
    private compare3DElements;
    private compareCodeElements;
    private compareTextElements;
    private calculateSimilarity;
    private getElementId;
    private storeReport;
    private generateId;
    private registerBuiltInRules;
    private registerUniversalRules;
    private registerVideoRules;
    private registerAudioRules;
    private registerImageRules;
    private register3DRules;
    private registerCodeRules;
    private registerTextRules;
}

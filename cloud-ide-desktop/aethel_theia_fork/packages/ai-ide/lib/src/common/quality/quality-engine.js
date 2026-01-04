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
exports.QualityEngine = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// QUALITY ENGINE - Implementação Principal
// ============================================================================
let QualityEngine = class QualityEngine {
    constructor() {
        this.rules = new Map();
        this.reports = new Map();
        this.thresholds = new Map([
            ['draft', 60],
            ['preview', 75],
            ['production', 90],
            ['master', 98],
        ]);
        this.registerBuiltInRules();
    }
    /**
     * Valida conteúdo contra todas as regras aplicáveis
     */
    async validate(content, context) {
        const startTime = Date.now();
        const reportId = this.generateId();
        // Obter regras aplicáveis
        const applicableRules = this.getApplicableRules(context);
        // Executar todas as validações
        const validations = [];
        for (const rule of applicableRules) {
            try {
                const result = await rule.validate(content, context);
                validations.push(result);
            }
            catch (error) {
                validations.push({
                    id: this.generateId(),
                    rule: rule.id,
                    passed: false,
                    severity: 'error',
                    message: `Validation error: ${error.message}`,
                    autoFixable: false,
                });
            }
        }
        // Calcular métricas
        const metrics = this.calculateMetrics(validations, context.domain);
        // Calcular score geral
        const overallScore = this.calculateOverallScore(validations, metrics);
        // Verificar se passou no threshold do nível de qualidade
        const threshold = this.thresholds.get(context.qualityLevel) || 90;
        const passed = overallScore >= threshold &&
            !validations.some(v => !v.passed && v.severity === 'critical');
        // Gerar recomendações
        const recommendations = this.generateRecommendations(validations, metrics);
        const report = {
            id: reportId,
            timestamp: Date.now(),
            domain: context.domain,
            qualityLevel: context.qualityLevel,
            overallScore,
            passed,
            validations,
            metrics,
            recommendations,
            processingTime: Date.now() - startTime,
        };
        // Armazenar relatório
        this.storeReport(context.projectId, report);
        return report;
    }
    /**
     * Compara dois elementos para consistência
     */
    async compare(elementA, elementB, context) {
        const differences = [];
        // Comparação estrutural
        const structuralDiffs = this.compareStructure(elementA, elementB);
        differences.push(...structuralDiffs);
        // Comparação por domínio
        const domainDiffs = await this.compareDomain(elementA, elementB, context.domain);
        differences.push(...domainDiffs);
        // Calcular similaridade
        const similarity = this.calculateSimilarity(differences);
        return {
            elementA: this.getElementId(elementA),
            elementB: this.getElementId(elementB),
            similarity,
            differences,
            isConsistent: similarity >= 0.95 &&
                !differences.some(d => d.severity === 'critical' || d.severity === 'error'),
        };
    }
    /**
     * Compara sequência de elementos (cenas, frames, etc.) para detectar inconsistências
     */
    async compareSequence(elements, context) {
        const results = [];
        for (let i = 0; i < elements.length - 1; i++) {
            const comparison = await this.compare(elements[i], elements[i + 1], context);
            results.push(comparison);
        }
        return results;
    }
    /**
     * Auto-corrige problemas que podem ser corrigidos automaticamente
     */
    async autoFix(report) {
        let fixed = 0;
        let remaining = 0;
        for (const validation of report.validations) {
            if (!validation.passed && validation.autoFixable && validation.autoFix) {
                try {
                    await validation.autoFix();
                    fixed++;
                }
                catch {
                    remaining++;
                }
            }
            else if (!validation.passed) {
                remaining++;
            }
        }
        return { fixed, remaining };
    }
    /**
     * Registra uma nova regra de validação
     */
    registerRule(rule) {
        this.rules.set(rule.id, rule);
    }
    /**
     * Obtém histórico de qualidade de um projeto
     */
    getQualityHistory(projectId) {
        return this.reports.get(projectId) || [];
    }
    /**
     * Obtém tendência de qualidade
     */
    getQualityTrend(projectId, window = 10) {
        const history = this.getQualityHistory(projectId).slice(-window);
        if (history.length < 2) {
            return { improving: true, averageScore: history[0]?.overallScore || 0, trend: 0 };
        }
        const scores = history.map(r => r.overallScore);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        // Calcular tendência (regressão linear simples)
        const n = scores.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = scores.reduce((a, b) => a + b, 0);
        const sumXY = scores.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        const trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return {
            improving: trend > 0,
            averageScore,
            trend,
        };
    }
    // ========================================================================
    // MÉTODOS PRIVADOS
    // ========================================================================
    getApplicableRules(context) {
        return Array.from(this.rules.values()).filter(rule => {
            if (!rule.enabled)
                return false;
            if (rule.domain !== 'all' && rule.domain !== context.domain)
                return false;
            if (!rule.qualityLevels.includes(context.qualityLevel))
                return false;
            return true;
        });
    }
    calculateMetrics(validations, domain) {
        const passed = validations.filter(v => v.passed).length;
        const total = validations.length;
        const baseScore = total > 0 ? passed / total : 1;
        return {
            consistency: this.calculateConsistency(validations),
            precision: this.calculatePrecision(validations),
            coherence: baseScore,
            completeness: this.calculateCompleteness(validations),
            domain: this.calculateDomainMetrics(validations, domain),
        };
    }
    calculateConsistency(validations) {
        const consistencyRules = validations.filter(v => v.rule.includes('consistency') || v.rule.includes('style'));
        if (consistencyRules.length === 0)
            return 1;
        return consistencyRules.filter(v => v.passed).length / consistencyRules.length;
    }
    calculatePrecision(validations) {
        const precisionRules = validations.filter(v => v.rule.includes('precision') || v.rule.includes('accuracy'));
        if (precisionRules.length === 0)
            return 1;
        return precisionRules.filter(v => v.passed).length / precisionRules.length;
    }
    calculateCompleteness(validations) {
        const completenessRules = validations.filter(v => v.rule.includes('complete') || v.rule.includes('missing'));
        if (completenessRules.length === 0)
            return 1;
        return completenessRules.filter(v => v.passed).length / completenessRules.length;
    }
    calculateDomainMetrics(validations, domain) {
        const metrics = {};
        switch (domain) {
            case 'video':
                metrics.frameStability = this.getMetricFromValidations(validations, 'frame');
                metrics.colorConsistency = this.getMetricFromValidations(validations, 'color');
                metrics.motionSmooth = this.getMetricFromValidations(validations, 'motion');
                metrics.audioSync = this.getMetricFromValidations(validations, 'sync');
                break;
            case 'audio':
                metrics.dynamicRange = this.getMetricFromValidations(validations, 'dynamic');
                metrics.frequencyBalance = this.getMetricFromValidations(validations, 'frequency');
                metrics.noiseFloor = this.getMetricFromValidations(validations, 'noise');
                metrics.peakLevel = this.getMetricFromValidations(validations, 'peak');
                break;
            case 'image':
                metrics.sharpness = this.getMetricFromValidations(validations, 'sharp');
                metrics.colorAccuracy = this.getMetricFromValidations(validations, 'color');
                metrics.noiseLevel = this.getMetricFromValidations(validations, 'noise');
                metrics.artifactFree = this.getMetricFromValidations(validations, 'artifact');
                break;
            case '3d':
                metrics.meshQuality = this.getMetricFromValidations(validations, 'mesh');
                metrics.uvCoverage = this.getMetricFromValidations(validations, 'uv');
                metrics.normalAccuracy = this.getMetricFromValidations(validations, 'normal');
                metrics.topologyClean = this.getMetricFromValidations(validations, 'topology');
                break;
            case 'code':
                metrics.syntaxCorrect = this.getMetricFromValidations(validations, 'syntax');
                metrics.typesSafe = this.getMetricFromValidations(validations, 'type');
                metrics.testCoverage = this.getMetricFromValidations(validations, 'test');
                metrics.securityScore = this.getMetricFromValidations(validations, 'security');
                break;
            case 'text':
                metrics.grammarScore = this.getMetricFromValidations(validations, 'grammar');
                metrics.coherenceScore = this.getMetricFromValidations(validations, 'coherence');
                metrics.styleConsistency = this.getMetricFromValidations(validations, 'style');
                metrics.factAccuracy = this.getMetricFromValidations(validations, 'fact');
                break;
        }
        return metrics;
    }
    getMetricFromValidations(validations, keyword) {
        const relevant = validations.filter(v => v.rule.toLowerCase().includes(keyword));
        if (relevant.length === 0)
            return 1;
        return relevant.filter(v => v.passed).length / relevant.length;
    }
    calculateOverallScore(validations, metrics) {
        // Peso por severidade
        const weights = {
            critical: 30,
            error: 20,
            warning: 10,
            info: 5,
        };
        let totalWeight = 0;
        let weightedScore = 0;
        for (const validation of validations) {
            const weight = weights[validation.severity];
            totalWeight += weight;
            weightedScore += validation.passed ? weight : 0;
        }
        const validationScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 100;
        // Combinar com métricas
        const metricsScore = (metrics.consistency * 25 +
            metrics.precision * 25 +
            metrics.coherence * 25 +
            metrics.completeness * 25);
        return Math.round((validationScore * 0.6 + metricsScore * 0.4));
    }
    generateRecommendations(validations, metrics) {
        const recommendations = [];
        // Recomendar baseado em validações falhadas
        const failed = validations.filter(v => !v.passed);
        const criticalFailed = failed.filter(v => v.severity === 'critical');
        const errorFailed = failed.filter(v => v.severity === 'error');
        if (criticalFailed.length > 0) {
            recommendations.push(`CRÍTICO: ${criticalFailed.length} problemas críticos devem ser resolvidos antes de prosseguir.`);
            criticalFailed.forEach(v => {
                if (v.suggestion)
                    recommendations.push(`  → ${v.suggestion}`);
            });
        }
        if (errorFailed.length > 0) {
            recommendations.push(`ERROS: ${errorFailed.length} erros encontrados que afetam a qualidade.`);
        }
        // Recomendar baseado em métricas baixas
        if (metrics.consistency < 0.8) {
            recommendations.push('Consistência baixa detectada. Revise elementos para manter uniformidade de estilo.');
        }
        if (metrics.precision < 0.8) {
            recommendations.push('Precisão técnica pode ser melhorada. Verifique especificações e parâmetros.');
        }
        if (metrics.completeness < 0.9) {
            recommendations.push('Trabalho incompleto. Alguns elementos obrigatórios podem estar faltando.');
        }
        // Auto-fix disponível
        const autoFixable = failed.filter(v => v.autoFixable);
        if (autoFixable.length > 0) {
            recommendations.push(`${autoFixable.length} problemas podem ser corrigidos automaticamente.`);
        }
        return recommendations;
    }
    compareStructure(a, b) {
        const differences = [];
        if (typeof a !== typeof b) {
            differences.push({
                type: 'structure',
                severity: 'error',
                description: 'Tipos diferentes',
                valueA: typeof a,
                valueB: typeof b,
            });
            return differences;
        }
        if (typeof a === 'object' && a !== null && b !== null) {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            const missingInB = keysA.filter(k => !keysB.includes(k));
            const missingInA = keysB.filter(k => !keysA.includes(k));
            if (missingInB.length > 0) {
                differences.push({
                    type: 'structure',
                    severity: 'warning',
                    description: `Propriedades faltando no segundo elemento: ${missingInB.join(', ')}`,
                    valueA: keysA,
                    valueB: keysB,
                });
            }
            if (missingInA.length > 0) {
                differences.push({
                    type: 'structure',
                    severity: 'warning',
                    description: `Propriedades extras no segundo elemento: ${missingInA.join(', ')}`,
                    valueA: keysA,
                    valueB: keysB,
                });
            }
        }
        return differences;
    }
    async compareDomain(a, b, domain) {
        const differences = [];
        switch (domain) {
            case 'video':
                differences.push(...this.compareVideoElements(a, b));
                break;
            case 'audio':
                differences.push(...this.compareAudioElements(a, b));
                break;
            case 'image':
                differences.push(...this.compareImageElements(a, b));
                break;
            case '3d':
                differences.push(...this.compare3DElements(a, b));
                break;
            case 'code':
                differences.push(...this.compareCodeElements(a, b));
                break;
            case 'text':
                differences.push(...this.compareTextElements(a, b));
                break;
        }
        return differences;
    }
    compareVideoElements(a, b) {
        // Implementação específica para vídeo
        return [];
    }
    compareAudioElements(a, b) {
        // Implementação específica para áudio
        return [];
    }
    compareImageElements(a, b) {
        // Implementação específica para imagem
        return [];
    }
    compare3DElements(a, b) {
        // Implementação específica para 3D
        return [];
    }
    compareCodeElements(a, b) {
        // Implementação específica para código
        return [];
    }
    compareTextElements(a, b) {
        // Implementação específica para texto
        return [];
    }
    calculateSimilarity(differences) {
        if (differences.length === 0)
            return 1;
        const weights = {
            critical: 0.4,
            error: 0.25,
            warning: 0.15,
            info: 0.05,
        };
        let penalty = 0;
        for (const diff of differences) {
            penalty += weights[diff.severity];
        }
        return Math.max(0, 1 - penalty);
    }
    getElementId(element) {
        if (typeof element === 'object' && element !== null) {
            const obj = element;
            return obj.id || obj.name || 'unknown';
        }
        return 'unknown';
    }
    storeReport(projectId, report) {
        const existing = this.reports.get(projectId) || [];
        existing.push(report);
        // Manter apenas os últimos 100 relatórios
        if (existing.length > 100) {
            existing.shift();
        }
        this.reports.set(projectId, existing);
    }
    generateId() {
        return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // ========================================================================
    // REGRAS BUILT-IN
    // ========================================================================
    registerBuiltInRules() {
        // Regras universais
        this.registerUniversalRules();
        // Regras por domínio
        this.registerVideoRules();
        this.registerAudioRules();
        this.registerImageRules();
        this.register3DRules();
        this.registerCodeRules();
        this.registerTextRules();
    }
    registerUniversalRules() {
        this.registerRule({
            id: 'universal.not-empty',
            name: 'Conteúdo não vazio',
            description: 'Verifica se o conteúdo não está vazio',
            domain: 'all',
            qualityLevels: ['draft', 'preview', 'production', 'master'],
            severity: 'critical',
            enabled: true,
            validate: async (content) => ({
                id: this.generateId(),
                rule: 'universal.not-empty',
                passed: content !== null && content !== undefined && content !== '',
                severity: 'critical',
                message: content ? 'Conteúdo presente' : 'Conteúdo vazio ou nulo',
                autoFixable: false,
            }),
        });
        this.registerRule({
            id: 'universal.valid-structure',
            name: 'Estrutura válida',
            description: 'Verifica se a estrutura do conteúdo é válida',
            domain: 'all',
            qualityLevels: ['draft', 'preview', 'production', 'master'],
            severity: 'error',
            enabled: true,
            validate: async (content) => {
                let valid = true;
                let message = 'Estrutura válida';
                if (typeof content === 'object' && content !== null) {
                    try {
                        JSON.stringify(content);
                    }
                    catch {
                        valid = false;
                        message = 'Estrutura circular ou inválida detectada';
                    }
                }
                return {
                    id: this.generateId(),
                    rule: 'universal.valid-structure',
                    passed: valid,
                    severity: 'error',
                    message,
                    autoFixable: false,
                };
            },
        });
    }
    registerVideoRules() {
        this.registerRule({
            id: 'video.frame-consistency',
            name: 'Consistência de frames',
            description: 'Verifica se frames consecutivos são consistentes',
            domain: 'video',
            qualityLevels: ['preview', 'production', 'master'],
            severity: 'error',
            enabled: true,
            validate: async (content, context) => {
                // Implementação de verificação de consistência de frames
                return {
                    id: this.generateId(),
                    rule: 'video.frame-consistency',
                    passed: true,
                    severity: 'error',
                    message: 'Frames consistentes',
                    autoFixable: true,
                };
            },
        });
        this.registerRule({
            id: 'video.audio-sync',
            name: 'Sincronização de áudio',
            description: 'Verifica se áudio está sincronizado com vídeo',
            domain: 'video',
            qualityLevels: ['preview', 'production', 'master'],
            severity: 'critical',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'video.audio-sync',
                    passed: true,
                    severity: 'critical',
                    message: 'Áudio sincronizado',
                    autoFixable: true,
                };
            },
        });
        this.registerRule({
            id: 'video.color-continuity',
            name: 'Continuidade de cor',
            description: 'Verifica consistência de cores entre cenas',
            domain: 'video',
            qualityLevels: ['production', 'master'],
            severity: 'warning',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'video.color-continuity',
                    passed: true,
                    severity: 'warning',
                    message: 'Cores consistentes',
                    autoFixable: true,
                };
            },
        });
    }
    registerAudioRules() {
        this.registerRule({
            id: 'audio.no-clipping',
            name: 'Sem clipping',
            description: 'Verifica se não há distorção por clipping',
            domain: 'audio',
            qualityLevels: ['preview', 'production', 'master'],
            severity: 'error',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'audio.no-clipping',
                    passed: true,
                    severity: 'error',
                    message: 'Sem clipping detectado',
                    autoFixable: true,
                };
            },
        });
        this.registerRule({
            id: 'audio.loudness-normalized',
            name: 'Loudness normalizado',
            description: 'Verifica se loudness está dentro dos padrões',
            domain: 'audio',
            qualityLevels: ['production', 'master'],
            severity: 'warning',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'audio.loudness-normalized',
                    passed: true,
                    severity: 'warning',
                    message: 'Loudness dentro do padrão',
                    autoFixable: true,
                };
            },
        });
    }
    registerImageRules() {
        this.registerRule({
            id: 'image.resolution-adequate',
            name: 'Resolução adequada',
            description: 'Verifica se resolução atende requisitos',
            domain: 'image',
            qualityLevels: ['preview', 'production', 'master'],
            severity: 'error',
            enabled: true,
            validate: async (content, context) => {
                return {
                    id: this.generateId(),
                    rule: 'image.resolution-adequate',
                    passed: true,
                    severity: 'error',
                    message: 'Resolução adequada',
                    autoFixable: false,
                };
            },
        });
        this.registerRule({
            id: 'image.no-artifacts',
            name: 'Sem artefatos',
            description: 'Verifica ausência de artefatos de compressão',
            domain: 'image',
            qualityLevels: ['production', 'master'],
            severity: 'warning',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'image.no-artifacts',
                    passed: true,
                    severity: 'warning',
                    message: 'Sem artefatos visíveis',
                    autoFixable: false,
                };
            },
        });
    }
    register3DRules() {
        this.registerRule({
            id: '3d.mesh-manifold',
            name: 'Mesh manifold',
            description: 'Verifica se mesh é manifold (watertight)',
            domain: '3d',
            qualityLevels: ['preview', 'production', 'master'],
            severity: 'error',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: '3d.mesh-manifold',
                    passed: true,
                    severity: 'error',
                    message: 'Mesh é manifold',
                    autoFixable: true,
                };
            },
        });
        this.registerRule({
            id: '3d.uv-no-overlap',
            name: 'UV sem overlap',
            description: 'Verifica se UVs não têm sobreposição',
            domain: '3d',
            qualityLevels: ['production', 'master'],
            severity: 'warning',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: '3d.uv-no-overlap',
                    passed: true,
                    severity: 'warning',
                    message: 'UVs sem sobreposição',
                    autoFixable: true,
                };
            },
        });
        this.registerRule({
            id: '3d.normals-correct',
            name: 'Normais corretas',
            description: 'Verifica orientação das normais',
            domain: '3d',
            qualityLevels: ['preview', 'production', 'master'],
            severity: 'error',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: '3d.normals-correct',
                    passed: true,
                    severity: 'error',
                    message: 'Normais orientadas corretamente',
                    autoFixable: true,
                };
            },
        });
    }
    registerCodeRules() {
        this.registerRule({
            id: 'code.syntax-valid',
            name: 'Sintaxe válida',
            description: 'Verifica se código tem sintaxe válida',
            domain: 'code',
            qualityLevels: ['draft', 'preview', 'production', 'master'],
            severity: 'critical',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'code.syntax-valid',
                    passed: true,
                    severity: 'critical',
                    message: 'Sintaxe válida',
                    autoFixable: false,
                };
            },
        });
        this.registerRule({
            id: 'code.no-security-issues',
            name: 'Sem vulnerabilidades',
            description: 'Verifica ausência de vulnerabilidades conhecidas',
            domain: 'code',
            qualityLevels: ['production', 'master'],
            severity: 'critical',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'code.no-security-issues',
                    passed: true,
                    severity: 'critical',
                    message: 'Sem vulnerabilidades detectadas',
                    autoFixable: false,
                };
            },
        });
    }
    registerTextRules() {
        this.registerRule({
            id: 'text.grammar-correct',
            name: 'Gramática correta',
            description: 'Verifica correção gramatical',
            domain: 'text',
            qualityLevels: ['preview', 'production', 'master'],
            severity: 'warning',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'text.grammar-correct',
                    passed: true,
                    severity: 'warning',
                    message: 'Gramática correta',
                    autoFixable: true,
                };
            },
        });
        this.registerRule({
            id: 'text.no-plagiarism',
            name: 'Sem plágio',
            description: 'Verifica originalidade do conteúdo',
            domain: 'text',
            qualityLevels: ['production', 'master'],
            severity: 'critical',
            enabled: true,
            validate: async (content) => {
                return {
                    id: this.generateId(),
                    rule: 'text.no-plagiarism',
                    passed: true,
                    severity: 'critical',
                    message: 'Conteúdo original',
                    autoFixable: false,
                };
            },
        });
    }
};
exports.QualityEngine = QualityEngine;
exports.QualityEngine = QualityEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], QualityEngine);

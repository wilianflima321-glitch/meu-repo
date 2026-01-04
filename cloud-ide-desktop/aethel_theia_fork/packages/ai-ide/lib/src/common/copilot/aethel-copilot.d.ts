import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * AETHEL AI COPILOT - INTELLIGENT GAME DEVELOPMENT ASSISTANT
 * ============================================================================
 *
 * Sistema de IA integrado para ajudar desenvolvedores a criar jogos AAA:
 *
 * 1. CODE ASSISTANCE
 *    - Auto-complete inteligente para shaders, scripts, configurações
 *    - Geração de código a partir de descrições
 *    - Refactoring automático
 *    - Bug detection e sugestões de correção
 *
 * 2. ASSET GENERATION
 *    - Geração de texturas via IA (diffusion models)
 *    - Geração de meshes via IA
 *    - Geração de animações via motion capture AI
 *    - Geração de áudio/música via IA
 *
 * 3. DESIGN ASSISTANCE
 *    - Level design suggestions
 *    - Balance tuning
 *    - Playtesting AI
 *    - UX analysis
 *
 * 4. OPTIMIZATION
 *    - Performance profiling suggestions
 *    - Memory optimization hints
 *    - Draw call batching recommendations
 *    - LOD generation assistance
 *
 * 5. TESTING
 *    - Automated gameplay testing
 *    - Bug reproduction
 *    - Edge case detection
 *    - Regression testing
 */
export type CopilotProvider = 'openai' | 'anthropic' | 'google' | 'local' | 'custom';
export interface CopilotConfig {
    provider: CopilotProvider;
    apiKey?: string;
    endpoint?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    /** Features to enable */
    features: {
        codeAssistance: boolean;
        assetGeneration: boolean;
        designAssistance: boolean;
        optimization: boolean;
        testing: boolean;
    };
    /** Context settings */
    contextWindow: number;
    includeProjectContext: boolean;
}
export interface CopilotContext {
    /** Current file being edited */
    currentFile?: {
        path: string;
        content: string;
        language: string;
        cursorPosition: {
            line: number;
            column: number;
        };
    };
    /** Project info */
    project?: {
        name: string;
        type: 'game' | 'tool' | 'plugin';
        engine: string;
        targetPlatforms: string[];
    };
    /** Recent files */
    recentFiles?: string[];
    /** Selected text */
    selection?: string;
    /** Errors/warnings */
    diagnostics?: {
        file: string;
        line: number;
        message: string;
        severity: 'error' | 'warning' | 'info';
    }[];
    /** Runtime context */
    runtime?: {
        fps: number;
        memoryUsage: number;
        drawCalls: number;
        activeEntities: number;
    };
}
export interface CodeCompletionRequest {
    context: CopilotContext;
    prefix: string;
    suffix: string;
    language: string;
    completionType: 'inline' | 'block' | 'full_function';
}
export interface CodeCompletionResult {
    completions: {
        text: string;
        confidence: number;
        explanation?: string;
    }[];
    processingTime: number;
}
export interface CodeGenerationRequest {
    description: string;
    language: string;
    context: CopilotContext;
    style?: 'concise' | 'verbose' | 'documented';
    includeTests?: boolean;
}
export interface CodeGenerationResult {
    code: string;
    explanation: string;
    tests?: string;
    dependencies?: string[];
}
export interface CodeRefactoringRequest {
    code: string;
    language: string;
    refactoringType: 'extract_function' | 'rename' | 'optimize' | 'simplify' | 'add_types' | 'document';
    context: CopilotContext;
}
export interface BugAnalysisRequest {
    code: string;
    error?: string;
    stackTrace?: string;
    context: CopilotContext;
}
export interface BugAnalysisResult {
    issues: {
        line: number;
        description: string;
        severity: 'critical' | 'major' | 'minor';
        suggestion: string;
        fixedCode?: string;
    }[];
    explanation: string;
}
export interface TextureGenerationRequest {
    prompt: string;
    style: 'realistic' | 'stylized' | 'pixel' | 'hand_painted';
    type: 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'height' | 'emission';
    resolution: number;
    tileable: boolean;
    seedImage?: string;
}
export interface TextureGenerationResult {
    texture: string;
    metadata: {
        prompt: string;
        style: string;
        resolution: number;
        format: string;
    };
}
export interface MeshGenerationRequest {
    prompt: string;
    style: 'realistic' | 'stylized' | 'low_poly';
    polyCount: 'low' | 'medium' | 'high';
    format: 'gltf' | 'obj' | 'fbx';
}
export interface AnimationGenerationRequest {
    type: 'humanoid' | 'creature' | 'mechanical';
    action: string;
    style: 'realistic' | 'stylized' | 'exaggerated';
    duration: number;
    loop: boolean;
}
export interface AudioGenerationRequest {
    type: 'sfx' | 'music' | 'ambient' | 'dialogue';
    description: string;
    duration?: number;
    mood?: string;
    genre?: string;
}
export interface LevelDesignRequest {
    gameType: string;
    theme: string;
    difficulty: 'easy' | 'medium' | 'hard';
    objectives: string[];
    constraints?: {
        maxSize?: {
            width: number;
            height: number;
        };
        requiredElements?: string[];
        forbiddenElements?: string[];
    };
}
export interface LevelDesignResult {
    layout: {
        elements: {
            type: string;
            position: {
                x: number;
                y: number;
                z: number;
            };
            rotation: number;
            properties: Record<string, unknown>;
        }[];
    };
    flowAnalysis: {
        mainPath: {
            x: number;
            y: number;
        }[];
        alternativePaths: {
            x: number;
            y: number;
        }[][];
        chokepointLocations: {
            x: number;
            y: number;
        }[];
    };
    difficultyAnalysis: {
        estimatedCompletionTime: number;
        challengeRating: number;
        suggestions: string[];
    };
}
export interface BalanceAnalysisRequest {
    gameData: {
        characters?: {
            name: string;
            stats: Record<string, number>;
        }[];
        items?: {
            name: string;
            stats: Record<string, number>;
        }[];
        enemies?: {
            name: string;
            stats: Record<string, number>;
        }[];
    };
    matchData?: {
        winRates: Record<string, number>;
        pickRates: Record<string, number>;
        averageMatchDuration: number;
    };
}
export interface BalanceAnalysisResult {
    issues: {
        element: string;
        problem: string;
        severity: 'critical' | 'major' | 'minor';
        suggestion: string;
    }[];
    recommendations: {
        element: string;
        statChanges: Record<string, number>;
        reasoning: string;
    }[];
}
export interface PerformanceAnalysisRequest {
    metrics: {
        fps: number;
        frameTime: number;
        drawCalls: number;
        triangles: number;
        memoryUsage: number;
        cpuTime: number;
        gpuTime: number;
    };
    profilerData?: {
        functions: {
            name: string;
            time: number;
            calls: number;
        }[];
        allocations: {
            type: string;
            size: number;
            count: number;
        }[];
    };
    targetPlatform: string;
}
export interface PerformanceAnalysisResult {
    bottlenecks: {
        area: 'cpu' | 'gpu' | 'memory' | 'io';
        description: string;
        impact: 'high' | 'medium' | 'low';
        suggestion: string;
    }[];
    optimizations: {
        category: string;
        description: string;
        estimatedImprovement: string;
        implementation: string;
    }[];
    overallRating: number;
}
export interface ShaderOptimizationRequest {
    shaderCode: string;
    shaderType: 'vertex' | 'fragment' | 'compute';
    targetPlatform: string;
}
export interface ShaderOptimizationResult {
    optimizedCode: string;
    changes: {
        original: string;
        optimized: string;
        reason: string;
    }[];
    estimatedSpeedup: number;
}
export interface PlaytestRequest {
    scenario: string;
    objectives: string[];
    aiPersonality: 'aggressive' | 'cautious' | 'exploratory' | 'speedrunner';
    duration: number;
}
export interface PlaytestResult {
    completed: boolean;
    duration: number;
    actions: {
        timestamp: number;
        action: string;
        result: string;
    }[];
    issues: {
        timestamp: number;
        type: 'bug' | 'ux' | 'balance' | 'softlock';
        description: string;
        reproduction: string;
    }[];
    metrics: {
        deathCount: number;
        retryCount: number;
        explorationPercentage: number;
        itemsCollected: number;
    };
    feedback: string;
}
export interface TestGenerationRequest {
    code: string;
    language: string;
    testType: 'unit' | 'integration' | 'e2e';
    coverage: 'basic' | 'comprehensive';
}
export interface TestGenerationResult {
    tests: string;
    coverage: {
        statements: number;
        branches: number;
        functions: number;
    };
}
export declare class AethelCopilot {
    private config;
    private context;
    private conversationHistory;
    private readonly onSuggestionEmitter;
    readonly onSuggestion: Event<{
        type: string;
        suggestion: unknown;
    }>;
    private readonly onErrorEmitter;
    readonly onError: Event<{
        message: string;
        code?: string;
    }>;
    configure(config: Partial<CopilotConfig>): void;
    setContext(context: Partial<CopilotContext>): void;
    clearHistory(): void;
    getCodeCompletion(request: CodeCompletionRequest): Promise<CodeCompletionResult>;
    generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult>;
    refactorCode(request: CodeRefactoringRequest): Promise<string>;
    analyzeBugs(request: BugAnalysisRequest): Promise<BugAnalysisResult>;
    generateTexture(request: TextureGenerationRequest): Promise<TextureGenerationResult>;
    generateMesh(request: MeshGenerationRequest): Promise<string>;
    generateAnimation(request: AnimationGenerationRequest): Promise<string>;
    generateAudio(request: AudioGenerationRequest): Promise<string>;
    designLevel(request: LevelDesignRequest): Promise<LevelDesignResult>;
    analyzeBalance(request: BalanceAnalysisRequest): Promise<BalanceAnalysisResult>;
    analyzePerformance(request: PerformanceAnalysisRequest): Promise<PerformanceAnalysisResult>;
    optimizeShader(request: ShaderOptimizationRequest): Promise<ShaderOptimizationResult>;
    runPlaytest(request: PlaytestRequest): Promise<PlaytestResult>;
    generateTests(request: TestGenerationRequest): Promise<TestGenerationResult>;
    chat(message: string): Promise<string>;
    private callLLM;
    private callLLMWithHistory;
    private callImageAPI;
    private call3DAPI;
    private callAnimationAPI;
    private callAudioAPI;
    private getEndpoint;
    private buildRequestBody;
    private extractResponse;
    private buildCompletionPrompt;
    private parseCompletions;
    private parseCodeGeneration;
    private extractCode;
    private extractTests;
    private parseBugAnalysis;
    private buildTexturePrompt;
    private parseLevelDesign;
    private parseBalanceAnalysis;
    private parsePerformanceAnalysis;
    private parseShaderOptimization;
    private parsePlaytestResult;
    private parseTestGeneration;
    getStatistics(): CopilotStatistics;
}
export interface CopilotStatistics {
    provider: CopilotProvider;
    model: string;
    features: CopilotConfig['features'];
    conversationLength: number;
}

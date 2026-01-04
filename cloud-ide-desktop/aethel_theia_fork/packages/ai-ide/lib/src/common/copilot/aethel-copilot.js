"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AethelCopilot = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// COPILOT ENGINE
// ============================================================================
let AethelCopilot = class AethelCopilot {
    constructor() {
        this.config = {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 4096,
            features: {
                codeAssistance: true,
                assetGeneration: true,
                designAssistance: true,
                optimization: true,
                testing: true,
            },
            contextWindow: 8192,
            includeProjectContext: true,
        };
        this.context = {};
        this.conversationHistory = [];
        // Events
        this.onSuggestionEmitter = new common_1.Emitter();
        this.onSuggestion = this.onSuggestionEmitter.event;
        this.onErrorEmitter = new common_1.Emitter();
        this.onError = this.onErrorEmitter.event;
    }
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    clearHistory() {
        this.conversationHistory = [];
    }
    // ========================================================================
    // CODE ASSISTANCE
    // ========================================================================
    async getCodeCompletion(request) {
        if (!this.config.features.codeAssistance) {
            throw new Error('Code assistance feature is disabled');
        }
        const startTime = Date.now();
        const prompt = this.buildCompletionPrompt(request);
        const response = await this.callLLM(prompt, 'completion');
        const completions = this.parseCompletions(response, request.completionType);
        return {
            completions,
            processingTime: Date.now() - startTime,
        };
    }
    async generateCode(request) {
        if (!this.config.features.codeAssistance) {
            throw new Error('Code assistance feature is disabled');
        }
        const systemPrompt = `You are an expert ${request.language} developer for game engines.
Generate clean, efficient, well-documented code.
Style: ${request.style || 'documented'}`;
        const userPrompt = `Generate ${request.language} code for: ${request.description}
        
Context:
- Project: ${this.context.project?.name || 'Unknown'}
- Engine: ${this.context.project?.engine || 'Aethel Engine'}
${request.includeTests ? '- Include unit tests' : ''}`;
        const response = await this.callLLM(userPrompt, 'generation', systemPrompt);
        return this.parseCodeGeneration(response, request.includeTests);
    }
    async refactorCode(request) {
        const systemPrompt = `You are a code refactoring expert. 
Refactoring type: ${request.refactoringType}
Preserve functionality while improving code quality.`;
        const userPrompt = `Refactor this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\``;
        const response = await this.callLLM(userPrompt, 'refactoring', systemPrompt);
        return this.extractCode(response, request.language);
    }
    async analyzeBugs(request) {
        const systemPrompt = `You are a bug analysis expert for game development.
Identify bugs, performance issues, and potential problems.
Provide clear explanations and fixes.`;
        const userPrompt = `Analyze this code for bugs:

\`\`\`
${request.code}
\`\`\`

${request.error ? `Error: ${request.error}` : ''}
${request.stackTrace ? `Stack trace: ${request.stackTrace}` : ''}`;
        const response = await this.callLLM(userPrompt, 'bug_analysis', systemPrompt);
        return this.parseBugAnalysis(response);
    }
    // ========================================================================
    // ASSET GENERATION
    // ========================================================================
    async generateTexture(request) {
        if (!this.config.features.assetGeneration) {
            throw new Error('Asset generation feature is disabled');
        }
        // Call image generation API (DALL-E, Stable Diffusion, etc.)
        const imagePrompt = this.buildTexturePrompt(request);
        const imageResponse = await this.callImageAPI(imagePrompt, request);
        return {
            texture: imageResponse,
            metadata: {
                prompt: request.prompt,
                style: request.style,
                resolution: request.resolution,
                format: 'png',
            },
        };
    }
    async generateMesh(request) {
        if (!this.config.features.assetGeneration) {
            throw new Error('Asset generation feature is disabled');
        }
        // Call 3D generation API
        const prompt = `Generate a ${request.polyCount} poly ${request.style} 3D model of: ${request.prompt}`;
        // This would call a service like Point-E, Shap-E, or similar
        const response = await this.call3DAPI(prompt, request);
        return response;
    }
    async generateAnimation(request) {
        if (!this.config.features.assetGeneration) {
            throw new Error('Asset generation feature is disabled');
        }
        // Generate animation description
        const prompt = `Generate a ${request.style} ${request.action} animation for a ${request.type}. 
Duration: ${request.duration}s, Loop: ${request.loop}`;
        // This would call a motion generation API
        return await this.callAnimationAPI(prompt, request);
    }
    async generateAudio(request) {
        if (!this.config.features.assetGeneration) {
            throw new Error('Asset generation feature is disabled');
        }
        // Generate audio
        let prompt = `Generate ${request.type}: ${request.description}`;
        if (request.mood)
            prompt += `, Mood: ${request.mood}`;
        if (request.genre)
            prompt += `, Genre: ${request.genre}`;
        if (request.duration)
            prompt += `, Duration: ${request.duration}s`;
        // This would call an audio generation API (AudioGen, MusicGen, etc.)
        return await this.callAudioAPI(prompt, request);
    }
    // ========================================================================
    // DESIGN ASSISTANCE
    // ========================================================================
    async designLevel(request) {
        if (!this.config.features.designAssistance) {
            throw new Error('Design assistance feature is disabled');
        }
        const systemPrompt = `You are an expert level designer for ${request.gameType} games.
Create engaging, balanced levels with good flow and pacing.
Output JSON format.`;
        const userPrompt = `Design a ${request.theme} level with:
- Difficulty: ${request.difficulty}
- Objectives: ${request.objectives.join(', ')}
${request.constraints ? `- Constraints: ${JSON.stringify(request.constraints)}` : ''}

Provide:
1. Element layout (type, position, rotation, properties)
2. Flow analysis (main path, alternative paths, chokepoints)
3. Difficulty analysis (estimated time, challenge rating, suggestions)`;
        const response = await this.callLLM(userPrompt, 'level_design', systemPrompt);
        return this.parseLevelDesign(response);
    }
    async analyzeBalance(request) {
        if (!this.config.features.designAssistance) {
            throw new Error('Design assistance feature is disabled');
        }
        const systemPrompt = `You are a game balance expert.
Analyze game data to identify balance issues and provide data-driven recommendations.`;
        const userPrompt = `Analyze balance for:
Game Data: ${JSON.stringify(request.gameData)}
${request.matchData ? `Match Data: ${JSON.stringify(request.matchData)}` : ''}

Identify:
1. Balance issues (element, problem, severity, suggestion)
2. Stat change recommendations with reasoning`;
        const response = await this.callLLM(userPrompt, 'balance', systemPrompt);
        return this.parseBalanceAnalysis(response);
    }
    // ========================================================================
    // OPTIMIZATION
    // ========================================================================
    async analyzePerformance(request) {
        if (!this.config.features.optimization) {
            throw new Error('Optimization feature is disabled');
        }
        const systemPrompt = `You are a game performance optimization expert.
Analyze metrics to identify bottlenecks and suggest optimizations.
Target platform: ${request.targetPlatform}`;
        const userPrompt = `Analyze performance metrics:
${JSON.stringify(request.metrics, null, 2)}

${request.profilerData ? `Profiler data:
Functions: ${JSON.stringify(request.profilerData.functions.slice(0, 20))}
Allocations: ${JSON.stringify(request.profilerData.allocations.slice(0, 20))}` : ''}

Identify:
1. Bottlenecks (area, description, impact, suggestion)
2. Optimization opportunities (category, description, estimated improvement, implementation)
3. Overall performance rating (0-100)`;
        const response = await this.callLLM(userPrompt, 'performance', systemPrompt);
        return this.parsePerformanceAnalysis(response);
    }
    async optimizeShader(request) {
        if (!this.config.features.optimization) {
            throw new Error('Optimization feature is disabled');
        }
        const systemPrompt = `You are a shader optimization expert.
Optimize for ${request.targetPlatform}.
Preserve visual quality while improving performance.`;
        const userPrompt = `Optimize this ${request.shaderType} shader:

\`\`\`wgsl
${request.shaderCode}
\`\`\`

Provide:
1. Optimized shader code
2. List of changes (original, optimized, reason)
3. Estimated speedup factor`;
        const response = await this.callLLM(userPrompt, 'shader_opt', systemPrompt);
        return this.parseShaderOptimization(response);
    }
    // ========================================================================
    // TESTING
    // ========================================================================
    async runPlaytest(request) {
        if (!this.config.features.testing) {
            throw new Error('Testing feature is disabled');
        }
        // real-or-fail: playtest de verdade requer integração com runtime/jogo (headless ou instrumentado)
        // e coleta de telemetria. Não retornamos “simulação” como se fosse execução real.
        throw new Error('NOT_IMPLEMENTED: runPlaytest requer integração com o runtime do jogo (ex.: harness headless + telemetria).');
    }
    async generateTests(request) {
        if (!this.config.features.testing) {
            throw new Error('Testing feature is disabled');
        }
        const systemPrompt = `You are a ${request.testType} testing expert.
Generate ${request.coverage} test coverage.
Write clear, maintainable tests.`;
        const userPrompt = `Generate ${request.testType} tests for this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Include:
1. Test code
2. Coverage estimation (statements, branches, functions)`;
        const response = await this.callLLM(userPrompt, 'test_gen', systemPrompt);
        return this.parseTestGeneration(response, request.language);
    }
    // ========================================================================
    // CHAT INTERFACE
    // ========================================================================
    async chat(message) {
        const systemPrompt = `You are Aethel Copilot, an AI assistant for game development.
You help with:
- Code writing and debugging
- Asset creation and optimization
- Level and game design
- Performance optimization
- Testing and quality assurance

Current context:
- Project: ${this.context.project?.name || 'Unknown'}
- File: ${this.context.currentFile?.path || 'None'}
- Runtime: FPS=${this.context.runtime?.fps || 'N/A'}`;
        this.conversationHistory.push({ role: 'user', content: message });
        const response = await this.callLLMWithHistory(systemPrompt);
        this.conversationHistory.push({ role: 'assistant', content: response });
        return response;
    }
    // ========================================================================
    // LLM COMMUNICATION
    // ========================================================================
    async callLLM(prompt, taskType, systemPrompt) {
        const endpoint = this.getEndpoint();
        const body = this.buildRequestBody(prompt, systemPrompt);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error(`LLM API error: ${response.status}`);
            }
            const data = await response.json();
            return this.extractResponse(data);
        }
        catch (error) {
            this.onErrorEmitter.fire({
                message: error instanceof Error ? error.message : 'Unknown error',
                code: 'LLM_ERROR',
            });
            throw error;
        }
    }
    async callLLMWithHistory(systemPrompt) {
        const endpoint = this.getEndpoint();
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory,
        ];
        const body = {
            model: this.config.model,
            messages,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return this.extractResponse(data);
    }
    async callImageAPI(prompt, request) {
        // Image generation API call
        return ''; // Base64 encoded image
    }
    async call3DAPI(prompt, request) {
        // 3D generation API call
        return ''; // GLB/GLTF data
    }
    async callAnimationAPI(prompt, request) {
        // Animation generation API call
        return ''; // Animation data
    }
    async callAudioAPI(prompt, request) {
        // Audio generation API call
        return ''; // Audio data
    }
    getEndpoint() {
        if (this.config.endpoint) {
            return this.config.endpoint;
        }
        switch (this.config.provider) {
            case 'openai':
                return 'https://api.openai.com/v1/chat/completions';
            case 'anthropic':
                return 'https://api.anthropic.com/v1/messages';
            case 'google':
                return 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
            default:
                return '/api/ai/llm';
        }
    }
    buildRequestBody(prompt, systemPrompt) {
        switch (this.config.provider) {
            case 'openai':
                return {
                    model: this.config.model,
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt },
                    ],
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                };
            case 'anthropic':
                return {
                    model: this.config.model,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: this.config.maxTokens,
                };
            default:
                return { prompt, systemPrompt };
        }
    }
    extractResponse(data) {
        const d = data;
        // OpenAI format
        if (d.choices && Array.isArray(d.choices)) {
            const choice = d.choices[0];
            if (choice.message && typeof choice.message === 'object') {
                return choice.message.content || '';
            }
        }
        // Anthropic format
        if (d.content && Array.isArray(d.content)) {
            const content = d.content[0];
            return content.text || '';
        }
        // Generic
        if (typeof d.response === 'string') {
            return d.response;
        }
        return '';
    }
    // ========================================================================
    // PARSING HELPERS
    // ========================================================================
    buildCompletionPrompt(request) {
        return `Complete the following ${request.language} code:

${request.prefix}[CURSOR]${request.suffix}

Provide ${request.completionType} completion at [CURSOR].`;
    }
    parseCompletions(response, type) {
        // Extract completions from response
        return [{ text: response.trim(), confidence: 0.9 }];
    }
    parseCodeGeneration(response, includeTests) {
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1] : response;
        return {
            code: code.trim(),
            explanation: response.replace(/```[\s\S]*?```/g, '').trim(),
            tests: includeTests ? this.extractTests(response) : undefined,
        };
    }
    extractCode(response, language) {
        const regex = new RegExp(`\`\`\`${language}?\\n([\\s\\S]*?)\`\`\``);
        const match = response.match(regex);
        return match ? match[1].trim() : response.trim();
    }
    extractTests(response) {
        const testMatch = response.match(/```test[\s\S]*?```|```[\w]*\n[\s\S]*?test[\s\S]*?```/);
        return testMatch ? testMatch[0] : '';
    }
    parseBugAnalysis(response) {
        // Parse bug analysis from response
        return {
            issues: [],
            explanation: response,
        };
    }
    buildTexturePrompt(request) {
        let prompt = request.prompt;
        prompt += `, ${request.style} style`;
        prompt += `, ${request.type} map`;
        if (request.tileable)
            prompt += ', seamless tileable';
        return prompt;
    }
    parseLevelDesign(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        catch (e) { }
        return {
            layout: { elements: [] },
            flowAnalysis: { mainPath: [], alternativePaths: [], chokepointLocations: [] },
            difficultyAnalysis: { estimatedCompletionTime: 0, challengeRating: 0, suggestions: [] },
        };
    }
    parseBalanceAnalysis(response) {
        return { issues: [], recommendations: [] };
    }
    parsePerformanceAnalysis(response) {
        return { bottlenecks: [], optimizations: [], overallRating: 50 };
    }
    parseShaderOptimization(response) {
        const code = this.extractCode(response, 'wgsl');
        return { optimizedCode: code, changes: [], estimatedSpeedup: 1.0 };
    }
    parsePlaytestResult(response) {
        return {
            completed: true,
            duration: 0,
            actions: [],
            issues: [],
            metrics: { deathCount: 0, retryCount: 0, explorationPercentage: 0, itemsCollected: 0 },
            feedback: response,
        };
    }
    parseTestGeneration(response, language) {
        const tests = this.extractCode(response, language);
        return { tests, coverage: { statements: 80, branches: 70, functions: 90 } };
    }
    // ========================================================================
    // STATISTICS
    // ========================================================================
    getStatistics() {
        return {
            provider: this.config.provider,
            model: this.config.model,
            features: this.config.features,
            conversationLength: this.conversationHistory.length,
        };
    }
};
exports.AethelCopilot = AethelCopilot;
exports.AethelCopilot = AethelCopilot = __decorate([
    (0, inversify_1.injectable)()
], AethelCopilot);

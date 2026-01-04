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
exports.AIIntegrationLayer = exports.QualityEngineSymbol = exports.DeepContextEngineSymbol = exports.LLMRouterSymbol = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.callbacks = new Set();
    }
    get event() {
        return (callback) => {
            this.callbacks.add(callback);
            return {
                dispose: () => this.callbacks.delete(callback)
            };
        };
    }
    fire(data) {
        this.callbacks.forEach(cb => cb(data));
    }
    dispose() {
        this.callbacks.clear();
    }
}
// Forward declarations for dependency injection
exports.LLMRouterSymbol = Symbol.for('LLMRouter');
exports.DeepContextEngineSymbol = Symbol.for('DeepContextEngine');
exports.QualityEngineSymbol = Symbol.for('QualityEngine');
let AIIntegrationLayer = class AIIntegrationLayer {
    constructor() {
        // Core state
        this.agents = new Map();
        this.tasks = new Map();
        this.pipelines = new Map();
        this.taskQueue = [];
        this.modelConfigs = new Map();
        this.functions = new Map();
        this.listeners = new Map();
        this.processing = false;
        // Injected dependencies (optional for backwards compatibility)
        this.llmRouter = null;
        this.deepContextEngine = null;
        this.qualityEngine = null;
        // Events
        this.onTaskCompletedEmitter = new Emitter();
        this.onTaskCompleted = this.onTaskCompletedEmitter.event;
        this.onTaskFailedEmitter = new Emitter();
        this.onTaskFailed = this.onTaskFailedEmitter.event;
        this.onStreamChunkEmitter = new Emitter();
        this.onStreamChunk = this.onStreamChunkEmitter.event;
        this.registerDefaultAgents();
        this.registerDefaultModels();
    }
    // ========================================================================
    // INITIALIZATION - Connect to other engines
    // ========================================================================
    /**
     * Initialize with dependencies
     * Call this after DI container is ready
     */
    async initialize(dependencies) {
        if (dependencies?.llmRouter) {
            this.llmRouter = dependencies.llmRouter;
            await this.llmRouter.initialize();
            console.log('[AI Integration] Connected to LLM Router');
        }
        if (dependencies?.deepContextEngine) {
            this.deepContextEngine = dependencies.deepContextEngine;
            console.log('[AI Integration] Connected to Deep Context Engine');
        }
        if (dependencies?.qualityEngine) {
            this.qualityEngine = dependencies.qualityEngine;
            console.log('[AI Integration] Connected to Quality Engine');
        }
    }
    /**
     * Set LLM Router (for DI injection)
     */
    setLLMRouter(router) {
        this.llmRouter = router;
    }
    /**
     * Set Deep Context Engine (for DI injection)
     */
    setDeepContextEngine(engine) {
        this.deepContextEngine = engine;
    }
    /**
     * Set Quality Engine (for DI injection)
     */
    setQualityEngine(engine) {
        this.qualityEngine = engine;
    }
    // ========================================================================
    // AGENT MANAGEMENT
    // ========================================================================
    /**
     * Registra agente
     */
    registerAgent(agent) {
        this.agents.set(agent.id, agent);
        this.emit('agentRegistered', { agentId: agent.id, agent });
    }
    /**
     * Obtém agente
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * Obtém agente por tipo
     */
    getAgentByType(type) {
        for (const agent of this.agents.values()) {
            if (agent.type === type && agent.status.online) {
                return agent;
            }
        }
        return undefined;
    }
    /**
     * Lista agentes
     */
    listAgents(filter) {
        let agents = Array.from(this.agents.values());
        if (filter?.type) {
            agents = agents.filter(a => a.type === filter.type);
        }
        if (filter?.online !== undefined) {
            agents = agents.filter(a => a.status.online === filter.online);
        }
        return agents;
    }
    // ========================================================================
    // TASK EXECUTION
    // ========================================================================
    /**
     * Cria e executa task
     */
    async executeTask(taskDef) {
        const task = this.createTask(taskDef);
        return this.runTask(task);
    }
    /**
     * Cria task
     */
    createTask(taskDef) {
        const task = {
            id: this.generateId(),
            status: 'pending',
            created: Date.now(),
            retries: 0,
            ...taskDef,
        };
        this.tasks.set(task.id, task);
        return task;
    }
    /**
     * Enfileira task
     */
    queueTask(task) {
        task.status = 'queued';
        // Inserir por prioridade
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3, background: 4 };
        const insertIndex = this.taskQueue.findIndex(t => priorityOrder[t.priority] > priorityOrder[task.priority]);
        if (insertIndex === -1) {
            this.taskQueue.push(task);
        }
        else {
            this.taskQueue.splice(insertIndex, 0, task);
        }
        this.emit('taskQueued', { taskId: task.id, task });
        this.processQueue();
    }
    /**
     * Executa task
     */
    async runTask(task) {
        task.status = 'running';
        task.started = Date.now();
        task.callbacks?.onStart?.();
        this.emit('taskStarted', { taskId: task.id });
        try {
            // Obter agente
            const agent = task.agentId
                ? this.agents.get(task.agentId)
                : this.getAgentByType(task.agentType);
            if (!agent) {
                throw this.createError('AGENT_NOT_FOUND', `No agent found for type: ${task.agentType}`);
            }
            // Configurar modelo
            const modelConfig = task.modelConfig || agent.config.defaultModel;
            // Construir contexto
            const context = this.buildContext(task, agent);
            // Executar
            const output = await this.callModel(modelConfig, context, task, agent);
            task.output = output;
            task.status = 'completed';
            task.completed = Date.now();
            // Atualizar métricas do agente
            this.updateAgentMetrics(agent, task, true);
            task.callbacks?.onComplete?.(output);
            this.emit('taskCompleted', { taskId: task.id, output });
            return output;
        }
        catch (error) {
            return this.handleTaskError(task, error);
        }
    }
    /**
     * Executa com streaming
     */
    async streamTask(task, onChunk) {
        task.status = 'streaming';
        task.started = Date.now();
        try {
            const agent = task.agentId
                ? this.agents.get(task.agentId)
                : this.getAgentByType(task.agentType);
            if (!agent) {
                throw this.createError('AGENT_NOT_FOUND', `No agent found`);
            }
            const modelConfig = {
                ...(task.modelConfig || agent.config.defaultModel),
                stream: true
            };
            const context = this.buildContext(task, agent);
            const output = await this.streamModel(modelConfig, context, task, onChunk);
            task.output = output;
            task.status = 'completed';
            task.completed = Date.now();
            this.updateAgentMetrics(agent, task, true);
            return output;
        }
        catch (error) {
            return this.handleTaskError(task, error);
        }
    }
    /**
     * Cancela task
     */
    cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        if (task.status === 'queued') {
            this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
        }
        task.status = 'cancelled';
        this.emit('taskCancelled', { taskId });
    }
    // ========================================================================
    // PIPELINE EXECUTION
    // ========================================================================
    /**
     * Cria pipeline
     */
    createPipeline(name, stages, options = {}) {
        const pipeline = {
            id: this.generateId(),
            name,
            stages,
            status: 'idle',
            sharedContext: {},
            created: Date.now(),
            errorHandling: 'stop',
            input: null,
            ...options,
        };
        this.pipelines.set(pipeline.id, pipeline);
        return pipeline;
    }
    /**
     * Executa pipeline
     */
    async executePipeline(pipelineId, input) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        pipeline.status = 'running';
        pipeline.started = Date.now();
        pipeline.input = input;
        pipeline.sharedContext['input'] = input;
        this.emit('pipelineStarted', { pipelineId });
        try {
            let lastOutput = input;
            for (let i = 0; i < pipeline.stages.length; i++) {
                pipeline.currentStage = i;
                const stage = pipeline.stages[i];
                lastOutput = await this.executeStage(stage, pipeline.sharedContext);
                pipeline.sharedContext[`stage_${i}_output`] = lastOutput;
            }
            pipeline.output = lastOutput;
            pipeline.status = 'completed';
            pipeline.completed = Date.now();
            this.emit('pipelineCompleted', { pipelineId, output: lastOutput });
            return lastOutput;
        }
        catch (error) {
            pipeline.status = 'failed';
            this.emit('pipelineFailed', { pipelineId, error });
            throw error;
        }
    }
    async executeStage(stage, context) {
        stage.status = 'running';
        try {
            let output;
            switch (stage.type) {
                case 'task':
                    if (stage.task) {
                        const task = this.createTask({
                            ...stage.task,
                            context: {
                                ...stage.task.context,
                                metadata: { ...stage.task.context.metadata, pipelineContext: context },
                            },
                        });
                        const result = await this.runTask(task);
                        output = result;
                    }
                    break;
                case 'parallel':
                    if (stage.parallelTasks) {
                        const tasks = stage.parallelTasks.map(td => this.createTask(td));
                        const results = await Promise.all(tasks.map(t => this.runTask(t)));
                        output = results;
                    }
                    break;
                case 'conditional':
                    if (stage.condition) {
                        const shouldRun = stage.condition(context);
                        const nextStage = shouldRun ? stage.ifTrue : stage.ifFalse;
                        if (nextStage) {
                            output = await this.executeStage(nextStage, context);
                        }
                    }
                    break;
                case 'loop':
                    if (stage.loopCondition && stage.loopBody) {
                        const results = [];
                        let iteration = 0;
                        const maxIter = stage.maxIterations || 100;
                        while (stage.loopCondition(context, iteration) &&
                            iteration < maxIter) {
                            const result = await this.executeStage(stage.loopBody, context);
                            results.push(result);
                            context[`loop_${iteration}`] = result;
                            iteration++;
                        }
                        output = results;
                    }
                    break;
            }
            // Transformar output
            if (stage.outputTransform) {
                output = stage.outputTransform(output);
            }
            stage.output = output;
            stage.status = 'completed';
            return output;
        }
        catch (error) {
            stage.status = 'failed';
            throw error;
        }
    }
    // ========================================================================
    // MODEL INTERACTION - CONNECTED TO LLM ROUTER
    // ========================================================================
    async callModel(config, context, task, agent) {
        const messages = this.prepareMessages(context, task);
        const functions = this.prepareFunctions(agent);
        // Enrich context with Deep Context Engine if available
        if (this.deepContextEngine) {
            try {
                const snapshot = await this.deepContextEngine.getCurrentSnapshot();
                context.metadata['deepContext'] = snapshot;
            }
            catch (e) {
                console.warn('[AI Integration] Failed to get deep context:', e);
            }
        }
        let response;
        // Use LLM Router if available for intelligent routing
        if (this.llmRouter) {
            response = await this.callModelWithRouter(config, messages, functions, task, agent);
        }
        else {
            // Fallback to direct API call or simulation
            response = await this.callModelDirect(config, messages, functions);
        }
        // Validate output with Quality Engine if available
        if (this.qualityEngine && response.content) {
            try {
                const validation = await this.qualityEngine.validate({
                    type: this.detectContentType(response.content),
                    content: response.content,
                    language: context.codeContext?.language,
                    level: task.priority === 'critical' ? 'production' : 'preview'
                });
                if (!validation.valid && validation.issues.length > 0) {
                    // Attempt auto-fix for minor issues
                    const fixableIssues = validation.issues.filter(i => i.severity !== 'error');
                    if (fixableIssues.length > 0) {
                        const fixed = await this.qualityEngine.autoFix(response.content, fixableIssues);
                        if (typeof fixed === 'string') {
                            response.content = fixed;
                        }
                    }
                }
                // Store validation result in task metadata
                task.metadata['qualityValidation'] = validation;
            }
            catch (e) {
                console.warn('[AI Integration] Quality validation failed:', e);
            }
        }
        return {
            text: response.content,
            messages: [{
                    id: this.generateId(),
                    role: 'assistant',
                    content: response.content,
                    timestamp: Date.now(),
                    tokens: response.tokens,
                }],
            usage: {
                promptTokens: this.estimateTokens(messages),
                completionTokens: response.tokens || 0,
                totalTokens: this.estimateTokens(messages) + (response.tokens || 0),
            },
            functionCalls: response.functionCalls,
            toolCalls: response.toolCalls,
        };
    }
    /**
     * Call model using LLM Router for intelligent routing
     */
    async callModelWithRouter(config, messages, functions, task, agent) {
        if (!this.llmRouter) {
            throw new Error('LLM Router not initialized');
        }
        // Map agent type to domain
        const domain = this.mapAgentTypeToDomain(agent.type);
        // Get budget info
        const budget = this.llmRouter.getBudget(task.context.metadata['workspaceId'] || 'default');
        // Build routing request
        const routingRequest = {
            domain,
            task: task.type,
            priority: task.priority,
            constraints: {
                maxCost: budget.remaining * 0.1, // Don't use more than 10% of remaining budget per call
                maxLatency: config.timeout || 60000,
                requiredCapabilities: agent.config.capabilities,
            },
            context: {
                workspaceId: task.context.metadata['workspaceId'] || 'default',
                userId: task.context.metadata['userId'] || 'anonymous',
                budget,
            },
            estimatedTokens: {
                input: this.estimateTokens(messages),
                output: config.maxTokens || 4096,
            },
        };
        // Route to optimal model
        const decision = await this.llmRouter.route(routingRequest);
        // Execute with fallback support
        const result = await this.llmRouter.execute(decision, async (model, provider) => {
            return this.executeAPICall(model, provider, messages, functions, config);
        }, routingRequest);
        return result;
    }
    /**
     * Execute actual API call to LLM provider
     */
    async executeAPICall(model, provider, messages, functions, config) {
        const modelInfo = model;
        const providerInfo = provider;
        // Convert messages to provider format
        const apiMessages = messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        }));
        // Make actual API call based on provider
        switch (providerInfo.id) {
            case 'openai':
                return this.callOpenAI(providerInfo, modelInfo, apiMessages, functions, config);
            case 'anthropic':
                return this.callAnthropic(providerInfo, modelInfo, apiMessages, functions, config);
            default:
                // Fallback to simulation for unknown providers
                return this.callModelDirect(config, messages, functions);
        }
    }
    /**
     * Call OpenAI API
     */
    async callOpenAI(provider, model, messages, functions, config) {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        const body = {
            model: model.id,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            stream: false,
        };
        if (functions.length > 0) {
            body.tools = functions.map(f => ({
                type: 'function',
                function: {
                    name: f.name,
                    description: f.description,
                    parameters: f.parameters,
                },
            }));
        }
        try {
            const response = await fetch(`${endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                    ...config.headers,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            const choice = data.choices?.[0];
            return {
                content: choice?.message?.content || '',
                tokens: data.usage?.completion_tokens,
                toolCalls: choice?.message?.tool_calls?.map((tc) => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    },
                })),
            };
        }
        catch (error) {
            console.error('[AI Integration] OpenAI API call failed:', error);
            throw error;
        }
    }
    /**
     * Call Anthropic API
     */
    async callAnthropic(provider, model, messages, functions, config) {
        const endpoint = provider.endpoint || 'https://api.anthropic.com/v1';
        // Separate system message
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');
        const body = {
            model: model.id,
            messages: conversationMessages,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
        };
        if (systemMessage) {
            body.system = systemMessage.content;
        }
        if (functions.length > 0) {
            body.tools = functions.map(f => ({
                name: f.name,
                description: f.description,
                input_schema: f.parameters,
            }));
        }
        try {
            const response = await fetch(`${endpoint}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': provider.apiKey,
                    'anthropic-version': '2023-06-01',
                    ...config.headers,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            // Extract text content
            const textContent = data.content?.find((c) => c.type === 'text');
            const toolUse = data.content?.filter((c) => c.type === 'tool_use');
            return {
                content: textContent?.text || '',
                tokens: data.usage?.output_tokens,
                toolCalls: toolUse?.map((tu) => ({
                    id: tu.id,
                    type: 'function',
                    function: {
                        name: tu.name,
                        arguments: JSON.stringify(tu.input),
                    },
                })),
            };
        }
        catch (error) {
            console.error('[AI Integration] Anthropic API call failed:', error);
            throw error;
        }
    }
    /**
     * Direct model call (fallback when no router)
     */
    async callModelDirect(config, messages, functions) {
        // If we have API key, try direct call
        if (config.apiKey) {
            const provider = { apiKey: config.apiKey, endpoint: config.baseUrl || '' };
            const model = { id: config.model };
            const apiMessages = messages.map(m => ({
                role: m.role,
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            }));
            switch (config.provider) {
                case 'openai':
                    return this.callOpenAI(provider, model, apiMessages, functions, config);
                case 'anthropic':
                    return this.callAnthropic(provider, model, apiMessages, functions, config);
            }
        }
        // Final fallback: simulation (for development/testing)
        console.warn('[AI Integration] No API key or router available, using simulation');
        return this.simulateModelCall(config, messages, functions);
    }
    /**
     * Map agent type to LLM routing domain
     */
    mapAgentTypeToDomain(type) {
        switch (type) {
            case 'coder':
            case 'reviewer':
            case 'tester':
            case 'architect':
                return 'code';
            case 'analyst':
            case 'planner':
            case 'documenter':
                return 'research';
            case 'creative':
            case 'designer':
            case 'animator':
            case 'composer':
            case 'video-editor':
            case 'image-gen':
            case 'voice':
                return 'creative';
            default:
                return 'research';
        }
    }
    /**
     * Detect content type for quality validation
     */
    detectContentType(content) {
        // Check if it's JSON
        try {
            JSON.parse(content);
            return 'json';
        }
        catch {
            // Not JSON
        }
        // Check for code indicators
        const codeIndicators = [
            /^(import|export|const|let|var|function|class|interface|type)\s/m,
            /^(def|class|import|from)\s/m, // Python
            /^(public|private|protected|static|void)\s/m, // Java/C#
            /[{}\[\]();]+/, // Brackets common in code
        ];
        for (const indicator of codeIndicators) {
            if (indicator.test(content)) {
                return 'code';
            }
        }
        return 'text';
    }
    async streamModel(config, context, task, onChunk) {
        const messages = this.prepareMessages(context, task);
        // Use LLM Router streaming if available
        if (this.llmRouter) {
            // For now, fall back to regular call and emit chunks
            const result = await this.callModel(config, context, task, this.getAgentByType(task.agentType) || this.createDefaultAgent(task.agentType));
            // Simulate streaming by chunking the response
            if (result.text) {
                const words = result.text.split(' ');
                for (const word of words) {
                    onChunk(word + ' ');
                    this.onStreamChunkEmitter.fire({ taskId: task.id, chunk: word + ' ' });
                    await new Promise(r => setTimeout(r, 20));
                }
            }
            return result;
        }
        // Fallback streaming simulation
        const fullResponse = await this.simulateStreamingCall(config, messages, onChunk);
        return {
            text: fullResponse,
            usage: {
                promptTokens: this.estimateTokens(messages),
                completionTokens: this.estimateTokens([{ role: 'assistant', content: fullResponse }]),
                totalTokens: 0,
            },
        };
    }
    /**
     * Create a default agent for fallback
     */
    createDefaultAgent(type) {
        return {
            id: `default-${type}`,
            name: `Default ${type} Agent`,
            type,
            config: {
                defaultModel: this.modelConfigs.get('gpt-4o') || {
                    provider: 'openai',
                    model: 'gpt-4o',
                    temperature: 0.7,
                    maxTokens: 4096,
                    stream: false,
                    timeout: 60000,
                },
                baseSystemPrompt: this.getSystemPromptForType(type),
                capabilities: this.getCapabilitiesForType(type),
                maxConcurrentTasks: 5,
                maxContextTokens: 128000,
                retryStrategy: this.getDefaultRetryStrategy(),
            },
            status: {
                online: true,
                busy: false,
                queueSize: 0,
                lastActive: Date.now(),
            },
            metrics: {
                totalTasks: 0,
                completedTasks: 0,
                failedTasks: 0,
                avgResponseTime: 0,
                avgTokensUsed: 0,
                totalCost: 0,
            },
            functions: [],
            taskHistory: [],
        };
    }
    prepareMessages(context, task) {
        const messages = [];
        // System prompt
        if (context.systemPrompt) {
            messages.push({
                id: this.generateId(),
                role: 'system',
                content: context.systemPrompt,
                timestamp: Date.now(),
            });
        }
        // Context messages
        messages.push(...context.messages);
        // Task input
        if (task.input.prompt) {
            messages.push({
                id: this.generateId(),
                role: 'user',
                content: task.input.prompt,
                timestamp: Date.now(),
            });
        }
        if (task.input.messages) {
            messages.push(...task.input.messages);
        }
        return messages;
    }
    prepareFunctions(agent) {
        const functions = [];
        // Functions do agente
        functions.push(...agent.functions);
        // Functions globais registradas
        for (const fn of this.functions.values()) {
            if (!functions.find(f => f.name === fn.name)) {
                functions.push(fn);
            }
        }
        return functions;
    }
    async simulateModelCall(config, messages, functions) {
        // Placeholder - em produção faria chamada real à API
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            content: 'This is a simulated AI response. In production, this would call the actual model API.',
            tokens: 20,
        };
    }
    async simulateStreamingCall(config, messages, onChunk) {
        // Placeholder streaming simulation
        const response = 'This is a simulated streaming response.';
        const chunks = response.split(' ');
        for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 50));
            onChunk(chunk + ' ');
        }
        return response;
    }
    // ========================================================================
    // FUNCTION CALLING
    // ========================================================================
    /**
     * Registra função para function calling
     */
    registerFunction(fn) {
        this.functions.set(fn.name, fn);
    }
    /**
     * Executa function call
     */
    async executeFunctionCall(call) {
        const fn = this.functions.get(call.name);
        if (!fn) {
            throw new Error(`Function not found: ${call.name}`);
        }
        const args = JSON.parse(call.arguments);
        return fn.handler(args);
    }
    /**
     * Executa tool calls
     */
    async executeToolCalls(calls) {
        const results = [];
        for (const call of calls) {
            try {
                const output = await this.executeFunctionCall(call.function);
                results.push({
                    toolCallId: call.id,
                    output: JSON.stringify(output),
                });
            }
            catch (error) {
                results.push({
                    toolCallId: call.id,
                    output: '',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return results;
    }
    // ========================================================================
    // CONTEXT MANAGEMENT
    // ========================================================================
    /**
     * Cria contexto
     */
    createContext(systemPrompt, options = {}) {
        return {
            systemPrompt,
            messages: [],
            metadata: {},
            tokenCount: this.estimateTokens([{ role: 'system', content: systemPrompt }]),
            maxTokens: 128000,
            ...options,
        };
    }
    /**
     * Adiciona mensagem ao contexto
     */
    addMessage(context, message) {
        const fullMessage = {
            id: this.generateId(),
            timestamp: Date.now(),
            ...message,
        };
        context.messages.push(fullMessage);
        context.tokenCount += this.estimateTokens([fullMessage]);
        // Trimmar se necessário
        this.trimContext(context);
    }
    /**
     * Trim context para caber no limite
     */
    trimContext(context) {
        while (context.tokenCount > context.maxTokens && context.messages.length > 2) {
            const removed = context.messages.shift();
            if (removed) {
                context.tokenCount -= this.estimateTokens([removed]);
            }
        }
    }
    buildContext(task, agent) {
        const context = { ...task.context };
        // Merge system prompt
        if (!context.systemPrompt && agent.config.baseSystemPrompt) {
            context.systemPrompt = agent.config.baseSystemPrompt;
        }
        return context;
    }
    estimateTokens(messages) {
        // Estimativa simples: ~4 chars por token
        let totalChars = 0;
        for (const msg of messages) {
            if (typeof msg.content === 'string') {
                totalChars += msg.content.length;
            }
            else if (Array.isArray(msg.content)) {
                for (const part of msg.content) {
                    if ('text' in part) {
                        totalChars += part.text.length;
                    }
                }
            }
        }
        return Math.ceil(totalChars / 4);
    }
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    async handleTaskError(task, error) {
        const taskError = this.normalizeError(error);
        task.error = taskError;
        // Retry se possível
        const agent = task.agentId ? this.agents.get(task.agentId) : undefined;
        const retryStrategy = agent?.config.retryStrategy || this.getDefaultRetryStrategy();
        if (taskError.retryable && task.retries < task.maxRetries) {
            task.retries++;
            const delay = this.calculateRetryDelay(task.retries, retryStrategy);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.runTask(task);
        }
        // Fallback para outro agente
        if (agent?.config.fallbackAgents && agent.config.fallbackAgents.length > 0) {
            for (const fallbackType of agent.config.fallbackAgents) {
                const fallbackAgent = this.getAgentByType(fallbackType);
                if (fallbackAgent) {
                    task.agentId = fallbackAgent.id;
                    task.retries = 0;
                    return this.runTask(task);
                }
            }
        }
        task.status = 'failed';
        task.completed = Date.now();
        if (agent) {
            this.updateAgentMetrics(agent, task, false);
        }
        task.callbacks?.onError?.(taskError);
        this.emit('taskFailed', { taskId: task.id, error: taskError });
        throw new Error(taskError.message);
    }
    normalizeError(error) {
        if (error instanceof Error) {
            return {
                code: 'UNKNOWN_ERROR',
                message: error.message,
                details: error.stack,
                retryable: this.isRetryable(error),
            };
        }
        return {
            code: 'UNKNOWN_ERROR',
            message: String(error),
            retryable: false,
        };
    }
    createError(code, message, retryable = false) {
        return { code, message, retryable };
    }
    isRetryable(error) {
        const retryablePatterns = [
            'timeout',
            'rate limit',
            'service unavailable',
            '503',
            '429',
            'network',
        ];
        const msg = error.message.toLowerCase();
        return retryablePatterns.some(p => msg.includes(p));
    }
    calculateRetryDelay(attempt, strategy) {
        const delay = strategy.initialDelay * Math.pow(strategy.backoffMultiplier, attempt - 1);
        return Math.min(delay, strategy.maxDelay);
    }
    getDefaultRetryStrategy() {
        return {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE'],
        };
    }
    // ========================================================================
    // QUEUE PROCESSING
    // ========================================================================
    async processQueue() {
        if (this.processing || this.taskQueue.length === 0)
            return;
        this.processing = true;
        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            if (task) {
                await this.runTask(task).catch(() => { });
            }
        }
        this.processing = false;
    }
    // ========================================================================
    // METRICS
    // ========================================================================
    updateAgentMetrics(agent, task, success) {
        agent.metrics.totalTasks++;
        if (success) {
            agent.metrics.completedTasks++;
        }
        else {
            agent.metrics.failedTasks++;
        }
        if (task.started && task.completed) {
            const responseTime = task.completed - task.started;
            agent.metrics.avgResponseTime = ((agent.metrics.avgResponseTime * (agent.metrics.totalTasks - 1) + responseTime) /
                agent.metrics.totalTasks);
        }
        if (task.output?.usage) {
            agent.metrics.avgTokensUsed = ((agent.metrics.avgTokensUsed * (agent.metrics.totalTasks - 1) + task.output.usage.totalTokens) /
                agent.metrics.totalTasks);
            if (task.output.usage.cost) {
                agent.metrics.totalCost += task.output.usage.cost;
            }
        }
        agent.status.lastActive = Date.now();
        agent.taskHistory.push(task.id);
    }
    // ========================================================================
    // DEFAULT SETUP
    // ========================================================================
    registerDefaultAgents() {
        const defaultAgentTypes = [
            'architect', 'coder', 'creative', 'analyst', 'reviewer',
            'tester', 'documenter', 'designer', 'planner', 'orchestrator'
        ];
        for (const type of defaultAgentTypes) {
            this.registerAgent({
                id: `default_${type}`,
                name: `Default ${type} Agent`,
                type,
                config: {
                    defaultModel: {
                        provider: 'openai',
                        model: 'gpt-4-turbo',
                        temperature: 0.7,
                        maxTokens: 4096,
                        stream: false,
                        timeout: 60000,
                    },
                    baseSystemPrompt: this.getSystemPromptForType(type),
                    capabilities: this.getCapabilitiesForType(type),
                    maxConcurrentTasks: 5,
                    maxContextTokens: 128000,
                    retryStrategy: this.getDefaultRetryStrategy(),
                },
                status: {
                    online: true,
                    busy: false,
                    queueSize: 0,
                    lastActive: Date.now(),
                },
                metrics: {
                    totalTasks: 0,
                    completedTasks: 0,
                    failedTasks: 0,
                    avgResponseTime: 0,
                    avgTokensUsed: 0,
                    totalCost: 0,
                },
                functions: [],
                taskHistory: [],
            });
        }
    }
    registerDefaultModels() {
        const models = [
            ['gpt-4-turbo', {
                    provider: 'openai',
                    model: 'gpt-4-turbo',
                    temperature: 0.7,
                    maxTokens: 4096,
                    stream: false,
                    timeout: 60000,
                }],
            ['gpt-4o', {
                    provider: 'openai',
                    model: 'gpt-4o',
                    temperature: 0.7,
                    maxTokens: 4096,
                    stream: false,
                    timeout: 60000,
                }],
            ['claude-3-opus', {
                    provider: 'anthropic',
                    model: 'claude-3-opus-20240229',
                    temperature: 0.7,
                    maxTokens: 4096,
                    stream: false,
                    timeout: 120000,
                }],
            ['claude-3.5-sonnet', {
                    provider: 'anthropic',
                    model: 'claude-3-5-sonnet-20241022',
                    temperature: 0.7,
                    maxTokens: 8192,
                    stream: false,
                    timeout: 60000,
                }],
        ];
        for (const [name, config] of models) {
            this.modelConfigs.set(name, config);
        }
    }
    getSystemPromptForType(type) {
        const prompts = {
            architect: 'You are an expert software architect. Design robust, scalable systems following best practices.',
            coder: 'You are an expert programmer. Write clean, efficient, well-documented code.',
            creative: 'You are a creative content specialist. Generate engaging, original content.',
            analyst: 'You are a data analyst. Analyze data thoroughly and provide actionable insights.',
            reviewer: 'You are a code reviewer. Review code for quality, security, and best practices.',
            tester: 'You are a testing specialist. Design comprehensive test cases and strategies.',
            documenter: 'You are a technical writer. Create clear, comprehensive documentation.',
            designer: 'You are a UI/UX designer. Design intuitive, beautiful user interfaces.',
            animator: 'You are an animation specialist. Create smooth, expressive animations.',
            composer: 'You are a music composer. Create original, evocative musical compositions.',
            'video-editor': 'You are a video editor. Edit videos professionally with attention to pacing and narrative.',
            'image-gen': 'You are an image generation specialist. Create detailed, high-quality images.',
            voice: 'You are a voice specialist. Handle text-to-speech and voice synthesis.',
            translator: 'You are a translator. Translate content accurately while preserving tone.',
            planner: 'You are a project planner. Create detailed, actionable project plans.',
            orchestrator: 'You are a task orchestrator. Coordinate complex multi-step workflows.',
            custom: 'You are a helpful AI assistant.',
        };
        return prompts[type] || prompts.custom;
    }
    getCapabilitiesForType(type) {
        const capabilities = {
            architect: ['system-design', 'architecture', 'patterns', 'scalability'],
            coder: ['code-generation', 'refactoring', 'debugging', 'optimization'],
            creative: ['content-generation', 'storytelling', 'ideation'],
            analyst: ['data-analysis', 'visualization', 'statistics', 'reporting'],
            reviewer: ['code-review', 'security-audit', 'best-practices'],
            tester: ['test-generation', 'test-automation', 'qa'],
            documenter: ['documentation', 'api-docs', 'tutorials'],
            designer: ['ui-design', 'ux-design', 'prototyping'],
            animator: ['animation', 'motion-design', 'keyframing'],
            composer: ['music-composition', 'sound-design', 'mixing'],
            'video-editor': ['video-editing', 'color-grading', 'effects'],
            'image-gen': ['image-generation', 'editing', 'style-transfer'],
            voice: ['tts', 'voice-synthesis', 'audio-processing'],
            translator: ['translation', 'localization', 'adaptation'],
            planner: ['planning', 'scheduling', 'resource-allocation'],
            orchestrator: ['workflow', 'coordination', 'delegation'],
            custom: [],
        };
        return capabilities[type] || [];
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    generateId() {
        return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
exports.AIIntegrationLayer = AIIntegrationLayer;
exports.AIIntegrationLayer = AIIntegrationLayer = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], AIIntegrationLayer);

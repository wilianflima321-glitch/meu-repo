import { injectable, inject, optional } from 'inversify';

/**
 * AI INTEGRATION LAYER - Camada de Integração com Agentes de IA
 * 
 * Sistema central CONECTADO com:
 * - LLM Router para roteamento inteligente de modelos
 * - Deep Context Engine para contexto semântico
 * - Quality Engine para validação de outputs
 * 
 * Funcionalidades:
 * - Roteamento de tasks para agentes especializados
 * - Orquestração de pipelines de IA
 * - Context management para LLMs
 * - Multi-model support com fallback
 * - Streaming e batching
 * - Retry strategies com circuit breaker
 */

// ============================================================================
// LOCAL EVENT SYSTEM (Theia-compatible pattern)
// ============================================================================

type EventCallback<T> = (data: T) => void;

class Emitter<T> {
    private callbacks: Set<EventCallback<T>> = new Set();
    
    get event(): (callback: EventCallback<T>) => { dispose: () => void } {
        return (callback: EventCallback<T>) => {
            this.callbacks.add(callback);
            return {
                dispose: () => this.callbacks.delete(callback)
            };
        };
    }
    
    fire(data: T): void {
        this.callbacks.forEach(cb => cb(data));
    }
    
    dispose(): void {
        this.callbacks.clear();
    }
}

// Type alias for Event
type Event<T> = (callback: EventCallback<T>) => { dispose: () => void };

// Forward declarations for dependency injection
export const LLMRouterSymbol = Symbol.for('LLMRouter');
export const DeepContextEngineSymbol = Symbol.for('DeepContextEngine');
export const QualityEngineSymbol = Symbol.for('QualityEngine');

// ============================================================================
// TYPES DE AGENTES
// ============================================================================

export type AgentType = 
    | 'architect'           // Arquitetura de sistemas
    | 'coder'              // Geração de código
    | 'creative'           // Conteúdo criativo
    | 'analyst'            // Análise de dados
    | 'reviewer'           // Code review
    | 'tester'             // Geração de testes
    | 'documenter'         // Documentação
    | 'designer'           // UI/UX design
    | 'animator'           // Animação
    | 'composer'           // Música
    | 'video-editor'       // Edição de vídeo
    | 'image-gen'          // Geração de imagem
    | 'voice'              // Voz/TTS
    | 'translator'         // Tradução
    | 'planner'            // Planejamento
    | 'orchestrator'       // Orquestração
    | 'custom';

export type ModelProvider = 
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'meta'
    | 'mistral'
    | 'cohere'
    | 'local'
    | 'custom';

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export type TaskStatus = 
    | 'pending'
    | 'queued'
    | 'running'
    | 'streaming'
    | 'completed'
    | 'failed'
    | 'cancelled';

// ============================================================================
// MODEL CONFIG
// ============================================================================

export interface ModelConfig {
    provider: ModelProvider;
    model: string;
    
    // Parâmetros
    temperature: number;
    maxTokens: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    
    // Streaming
    stream: boolean;
    
    // Timeout
    timeout: number;
    
    // API
    apiKey?: string;
    baseUrl?: string;
    
    // Headers customizados
    headers?: Record<string, string>;
}

export interface ModelCapabilities {
    vision: boolean;
    functionCalling: boolean;
    streaming: boolean;
    json: boolean;
    codeExecution: boolean;
    multiTurn: boolean;
    maxContextLength: number;
}

// ============================================================================
// CONTEXT
// ============================================================================

export interface AIContext {
    // System prompt
    systemPrompt: string;
    
    // Histórico de mensagens
    messages: Message[];
    
    // Contexto do projeto
    projectContext?: ProjectAIContext;
    
    // Contexto de código
    codeContext?: CodeAIContext;
    
    // Contexto de arquivo
    fileContext?: FileAIContext;
    
    // Metadados
    metadata: Record<string, unknown>;
    
    // Tokens usados
    tokenCount: number;
    maxTokens: number;
}

export interface Message {
    id: string;
    role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
    content: string | MessageContent[];
    
    // Para function calls
    functionCall?: FunctionCall;
    toolCalls?: ToolCall[];
    
    // Metadados
    timestamp: number;
    tokens?: number;
}

export type MessageContent = 
    | TextContent
    | ImageContent
    | AudioContent
    | VideoContent
    | FileContent;

export interface TextContent {
    type: 'text';
    text: string;
}

export interface ImageContent {
    type: 'image';
    url?: string;
    base64?: string;
    mimeType?: string;
    detail?: 'low' | 'high' | 'auto';
}

export interface AudioContent {
    type: 'audio';
    url?: string;
    base64?: string;
    mimeType?: string;
}

export interface VideoContent {
    type: 'video';
    url?: string;
    base64?: string;
    mimeType?: string;
}

export interface FileContent {
    type: 'file';
    path: string;
    content?: string;
    language?: string;
}

export interface ProjectAIContext {
    projectId: string;
    projectName: string;
    projectType: string;
    structure: string;
    dependencies?: string[];
    readme?: string;
}

export interface CodeAIContext {
    language: string;
    framework?: string;
    currentFile?: string;
    currentFunction?: string;
    relatedFiles?: string[];
    imports?: string[];
    types?: string[];
}

export interface FileAIContext {
    path: string;
    content: string;
    language: string;
    lineRange?: { start: number; end: number };
    selection?: string;
}

// ============================================================================
// FUNCTION CALLING
// ============================================================================

export interface FunctionDefinition {
    name: string;
    description: string;
    parameters: JSONSchema;
    handler: (args: unknown) => Promise<unknown>;
}

export interface FunctionCall {
    name: string;
    arguments: string;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: FunctionCall;
}

export interface ToolResult {
    toolCallId: string;
    output: string;
    error?: string;
}

export interface JSONSchema {
    type: string;
    properties?: Record<string, JSONSchema>;
    required?: string[];
    items?: JSONSchema;
    enum?: string[];
    description?: string;
}

// ============================================================================
// TASK
// ============================================================================

export interface AITask {
    id: string;
    type: TaskType;
    priority: TaskPriority;
    status: TaskStatus;
    
    // Input
    input: TaskInput;
    
    // Output
    output?: TaskOutput;
    
    // Agente
    agentType: AgentType;
    agentId?: string;
    
    // Modelo
    modelConfig?: ModelConfig;
    
    // Context
    context: AIContext;
    
    // Callbacks
    callbacks?: TaskCallbacks;
    
    // Retry
    retries: number;
    maxRetries: number;
    
    // Timestamps
    created: number;
    started?: number;
    completed?: number;
    
    // Erro
    error?: TaskError;
    
    // Metadata
    metadata: Record<string, unknown>;
}

export type TaskType = 
    | 'generate'
    | 'transform'
    | 'analyze'
    | 'review'
    | 'summarize'
    | 'translate'
    | 'chat'
    | 'complete'
    | 'edit'
    | 'explain'
    | 'custom';

export interface TaskInput {
    prompt?: string;
    messages?: Message[];
    code?: string;
    file?: string;
    data?: unknown;
    options?: Record<string, unknown>;
}

export interface TaskOutput {
    text?: string;
    code?: string;
    messages?: Message[];
    data?: unknown;
    usage?: TokenUsage;
    functionCalls?: FunctionCall[];
    toolCalls?: ToolCall[];
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
}

export interface TaskCallbacks {
    onStart?: () => void;
    onProgress?: (progress: number) => void;
    onStream?: (chunk: string) => void;
    onComplete?: (output: TaskOutput) => void;
    onError?: (error: TaskError) => void;
}

export interface TaskError {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
}

// ============================================================================
// AGENT
// ============================================================================

export interface AIAgent {
    id: string;
    name: string;
    type: AgentType;
    
    // Configuração
    config: AgentConfig;
    
    // Estado
    status: AgentStatus;
    
    // Métricas
    metrics: AgentMetrics;
    
    // Functions disponíveis
    functions: FunctionDefinition[];
    
    // Histórico
    taskHistory: string[];
}

export interface AgentConfig {
    // Modelo padrão
    defaultModel: ModelConfig;
    
    // System prompt base
    baseSystemPrompt: string;
    
    // Capacidades
    capabilities: string[];
    
    // Limites
    maxConcurrentTasks: number;
    maxContextTokens: number;
    
    // Retry
    retryStrategy: RetryStrategy;
    
    // Fallback
    fallbackAgents?: AgentType[];
}

export interface AgentStatus {
    online: boolean;
    busy: boolean;
    currentTaskId?: string;
    queueSize: number;
    lastActive: number;
}

export interface AgentMetrics {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgResponseTime: number;
    avgTokensUsed: number;
    totalCost: number;
}

export interface RetryStrategy {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: string[];
}

// ============================================================================
// PIPELINE
// ============================================================================

export interface AIPipeline {
    id: string;
    name: string;
    description?: string;
    
    // Stages
    stages: PipelineStage[];
    
    // Estado
    status: PipelineStatus;
    currentStage?: number;
    
    // Input/Output
    input: unknown;
    output?: unknown;
    
    // Context compartilhado
    sharedContext: Record<string, unknown>;
    
    // Timestamps
    created: number;
    started?: number;
    completed?: number;
    
    // Error handling
    errorHandling: 'stop' | 'skip' | 'retry';
}

export interface PipelineStage {
    id: string;
    name: string;
    type: 'task' | 'parallel' | 'conditional' | 'loop';
    
    // Para task
    task?: Omit<AITask, 'id' | 'status' | 'created'>;
    
    // Para parallel
    parallelTasks?: Omit<AITask, 'id' | 'status' | 'created'>[];
    
    // Para conditional
    condition?: (context: Record<string, unknown>) => boolean;
    ifTrue?: PipelineStage;
    ifFalse?: PipelineStage;
    
    // Para loop
    loopCondition?: (context: Record<string, unknown>, iteration: number) => boolean;
    maxIterations?: number;
    loopBody?: PipelineStage;
    
    // Transformação de output
    outputTransform?: (output: unknown) => unknown;
    
    // Estado
    status: TaskStatus;
    output?: unknown;
}

export type PipelineStatus = 
    | 'idle'
    | 'running'
    | 'paused'
    | 'completed'
    | 'failed';

// ============================================================================
// AI INTEGRATION LAYER
// ============================================================================

// Interfaces para injeção de dependência
interface ILLMRouter {
    initialize(): Promise<void>;
    route(request: LLMRoutingRequest): Promise<LLMRoutingDecision>;
    execute<T>(decision: LLMRoutingDecision, executor: (model: unknown, provider: unknown) => Promise<T>, request: LLMRoutingRequest): Promise<T>;
    getBudget(workspaceId: string): { total: number; spent: number; remaining: number };
}

interface IDeepContextEngine {
    getCurrentSnapshot(): Promise<ContextSnapshot>;
    getRelatedElements(elementId: string): Promise<ContextElement[]>;
    trackElement(element: ContextElement): void;
}

interface IQualityEngine {
    validate(content: QualityContent): Promise<QualityValidation>;
    autoFix(content: unknown, issues: QualityIssue[]): Promise<unknown>;
}

// Types para integração
interface LLMRoutingRequest {
    domain: 'code' | 'trading' | 'research' | 'creative';
    task: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    constraints: {
        maxCost?: number;
        maxLatency?: number;
        minQuality?: number;
        requiredCapabilities?: string[];
    };
    context: {
        workspaceId: string;
        userId: string;
        budget: { total: number; spent: number; remaining: number };
    };
    estimatedTokens?: { input: number; output: number };
}

interface LLMRoutingDecision {
    model: unknown;
    provider: unknown;
    estimatedCost: number;
    estimatedLatency: number;
    qualityScore: number;
    reasoning: string;
    fallbacks: Array<{ model: unknown; provider: unknown }>;
}

interface ContextSnapshot {
    id: string;
    timestamp: number;
    elements: ContextElement[];
}

interface ContextElement {
    id: string;
    type: string;
    path?: string;
    content?: string;
    metadata?: Record<string, unknown>;
}

interface QualityContent {
    type: 'code' | 'text' | 'json';
    content: string;
    language?: string;
    level?: 'draft' | 'preview' | 'production';
}

interface QualityValidation {
    valid: boolean;
    score: number;
    issues: QualityIssue[];
}

interface QualityIssue {
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    fix?: string;
}

@injectable()
export class AIIntegrationLayer {
    // Core state
    private agents: Map<string, AIAgent> = new Map();
    private tasks: Map<string, AITask> = new Map();
    private pipelines: Map<string, AIPipeline> = new Map();
    private taskQueue: AITask[] = [];
    private modelConfigs: Map<string, ModelConfig> = new Map();
    private functions: Map<string, FunctionDefinition> = new Map();
    private listeners: Map<string, Set<(event: AIEvent) => void>> = new Map();
    private processing: boolean = false;
    
    // Injected dependencies (optional for backwards compatibility)
    private llmRouter: ILLMRouter | null = null;
    private deepContextEngine: IDeepContextEngine | null = null;
    private qualityEngine: IQualityEngine | null = null;
    
    // Events
    private readonly onTaskCompletedEmitter = new Emitter<{ taskId: string; output: TaskOutput }>();
    readonly onTaskCompleted: Event<{ taskId: string; output: TaskOutput }> = this.onTaskCompletedEmitter.event;
    
    private readonly onTaskFailedEmitter = new Emitter<{ taskId: string; error: TaskError }>();
    readonly onTaskFailed: Event<{ taskId: string; error: TaskError }> = this.onTaskFailedEmitter.event;
    
    private readonly onStreamChunkEmitter = new Emitter<{ taskId: string; chunk: string }>();
    readonly onStreamChunk: Event<{ taskId: string; chunk: string }> = this.onStreamChunkEmitter.event;

    constructor() {
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
    async initialize(dependencies?: {
        llmRouter?: ILLMRouter;
        deepContextEngine?: IDeepContextEngine;
        qualityEngine?: IQualityEngine;
    }): Promise<void> {
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
    setLLMRouter(router: ILLMRouter): void {
        this.llmRouter = router;
    }

    /**
     * Set Deep Context Engine (for DI injection)
     */
    setDeepContextEngine(engine: IDeepContextEngine): void {
        this.deepContextEngine = engine;
    }

    /**
     * Set Quality Engine (for DI injection)
     */
    setQualityEngine(engine: IQualityEngine): void {
        this.qualityEngine = engine;
    }

    // ========================================================================
    // AGENT MANAGEMENT
    // ========================================================================

    /**
     * Registra agente
     */
    registerAgent(agent: AIAgent): void {
        this.agents.set(agent.id, agent);
        this.emit('agentRegistered', { agentId: agent.id, agent });
    }

    /**
     * Obtém agente
     */
    getAgent(agentId: string): AIAgent | undefined {
        return this.agents.get(agentId);
    }

    /**
     * Obtém agente por tipo
     */
    getAgentByType(type: AgentType): AIAgent | undefined {
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
    listAgents(filter?: { type?: AgentType; online?: boolean }): AIAgent[] {
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
    async executeTask(
        taskDef: Omit<AITask, 'id' | 'status' | 'created' | 'retries'>
    ): Promise<TaskOutput> {
        const task = this.createTask(taskDef);
        return this.runTask(task);
    }

    /**
     * Cria task
     */
    createTask(
        taskDef: Omit<AITask, 'id' | 'status' | 'created' | 'retries'>
    ): AITask {
        const task: AITask = {
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
    queueTask(task: AITask): void {
        task.status = 'queued';
        
        // Inserir por prioridade
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3, background: 4 };
        const insertIndex = this.taskQueue.findIndex(
            t => priorityOrder[t.priority] > priorityOrder[task.priority]
        );

        if (insertIndex === -1) {
            this.taskQueue.push(task);
        } else {
            this.taskQueue.splice(insertIndex, 0, task);
        }

        this.emit('taskQueued', { taskId: task.id, task });
        this.processQueue();
    }

    /**
     * Executa task
     */
    async runTask(task: AITask): Promise<TaskOutput> {
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

        } catch (error) {
            return this.handleTaskError(task, error);
        }
    }

    /**
     * Executa com streaming
     */
    async streamTask(
        task: AITask,
        onChunk: (chunk: string) => void
    ): Promise<TaskOutput> {
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

        } catch (error) {
            return this.handleTaskError(task, error);
        }
    }

    /**
     * Cancela task
     */
    cancelTask(taskId: string): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

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
    createPipeline(
        name: string,
        stages: PipelineStage[],
        options: Partial<AIPipeline> = {}
    ): AIPipeline {
        const pipeline: AIPipeline = {
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
    async executePipeline(
        pipelineId: string,
        input: unknown
    ): Promise<unknown> {
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
            let lastOutput: unknown = input;

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

        } catch (error) {
            pipeline.status = 'failed';
            this.emit('pipelineFailed', { pipelineId, error });
            throw error;
        }
    }

    private async executeStage(
        stage: PipelineStage,
        context: Record<string, unknown>
    ): Promise<unknown> {
        stage.status = 'running';

        try {
            let output: unknown;

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
                        const results: unknown[] = [];
                        let iteration = 0;
                        const maxIter = stage.maxIterations || 100;

                        while (
                            stage.loopCondition(context, iteration) && 
                            iteration < maxIter
                        ) {
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

        } catch (error) {
            stage.status = 'failed';
            throw error;
        }
    }

    // ========================================================================
    // MODEL INTERACTION - CONNECTED TO LLM ROUTER
    // ========================================================================

    private async callModel(
        config: ModelConfig,
        context: AIContext,
        task: AITask,
        agent: AIAgent
    ): Promise<TaskOutput> {
        const messages = this.prepareMessages(context, task);
        const functions = this.prepareFunctions(agent);

        // Enrich context with Deep Context Engine if available
        if (this.deepContextEngine) {
            try {
                const snapshot = await this.deepContextEngine.getCurrentSnapshot();
                context.metadata['deepContext'] = snapshot;
            } catch (e) {
                console.warn('[AI Integration] Failed to get deep context:', e);
            }
        }

        let response: {
            content: string;
            tokens?: number;
            functionCalls?: FunctionCall[];
            toolCalls?: ToolCall[];
        };

        // Use LLM Router if available for intelligent routing
        if (this.llmRouter) {
            response = await this.callModelWithRouter(config, messages, functions, task, agent);
        } else {
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
            } catch (e) {
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
    private async callModelWithRouter(
        config: ModelConfig,
        messages: Message[],
        functions: FunctionDefinition[],
        task: AITask,
        agent: AIAgent
    ): Promise<{
        content: string;
        tokens?: number;
        functionCalls?: FunctionCall[];
        toolCalls?: ToolCall[];
    }> {
        if (!this.llmRouter) {
            throw new Error('LLM Router not initialized');
        }

        // Map agent type to domain
        const domain = this.mapAgentTypeToDomain(agent.type);

        // Get budget info
        const budget = this.llmRouter.getBudget(task.context.metadata['workspaceId'] as string || 'default');

        // Build routing request
        const routingRequest: LLMRoutingRequest = {
            domain,
            task: task.type,
            priority: task.priority as 'low' | 'normal' | 'high' | 'critical',
            constraints: {
                maxCost: budget.remaining * 0.1, // Don't use more than 10% of remaining budget per call
                maxLatency: config.timeout || 60000,
                requiredCapabilities: agent.config.capabilities,
            },
            context: {
                workspaceId: task.context.metadata['workspaceId'] as string || 'default',
                userId: task.context.metadata['userId'] as string || 'anonymous',
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
        const result = await this.llmRouter.execute(
            decision,
            async (model: unknown, provider: unknown) => {
                return this.executeAPICall(model, provider, messages, functions, config);
            },
            routingRequest
        );

        return result;
    }

    /**
     * Execute actual API call to LLM provider
     */
    private async executeAPICall(
        model: unknown,
        provider: unknown,
        messages: Message[],
        functions: FunctionDefinition[],
        config: ModelConfig
    ): Promise<{
        content: string;
        tokens?: number;
        functionCalls?: FunctionCall[];
        toolCalls?: ToolCall[];
    }> {
        const modelInfo = model as { id: string; providerId: string };
        const providerInfo = provider as { id: string; apiKey: string; endpoint: string };

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
    private async callOpenAI(
        provider: { apiKey: string; endpoint: string },
        model: { id: string },
        messages: Array<{ role: string; content: string }>,
        functions: FunctionDefinition[],
        config: ModelConfig
    ): Promise<{ content: string; tokens?: number; functionCalls?: FunctionCall[]; toolCalls?: ToolCall[] }> {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        
        const body: Record<string, unknown> = {
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
                toolCalls: choice?.message?.tool_calls?.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    },
                })),
            };
        } catch (error) {
            console.error('[AI Integration] OpenAI API call failed:', error);
            throw error;
        }
    }

    /**
     * Call Anthropic API
     */
    private async callAnthropic(
        provider: { apiKey: string; endpoint: string },
        model: { id: string },
        messages: Array<{ role: string; content: string }>,
        functions: FunctionDefinition[],
        config: ModelConfig
    ): Promise<{ content: string; tokens?: number; functionCalls?: FunctionCall[]; toolCalls?: ToolCall[] }> {
        const endpoint = provider.endpoint || 'https://api.anthropic.com/v1';
        
        // Separate system message
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const body: Record<string, unknown> = {
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
            const textContent = data.content?.find((c: { type: string }) => c.type === 'text');
            const toolUse = data.content?.filter((c: { type: string }) => c.type === 'tool_use');

            return {
                content: textContent?.text || '',
                tokens: data.usage?.output_tokens,
                toolCalls: toolUse?.map((tu: { id: string; name: string; input: unknown }) => ({
                    id: tu.id,
                    type: 'function' as const,
                    function: {
                        name: tu.name,
                        arguments: JSON.stringify(tu.input),
                    },
                })),
            };
        } catch (error) {
            console.error('[AI Integration] Anthropic API call failed:', error);
            throw error;
        }
    }

    /**
     * Direct model call (fallback when no router)
     */
    private async callModelDirect(
        config: ModelConfig,
        messages: Message[],
        functions: FunctionDefinition[]
    ): Promise<{
        content: string;
        tokens?: number;
        functionCalls?: FunctionCall[];
        toolCalls?: ToolCall[];
    }> {
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
    private mapAgentTypeToDomain(type: AgentType): 'code' | 'trading' | 'research' | 'creative' {
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
    private detectContentType(content: string): 'code' | 'text' | 'json' {
        // Check if it's JSON
        try {
            JSON.parse(content);
            return 'json';
        } catch {
            // Not JSON
        }

        // Check for code indicators
        const codeIndicators = [
            /^(import|export|const|let|var|function|class|interface|type)\s/m,
            /^(def|class|import|from)\s/m,  // Python
            /^(public|private|protected|static|void)\s/m,  // Java/C#
            /[{}\[\]();]+/,  // Brackets common in code
        ];

        for (const indicator of codeIndicators) {
            if (indicator.test(content)) {
                return 'code';
            }
        }

        return 'text';
    }

    private async streamModel(
        config: ModelConfig,
        context: AIContext,
        task: AITask,
        onChunk: (chunk: string) => void
    ): Promise<TaskOutput> {
        const messages = this.prepareMessages(context, task);
        
        // Use LLM Router streaming if available
        if (this.llmRouter) {
            // For now, fall back to regular call and emit chunks
            const result = await this.callModel(config, context, task, 
                this.getAgentByType(task.agentType) || this.createDefaultAgent(task.agentType));
            
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
    private createDefaultAgent(type: AgentType): AIAgent {
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

    private prepareMessages(context: AIContext, task: AITask): Message[] {
        const messages: Message[] = [];

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

    private prepareFunctions(agent: AIAgent): FunctionDefinition[] {
        const functions: FunctionDefinition[] = [];

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

    private async simulateModelCall(
        config: ModelConfig,
        messages: Message[],
        functions: FunctionDefinition[]
    ): Promise<{
        content: string;
        tokens?: number;
        functionCalls?: FunctionCall[];
        toolCalls?: ToolCall[];
    }> {
        // Placeholder - em produção faria chamada real à API
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
            content: 'This is a simulated AI response. In production, this would call the actual model API.',
            tokens: 20,
        };
    }

    private async simulateStreamingCall(
        config: ModelConfig,
        messages: Message[],
        onChunk: (chunk: string) => void
    ): Promise<string> {
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
    registerFunction(fn: FunctionDefinition): void {
        this.functions.set(fn.name, fn);
    }

    /**
     * Executa function call
     */
    async executeFunctionCall(call: FunctionCall): Promise<unknown> {
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
    async executeToolCalls(calls: ToolCall[]): Promise<ToolResult[]> {
        const results: ToolResult[] = [];

        for (const call of calls) {
            try {
                const output = await this.executeFunctionCall(call.function);
                results.push({
                    toolCallId: call.id,
                    output: JSON.stringify(output),
                });
            } catch (error) {
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
    createContext(
        systemPrompt: string,
        options: Partial<AIContext> = {}
    ): AIContext {
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
    addMessage(context: AIContext, message: Omit<Message, 'id' | 'timestamp'>): void {
        const fullMessage: Message = {
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
    private trimContext(context: AIContext): void {
        while (context.tokenCount > context.maxTokens && context.messages.length > 2) {
            const removed = context.messages.shift();
            if (removed) {
                context.tokenCount -= this.estimateTokens([removed]);
            }
        }
    }

    private buildContext(task: AITask, agent: AIAgent): AIContext {
        const context = { ...task.context };
        
        // Merge system prompt
        if (!context.systemPrompt && agent.config.baseSystemPrompt) {
            context.systemPrompt = agent.config.baseSystemPrompt;
        }

        return context;
    }

    private estimateTokens(messages: Partial<Message>[]): number {
        // Estimativa simples: ~4 chars por token
        let totalChars = 0;
        for (const msg of messages) {
            if (typeof msg.content === 'string') {
                totalChars += msg.content.length;
            } else if (Array.isArray(msg.content)) {
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

    private async handleTaskError(task: AITask, error: unknown): Promise<TaskOutput> {
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

    private normalizeError(error: unknown): TaskError {
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

    private createError(code: string, message: string, retryable: boolean = false): TaskError {
        return { code, message, retryable };
    }

    private isRetryable(error: Error): boolean {
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

    private calculateRetryDelay(attempt: number, strategy: RetryStrategy): number {
        const delay = strategy.initialDelay * Math.pow(strategy.backoffMultiplier, attempt - 1);
        return Math.min(delay, strategy.maxDelay);
    }

    private getDefaultRetryStrategy(): RetryStrategy {
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

    private async processQueue(): Promise<void> {
        if (this.processing || this.taskQueue.length === 0) return;

        this.processing = true;

        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            if (task) {
                await this.runTask(task).catch(() => {});
            }
        }

        this.processing = false;
    }

    // ========================================================================
    // METRICS
    // ========================================================================

    private updateAgentMetrics(agent: AIAgent, task: AITask, success: boolean): void {
        agent.metrics.totalTasks++;
        
        if (success) {
            agent.metrics.completedTasks++;
        } else {
            agent.metrics.failedTasks++;
        }

        if (task.started && task.completed) {
            const responseTime = task.completed - task.started;
            agent.metrics.avgResponseTime = (
                (agent.metrics.avgResponseTime * (agent.metrics.totalTasks - 1) + responseTime) /
                agent.metrics.totalTasks
            );
        }

        if (task.output?.usage) {
            agent.metrics.avgTokensUsed = (
                (agent.metrics.avgTokensUsed * (agent.metrics.totalTasks - 1) + task.output.usage.totalTokens) /
                agent.metrics.totalTasks
            );
            
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

    private registerDefaultAgents(): void {
        const defaultAgentTypes: AgentType[] = [
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

    private registerDefaultModels(): void {
        const models: [string, ModelConfig][] = [
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

    private getSystemPromptForType(type: AgentType): string {
        const prompts: Record<AgentType, string> = {
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

    private getCapabilitiesForType(type: AgentType): string[] {
        const capabilities: Record<AgentType, string[]> = {
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

    private generateId(): string {
        return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    on(event: string, callback: (event: AIEvent) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (event: AIEvent) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: AIEvent): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

export interface AIEvent {
    agentId?: string;
    agent?: AIAgent;
    taskId?: string;
    task?: AITask;
    pipelineId?: string;
    output?: unknown;
    error?: TaskError | unknown;
}

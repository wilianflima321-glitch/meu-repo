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
type EventCallback<T> = (data: T) => void;
type Event<T> = (callback: EventCallback<T>) => {
    dispose: () => void;
};
export declare const LLMRouterSymbol: unique symbol;
export declare const DeepContextEngineSymbol: unique symbol;
export declare const QualityEngineSymbol: unique symbol;
export type AgentType = 'architect' | 'coder' | 'creative' | 'analyst' | 'reviewer' | 'tester' | 'documenter' | 'designer' | 'animator' | 'composer' | 'video-editor' | 'image-gen' | 'voice' | 'translator' | 'planner' | 'orchestrator' | 'custom';
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'meta' | 'mistral' | 'cohere' | 'local' | 'custom';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';
export type TaskStatus = 'pending' | 'queued' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
export interface ModelConfig {
    provider: ModelProvider;
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stream: boolean;
    timeout: number;
    apiKey?: string;
    baseUrl?: string;
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
export interface AIContext {
    systemPrompt: string;
    messages: Message[];
    projectContext?: ProjectAIContext;
    codeContext?: CodeAIContext;
    fileContext?: FileAIContext;
    metadata: Record<string, unknown>;
    tokenCount: number;
    maxTokens: number;
}
export interface Message {
    id: string;
    role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
    content: string | MessageContent[];
    functionCall?: FunctionCall;
    toolCalls?: ToolCall[];
    timestamp: number;
    tokens?: number;
}
export type MessageContent = TextContent | ImageContent | AudioContent | VideoContent | FileContent;
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
    lineRange?: {
        start: number;
        end: number;
    };
    selection?: string;
}
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
export interface AITask {
    id: string;
    type: TaskType;
    priority: TaskPriority;
    status: TaskStatus;
    input: TaskInput;
    output?: TaskOutput;
    agentType: AgentType;
    agentId?: string;
    modelConfig?: ModelConfig;
    context: AIContext;
    callbacks?: TaskCallbacks;
    retries: number;
    maxRetries: number;
    created: number;
    started?: number;
    completed?: number;
    error?: TaskError;
    metadata: Record<string, unknown>;
}
export type TaskType = 'generate' | 'transform' | 'analyze' | 'review' | 'summarize' | 'translate' | 'chat' | 'complete' | 'edit' | 'explain' | 'custom';
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
export interface AIAgent {
    id: string;
    name: string;
    type: AgentType;
    config: AgentConfig;
    status: AgentStatus;
    metrics: AgentMetrics;
    functions: FunctionDefinition[];
    taskHistory: string[];
}
export interface AgentConfig {
    defaultModel: ModelConfig;
    baseSystemPrompt: string;
    capabilities: string[];
    maxConcurrentTasks: number;
    maxContextTokens: number;
    retryStrategy: RetryStrategy;
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
export interface AIPipeline {
    id: string;
    name: string;
    description?: string;
    stages: PipelineStage[];
    status: PipelineStatus;
    currentStage?: number;
    input: unknown;
    output?: unknown;
    sharedContext: Record<string, unknown>;
    created: number;
    started?: number;
    completed?: number;
    errorHandling: 'stop' | 'skip' | 'retry';
}
export interface PipelineStage {
    id: string;
    name: string;
    type: 'task' | 'parallel' | 'conditional' | 'loop';
    task?: Omit<AITask, 'id' | 'status' | 'created'>;
    parallelTasks?: Omit<AITask, 'id' | 'status' | 'created'>[];
    condition?: (context: Record<string, unknown>) => boolean;
    ifTrue?: PipelineStage;
    ifFalse?: PipelineStage;
    loopCondition?: (context: Record<string, unknown>, iteration: number) => boolean;
    maxIterations?: number;
    loopBody?: PipelineStage;
    outputTransform?: (output: unknown) => unknown;
    status: TaskStatus;
    output?: unknown;
}
export type PipelineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';
interface ILLMRouter {
    initialize(): Promise<void>;
    route(request: LLMRoutingRequest): Promise<LLMRoutingDecision>;
    execute<T>(decision: LLMRoutingDecision, executor: (model: unknown, provider: unknown) => Promise<T>, request: LLMRoutingRequest): Promise<T>;
    getBudget(workspaceId: string): {
        total: number;
        spent: number;
        remaining: number;
    };
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
        budget: {
            total: number;
            spent: number;
            remaining: number;
        };
    };
    estimatedTokens?: {
        input: number;
        output: number;
    };
}
interface LLMRoutingDecision {
    model: unknown;
    provider: unknown;
    estimatedCost: number;
    estimatedLatency: number;
    qualityScore: number;
    reasoning: string;
    fallbacks: Array<{
        model: unknown;
        provider: unknown;
    }>;
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
export declare class AIIntegrationLayer {
    private agents;
    private tasks;
    private pipelines;
    private taskQueue;
    private modelConfigs;
    private functions;
    private listeners;
    private processing;
    private llmRouter;
    private deepContextEngine;
    private qualityEngine;
    private readonly onTaskCompletedEmitter;
    readonly onTaskCompleted: Event<{
        taskId: string;
        output: TaskOutput;
    }>;
    private readonly onTaskFailedEmitter;
    readonly onTaskFailed: Event<{
        taskId: string;
        error: TaskError;
    }>;
    private readonly onStreamChunkEmitter;
    readonly onStreamChunk: Event<{
        taskId: string;
        chunk: string;
    }>;
    constructor();
    /**
     * Initialize with dependencies
     * Call this after DI container is ready
     */
    initialize(dependencies?: {
        llmRouter?: ILLMRouter;
        deepContextEngine?: IDeepContextEngine;
        qualityEngine?: IQualityEngine;
    }): Promise<void>;
    /**
     * Set LLM Router (for DI injection)
     */
    setLLMRouter(router: ILLMRouter): void;
    /**
     * Set Deep Context Engine (for DI injection)
     */
    setDeepContextEngine(engine: IDeepContextEngine): void;
    /**
     * Set Quality Engine (for DI injection)
     */
    setQualityEngine(engine: IQualityEngine): void;
    /**
     * Registra agente
     */
    registerAgent(agent: AIAgent): void;
    /**
     * Obtém agente
     */
    getAgent(agentId: string): AIAgent | undefined;
    /**
     * Obtém agente por tipo
     */
    getAgentByType(type: AgentType): AIAgent | undefined;
    /**
     * Lista agentes
     */
    listAgents(filter?: {
        type?: AgentType;
        online?: boolean;
    }): AIAgent[];
    /**
     * Cria e executa task
     */
    executeTask(taskDef: Omit<AITask, 'id' | 'status' | 'created' | 'retries'>): Promise<TaskOutput>;
    /**
     * Cria task
     */
    createTask(taskDef: Omit<AITask, 'id' | 'status' | 'created' | 'retries'>): AITask;
    /**
     * Enfileira task
     */
    queueTask(task: AITask): void;
    /**
     * Executa task
     */
    runTask(task: AITask): Promise<TaskOutput>;
    /**
     * Executa com streaming
     */
    streamTask(task: AITask, onChunk: (chunk: string) => void): Promise<TaskOutput>;
    /**
     * Cancela task
     */
    cancelTask(taskId: string): void;
    /**
     * Cria pipeline
     */
    createPipeline(name: string, stages: PipelineStage[], options?: Partial<AIPipeline>): AIPipeline;
    /**
     * Executa pipeline
     */
    executePipeline(pipelineId: string, input: unknown): Promise<unknown>;
    private executeStage;
    private callModel;
    /**
     * Call model using LLM Router for intelligent routing
     */
    private callModelWithRouter;
    /**
     * Execute actual API call to LLM provider
     */
    private executeAPICall;
    /**
     * Call OpenAI API
     */
    private callOpenAI;
    /**
     * Call Anthropic API
     */
    private callAnthropic;
    /**
     * Direct model call (fallback when no router)
     */
    private callModelDirect;
    /**
     * Map agent type to LLM routing domain
     */
    private mapAgentTypeToDomain;
    /**
     * Detect content type for quality validation
     */
    private detectContentType;
    private streamModel;
    /**
     * Create a default agent for fallback
     */
    private createDefaultAgent;
    private prepareMessages;
    private prepareFunctions;
    private simulateModelCall;
    private simulateStreamingCall;
    /**
     * Registra função para function calling
     */
    registerFunction(fn: FunctionDefinition): void;
    /**
     * Executa function call
     */
    executeFunctionCall(call: FunctionCall): Promise<unknown>;
    /**
     * Executa tool calls
     */
    executeToolCalls(calls: ToolCall[]): Promise<ToolResult[]>;
    /**
     * Cria contexto
     */
    createContext(systemPrompt: string, options?: Partial<AIContext>): AIContext;
    /**
     * Adiciona mensagem ao contexto
     */
    addMessage(context: AIContext, message: Omit<Message, 'id' | 'timestamp'>): void;
    /**
     * Trim context para caber no limite
     */
    private trimContext;
    private buildContext;
    private estimateTokens;
    private handleTaskError;
    private normalizeError;
    private createError;
    private isRetryable;
    private calculateRetryDelay;
    private getDefaultRetryStrategy;
    private processQueue;
    private updateAgentMetrics;
    private registerDefaultAgents;
    private registerDefaultModels;
    private getSystemPromptForType;
    private getCapabilitiesForType;
    private generateId;
    on(event: string, callback: (event: AIEvent) => void): void;
    off(event: string, callback: (event: AIEvent) => void): void;
    private emit;
}
export interface AIEvent {
    agentId?: string;
    agent?: AIAgent;
    taskId?: string;
    task?: AITask;
    pipelineId?: string;
    output?: unknown;
    error?: TaskError | unknown;
}
export {};

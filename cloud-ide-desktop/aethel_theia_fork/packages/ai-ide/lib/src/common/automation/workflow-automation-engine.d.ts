/**
 * WORKFLOW AUTOMATION ENGINE - Sistema de Automação
 *
 * Sistema completo para:
 * - Workflows visuais e código
 * - Triggers automáticos
 * - Ações e condições
 * - Variáveis e expressões
 * - Scheduling
 * - Integrações
 */
export type WorkflowState = 'draft' | 'active' | 'paused' | 'disabled' | 'archived';
export type ExecutionState = 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'skipped';
export type TriggerType = 'manual' | 'event' | 'schedule' | 'webhook' | 'file-watch' | 'condition';
export type NodeType = 'trigger' | 'action' | 'condition' | 'loop' | 'parallel' | 'delay' | 'subworkflow' | 'custom';
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    state: WorkflowState;
    nodes: WorkflowNode[];
    connections: NodeConnection[];
    triggers: WorkflowTrigger[];
    variables: WorkflowVariable[];
    settings: WorkflowSettings;
    version: number;
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    tags?: string[];
    category?: string;
}
export interface WorkflowSettings {
    maxConcurrentExecutions: number;
    executionTimeout: number;
    retryOnFailure: boolean;
    maxRetries: number;
    retryDelay: number;
    logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
    keepExecutionHistory: boolean;
    historyRetentionDays: number;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    notificationChannels: string[];
    allowedUsers?: string[];
    allowedRoles?: string[];
}
export interface WorkflowNode {
    id: string;
    type: NodeType;
    name: string;
    position: {
        x: number;
        y: number;
    };
    config: NodeConfig;
    inputs: NodePort[];
    outputs: NodePort[];
    enabled: boolean;
    description?: string;
    color?: string;
    icon?: string;
}
export type NodeConfig = TriggerConfig | ActionConfig | ConditionConfig | LoopConfig | ParallelConfig | DelayConfig | SubworkflowConfig | CustomConfig;
export interface TriggerConfig {
    type: 'trigger';
    triggerType: TriggerType;
    schedule?: CronSchedule;
    eventType?: string;
    eventFilter?: Record<string, unknown>;
    webhookPath?: string;
    webhookMethod?: string;
    watchPaths?: string[];
    watchEvents?: ('created' | 'modified' | 'deleted')[];
}
export interface ActionConfig {
    type: 'action';
    actionId: string;
    parameters: Record<string, ParameterValue>;
    outputMappings?: Record<string, string>;
}
export interface ConditionConfig {
    type: 'condition';
    conditionType: 'expression' | 'switch' | 'filter';
    expression?: string;
    switchVariable?: string;
    cases?: Array<{
        value: unknown;
        outputId: string;
    }>;
    defaultOutput?: string;
    filterExpression?: string;
}
export interface LoopConfig {
    type: 'loop';
    loopType: 'foreach' | 'while' | 'times';
    collection?: string;
    itemVariable?: string;
    indexVariable?: string;
    condition?: string;
    maxIterations?: number;
    count?: number | string;
}
export interface ParallelConfig {
    type: 'parallel';
    branches: string[];
    waitForAll: boolean;
    failFast: boolean;
}
export interface DelayConfig {
    type: 'delay';
    delayType: 'fixed' | 'until' | 'expression';
    duration?: number;
    untilTime?: string;
    delayExpression?: string;
}
export interface SubworkflowConfig {
    type: 'subworkflow';
    workflowId: string;
    inputMappings: Record<string, string>;
    outputMappings: Record<string, string>;
    waitForCompletion: boolean;
}
export interface CustomConfig {
    type: 'custom';
    customType: string;
    settings: Record<string, unknown>;
}
export interface NodePort {
    id: string;
    name: string;
    type: 'input' | 'output';
    dataType: PortDataType;
    required: boolean;
    multiple: boolean;
    defaultValue?: unknown;
}
export type PortDataType = 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'trigger';
export interface NodeConnection {
    id: string;
    sourceNodeId: string;
    sourcePortId: string;
    targetNodeId: string;
    targetPortId: string;
    condition?: string;
}
export interface WorkflowTrigger {
    id: string;
    type: TriggerType;
    enabled: boolean;
    config: TriggerConfiguration;
}
export type TriggerConfiguration = ManualTriggerConfig | EventTriggerConfig | ScheduleTriggerConfig | WebhookTriggerConfig | FileWatchTriggerConfig;
export interface ManualTriggerConfig {
    type: 'manual';
    inputSchema?: Record<string, unknown>;
}
export interface EventTriggerConfig {
    type: 'event';
    eventType: string;
    filter?: Record<string, unknown>;
}
export interface ScheduleTriggerConfig {
    type: 'schedule';
    schedule: CronSchedule;
    timezone?: string;
}
export interface CronSchedule {
    expression: string;
    minute?: string;
    hour?: string;
    dayOfMonth?: string;
    month?: string;
    dayOfWeek?: string;
}
export interface WebhookTriggerConfig {
    type: 'webhook';
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    authentication?: WebhookAuth;
}
export interface WebhookAuth {
    type: 'none' | 'basic' | 'bearer' | 'api-key';
    credentials?: Record<string, string>;
}
export interface FileWatchTriggerConfig {
    type: 'file-watch';
    paths: string[];
    events: ('created' | 'modified' | 'deleted')[];
    patterns?: string[];
    recursive: boolean;
    debounceMs: number;
}
export interface WorkflowVariable {
    id: string;
    name: string;
    type: VariableType;
    value?: unknown;
    defaultValue?: unknown;
    scope: 'workflow' | 'execution';
    sensitive: boolean;
    validation?: VariableValidation;
}
export type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'secret';
export interface VariableValidation {
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
}
export type ParameterValue = {
    type: 'literal';
    value: unknown;
} | {
    type: 'variable';
    variable: string;
} | {
    type: 'expression';
    expression: string;
};
export interface ActionDefinition {
    id: string;
    name: string;
    description?: string;
    category: string;
    inputSchema: ActionParameter[];
    outputSchema: ActionOutput[];
    execute: (inputs: Record<string, unknown>, context: ExecutionContext) => Promise<Record<string, unknown>>;
    icon?: string;
    color?: string;
    tags?: string[];
}
export interface ActionParameter {
    name: string;
    type: PortDataType;
    description?: string;
    required: boolean;
    defaultValue?: unknown;
    options?: unknown[];
}
export interface ActionOutput {
    name: string;
    type: PortDataType;
    description?: string;
}
export interface WorkflowExecution {
    id: string;
    workflowId: string;
    workflowVersion: number;
    state: ExecutionState;
    triggerId?: string;
    triggerData?: Record<string, unknown>;
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    variables: Record<string, unknown>;
    nodeExecutions: Map<string, NodeExecution>;
    error?: ExecutionError;
    startedAt: number;
    completedAt?: number;
    logs: ExecutionLog[];
    parentExecutionId?: string;
    metadata?: Record<string, unknown>;
}
export interface NodeExecution {
    nodeId: string;
    state: ExecutionState;
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    iterations?: number;
    currentIteration?: number;
    error?: ExecutionError;
    startedAt?: number;
    completedAt?: number;
    retryCount: number;
}
export interface ExecutionError {
    code: string;
    message: string;
    nodeId?: string;
    details?: unknown;
    stack?: string;
}
export interface ExecutionLog {
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    nodeId?: string;
    message: string;
    data?: unknown;
}
export interface ExecutionContext {
    executionId: string;
    workflowId: string;
    variables: Record<string, unknown>;
    getSecret: (name: string) => Promise<string | undefined>;
    log: (level: string, message: string, data?: unknown) => void;
    isCancelled: () => boolean;
    onCancel: (callback: () => void) => void;
}
export declare class WorkflowAutomationEngine {
    private workflows;
    private executions;
    private runningExecutions;
    private actions;
    private activeTriggers;
    private schedulers;
    private fileWatchers;
    private listeners;
    private expressionEngine;
    constructor();
    /**
     * Cria workflow
     */
    createWorkflow(name: string, options?: Partial<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'version'>>): Workflow;
    /**
     * Atualiza workflow
     */
    updateWorkflow(workflowId: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt' | 'version'>>): Workflow;
    /**
     * Ativa workflow
     */
    activateWorkflow(workflowId: string): void;
    /**
     * Desativa workflow
     */
    deactivateWorkflow(workflowId: string): void;
    /**
     * Deleta workflow
     */
    deleteWorkflow(workflowId: string): void;
    /**
     * Adiciona nó ao workflow
     */
    addNode(workflowId: string, node: Omit<WorkflowNode, 'id'>): WorkflowNode;
    /**
     * Remove nó do workflow
     */
    removeNode(workflowId: string, nodeId: string): void;
    /**
     * Conecta nós
     */
    connectNodes(workflowId: string, sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string, condition?: string): NodeConnection;
    /**
     * Desconecta nós
     */
    disconnectNodes(workflowId: string, connectionId: string): void;
    private activateTrigger;
    private deactivateTrigger;
    private activateScheduleTrigger;
    private activateEventTrigger;
    private activateFileWatchTrigger;
    private activateWebhookTrigger;
    /**
     * Dispara webhook manualmente
     */
    triggerWebhook(path: string, method: string, data: unknown): void;
    private parseCronInterval;
    private matchesFilter;
    /**
     * Executa workflow
     */
    executeWorkflow(workflowId: string, options?: {
        triggerId?: string;
        triggerType?: TriggerType;
        triggerData?: Record<string, unknown>;
        inputs?: Record<string, unknown>;
    }): Promise<WorkflowExecution>;
    private initializeVariables;
    private runExecution;
    private findStartNodes;
    private executeNodes;
    private executeNode;
    private gatherNodeInputs;
    private findNextNodes;
    private executeAction;
    private executeCondition;
    private executeLoop;
    private executeParallel;
    private executeDelay;
    private executeSubworkflow;
    private resolveParameterValue;
    private resolveValue;
    private logExecution;
    /**
     * Cancela execução
     */
    cancelExecution(executionId: string): void;
    /**
     * Registra ação
     */
    registerAction(action: ActionDefinition): void;
    private registerBuiltinActions;
    getWorkflow(id: string): Workflow | undefined;
    getAllWorkflows(): Workflow[];
    getExecution(id: string): WorkflowExecution | undefined;
    getExecutions(workflowId?: string): WorkflowExecution[];
    getAction(id: string): ActionDefinition | undefined;
    getAllActions(): ActionDefinition[];
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
    private emit;
    private generateId;
    /**
     * Cleanup
     */
    dispose(): void;
}

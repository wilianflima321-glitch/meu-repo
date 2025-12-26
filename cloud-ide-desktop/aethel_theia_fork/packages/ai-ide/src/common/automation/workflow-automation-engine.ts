import { injectable } from 'inversify';

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

// ============================================================================
// TYPES BASE
// ============================================================================

export type WorkflowState = 
    | 'draft'
    | 'active'
    | 'paused'
    | 'disabled'
    | 'archived';

export type ExecutionState = 
    | 'pending'
    | 'running'
    | 'waiting'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'skipped';

export type TriggerType = 
    | 'manual'
    | 'event'
    | 'schedule'
    | 'webhook'
    | 'file-watch'
    | 'condition';

export type NodeType = 
    | 'trigger'
    | 'action'
    | 'condition'
    | 'loop'
    | 'parallel'
    | 'delay'
    | 'subworkflow'
    | 'custom';

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    
    // Estado
    state: WorkflowState;
    
    // Estrutura
    nodes: WorkflowNode[];
    connections: NodeConnection[];
    
    // Triggers
    triggers: WorkflowTrigger[];
    
    // Variáveis
    variables: WorkflowVariable[];
    
    // Configurações
    settings: WorkflowSettings;
    
    // Metadados
    version: number;
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    
    // Tags
    tags?: string[];
    category?: string;
}

export interface WorkflowSettings {
    // Execução
    maxConcurrentExecutions: number;
    executionTimeout: number;
    retryOnFailure: boolean;
    maxRetries: number;
    retryDelay: number;
    
    // Logging
    logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
    keepExecutionHistory: boolean;
    historyRetentionDays: number;
    
    // Notificações
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    notificationChannels: string[];
    
    // Permissões
    allowedUsers?: string[];
    allowedRoles?: string[];
}

// ============================================================================
// NODES
// ============================================================================

export interface WorkflowNode {
    id: string;
    type: NodeType;
    name: string;
    
    // Posição (para editor visual)
    position: { x: number; y: number };
    
    // Configuração específica
    config: NodeConfig;
    
    // Inputs/Outputs
    inputs: NodePort[];
    outputs: NodePort[];
    
    // Estado
    enabled: boolean;
    
    // Metadados
    description?: string;
    color?: string;
    icon?: string;
}

export type NodeConfig = 
    | TriggerConfig
    | ActionConfig
    | ConditionConfig
    | LoopConfig
    | ParallelConfig
    | DelayConfig
    | SubworkflowConfig
    | CustomConfig;

export interface TriggerConfig {
    type: 'trigger';
    triggerType: TriggerType;
    
    // Para schedule
    schedule?: CronSchedule;
    
    // Para event
    eventType?: string;
    eventFilter?: Record<string, unknown>;
    
    // Para webhook
    webhookPath?: string;
    webhookMethod?: string;
    
    // Para file-watch
    watchPaths?: string[];
    watchEvents?: ('created' | 'modified' | 'deleted')[];
}

export interface ActionConfig {
    type: 'action';
    actionId: string;
    
    // Parâmetros
    parameters: Record<string, ParameterValue>;
    
    // Mapeamento de outputs
    outputMappings?: Record<string, string>;
}

export interface ConditionConfig {
    type: 'condition';
    conditionType: 'expression' | 'switch' | 'filter';
    
    // Para expression
    expression?: string;
    
    // Para switch
    switchVariable?: string;
    cases?: Array<{
        value: unknown;
        outputId: string;
    }>;
    defaultOutput?: string;
    
    // Para filter
    filterExpression?: string;
}

export interface LoopConfig {
    type: 'loop';
    loopType: 'foreach' | 'while' | 'times';
    
    // Para foreach
    collection?: string;
    itemVariable?: string;
    indexVariable?: string;
    
    // Para while
    condition?: string;
    maxIterations?: number;
    
    // Para times
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
    
    // Para fixed
    duration?: number;
    
    // Para until
    untilTime?: string;
    
    // Para expression
    delayExpression?: string;
}

export interface SubworkflowConfig {
    type: 'subworkflow';
    workflowId: string;
    
    // Mapeamento de inputs
    inputMappings: Record<string, string>;
    
    // Mapeamento de outputs
    outputMappings: Record<string, string>;
    
    // Comportamento
    waitForCompletion: boolean;
}

export interface CustomConfig {
    type: 'custom';
    customType: string;
    settings: Record<string, unknown>;
}

// ============================================================================
// PORTS & CONNECTIONS
// ============================================================================

export interface NodePort {
    id: string;
    name: string;
    type: 'input' | 'output';
    
    // Tipo de dados
    dataType: PortDataType;
    
    // Flags
    required: boolean;
    multiple: boolean;
    
    // Valor padrão
    defaultValue?: unknown;
}

export type PortDataType = 
    | 'any'
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'file'
    | 'trigger';

export interface NodeConnection {
    id: string;
    
    // Origem
    sourceNodeId: string;
    sourcePortId: string;
    
    // Destino
    targetNodeId: string;
    targetPortId: string;
    
    // Condição opcional
    condition?: string;
}

// ============================================================================
// TRIGGERS
// ============================================================================

export interface WorkflowTrigger {
    id: string;
    type: TriggerType;
    enabled: boolean;
    
    // Configuração específica
    config: TriggerConfiguration;
}

export type TriggerConfiguration = 
    | ManualTriggerConfig
    | EventTriggerConfig
    | ScheduleTriggerConfig
    | WebhookTriggerConfig
    | FileWatchTriggerConfig;

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
    
    // Ou campos separados
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

// ============================================================================
// VARIABLES
// ============================================================================

export interface WorkflowVariable {
    id: string;
    name: string;
    type: VariableType;
    
    // Valor
    value?: unknown;
    defaultValue?: unknown;
    
    // Configuração
    scope: 'workflow' | 'execution';
    sensitive: boolean;
    
    // Validação
    validation?: VariableValidation;
}

export type VariableType = 
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'date'
    | 'secret';

export interface VariableValidation {
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
}

export type ParameterValue = 
    | { type: 'literal'; value: unknown }
    | { type: 'variable'; variable: string }
    | { type: 'expression'; expression: string };

// ============================================================================
// ACTIONS
// ============================================================================

export interface ActionDefinition {
    id: string;
    name: string;
    description?: string;
    category: string;
    
    // Schema
    inputSchema: ActionParameter[];
    outputSchema: ActionOutput[];
    
    // Execução
    execute: (inputs: Record<string, unknown>, context: ExecutionContext) => Promise<Record<string, unknown>>;
    
    // Metadados
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

// ============================================================================
// EXECUTION
// ============================================================================

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    workflowVersion: number;
    
    // Estado
    state: ExecutionState;
    
    // Trigger
    triggerId?: string;
    triggerData?: Record<string, unknown>;
    
    // Inputs
    inputs: Record<string, unknown>;
    
    // Outputs
    outputs?: Record<string, unknown>;
    
    // Contexto
    variables: Record<string, unknown>;
    
    // Nós
    nodeExecutions: Map<string, NodeExecution>;
    
    // Erro
    error?: ExecutionError;
    
    // Timestamps
    startedAt: number;
    completedAt?: number;
    
    // Logs
    logs: ExecutionLog[];
    
    // Metadados
    parentExecutionId?: string;
    metadata?: Record<string, unknown>;
}

export interface NodeExecution {
    nodeId: string;
    state: ExecutionState;
    
    // Inputs recebidos
    inputs: Record<string, unknown>;
    
    // Outputs produzidos
    outputs?: Record<string, unknown>;
    
    // Para loops
    iterations?: number;
    currentIteration?: number;
    
    // Erro
    error?: ExecutionError;
    
    // Timestamps
    startedAt?: number;
    completedAt?: number;
    
    // Retries
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
    
    // Variáveis
    variables: Record<string, unknown>;
    
    // Secrets
    getSecret: (name: string) => Promise<string | undefined>;
    
    // Logging
    log: (level: string, message: string, data?: unknown) => void;
    
    // Cancelamento
    isCancelled: () => boolean;
    onCancel: (callback: () => void) => void;
}

// ============================================================================
// WORKFLOW AUTOMATION ENGINE
// ============================================================================

@injectable()
export class WorkflowAutomationEngine {
    // Workflows
    private workflows: Map<string, Workflow> = new Map();
    
    // Execuções
    private executions: Map<string, WorkflowExecution> = new Map();
    private runningExecutions: Set<string> = new Set();
    
    // Actions
    private actions: Map<string, ActionDefinition> = new Map();
    
    // Triggers ativos
    private activeTriggers: Map<string, TriggerInstance> = new Map();
    
    // Schedulers
    private schedulers: Map<string, NodeJS.Timeout> = new Map();
    
    // File watchers
    private fileWatchers: Map<string, { close: () => void }> = new Map();
    
    // Eventos
    private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
    
    // Expressões
    private expressionEngine: ExpressionEngine;

    constructor() {
        this.expressionEngine = new ExpressionEngine();
        this.registerBuiltinActions();
    }

    // ========================================================================
    // WORKFLOW MANAGEMENT
    // ========================================================================

    /**
     * Cria workflow
     */
    createWorkflow(
        name: string,
        options: Partial<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'version'>> = {}
    ): Workflow {
        const workflow: Workflow = {
            id: this.generateId(),
            name,
            state: 'draft',
            nodes: [],
            connections: [],
            triggers: [],
            variables: [],
            settings: {
                maxConcurrentExecutions: 5,
                executionTimeout: 300000, // 5 minutos
                retryOnFailure: false,
                maxRetries: 3,
                retryDelay: 1000,
                logLevel: 'info',
                keepExecutionHistory: true,
                historyRetentionDays: 30,
                notifyOnSuccess: false,
                notifyOnFailure: true,
                notificationChannels: [],
            },
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...options,
        };

        this.workflows.set(workflow.id, workflow);
        this.emit('workflowCreated', workflow);

        return workflow;
    }

    /**
     * Atualiza workflow
     */
    updateWorkflow(
        workflowId: string,
        updates: Partial<Omit<Workflow, 'id' | 'createdAt' | 'version'>>
    ): Workflow {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        Object.assign(workflow, updates, {
            updatedAt: Date.now(),
            version: workflow.version + 1,
        });

        this.emit('workflowUpdated', workflow);

        return workflow;
    }

    /**
     * Ativa workflow
     */
    activateWorkflow(workflowId: string): void {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        workflow.state = 'active';
        workflow.updatedAt = Date.now();

        // Ativar triggers
        for (const trigger of workflow.triggers) {
            if (trigger.enabled) {
                this.activateTrigger(workflowId, trigger);
            }
        }

        this.emit('workflowActivated', workflow);
    }

    /**
     * Desativa workflow
     */
    deactivateWorkflow(workflowId: string): void {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;

        workflow.state = 'disabled';
        workflow.updatedAt = Date.now();

        // Desativar triggers
        for (const trigger of workflow.triggers) {
            this.deactivateTrigger(workflowId, trigger.id);
        }

        this.emit('workflowDeactivated', workflow);
    }

    /**
     * Deleta workflow
     */
    deleteWorkflow(workflowId: string): void {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;

        // Desativar triggers
        this.deactivateWorkflow(workflowId);

        // Cancelar execuções em andamento
        for (const [execId, exec] of this.executions) {
            if (exec.workflowId === workflowId && this.runningExecutions.has(execId)) {
                this.cancelExecution(execId);
            }
        }

        this.workflows.delete(workflowId);
        this.emit('workflowDeleted', { workflowId });
    }

    // ========================================================================
    // NODE MANAGEMENT
    // ========================================================================

    /**
     * Adiciona nó ao workflow
     */
    addNode(
        workflowId: string,
        node: Omit<WorkflowNode, 'id'>
    ): WorkflowNode {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        const fullNode: WorkflowNode = {
            id: this.generateId(),
            ...node,
        };

        workflow.nodes.push(fullNode);
        workflow.updatedAt = Date.now();

        this.emit('nodeAdded', { workflowId, node: fullNode });

        return fullNode;
    }

    /**
     * Remove nó do workflow
     */
    removeNode(workflowId: string, nodeId: string): void {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;

        // Remover nó
        workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);

        // Remover conexões relacionadas
        workflow.connections = workflow.connections.filter(
            c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
        );

        workflow.updatedAt = Date.now();
        this.emit('nodeRemoved', { workflowId, nodeId });
    }

    /**
     * Conecta nós
     */
    connectNodes(
        workflowId: string,
        sourceNodeId: string,
        sourcePortId: string,
        targetNodeId: string,
        targetPortId: string,
        condition?: string
    ): NodeConnection {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        const connection: NodeConnection = {
            id: this.generateId(),
            sourceNodeId,
            sourcePortId,
            targetNodeId,
            targetPortId,
            condition,
        };

        workflow.connections.push(connection);
        workflow.updatedAt = Date.now();

        this.emit('nodesConnected', { workflowId, connection });

        return connection;
    }

    /**
     * Desconecta nós
     */
    disconnectNodes(workflowId: string, connectionId: string): void {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;

        workflow.connections = workflow.connections.filter(c => c.id !== connectionId);
        workflow.updatedAt = Date.now();

        this.emit('nodesDisconnected', { workflowId, connectionId });
    }

    // ========================================================================
    // TRIGGERS
    // ========================================================================

    private activateTrigger(workflowId: string, trigger: WorkflowTrigger): void {
        const key = `${workflowId}:${trigger.id}`;

        switch (trigger.config.type) {
            case 'schedule':
                this.activateScheduleTrigger(workflowId, trigger, trigger.config);
                break;
            case 'event':
                this.activateEventTrigger(workflowId, trigger, trigger.config);
                break;
            case 'file-watch':
                this.activateFileWatchTrigger(workflowId, trigger, trigger.config);
                break;
            case 'webhook':
                this.activateWebhookTrigger(workflowId, trigger, trigger.config);
                break;
        }

        this.activeTriggers.set(key, {
            workflowId,
            trigger,
            active: true,
        });
    }

    private deactivateTrigger(workflowId: string, triggerId: string): void {
        const key = `${workflowId}:${triggerId}`;
        
        // Cancelar scheduler
        const scheduler = this.schedulers.get(key);
        if (scheduler) {
            clearInterval(scheduler);
            this.schedulers.delete(key);
        }

        // Fechar file watcher
        const watcher = this.fileWatchers.get(key);
        if (watcher) {
            watcher.close();
            this.fileWatchers.delete(key);
        }

        this.activeTriggers.delete(key);
    }

    private activateScheduleTrigger(
        workflowId: string,
        trigger: WorkflowTrigger,
        config: ScheduleTriggerConfig
    ): void {
        const key = `${workflowId}:${trigger.id}`;
        
        // Parse cron e calcular próxima execução
        const interval = this.parseCronInterval(config.schedule);
        
        const scheduler = setInterval(() => {
            this.executeWorkflow(workflowId, {
                triggerId: trigger.id,
                triggerType: 'schedule',
            });
        }, interval);

        this.schedulers.set(key, scheduler);
    }

    private activateEventTrigger(
        workflowId: string,
        trigger: WorkflowTrigger,
        config: EventTriggerConfig
    ): void {
        // Registrar listener de evento
        this.on(config.eventType, (data) => {
            // Aplicar filtro
            if (config.filter && !this.matchesFilter(data, config.filter)) {
                return;
            }

            this.executeWorkflow(workflowId, {
                triggerId: trigger.id,
                triggerType: 'event',
                triggerData: data as Record<string, unknown>,
            });
        });
    }

    private activateFileWatchTrigger(
        workflowId: string,
        trigger: WorkflowTrigger,
        config: FileWatchTriggerConfig
    ): void {
        // Placeholder - implementaria file watching real
        const key = `${workflowId}:${trigger.id}`;
        
        const watcher = {
            close: () => {
                // Cleanup
            },
        };

        this.fileWatchers.set(key, watcher);
    }

    private activateWebhookTrigger(
        workflowId: string,
        trigger: WorkflowTrigger,
        config: WebhookTriggerConfig
    ): void {
        // Registrar rota de webhook
        // Placeholder - implementaria servidor HTTP
    }

    /**
     * Dispara webhook manualmente
     */
    triggerWebhook(path: string, method: string, data: unknown): void {
        for (const [, instance] of this.activeTriggers) {
            if (
                instance.trigger.config.type === 'webhook' &&
                instance.trigger.config.path === path &&
                instance.trigger.config.method === method
            ) {
                this.executeWorkflow(instance.workflowId, {
                    triggerId: instance.trigger.id,
                    triggerType: 'webhook',
                    triggerData: data as Record<string, unknown>,
                });
            }
        }
    }

    private parseCronInterval(schedule: CronSchedule): number {
        // Simplificado - retorna intervalo em ms
        // Em produção usaria parser de cron completo
        return 60000; // 1 minuto default
    }

    private matchesFilter(data: unknown, filter: Record<string, unknown>): boolean {
        if (!data || typeof data !== 'object') return false;

        for (const [key, value] of Object.entries(filter)) {
            if ((data as Record<string, unknown>)[key] !== value) {
                return false;
            }
        }

        return true;
    }

    // ========================================================================
    // EXECUTION
    // ========================================================================

    /**
     * Executa workflow
     */
    async executeWorkflow(
        workflowId: string,
        options: {
            triggerId?: string;
            triggerType?: TriggerType;
            triggerData?: Record<string, unknown>;
            inputs?: Record<string, unknown>;
        } = {}
    ): Promise<WorkflowExecution> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        // Verificar limite de execuções
        const running = Array.from(this.executions.values())
            .filter(e => e.workflowId === workflowId && this.runningExecutions.has(e.id));
        
        if (running.length >= workflow.settings.maxConcurrentExecutions) {
            throw new Error('Max concurrent executions reached');
        }

        // Criar execução
        const execution: WorkflowExecution = {
            id: this.generateId(),
            workflowId,
            workflowVersion: workflow.version,
            state: 'pending',
            triggerId: options.triggerId,
            triggerData: options.triggerData,
            inputs: options.inputs || {},
            variables: this.initializeVariables(workflow),
            nodeExecutions: new Map(),
            startedAt: Date.now(),
            logs: [],
        };

        this.executions.set(execution.id, execution);
        this.runningExecutions.add(execution.id);

        this.emit('executionStarted', execution);

        // Executar
        try {
            await this.runExecution(workflow, execution);
        } catch (error) {
            execution.state = 'failed';
            execution.error = {
                code: 'EXECUTION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            };
            this.emit('executionFailed', execution);
        } finally {
            this.runningExecutions.delete(execution.id);
            execution.completedAt = Date.now();
        }

        return execution;
    }

    private initializeVariables(workflow: Workflow): Record<string, unknown> {
        const variables: Record<string, unknown> = {};

        for (const variable of workflow.variables) {
            variables[variable.name] = variable.value ?? variable.defaultValue;
        }

        return variables;
    }

    private async runExecution(
        workflow: Workflow,
        execution: WorkflowExecution
    ): Promise<void> {
        execution.state = 'running';

        // Encontrar nós iniciais (sem inputs de conexão)
        const startNodes = this.findStartNodes(workflow);

        // Executar fluxo
        await this.executeNodes(workflow, execution, startNodes);

        // Check final state using explicit cast
        const currentState = execution.state as string;
        if (currentState !== 'failed' && currentState !== 'cancelled') {
            execution.state = 'completed';
            this.emit('executionCompleted', execution);
        }
    }

    private findStartNodes(workflow: Workflow): WorkflowNode[] {
        const connectedInputs = new Set(
            workflow.connections.map(c => c.targetNodeId)
        );

        return workflow.nodes.filter(n => 
            n.enabled && 
            (n.type === 'trigger' || !connectedInputs.has(n.id))
        );
    }

    private async executeNodes(
        workflow: Workflow,
        execution: WorkflowExecution,
        nodes: WorkflowNode[]
    ): Promise<void> {
        for (const node of nodes) {
            if (execution.state === 'cancelled') break;

            await this.executeNode(workflow, execution, node);

            // Encontrar próximos nós
            const nextNodes = this.findNextNodes(workflow, execution, node);
            if (nextNodes.length > 0) {
                await this.executeNodes(workflow, execution, nextNodes);
            }
        }
    }

    private async executeNode(
        workflow: Workflow,
        execution: WorkflowExecution,
        node: WorkflowNode
    ): Promise<void> {
        // Criar registro de execução do nó
        const nodeExec: NodeExecution = {
            nodeId: node.id,
            state: 'running',
            inputs: this.gatherNodeInputs(workflow, execution, node),
            retryCount: 0,
            startedAt: Date.now(),
        };

        execution.nodeExecutions.set(node.id, nodeExec);
        this.logExecution(execution, 'info', `Executing node: ${node.name}`, { nodeId: node.id });

        try {
            // Executar baseado no tipo
            switch (node.type) {
                case 'trigger':
                    nodeExec.outputs = execution.triggerData || {};
                    break;

                case 'action':
                    nodeExec.outputs = await this.executeAction(
                        workflow,
                        execution,
                        node,
                        node.config as ActionConfig,
                        nodeExec.inputs
                    );
                    break;

                case 'condition':
                    nodeExec.outputs = await this.executeCondition(
                        workflow,
                        execution,
                        node,
                        node.config as ConditionConfig,
                        nodeExec.inputs
                    );
                    break;

                case 'loop':
                    nodeExec.outputs = await this.executeLoop(
                        workflow,
                        execution,
                        node,
                        node.config as LoopConfig,
                        nodeExec.inputs
                    );
                    break;

                case 'parallel':
                    nodeExec.outputs = await this.executeParallel(
                        workflow,
                        execution,
                        node,
                        node.config as ParallelConfig,
                        nodeExec.inputs
                    );
                    break;

                case 'delay':
                    await this.executeDelay(
                        execution,
                        node.config as DelayConfig
                    );
                    nodeExec.outputs = nodeExec.inputs;
                    break;

                case 'subworkflow':
                    nodeExec.outputs = await this.executeSubworkflow(
                        execution,
                        node.config as SubworkflowConfig,
                        nodeExec.inputs
                    );
                    break;
            }

            nodeExec.state = 'completed';
            nodeExec.completedAt = Date.now();

            // Atualizar variáveis com outputs
            if (nodeExec.outputs) {
                Object.assign(execution.variables, nodeExec.outputs);
            }

        } catch (error) {
            nodeExec.state = 'failed';
            nodeExec.completedAt = Date.now();
            nodeExec.error = {
                code: 'NODE_EXECUTION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
                nodeId: node.id,
            };

            this.logExecution(execution, 'error', `Node failed: ${node.name}`, {
                nodeId: node.id,
                error: nodeExec.error,
            });

            // Retry se configurado
            if (workflow.settings.retryOnFailure && nodeExec.retryCount < workflow.settings.maxRetries) {
                nodeExec.retryCount++;
                await new Promise(r => setTimeout(r, workflow.settings.retryDelay));
                await this.executeNode(workflow, execution, node);
            } else {
                throw error;
            }
        }
    }

    private gatherNodeInputs(
        workflow: Workflow,
        execution: WorkflowExecution,
        node: WorkflowNode
    ): Record<string, unknown> {
        const inputs: Record<string, unknown> = {};

        // Coletar de conexões
        const incomingConnections = workflow.connections.filter(
            c => c.targetNodeId === node.id
        );

        for (const conn of incomingConnections) {
            const sourceExec = execution.nodeExecutions.get(conn.sourceNodeId);
            if (sourceExec?.outputs) {
                const value = sourceExec.outputs[conn.sourcePortId];
                if (value !== undefined) {
                    inputs[conn.targetPortId] = value;
                }
            }
        }

        // Incluir variáveis de execução
        Object.assign(inputs, execution.variables);

        return inputs;
    }

    private findNextNodes(
        workflow: Workflow,
        execution: WorkflowExecution,
        currentNode: WorkflowNode
    ): WorkflowNode[] {
        const connections = workflow.connections.filter(
            c => c.sourceNodeId === currentNode.id
        );

        const nextNodes: WorkflowNode[] = [];

        for (const conn of connections) {
            // Verificar condição da conexão
            if (conn.condition) {
                const result = this.expressionEngine.evaluate(
                    conn.condition,
                    execution.variables
                );
                if (!result) continue;
            }

            const node = workflow.nodes.find(n => n.id === conn.targetNodeId);
            if (node && node.enabled) {
                nextNodes.push(node);
            }
        }

        return nextNodes;
    }

    // ========================================================================
    // NODE TYPE EXECUTORS
    // ========================================================================

    private async executeAction(
        workflow: Workflow,
        execution: WorkflowExecution,
        node: WorkflowNode,
        config: ActionConfig,
        inputs: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const action = this.actions.get(config.actionId);
        if (!action) {
            throw new Error(`Action not found: ${config.actionId}`);
        }

        // Resolver parâmetros
        const resolvedParams: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(config.parameters)) {
            resolvedParams[key] = this.resolveParameterValue(value, execution.variables);
        }

        // Criar contexto
        const context: ExecutionContext = {
            executionId: execution.id,
            workflowId: workflow.id,
            variables: execution.variables,
            getSecret: async (name) => {
                const variable = workflow.variables.find(
                    v => v.name === name && v.sensitive
                );
                return variable?.value as string | undefined;
            },
            log: (level, message, data) => {
                this.logExecution(execution, level as 'info', message, data);
            },
            isCancelled: () => execution.state === 'cancelled',
            onCancel: (callback) => {
                // Registrar callback de cancelamento
            },
        };

        // Executar
        return await action.execute({ ...inputs, ...resolvedParams }, context);
    }

    private async executeCondition(
        workflow: Workflow,
        execution: WorkflowExecution,
        node: WorkflowNode,
        config: ConditionConfig,
        inputs: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        let result: unknown;

        switch (config.conditionType) {
            case 'expression':
                result = this.expressionEngine.evaluate(
                    config.expression || 'true',
                    { ...execution.variables, ...inputs }
                );
                break;

            case 'switch':
                const switchValue = config.switchVariable
                    ? execution.variables[config.switchVariable]
                    : inputs['value'];

                for (const caseItem of config.cases || []) {
                    if (caseItem.value === switchValue) {
                        result = caseItem.outputId;
                        break;
                    }
                }
                if (!result && config.defaultOutput) {
                    result = config.defaultOutput;
                }
                break;

            case 'filter':
                result = this.expressionEngine.evaluate(
                    config.filterExpression || 'true',
                    { ...execution.variables, ...inputs }
                );
                break;
        }

        return { result, condition: result };
    }

    private async executeLoop(
        workflow: Workflow,
        execution: WorkflowExecution,
        node: WorkflowNode,
        config: LoopConfig,
        inputs: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const nodeExec = execution.nodeExecutions.get(node.id)!;
        const results: unknown[] = [];

        switch (config.loopType) {
            case 'foreach':
                const collection = this.resolveValue(config.collection, execution.variables);
                if (!Array.isArray(collection)) {
                    throw new Error('Foreach requires an array');
                }

                nodeExec.iterations = collection.length;

                for (let i = 0; i < collection.length; i++) {
                    if (execution.state === 'cancelled') break;

                    nodeExec.currentIteration = i;

                    // Set iteration variables
                    if (config.itemVariable) {
                        execution.variables[config.itemVariable] = collection[i];
                    }
                    if (config.indexVariable) {
                        execution.variables[config.indexVariable] = i;
                    }

                    // Execute loop body (nodes connected to loop output)
                    // Simplified - in full implementation would execute connected nodes
                    results.push(collection[i]);
                }
                break;

            case 'while':
                let iteration = 0;
                const maxIter = config.maxIterations || 1000;

                nodeExec.iterations = maxIter;

                while (iteration < maxIter) {
                    if (execution.state === 'cancelled') break;

                    const condition = this.expressionEngine.evaluate(
                        config.condition || 'false',
                        execution.variables
                    );

                    if (!condition) break;

                    nodeExec.currentIteration = iteration;
                    iteration++;
                    results.push(iteration);
                }

                nodeExec.iterations = iteration;
                break;

            case 'times':
                const count = typeof config.count === 'number'
                    ? config.count
                    : Number(this.resolveValue(config.count as string, execution.variables));

                nodeExec.iterations = count;

                for (let i = 0; i < count; i++) {
                    if (execution.state === 'cancelled') break;
                    nodeExec.currentIteration = i;
                    results.push(i);
                }
                break;
        }

        return { results, count: results.length };
    }

    private async executeParallel(
        workflow: Workflow,
        execution: WorkflowExecution,
        node: WorkflowNode,
        config: ParallelConfig,
        inputs: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const promises: Promise<unknown>[] = [];

        for (const branchNodeId of config.branches) {
            const branchNode = workflow.nodes.find(n => n.id === branchNodeId);
            if (branchNode) {
                promises.push(
                    this.executeNode(workflow, execution, branchNode)
                        .catch(error => {
                            if (config.failFast) throw error;
                            return { error };
                        })
                );
            }
        }

        if (config.waitForAll) {
            const results = await Promise.all(promises);
            return { results };
        } else {
            const result = await Promise.race(promises);
            return { result };
        }
    }

    private async executeDelay(
        execution: WorkflowExecution,
        config: DelayConfig
    ): Promise<void> {
        let delayMs: number;

        switch (config.delayType) {
            case 'fixed':
                delayMs = config.duration || 0;
                break;

            case 'until':
                const targetTime = new Date(config.untilTime!).getTime();
                delayMs = Math.max(0, targetTime - Date.now());
                break;

            case 'expression':
                delayMs = Number(
                    this.expressionEngine.evaluate(
                        config.delayExpression || '0',
                        execution.variables
                    )
                );
                break;

            default:
                delayMs = 0;
        }

        execution.state = 'waiting';
        await new Promise(resolve => setTimeout(resolve, delayMs));
        execution.state = 'running';
    }

    private async executeSubworkflow(
        parentExecution: WorkflowExecution,
        config: SubworkflowConfig,
        inputs: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        // Mapear inputs
        const subInputs: Record<string, unknown> = {};
        for (const [target, source] of Object.entries(config.inputMappings)) {
            subInputs[target] = this.resolveValue(source, inputs);
        }

        // Executar subworkflow
        const subExecution = await this.executeWorkflow(config.workflowId, {
            inputs: subInputs,
        });

        // Mapear outputs
        const outputs: Record<string, unknown> = {};
        for (const [target, source] of Object.entries(config.outputMappings)) {
            outputs[target] = subExecution.outputs?.[source];
        }

        return outputs;
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private resolveParameterValue(
        param: ParameterValue,
        variables: Record<string, unknown>
    ): unknown {
        switch (param.type) {
            case 'literal':
                return param.value;
            case 'variable':
                return variables[param.variable];
            case 'expression':
                return this.expressionEngine.evaluate(param.expression, variables);
        }
    }

    private resolveValue(
        value: string | undefined,
        variables: Record<string, unknown>
    ): unknown {
        if (!value) return undefined;

        // Se começa com $, é uma variável
        if (value.startsWith('$')) {
            return variables[value.substring(1)];
        }

        // Se contém {{ }}, é uma expressão
        if (value.includes('{{') && value.includes('}}')) {
            return this.expressionEngine.evaluateTemplate(value, variables);
        }

        return value;
    }

    private logExecution(
        execution: WorkflowExecution,
        level: 'debug' | 'info' | 'warn' | 'error',
        message: string,
        data?: unknown
    ): void {
        execution.logs.push({
            timestamp: Date.now(),
            level,
            message,
            data,
        });
    }

    // ========================================================================
    // CANCELLATION
    // ========================================================================

    /**
     * Cancela execução
     */
    cancelExecution(executionId: string): void {
        const execution = this.executions.get(executionId);
        if (!execution) return;

        execution.state = 'cancelled';
        execution.completedAt = Date.now();

        this.runningExecutions.delete(executionId);
        this.emit('executionCancelled', execution);
    }

    // ========================================================================
    // ACTIONS REGISTRATION
    // ========================================================================

    /**
     * Registra ação
     */
    registerAction(action: ActionDefinition): void {
        this.actions.set(action.id, action);
    }

    private registerBuiltinActions(): void {
        // Log action
        this.registerAction({
            id: 'builtin:log',
            name: 'Log',
            description: 'Registra mensagem no log',
            category: 'Utility',
            inputSchema: [
                { name: 'message', type: 'string', required: true },
                { name: 'level', type: 'string', required: false, defaultValue: 'info' },
            ],
            outputSchema: [],
            execute: async (inputs, context) => {
                context.log(inputs.level as string || 'info', inputs.message as string);
                return {};
            },
        });

        // HTTP Request
        this.registerAction({
            id: 'builtin:http-request',
            name: 'HTTP Request',
            description: 'Faz requisição HTTP',
            category: 'Integration',
            inputSchema: [
                { name: 'url', type: 'string', required: true },
                { name: 'method', type: 'string', required: false, defaultValue: 'GET' },
                { name: 'headers', type: 'object', required: false },
                { name: 'body', type: 'any', required: false },
            ],
            outputSchema: [
                { name: 'status', type: 'number' },
                { name: 'data', type: 'any' },
                { name: 'headers', type: 'object' },
            ],
            execute: async (inputs) => {
                const response = await fetch(inputs.url as string, {
                    method: inputs.method as string || 'GET',
                    headers: inputs.headers as Record<string, string>,
                    body: inputs.body ? JSON.stringify(inputs.body) : undefined,
                });

                return {
                    status: response.status,
                    data: await response.json().catch(() => null),
                    headers: Object.fromEntries(response.headers.entries()),
                };
            },
        });

        // Set Variable
        this.registerAction({
            id: 'builtin:set-variable',
            name: 'Set Variable',
            description: 'Define valor de variável',
            category: 'Utility',
            inputSchema: [
                { name: 'name', type: 'string', required: true },
                { name: 'value', type: 'any', required: true },
            ],
            outputSchema: [],
            execute: async (inputs, context) => {
                context.variables[inputs.name as string] = inputs.value;
                return { [inputs.name as string]: inputs.value };
            },
        });

        // Transform Data
        this.registerAction({
            id: 'builtin:transform',
            name: 'Transform',
            description: 'Transforma dados usando expressão',
            category: 'Data',
            inputSchema: [
                { name: 'data', type: 'any', required: true },
                { name: 'expression', type: 'string', required: true },
            ],
            outputSchema: [
                { name: 'result', type: 'any' },
            ],
            execute: async (inputs, context) => {
                const result = this.expressionEngine.evaluate(
                    inputs.expression as string,
                    { data: inputs.data, ...context.variables }
                );
                return { result };
            },
        });

        // Wait
        this.registerAction({
            id: 'builtin:wait',
            name: 'Wait',
            description: 'Aguarda tempo especificado',
            category: 'Utility',
            inputSchema: [
                { name: 'duration', type: 'number', required: true, description: 'Duração em ms' },
            ],
            outputSchema: [],
            execute: async (inputs) => {
                await new Promise(r => setTimeout(r, inputs.duration as number));
                return {};
            },
        });
    }

    // ========================================================================
    // QUERIES
    // ========================================================================

    getWorkflow(id: string): Workflow | undefined {
        return this.workflows.get(id);
    }

    getAllWorkflows(): Workflow[] {
        return Array.from(this.workflows.values());
    }

    getExecution(id: string): WorkflowExecution | undefined {
        return this.executions.get(id);
    }

    getExecutions(workflowId?: string): WorkflowExecution[] {
        let execs = Array.from(this.executions.values());
        if (workflowId) {
            execs = execs.filter(e => e.workflowId === workflowId);
        }
        return execs.sort((a, b) => b.startedAt - a.startedAt);
    }

    getAction(id: string): ActionDefinition | undefined {
        return this.actions.get(id);
    }

    getAllActions(): ActionDefinition[] {
        return Array.from(this.actions.values());
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    on(event: string, callback: (data: unknown) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (data: unknown) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: unknown): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private generateId(): string {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        // Parar schedulers
        for (const [, scheduler] of this.schedulers) {
            clearInterval(scheduler);
        }
        this.schedulers.clear();

        // Fechar watchers
        for (const [, watcher] of this.fileWatchers) {
            watcher.close();
        }
        this.fileWatchers.clear();

        // Cancelar execuções
        for (const execId of this.runningExecutions) {
            this.cancelExecution(execId);
        }
    }
}

// ============================================================================
// EXPRESSION ENGINE
// ============================================================================

class ExpressionEngine {
    evaluate(expression: string, context: Record<string, unknown>): unknown {
        try {
            // Criar função segura com contexto
            const keys = Object.keys(context);
            const values = Object.values(context);
            
            // Sanitizar expressão
            const sanitized = this.sanitize(expression);
            
            const fn = new Function(...keys, `return ${sanitized}`);
            return fn(...values);
        } catch {
            return undefined;
        }
    }

    evaluateTemplate(template: string, context: Record<string, unknown>): string {
        return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
            const result = this.evaluate(expr.trim(), context);
            return String(result ?? '');
        });
    }

    private sanitize(expression: string): string {
        // Remover construtos perigosos
        const dangerous = ['eval', 'Function', 'constructor', '__proto__', 'prototype'];
        let sanitized = expression;
        
        for (const word of dangerous) {
            sanitized = sanitized.replace(new RegExp(word, 'gi'), '');
        }
        
        return sanitized;
    }
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

interface TriggerInstance {
    workflowId: string;
    trigger: WorkflowTrigger;
    active: boolean;
}

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
exports.WorkflowAutomationEngine = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// WORKFLOW AUTOMATION ENGINE
// ============================================================================
let WorkflowAutomationEngine = class WorkflowAutomationEngine {
    constructor() {
        // Workflows
        this.workflows = new Map();
        // Execuções
        this.executions = new Map();
        this.runningExecutions = new Set();
        // Actions
        this.actions = new Map();
        // Triggers ativos
        this.activeTriggers = new Map();
        // Schedulers
        this.schedulers = new Map();
        // File watchers
        this.fileWatchers = new Map();
        // Eventos
        this.listeners = new Map();
        this.expressionEngine = new ExpressionEngine();
        this.registerBuiltinActions();
    }
    // ========================================================================
    // WORKFLOW MANAGEMENT
    // ========================================================================
    /**
     * Cria workflow
     */
    createWorkflow(name, options = {}) {
        const workflow = {
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
    updateWorkflow(workflowId, updates) {
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
    activateWorkflow(workflowId) {
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
    deactivateWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return;
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
    deleteWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return;
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
    addNode(workflowId, node) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        const fullNode = {
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
    removeNode(workflowId, nodeId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return;
        // Remover nó
        workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);
        // Remover conexões relacionadas
        workflow.connections = workflow.connections.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId);
        workflow.updatedAt = Date.now();
        this.emit('nodeRemoved', { workflowId, nodeId });
    }
    /**
     * Conecta nós
     */
    connectNodes(workflowId, sourceNodeId, sourcePortId, targetNodeId, targetPortId, condition) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        const connection = {
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
    disconnectNodes(workflowId, connectionId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return;
        workflow.connections = workflow.connections.filter(c => c.id !== connectionId);
        workflow.updatedAt = Date.now();
        this.emit('nodesDisconnected', { workflowId, connectionId });
    }
    // ========================================================================
    // TRIGGERS
    // ========================================================================
    activateTrigger(workflowId, trigger) {
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
    deactivateTrigger(workflowId, triggerId) {
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
    activateScheduleTrigger(workflowId, trigger, config) {
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
    activateEventTrigger(workflowId, trigger, config) {
        // Registrar listener de evento
        this.on(config.eventType, (data) => {
            // Aplicar filtro
            if (config.filter && !this.matchesFilter(data, config.filter)) {
                return;
            }
            this.executeWorkflow(workflowId, {
                triggerId: trigger.id,
                triggerType: 'event',
                triggerData: data,
            });
        });
    }
    activateFileWatchTrigger(workflowId, trigger, config) {
        // Placeholder - implementaria file watching real
        const key = `${workflowId}:${trigger.id}`;
        const watcher = {
            close: () => {
                // Cleanup
            },
        };
        this.fileWatchers.set(key, watcher);
    }
    activateWebhookTrigger(workflowId, trigger, config) {
        // Registrar rota de webhook
        // Placeholder - implementaria servidor HTTP
    }
    /**
     * Dispara webhook manualmente
     */
    triggerWebhook(path, method, data) {
        for (const [, instance] of this.activeTriggers) {
            if (instance.trigger.config.type === 'webhook' &&
                instance.trigger.config.path === path &&
                instance.trigger.config.method === method) {
                this.executeWorkflow(instance.workflowId, {
                    triggerId: instance.trigger.id,
                    triggerType: 'webhook',
                    triggerData: data,
                });
            }
        }
    }
    parseCronInterval(schedule) {
        // Simplificado - retorna intervalo em ms
        // Em produção usaria parser de cron completo
        return 60000; // 1 minuto default
    }
    matchesFilter(data, filter) {
        if (!data || typeof data !== 'object')
            return false;
        for (const [key, value] of Object.entries(filter)) {
            if (data[key] !== value) {
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
    async executeWorkflow(workflowId, options = {}) {
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
        const execution = {
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
        }
        catch (error) {
            execution.state = 'failed';
            execution.error = {
                code: 'EXECUTION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            };
            this.emit('executionFailed', execution);
        }
        finally {
            this.runningExecutions.delete(execution.id);
            execution.completedAt = Date.now();
        }
        return execution;
    }
    initializeVariables(workflow) {
        const variables = {};
        for (const variable of workflow.variables) {
            variables[variable.name] = variable.value ?? variable.defaultValue;
        }
        return variables;
    }
    async runExecution(workflow, execution) {
        execution.state = 'running';
        // Encontrar nós iniciais (sem inputs de conexão)
        const startNodes = this.findStartNodes(workflow);
        // Executar fluxo
        await this.executeNodes(workflow, execution, startNodes);
        // Check final state using explicit cast
        const currentState = execution.state;
        if (currentState !== 'failed' && currentState !== 'cancelled') {
            execution.state = 'completed';
            this.emit('executionCompleted', execution);
        }
    }
    findStartNodes(workflow) {
        const connectedInputs = new Set(workflow.connections.map(c => c.targetNodeId));
        return workflow.nodes.filter(n => n.enabled &&
            (n.type === 'trigger' || !connectedInputs.has(n.id)));
    }
    async executeNodes(workflow, execution, nodes) {
        for (const node of nodes) {
            if (execution.state === 'cancelled')
                break;
            await this.executeNode(workflow, execution, node);
            // Encontrar próximos nós
            const nextNodes = this.findNextNodes(workflow, execution, node);
            if (nextNodes.length > 0) {
                await this.executeNodes(workflow, execution, nextNodes);
            }
        }
    }
    async executeNode(workflow, execution, node) {
        // Criar registro de execução do nó
        const nodeExec = {
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
                    nodeExec.outputs = await this.executeAction(workflow, execution, node, node.config, nodeExec.inputs);
                    break;
                case 'condition':
                    nodeExec.outputs = await this.executeCondition(workflow, execution, node, node.config, nodeExec.inputs);
                    break;
                case 'loop':
                    nodeExec.outputs = await this.executeLoop(workflow, execution, node, node.config, nodeExec.inputs);
                    break;
                case 'parallel':
                    nodeExec.outputs = await this.executeParallel(workflow, execution, node, node.config, nodeExec.inputs);
                    break;
                case 'delay':
                    await this.executeDelay(execution, node.config);
                    nodeExec.outputs = nodeExec.inputs;
                    break;
                case 'subworkflow':
                    nodeExec.outputs = await this.executeSubworkflow(execution, node.config, nodeExec.inputs);
                    break;
            }
            nodeExec.state = 'completed';
            nodeExec.completedAt = Date.now();
            // Atualizar variáveis com outputs
            if (nodeExec.outputs) {
                Object.assign(execution.variables, nodeExec.outputs);
            }
        }
        catch (error) {
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
            }
            else {
                throw error;
            }
        }
    }
    gatherNodeInputs(workflow, execution, node) {
        const inputs = {};
        // Coletar de conexões
        const incomingConnections = workflow.connections.filter(c => c.targetNodeId === node.id);
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
    findNextNodes(workflow, execution, currentNode) {
        const connections = workflow.connections.filter(c => c.sourceNodeId === currentNode.id);
        const nextNodes = [];
        for (const conn of connections) {
            // Verificar condição da conexão
            if (conn.condition) {
                const result = this.expressionEngine.evaluate(conn.condition, execution.variables);
                if (!result)
                    continue;
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
    async executeAction(workflow, execution, node, config, inputs) {
        const action = this.actions.get(config.actionId);
        if (!action) {
            throw new Error(`Action not found: ${config.actionId}`);
        }
        // Resolver parâmetros
        const resolvedParams = {};
        for (const [key, value] of Object.entries(config.parameters)) {
            resolvedParams[key] = this.resolveParameterValue(value, execution.variables);
        }
        // Criar contexto
        const context = {
            executionId: execution.id,
            workflowId: workflow.id,
            variables: execution.variables,
            getSecret: async (name) => {
                const variable = workflow.variables.find(v => v.name === name && v.sensitive);
                return variable?.value;
            },
            log: (level, message, data) => {
                this.logExecution(execution, level, message, data);
            },
            isCancelled: () => execution.state === 'cancelled',
            onCancel: (callback) => {
                // Registrar callback de cancelamento
            },
        };
        // Executar
        return await action.execute({ ...inputs, ...resolvedParams }, context);
    }
    async executeCondition(workflow, execution, node, config, inputs) {
        let result;
        switch (config.conditionType) {
            case 'expression':
                result = this.expressionEngine.evaluate(config.expression || 'true', { ...execution.variables, ...inputs });
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
                result = this.expressionEngine.evaluate(config.filterExpression || 'true', { ...execution.variables, ...inputs });
                break;
        }
        return { result, condition: result };
    }
    async executeLoop(workflow, execution, node, config, inputs) {
        const nodeExec = execution.nodeExecutions.get(node.id);
        const results = [];
        switch (config.loopType) {
            case 'foreach':
                const collection = this.resolveValue(config.collection, execution.variables);
                if (!Array.isArray(collection)) {
                    throw new Error('Foreach requires an array');
                }
                nodeExec.iterations = collection.length;
                for (let i = 0; i < collection.length; i++) {
                    if (execution.state === 'cancelled')
                        break;
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
                    if (execution.state === 'cancelled')
                        break;
                    const condition = this.expressionEngine.evaluate(config.condition || 'false', execution.variables);
                    if (!condition)
                        break;
                    nodeExec.currentIteration = iteration;
                    iteration++;
                    results.push(iteration);
                }
                nodeExec.iterations = iteration;
                break;
            case 'times':
                const count = typeof config.count === 'number'
                    ? config.count
                    : Number(this.resolveValue(config.count, execution.variables));
                nodeExec.iterations = count;
                for (let i = 0; i < count; i++) {
                    if (execution.state === 'cancelled')
                        break;
                    nodeExec.currentIteration = i;
                    results.push(i);
                }
                break;
        }
        return { results, count: results.length };
    }
    async executeParallel(workflow, execution, node, config, inputs) {
        const promises = [];
        for (const branchNodeId of config.branches) {
            const branchNode = workflow.nodes.find(n => n.id === branchNodeId);
            if (branchNode) {
                promises.push(this.executeNode(workflow, execution, branchNode)
                    .catch(error => {
                    if (config.failFast)
                        throw error;
                    return { error };
                }));
            }
        }
        if (config.waitForAll) {
            const results = await Promise.all(promises);
            return { results };
        }
        else {
            const result = await Promise.race(promises);
            return { result };
        }
    }
    async executeDelay(execution, config) {
        let delayMs;
        switch (config.delayType) {
            case 'fixed':
                delayMs = config.duration || 0;
                break;
            case 'until':
                const targetTime = new Date(config.untilTime).getTime();
                delayMs = Math.max(0, targetTime - Date.now());
                break;
            case 'expression':
                delayMs = Number(this.expressionEngine.evaluate(config.delayExpression || '0', execution.variables));
                break;
            default:
                delayMs = 0;
        }
        execution.state = 'waiting';
        await new Promise(resolve => setTimeout(resolve, delayMs));
        execution.state = 'running';
    }
    async executeSubworkflow(parentExecution, config, inputs) {
        // Mapear inputs
        const subInputs = {};
        for (const [target, source] of Object.entries(config.inputMappings)) {
            subInputs[target] = this.resolveValue(source, inputs);
        }
        // Executar subworkflow
        const subExecution = await this.executeWorkflow(config.workflowId, {
            inputs: subInputs,
        });
        // Mapear outputs
        const outputs = {};
        for (const [target, source] of Object.entries(config.outputMappings)) {
            outputs[target] = subExecution.outputs?.[source];
        }
        return outputs;
    }
    // ========================================================================
    // HELPERS
    // ========================================================================
    resolveParameterValue(param, variables) {
        switch (param.type) {
            case 'literal':
                return param.value;
            case 'variable':
                return variables[param.variable];
            case 'expression':
                return this.expressionEngine.evaluate(param.expression, variables);
        }
    }
    resolveValue(value, variables) {
        if (!value)
            return undefined;
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
    logExecution(execution, level, message, data) {
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
    cancelExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (!execution)
            return;
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
    registerAction(action) {
        this.actions.set(action.id, action);
    }
    registerBuiltinActions() {
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
                context.log(inputs.level || 'info', inputs.message);
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
                const response = await fetch(inputs.url, {
                    method: inputs.method || 'GET',
                    headers: inputs.headers,
                    body: inputs.body ? JSON.stringify(inputs.body) : undefined,
                });
                return {
                    status: response.status,
                    data: await response.json().catch(() => null),
                    headers: (() => {
                        const out = {};
                        try {
                            response.headers?.forEach?.((v, k) => { out[k] = v; });
                        }
                        catch {
                            // ignore
                        }
                        return out;
                    })(),
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
                context.variables[inputs.name] = inputs.value;
                return { [inputs.name]: inputs.value };
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
                const result = this.expressionEngine.evaluate(inputs.expression, { data: inputs.data, ...context.variables });
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
                await new Promise(r => setTimeout(r, inputs.duration));
                return {};
            },
        });
    }
    // ========================================================================
    // QUERIES
    // ========================================================================
    getWorkflow(id) {
        return this.workflows.get(id);
    }
    getAllWorkflows() {
        return Array.from(this.workflows.values());
    }
    getExecution(id) {
        return this.executions.get(id);
    }
    getExecutions(workflowId) {
        let execs = Array.from(this.executions.values());
        if (workflowId) {
            execs = execs.filter(e => e.workflowId === workflowId);
        }
        return execs.sort((a, b) => b.startedAt - a.startedAt);
    }
    getAction(id) {
        return this.actions.get(id);
    }
    getAllActions() {
        return Array.from(this.actions.values());
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
    // ========================================================================
    // UTILITIES
    // ========================================================================
    generateId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Cleanup
     */
    dispose() {
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
};
exports.WorkflowAutomationEngine = WorkflowAutomationEngine;
exports.WorkflowAutomationEngine = WorkflowAutomationEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], WorkflowAutomationEngine);
// ============================================================================
// EXPRESSION ENGINE
// ============================================================================
class ExpressionEngine {
    evaluate(expression, context) {
        try {
            // Criar função segura com contexto
            const keys = Object.keys(context);
            const values = Object.values(context);
            // Sanitizar expressão
            const sanitized = this.sanitize(expression);
            const fn = new Function(...keys, `return ${sanitized}`);
            return fn(...values);
        }
        catch {
            return undefined;
        }
    }
    evaluateTemplate(template, context) {
        return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
            const result = this.evaluate(expr.trim(), context);
            return String(result ?? '');
        });
    }
    sanitize(expression) {
        // Remover construtos perigosos
        const dangerous = ['eval', 'Function', 'constructor', '__proto__', 'prototype'];
        let sanitized = expression;
        for (const word of dangerous) {
            sanitized = sanitized.replace(new RegExp(word, 'gi'), '');
        }
        return sanitized;
    }
}

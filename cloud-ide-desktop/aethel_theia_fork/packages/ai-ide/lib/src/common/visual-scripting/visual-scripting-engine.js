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
exports.VisualScriptingEngine = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
/**
 * Visual Scripting Engine - Main class
 */
let VisualScriptingEngine = class VisualScriptingEngine {
    constructor() {
        this.nodeDefinitions = new Map();
        this.graphs = new Map();
        this.executionStates = new Map();
        this.services = {};
        // Events
        this.onGraphCreatedEmitter = new common_1.Emitter();
        this.onGraphUpdatedEmitter = new common_1.Emitter();
        this.onGraphDeletedEmitter = new common_1.Emitter();
        this.onNodeAddedEmitter = new common_1.Emitter();
        this.onNodeRemovedEmitter = new common_1.Emitter();
        this.onConnectionAddedEmitter = new common_1.Emitter();
        this.onConnectionRemovedEmitter = new common_1.Emitter();
        this.onExecutionStartedEmitter = new common_1.Emitter();
        this.onExecutionStoppedEmitter = new common_1.Emitter();
        this.onExecutionErrorEmitter = new common_1.Emitter();
        this.onNodeExecutedEmitter = new common_1.Emitter();
        this.onGraphCreated = this.onGraphCreatedEmitter.event;
        this.onGraphUpdated = this.onGraphUpdatedEmitter.event;
        this.onGraphDeleted = this.onGraphDeletedEmitter.event;
        this.onNodeAdded = this.onNodeAddedEmitter.event;
        this.onNodeRemoved = this.onNodeRemovedEmitter.event;
        this.onConnectionAdded = this.onConnectionAddedEmitter.event;
        this.onConnectionRemoved = this.onConnectionRemovedEmitter.event;
        this.onExecutionStarted = this.onExecutionStartedEmitter.event;
        this.onExecutionStopped = this.onExecutionStoppedEmitter.event;
        this.onExecutionError = this.onExecutionErrorEmitter.event;
        this.onNodeExecuted = this.onNodeExecutedEmitter.event;
        this.registerBuiltinNodes();
    }
    // ========================================================================
    // NODE DEFINITION MANAGEMENT
    // ========================================================================
    /**
     * Register a node definition
     */
    registerNodeDefinition(definition) {
        this.nodeDefinitions.set(definition.type, definition);
    }
    /**
     * Get all registered node definitions
     */
    getNodeDefinitions() {
        return Array.from(this.nodeDefinitions.values());
    }
    /**
     * Get node definitions by category
     */
    getNodesByCategory(category) {
        return this.getNodeDefinitions().filter(d => d.category === category);
    }
    /**
     * Search node definitions
     */
    searchNodes(query) {
        const lowerQuery = query.toLowerCase();
        return this.getNodeDefinitions().filter(d => d.title.toLowerCase().includes(lowerQuery) ||
            d.description.toLowerCase().includes(lowerQuery) ||
            d.type.toLowerCase().includes(lowerQuery));
    }
    // ========================================================================
    // GRAPH MANAGEMENT
    // ========================================================================
    /**
     * Create a new visual graph
     */
    createGraph(name, description = '') {
        const graph = {
            id: this.generateId(),
            name,
            description,
            nodes: [],
            connections: [],
            variables: [],
            events: [],
            functions: [],
            metadata: {
                version: '1.0.0',
                author: '',
                createdAt: Date.now(),
                modifiedAt: Date.now(),
                tags: [],
            },
            viewport: { x: 0, y: 0, zoom: 1 },
        };
        this.graphs.set(graph.id, graph);
        this.onGraphCreatedEmitter.fire(graph);
        return graph;
    }
    /**
     * Get graph by ID
     */
    getGraph(graphId) {
        return this.graphs.get(graphId);
    }
    /**
     * Update graph
     */
    updateGraph(graphId, updates) {
        const graph = this.graphs.get(graphId);
        if (!graph)
            return undefined;
        Object.assign(graph, updates, {
            metadata: { ...graph.metadata, modifiedAt: Date.now() },
        });
        this.onGraphUpdatedEmitter.fire(graph);
        return graph;
    }
    /**
     * Delete graph
     */
    deleteGraph(graphId) {
        const deleted = this.graphs.delete(graphId);
        if (deleted) {
            this.executionStates.delete(graphId);
            this.onGraphDeletedEmitter.fire(graphId);
        }
        return deleted;
    }
    /**
     * Clone graph
     */
    cloneGraph(graphId, newName) {
        const original = this.graphs.get(graphId);
        if (!original)
            return undefined;
        const clone = JSON.parse(JSON.stringify(original));
        clone.id = this.generateId();
        clone.name = newName || `${original.name} (Copy)`;
        clone.metadata.createdAt = Date.now();
        clone.metadata.modifiedAt = Date.now();
        // Regenerate IDs for all nodes and connections
        const idMap = new Map();
        for (const node of clone.nodes) {
            const newId = this.generateId();
            idMap.set(node.id, newId);
            node.id = newId;
        }
        for (const connection of clone.connections) {
            connection.id = this.generateId();
            connection.sourceNodeId = idMap.get(connection.sourceNodeId) || connection.sourceNodeId;
            connection.targetNodeId = idMap.get(connection.targetNodeId) || connection.targetNodeId;
        }
        this.graphs.set(clone.id, clone);
        this.onGraphCreatedEmitter.fire(clone);
        return clone;
    }
    // ========================================================================
    // NODE MANAGEMENT
    // ========================================================================
    /**
     * Add node to graph
     */
    addNode(graphId, nodeType, position) {
        const graph = this.graphs.get(graphId);
        const definition = this.nodeDefinitions.get(nodeType);
        if (!graph || !definition)
            return undefined;
        const node = {
            id: this.generateId(),
            type: nodeType,
            category: definition.category,
            title: definition.title,
            description: definition.description,
            position,
            size: { width: 200, height: 100 },
            inputs: definition.inputs.map(input => ({ ...input, id: this.generateId() })),
            outputs: definition.outputs.map(output => ({ ...output, id: this.generateId() })),
            properties: { ...definition.defaultProperties },
            color: definition.color,
            icon: definition.icon,
            isPure: definition.isPure,
            isLatent: definition.isLatent,
        };
        graph.nodes.push(node);
        graph.metadata.modifiedAt = Date.now();
        this.onNodeAddedEmitter.fire({ graphId, node });
        return node;
    }
    /**
     * Remove node from graph
     */
    removeNode(graphId, nodeId) {
        const graph = this.graphs.get(graphId);
        if (!graph)
            return false;
        const index = graph.nodes.findIndex(n => n.id === nodeId);
        if (index === -1)
            return false;
        // Remove node
        graph.nodes.splice(index, 1);
        // Remove all connections to/from this node
        graph.connections = graph.connections.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId);
        graph.metadata.modifiedAt = Date.now();
        this.onNodeRemovedEmitter.fire({ graphId, nodeId });
        return true;
    }
    /**
     * Update node properties
     */
    updateNode(graphId, nodeId, updates) {
        const graph = this.graphs.get(graphId);
        if (!graph)
            return undefined;
        const node = graph.nodes.find(n => n.id === nodeId);
        if (!node)
            return undefined;
        Object.assign(node, updates);
        graph.metadata.modifiedAt = Date.now();
        return node;
    }
    /**
     * Move node
     */
    moveNode(graphId, nodeId, position) {
        const result = this.updateNode(graphId, nodeId, { position });
        return result !== undefined;
    }
    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================
    /**
     * Add connection between nodes
     */
    addConnection(graphId, sourceNodeId, sourcePortId, targetNodeId, targetPortId) {
        const graph = this.graphs.get(graphId);
        if (!graph)
            return undefined;
        // Validate connection
        const sourceNode = graph.nodes.find(n => n.id === sourceNodeId);
        const targetNode = graph.nodes.find(n => n.id === targetNodeId);
        if (!sourceNode || !targetNode)
            return undefined;
        const sourcePort = sourceNode.outputs.find(p => p.id === sourcePortId);
        const targetPort = targetNode.inputs.find(p => p.id === targetPortId);
        if (!sourcePort || !targetPort)
            return undefined;
        // Check type compatibility
        if (!this.areTypesCompatible(sourcePort.type, targetPort.type)) {
            return undefined;
        }
        // Check if connection already exists
        const existingConnection = graph.connections.find(c => c.targetNodeId === targetNodeId && c.targetPortId === targetPortId);
        if (existingConnection && !targetPort.allowMultiple) {
            // Remove existing connection
            this.removeConnection(graphId, existingConnection.id);
        }
        // Prevent cycles (for non-exec connections)
        if (sourcePort.type !== 'exec' && this.wouldCreateCycle(graph, sourceNodeId, targetNodeId)) {
            return undefined;
        }
        const connection = {
            id: this.generateId(),
            sourceNodeId,
            sourcePortId,
            targetNodeId,
            targetPortId,
        };
        graph.connections.push(connection);
        graph.metadata.modifiedAt = Date.now();
        this.onConnectionAddedEmitter.fire({ graphId, connection });
        return connection;
    }
    /**
     * Remove connection
     */
    removeConnection(graphId, connectionId) {
        const graph = this.graphs.get(graphId);
        if (!graph)
            return false;
        const index = graph.connections.findIndex(c => c.id === connectionId);
        if (index === -1)
            return false;
        graph.connections.splice(index, 1);
        graph.metadata.modifiedAt = Date.now();
        this.onConnectionRemovedEmitter.fire({ graphId, connectionId });
        return true;
    }
    /**
     * Check if types are compatible
     */
    areTypesCompatible(sourceType, targetType) {
        if (sourceType === targetType)
            return true;
        if (targetType === 'any')
            return true;
        if (sourceType === 'any')
            return true;
        // Numeric compatibility
        if (sourceType === 'number' && targetType === 'string')
            return true;
        if (sourceType === 'boolean' && targetType === 'string')
            return true;
        // Object compatibility
        if (sourceType === 'object' && ['entity', 'component', 'mesh', 'material', 'texture', 'audio'].includes(targetType)) {
            return true;
        }
        return false;
    }
    /**
     * Check if adding connection would create a cycle
     */
    wouldCreateCycle(graph, sourceId, targetId) {
        const visited = new Set();
        const stack = [sourceId];
        while (stack.length > 0) {
            const nodeId = stack.pop();
            if (nodeId === targetId)
                return true;
            if (visited.has(nodeId))
                continue;
            visited.add(nodeId);
            // Find all nodes that feed into this node
            const incomingConnections = graph.connections.filter(c => c.targetNodeId === nodeId);
            for (const conn of incomingConnections) {
                stack.push(conn.sourceNodeId);
            }
        }
        return false;
    }
    // ========================================================================
    // EXECUTION ENGINE
    // ========================================================================
    /**
     * Start executing a graph
     */
    async startExecution(graphId) {
        const graph = this.graphs.get(graphId);
        if (!graph) {
            throw new Error(`Graph ${graphId} not found`);
        }
        // Initialize execution state
        const state = {
            graphId,
            status: 'running',
            executionStack: [],
            variables: new Map(),
            startTime: Date.now(),
            frameCount: 0,
        };
        // Initialize variables with defaults
        for (const variable of graph.variables) {
            state.variables.set(variable.name, variable.defaultValue);
        }
        this.executionStates.set(graphId, state);
        this.onExecutionStartedEmitter.fire(graphId);
        // Find and execute entry points (Event nodes)
        const entryNodes = graph.nodes.filter(n => n.type === 'event-begin-play' ||
            n.type === 'event-tick' ||
            n.type.startsWith('event-'));
        try {
            // Execute BeginPlay events
            for (const node of entryNodes.filter(n => n.type === 'event-begin-play')) {
                await this.executeNode(graph, node, state);
            }
        }
        catch (error) {
            state.status = 'error';
            state.lastError = error;
            this.onExecutionErrorEmitter.fire({ graphId, error: error });
        }
    }
    /**
     * Stop graph execution
     */
    stopExecution(graphId) {
        const state = this.executionStates.get(graphId);
        if (state) {
            state.status = 'stopped';
            this.onExecutionStoppedEmitter.fire(graphId);
        }
    }
    /**
     * Pause graph execution
     */
    pauseExecution(graphId) {
        const state = this.executionStates.get(graphId);
        if (state && state.status === 'running') {
            state.status = 'paused';
        }
    }
    /**
     * Resume graph execution
     */
    resumeExecution(graphId) {
        const state = this.executionStates.get(graphId);
        if (state && state.status === 'paused') {
            state.status = 'running';
        }
    }
    /**
     * Tick execution (call every frame for Tick events)
     */
    async tickExecution(graphId, deltaTime) {
        const state = this.executionStates.get(graphId);
        const graph = this.graphs.get(graphId);
        if (!state || !graph || state.status !== 'running')
            return;
        state.frameCount++;
        // Execute Tick events
        const tickNodes = graph.nodes.filter(n => n.type === 'event-tick');
        for (const node of tickNodes) {
            try {
                await this.executeNode(graph, node, state, { deltaTime });
            }
            catch (error) {
                state.status = 'error';
                state.lastError = error;
                this.onExecutionErrorEmitter.fire({ graphId, error: error });
                break;
            }
        }
    }
    /**
     * Execute a single node
     */
    async executeNode(graph, node, state, additionalInputs = {}) {
        if (state.status !== 'running') {
            return {};
        }
        state.currentNodeId = node.id;
        state.executionStack.push(node.id);
        const definition = this.nodeDefinitions.get(node.type);
        if (!definition) {
            throw new Error(`Node definition not found for type: ${node.type}`);
        }
        // Collect inputs from connected nodes
        const inputs = await this.collectInputs(graph, node, state);
        Object.assign(inputs, additionalInputs);
        // Create execution context
        const context = this.createExecutionContext(graph, node, state);
        // Execute the node
        const outputs = await definition.execute(context, inputs, node.properties);
        // Fire execution event
        this.onNodeExecutedEmitter.fire({ graphId: graph.id, nodeId: node.id, outputs });
        // Execute connected exec nodes
        for (const output of node.outputs.filter(p => p.type === 'exec')) {
            const execConnection = graph.connections.find(c => c.sourceNodeId === node.id && c.sourcePortId === output.id);
            if (execConnection) {
                const nextNode = graph.nodes.find(n => n.id === execConnection.targetNodeId);
                if (nextNode) {
                    await this.executeNode(graph, nextNode, state);
                }
            }
        }
        state.executionStack.pop();
        return outputs;
    }
    /**
     * Collect inputs for a node from connected nodes
     */
    async collectInputs(graph, node, state) {
        const inputs = {};
        for (const inputPort of node.inputs) {
            if (inputPort.type === 'exec')
                continue;
            const connection = graph.connections.find(c => c.targetNodeId === node.id && c.targetPortId === inputPort.id);
            if (connection) {
                // Get value from connected node
                const sourceNode = graph.nodes.find(n => n.id === connection.sourceNodeId);
                if (sourceNode) {
                    const definition = this.nodeDefinitions.get(sourceNode.type);
                    if (definition && definition.isPure) {
                        // Pure nodes can be executed inline
                        const sourceInputs = await this.collectInputs(graph, sourceNode, state);
                        const context = this.createExecutionContext(graph, sourceNode, state);
                        const outputs = await definition.execute(context, sourceInputs, sourceNode.properties);
                        const sourcePort = sourceNode.outputs.find(p => p.id === connection.sourcePortId);
                        if (sourcePort) {
                            inputs[inputPort.name] = outputs[sourcePort.name];
                        }
                    }
                    else {
                        // Non-pure nodes use cached values
                        inputs[inputPort.name] = state.variables.get(`${sourceNode.id}.${connection.sourcePortId}`);
                    }
                }
            }
            else {
                // Use default value
                inputs[inputPort.name] = inputPort.defaultValue;
            }
        }
        return inputs;
    }
    /**
     * Create execution context for a node
     */
    createExecutionContext(graph, node, state) {
        return {
            graphId: graph.id,
            nodeId: node.id,
            variables: state.variables,
            deltaTime: 0.016, // Default 60fps
            totalTime: (Date.now() - state.startTime) / 1000,
            frameCount: state.frameCount,
            services: this.services,
            emit: (event, data) => {
                // Trigger custom event nodes
                const eventNodes = graph.nodes.filter(n => n.type === `event-custom-${event}`);
                for (const eventNode of eventNodes) {
                    this.executeNode(graph, eventNode, state, { eventData: data });
                }
            },
            log: (message, level = 'info') => {
                console.log(`[${level.toUpperCase()}] [${node.title}] ${message}`);
            },
            getVariable: (name) => state.variables.get(name),
            setVariable: (name, value) => state.variables.set(name, value),
            triggerExec: async (portId) => {
                const connection = graph.connections.find(c => c.sourceNodeId === node.id && c.sourcePortId === portId);
                if (connection) {
                    const nextNode = graph.nodes.find(n => n.id === connection.targetNodeId);
                    if (nextNode) {
                        await this.executeNode(graph, nextNode, state);
                    }
                }
            },
        };
    }
    // ========================================================================
    // SERIALIZATION
    // ========================================================================
    /**
     * Export graph to JSON
     */
    exportGraph(graphId) {
        const graph = this.graphs.get(graphId);
        if (!graph)
            return undefined;
        return JSON.stringify(graph, null, 2);
    }
    /**
     * Import graph from JSON
     */
    importGraph(json) {
        try {
            const graph = JSON.parse(json);
            // Validate basic structure
            if (!graph.id || !graph.nodes || !graph.connections) {
                throw new Error('Invalid graph structure');
            }
            // Regenerate ID to avoid conflicts
            graph.id = this.generateId();
            this.graphs.set(graph.id, graph);
            this.onGraphCreatedEmitter.fire(graph);
            return graph;
        }
        catch (error) {
            console.error('Failed to import graph:', error);
            return undefined;
        }
    }
    // ========================================================================
    // CODE GENERATION
    // ========================================================================
    /**
     * Generate TypeScript code from graph
     */
    generateCode(graphId) {
        const graph = this.graphs.get(graphId);
        if (!graph)
            return undefined;
        const lines = [];
        lines.push(`// Auto-generated from Visual Script: ${graph.name}`);
        lines.push(`// Generated at: ${new Date().toISOString()}`);
        lines.push('');
        lines.push('import { ScriptComponent } from "@aethel/core";');
        lines.push('');
        lines.push(`export class ${this.toPascalCase(graph.name)} extends ScriptComponent {`);
        // Generate variables
        for (const variable of graph.variables) {
            const typeStr = this.portTypeToTS(variable.type);
            const defaultStr = JSON.stringify(variable.defaultValue);
            lines.push(`  ${variable.isPublic ? 'public' : 'private'} ${variable.name}: ${typeStr} = ${defaultStr};`);
        }
        lines.push('');
        // Generate BeginPlay
        const beginPlayNode = graph.nodes.find(n => n.type === 'event-begin-play');
        if (beginPlayNode) {
            lines.push('  onBeginPlay(): void {');
            lines.push(this.generateNodeChain(graph, beginPlayNode, 4));
            lines.push('  }');
            lines.push('');
        }
        // Generate Tick
        const tickNode = graph.nodes.find(n => n.type === 'event-tick');
        if (tickNode) {
            lines.push('  onTick(deltaTime: number): void {');
            lines.push(this.generateNodeChain(graph, tickNode, 4));
            lines.push('  }');
        }
        lines.push('}');
        return lines.join('\n');
    }
    generateNodeChain(graph, node, indent) {
        const pad = ' '.repeat(indent);
        const lines = [];
        // Find next execution node
        const execOutput = node.outputs.find(p => p.type === 'exec');
        if (execOutput) {
            const connection = graph.connections.find(c => c.sourceNodeId === node.id && c.sourcePortId === execOutput.id);
            if (connection) {
                const nextNode = graph.nodes.find(n => n.id === connection.targetNodeId);
                if (nextNode) {
                    lines.push(`${pad}// ${nextNode.title}`);
                    lines.push(`${pad}// TODO: Implement ${nextNode.type}`);
                    lines.push(this.generateNodeChain(graph, nextNode, indent));
                }
            }
        }
        return lines.join('\n');
    }
    portTypeToTS(type) {
        const typeMap = {
            'exec': 'void',
            'boolean': 'boolean',
            'number': 'number',
            'string': 'string',
            'vector2': '{ x: number; y: number }',
            'vector3': '{ x: number; y: number; z: number }',
            'color': '{ r: number; g: number; b: number; a: number }',
            'object': 'unknown',
            'array': 'unknown[]',
            'any': 'unknown',
            'texture': 'Texture',
            'mesh': 'Mesh',
            'material': 'Material',
            'audio': 'AudioClip',
            'entity': 'Entity',
            'component': 'Component',
            'event': 'Event',
            'delegate': 'Function',
        };
        return typeMap[type] || 'unknown';
    }
    toPascalCase(str) {
        return str
            .split(/[\s_-]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }
    // ========================================================================
    // BUILT-IN NODES
    // ========================================================================
    registerBuiltinNodes() {
        // Flow Control
        this.registerNodeDefinition({
            type: 'event-begin-play',
            category: 'events',
            title: 'Event Begin Play',
            description: 'Executed when the game starts',
            inputs: [],
            outputs: [{ name: 'exec', type: 'exec', direction: 'output' }],
            defaultProperties: {},
            color: '#ff0000',
            icon: 'play',
            execute: () => ({}),
        });
        this.registerNodeDefinition({
            type: 'event-tick',
            category: 'events',
            title: 'Event Tick',
            description: 'Executed every frame',
            inputs: [],
            outputs: [
                { name: 'exec', type: 'exec', direction: 'output' },
                { name: 'deltaTime', type: 'number', direction: 'output' },
            ],
            defaultProperties: {},
            color: '#ff0000',
            icon: 'timer',
            execute: (ctx) => ({ deltaTime: ctx.deltaTime }),
        });
        this.registerNodeDefinition({
            type: 'branch',
            category: 'flow-control',
            title: 'Branch',
            description: 'If/else conditional branch',
            inputs: [
                { name: 'exec', type: 'exec', direction: 'input' },
                { name: 'condition', type: 'boolean', direction: 'input' },
            ],
            outputs: [
                { name: 'true', type: 'exec', direction: 'output' },
                { name: 'false', type: 'exec', direction: 'output' },
            ],
            defaultProperties: {},
            color: '#ffffff',
            execute: async (ctx, inputs) => {
                if (inputs.condition) {
                    await ctx.triggerExec('true');
                }
                else {
                    await ctx.triggerExec('false');
                }
                return {};
            },
        });
        this.registerNodeDefinition({
            type: 'for-loop',
            category: 'flow-control',
            title: 'For Loop',
            description: 'Loop from start to end',
            inputs: [
                { name: 'exec', type: 'exec', direction: 'input' },
                { name: 'start', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'end', type: 'number', direction: 'input', defaultValue: 10 },
            ],
            outputs: [
                { name: 'body', type: 'exec', direction: 'output' },
                { name: 'index', type: 'number', direction: 'output' },
                { name: 'completed', type: 'exec', direction: 'output' },
            ],
            defaultProperties: {},
            color: '#ffffff',
            execute: async (ctx, inputs) => {
                const start = inputs.start;
                const end = inputs.end;
                for (let i = start; i < end; i++) {
                    ctx.setVariable(`${ctx.nodeId}.index`, i);
                    await ctx.triggerExec('body');
                }
                await ctx.triggerExec('completed');
                return { index: end };
            },
        });
        this.registerNodeDefinition({
            type: 'sequence',
            category: 'flow-control',
            title: 'Sequence',
            description: 'Execute multiple branches in sequence',
            inputs: [{ name: 'exec', type: 'exec', direction: 'input' }],
            outputs: [
                { name: 'then0', type: 'exec', direction: 'output' },
                { name: 'then1', type: 'exec', direction: 'output' },
                { name: 'then2', type: 'exec', direction: 'output' },
            ],
            defaultProperties: {},
            color: '#ffffff',
            execute: async (ctx) => {
                await ctx.triggerExec('then0');
                await ctx.triggerExec('then1');
                await ctx.triggerExec('then2');
                return {};
            },
        });
        // Math Nodes
        this.registerNodeDefinition({
            type: 'math-add',
            category: 'math',
            title: 'Add',
            description: 'Add two numbers',
            inputs: [
                { name: 'a', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'b', type: 'number', direction: 'input', defaultValue: 0 },
            ],
            outputs: [{ name: 'result', type: 'number', direction: 'output' }],
            defaultProperties: {},
            color: '#4caf50',
            isPure: true,
            execute: (_, inputs) => ({ result: inputs.a + inputs.b }),
        });
        this.registerNodeDefinition({
            type: 'math-subtract',
            category: 'math',
            title: 'Subtract',
            description: 'Subtract two numbers',
            inputs: [
                { name: 'a', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'b', type: 'number', direction: 'input', defaultValue: 0 },
            ],
            outputs: [{ name: 'result', type: 'number', direction: 'output' }],
            defaultProperties: {},
            color: '#4caf50',
            isPure: true,
            execute: (_, inputs) => ({ result: inputs.a - inputs.b }),
        });
        this.registerNodeDefinition({
            type: 'math-multiply',
            category: 'math',
            title: 'Multiply',
            description: 'Multiply two numbers',
            inputs: [
                { name: 'a', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'b', type: 'number', direction: 'input', defaultValue: 1 },
            ],
            outputs: [{ name: 'result', type: 'number', direction: 'output' }],
            defaultProperties: {},
            color: '#4caf50',
            isPure: true,
            execute: (_, inputs) => ({ result: inputs.a * inputs.b }),
        });
        this.registerNodeDefinition({
            type: 'math-divide',
            category: 'math',
            title: 'Divide',
            description: 'Divide two numbers',
            inputs: [
                { name: 'a', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'b', type: 'number', direction: 'input', defaultValue: 1 },
            ],
            outputs: [{ name: 'result', type: 'number', direction: 'output' }],
            defaultProperties: {},
            color: '#4caf50',
            isPure: true,
            execute: (_, inputs) => {
                const b = inputs.b;
                return { result: b !== 0 ? inputs.a / b : 0 };
            },
        });
        this.registerNodeDefinition({
            type: 'math-clamp',
            category: 'math',
            title: 'Clamp',
            description: 'Clamp value between min and max',
            inputs: [
                { name: 'value', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'min', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'max', type: 'number', direction: 'input', defaultValue: 1 },
            ],
            outputs: [{ name: 'result', type: 'number', direction: 'output' }],
            defaultProperties: {},
            color: '#4caf50',
            isPure: true,
            execute: (_, inputs) => ({
                result: Math.min(Math.max(inputs.value, inputs.min), inputs.max),
            }),
        });
        this.registerNodeDefinition({
            type: 'math-lerp',
            category: 'math',
            title: 'Lerp',
            description: 'Linear interpolation',
            inputs: [
                { name: 'a', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'b', type: 'number', direction: 'input', defaultValue: 1 },
                { name: 't', type: 'number', direction: 'input', defaultValue: 0.5 },
            ],
            outputs: [{ name: 'result', type: 'number', direction: 'output' }],
            defaultProperties: {},
            color: '#4caf50',
            isPure: true,
            execute: (_, inputs) => {
                const a = inputs.a;
                const b = inputs.b;
                const t = inputs.t;
                return { result: a + (b - a) * t };
            },
        });
        // Logic Nodes
        this.registerNodeDefinition({
            type: 'logic-and',
            category: 'logic',
            title: 'AND',
            description: 'Logical AND',
            inputs: [
                { name: 'a', type: 'boolean', direction: 'input', defaultValue: false },
                { name: 'b', type: 'boolean', direction: 'input', defaultValue: false },
            ],
            outputs: [{ name: 'result', type: 'boolean', direction: 'output' }],
            defaultProperties: {},
            color: '#2196f3',
            isPure: true,
            execute: (_, inputs) => ({ result: inputs.a && inputs.b }),
        });
        this.registerNodeDefinition({
            type: 'logic-or',
            category: 'logic',
            title: 'OR',
            description: 'Logical OR',
            inputs: [
                { name: 'a', type: 'boolean', direction: 'input', defaultValue: false },
                { name: 'b', type: 'boolean', direction: 'input', defaultValue: false },
            ],
            outputs: [{ name: 'result', type: 'boolean', direction: 'output' }],
            defaultProperties: {},
            color: '#2196f3',
            isPure: true,
            execute: (_, inputs) => ({ result: inputs.a || inputs.b }),
        });
        this.registerNodeDefinition({
            type: 'logic-not',
            category: 'logic',
            title: 'NOT',
            description: 'Logical NOT',
            inputs: [{ name: 'value', type: 'boolean', direction: 'input', defaultValue: false }],
            outputs: [{ name: 'result', type: 'boolean', direction: 'output' }],
            defaultProperties: {},
            color: '#2196f3',
            isPure: true,
            execute: (_, inputs) => ({ result: !inputs.value }),
        });
        this.registerNodeDefinition({
            type: 'compare-equal',
            category: 'logic',
            title: 'Equal',
            description: 'Compare if two values are equal',
            inputs: [
                { name: 'a', type: 'any', direction: 'input' },
                { name: 'b', type: 'any', direction: 'input' },
            ],
            outputs: [{ name: 'result', type: 'boolean', direction: 'output' }],
            defaultProperties: {},
            color: '#2196f3',
            isPure: true,
            execute: (_, inputs) => ({ result: inputs.a === inputs.b }),
        });
        this.registerNodeDefinition({
            type: 'compare-greater',
            category: 'logic',
            title: 'Greater Than',
            description: 'Check if A > B',
            inputs: [
                { name: 'a', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'b', type: 'number', direction: 'input', defaultValue: 0 },
            ],
            outputs: [{ name: 'result', type: 'boolean', direction: 'output' }],
            defaultProperties: {},
            color: '#2196f3',
            isPure: true,
            execute: (_, inputs) => ({ result: inputs.a > inputs.b }),
        });
        // Variable Nodes
        this.registerNodeDefinition({
            type: 'get-variable',
            category: 'variables',
            title: 'Get Variable',
            description: 'Get a variable value',
            inputs: [],
            outputs: [{ name: 'value', type: 'any', direction: 'output' }],
            defaultProperties: { variableName: '' },
            color: '#9c27b0',
            isPure: true,
            execute: (ctx, _, props) => ({ value: ctx.getVariable(props.variableName) }),
        });
        this.registerNodeDefinition({
            type: 'set-variable',
            category: 'variables',
            title: 'Set Variable',
            description: 'Set a variable value',
            inputs: [
                { name: 'exec', type: 'exec', direction: 'input' },
                { name: 'value', type: 'any', direction: 'input' },
            ],
            outputs: [{ name: 'exec', type: 'exec', direction: 'output' }],
            defaultProperties: { variableName: '' },
            color: '#9c27b0',
            execute: (ctx, inputs, props) => {
                ctx.setVariable(props.variableName, inputs.value);
                return {};
            },
        });
        // Utility Nodes
        this.registerNodeDefinition({
            type: 'print',
            category: 'utilities',
            title: 'Print String',
            description: 'Print a message to the log',
            inputs: [
                { name: 'exec', type: 'exec', direction: 'input' },
                { name: 'message', type: 'string', direction: 'input', defaultValue: '' },
            ],
            outputs: [{ name: 'exec', type: 'exec', direction: 'output' }],
            defaultProperties: {},
            color: '#ff9800',
            execute: (ctx, inputs) => {
                ctx.log(inputs.message);
                return {};
            },
        });
        this.registerNodeDefinition({
            type: 'delay',
            category: 'utilities',
            title: 'Delay',
            description: 'Wait for a duration',
            inputs: [
                { name: 'exec', type: 'exec', direction: 'input' },
                { name: 'duration', type: 'number', direction: 'input', defaultValue: 1 },
            ],
            outputs: [{ name: 'exec', type: 'exec', direction: 'output' }],
            defaultProperties: {},
            color: '#ff9800',
            isLatent: true,
            execute: async (_, inputs) => {
                await new Promise(resolve => setTimeout(resolve, inputs.duration * 1000));
                return {};
            },
        });
        // Make Vector Nodes
        this.registerNodeDefinition({
            type: 'make-vector3',
            category: 'math',
            title: 'Make Vector3',
            description: 'Create a Vector3 from components',
            inputs: [
                { name: 'x', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'y', type: 'number', direction: 'input', defaultValue: 0 },
                { name: 'z', type: 'number', direction: 'input', defaultValue: 0 },
            ],
            outputs: [{ name: 'vector', type: 'vector3', direction: 'output' }],
            defaultProperties: {},
            color: '#ffeb3b',
            isPure: true,
            execute: (_, inputs) => ({
                vector: { x: inputs.x, y: inputs.y, z: inputs.z },
            }),
        });
        this.registerNodeDefinition({
            type: 'break-vector3',
            category: 'math',
            title: 'Break Vector3',
            description: 'Break Vector3 into components',
            inputs: [{ name: 'vector', type: 'vector3', direction: 'input' }],
            outputs: [
                { name: 'x', type: 'number', direction: 'output' },
                { name: 'y', type: 'number', direction: 'output' },
                { name: 'z', type: 'number', direction: 'output' },
            ],
            defaultProperties: {},
            color: '#ffeb3b',
            isPure: true,
            execute: (_, inputs) => {
                const v = inputs.vector || { x: 0, y: 0, z: 0 };
                return { x: v.x, y: v.y, z: v.z };
            },
        });
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    generateId() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Register context services
     */
    registerServices(services) {
        Object.assign(this.services, services);
    }
};
exports.VisualScriptingEngine = VisualScriptingEngine;
exports.VisualScriptingEngine = VisualScriptingEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], VisualScriptingEngine);
exports.default = VisualScriptingEngine;

import { Event } from '@theia/core/lib/common';
/**
 * Node port types for connections
 */
export type PortType = 'exec' | 'boolean' | 'number' | 'string' | 'vector2' | 'vector3' | 'color' | 'object' | 'array' | 'any' | 'texture' | 'mesh' | 'material' | 'audio' | 'entity' | 'component' | 'event' | 'delegate';
/**
 * Node categories for organization
 */
export type NodeCategory = 'flow-control' | 'math' | 'logic' | 'variables' | 'events' | 'functions' | 'input' | 'physics' | 'audio' | 'rendering' | 'ai' | 'networking' | 'animation' | 'ui' | 'utilities' | 'custom';
/**
 * Port definition
 */
export interface NodePort {
    id: string;
    name: string;
    type: PortType;
    direction: 'input' | 'output';
    defaultValue?: unknown;
    allowMultiple?: boolean;
    description?: string;
    hidden?: boolean;
}
/**
 * Connection between ports
 */
export interface NodeConnection {
    id: string;
    sourceNodeId: string;
    sourcePortId: string;
    targetNodeId: string;
    targetPortId: string;
}
/**
 * Node position in canvas
 */
export interface NodePosition {
    x: number;
    y: number;
}
/**
 * Node size
 */
export interface NodeSize {
    width: number;
    height: number;
}
/**
 * Base node definition
 */
export interface VisualNode {
    id: string;
    type: string;
    category: NodeCategory;
    title: string;
    description: string;
    position: NodePosition;
    size: NodeSize;
    inputs: NodePort[];
    outputs: NodePort[];
    properties: Record<string, unknown>;
    color?: string;
    icon?: string;
    isPure?: boolean;
    isLatent?: boolean;
    isCompact?: boolean;
    metadata?: Record<string, unknown>;
}
/**
 * Node definition template for node library
 */
export interface NodeDefinition {
    type: string;
    category: NodeCategory;
    title: string;
    description: string;
    inputs: Omit<NodePort, 'id'>[];
    outputs: Omit<NodePort, 'id'>[];
    defaultProperties: Record<string, unknown>;
    color?: string;
    icon?: string;
    isPure?: boolean;
    isLatent?: boolean;
    execute: NodeExecutor;
}
/**
 * Node executor function type
 */
export type NodeExecutor = (context: ExecutionContext, inputs: Record<string, unknown>, properties: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
/**
 * Execution context for nodes
 */
export interface ExecutionContext {
    graphId: string;
    nodeId: string;
    variables: Map<string, unknown>;
    deltaTime: number;
    totalTime: number;
    frameCount: number;
    services: ContextServices;
    emit: (event: string, data: unknown) => void;
    log: (message: string, level?: 'info' | 'warn' | 'error') => void;
    getVariable: (name: string) => unknown;
    setVariable: (name: string, value: unknown) => void;
    triggerExec: (portId: string) => Promise<void>;
}
/**
 * Services available to nodes
 */
export interface ContextServices {
    physics: PhysicsService;
    audio: AudioService;
    input: InputService;
    rendering: RenderingService;
    ai: AIService;
    network: NetworkService;
    storage: StorageService;
}
interface PhysicsService {
    raycast(origin: Vector3, direction: Vector3, maxDistance: number): RaycastHit | null;
    addForce(entityId: string, force: Vector3): void;
    setVelocity(entityId: string, velocity: Vector3): void;
}
interface AudioService {
    play(clipId: string, options?: AudioPlayOptions): string;
    stop(instanceId: string): void;
    setVolume(instanceId: string, volume: number): void;
}
interface InputService {
    isKeyDown(key: string): boolean;
    isKeyPressed(key: string): boolean;
    getAxis(axis: string): number;
    getMousePosition(): Vector2;
}
interface RenderingService {
    setMaterial(entityId: string, materialId: string): void;
    setVisible(entityId: string, visible: boolean): void;
    spawn(prefabId: string, position: Vector3): string;
}
interface AIService {
    query(prompt: string): Promise<string>;
    generatePath(start: Vector3, end: Vector3): Vector3[];
}
interface NetworkService {
    send(channel: string, data: unknown): void;
    broadcast(channel: string, data: unknown): void;
}
interface StorageService {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
    remove(key: string): void;
}
interface Vector2 {
    x: number;
    y: number;
}
interface Vector3 {
    x: number;
    y: number;
    z: number;
}
interface RaycastHit {
    point: Vector3;
    normal: Vector3;
    entityId: string;
    distance: number;
}
interface AudioPlayOptions {
    volume?: number;
    loop?: boolean;
    spatial?: boolean;
}
/**
 * Visual graph containing nodes and connections
 */
export interface VisualGraph {
    id: string;
    name: string;
    description: string;
    nodes: VisualNode[];
    connections: NodeConnection[];
    variables: GraphVariable[];
    events: GraphEvent[];
    functions: GraphFunction[];
    metadata: {
        version: string;
        author: string;
        createdAt: number;
        modifiedAt: number;
        tags: string[];
    };
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
}
/**
 * Graph variable definition
 */
export interface GraphVariable {
    id: string;
    name: string;
    type: PortType;
    defaultValue: unknown;
    isPublic: boolean;
    category?: string;
    description?: string;
}
/**
 * Custom event definition
 */
export interface GraphEvent {
    id: string;
    name: string;
    parameters: Array<{
        name: string;
        type: PortType;
    }>;
    description?: string;
}
/**
 * Custom function definition
 */
export interface GraphFunction {
    id: string;
    name: string;
    inputs: Array<{
        name: string;
        type: PortType;
    }>;
    outputs: Array<{
        name: string;
        type: PortType;
    }>;
    nodes: VisualNode[];
    connections: NodeConnection[];
    description?: string;
    isPure?: boolean;
}
/**
 * Execution state for a running graph
 */
export interface GraphExecutionState {
    graphId: string;
    status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
    currentNodeId?: string;
    executionStack: string[];
    variables: Map<string, unknown>;
    startTime: number;
    frameCount: number;
    lastError?: Error;
}
/**
 * Visual Scripting Engine - Main class
 */
export declare class VisualScriptingEngine {
    private readonly nodeDefinitions;
    private readonly graphs;
    private readonly executionStates;
    private readonly services;
    private readonly onGraphCreatedEmitter;
    private readonly onGraphUpdatedEmitter;
    private readonly onGraphDeletedEmitter;
    private readonly onNodeAddedEmitter;
    private readonly onNodeRemovedEmitter;
    private readonly onConnectionAddedEmitter;
    private readonly onConnectionRemovedEmitter;
    private readonly onExecutionStartedEmitter;
    private readonly onExecutionStoppedEmitter;
    private readonly onExecutionErrorEmitter;
    private readonly onNodeExecutedEmitter;
    readonly onGraphCreated: Event<VisualGraph>;
    readonly onGraphUpdated: Event<VisualGraph>;
    readonly onGraphDeleted: Event<string>;
    readonly onNodeAdded: Event<{
        graphId: string;
        node: VisualNode;
    }>;
    readonly onNodeRemoved: Event<{
        graphId: string;
        nodeId: string;
    }>;
    readonly onConnectionAdded: Event<{
        graphId: string;
        connection: NodeConnection;
    }>;
    readonly onConnectionRemoved: Event<{
        graphId: string;
        connectionId: string;
    }>;
    readonly onExecutionStarted: Event<string>;
    readonly onExecutionStopped: Event<string>;
    readonly onExecutionError: Event<{
        graphId: string;
        error: Error;
    }>;
    readonly onNodeExecuted: Event<{
        graphId: string;
        nodeId: string;
        outputs: Record<string, unknown>;
    }>;
    constructor();
    /**
     * Register a node definition
     */
    registerNodeDefinition(definition: NodeDefinition): void;
    /**
     * Get all registered node definitions
     */
    getNodeDefinitions(): NodeDefinition[];
    /**
     * Get node definitions by category
     */
    getNodesByCategory(category: NodeCategory): NodeDefinition[];
    /**
     * Search node definitions
     */
    searchNodes(query: string): NodeDefinition[];
    /**
     * Create a new visual graph
     */
    createGraph(name: string, description?: string): VisualGraph;
    /**
     * Get graph by ID
     */
    getGraph(graphId: string): VisualGraph | undefined;
    /**
     * Update graph
     */
    updateGraph(graphId: string, updates: Partial<VisualGraph>): VisualGraph | undefined;
    /**
     * Delete graph
     */
    deleteGraph(graphId: string): boolean;
    /**
     * Clone graph
     */
    cloneGraph(graphId: string, newName?: string): VisualGraph | undefined;
    /**
     * Add node to graph
     */
    addNode(graphId: string, nodeType: string, position: NodePosition): VisualNode | undefined;
    /**
     * Remove node from graph
     */
    removeNode(graphId: string, nodeId: string): boolean;
    /**
     * Update node properties
     */
    updateNode(graphId: string, nodeId: string, updates: Partial<VisualNode>): VisualNode | undefined;
    /**
     * Move node
     */
    moveNode(graphId: string, nodeId: string, position: NodePosition): boolean;
    /**
     * Add connection between nodes
     */
    addConnection(graphId: string, sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string): NodeConnection | undefined;
    /**
     * Remove connection
     */
    removeConnection(graphId: string, connectionId: string): boolean;
    /**
     * Check if types are compatible
     */
    private areTypesCompatible;
    /**
     * Check if adding connection would create a cycle
     */
    private wouldCreateCycle;
    /**
     * Start executing a graph
     */
    startExecution(graphId: string): Promise<void>;
    /**
     * Stop graph execution
     */
    stopExecution(graphId: string): void;
    /**
     * Pause graph execution
     */
    pauseExecution(graphId: string): void;
    /**
     * Resume graph execution
     */
    resumeExecution(graphId: string): void;
    /**
     * Tick execution (call every frame for Tick events)
     */
    tickExecution(graphId: string, deltaTime: number): Promise<void>;
    /**
     * Execute a single node
     */
    private executeNode;
    /**
     * Collect inputs for a node from connected nodes
     */
    private collectInputs;
    /**
     * Create execution context for a node
     */
    private createExecutionContext;
    /**
     * Export graph to JSON
     */
    exportGraph(graphId: string): string | undefined;
    /**
     * Import graph from JSON
     */
    importGraph(json: string): VisualGraph | undefined;
    /**
     * Generate TypeScript code from graph
     */
    generateCode(graphId: string): string | undefined;
    private generateNodeChain;
    private portTypeToTS;
    private toPascalCase;
    private registerBuiltinNodes;
    private generateId;
    /**
     * Register context services
     */
    registerServices(services: Partial<ContextServices>): void;
}
export default VisualScriptingEngine;

import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL VISUAL SCRIPTING ENGINE - Blueprint-style Node System
// Production-ready implementation for visual programming
// ============================================================================

/**
 * Node port types for connections
 */
export type PortType = 
  | 'exec'        // Execution flow
  | 'boolean'     // Boolean value
  | 'number'      // Number value
  | 'string'      // String value
  | 'vector2'     // 2D vector
  | 'vector3'     // 3D vector
  | 'color'       // RGBA color
  | 'object'      // Generic object
  | 'array'       // Array of any type
  | 'any'         // Any type (wildcard)
  | 'texture'     // Texture reference
  | 'mesh'        // Mesh reference
  | 'material'    // Material reference
  | 'audio'       // Audio clip
  | 'entity'      // Entity reference
  | 'component'   // Component reference
  | 'event'       // Event data
  | 'delegate';   // Function delegate

/**
 * Node categories for organization
 */
export type NodeCategory = 
  | 'flow-control'
  | 'math'
  | 'logic'
  | 'variables'
  | 'events'
  | 'functions'
  | 'input'
  | 'physics'
  | 'audio'
  | 'rendering'
  | 'ai'
  | 'networking'
  | 'animation'
  | 'ui'
  | 'utilities'
  | 'custom';

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
  isPure?: boolean;  // Pure nodes don't affect execution flow
  isLatent?: boolean; // Latent nodes run async
  isCompact?: boolean; // Compact display mode
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
export type NodeExecutor = (
  context: ExecutionContext,
  inputs: Record<string, unknown>,
  properties: Record<string, unknown>
) => Promise<Record<string, unknown>> | Record<string, unknown>;

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

// Service interfaces (stubs - real implementations in respective engines)
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

interface Vector2 { x: number; y: number; }
interface Vector3 { x: number; y: number; z: number; }
interface RaycastHit { point: Vector3; normal: Vector3; entityId: string; distance: number; }
interface AudioPlayOptions { volume?: number; loop?: boolean; spatial?: boolean; }

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
  parameters: Array<{ name: string; type: PortType }>;
  description?: string;
}

/**
 * Custom function definition
 */
export interface GraphFunction {
  id: string;
  name: string;
  inputs: Array<{ name: string; type: PortType }>;
  outputs: Array<{ name: string; type: PortType }>;
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
@injectable()
export class VisualScriptingEngine {
  private readonly nodeDefinitions = new Map<string, NodeDefinition>();
  private readonly graphs = new Map<string, VisualGraph>();
  private readonly executionStates = new Map<string, GraphExecutionState>();
  private readonly services: Partial<ContextServices> = {};

  // Events
  private readonly onGraphCreatedEmitter = new Emitter<VisualGraph>();
  private readonly onGraphUpdatedEmitter = new Emitter<VisualGraph>();
  private readonly onGraphDeletedEmitter = new Emitter<string>();
  private readonly onNodeAddedEmitter = new Emitter<{ graphId: string; node: VisualNode }>();
  private readonly onNodeRemovedEmitter = new Emitter<{ graphId: string; nodeId: string }>();
  private readonly onConnectionAddedEmitter = new Emitter<{ graphId: string; connection: NodeConnection }>();
  private readonly onConnectionRemovedEmitter = new Emitter<{ graphId: string; connectionId: string }>();
  private readonly onExecutionStartedEmitter = new Emitter<string>();
  private readonly onExecutionStoppedEmitter = new Emitter<string>();
  private readonly onExecutionErrorEmitter = new Emitter<{ graphId: string; error: Error }>();
  private readonly onNodeExecutedEmitter = new Emitter<{ graphId: string; nodeId: string; outputs: Record<string, unknown> }>();

  readonly onGraphCreated: Event<VisualGraph> = this.onGraphCreatedEmitter.event;
  readonly onGraphUpdated: Event<VisualGraph> = this.onGraphUpdatedEmitter.event;
  readonly onGraphDeleted: Event<string> = this.onGraphDeletedEmitter.event;
  readonly onNodeAdded: Event<{ graphId: string; node: VisualNode }> = this.onNodeAddedEmitter.event;
  readonly onNodeRemoved: Event<{ graphId: string; nodeId: string }> = this.onNodeRemovedEmitter.event;
  readonly onConnectionAdded: Event<{ graphId: string; connection: NodeConnection }> = this.onConnectionAddedEmitter.event;
  readonly onConnectionRemoved: Event<{ graphId: string; connectionId: string }> = this.onConnectionRemovedEmitter.event;
  readonly onExecutionStarted: Event<string> = this.onExecutionStartedEmitter.event;
  readonly onExecutionStopped: Event<string> = this.onExecutionStoppedEmitter.event;
  readonly onExecutionError: Event<{ graphId: string; error: Error }> = this.onExecutionErrorEmitter.event;
  readonly onNodeExecuted: Event<{ graphId: string; nodeId: string; outputs: Record<string, unknown> }> = this.onNodeExecutedEmitter.event;

  constructor() {
    this.registerBuiltinNodes();
  }

  // ========================================================================
  // NODE DEFINITION MANAGEMENT
  // ========================================================================

  /**
   * Register a node definition
   */
  registerNodeDefinition(definition: NodeDefinition): void {
    this.nodeDefinitions.set(definition.type, definition);
  }

  /**
   * Get all registered node definitions
   */
  getNodeDefinitions(): NodeDefinition[] {
    return Array.from(this.nodeDefinitions.values());
  }

  /**
   * Get node definitions by category
   */
  getNodesByCategory(category: NodeCategory): NodeDefinition[] {
    return this.getNodeDefinitions().filter(d => d.category === category);
  }

  /**
   * Search node definitions
   */
  searchNodes(query: string): NodeDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getNodeDefinitions().filter(d =>
      d.title.toLowerCase().includes(lowerQuery) ||
      d.description.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery)
    );
  }

  // ========================================================================
  // GRAPH MANAGEMENT
  // ========================================================================

  /**
   * Create a new visual graph
   */
  createGraph(name: string, description: string = ''): VisualGraph {
    const graph: VisualGraph = {
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
  getGraph(graphId: string): VisualGraph | undefined {
    return this.graphs.get(graphId);
  }

  /**
   * Update graph
   */
  updateGraph(graphId: string, updates: Partial<VisualGraph>): VisualGraph | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    Object.assign(graph, updates, {
      metadata: { ...graph.metadata, modifiedAt: Date.now() },
    });

    this.onGraphUpdatedEmitter.fire(graph);
    return graph;
  }

  /**
   * Delete graph
   */
  deleteGraph(graphId: string): boolean {
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
  cloneGraph(graphId: string, newName?: string): VisualGraph | undefined {
    const original = this.graphs.get(graphId);
    if (!original) return undefined;

    const clone: VisualGraph = JSON.parse(JSON.stringify(original));
    clone.id = this.generateId();
    clone.name = newName || `${original.name} (Copy)`;
    clone.metadata.createdAt = Date.now();
    clone.metadata.modifiedAt = Date.now();

    // Regenerate IDs for all nodes and connections
    const idMap = new Map<string, string>();
    
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
  addNode(graphId: string, nodeType: string, position: NodePosition): VisualNode | undefined {
    const graph = this.graphs.get(graphId);
    const definition = this.nodeDefinitions.get(nodeType);
    
    if (!graph || !definition) return undefined;

    const node: VisualNode = {
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
  removeNode(graphId: string, nodeId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;

    const index = graph.nodes.findIndex(n => n.id === nodeId);
    if (index === -1) return false;

    // Remove node
    graph.nodes.splice(index, 1);

    // Remove all connections to/from this node
    graph.connections = graph.connections.filter(
      c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
    );

    graph.metadata.modifiedAt = Date.now();
    this.onNodeRemovedEmitter.fire({ graphId, nodeId });
    return true;
  }

  /**
   * Update node properties
   */
  updateNode(graphId: string, nodeId: string, updates: Partial<VisualNode>): VisualNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return undefined;

    Object.assign(node, updates);
    graph.metadata.modifiedAt = Date.now();
    
    return node;
  }

  /**
   * Move node
   */
  moveNode(graphId: string, nodeId: string, position: NodePosition): boolean {
    const result = this.updateNode(graphId, nodeId, { position });
    return result !== undefined;
  }

  // ========================================================================
  // CONNECTION MANAGEMENT
  // ========================================================================

  /**
   * Add connection between nodes
   */
  addConnection(
    graphId: string,
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string
  ): NodeConnection | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    // Validate connection
    const sourceNode = graph.nodes.find(n => n.id === sourceNodeId);
    const targetNode = graph.nodes.find(n => n.id === targetNodeId);
    
    if (!sourceNode || !targetNode) return undefined;

    const sourcePort = sourceNode.outputs.find(p => p.id === sourcePortId);
    const targetPort = targetNode.inputs.find(p => p.id === targetPortId);

    if (!sourcePort || !targetPort) return undefined;

    // Check type compatibility
    if (!this.areTypesCompatible(sourcePort.type, targetPort.type)) {
      return undefined;
    }

    // Check if connection already exists
    const existingConnection = graph.connections.find(
      c => c.targetNodeId === targetNodeId && c.targetPortId === targetPortId
    );

    if (existingConnection && !targetPort.allowMultiple) {
      // Remove existing connection
      this.removeConnection(graphId, existingConnection.id);
    }

    // Prevent cycles (for non-exec connections)
    if (sourcePort.type !== 'exec' && this.wouldCreateCycle(graph, sourceNodeId, targetNodeId)) {
      return undefined;
    }

    const connection: NodeConnection = {
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
  removeConnection(graphId: string, connectionId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;

    const index = graph.connections.findIndex(c => c.id === connectionId);
    if (index === -1) return false;

    graph.connections.splice(index, 1);
    graph.metadata.modifiedAt = Date.now();
    
    this.onConnectionRemovedEmitter.fire({ graphId, connectionId });
    return true;
  }

  /**
   * Check if types are compatible
   */
  private areTypesCompatible(sourceType: PortType, targetType: PortType): boolean {
    if (sourceType === targetType) return true;
    if (targetType === 'any') return true;
    if (sourceType === 'any') return true;

    // Numeric compatibility
    if (sourceType === 'number' && targetType === 'string') return true;
    if (sourceType === 'boolean' && targetType === 'string') return true;

    // Object compatibility
    if (sourceType === 'object' && ['entity', 'component', 'mesh', 'material', 'texture', 'audio'].includes(targetType)) {
      return true;
    }

    return false;
  }

  /**
   * Check if adding connection would create a cycle
   */
  private wouldCreateCycle(graph: VisualGraph, sourceId: string, targetId: string): boolean {
    const visited = new Set<string>();
    const stack = [sourceId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (nodeId === targetId) return true;
      if (visited.has(nodeId)) continue;
      
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
  async startExecution(graphId: string): Promise<void> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    // Initialize execution state
    const state: GraphExecutionState = {
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
    const entryNodes = graph.nodes.filter(n => 
      n.type === 'event-begin-play' || 
      n.type === 'event-tick' ||
      n.type.startsWith('event-')
    );

    try {
      // Execute BeginPlay events
      for (const node of entryNodes.filter(n => n.type === 'event-begin-play')) {
        await this.executeNode(graph, node, state);
      }
    } catch (error) {
      state.status = 'error';
      state.lastError = error as Error;
      this.onExecutionErrorEmitter.fire({ graphId, error: error as Error });
    }
  }

  /**
   * Stop graph execution
   */
  stopExecution(graphId: string): void {
    const state = this.executionStates.get(graphId);
    if (state) {
      state.status = 'stopped';
      this.onExecutionStoppedEmitter.fire(graphId);
    }
  }

  /**
   * Pause graph execution
   */
  pauseExecution(graphId: string): void {
    const state = this.executionStates.get(graphId);
    if (state && state.status === 'running') {
      state.status = 'paused';
    }
  }

  /**
   * Resume graph execution
   */
  resumeExecution(graphId: string): void {
    const state = this.executionStates.get(graphId);
    if (state && state.status === 'paused') {
      state.status = 'running';
    }
  }

  /**
   * Tick execution (call every frame for Tick events)
   */
  async tickExecution(graphId: string, deltaTime: number): Promise<void> {
    const state = this.executionStates.get(graphId);
    const graph = this.graphs.get(graphId);
    
    if (!state || !graph || state.status !== 'running') return;

    state.frameCount++;

    // Execute Tick events
    const tickNodes = graph.nodes.filter(n => n.type === 'event-tick');
    
    for (const node of tickNodes) {
      try {
        await this.executeNode(graph, node, state, { deltaTime });
      } catch (error) {
        state.status = 'error';
        state.lastError = error as Error;
        this.onExecutionErrorEmitter.fire({ graphId, error: error as Error });
        break;
      }
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    graph: VisualGraph,
    node: VisualNode,
    state: GraphExecutionState,
    additionalInputs: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
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
      const execConnection = graph.connections.find(
        c => c.sourceNodeId === node.id && c.sourcePortId === output.id
      );

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
  private async collectInputs(
    graph: VisualGraph,
    node: VisualNode,
    state: GraphExecutionState
  ): Promise<Record<string, unknown>> {
    const inputs: Record<string, unknown> = {};

    for (const inputPort of node.inputs) {
      if (inputPort.type === 'exec') continue;

      const connection = graph.connections.find(
        c => c.targetNodeId === node.id && c.targetPortId === inputPort.id
      );

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
          } else {
            // Non-pure nodes use cached values
            inputs[inputPort.name] = state.variables.get(`${sourceNode.id}.${connection.sourcePortId}`);
          }
        }
      } else {
        // Use default value
        inputs[inputPort.name] = inputPort.defaultValue;
      }
    }

    return inputs;
  }

  /**
   * Create execution context for a node
   */
  private createExecutionContext(
    graph: VisualGraph,
    node: VisualNode,
    state: GraphExecutionState
  ): ExecutionContext {
    return {
      graphId: graph.id,
      nodeId: node.id,
      variables: state.variables,
      deltaTime: 0.016, // Default 60fps
      totalTime: (Date.now() - state.startTime) / 1000,
      frameCount: state.frameCount,
      services: this.services as ContextServices,
      emit: (event: string, data: unknown) => {
        // Trigger custom event nodes
        const eventNodes = graph.nodes.filter(n => n.type === `event-custom-${event}`);
        for (const eventNode of eventNodes) {
          this.executeNode(graph, eventNode, state, { eventData: data });
        }
      },
      log: (message: string, level = 'info') => {
        console.log(`[${level.toUpperCase()}] [${node.title}] ${message}`);
      },
      getVariable: (name: string) => state.variables.get(name),
      setVariable: (name: string, value: unknown) => state.variables.set(name, value),
      triggerExec: async (portId: string) => {
        const connection = graph.connections.find(
          c => c.sourceNodeId === node.id && c.sourcePortId === portId
        );
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
  exportGraph(graphId: string): string | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;
    return JSON.stringify(graph, null, 2);
  }

  /**
   * Import graph from JSON
   */
  importGraph(json: string): VisualGraph | undefined {
    try {
      const graph = JSON.parse(json) as VisualGraph;
      
      // Validate basic structure
      if (!graph.id || !graph.nodes || !graph.connections) {
        throw new Error('Invalid graph structure');
      }

      // Regenerate ID to avoid conflicts
      graph.id = this.generateId();
      
      this.graphs.set(graph.id, graph);
      this.onGraphCreatedEmitter.fire(graph);
      
      return graph;
    } catch (error) {
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
  generateCode(graphId: string): string | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const lines: string[] = [];
    
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

  private generateNodeChain(graph: VisualGraph, node: VisualNode, indent: number): string {
    const pad = ' '.repeat(indent);
    const lines: string[] = [];

    // Find next execution node
    const execOutput = node.outputs.find(p => p.type === 'exec');
    if (execOutput) {
      const connection = graph.connections.find(
        c => c.sourceNodeId === node.id && c.sourcePortId === execOutput.id
      );
      
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

  private portTypeToTS(type: PortType): string {
    const typeMap: Record<PortType, string> = {
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

  private toPascalCase(str: string): string {
    return str
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  // ========================================================================
  // BUILT-IN NODES
  // ========================================================================

  private registerBuiltinNodes(): void {
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
        } else {
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
        const start = inputs.start as number;
        const end = inputs.end as number;
        
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
      execute: (_, inputs) => ({ result: (inputs.a as number) + (inputs.b as number) }),
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
      execute: (_, inputs) => ({ result: (inputs.a as number) - (inputs.b as number) }),
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
      execute: (_, inputs) => ({ result: (inputs.a as number) * (inputs.b as number) }),
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
        const b = inputs.b as number;
        return { result: b !== 0 ? (inputs.a as number) / b : 0 };
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
        result: Math.min(Math.max(inputs.value as number, inputs.min as number), inputs.max as number),
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
        const a = inputs.a as number;
        const b = inputs.b as number;
        const t = inputs.t as number;
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
      execute: (_, inputs) => ({ result: (inputs.a as boolean) && (inputs.b as boolean) }),
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
      execute: (_, inputs) => ({ result: (inputs.a as boolean) || (inputs.b as boolean) }),
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
      execute: (_, inputs) => ({ result: !(inputs.value as boolean) }),
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
      execute: (_, inputs) => ({ result: (inputs.a as number) > (inputs.b as number) }),
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
      execute: (ctx, _, props) => ({ value: ctx.getVariable(props.variableName as string) }),
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
        ctx.setVariable(props.variableName as string, inputs.value);
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
        ctx.log(inputs.message as string);
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
        await new Promise(resolve => setTimeout(resolve, (inputs.duration as number) * 1000));
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
        vector: { x: inputs.x as number, y: inputs.y as number, z: inputs.z as number },
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
        const v = inputs.vector as { x: number; y: number; z: number } || { x: 0, y: 0, z: 0 };
        return { x: v.x, y: v.y, z: v.z };
      },
    });
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register context services
   */
  registerServices(services: Partial<ContextServices>): void {
    Object.assign(this.services, services);
  }
}

export default VisualScriptingEngine;

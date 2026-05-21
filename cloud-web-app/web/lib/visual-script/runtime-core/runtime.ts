/**
 * Visual Script Runtime - split execution modules.
 *
 * Node executors, runtime state, and React bindings are separated so visual
 * scripting can be audited and lazy-loaded without one monolithic runtime file.
 */

import { logger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';
import { nodeExecutors, type NodeExecutor } from './executors';
import type { Connection, ExecutionContext, NodeDefinition, RuntimeEvent, ScriptVariable, VisualScript } from './types';

export class VisualScriptRuntime extends EventEmitter {
  private script: VisualScript | null = null;
  private context: ExecutionContext;
  private nodeMap: Map<string, NodeDefinition> = new Map();
  private connectionMap: Map<string, Connection[]> = new Map();
  private lastEvent: RuntimeEvent | null = null;
  
  // Input state
  private keysPressed: Set<string> = new Set();
  private axisValues: Map<string, number> = new Map();
  private mouseState = {
    position: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    leftButton: false,
    rightButton: false,
  };
  
  // Timing
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  
  constructor() {
    super();
    
    this.context = {
      variables: new Map(),
      nodeOutputs: new Map(),
      currentNodeId: null,
      executionStack: [],
      deltaTime: 0,
      time: 0,
      frameCount: 0,
      isRunning: false,
      isPaused: false,
    };
    
    this.setupInputListeners();
  }
  
  private setupInputListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.code);
      this.emit('input:keydown', { key: e.code });
    });
    
    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
      this.emit('input:keyup', { key: e.code });
    });
    
    window.addEventListener('mousemove', (e) => {
      this.mouseState.delta = {
        x: e.movementX,
        y: e.movementY,
      };
      this.mouseState.position = {
        x: e.clientX,
        y: e.clientY,
      };
    });
    
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseState.leftButton = true;
      if (e.button === 2) this.mouseState.rightButton = true;
    });
    
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseState.leftButton = false;
      if (e.button === 2) this.mouseState.rightButton = false;
    });
  }
  
  // Load a visual script
  load(script: VisualScript): void {
    this.script = script;
    this.nodeMap.clear();
    this.connectionMap.clear();
    
    // Build node map
    for (const node of script.nodes) {
      this.nodeMap.set(node.id, node);
    }
    
    // Build connection map (by source node)
    for (const connection of script.connections) {
      const key = `${connection.sourceNodeId}:${connection.sourcePortId}`;
      if (!this.connectionMap.has(key)) {
        this.connectionMap.set(key, []);
      }
      this.connectionMap.get(key)!.push(connection);
    }
    
    // Initialize variables
    for (const variable of script.variables) {
      this.context.variables.set(variable.name, variable.defaultValue);
    }
    
    this.emit('script:loaded', { scriptId: script.id });
  }
  
  // Start execution
  start(): void {
    if (!this.script) {
      logger.error('No script loaded');
      return;
    }
    
    this.context.isRunning = true;
    this.context.isPaused = false;
    this.context.time = 0;
    this.context.frameCount = 0;
    this.lastFrameTime = performance.now();
    
    this.emit('runtime:start');
    
    // Execute OnStart events
    this.triggerEvent({ type: 'start' });
    
    // Start game loop
    this.gameLoop();
  }
  
  // Pause execution
  pause(): void {
    this.context.isPaused = true;
    this.emit('runtime:pause');
  }
  
  // Resume execution
  resume(): void {
    this.context.isPaused = false;
    this.lastFrameTime = performance.now();
    this.emit('runtime:resume');
    this.gameLoop();
  }
  
  // Stop execution
  stop(): void {
    this.context.isRunning = false;
    this.context.isPaused = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset variables
    if (this.script) {
      for (const variable of this.script.variables) {
        this.context.variables.set(variable.name, variable.defaultValue);
      }
    }
    
    this.emit('runtime:stop');
  }
  
  // Main game loop
  private gameLoop = (): void => {
    if (!this.context.isRunning || this.context.isPaused) return;
    
    const now = performance.now();
    this.context.deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.context.time += this.context.deltaTime;
    this.context.frameCount++;
    
    // Trigger OnUpdate events
    this.triggerEvent({ type: 'update' });
    
    // Update axis values (WASD for example)
    this.updateAxisValues();
    
    // Reset mouse delta
    this.mouseState.delta = { x: 0, y: 0 };
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
  
  private updateAxisValues(): void {
    let horizontal = 0;
    let vertical = 0;
    
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) horizontal -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) horizontal += 1;
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) vertical += 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) vertical -= 1;
    
    this.axisValues.set('Horizontal', horizontal);
    this.axisValues.set('Vertical', vertical);
  }
  
  // Trigger an event (finds and executes matching event nodes)
  async triggerEvent(event: RuntimeEvent): Promise<void> {
    this.lastEvent = event;
    
    const eventNodeType = `event-${event.type}`;
    const eventNodes = this.script?.nodes.filter(n => n.type === eventNodeType) || [];
    
    for (const node of eventNodes) {
      await this.executeNode(node.id);
    }
  }
  
  // Execute a single node
  async executeNode(nodeId: string): Promise<void> {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      logger.error(`Node not found: ${nodeId}`);
      return;
    }
    
    const executor = nodeExecutors.get(node.type);
    if (!executor) {
      logger.error(`No executor for node type: ${node.type}`);
      return;
    }
    
    // Gather inputs
    const inputs = await this.gatherInputs(node);
    
    // Set current node
    this.context.currentNodeId = nodeId;
    this.context.executionStack.push(nodeId);
    
    this.emit('node:executing', { nodeId, type: node.type });
    
    try {
      // Execute the node
      const result = await executor(node, inputs, this.context, this);
      
      // Store outputs
      this.context.nodeOutputs.set(nodeId, result.outputs);
      
      this.emit('node:executed', { nodeId, type: node.type, outputs: Object.fromEntries(result.outputs) });
      
      // Follow exec connection if specified
      if (result.nextExec) {
        await this.executeFromPort(nodeId, result.nextExec);
      }
    } catch (error) {
      logger.error(`Error executing node ${nodeId}:`, error);
      this.emit('node:error', { nodeId, error });
    }
    
    this.context.executionStack.pop();
    this.context.currentNodeId = this.context.executionStack[this.context.executionStack.length - 1] || null;
  }
  
  // Execute from a specific output port
  async executeFromPort(nodeId: string, portId: string): Promise<void> {
    const key = `${nodeId}:${portId}`;
    const connections = this.connectionMap.get(key) || [];
    
    for (const connection of connections) {
      await this.executeNode(connection.targetNodeId);
    }
  }
  
  // Gather inputs for a node from connected nodes
  private async gatherInputs(node: NodeDefinition): Promise<Map<string, unknown>> {
    const inputs = new Map<string, unknown>();
    
    for (const input of node.inputs) {
      if (input.type === 'exec') continue; // Skip exec inputs
      
      // Check for connections to this input
      let foundValue = false;
      
      for (const connection of this.script?.connections || []) {
        if (connection.targetNodeId === node.id && connection.targetPortId === input.id) {
          const sourceOutputs = this.context.nodeOutputs.get(connection.sourceNodeId);
          if (sourceOutputs?.has(connection.sourcePortId)) {
            inputs.set(input.id, sourceOutputs.get(connection.sourcePortId));
            foundValue = true;
            break;
          }
          
          // If source hasn't been executed, execute it (for pure/data nodes)
          const sourceNode = this.nodeMap.get(connection.sourceNodeId);
          if (sourceNode && !sourceNode.inputs.some(p => p.type === 'exec')) {
            await this.executeNode(connection.sourceNodeId);
            const newOutputs = this.context.nodeOutputs.get(connection.sourceNodeId);
            if (newOutputs?.has(connection.sourcePortId)) {
              inputs.set(input.id, newOutputs.get(connection.sourcePortId));
              foundValue = true;
              break;
            }
          }
        }
      }
      
      // Use default value or node data if no connection
      if (!foundValue) {
        if (node.data?.[input.id] !== undefined) {
          inputs.set(input.id, node.data[input.id]);
        } else if (input.defaultValue !== undefined) {
          inputs.set(input.id, input.defaultValue);
        }
      }
    }
    
    return inputs;
  }
  
  // Evaluate a single input (for dynamic evaluation in loops)
  async evaluateInput(nodeId: string, inputId: string): Promise<unknown> {
    const node = this.nodeMap.get(nodeId);
    if (!node) return undefined;
    
    for (const connection of this.script?.connections || []) {
      if (connection.targetNodeId === nodeId && connection.targetPortId === inputId) {
        const sourceNode = this.nodeMap.get(connection.sourceNodeId);
        if (sourceNode) {
          await this.executeNode(connection.sourceNodeId);
          const outputs = this.context.nodeOutputs.get(connection.sourceNodeId);
          return outputs?.get(connection.sourcePortId);
        }
      }
    }
    
    return node.data?.[inputId] ?? node.inputs.find(i => i.id === inputId)?.defaultValue;
  }
  
  // Get last event
  getLastEvent(): RuntimeEvent | null {
    return this.lastEvent;
  }
  
  // Input state accessors
  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }
  
  getAxisValue(axis: string): number {
    return this.axisValues.get(axis) || 0;
  }
  
  getMouseState(): typeof this.mouseState {
    return { ...this.mouseState };
  }
  
  // Get current context for debugging
  getContext(): ExecutionContext {
    return { ...this.context };
  }
  
  // Get variable value
  getVariable(name: string): unknown {
    return this.context.variables.get(name);
  }
  
  // Set variable value
  setVariable(name: string, value: unknown): void {
    this.context.variables.set(name, value);
    this.emit('variable:set', { name, value });
  }
  
  // Register custom node executor
  static registerNodeExecutor(nodeType: string, executor: NodeExecutor): void {
    nodeExecutors.set(nodeType, executor);
  }
  
  // Cleanup
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

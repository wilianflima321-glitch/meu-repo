/**
 * Visual Script Runtime - Executor Real de Blueprints
 * 
 * Sistema de execução em tempo real para visual scripts.
 * Interpreta e executa nodes de forma sequencial, respeitando
 * conexões de fluxo (exec) e dados.
 * 
 * @module lib/visual-script/runtime
 */

'use client';

import { EventEmitter } from 'events';
import { nodeExecutors, type NodeExecutor } from './runtime-node-executors';

// ============================================================================
// TYPES
// ============================================================================

export type PortType = 'exec' | 'boolean' | 'number' | 'string' | 'vector3' | 'object' | 'array' | 'any';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Port {
  id: string;
  name: string;
  type: PortType;
  direction: 'input' | 'output';
  defaultValue?: unknown;
}

export interface NodeDefinition {
  id: string;
  type: string;
  category: string;
  label: string;
  inputs: Port[];
  outputs: Port[];
  data?: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface VisualScript {
  id: string;
  name: string;
  nodes: NodeDefinition[];
  connections: Connection[];
  variables: ScriptVariable[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
  };
}

export interface ScriptVariable {
  id: string;
  name: string;
  type: PortType;
  defaultValue: unknown;
  isPublic: boolean;
}

export interface ExecutionContext {
  variables: Map<string, unknown>;
  nodeOutputs: Map<string, Map<string, unknown>>;
  currentNodeId: string | null;
  executionStack: string[];
  deltaTime: number;
  time: number;
  frameCount: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface RuntimeEvent {
  type: 'start' | 'update' | 'collision' | 'trigger' | 'input' | 'custom';
  data?: Record<string, unknown>;
}

// ============================================================================
// NODE EXECUTORS
// ============================================================================
// Extracted to ./runtime-node-executors

// ============================================================================
// VISUAL SCRIPT RUNTIME
// ============================================================================

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
      console.error('No script loaded');
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
      console.error(`Node not found: ${nodeId}`);
      return;
    }
    
    const executor = nodeExecutors.get(node.type);
    if (!executor) {
      console.error(`No executor for node type: ${node.type}`);
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
      console.error(`Error executing node ${nodeId}:`, error);
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

import { useState, useEffect, useCallback, useRef } from 'react';

export function useVisualScriptRuntime() {
  const runtimeRef = useRef<VisualScriptRuntime | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [variables, setVariables] = useState<Map<string, unknown>>(new Map());
  
  useEffect(() => {
    const runtime = new VisualScriptRuntime();
    runtimeRef.current = runtime;
    
    runtime.on('runtime:start', () => setIsRunning(true));
    runtime.on('runtime:stop', () => setIsRunning(false));
    runtime.on('runtime:pause', () => setIsPaused(true));
    runtime.on('runtime:resume', () => setIsPaused(false));
    runtime.on('node:executing', ({ nodeId }) => setCurrentNode(nodeId));
    runtime.on('node:executed', () => setCurrentNode(null));
    runtime.on('variable:set', () => {
      setVariables(new Map(runtime.getContext().variables));
    });
    
    return () => {
      runtime.destroy();
    };
  }, []);
  
  const load = useCallback((script: VisualScript) => {
    runtimeRef.current?.load(script);
  }, []);
  
  const start = useCallback(() => {
    runtimeRef.current?.start();
  }, []);
  
  const pause = useCallback(() => {
    runtimeRef.current?.pause();
  }, []);
  
  const resume = useCallback(() => {
    runtimeRef.current?.resume();
  }, []);
  
  const stop = useCallback(() => {
    runtimeRef.current?.stop();
  }, []);
  
  const triggerEvent = useCallback((event: RuntimeEvent) => {
    runtimeRef.current?.triggerEvent(event);
  }, []);
  
  const getVariable = useCallback((name: string) => {
    return runtimeRef.current?.getVariable(name);
  }, []);
  
  const setVariable = useCallback((name: string, value: unknown) => {
    runtimeRef.current?.setVariable(name, value);
  }, []);
  
  return {
    runtime: runtimeRef.current,
    isRunning,
    isPaused,
    currentNode,
    variables,
    load,
    start,
    pause,
    resume,
    stop,
    triggerEvent,
    getVariable,
    setVariable,
  };
}

export default VisualScriptRuntime;

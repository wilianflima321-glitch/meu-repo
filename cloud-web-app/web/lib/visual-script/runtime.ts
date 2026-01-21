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

type NodeExecutor = (
  node: NodeDefinition,
  inputs: Map<string, unknown>,
  context: ExecutionContext,
  runtime: VisualScriptRuntime
) => Promise<{ outputs: Map<string, unknown>; nextExec?: string }>;

const nodeExecutors: Map<string, NodeExecutor> = new Map();

// Event Nodes
nodeExecutors.set('event-start', async (node, inputs, context) => {
  return { outputs: new Map(), nextExec: 'exec' };
});

nodeExecutors.set('event-update', async (node, inputs, context) => {
  const outputs = new Map<string, unknown>();
  outputs.set('deltaTime', context.deltaTime);
  return { outputs, nextExec: 'exec' };
});

nodeExecutors.set('event-collision', async (node, inputs, context, runtime) => {
  const outputs = new Map<string, unknown>();
  const eventData = runtime.getLastEvent();
  outputs.set('other', eventData?.data?.other || null);
  outputs.set('contactPoint', eventData?.data?.contactPoint || { x: 0, y: 0, z: 0 });
  return { outputs, nextExec: 'exec' };
});

nodeExecutors.set('event-trigger', async (node, inputs, context, runtime) => {
  const outputs = new Map<string, unknown>();
  const eventData = runtime.getLastEvent();
  outputs.set('other', eventData?.data?.other || null);
  return { outputs, nextExec: 'exec' };
});

nodeExecutors.set('event-input', async (node, inputs, context, runtime) => {
  const outputs = new Map<string, unknown>();
  const eventData = runtime.getLastEvent();
  outputs.set('key', eventData?.data?.key || '');
  outputs.set('pressed', eventData?.data?.pressed || false);
  return { outputs, nextExec: 'exec' };
});

// Action Nodes
nodeExecutors.set('action-move', async (node, inputs, context, runtime) => {
  const target = inputs.get('target') as string;
  const direction = inputs.get('direction') as Vector3 || { x: 0, y: 0, z: 0 };
  const speed = inputs.get('speed') as number || 1;
  
  const delta = {
    x: direction.x * speed * context.deltaTime,
    y: direction.y * speed * context.deltaTime,
    z: direction.z * speed * context.deltaTime,
  };
  
  runtime.emit('object:transform', { id: target, type: 'translate', delta });
  
  return { outputs: new Map(), nextExec: 'exec' };
});

nodeExecutors.set('action-rotate', async (node, inputs, context, runtime) => {
  const target = inputs.get('target') as string;
  const axis = inputs.get('axis') as Vector3 || { x: 0, y: 1, z: 0 };
  const angle = inputs.get('angle') as number || 0;
  const speed = inputs.get('speed') as number || 1;
  
  const rotation = {
    x: axis.x * angle * speed * context.deltaTime,
    y: axis.y * angle * speed * context.deltaTime,
    z: axis.z * angle * speed * context.deltaTime,
  };
  
  runtime.emit('object:transform', { id: target, type: 'rotate', delta: rotation });
  
  return { outputs: new Map(), nextExec: 'exec' };
});

nodeExecutors.set('action-spawn', async (node, inputs, context, runtime) => {
  const prefab = inputs.get('prefab') as string;
  const position = inputs.get('position') as Vector3 || { x: 0, y: 0, z: 0 };
  const rotation = inputs.get('rotation') as Vector3 || { x: 0, y: 0, z: 0 };
  
  const spawnedId = `spawned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  runtime.emit('object:spawn', { id: spawnedId, prefab, position, rotation });
  
  const outputs = new Map<string, unknown>();
  outputs.set('spawned', spawnedId);
  
  return { outputs, nextExec: 'exec' };
});

nodeExecutors.set('action-destroy', async (node, inputs, context, runtime) => {
  const target = inputs.get('target') as string;
  
  runtime.emit('object:destroy', { id: target });
  
  return { outputs: new Map(), nextExec: 'exec' };
});

nodeExecutors.set('action-print', async (node, inputs, context, runtime) => {
  const message = inputs.get('message') as string || '';
  
  console.log(`[VisualScript] ${message}`);
  runtime.emit('console:log', { message, timestamp: Date.now() });
  
  return { outputs: new Map(), nextExec: 'exec' };
});

nodeExecutors.set('action-setVariable', async (node, inputs, context, runtime) => {
  const varName = node.data?.variableName as string || '';
  const value = inputs.get('value');
  
  context.variables.set(varName, value);
  runtime.emit('variable:set', { name: varName, value });
  
  return { outputs: new Map(), nextExec: 'exec' };
});

nodeExecutors.set('action-playSound', async (node, inputs, context, runtime) => {
  const sound = inputs.get('sound') as string;
  const volume = inputs.get('volume') as number ?? 1;
  const loop = inputs.get('loop') as boolean ?? false;
  
  runtime.emit('audio:play', { sound, volume, loop });
  
  return { outputs: new Map(), nextExec: 'exec' };
});

// Condition Nodes
nodeExecutors.set('condition-branch', async (node, inputs, context) => {
  const condition = inputs.get('condition') as boolean;
  
  return {
    outputs: new Map(),
    nextExec: condition ? 'true' : 'false',
  };
});

nodeExecutors.set('condition-compare', async (node, inputs, context) => {
  const a = inputs.get('a') as number;
  const b = inputs.get('b') as number;
  const operator = node.data?.operator as string || '==';
  
  let result = false;
  switch (operator) {
    case '==': result = a === b; break;
    case '!=': result = a !== b; break;
    case '<': result = a < b; break;
    case '<=': result = a <= b; break;
    case '>': result = a > b; break;
    case '>=': result = a >= b; break;
  }
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', result);
  
  return { outputs };
});

nodeExecutors.set('condition-and', async (node, inputs, context) => {
  const a = inputs.get('a') as boolean;
  const b = inputs.get('b') as boolean;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', a && b);
  
  return { outputs };
});

nodeExecutors.set('condition-or', async (node, inputs, context) => {
  const a = inputs.get('a') as boolean;
  const b = inputs.get('b') as boolean;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', a || b);
  
  return { outputs };
});

nodeExecutors.set('condition-not', async (node, inputs, context) => {
  const value = inputs.get('value') as boolean;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', !value);
  
  return { outputs };
});

// Math Nodes
nodeExecutors.set('math-add', async (node, inputs, context) => {
  const a = inputs.get('a') as number || 0;
  const b = inputs.get('b') as number || 0;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', a + b);
  
  return { outputs };
});

nodeExecutors.set('math-subtract', async (node, inputs, context) => {
  const a = inputs.get('a') as number || 0;
  const b = inputs.get('b') as number || 0;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', a - b);
  
  return { outputs };
});

nodeExecutors.set('math-multiply', async (node, inputs, context) => {
  const a = inputs.get('a') as number || 0;
  const b = inputs.get('b') as number || 0;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', a * b);
  
  return { outputs };
});

nodeExecutors.set('math-divide', async (node, inputs, context) => {
  const a = inputs.get('a') as number || 0;
  const b = inputs.get('b') as number || 1;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', b !== 0 ? a / b : 0);
  
  return { outputs };
});

nodeExecutors.set('math-clamp', async (node, inputs, context) => {
  const value = inputs.get('value') as number || 0;
  const min = inputs.get('min') as number || 0;
  const max = inputs.get('max') as number || 1;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', Math.max(min, Math.min(max, value)));
  
  return { outputs };
});

nodeExecutors.set('math-lerp', async (node, inputs, context) => {
  const a = inputs.get('a') as number || 0;
  const b = inputs.get('b') as number || 1;
  const t = inputs.get('t') as number || 0.5;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', a + (b - a) * Math.max(0, Math.min(1, t)));
  
  return { outputs };
});

nodeExecutors.set('math-random', async (node, inputs, context) => {
  const min = inputs.get('min') as number || 0;
  const max = inputs.get('max') as number || 1;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', min + Math.random() * (max - min));
  
  return { outputs };
});

nodeExecutors.set('math-sin', async (node, inputs, context) => {
  const value = inputs.get('value') as number || 0;
  const outputs = new Map<string, unknown>();
  outputs.set('result', Math.sin(value));
  return { outputs };
});

nodeExecutors.set('math-cos', async (node, inputs, context) => {
  const value = inputs.get('value') as number || 0;
  const outputs = new Map<string, unknown>();
  outputs.set('result', Math.cos(value));
  return { outputs };
});

// Vector Nodes
nodeExecutors.set('vector-make', async (node, inputs, context) => {
  const x = inputs.get('x') as number || 0;
  const y = inputs.get('y') as number || 0;
  const z = inputs.get('z') as number || 0;
  
  const outputs = new Map<string, unknown>();
  outputs.set('vector', { x, y, z });
  
  return { outputs };
});

nodeExecutors.set('vector-break', async (node, inputs, context) => {
  const vector = inputs.get('vector') as Vector3 || { x: 0, y: 0, z: 0 };
  
  const outputs = new Map<string, unknown>();
  outputs.set('x', vector.x);
  outputs.set('y', vector.y);
  outputs.set('z', vector.z);
  
  return { outputs };
});

nodeExecutors.set('vector-add', async (node, inputs, context) => {
  const a = inputs.get('a') as Vector3 || { x: 0, y: 0, z: 0 };
  const b = inputs.get('b') as Vector3 || { x: 0, y: 0, z: 0 };
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  
  return { outputs };
});

nodeExecutors.set('vector-multiply', async (node, inputs, context) => {
  const vector = inputs.get('vector') as Vector3 || { x: 0, y: 0, z: 0 };
  const scalar = inputs.get('scalar') as number || 1;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar });
  
  return { outputs };
});

nodeExecutors.set('vector-normalize', async (node, inputs, context) => {
  const vector = inputs.get('vector') as Vector3 || { x: 0, y: 0, z: 0 };
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  
  const outputs = new Map<string, unknown>();
  if (length > 0) {
    outputs.set('result', { x: vector.x / length, y: vector.y / length, z: vector.z / length });
  } else {
    outputs.set('result', { x: 0, y: 0, z: 0 });
  }
  
  return { outputs };
});

nodeExecutors.set('vector-distance', async (node, inputs, context) => {
  const a = inputs.get('a') as Vector3 || { x: 0, y: 0, z: 0 };
  const b = inputs.get('b') as Vector3 || { x: 0, y: 0, z: 0 };
  
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  
  const outputs = new Map<string, unknown>();
  outputs.set('result', Math.sqrt(dx * dx + dy * dy + dz * dz));
  
  return { outputs };
});

// Flow Control Nodes
nodeExecutors.set('flow-sequence', async (node, inputs, context, runtime) => {
  // Execute all outputs in sequence
  const outputCount = node.data?.outputCount as number || 2;
  
  for (let i = 0; i < outputCount; i++) {
    await runtime.executeFromPort(node.id, `exec${i}`);
  }
  
  return { outputs: new Map() };
});

nodeExecutors.set('flow-forLoop', async (node, inputs, context, runtime) => {
  const start = inputs.get('start') as number || 0;
  const end = inputs.get('end') as number || 10;
  const step = inputs.get('step') as number || 1;
  
  const outputs = new Map<string, unknown>();
  
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    outputs.set('index', i);
    context.nodeOutputs.set(node.id, outputs);
    await runtime.executeFromPort(node.id, 'loopBody');
  }
  
  return { outputs, nextExec: 'completed' };
});

nodeExecutors.set('flow-forEach', async (node, inputs, context, runtime) => {
  const array = inputs.get('array') as unknown[] || [];
  
  const outputs = new Map<string, unknown>();
  
  for (let i = 0; i < array.length; i++) {
    outputs.set('element', array[i]);
    outputs.set('index', i);
    context.nodeOutputs.set(node.id, outputs);
    await runtime.executeFromPort(node.id, 'loopBody');
  }
  
  return { outputs, nextExec: 'completed' };
});

nodeExecutors.set('flow-whileLoop', async (node, inputs, context, runtime) => {
  const maxIterations = 10000; // Safety limit
  let iterations = 0;
  
  while (iterations < maxIterations) {
    // Re-evaluate condition each iteration
    const condition = await runtime.evaluateInput(node.id, 'condition');
    if (!condition) break;
    
    await runtime.executeFromPort(node.id, 'loopBody');
    iterations++;
  }
  
  return { outputs: new Map(), nextExec: 'completed' };
});

nodeExecutors.set('flow-doOnce', async (node, inputs, context, runtime) => {
  const key = `doOnce_${node.id}`;
  
  if (!context.variables.has(key)) {
    context.variables.set(key, true);
    return { outputs: new Map(), nextExec: 'exec' };
  }
  
  return { outputs: new Map() };
});

nodeExecutors.set('flow-doN', async (node, inputs, context, runtime) => {
  const key = `doN_${node.id}`;
  const n = inputs.get('n') as number || 1;
  
  const count = (context.variables.get(key) as number) || 0;
  
  const outputs = new Map<string, unknown>();
  outputs.set('counter', count);
  
  if (count < n) {
    context.variables.set(key, count + 1);
    return { outputs, nextExec: 'exec' };
  }
  
  return { outputs };
});

nodeExecutors.set('flow-gate', async (node, inputs, context, runtime) => {
  const key = `gate_${node.id}`;
  const open = inputs.get('open');
  const close = inputs.get('close');
  const toggle = inputs.get('toggle');
  
  let isOpen = (context.variables.get(key) as boolean) ?? (node.data?.startOpen as boolean ?? false);
  
  if (open) isOpen = true;
  if (close) isOpen = false;
  if (toggle) isOpen = !isOpen;
  
  context.variables.set(key, isOpen);
  
  if (isOpen) {
    return { outputs: new Map(), nextExec: 'exec' };
  }
  
  return { outputs: new Map() };
});

nodeExecutors.set('flow-flipFlop', async (node, inputs, context, runtime) => {
  const key = `flipFlop_${node.id}`;
  
  const isA = !(context.variables.get(key) as boolean ?? false);
  context.variables.set(key, isA);
  
  const outputs = new Map<string, unknown>();
  outputs.set('isA', isA);
  
  return { outputs, nextExec: isA ? 'a' : 'b' };
});

nodeExecutors.set('flow-delay', async (node, inputs, context, runtime) => {
  const duration = inputs.get('duration') as number || 1;
  
  await new Promise(resolve => setTimeout(resolve, duration * 1000));
  
  return { outputs: new Map(), nextExec: 'exec' };
});

// Variable Nodes
nodeExecutors.set('variable-get', async (node, inputs, context) => {
  const varName = node.data?.variableName as string || '';
  const value = context.variables.get(varName);
  
  const outputs = new Map<string, unknown>();
  outputs.set('value', value);
  
  return { outputs };
});

nodeExecutors.set('variable-set', async (node, inputs, context, runtime) => {
  const varName = node.data?.variableName as string || '';
  const value = inputs.get('value');
  
  context.variables.set(varName, value);
  runtime.emit('variable:set', { name: varName, value });
  
  const outputs = new Map<string, unknown>();
  outputs.set('value', value);
  
  return { outputs, nextExec: 'exec' };
});

// Input Nodes
nodeExecutors.set('input-getKey', async (node, inputs, context, runtime) => {
  const key = inputs.get('key') as string || 'Space';
  const pressed = runtime.isKeyPressed(key);
  
  const outputs = new Map<string, unknown>();
  outputs.set('pressed', pressed);
  
  return { outputs };
});

nodeExecutors.set('input-getAxis', async (node, inputs, context, runtime) => {
  const axis = node.data?.axis as string || 'Horizontal';
  const value = runtime.getAxisValue(axis);
  
  const outputs = new Map<string, unknown>();
  outputs.set('value', value);
  
  return { outputs };
});

nodeExecutors.set('input-getMouse', async (node, inputs, context, runtime) => {
  const mouseState = runtime.getMouseState();
  
  const outputs = new Map<string, unknown>();
  outputs.set('position', mouseState.position);
  outputs.set('delta', mouseState.delta);
  outputs.set('leftButton', mouseState.leftButton);
  outputs.set('rightButton', mouseState.rightButton);
  
  return { outputs };
});

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

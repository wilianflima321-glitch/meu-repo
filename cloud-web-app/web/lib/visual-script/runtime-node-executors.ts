/**
 * Visual script default node executors extracted from runtime.
 */

import type {
  ExecutionContext,
  NodeDefinition,
  Vector3,
  VisualScriptRuntime,
} from './runtime';

export type NodeExecutor = (
  node: NodeDefinition,
  inputs: Map<string, unknown>,
  context: ExecutionContext,
  runtime: VisualScriptRuntime
) => Promise<{ outputs: Map<string, unknown>; nextExec?: string }>;

export const nodeExecutors: Map<string, NodeExecutor> = new Map();

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

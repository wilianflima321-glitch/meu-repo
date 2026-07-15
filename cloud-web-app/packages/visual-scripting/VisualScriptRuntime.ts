/**
 * Visual Script Runtime - Interpretador de Scripts Visuais
 *
 * Executa scripts criados no Visual Scripting Editor.
 * Converte nós e conexões em lógica executável.
 */

import type { VisualScript, VisualNodeType } from './VisualScriptEditor';
import type { Edge } from '@xyflow/react';

// ============================================================================
// TIPOS
// ============================================================================

export interface RuntimeContext {
  // Variáveis do script
  variables: Map<string, unknown>;

  // Referência ao objeto alvo
  gameObject?: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    name: string;
    [key: string]: unknown;
  };

  // Delta time do frame
  deltaTime: number;

  // Sistema de input
  input: {
    getKey: (key: string) => boolean;
    getKeyDown: (key: string) => boolean;
    getKeyUp: (key: string) => boolean;
    getAxis: (axis: string) => number;
    mousePosition: { x: number; y: number };
    mouseDelta: { x: number; y: number };
    mouseButton: (button: number) => boolean;
  };

  // Sistema de física
  physics: {
    raycast: (origin: Vector3, direction: Vector3, distance: number) => RaycastHit | null;
    addForce: (target: unknown, force: Vector3, impulse?: boolean) => void;
  };

  // Sistema de áudio
  audio: {
    playSound: (sound: string, volume?: number, loop?: boolean) => void;
    stopSound: (sound: string) => void;
  };

  // Sistema de objetos
  objects: {
    spawn: (prefab: string, position: Vector3) => unknown;
    destroy: (target: unknown, delay?: number) => void;
    find: (name: string) => unknown;
  };

  // Log
  log: (message: string) => void;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface RaycastHit {
  hit: boolean;
  point: Vector3;
  normal: Vector3;
  object: unknown;
  distance: number;
}

interface NodeExecution {
  nodeId: string;
  inputs: Map<string, unknown>;
  outputs: Map<string, unknown>;
}

// ============================================================================
// RUNTIME
// ============================================================================

export class VisualScriptRuntime {
  private script: VisualScript;
  private context: RuntimeContext;
  private nodeMap: Map<string, VisualNodeType>;
  private edgesBySource: Map<string, Edge[]>;
  private edgesByTarget: Map<string, Edge[]>;
  private executing: boolean = false;
  private pendingDelays: Map<string, NodeJS.Timeout> = new Map();

  constructor(script: VisualScript, context: RuntimeContext) {
    this.script = script;
    this.context = context;

    // Indexar nós para acesso rápido
    this.nodeMap = new Map(script.nodes.map(n => [n.id, n]));

    // Indexar edges por source e target
    this.edgesBySource = new Map();
    this.edgesByTarget = new Map();

    script.edges.forEach(edge => {
      // By source
      const sourceKey = `${edge.source}:${edge.sourceHandle}`;
      const sourceEdges = this.edgesBySource.get(sourceKey) || [];
      sourceEdges.push(edge);
      this.edgesBySource.set(sourceKey, sourceEdges);

      // By target
      const targetKey = `${edge.target}:${edge.targetHandle}`;
      const targetEdges = this.edgesByTarget.get(targetKey) || [];
      targetEdges.push(edge);
      this.edgesByTarget.set(targetKey, targetEdges);
    });

    // Inicializar variáveis
    script.variables.forEach(v => {
      this.context.variables.set(v.name, v.defaultValue);
    });
  }

  /**
   * Executa evento OnStart
   */
  start(): void {
    const startNodes = this.script.nodes.filter(
      n => n.data?.definition?.type === 'event_start'
    );

    startNodes.forEach(node => {
      this.executeFromNode(node.id, 'exec');
    });
  }

  /**
   * Executa evento OnUpdate (chamado a cada frame)
   */
  update(deltaTime: number): void {
    this.context.deltaTime = deltaTime;

    const updateNodes = this.script.nodes.filter(
      n => n.data?.definition?.type === 'event_update'
    );

    updateNodes.forEach(node => {
      this.executeFromNode(node.id, 'exec');
    });
  }

  /**
   * Executa evento de colisão
   */
  onCollision(other: unknown, point: Vector3): void {
    const collisionNodes = this.script.nodes.filter(
      n => n.data?.definition?.type === 'event_collision'
    );

    collisionNodes.forEach(node => {
      // Definir outputs do nó de evento
      const execution: NodeExecution = {
        nodeId: node.id,
        inputs: new Map(),
        outputs: new Map([
          ['other', other],
          ['point', point],
        ]),
      };

      this.executeFromNodeWithContext(node.id, 'exec', execution);
    });
  }

  /**
   * Executa evento de trigger
   */
  onTriggerEnter(other: unknown): void {
    const triggerNodes = this.script.nodes.filter(
      n => n.data?.definition?.type === 'event_trigger'
    );

    triggerNodes.forEach(node => {
      const execution: NodeExecution = {
        nodeId: node.id,
        inputs: new Map(),
        outputs: new Map([['other', other]]),
      };

      this.executeFromNodeWithContext(node.id, 'enter', execution);
    });
  }

  onTriggerExit(other: unknown): void {
    const triggerNodes = this.script.nodes.filter(
      n => n.data?.definition?.type === 'event_trigger'
    );

    triggerNodes.forEach(node => {
      const execution: NodeExecution = {
        nodeId: node.id,
        inputs: new Map(),
        outputs: new Map([['other', other]]),
      };

      this.executeFromNodeWithContext(node.id, 'exit', execution);
    });
  }

  /**
   * Para a execução e limpa delays pendentes
   */
  stop(): void {
    this.executing = false;
    this.pendingDelays.forEach(timeout => clearTimeout(timeout));
    this.pendingDelays.clear();
  }

  // ============================================================================
  // INTERNAL EXECUTION
  // ============================================================================

  private executeFromNode(nodeId: string, outputHandle: string): void {
    this.executeFromNodeWithContext(nodeId, outputHandle, {
      nodeId,
      inputs: new Map(),
      outputs: new Map(),
    });
  }

  private executeFromNodeWithContext(
    nodeId: string,
    outputHandle: string,
    currentExecution: NodeExecution
  ): void {
    // Encontrar edges conectadas a este output
    const key = `${nodeId}:${outputHandle}`;
    const edges = this.edgesBySource.get(key) || [];

    edges.forEach(edge => {
      const targetNode = this.nodeMap.get(edge.target);
      if (!targetNode) return;

      // Coletar inputs para o nó de destino
      const inputs = this.collectInputs(edge.target);

      // Executar o nó
      this.executeNode(edge.target, inputs, currentExecution);
    });
  }

  private collectInputs(nodeId: string): Map<string, unknown> {
    const inputs = new Map<string, unknown>();
    const node = this.nodeMap.get(nodeId);
    if (!node) return inputs;

    const definition = node.data?.definition;
    if (!definition) return inputs;

    // Para cada input definido
    definition.inputs.forEach((inputDef: { id: string; default?: unknown }) => {
      const key = `${nodeId}:${inputDef.id}`;
      const incomingEdges = this.edgesByTarget.get(key) || [];

      if (incomingEdges.length > 0) {
        // Tem conexão - avaliar nó fonte
        const edge = incomingEdges[0];
        const sourceValue = this.evaluateOutput(edge.source, edge.sourceHandle || '');
        inputs.set(inputDef.id, sourceValue);
      } else {
        // Sem conexão - usar valor do nó ou default
        const nodeValue = node.data?.values?.[inputDef.id];
        inputs.set(inputDef.id, nodeValue ?? inputDef.default);
      }
    });

    return inputs;
  }

  private evaluateOutput(nodeId: string, handleId: string): unknown {
    const node = this.nodeMap.get(nodeId);
    if (!node) return undefined;

    // Executar nó para obter output (se for nó de dados)
    const inputs = this.collectInputs(nodeId);
    const result = this.computeNodeOutput(node, inputs);

    return result.get(handleId);
  }

  private computeNodeOutput(node: VisualNodeType, inputs: Map<string, unknown>): Map<string, unknown> {
    const outputs = new Map<string, unknown>();
    const type = node.data?.definition?.type;

    switch (type) {
      // === MATH ===
      case 'math_add': {
        const a = Number(inputs.get('a')) || 0;
        const b = Number(inputs.get('b')) || 0;
        outputs.set('result', a + b);
        break;
      }
      case 'math_subtract': {
        const a = Number(inputs.get('a')) || 0;
        const b = Number(inputs.get('b')) || 0;
        outputs.set('result', a - b);
        break;
      }
      case 'math_multiply': {
        const a = Number(inputs.get('a')) || 1;
        const b = Number(inputs.get('b')) || 1;
        outputs.set('result', a * b);
        break;
      }
      case 'math_divide': {
        const a = Number(inputs.get('a')) || 0;
        const b = Number(inputs.get('b')) || 1;
        outputs.set('result', b !== 0 ? a / b : 0);
        break;
      }
      case 'math_vector3': {
        outputs.set('vector', {
          x: Number(inputs.get('x')) || 0,
          y: Number(inputs.get('y')) || 0,
          z: Number(inputs.get('z')) || 0,
        });
        break;
      }
      case 'math_break_vector3': {
        const vec = inputs.get('vector') as Vector3 || { x: 0, y: 0, z: 0 };
        outputs.set('x', vec.x);
        outputs.set('y', vec.y);
        outputs.set('z', vec.z);
        break;
      }
      case 'math_random': {
        const min = Number(inputs.get('min')) || 0;
        const max = Number(inputs.get('max')) || 1;
        outputs.set('value', Math.random() * (max - min) + min);
        break;
      }

      // === CONDITIONS ===
      case 'condition_compare': {
        const a = Number(inputs.get('a')) || 0;
        const b = Number(inputs.get('b')) || 0;
        outputs.set('equal', a === b);
        outputs.set('greater', a > b);
        outputs.set('less', a < b);
        break;
      }

      // === INPUT ===
      case 'input_key': {
        const key = String(inputs.get('key') || 'Space');
        outputs.set('pressed', this.context.input.getKey(key));
        outputs.set('just_pressed', this.context.input.getKeyDown(key));
        outputs.set('just_released', this.context.input.getKeyUp(key));
        break;
      }
      case 'input_axis': {
        const axis = String(inputs.get('axis') || 'Horizontal');
        outputs.set('value', this.context.input.getAxis(axis));
        break;
      }
      case 'input_mouse': {
        outputs.set('position', { ...this.context.input.mousePosition, z: 0 });
        outputs.set('delta', { ...this.context.input.mouseDelta, z: 0 });
        outputs.set('left', this.context.input.mouseButton(0));
        outputs.set('right', this.context.input.mouseButton(2));
        break;
      }

      // === PHYSICS ===
      case 'physics_raycast': {
        const origin = inputs.get('origin') as Vector3 || { x: 0, y: 0, z: 0 };
        const direction = inputs.get('direction') as Vector3 || { x: 0, y: 0, z: 1 };
        const distance = Number(inputs.get('distance')) || 100;

        const hit = this.context.physics.raycast(origin, direction, distance);
        outputs.set('hit', hit !== null);
        outputs.set('point', hit?.point || { x: 0, y: 0, z: 0 });
        outputs.set('normal', hit?.normal || { x: 0, y: 1, z: 0 });
        outputs.set('object', hit?.object || null);
        break;
      }

      // === VARIABLES ===
      case 'variable_get': {
        const name = String(inputs.get('name') || '');
        outputs.set('value', this.context.variables.get(name));
        break;
      }

      // === EVENT OUTPUTS ===
      case 'event_update': {
        outputs.set('deltaTime', this.context.deltaTime);
        break;
      }
    }

    return outputs;
  }

  private executeNode(
    nodeId: string,
    inputs: Map<string, unknown>,
    prevExecution: NodeExecution
  ): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    const type = node.data?.definition?.type;
    const outputs = new Map<string, unknown>();

    switch (type) {
      // === ACTIONS ===
      case 'action_move': {
        const direction = inputs.get('direction') as Vector3 || { x: 0, y: 0, z: 0 };
        const speed = Number(inputs.get('speed')) || 5;

        if (this.context.gameObject) {
          this.context.gameObject.position.x += direction.x * speed * this.context.deltaTime;
          this.context.gameObject.position.y += direction.y * speed * this.context.deltaTime;
          this.context.gameObject.position.z += direction.z * speed * this.context.deltaTime;
        }

        this.executeFromNode(nodeId, 'exec');
        break;
      }

      case 'action_rotate': {
        const euler = inputs.get('euler') as Vector3 || { x: 0, y: 0, z: 0 };
        const speed = Number(inputs.get('speed')) || 1;

        if (this.context.gameObject) {
          this.context.gameObject.rotation.x += euler.x * speed * this.context.deltaTime;
          this.context.gameObject.rotation.y += euler.y * speed * this.context.deltaTime;
          this.context.gameObject.rotation.z += euler.z * speed * this.context.deltaTime;
        }

        this.executeFromNode(nodeId, 'exec');
        break;
      }

      case 'action_spawn': {
        const prefab = String(inputs.get('prefab') || '');
        const position = inputs.get('position') as Vector3 || { x: 0, y: 0, z: 0 };

        const spawned = this.context.objects.spawn(prefab, position);
        outputs.set('spawned', spawned);

        this.executeFromNodeWithContext(nodeId, 'exec', {
          nodeId,
          inputs,
          outputs,
        });
        break;
      }

      case 'action_destroy': {
        const target = inputs.get('target') || this.context.gameObject;
        const delay = Number(inputs.get('delay')) || 0;

        this.context.objects.destroy(target, delay);
        this.executeFromNode(nodeId, 'exec');
        break;
      }

      case 'action_log': {
        const message = String(inputs.get('message') || '');
        this.context.log(message);
        this.executeFromNode(nodeId, 'exec');
        break;
      }

      // === FLOW ===
      case 'condition_branch': {
        const condition = Boolean(inputs.get('condition'));

        if (condition) {
          this.executeFromNode(nodeId, 'true');
        } else {
          this.executeFromNode(nodeId, 'false');
        }
        break;
      }

      case 'flow_sequence': {
        this.executeFromNode(nodeId, 'then_0');
        this.executeFromNode(nodeId, 'then_1');
        this.executeFromNode(nodeId, 'then_2');
        break;
      }

      case 'flow_delay': {
        const duration = Number(inputs.get('duration')) || 1;

        const timeout = setTimeout(() => {
          this.executeFromNode(nodeId, 'exec');
          this.pendingDelays.delete(nodeId);
        }, duration * 1000);

        this.pendingDelays.set(nodeId, timeout);
        break;
      }

      case 'flow_loop': {
        const start = Number(inputs.get('start')) || 0;
        const end = Number(inputs.get('end')) || 10;

        for (let i = start; i < end; i++) {
          outputs.set('index', i);
          this.executeFromNodeWithContext(nodeId, 'body', {
            nodeId,
            inputs,
            outputs,
          });
        }

        this.executeFromNode(nodeId, 'completed');
        break;
      }

      // === VARIABLES ===
      case 'variable_set': {
        const name = String(inputs.get('name') || '');
        const value = inputs.get('value');

        this.context.variables.set(name, value);
        this.executeFromNode(nodeId, 'exec');
        break;
      }

      // === PHYSICS ===
      case 'physics_add_force': {
        const target = inputs.get('target') || this.context.gameObject;
        const force = inputs.get('force') as Vector3 || { x: 0, y: 0, z: 0 };
        const impulse = Boolean(inputs.get('impulse'));

        this.context.physics.addForce(target, force, impulse);
        this.executeFromNode(nodeId, 'exec');
        break;
      }

      // === AUDIO ===
      case 'audio_play': {
        const sound = String(inputs.get('sound') || '');
        const volume = Number(inputs.get('volume')) ?? 1;
        const loop = Boolean(inputs.get('loop'));

        this.context.audio.playSound(sound, volume, loop);
        this.executeFromNode(nodeId, 'exec');
        break;
      }
    }
  }
}

// ============================================================================
// COMPILADOR PARA CÓDIGO — Cook & Build Pipeline Stage 2 (Logic Transpiler)
// ============================================================================
//
// Walks the exact same node/edge graph `VisualScriptRuntime` interprets above,
// but instead of dispatching through a runtime switch it emits real TypeScript
// statements ahead of time. The generated class extends `GameScript` from
// `@aethel/engine/runtime/GameScript` — the ONLY runtime dependency a
// compiled `.aethelgraph` is allowed to carry — so a shipped game never pulls
// in this package (`@aethel/visual-scripting`), `@xyflow/react`, or any other
// editor-only weight. See `web/lib/production/visual-script-transpile-stage.ts`
// for the pipeline stage that calls this and scans its output for leaks.

export interface VisualScriptCompileResult {
  code: string
  warnings: string[]
}

type ExecLines = string[]

function sanitizeClassName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]+/g, ' ').trim()
  const pascal = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return (pascal || 'Generated') + 'Script'
}

function indentLines(lines: string[], depth = 1): string[] {
  const pad = '  '.repeat(depth)
  return lines.map(line => `${pad}${line}`)
}

class VisualScriptTranspiler {
  private readonly nodeMap: Map<string, VisualNodeType>
  private readonly edgesBySource: Map<string, Edge[]> = new Map()
  private readonly edgesByTarget: Map<string, Edge[]> = new Map()
  private readonly warnings: string[] = []

  constructor(private readonly script: VisualScript) {
    this.nodeMap = new Map(script.nodes.map(n => [n.id, n]))

    script.edges.forEach(edge => {
      const sourceKey = `${edge.source}:${edge.sourceHandle}`
      const sourceEdges = this.edgesBySource.get(sourceKey) || []
      sourceEdges.push(edge)
      this.edgesBySource.set(sourceKey, sourceEdges)

      const targetKey = `${edge.target}:${edge.targetHandle}`
      const targetEdges = this.edgesByTarget.get(targetKey) || []
      targetEdges.push(edge)
      this.edgesByTarget.set(targetKey, targetEdges)
    })
  }

  compile(): VisualScriptCompileResult {
    const className = sanitizeClassName(this.script.name)
    const lines: string[] = []

    lines.push('// AUTO-GENERATED by the Aethel Logic Transpiler (Cook & Build Pipeline, Stage 2).')
    lines.push(`// Source graph: ${this.script.name} (${this.script.id})`)
    lines.push('// Do not hand-edit — re-run the Publish pipeline to regenerate.')
    lines.push("import { GameScript, addVec3, scaleVec3 } from '@aethel/engine/runtime/GameScript';")
    lines.push('')
    lines.push(`export class ${className} extends GameScript {`)

    if (this.script.variables.length > 0) {
      for (const v of this.script.variables) {
        lines.push(`  private ${this.safeFieldName(v.name)}: ${this.tsType(v.type)} = ${JSON.stringify(v.defaultValue)};`)
      }
      lines.push('')
    }

    lines.push(...indentLines(this.compileMethod('start', 'void', 'event_start', () => [])))
    lines.push('')
    lines.push(...indentLines(this.compileUpdateMethod()))
    lines.push('')
    lines.push(...indentLines(this.compileMethod('onCollision', 'void', 'event_collision', () => ['other: import("@aethel/engine/runtime/GameScript").GameObjectHandle', 'point: import("@aethel/engine/runtime/GameScript").Vector3'])))
    lines.push('')
    lines.push(...indentLines(this.compileTriggerMethod('onTriggerEnter', 'enter')))
    lines.push('')
    lines.push(...indentLines(this.compileTriggerMethod('onTriggerExit', 'exit')))
    lines.push('}')
    lines.push('')

    return { code: lines.join('\n'), warnings: [...this.warnings] }
  }

  private safeFieldName(name: string): string {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : `v_${name.replace(/[^a-zA-Z0-9_]/g, '_')}`
  }

  private tsType(type: string): string {
    if (type === 'number' || type === 'string' || type === 'boolean') return type
    return 'unknown'
  }

  private eventNodesOfType(type: string): VisualNodeType[] {
    return this.script.nodes.filter(n => n.data?.definition?.type === type)
  }

  private compileMethod(name: string, returnType: string, eventType: string, params: () => string[]): ExecLines {
    const nodes = this.eventNodesOfType(eventType)
    const body: string[] = []
    for (const node of nodes) {
      body.push(...this.emitFromExecOutput(node.id, 'exec', new Set()))
    }
    const paramList = params().join(', ')
    return [
      `${name}(${paramList}): ${returnType} {`,
      ...indentLines(body.length > 0 ? body : ['// No nodes wired to this event.']),
      '}',
    ]
  }

  private compileUpdateMethod(): ExecLines {
    const nodes = this.eventNodesOfType('event_update')
    const body: string[] = ['super.update(deltaTime);']
    for (const node of nodes) {
      body.push(...this.emitFromExecOutput(node.id, 'exec', new Set()))
    }
    return [
      'update(deltaTime: number): void {',
      ...indentLines(body),
      '}',
    ]
  }

  private compileTriggerMethod(methodName: string, handle: 'enter' | 'exit'): ExecLines {
    const nodes = this.eventNodesOfType('event_trigger')
    const body: string[] = []
    for (const node of nodes) {
      body.push(...this.emitFromExecOutput(node.id, handle, new Set()))
    }
    return [
      `${methodName}(other: import("@aethel/engine/runtime/GameScript").GameObjectHandle): void {`,
      ...indentLines(body.length > 0 ? body : ['// No nodes wired to this event.']),
      '}',
    ]
  }

  private emitFromExecOutput(nodeId: string, outputHandle: string, visited: Set<string>): ExecLines {
    const edges = this.edgesBySource.get(`${nodeId}:${outputHandle}`) || []
    const lines: ExecLines = []
    for (const edge of edges) {
      lines.push(...this.emitNodeStatement(edge.target, visited))
    }
    return lines
  }

  private emitNodeStatement(nodeId: string, visited: Set<string>): ExecLines {
    if (visited.has(nodeId)) {
      return [`// cycle guard: node ${nodeId} already executed earlier in this chain`]
    }
    const chainVisited = new Set(visited)
    chainVisited.add(nodeId)

    const node = this.nodeMap.get(nodeId)
    const type = node?.data?.definition?.type
    if (!node || !type) return []

    switch (type) {
      case 'action_move': {
        const direction = this.expr(node, 'direction')
        const speed = this.expr(node, 'speed')
        return [
          `this.gameObject.position = addVec3(this.gameObject.position, scaleVec3(${direction}, (Number(${speed}) || 5) * this.deltaTime));`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'action_rotate': {
        const euler = this.expr(node, 'euler')
        const speed = this.expr(node, 'speed')
        return [
          `this.gameObject.rotation = addVec3(this.gameObject.rotation, scaleVec3(${euler}, (Number(${speed}) || 1) * this.deltaTime));`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'action_spawn': {
        const prefab = this.expr(node, 'prefab')
        const position = this.expr(node, 'position')
        return [
          `this.services.objects.spawn(String(${prefab}), ${position});`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'action_destroy': {
        const target = this.expr(node, 'target')
        const delay = this.expr(node, 'delay')
        return [
          `this.services.objects.destroy(${target} ?? this.gameObject, Number(${delay}) || 0);`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'action_log': {
        const message = this.expr(node, 'message')
        return [
          `this.services.log(String(${message}));`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'variable_set': {
        const nameLiteral = node.data?.values?.['name']
        const nameExpr = typeof nameLiteral === 'string' ? JSON.stringify(nameLiteral) : `String(${this.expr(node, 'name')})`
        const value = this.expr(node, 'value')
        return [
          `this.services.variables.set(${nameExpr}, ${value});`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'physics_add_force': {
        const target = this.expr(node, 'target')
        const force = this.expr(node, 'force')
        const impulse = this.expr(node, 'impulse')
        return [
          `this.services.physics.addForce(${target} ?? this.gameObject, ${force}, Boolean(${impulse}));`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'audio_play': {
        const sound = this.expr(node, 'sound')
        const volume = this.expr(node, 'volume')
        const loop = this.expr(node, 'loop')
        return [
          `this.services.audio.playSound(String(${sound}), Number(${volume}) ?? 1, Boolean(${loop}));`,
          ...this.emitFromExecOutput(nodeId, 'exec', chainVisited),
        ]
      }
      case 'condition_branch': {
        const condition = this.expr(node, 'condition')
        const trueLines = indentLines(this.emitFromExecOutput(nodeId, 'true', chainVisited))
        const falseLines = indentLines(this.emitFromExecOutput(nodeId, 'false', chainVisited))
        return [
          `if (Boolean(${condition})) {`,
          ...(trueLines.length > 0 ? trueLines : ['  // empty branch']),
          '} else {',
          ...(falseLines.length > 0 ? falseLines : ['  // empty branch']),
          '}',
        ]
      }
      case 'flow_sequence': {
        return [
          ...this.emitFromExecOutput(nodeId, 'then_0', chainVisited),
          ...this.emitFromExecOutput(nodeId, 'then_1', chainVisited),
          ...this.emitFromExecOutput(nodeId, 'then_2', chainVisited),
        ]
      }
      case 'flow_delay': {
        const duration = this.expr(node, 'duration')
        const innerLines = indentLines(this.emitFromExecOutput(nodeId, 'exec', chainVisited))
        return [
          `setTimeout(() => {`,
          ...(innerLines.length > 0 ? innerLines : ['  // empty continuation']),
          `}, (Number(${duration}) || 1) * 1000);`,
        ]
      }
      case 'flow_loop': {
        const start = this.expr(node, 'start')
        const end = this.expr(node, 'end')
        const loopVar = `i_${nodeId.replace(/[^a-zA-Z0-9_]/g, '_')}`
        const bodyLines = indentLines(this.emitFromExecOutput(nodeId, 'body', chainVisited))
        return [
          `for (let ${loopVar} = Number(${start}) || 0; ${loopVar} < (Number(${end}) || 10); ${loopVar}++) {`,
          ...(bodyLines.length > 0 ? bodyLines : ['  // empty loop body']),
          '}',
          ...this.emitFromExecOutput(nodeId, 'completed', chainVisited),
        ]
      }
      default: {
        this.warnings.push(`Node type "${type}" (${nodeId}) has no statement codegen yet — skipped, chain continues from its "exec" output.`)
        return this.emitFromExecOutput(nodeId, 'exec', chainVisited)
      }
    }
  }

  /** Resolves a data input port to a TS expression — recursing into upstream data nodes, or falling back to the node's own literal/default value when unconnected. */
  private expr(node: VisualNodeType, portId: string): string {
    const key = `${node.id}:${portId}`
    const incoming = this.edgesByTarget.get(key)
    if (incoming && incoming.length > 0) {
      const edge = incoming[0]
      return this.dataExpr(edge.source, edge.sourceHandle || '')
    }
    const literal = node.data?.values?.[portId]
    const fallback = node.data?.definition?.inputs?.find((input: { id: string; default?: unknown }) => input.id === portId)?.default
    return JSON.stringify(literal ?? fallback ?? null)
  }

  private dataExpr(nodeId: string, outputHandle: string): string {
    const node = this.nodeMap.get(nodeId)
    const type = node?.data?.definition?.type
    if (!node || !type) return 'undefined'

    switch (type) {
      case 'math_add': return `((Number(${this.expr(node, 'a')}) || 0) + (Number(${this.expr(node, 'b')}) || 0))`
      case 'math_subtract': return `((Number(${this.expr(node, 'a')}) || 0) - (Number(${this.expr(node, 'b')}) || 0))`
      case 'math_multiply': return `((Number(${this.expr(node, 'a')}) || 1) * (Number(${this.expr(node, 'b')}) || 1))`
      case 'math_divide': return `(((Number(${this.expr(node, 'b')}) || 1) !== 0) ? (Number(${this.expr(node, 'a')}) || 0) / (Number(${this.expr(node, 'b')}) || 1) : 0)`
      case 'math_random': return `(Math.random() * ((Number(${this.expr(node, 'max')}) || 1) - (Number(${this.expr(node, 'min')}) || 0)) + (Number(${this.expr(node, 'min')}) || 0))`
      case 'math_vector3': return `({ x: Number(${this.expr(node, 'x')}) || 0, y: Number(${this.expr(node, 'y')}) || 0, z: Number(${this.expr(node, 'z')}) || 0 })`
      case 'math_break_vector3': {
        const vec = `(${this.expr(node, 'vector')})`
        if (outputHandle === 'x') return `(${vec}.x || 0)`
        if (outputHandle === 'y') return `(${vec}.y || 0)`
        if (outputHandle === 'z') return `(${vec}.z || 0)`
        return 'undefined'
      }
      case 'condition_compare': {
        const a = `(Number(${this.expr(node, 'a')}) || 0)`
        const b = `(Number(${this.expr(node, 'b')}) || 0)`
        if (outputHandle === 'equal') return `(${a} === ${b})`
        if (outputHandle === 'greater') return `(${a} > ${b})`
        if (outputHandle === 'less') return `(${a} < ${b})`
        return 'undefined'
      }
      case 'variable_get': {
        const nameLiteral = node.data?.values?.['name']
        const nameExpr = typeof nameLiteral === 'string' ? JSON.stringify(nameLiteral) : `String(${this.expr(node, 'name')})`
        return `this.services.variables.get(${nameExpr})`
      }
      case 'input_key': {
        const key = `String(${this.expr(node, 'key')} || 'Space')`
        if (outputHandle === 'pressed') return `this.services.input.getKey(${key})`
        if (outputHandle === 'just_pressed') return `this.services.input.getKeyDown(${key})`
        if (outputHandle === 'just_released') return `this.services.input.getKeyUp(${key})`
        return 'undefined'
      }
      case 'input_axis': return `this.services.input.getAxis(String(${this.expr(node, 'axis')} || 'Horizontal'))`
      case 'input_mouse': {
        if (outputHandle === 'position') return 'this.services.input.mousePosition'
        if (outputHandle === 'delta') return 'this.services.input.mouseDelta'
        if (outputHandle === 'left') return 'this.services.input.mouseButton(0)'
        if (outputHandle === 'right') return 'this.services.input.mouseButton(2)'
        return 'undefined'
      }
      case 'physics_raycast': {
        const call = `this.services.physics.raycast(${this.expr(node, 'origin')}, ${this.expr(node, 'direction')}, Number(${this.expr(node, 'distance')}) || 100)`
        if (outputHandle === 'hit') return `(${call} !== null)`
        if (outputHandle === 'point') return `(${call}?.point ?? { x: 0, y: 0, z: 0 })`
        if (outputHandle === 'normal') return `(${call}?.normal ?? { x: 0, y: 1, z: 0 })`
        if (outputHandle === 'object') return `(${call}?.object ?? null)`
        return 'undefined'
      }
      case 'event_update': return outputHandle === 'deltaTime' ? 'this.deltaTime' : 'undefined'
      case 'event_collision': return outputHandle === 'other' ? 'other' : outputHandle === 'point' ? 'point' : 'undefined'
      case 'event_trigger': return outputHandle === 'other' ? 'other' : 'undefined'
      default: {
        this.warnings.push(`Data node type "${type}" (${nodeId}) has no expression codegen yet — resolved to "undefined".`)
        return 'undefined'
      }
    }
  }
}

export class VisualScriptCompiler {
  /**
   * Compiles a visual script graph into a real, standalone TypeScript class
   * — no interpreter, no JSON walk at game runtime. See
   * `VisualScriptTranspiler` above for the node-by-node codegen; this stays a
   * thin static entrypoint so `web/lib/production/visual-script-transpile-stage.ts`
   * has one stable import.
   */
  static compileToTypeScript(script: VisualScript): string {
    return new VisualScriptTranspiler(script).compile().code
  }

  /** Same as `compileToTypeScript`, but also surfaces unsupported-node warnings for the Publish pipeline's review packet. */
  static compile(script: VisualScript): VisualScriptCompileResult {
    return new VisualScriptTranspiler(script).compile()
  }
}

export default VisualScriptRuntime;

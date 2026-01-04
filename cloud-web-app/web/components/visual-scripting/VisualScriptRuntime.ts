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
  // EXECUÇÃO INTERNA
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
// COMPILADOR PARA CÓDIGO
// ============================================================================

export class VisualScriptCompiler {
  /**
   * Compila script visual para TypeScript
   */
  static compileToTypeScript(script: VisualScript): string {
    const lines: string[] = [];
    
    lines.push('// Auto-generated from Visual Script');
    lines.push(`// Script: ${script.name}`);
    lines.push('');
    lines.push('import { GameScript, Vector3 } from "@/lib/game-engine";');
    lines.push('');
    lines.push(`export class ${script.name.replace(/\s+/g, '')}Script extends GameScript {`);
    
    // Variáveis
    if (script.variables.length > 0) {
      lines.push('  // Variables');
      script.variables.forEach(v => {
        lines.push(`  private ${v.name}: ${v.type} = ${JSON.stringify(v.defaultValue)};`);
      });
      lines.push('');
    }
    
    // Métodos de evento
    const eventNodes = script.nodes.filter(n => 
      n.data?.definition?.category === 'event'
    );
    
    eventNodes.forEach(eventNode => {
      const type = eventNode.data?.definition?.type;
      
      switch (type) {
        case 'event_start':
          lines.push('  start(): void {');
          lines.push('    // TODO: Implement start logic');
          lines.push('  }');
          break;
        case 'event_update':
          lines.push('  update(deltaTime: number): void {');
          lines.push('    // TODO: Implement update logic');
          lines.push('  }');
          break;
        case 'event_collision':
          lines.push('  onCollision(other: GameObject, point: Vector3): void {');
          lines.push('    // TODO: Implement collision logic');
          lines.push('  }');
          break;
      }
      
      lines.push('');
    });
    
    lines.push('}');
    
    return lines.join('\n');
  }
}

export default VisualScriptRuntime;

/**
 * VFX GRAPH EDITOR - Aethel Engine
 * 
 * Sistema visual de criação de efeitos baseado em nodes.
 * Similar ao VFX Graph da Unity ou Niagara da Unreal.
 * 
 * FEATURES:
 * - Node-based visual editing
 * - Real-time preview
 * - GPU particles
 * - Attribute manipulation
 * - Events and triggers
 * - Custom expressions
 * - Sub-graphs
 * - Export to runtime
 */

import * as THREE from 'three';
import { registerBuiltinVFXNodes } from './vfx-graph-builtins';

// ============================================================================
// TYPES
// ============================================================================

export type VFXDataType = 
  | 'float'
  | 'float2'
  | 'float3'
  | 'float4'
  | 'int'
  | 'bool'
  | 'color'
  | 'texture'
  | 'gradient'
  | 'curve'
  | 'mesh';

export interface VFXPort {
  id: string;
  name: string;
  type: VFXDataType;
  direction: 'input' | 'output';
  value?: any;
  connected?: boolean;
}

export interface VFXConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface VFXNodeDefinition {
  type: string;
  category: string;
  title: string;
  description: string;
  inputs: Omit<VFXPort, 'id' | 'direction' | 'connected'>[];
  outputs: Omit<VFXPort, 'id' | 'direction' | 'connected'>[];
  compute: (inputs: Record<string, any>, context: VFXContext) => Record<string, any>;
  glsl?: string;
}

export interface VFXNodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  inputs: VFXPort[];
  outputs: VFXPort[];
  data?: Record<string, any>;
}

export interface VFXContext {
  particleIndex: number;
  particleCount: number;
  deltaTime: number;
  totalTime: number;
  spawnIndex: number;
  random: () => number;
  getAttribute: (name: string) => any;
  setAttribute: (name: string, value: any) => void;
}

export interface VFXParticleAttribute {
  name: string;
  type: VFXDataType;
  defaultValue: any;
  perParticle: boolean;
}

// ============================================================================
// NODE REGISTRY
// ============================================================================

export class VFXNodeRegistry {
  private static definitions: Map<string, VFXNodeDefinition> = new Map();
  
  static register(definition: VFXNodeDefinition): void {
    this.definitions.set(definition.type, definition);
  }
  
  static get(type: string): VFXNodeDefinition | undefined {
    return this.definitions.get(type);
  }
  
  static getByCategory(category: string): VFXNodeDefinition[] {
    return Array.from(this.definitions.values())
      .filter(d => d.category === category);
  }
  
  static getAllCategories(): string[] {
    return [...new Set(Array.from(this.definitions.values()).map(d => d.category))];
  }
  
  static getAll(): VFXNodeDefinition[] {
    return Array.from(this.definitions.values());
  }
}

// BUILT-IN NODES
registerBuiltinVFXNodes((definition) => VFXNodeRegistry.register(definition));

// ============================================================================
// VFX GRAPH
// ============================================================================

export class VFXGraph {
  readonly id: string;
  name: string;
  nodes: Map<string, VFXNodeInstance> = new Map();
  connections: Map<string, VFXConnection> = new Map();
  attributes: VFXParticleAttribute[] = [];
  
  private nodeCounter = 0;
  private connectionCounter = 0;
  
  constructor(name: string = 'New VFX Graph') {
    this.id = crypto.randomUUID();
    this.name = name;
    
    // Default attributes
    this.attributes = [
      { name: 'position', type: 'float3', defaultValue: [0, 0, 0], perParticle: true },
      { name: 'velocity', type: 'float3', defaultValue: [0, 0, 0], perParticle: true },
      { name: 'color', type: 'color', defaultValue: [1, 1, 1, 1], perParticle: true },
      { name: 'size', type: 'float', defaultValue: 1, perParticle: true },
      { name: 'lifetime', type: 'float', defaultValue: 2, perParticle: true },
      { name: 'age', type: 'float', defaultValue: 0, perParticle: true },
      { name: 'normalizedAge', type: 'float', defaultValue: 0, perParticle: true },
      { name: 'rotation', type: 'float', defaultValue: 0, perParticle: true },
      { name: 'alive', type: 'bool', defaultValue: true, perParticle: true }
    ];
  }
  
  addNode(type: string, position: { x: number; y: number }): VFXNodeInstance | null {
    const definition = VFXNodeRegistry.get(type);
    if (!definition) return null;
    
    const id = `node_${++this.nodeCounter}`;
    
    const node: VFXNodeInstance = {
      id,
      type,
      position,
      inputs: definition.inputs.map((input, i) => ({
        id: `${id}_in_${i}`,
        name: input.name,
        type: input.type,
        direction: 'input' as const,
        value: input.value,
        connected: false
      })),
      outputs: definition.outputs.map((output, i) => ({
        id: `${id}_out_${i}`,
        name: output.name,
        type: output.type,
        direction: 'output' as const,
        connected: false
      })),
      data: {}
    };
    
    this.nodes.set(id, node);
    return node;
  }
  
  removeNode(nodeId: string): void {
    // Remove connections to/from this node
    for (const [connId, conn] of this.connections) {
      if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
        this.connections.delete(connId);
      }
    }
    
    this.nodes.delete(nodeId);
  }
  
  connect(sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string): VFXConnection | null {
    const sourceNode = this.nodes.get(sourceNodeId);
    const targetNode = this.nodes.get(targetNodeId);
    
    if (!sourceNode || !targetNode) return null;
    
    const sourcePort = sourceNode.outputs.find(p => p.id === sourcePortId);
    const targetPort = targetNode.inputs.find(p => p.id === targetPortId);
    
    if (!sourcePort || !targetPort) return null;
    
    // Check type compatibility
    if (!this.areTypesCompatible(sourcePort.type, targetPort.type)) {
      console.warn(`Type mismatch: ${sourcePort.type} -> ${targetPort.type}`);
      return null;
    }
    
    // Remove existing connection to target port
    for (const [connId, conn] of this.connections) {
      if (conn.targetNodeId === targetNodeId && conn.targetPortId === targetPortId) {
        this.connections.delete(connId);
        
        // Update old source port
        const oldSourceNode = this.nodes.get(conn.sourceNodeId);
        if (oldSourceNode) {
          const oldSourcePort = oldSourceNode.outputs.find(p => p.id === conn.sourcePortId);
          if (oldSourcePort) oldSourcePort.connected = false;
        }
      }
    }
    
    const id = `conn_${++this.connectionCounter}`;
    const connection: VFXConnection = {
      id,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId
    };
    
    this.connections.set(id, connection);
    
    sourcePort.connected = true;
    targetPort.connected = true;
    
    return connection;
  }
  
  disconnect(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    
    const sourceNode = this.nodes.get(conn.sourceNodeId);
    const targetNode = this.nodes.get(conn.targetNodeId);
    
    if (sourceNode) {
      const port = sourceNode.outputs.find(p => p.id === conn.sourcePortId);
      if (port) port.connected = false;
    }
    
    if (targetNode) {
      const port = targetNode.inputs.find(p => p.id === conn.targetPortId);
      if (port) port.connected = false;
    }
    
    this.connections.delete(connectionId);
  }
  
  private areTypesCompatible(source: VFXDataType, target: VFXDataType): boolean {
    if (source === target) return true;
    
    // Allow some implicit conversions
    const numericTypes: VFXDataType[] = ['float', 'int'];
    if (numericTypes.includes(source) && numericTypes.includes(target)) return true;
    
    const vectorTypes: VFXDataType[] = ['float2', 'float3', 'float4', 'color'];
    if (vectorTypes.includes(source) && vectorTypes.includes(target)) return true;
    
    return false;
  }
  
  setNodeInputValue(nodeId: string, portId: string, value: any): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    const port = node.inputs.find(p => p.id === portId);
    if (port) {
      port.value = value;
    }
  }
  
  getTopologicalOrder(): VFXNodeInstance[] {
    const visited = new Set<string>();
    const result: VFXNodeInstance[] = [];
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Visit dependencies first
      for (const conn of this.connections.values()) {
        if (conn.targetNodeId === nodeId) {
          visit(conn.sourceNodeId);
        }
      }
      
      const node = this.nodes.get(nodeId);
      if (node) result.push(node);
    };
    
    for (const nodeId of this.nodes.keys()) {
      visit(nodeId);
    }
    
    return result;
  }
  
  serialize(): string {
    return JSON.stringify({
      id: this.id,
      name: this.name,
      nodes: Array.from(this.nodes.values()),
      connections: Array.from(this.connections.values()),
      attributes: this.attributes
    });
  }
  
  static deserialize(json: string): VFXGraph {
    const data = JSON.parse(json);
    const graph = new VFXGraph(data.name);
    
    for (const node of data.nodes) {
      graph.nodes.set(node.id, node);
    }
    
    for (const conn of data.connections) {
      graph.connections.set(conn.id, conn);
    }
    
    graph.attributes = data.attributes;
    
    return graph;
  }
}

// ============================================================================
// VFX GRAPH COMPILER
// ============================================================================

export class VFXGraphCompiler {
  compile(graph: VFXGraph): CompiledVFXGraph {
    const nodes = graph.getTopologicalOrder();
    
    const spawnNodes: VFXNodeInstance[] = [];
    const initNodes: VFXNodeInstance[] = [];
    const updateNodes: VFXNodeInstance[] = [];
    const outputNodes: VFXNodeInstance[] = [];
    
    for (const node of nodes) {
      const def = VFXNodeRegistry.get(node.type);
      if (!def) continue;
      
      switch (def.category) {
        case 'Spawn':
          spawnNodes.push(node);
          break;
        case 'Output':
          outputNodes.push(node);
          break;
        case 'Position':
        case 'Velocity':
        case 'Size':
        case 'Color':
        case 'Lifetime':
          initNodes.push(node);
          break;
        default:
          updateNodes.push(node);
      }
    }
    
    return new CompiledVFXGraph(graph, spawnNodes, initNodes, updateNodes, outputNodes);
  }
  
  compileToGLSL(graph: VFXGraph): string {
    // Generate compute shader code
    let code = `
// Auto-generated VFX compute shader
precision highp float;

// Particle attributes
attribute vec3 a_position;
attribute vec3 a_velocity;
attribute vec4 a_color;
attribute float a_size;
attribute float a_lifetime;
attribute float a_age;

// Output
varying vec3 v_position;
varying vec4 v_color;
varying float v_size;

// Uniforms
uniform float u_deltaTime;
uniform float u_totalTime;

// Noise functions
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

void main() {
`;
    
    // Add node computations
    const nodes = graph.getTopologicalOrder();
    for (const node of nodes) {
      const def = VFXNodeRegistry.get(node.type);
      if (def?.glsl) {
        code += `  // ${def.title}\n  ${def.glsl}\n\n`;
      }
    }
    
    code += `
  v_position = position;
  v_color = color;
  v_size = size;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(v_position, 1.0);
  gl_PointSize = v_size * 100.0 / gl_Position.w;
}
`;
    
    return code;
  }
}

// ============================================================================
// COMPILED VFX GRAPH
// ============================================================================

export class CompiledVFXGraph {
  private graph: VFXGraph;
  private spawnNodes: VFXNodeInstance[];
  private initNodes: VFXNodeInstance[];
  private updateNodes: VFXNodeInstance[];
  private outputNodes: VFXNodeInstance[];
  
  private nodeOutputCache: Map<string, Record<string, any>> = new Map();
  
  constructor(
    graph: VFXGraph,
    spawnNodes: VFXNodeInstance[],
    initNodes: VFXNodeInstance[],
    updateNodes: VFXNodeInstance[],
    outputNodes: VFXNodeInstance[]
  ) {
    this.graph = graph;
    this.spawnNodes = spawnNodes;
    this.initNodes = initNodes;
    this.updateNodes = updateNodes;
    this.outputNodes = outputNodes;
  }
  
  computeSpawnCount(context: VFXContext): number {
    let count = 0;
    
    for (const node of this.spawnNodes) {
      const outputs = this.executeNode(node, context);
      count += outputs.SpawnEvent || 0;
    }
    
    return Math.floor(count);
  }
  
  initializeParticle(context: VFXContext): Record<string, any> {
    this.nodeOutputCache.clear();
    const attributes: Record<string, any> = {};
    
    // Execute init nodes
    for (const node of this.initNodes) {
      this.executeNode(node, context);
    }
    
    // Execute output nodes
    for (const node of this.outputNodes) {
      this.executeNode(node, context);
    }
    
    // Collect attributes from context
    for (const attr of this.graph.attributes) {
      attributes[attr.name] = context.getAttribute(attr.name) ?? attr.defaultValue;
    }
    
    return attributes;
  }
  
  updateParticle(context: VFXContext): void {
    this.nodeOutputCache.clear();
    
    for (const node of this.updateNodes) {
      this.executeNode(node, context);
    }
  }
  
  private executeNode(node: VFXNodeInstance, context: VFXContext): Record<string, any> {
    // Check cache
    const cached = this.nodeOutputCache.get(node.id);
    if (cached) return cached;
    
    const definition = VFXNodeRegistry.get(node.type);
    if (!definition) return {};
    
    // Gather inputs
    const inputs: Record<string, any> = {};
    
    for (const port of node.inputs) {
      // Check for connection
      let connected = false;
      for (const conn of this.graph.connections.values()) {
        if (conn.targetNodeId === node.id && conn.targetPortId === port.id) {
          const sourceNode = this.graph.nodes.get(conn.sourceNodeId);
          if (sourceNode) {
            const sourceOutputs = this.executeNode(sourceNode, context);
            const sourcePort = sourceNode.outputs.find(p => p.id === conn.sourcePortId);
            if (sourcePort) {
              inputs[port.name] = sourceOutputs[sourcePort.name];
              connected = true;
            }
          }
        }
      }
      
      if (!connected) {
        inputs[port.name] = port.value;
      }
    }
    
    // Execute compute
    const outputs = definition.compute(inputs, context);
    
    // Cache outputs
    this.nodeOutputCache.set(node.id, outputs);
    
    return outputs;
  }
}

// ============================================================================
// VFX RUNTIME
// ============================================================================

interface VFXParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  alpha: number;
  size: number;
  lifetime: number;
  age: number;
  rotation: number;
  alive: boolean;
  attributes: Record<string, any>;
}

export class VFXRuntime {
  private compiled: CompiledVFXGraph;
  private particles: VFXParticle[] = [];
  private maxParticles: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  
  private positionArray: Float32Array;
  private colorArray: Float32Array;
  private sizeArray: Float32Array;
  
  private totalTime: number = 0;
  private spawnAccumulator: number = 0;
  private rng: () => number;
  
  constructor(compiled: CompiledVFXGraph, maxParticles: number = 10000) {
    this.compiled = compiled;
    this.maxParticles = maxParticles;
    
    // Create seeded random
    this.rng = this.createSeededRandom(12345);
    
    // Initialize arrays
    this.positionArray = new Float32Array(maxParticles * 3);
    this.colorArray = new Float32Array(maxParticles * 4);
    this.sizeArray = new Float32Array(maxParticles);
    
    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionArray, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 4));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizeArray, 1));
    
    // Create material
    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Create points
    this.points = new THREE.Points(this.geometry, this.material);
  }
  
  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }
  
  getObject(): THREE.Points {
    return this.points;
  }
  
  update(deltaTime: number): void {
    this.totalTime += deltaTime;
    
    // Create context for spawn
    const spawnContext = this.createContext(-1, deltaTime);
    
    // Calculate spawn count
    const spawnCount = this.compiled.computeSpawnCount(spawnContext);
    this.spawnAccumulator += spawnCount;
    
    // Spawn new particles
    const toSpawn = Math.floor(this.spawnAccumulator);
    this.spawnAccumulator -= toSpawn;
    
    for (let i = 0; i < toSpawn; i++) {
      this.spawnParticle();
    }
    
    // Update existing particles
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (!particle.alive) continue;
      
      particle.age += deltaTime;
      
      if (particle.age >= particle.lifetime) {
        particle.alive = false;
        continue;
      }
      
      // Create update context
      const context = this.createContext(i, deltaTime);
      context.setAttribute('position', [particle.position.x, particle.position.y, particle.position.z]);
      context.setAttribute('velocity', [particle.velocity.x, particle.velocity.y, particle.velocity.z]);
      context.setAttribute('normalizedAge', particle.age / particle.lifetime);
      
      // Run update
      this.compiled.updateParticle(context);
      
      // Apply forces to velocity
      const force = context.getAttribute('force');
      if (force) {
        particle.velocity.x += force[0] * deltaTime;
        particle.velocity.y += force[1] * deltaTime;
        particle.velocity.z += force[2] * deltaTime;
      }
      
      // Update position
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;
      
      // Update visual properties
      const color = context.getAttribute('color');
      if (color) {
        particle.color.setRGB(color[0], color[1], color[2]);
        particle.alpha = color[3] ?? 1;
      }
      
      const size = context.getAttribute('size');
      if (size !== undefined) {
        particle.size = size;
      }
    }
    
    // Update buffers
    this.updateBuffers();
  }
  
  private spawnParticle(): void {
    if (this.particles.length >= this.maxParticles) {
      // Recycle dead particle
      const deadIndex = this.particles.findIndex(p => !p.alive);
      if (deadIndex === -1) return;
      
      const context = this.createContext(deadIndex, 0);
      const attrs = this.compiled.initializeParticle(context);
      
      this.initParticleFromAttrs(this.particles[deadIndex], attrs);
      return;
    }
    
    const context = this.createContext(this.particles.length, 0);
    const attrs = this.compiled.initializeParticle(context);
    
    const particle: VFXParticle = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      color: new THREE.Color(1, 1, 1),
      alpha: 1,
      size: 1,
      lifetime: 2,
      age: 0,
      rotation: 0,
      alive: true,
      attributes: {}
    };
    
    this.initParticleFromAttrs(particle, attrs);
    this.particles.push(particle);
  }
  
  private initParticleFromAttrs(particle: VFXParticle, attrs: Record<string, any>): void {
    particle.alive = true;
    particle.age = 0;
    
    if (attrs.position) {
      particle.position.set(attrs.position[0], attrs.position[1], attrs.position[2]);
    }
    if (attrs.velocity) {
      particle.velocity.set(attrs.velocity[0], attrs.velocity[1], attrs.velocity[2]);
    }
    if (attrs.color) {
      particle.color.setRGB(attrs.color[0], attrs.color[1], attrs.color[2]);
      particle.alpha = attrs.color[3] ?? 1;
    }
    if (attrs.size !== undefined) {
      particle.size = attrs.size;
    }
    if (attrs.lifetime !== undefined) {
      particle.lifetime = attrs.lifetime;
    }
    if (attrs.rotation !== undefined) {
      particle.rotation = attrs.rotation;
    }
    
    particle.attributes = { ...attrs };
  }
  
  private createContext(particleIndex: number, deltaTime: number): VFXContext {
    const attributes: Record<string, any> = {};
    
    return {
      particleIndex,
      particleCount: this.particles.length,
      deltaTime,
      totalTime: this.totalTime,
      spawnIndex: particleIndex,
      random: this.rng,
      getAttribute: (name: string) => attributes[name],
      setAttribute: (name: string, value: any) => { attributes[name] = value; }
    };
  }
  
  private updateBuffers(): void {
    let liveCount = 0;
    
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (!particle.alive) continue;
      
      const i3 = liveCount * 3;
      const i4 = liveCount * 4;
      
      this.positionArray[i3] = particle.position.x;
      this.positionArray[i3 + 1] = particle.position.y;
      this.positionArray[i3 + 2] = particle.position.z;
      
      this.colorArray[i4] = particle.color.r;
      this.colorArray[i4 + 1] = particle.color.g;
      this.colorArray[i4 + 2] = particle.color.b;
      this.colorArray[i4 + 3] = particle.alpha;
      
      this.sizeArray[liveCount] = particle.size;
      
      liveCount++;
    }
    
    this.geometry.setDrawRange(0, liveCount);
    
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }
  
  getParticleCount(): number {
    return this.particles.filter(p => p.alive).length;
  }
  
  reset(): void {
    for (const particle of this.particles) {
      particle.alive = false;
    }
    this.totalTime = 0;
    this.spawnAccumulator = 0;
  }
  
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.particles = [];
  }
}

// ============================================================================
// VFX GRAPH MANAGER
// ============================================================================

export class VFXGraphManager {
  private graphs: Map<string, VFXGraph> = new Map();
  private runtimes: Map<string, VFXRuntime> = new Map();
  private compiler: VFXGraphCompiler = new VFXGraphCompiler();
  private scene: THREE.Scene | null = null;
  
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }
  
  createGraph(name: string): VFXGraph {
    const graph = new VFXGraph(name);
    this.graphs.set(graph.id, graph);
    return graph;
  }
  
  getGraph(id: string): VFXGraph | undefined {
    return this.graphs.get(id);
  }
  
  deleteGraph(id: string): void {
    this.stopGraph(id);
    this.graphs.delete(id);
  }
  
  compileAndPlay(graphId: string, maxParticles?: number): VFXRuntime | null {
    const graph = this.graphs.get(graphId);
    if (!graph) return null;
    
    // Stop existing runtime
    this.stopGraph(graphId);
    
    // Compile and create runtime
    const compiled = this.compiler.compile(graph);
    const runtime = new VFXRuntime(compiled, maxParticles);
    
    this.runtimes.set(graphId, runtime);
    
    if (this.scene) {
      this.scene.add(runtime.getObject());
    }
    
    return runtime;
  }
  
  stopGraph(graphId: string): void {
    const runtime = this.runtimes.get(graphId);
    if (runtime) {
      if (this.scene) {
        this.scene.remove(runtime.getObject());
      }
      runtime.dispose();
      this.runtimes.delete(graphId);
    }
  }
  
  getRuntime(graphId: string): VFXRuntime | undefined {
    return this.runtimes.get(graphId);
  }
  
  update(deltaTime: number): void {
    for (const runtime of this.runtimes.values()) {
      runtime.update(deltaTime);
    }
  }
  
  // Preset effects
  createFireEffect(): VFXGraph {
    const graph = this.createGraph('Fire Effect');
    
    const spawn = graph.addNode('spawn_rate', { x: 100, y: 100 });
    if (spawn) graph.setNodeInputValue(spawn.id, spawn.inputs[0].id, 50);
    
    const pos = graph.addNode('position_cone', { x: 300, y: 100 });
    if (pos) {
      graph.setNodeInputValue(pos.id, pos.inputs[1].id, 30);
      graph.setNodeInputValue(pos.id, pos.inputs[2].id, 0.5);
    }
    
    const vel = graph.addNode('velocity_from_direction', { x: 300, y: 200 });
    if (vel) graph.setNodeInputValue(vel.id, vel.inputs[1].id, 3);
    
    const size = graph.addNode('size_over_life', { x: 300, y: 300 });
    
    const color = graph.addNode('color_over_life', { x: 300, y: 400 });
    if (color) {
      graph.setNodeInputValue(color.id, color.inputs[0].id, [
        { position: 0, color: [1, 0.9, 0.3, 1] },
        { position: 0.3, color: [1, 0.5, 0, 1] },
        { position: 0.7, color: [0.5, 0.1, 0, 0.5] },
        { position: 1, color: [0.1, 0.1, 0.1, 0] }
      ]);
    }
    
    const lifetime = graph.addNode('lifetime_random', { x: 300, y: 500 });
    if (lifetime) {
      graph.setNodeInputValue(lifetime.id, lifetime.inputs[0].id, 0.5);
      graph.setNodeInputValue(lifetime.id, lifetime.inputs[1].id, 1.5);
    }
    
    const output = graph.addNode('output_particle', { x: 500, y: 300 });
    
    // Connect nodes
    if (pos && output) {
      graph.connect(pos.id, pos.outputs[0].id, output.id, output.inputs[0].id);
    }
    if (pos && vel) {
      graph.connect(pos.id, pos.outputs[1].id, vel.id, vel.inputs[0].id);
    }
    if (vel && output) {
      graph.connect(vel.id, vel.outputs[0].id, output.id, output.inputs[1].id);
    }
    if (color && output) {
      graph.connect(color.id, color.outputs[0].id, output.id, output.inputs[2].id);
    }
    if (lifetime && output) {
      graph.connect(lifetime.id, lifetime.outputs[0].id, output.id, output.inputs[4].id);
    }
    
    return graph;
  }
  
  createSmokeEffect(): VFXGraph {
    const graph = this.createGraph('Smoke Effect');
    
    graph.addNode('spawn_rate', { x: 100, y: 100 });
    graph.addNode('position_sphere', { x: 300, y: 100 });
    graph.addNode('velocity_random', { x: 300, y: 200 });
    graph.addNode('force_gravity', { x: 300, y: 300 });
    graph.addNode('force_wind', { x: 300, y: 400 });
    graph.addNode('output_particle', { x: 500, y: 300 });
    
    return graph;
  }
  
  createSparkEffect(): VFXGraph {
    const graph = this.createGraph('Spark Effect');
    
    const burst = graph.addNode('spawn_burst', { x: 100, y: 100 });
    if (burst) graph.setNodeInputValue(burst.id, burst.inputs[0].id, 200);
    
    const pos = graph.addNode('position_sphere', { x: 300, y: 100 });
    if (pos) graph.setNodeInputValue(pos.id, pos.inputs[1].id, 0.1);
    
    graph.addNode('velocity_random', { x: 300, y: 200 });
    graph.addNode('force_gravity', { x: 300, y: 300 });
    graph.addNode('output_particle', { x: 500, y: 300 });
    
    return graph;
  }
  
  dispose(): void {
    for (const runtime of this.runtimes.values()) {
      if (this.scene) {
        this.scene.remove(runtime.getObject());
      }
      runtime.dispose();
    }
    this.runtimes.clear();
    this.graphs.clear();
  }
}

export default VFXGraphManager;

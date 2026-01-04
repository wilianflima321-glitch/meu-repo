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

// ============================================================================
// BUILT-IN NODES
// ============================================================================

// Spawn Context
VFXNodeRegistry.register({
  type: 'spawn_burst',
  category: 'Spawn',
  title: 'Spawn Burst',
  description: 'Spawn particles in a burst',
  inputs: [
    { name: 'Count', type: 'int', value: 100 },
    { name: 'Delay', type: 'float', value: 0 }
  ],
  outputs: [
    { name: 'SpawnEvent', type: 'float' }
  ],
  compute: (inputs) => ({ SpawnEvent: inputs.Count })
});

VFXNodeRegistry.register({
  type: 'spawn_rate',
  category: 'Spawn',
  title: 'Spawn Rate',
  description: 'Spawn particles over time',
  inputs: [
    { name: 'Rate', type: 'float', value: 10 }
  ],
  outputs: [
    { name: 'SpawnEvent', type: 'float' }
  ],
  compute: (inputs, ctx) => ({ SpawnEvent: inputs.Rate * ctx.deltaTime })
});

// Position
VFXNodeRegistry.register({
  type: 'position_sphere',
  category: 'Position',
  title: 'Position Sphere',
  description: 'Set position on sphere surface',
  inputs: [
    { name: 'Center', type: 'float3', value: [0, 0, 0] },
    { name: 'Radius', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Position', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const theta = ctx.random() * Math.PI * 2;
    const phi = Math.acos(2 * ctx.random() - 1);
    const r = inputs.Radius;
    return {
      Position: [
        inputs.Center[0] + r * Math.sin(phi) * Math.cos(theta),
        inputs.Center[1] + r * Math.sin(phi) * Math.sin(theta),
        inputs.Center[2] + r * Math.cos(phi)
      ]
    };
  },
  glsl: `
    float theta = random() * 6.28318;
    float phi = acos(2.0 * random() - 1.0);
    float r = uRadius;
    vec3 position = uCenter + r * vec3(sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi));
  `
});

VFXNodeRegistry.register({
  type: 'position_box',
  category: 'Position',
  title: 'Position Box',
  description: 'Set position within box',
  inputs: [
    { name: 'Center', type: 'float3', value: [0, 0, 0] },
    { name: 'Size', type: 'float3', value: [1, 1, 1] }
  ],
  outputs: [
    { name: 'Position', type: 'float3' }
  ],
  compute: (inputs, ctx) => ({
    Position: [
      inputs.Center[0] + (ctx.random() - 0.5) * inputs.Size[0],
      inputs.Center[1] + (ctx.random() - 0.5) * inputs.Size[1],
      inputs.Center[2] + (ctx.random() - 0.5) * inputs.Size[2]
    ]
  })
});

VFXNodeRegistry.register({
  type: 'position_cone',
  category: 'Position',
  title: 'Position Cone',
  description: 'Set position within cone',
  inputs: [
    { name: 'Origin', type: 'float3', value: [0, 0, 0] },
    { name: 'Angle', type: 'float', value: 45 },
    { name: 'Radius', type: 'float', value: 1 },
    { name: 'Height', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Position', type: 'float3' },
    { name: 'Direction', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const angleRad = inputs.Angle * Math.PI / 180;
    const theta = ctx.random() * Math.PI * 2;
    const r = Math.sqrt(ctx.random()) * inputs.Radius;
    const spreadAngle = ctx.random() * angleRad;
    
    return {
      Position: [
        inputs.Origin[0] + r * Math.cos(theta),
        inputs.Origin[1],
        inputs.Origin[2] + r * Math.sin(theta)
      ],
      Direction: [
        Math.sin(spreadAngle) * Math.cos(theta),
        Math.cos(spreadAngle),
        Math.sin(spreadAngle) * Math.sin(theta)
      ]
    };
  }
});

// Velocity
VFXNodeRegistry.register({
  type: 'velocity_random',
  category: 'Velocity',
  title: 'Random Velocity',
  description: 'Set random velocity',
  inputs: [
    { name: 'Min', type: 'float3', value: [-1, -1, -1] },
    { name: 'Max', type: 'float3', value: [1, 1, 1] }
  ],
  outputs: [
    { name: 'Velocity', type: 'float3' }
  ],
  compute: (inputs, ctx) => ({
    Velocity: [
      inputs.Min[0] + ctx.random() * (inputs.Max[0] - inputs.Min[0]),
      inputs.Min[1] + ctx.random() * (inputs.Max[1] - inputs.Min[1]),
      inputs.Min[2] + ctx.random() * (inputs.Max[2] - inputs.Min[2])
    ]
  })
});

VFXNodeRegistry.register({
  type: 'velocity_from_direction',
  category: 'Velocity',
  title: 'Velocity From Direction',
  description: 'Set velocity from direction',
  inputs: [
    { name: 'Direction', type: 'float3', value: [0, 1, 0] },
    { name: 'Speed', type: 'float', value: 5 }
  ],
  outputs: [
    { name: 'Velocity', type: 'float3' }
  ],
  compute: (inputs) => {
    const len = Math.sqrt(
      inputs.Direction[0] ** 2 +
      inputs.Direction[1] ** 2 +
      inputs.Direction[2] ** 2
    );
    const normalized = len > 0 ? inputs.Direction.map((d: number) => d / len) : [0, 1, 0];
    return {
      Velocity: normalized.map((d: number) => d * inputs.Speed)
    };
  }
});

// Forces
VFXNodeRegistry.register({
  type: 'force_gravity',
  category: 'Force',
  title: 'Gravity',
  description: 'Apply gravity force',
  inputs: [
    { name: 'Gravity', type: 'float3', value: [0, -9.81, 0] }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs) => ({ Force: inputs.Gravity })
});

VFXNodeRegistry.register({
  type: 'force_wind',
  category: 'Force',
  title: 'Wind',
  description: 'Apply wind force with turbulence',
  inputs: [
    { name: 'Direction', type: 'float3', value: [1, 0, 0] },
    { name: 'Strength', type: 'float', value: 2 },
    { name: 'Turbulence', type: 'float', value: 0.5 }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs, ctx) => ({
    Force: inputs.Direction.map((d: number) => 
      d * inputs.Strength * (1 + (ctx.random() - 0.5) * inputs.Turbulence)
    )
  })
});

VFXNodeRegistry.register({
  type: 'force_drag',
  category: 'Force',
  title: 'Drag',
  description: 'Apply drag force',
  inputs: [
    { name: 'Coefficient', type: 'float', value: 0.1 }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const vel = ctx.getAttribute('velocity') || [0, 0, 0];
    return {
      Force: vel.map((v: number) => -v * inputs.Coefficient)
    };
  }
});

VFXNodeRegistry.register({
  type: 'force_vortex',
  category: 'Force',
  title: 'Vortex',
  description: 'Apply vortex force',
  inputs: [
    { name: 'Center', type: 'float3', value: [0, 0, 0] },
    { name: 'Axis', type: 'float3', value: [0, 1, 0] },
    { name: 'Strength', type: 'float', value: 5 },
    { name: 'Pull', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Force', type: 'float3' }
  ],
  compute: (inputs, ctx) => {
    const pos = ctx.getAttribute('position') || [0, 0, 0];
    const toCenter = [
      inputs.Center[0] - pos[0],
      inputs.Center[1] - pos[1],
      inputs.Center[2] - pos[2]
    ];
    
    // Cross product with axis for tangent
    const tangent = [
      inputs.Axis[1] * toCenter[2] - inputs.Axis[2] * toCenter[1],
      inputs.Axis[2] * toCenter[0] - inputs.Axis[0] * toCenter[2],
      inputs.Axis[0] * toCenter[1] - inputs.Axis[1] * toCenter[0]
    ];
    
    return {
      Force: [
        tangent[0] * inputs.Strength + toCenter[0] * inputs.Pull,
        tangent[1] * inputs.Strength + toCenter[1] * inputs.Pull,
        tangent[2] * inputs.Strength + toCenter[2] * inputs.Pull
      ]
    };
  }
});

// Color
VFXNodeRegistry.register({
  type: 'color_constant',
  category: 'Color',
  title: 'Constant Color',
  description: 'Set constant color',
  inputs: [
    { name: 'Color', type: 'color', value: [1, 1, 1, 1] }
  ],
  outputs: [
    { name: 'Color', type: 'color' }
  ],
  compute: (inputs) => ({ Color: inputs.Color })
});

VFXNodeRegistry.register({
  type: 'color_over_life',
  category: 'Color',
  title: 'Color Over Life',
  description: 'Interpolate color over particle lifetime',
  inputs: [
    { name: 'Gradient', type: 'gradient', value: null }
  ],
  outputs: [
    { name: 'Color', type: 'color' }
  ],
  compute: (inputs, ctx) => {
    const life = ctx.getAttribute('normalizedAge') || 0;
    const gradient = inputs.Gradient;
    
    if (!gradient || gradient.length === 0) {
      return { Color: [1, 1, 1, 1] };
    }
    
    // Sample gradient
    for (let i = 0; i < gradient.length - 1; i++) {
      if (life >= gradient[i].position && life <= gradient[i + 1].position) {
        const t = (life - gradient[i].position) / (gradient[i + 1].position - gradient[i].position);
        return {
          Color: gradient[i].color.map((c: number, j: number) => 
            c + t * (gradient[i + 1].color[j] - c)
          )
        };
      }
    }
    
    return { Color: gradient[gradient.length - 1].color };
  }
});

// Size
VFXNodeRegistry.register({
  type: 'size_constant',
  category: 'Size',
  title: 'Constant Size',
  description: 'Set constant size',
  inputs: [
    { name: 'Size', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Size', type: 'float' }
  ],
  compute: (inputs) => ({ Size: inputs.Size })
});

VFXNodeRegistry.register({
  type: 'size_random',
  category: 'Size',
  title: 'Random Size',
  description: 'Set random size between min and max',
  inputs: [
    { name: 'Min', type: 'float', value: 0.5 },
    { name: 'Max', type: 'float', value: 1.5 }
  ],
  outputs: [
    { name: 'Size', type: 'float' }
  ],
  compute: (inputs, ctx) => ({
    Size: inputs.Min + ctx.random() * (inputs.Max - inputs.Min)
  })
});

VFXNodeRegistry.register({
  type: 'size_over_life',
  category: 'Size',
  title: 'Size Over Life',
  description: 'Animate size over particle lifetime',
  inputs: [
    { name: 'Curve', type: 'curve', value: null },
    { name: 'Scale', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Size', type: 'float' }
  ],
  compute: (inputs, ctx) => {
    const life = ctx.getAttribute('normalizedAge') || 0;
    const curve = inputs.Curve;
    
    // Sample curve (simple linear interpolation)
    let value = 1;
    if (curve && curve.length > 0) {
      for (let i = 0; i < curve.length - 1; i++) {
        if (life >= curve[i].time && life <= curve[i + 1].time) {
          const t = (life - curve[i].time) / (curve[i + 1].time - curve[i].time);
          value = curve[i].value + t * (curve[i + 1].value - curve[i].value);
          break;
        }
      }
    }
    
    return { Size: value * inputs.Scale };
  }
});

// Math
VFXNodeRegistry.register({
  type: 'math_add',
  category: 'Math',
  title: 'Add',
  description: 'Add two values',
  inputs: [
    { name: 'A', type: 'float', value: 0 },
    { name: 'B', type: 'float', value: 0 }
  ],
  outputs: [
    { name: 'Result', type: 'float' }
  ],
  compute: (inputs) => ({ Result: inputs.A + inputs.B }),
  glsl: 'float result = a + b;'
});

VFXNodeRegistry.register({
  type: 'math_multiply',
  category: 'Math',
  title: 'Multiply',
  description: 'Multiply two values',
  inputs: [
    { name: 'A', type: 'float', value: 1 },
    { name: 'B', type: 'float', value: 1 }
  ],
  outputs: [
    { name: 'Result', type: 'float' }
  ],
  compute: (inputs) => ({ Result: inputs.A * inputs.B }),
  glsl: 'float result = a * b;'
});

VFXNodeRegistry.register({
  type: 'math_lerp',
  category: 'Math',
  title: 'Lerp',
  description: 'Linear interpolation',
  inputs: [
    { name: 'A', type: 'float', value: 0 },
    { name: 'B', type: 'float', value: 1 },
    { name: 'T', type: 'float', value: 0.5 }
  ],
  outputs: [
    { name: 'Result', type: 'float' }
  ],
  compute: (inputs) => ({ Result: inputs.A + (inputs.B - inputs.A) * inputs.T }),
  glsl: 'float result = mix(a, b, t);'
});

VFXNodeRegistry.register({
  type: 'math_noise',
  category: 'Math',
  title: 'Noise',
  description: 'Generate noise value',
  inputs: [
    { name: 'Position', type: 'float3', value: [0, 0, 0] },
    { name: 'Frequency', type: 'float', value: 1 },
    { name: 'Octaves', type: 'int', value: 4 }
  ],
  outputs: [
    { name: 'Value', type: 'float' }
  ],
  compute: (inputs) => {
    // Simple FBM noise
    let value = 0;
    let amplitude = 1;
    let frequency = inputs.Frequency;
    let maxValue = 0;
    
    for (let i = 0; i < inputs.Octaves; i++) {
      // Simplified noise using sin
      value += amplitude * Math.sin(
        inputs.Position[0] * frequency + 
        inputs.Position[1] * frequency * 1.3 + 
        inputs.Position[2] * frequency * 0.7
      );
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return { Value: (value / maxValue + 1) * 0.5 };
  }
});

// Lifetime
VFXNodeRegistry.register({
  type: 'lifetime_constant',
  category: 'Lifetime',
  title: 'Constant Lifetime',
  description: 'Set constant particle lifetime',
  inputs: [
    { name: 'Lifetime', type: 'float', value: 2 }
  ],
  outputs: [
    { name: 'Lifetime', type: 'float' }
  ],
  compute: (inputs) => ({ Lifetime: inputs.Lifetime })
});

VFXNodeRegistry.register({
  type: 'lifetime_random',
  category: 'Lifetime',
  title: 'Random Lifetime',
  description: 'Set random particle lifetime',
  inputs: [
    { name: 'Min', type: 'float', value: 1 },
    { name: 'Max', type: 'float', value: 3 }
  ],
  outputs: [
    { name: 'Lifetime', type: 'float' }
  ],
  compute: (inputs, ctx) => ({
    Lifetime: inputs.Min + ctx.random() * (inputs.Max - inputs.Min)
  })
});

// Output
VFXNodeRegistry.register({
  type: 'output_particle',
  category: 'Output',
  title: 'Output Particle',
  description: 'Final particle output',
  inputs: [
    { name: 'Position', type: 'float3', value: [0, 0, 0] },
    { name: 'Velocity', type: 'float3', value: [0, 0, 0] },
    { name: 'Color', type: 'color', value: [1, 1, 1, 1] },
    { name: 'Size', type: 'float', value: 1 },
    { name: 'Lifetime', type: 'float', value: 2 },
    { name: 'Rotation', type: 'float', value: 0 }
  ],
  outputs: [],
  compute: (inputs, ctx) => {
    ctx.setAttribute('position', inputs.Position);
    ctx.setAttribute('velocity', inputs.Velocity);
    ctx.setAttribute('color', inputs.Color);
    ctx.setAttribute('size', inputs.Size);
    ctx.setAttribute('lifetime', inputs.Lifetime);
    ctx.setAttribute('rotation', inputs.Rotation);
    return {};
  }
});

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

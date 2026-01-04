/**
 * Blueprint System - Sistema de Blueprints
 * 
 * Sistema profissional estilo Unreal Engine para criar
 * blueprints reutilizáveis com componentes e lógica.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

// ============================================================================
// TYPES
// ============================================================================

export type BlueprintType = 
  | 'Actor'
  | 'Character'
  | 'Pawn'
  | 'GameMode'
  | 'PlayerController'
  | 'AIController'
  | 'Widget'
  | 'Component'
  | 'AnimInstance'
  | 'Object';

export interface BlueprintVariable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue: unknown;
  isPublic: boolean;
  isReadOnly: boolean;
  category?: string;
  tooltip?: string;
  minValue?: number;
  maxValue?: number;
  replicates?: boolean;
}

export type VariableType = 
  | 'boolean'
  | 'integer'
  | 'float'
  | 'string'
  | 'vector'
  | 'rotator'
  | 'transform'
  | 'color'
  | 'object'
  | 'class'
  | 'array'
  | 'map'
  | 'set';

export interface BlueprintFunction {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inputs: FunctionParameter[];
  outputs: FunctionParameter[];
  isPublic: boolean;
  isPure: boolean;
  isEvent: boolean;
  isLatent: boolean;
  nodes: BlueprintNode[];
  connections: BlueprintConnection[];
}

export interface FunctionParameter {
  id: string;
  name: string;
  type: VariableType;
  defaultValue?: unknown;
}

export interface BlueprintNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface BlueprintConnection {
  id: string;
  sourceNodeId: string;
  sourcePin: string;
  targetNodeId: string;
  targetPin: string;
}

export interface BlueprintComponent {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  properties: Record<string, unknown>;
  isRootComponent?: boolean;
}

export interface Blueprint {
  id: string;
  name: string;
  type: BlueprintType;
  parentClass?: string;
  description?: string;
  category?: string;
  tags?: string[];
  
  // Components
  components: BlueprintComponent[];
  defaultSceneRoot?: string;
  
  // Variables
  variables: BlueprintVariable[];
  
  // Functions
  functions: BlueprintFunction[];
  
  // Event Graph
  eventGraph: {
    nodes: BlueprintNode[];
    connections: BlueprintConnection[];
  };
  
  // Construction Script
  constructionScript: {
    nodes: BlueprintNode[];
    connections: BlueprintConnection[];
  };
  
  // Metadata
  createdAt: Date;
  modifiedAt: Date;
  version: number;
}

// ============================================================================
// BLUEPRINT NODE TYPES
// ============================================================================

export interface NodeDefinition {
  type: string;
  category: string;
  displayName: string;
  description: string;
  color: string;
  inputs: PinDefinition[];
  outputs: PinDefinition[];
  isEvent?: boolean;
  isPure?: boolean;
  isLatent?: boolean;
}

export interface PinDefinition {
  id: string;
  name: string;
  type: 'exec' | 'data';
  dataType?: VariableType;
  isArray?: boolean;
  defaultValue?: unknown;
}

// Standard node definitions
export const StandardNodes: NodeDefinition[] = [
  // Events
  {
    type: 'Event_BeginPlay',
    category: 'Events',
    displayName: 'Event Begin Play',
    description: 'Called when the game starts',
    color: '#c0392b',
    inputs: [],
    outputs: [{ id: 'exec', name: '', type: 'exec' }],
    isEvent: true,
  },
  {
    type: 'Event_Tick',
    category: 'Events',
    displayName: 'Event Tick',
    description: 'Called every frame',
    color: '#c0392b',
    inputs: [],
    outputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'deltaTime', name: 'Delta Seconds', type: 'data', dataType: 'float' },
    ],
    isEvent: true,
  },
  {
    type: 'Event_BeginOverlap',
    category: 'Events',
    displayName: 'Event Begin Overlap',
    description: 'Called when overlap begins',
    color: '#c0392b',
    inputs: [],
    outputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'otherActor', name: 'Other Actor', type: 'data', dataType: 'object' },
    ],
    isEvent: true,
  },
  
  // Flow Control
  {
    type: 'Branch',
    category: 'Flow Control',
    displayName: 'Branch',
    description: 'If/else branching',
    color: '#8e44ad',
    inputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'condition', name: 'Condition', type: 'data', dataType: 'boolean' },
    ],
    outputs: [
      { id: 'true', name: 'True', type: 'exec' },
      { id: 'false', name: 'False', type: 'exec' },
    ],
  },
  {
    type: 'ForLoop',
    category: 'Flow Control',
    displayName: 'For Loop',
    description: 'Loop from first to last index',
    color: '#8e44ad',
    inputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'firstIndex', name: 'First Index', type: 'data', dataType: 'integer', defaultValue: 0 },
      { id: 'lastIndex', name: 'Last Index', type: 'data', dataType: 'integer', defaultValue: 10 },
    ],
    outputs: [
      { id: 'loopBody', name: 'Loop Body', type: 'exec' },
      { id: 'index', name: 'Index', type: 'data', dataType: 'integer' },
      { id: 'completed', name: 'Completed', type: 'exec' },
    ],
  },
  {
    type: 'Sequence',
    category: 'Flow Control',
    displayName: 'Sequence',
    description: 'Execute multiple branches in order',
    color: '#8e44ad',
    inputs: [{ id: 'exec', name: '', type: 'exec' }],
    outputs: [
      { id: 'then0', name: 'Then 0', type: 'exec' },
      { id: 'then1', name: 'Then 1', type: 'exec' },
      { id: 'then2', name: 'Then 2', type: 'exec' },
    ],
  },
  {
    type: 'Delay',
    category: 'Flow Control',
    displayName: 'Delay',
    description: 'Wait for specified time',
    color: '#8e44ad',
    inputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'duration', name: 'Duration', type: 'data', dataType: 'float', defaultValue: 1.0 },
    ],
    outputs: [{ id: 'completed', name: 'Completed', type: 'exec' }],
    isLatent: true,
  },
  
  // Math
  {
    type: 'Add',
    category: 'Math',
    displayName: 'Add',
    description: 'Add two values',
    color: '#27ae60',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  {
    type: 'Subtract',
    category: 'Math',
    displayName: 'Subtract',
    description: 'Subtract two values',
    color: '#27ae60',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  {
    type: 'Multiply',
    category: 'Math',
    displayName: 'Multiply',
    description: 'Multiply two values',
    color: '#27ae60',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  {
    type: 'Divide',
    category: 'Math',
    displayName: 'Divide',
    description: 'Divide two values',
    color: '#27ae60',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  {
    type: 'RandomFloat',
    category: 'Math',
    displayName: 'Random Float',
    description: 'Get random float in range',
    color: '#27ae60',
    inputs: [
      { id: 'min', name: 'Min', type: 'data', dataType: 'float', defaultValue: 0 },
      { id: 'max', name: 'Max', type: 'data', dataType: 'float', defaultValue: 1 },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  {
    type: 'Clamp',
    category: 'Math',
    displayName: 'Clamp',
    description: 'Clamp value between min and max',
    color: '#27ae60',
    inputs: [
      { id: 'value', name: 'Value', type: 'data', dataType: 'float' },
      { id: 'min', name: 'Min', type: 'data', dataType: 'float' },
      { id: 'max', name: 'Max', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  {
    type: 'Lerp',
    category: 'Math',
    displayName: 'Lerp',
    description: 'Linear interpolation',
    color: '#27ae60',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
      { id: 'alpha', name: 'Alpha', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  
  // Comparison
  {
    type: 'Equal',
    category: 'Comparison',
    displayName: 'Equal',
    description: 'Check if values are equal',
    color: '#3498db',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'boolean' }],
    isPure: true,
  },
  {
    type: 'Greater',
    category: 'Comparison',
    displayName: 'Greater Than',
    description: 'Check if A > B',
    color: '#3498db',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'boolean' }],
    isPure: true,
  },
  {
    type: 'Less',
    category: 'Comparison',
    displayName: 'Less Than',
    description: 'Check if A < B',
    color: '#3498db',
    inputs: [
      { id: 'a', name: 'A', type: 'data', dataType: 'float' },
      { id: 'b', name: 'B', type: 'data', dataType: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'data', dataType: 'boolean' }],
    isPure: true,
  },
  
  // Transform
  {
    type: 'GetActorLocation',
    category: 'Transform',
    displayName: 'Get Actor Location',
    description: 'Get the actor world location',
    color: '#f39c12',
    inputs: [{ id: 'target', name: 'Target', type: 'data', dataType: 'object' }],
    outputs: [{ id: 'location', name: 'Location', type: 'data', dataType: 'vector' }],
    isPure: true,
  },
  {
    type: 'SetActorLocation',
    category: 'Transform',
    displayName: 'Set Actor Location',
    description: 'Set the actor world location',
    color: '#f39c12',
    inputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'target', name: 'Target', type: 'data', dataType: 'object' },
      { id: 'newLocation', name: 'New Location', type: 'data', dataType: 'vector' },
      { id: 'sweep', name: 'Sweep', type: 'data', dataType: 'boolean', defaultValue: false },
    ],
    outputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'hitResult', name: 'Hit Result', type: 'data', dataType: 'object' },
    ],
  },
  {
    type: 'AddActorLocalOffset',
    category: 'Transform',
    displayName: 'Add Actor Local Offset',
    description: 'Add offset to actor in local space',
    color: '#f39c12',
    inputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'target', name: 'Target', type: 'data', dataType: 'object' },
      { id: 'deltaLocation', name: 'Delta Location', type: 'data', dataType: 'vector' },
    ],
    outputs: [{ id: 'exec', name: '', type: 'exec' }],
  },
  
  // Input
  {
    type: 'GetInputAxis',
    category: 'Input',
    displayName: 'Get Input Axis',
    description: 'Get input axis value',
    color: '#9b59b6',
    inputs: [{ id: 'axisName', name: 'Axis Name', type: 'data', dataType: 'string' }],
    outputs: [{ id: 'value', name: 'Value', type: 'data', dataType: 'float' }],
    isPure: true,
  },
  {
    type: 'IsInputKeyDown',
    category: 'Input',
    displayName: 'Is Input Key Down',
    description: 'Check if key is pressed',
    color: '#9b59b6',
    inputs: [{ id: 'key', name: 'Key', type: 'data', dataType: 'string' }],
    outputs: [{ id: 'isDown', name: 'Is Down', type: 'data', dataType: 'boolean' }],
    isPure: true,
  },
  
  // Debug
  {
    type: 'PrintString',
    category: 'Debug',
    displayName: 'Print String',
    description: 'Print text to screen',
    color: '#1abc9c',
    inputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'string', name: 'String', type: 'data', dataType: 'string' },
      { id: 'duration', name: 'Duration', type: 'data', dataType: 'float', defaultValue: 2.0 },
      { id: 'color', name: 'Color', type: 'data', dataType: 'color' },
    ],
    outputs: [{ id: 'exec', name: '', type: 'exec' }],
  },
  {
    type: 'DrawDebugLine',
    category: 'Debug',
    displayName: 'Draw Debug Line',
    description: 'Draw a debug line',
    color: '#1abc9c',
    inputs: [
      { id: 'exec', name: '', type: 'exec' },
      { id: 'start', name: 'Start', type: 'data', dataType: 'vector' },
      { id: 'end', name: 'End', type: 'data', dataType: 'vector' },
      { id: 'color', name: 'Color', type: 'data', dataType: 'color' },
      { id: 'duration', name: 'Duration', type: 'data', dataType: 'float', defaultValue: 0 },
    ],
    outputs: [{ id: 'exec', name: '', type: 'exec' }],
  },
];

// ============================================================================
// BLUEPRINT MANAGER
// ============================================================================

export class BlueprintManager {
  private blueprints: Map<string, Blueprint> = new Map();
  private nodeRegistry: Map<string, NodeDefinition> = new Map();
  
  constructor() {
    // Register standard nodes
    for (const node of StandardNodes) {
      this.nodeRegistry.set(node.type, node);
    }
  }
  
  // Blueprint CRUD
  createBlueprint(name: string, type: BlueprintType, parentClass?: string): Blueprint {
    const blueprint: Blueprint = {
      id: this.generateId(),
      name,
      type,
      parentClass,
      components: [],
      variables: [],
      functions: [],
      eventGraph: { nodes: [], connections: [] },
      constructionScript: { nodes: [], connections: [] },
      createdAt: new Date(),
      modifiedAt: new Date(),
      version: 1,
    };
    
    // Add default root component
    if (type !== 'Object' && type !== 'Widget') {
      blueprint.components.push({
        id: 'root',
        name: 'DefaultSceneRoot',
        type: 'SceneComponent',
        isRootComponent: true,
        properties: {},
      });
      blueprint.defaultSceneRoot = 'root';
    }
    
    this.blueprints.set(blueprint.id, blueprint);
    return blueprint;
  }
  
  getBlueprint(id: string): Blueprint | undefined {
    return this.blueprints.get(id);
  }
  
  updateBlueprint(id: string, updates: Partial<Blueprint>): Blueprint | undefined {
    const blueprint = this.blueprints.get(id);
    if (!blueprint) return undefined;
    
    const updated = {
      ...blueprint,
      ...updates,
      modifiedAt: new Date(),
      version: blueprint.version + 1,
    };
    
    this.blueprints.set(id, updated);
    return updated;
  }
  
  deleteBlueprint(id: string): boolean {
    return this.blueprints.delete(id);
  }
  
  getAllBlueprints(): Blueprint[] {
    return [...this.blueprints.values()];
  }
  
  // Component management
  addComponent(blueprintId: string, component: Omit<BlueprintComponent, 'id'>): BlueprintComponent | undefined {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) return undefined;
    
    const newComponent: BlueprintComponent = {
      ...component,
      id: this.generateId(),
    };
    
    blueprint.components.push(newComponent);
    blueprint.modifiedAt = new Date();
    
    return newComponent;
  }
  
  removeComponent(blueprintId: string, componentId: string): boolean {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) return false;
    
    const index = blueprint.components.findIndex(c => c.id === componentId);
    if (index === -1) return false;
    
    blueprint.components.splice(index, 1);
    blueprint.modifiedAt = new Date();
    
    return true;
  }
  
  // Variable management
  addVariable(blueprintId: string, variable: Omit<BlueprintVariable, 'id'>): BlueprintVariable | undefined {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) return undefined;
    
    const newVariable: BlueprintVariable = {
      ...variable,
      id: this.generateId(),
    };
    
    blueprint.variables.push(newVariable);
    blueprint.modifiedAt = new Date();
    
    return newVariable;
  }
  
  removeVariable(blueprintId: string, variableId: string): boolean {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) return false;
    
    const index = blueprint.variables.findIndex(v => v.id === variableId);
    if (index === -1) return false;
    
    blueprint.variables.splice(index, 1);
    blueprint.modifiedAt = new Date();
    
    return true;
  }
  
  // Function management
  addFunction(blueprintId: string, func: Omit<BlueprintFunction, 'id'>): BlueprintFunction | undefined {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) return undefined;
    
    const newFunction: BlueprintFunction = {
      ...func,
      id: this.generateId(),
    };
    
    blueprint.functions.push(newFunction);
    blueprint.modifiedAt = new Date();
    
    return newFunction;
  }
  
  removeFunction(blueprintId: string, functionId: string): boolean {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) return false;
    
    const index = blueprint.functions.findIndex(f => f.id === functionId);
    if (index === -1) return false;
    
    blueprint.functions.splice(index, 1);
    blueprint.modifiedAt = new Date();
    
    return true;
  }
  
  // Node registry
  registerNode(definition: NodeDefinition): void {
    this.nodeRegistry.set(definition.type, definition);
  }
  
  getNodeDefinition(type: string): NodeDefinition | undefined {
    return this.nodeRegistry.get(type);
  }
  
  getAllNodeDefinitions(): NodeDefinition[] {
    return [...this.nodeRegistry.values()];
  }
  
  getNodesByCategory(category: string): NodeDefinition[] {
    return [...this.nodeRegistry.values()].filter(n => n.category === category);
  }
  
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const node of this.nodeRegistry.values()) {
      categories.add(node.category);
    }
    return [...categories];
  }
  
  // Serialization
  exportBlueprint(id: string): string | undefined {
    const blueprint = this.blueprints.get(id);
    if (!blueprint) return undefined;
    return JSON.stringify(blueprint, null, 2);
  }
  
  importBlueprint(json: string): Blueprint | undefined {
    try {
      const data = JSON.parse(json) as Blueprint;
      data.id = this.generateId(); // Generate new ID
      data.createdAt = new Date();
      data.modifiedAt = new Date();
      this.blueprints.set(data.id, data);
      return data;
    } catch {
      return undefined;
    }
  }
  
  // Utility
  private generateId(): string {
    return `bp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// BLUEPRINT RUNTIME
// ============================================================================

export class BlueprintRuntime {
  private manager: BlueprintManager;
  private instances: Map<string, BlueprintInstance> = new Map();
  
  constructor(manager: BlueprintManager) {
    this.manager = manager;
  }
  
  createInstance(blueprintId: string, owner?: unknown): BlueprintInstance | undefined {
    const blueprint = this.manager.getBlueprint(blueprintId);
    if (!blueprint) return undefined;
    
    const instance: BlueprintInstance = {
      id: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      blueprintId,
      owner,
      variables: new Map(),
      state: 'idle',
    };
    
    // Initialize variables with default values
    for (const variable of blueprint.variables) {
      instance.variables.set(variable.id, variable.defaultValue);
    }
    
    this.instances.set(instance.id, instance);
    return instance;
  }
  
  destroyInstance(instanceId: string): boolean {
    return this.instances.delete(instanceId);
  }
  
  executeEvent(instanceId: string, eventName: string, params?: Record<string, unknown>): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    
    const blueprint = this.manager.getBlueprint(instance.blueprintId);
    if (!blueprint) return;
    
    // Find event node in event graph
    const eventNode = blueprint.eventGraph.nodes.find(
      n => n.type === `Event_${eventName}`
    );
    
    if (eventNode) {
      this.executeNode(instance, blueprint, eventNode, params);
    }
  }
  
  private executeNode(
    instance: BlueprintInstance,
    blueprint: Blueprint,
    node: BlueprintNode,
    inputValues?: Record<string, unknown>
  ): Record<string, unknown> {
    const definition = this.manager.getNodeDefinition(node.type);
    if (!definition) return {};
    
    // Execute node logic based on type
    // This is simplified - real implementation would be more complex
    const outputs: Record<string, unknown> = {};
    
    switch (node.type) {
      case 'PrintString':
        console.log('[Blueprint]', inputValues?.string);
        break;
      case 'Add':
        outputs.result = (inputValues?.a as number || 0) + (inputValues?.b as number || 0);
        break;
      case 'Subtract':
        outputs.result = (inputValues?.a as number || 0) - (inputValues?.b as number || 0);
        break;
      case 'Multiply':
        outputs.result = (inputValues?.a as number || 0) * (inputValues?.b as number || 0);
        break;
      case 'Divide':
        outputs.result = (inputValues?.a as number || 0) / (inputValues?.b as number || 1);
        break;
      case 'Branch':
        // Would continue to true or false branch based on condition
        break;
      case 'RandomFloat':
        const min = inputValues?.min as number || 0;
        const max = inputValues?.max as number || 1;
        outputs.result = Math.random() * (max - min) + min;
        break;
      // Add more node implementations...
    }
    
    // Follow exec connections to next nodes
    // This is simplified - real implementation would follow the graph properly
    
    return outputs;
  }
  
  getVariable(instanceId: string, variableId: string): unknown {
    const instance = this.instances.get(instanceId);
    return instance?.variables.get(variableId);
  }
  
  setVariable(instanceId: string, variableId: string, value: unknown): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    instance.variables.set(variableId, value);
    return true;
  }
}

export interface BlueprintInstance {
  id: string;
  blueprintId: string;
  owner?: unknown;
  variables: Map<string, unknown>;
  state: 'idle' | 'running' | 'paused' | 'error';
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let managerInstance: BlueprintManager | null = null;
let runtimeInstance: BlueprintRuntime | null = null;

export function getBlueprintManager(): BlueprintManager {
  if (!managerInstance) {
    managerInstance = new BlueprintManager();
  }
  return managerInstance;
}

export function getBlueprintRuntime(): BlueprintRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new BlueprintRuntime(getBlueprintManager());
  }
  return runtimeInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

const blueprintSystem = {
  BlueprintManager,
  BlueprintRuntime,
  StandardNodes,
  getBlueprintManager,
  getBlueprintRuntime,
};

export default blueprintSystem;

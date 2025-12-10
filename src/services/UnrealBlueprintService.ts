import { EventBus } from './EventBus';

export interface Blueprint {
  id: string;
  name: string;
  path: string;
  type: 'Actor' | 'Component' | 'Interface' | 'Macro' | 'Function';
  parentClass?: string;
}

export interface BlueprintNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  inputs: string[];
  outputs: string[];
  properties: Record<string, any>;
}

export interface BlueprintConnection {
  id: string;
  fromNodeId: string;
  fromPinIndex: number;
  toNodeId: string;
  toPinIndex: number;
}

export interface BlueprintVariable {
  name: string;
  type: string;
  defaultValue?: any;
  isPublic: boolean;
  category?: string;
}

export interface BlueprintFunction {
  name: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ name: string; type: string }>;
  nodes: BlueprintNode[];
  connections: BlueprintConnection[];
}

export interface CompileResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class UnrealBlueprintService {
  private static instance: UnrealBlueprintService;
  private eventBus: EventBus;
  private blueprints: Map<string, Blueprint>;
  private nodes: Map<string, BlueprintNode[]>;
  private connections: Map<string, BlueprintConnection[]>;
  private variables: Map<string, BlueprintVariable[]>;
  private functions: Map<string, BlueprintFunction[]>;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.blueprints = new Map();
    this.nodes = new Map();
    this.connections = new Map();
    this.variables = new Map();
    this.functions = new Map();
    this.initializeMockData();
  }

  public static getInstance(): UnrealBlueprintService {
    if (!UnrealBlueprintService.instance) {
      UnrealBlueprintService.instance = new UnrealBlueprintService();
    }
    return UnrealBlueprintService.instance;
  }

  private initializeMockData(): void {
    const mockBlueprint: Blueprint = {
      id: 'bp_character',
      name: 'BP_Character',
      path: '/Game/Blueprints/BP_Character',
      type: 'Actor',
      parentClass: 'Character'
    };

    this.blueprints.set(mockBlueprint.id, mockBlueprint);

    const mockNodes: BlueprintNode[] = [
      {
        id: 'node_1',
        type: 'Event',
        name: 'BeginPlay',
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: ['Execute'],
        properties: {}
      },
      {
        id: 'node_2',
        type: 'Print',
        name: 'Print String',
        position: { x: 400, y: 100 },
        inputs: ['String'],
        outputs: ['Execute'],
        properties: { string: 'Hello World' }
      }
    ];

    this.nodes.set(mockBlueprint.id, mockNodes);

    const mockConnections: BlueprintConnection[] = [
      {
        id: 'conn_1',
        fromNodeId: 'node_1',
        fromPinIndex: 0,
        toNodeId: 'node_2',
        toPinIndex: 0
      }
    ];

    this.connections.set(mockBlueprint.id, mockConnections);

    const mockVariables: BlueprintVariable[] = [
      { name: 'Health', type: 'Float', defaultValue: 100, isPublic: true, category: 'Stats' },
      { name: 'MaxHealth', type: 'Float', defaultValue: 100, isPublic: true, category: 'Stats' },
      { name: 'Speed', type: 'Float', defaultValue: 600, isPublic: true, category: 'Movement' }
    ];

    this.variables.set(mockBlueprint.id, mockVariables);
  }

  public async getBlueprints(): Promise<Blueprint[]> {
    return Array.from(this.blueprints.values());
  }

  public async getBlueprint(id: string): Promise<Blueprint | null> {
    return this.blueprints.get(id) || null;
  }

  public async createBlueprint(blueprint: Blueprint): Promise<Blueprint> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.blueprints.set(blueprint.id, blueprint);
        this.nodes.set(blueprint.id, []);
        this.connections.set(blueprint.id, []);
        this.variables.set(blueprint.id, []);
        this.functions.set(blueprint.id, []);
        
        this.eventBus.emit('unreal:blueprintCreated', { blueprint });
        resolve(blueprint);
      }, 300);
    });
  }

  public async deleteBlueprint(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const deleted = this.blueprints.delete(id);
        if (deleted) {
          this.nodes.delete(id);
          this.connections.delete(id);
          this.variables.delete(id);
          this.functions.delete(id);
          this.eventBus.emit('unreal:blueprintDeleted', { id });
        }
        resolve(deleted);
      }, 300);
    });
  }

  public async getNodes(blueprintId: string): Promise<BlueprintNode[]> {
    return this.nodes.get(blueprintId) || [];
  }

  public async addNode(blueprintId: string, node: BlueprintNode): Promise<BlueprintNode> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const nodes = this.nodes.get(blueprintId) || [];
        nodes.push(node);
        this.nodes.set(blueprintId, nodes);
        
        this.eventBus.emit('unreal:nodeAdded', { blueprintId, node });
        resolve(node);
      }, 100);
    });
  }

  public async updateNode(blueprintId: string, nodeId: string, updates: Partial<BlueprintNode>): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const nodes = this.nodes.get(blueprintId);
        if (!nodes) {
          resolve(false);
          return;
        }

        const index = nodes.findIndex(n => n.id === nodeId);
        if (index === -1) {
          resolve(false);
          return;
        }

        nodes[index] = { ...nodes[index], ...updates };
        this.eventBus.emit('unreal:nodeUpdated', { blueprintId, nodeId, updates });
        resolve(true);
      }, 100);
    });
  }

  public async deleteNode(blueprintId: string, nodeId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const nodes = this.nodes.get(blueprintId);
        if (!nodes) {
          resolve(false);
          return;
        }

        const filtered = nodes.filter(n => n.id !== nodeId);
        this.nodes.set(blueprintId, filtered);

        const connections = this.connections.get(blueprintId) || [];
        const filteredConnections = connections.filter(c => 
          c.fromNodeId !== nodeId && c.toNodeId !== nodeId
        );
        this.connections.set(blueprintId, filteredConnections);

        this.eventBus.emit('unreal:nodeDeleted', { blueprintId, nodeId });
        resolve(true);
      }, 100);
    });
  }

  public async getConnections(blueprintId: string): Promise<BlueprintConnection[]> {
    return this.connections.get(blueprintId) || [];
  }

  public async addConnection(blueprintId: string, connection: BlueprintConnection): Promise<BlueprintConnection> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const connections = this.connections.get(blueprintId) || [];
        connections.push(connection);
        this.connections.set(blueprintId, connections);
        
        this.eventBus.emit('unreal:connectionAdded', { blueprintId, connection });
        resolve(connection);
      }, 100);
    });
  }

  public async deleteConnection(blueprintId: string, connectionId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const connections = this.connections.get(blueprintId);
        if (!connections) {
          resolve(false);
          return;
        }

        const filtered = connections.filter(c => c.id !== connectionId);
        this.connections.set(blueprintId, filtered);
        
        this.eventBus.emit('unreal:connectionDeleted', { blueprintId, connectionId });
        resolve(true);
      }, 100);
    });
  }

  public async getVariables(blueprintId: string): Promise<BlueprintVariable[]> {
    return this.variables.get(blueprintId) || [];
  }

  public async addVariable(blueprintId: string, variable: BlueprintVariable): Promise<BlueprintVariable> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const variables = this.variables.get(blueprintId) || [];
        variables.push(variable);
        this.variables.set(blueprintId, variables);
        
        this.eventBus.emit('unreal:variableAdded', { blueprintId, variable });
        resolve(variable);
      }, 100);
    });
  }

  public async updateVariable(blueprintId: string, name: string, updates: Partial<BlueprintVariable>): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const variables = this.variables.get(blueprintId);
        if (!variables) {
          resolve(false);
          return;
        }

        const index = variables.findIndex(v => v.name === name);
        if (index === -1) {
          resolve(false);
          return;
        }

        variables[index] = { ...variables[index], ...updates };
        this.eventBus.emit('unreal:variableUpdated', { blueprintId, name, updates });
        resolve(true);
      }, 100);
    });
  }

  public async deleteVariable(blueprintId: string, name: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const variables = this.variables.get(blueprintId);
        if (!variables) {
          resolve(false);
          return;
        }

        const filtered = variables.filter(v => v.name !== name);
        this.variables.set(blueprintId, filtered);
        
        this.eventBus.emit('unreal:variableDeleted', { blueprintId, name });
        resolve(true);
      }, 100);
    });
  }

  public async getFunctions(blueprintId: string): Promise<BlueprintFunction[]> {
    return this.functions.get(blueprintId) || [];
  }

  public async addFunction(blueprintId: string, func: BlueprintFunction): Promise<BlueprintFunction> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const functions = this.functions.get(blueprintId) || [];
        functions.push(func);
        this.functions.set(blueprintId, functions);
        
        this.eventBus.emit('unreal:functionAdded', { blueprintId, function: func });
        resolve(func);
      }, 100);
    });
  }

  public async compile(blueprintId: string): Promise<CompileResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const nodes = this.nodes.get(blueprintId) || [];
        const connections = this.connections.get(blueprintId) || [];

        const errors: string[] = [];
        const warnings: string[] = [];

        if (nodes.length === 0) {
          warnings.push('Blueprint has no nodes');
        }

        nodes.forEach(node => {
          if (node.inputs.length > 0) {
            const hasInputConnection = connections.some(c => c.toNodeId === node.id);
            if (!hasInputConnection && node.type !== 'Event') {
              warnings.push(`Node '${node.name}' has no input connections`);
            }
          }
        });

        const result: CompileResult = {
          success: errors.length === 0,
          errors,
          warnings
        };

        this.eventBus.emit('unreal:blueprintCompiled', { blueprintId, result });
        resolve(result);
      }, 1000);
    });
  }

  public async save(blueprintId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.eventBus.emit('unreal:blueprintSaved', { blueprintId });
        resolve(true);
      }, 500);
    });
  }
}

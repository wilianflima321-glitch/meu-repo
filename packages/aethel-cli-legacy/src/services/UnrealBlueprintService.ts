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

  private providerNotConfiguredError(): Error {
    return new Error(
      'UNREAL_BLUEPRINT_PROVIDER_NOT_CONFIGURED: Este projeto ainda não possui integração real com Blueprints do Unreal. '
      + 'Implemente um provider (ex.: Editor bridge/backend) e conecte este serviço.'
    );
  }

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.blueprints = new Map();
    this.nodes = new Map();
    this.connections = new Map();
    this.variables = new Map();
    this.functions = new Map();
    // real-or-fail: não inicializa dados mock
  }

  public static getInstance(): UnrealBlueprintService {
    if (!UnrealBlueprintService.instance) {
      UnrealBlueprintService.instance = new UnrealBlueprintService();
    }
    return UnrealBlueprintService.instance;
  }

  public async getBlueprints(): Promise<Blueprint[]> {
    throw this.providerNotConfiguredError();
  }

  public async getBlueprint(id: string): Promise<Blueprint | null> {
    void id;
    throw this.providerNotConfiguredError();
  }

  public async createBlueprint(blueprint: Blueprint): Promise<Blueprint> {
    void blueprint;
    throw this.providerNotConfiguredError();
  }

  public async deleteBlueprint(id: string): Promise<boolean> {
    void id;
    throw this.providerNotConfiguredError();
  }

  public async getNodes(blueprintId: string): Promise<BlueprintNode[]> {
    void blueprintId;
    throw this.providerNotConfiguredError();
  }

  public async addNode(blueprintId: string, node: BlueprintNode): Promise<BlueprintNode> {
    void blueprintId;
    void node;
    throw this.providerNotConfiguredError();
  }

  public async updateNode(blueprintId: string, nodeId: string, updates: Partial<BlueprintNode>): Promise<boolean> {
    void blueprintId;
    void nodeId;
    void updates;
    throw this.providerNotConfiguredError();
  }

  public async deleteNode(blueprintId: string, nodeId: string): Promise<boolean> {
    void blueprintId;
    void nodeId;
    throw this.providerNotConfiguredError();
  }

  public async getConnections(blueprintId: string): Promise<BlueprintConnection[]> {
    void blueprintId;
    throw this.providerNotConfiguredError();
  }

  public async addConnection(blueprintId: string, connection: BlueprintConnection): Promise<BlueprintConnection> {
    void blueprintId;
    void connection;
    throw this.providerNotConfiguredError();
  }

  public async deleteConnection(blueprintId: string, connectionId: string): Promise<boolean> {
    void blueprintId;
    void connectionId;
    throw this.providerNotConfiguredError();
  }

  public async getVariables(blueprintId: string): Promise<BlueprintVariable[]> {
    void blueprintId;
    throw this.providerNotConfiguredError();
  }

  public async addVariable(blueprintId: string, variable: BlueprintVariable): Promise<BlueprintVariable> {
    void blueprintId;
    void variable;
    throw this.providerNotConfiguredError();
  }

  public async updateVariable(blueprintId: string, name: string, updates: Partial<BlueprintVariable>): Promise<boolean> {
    void blueprintId;
    void name;
    void updates;
    throw this.providerNotConfiguredError();
  }

  public async deleteVariable(blueprintId: string, name: string): Promise<boolean> {
    void blueprintId;
    void name;
    throw this.providerNotConfiguredError();
  }

  public async getFunctions(blueprintId: string): Promise<BlueprintFunction[]> {
    void blueprintId;
    throw this.providerNotConfiguredError();
  }

  public async addFunction(blueprintId: string, func: BlueprintFunction): Promise<BlueprintFunction> {
    void blueprintId;
    void func;
    throw this.providerNotConfiguredError();
  }

  public async compile(blueprintId: string): Promise<CompileResult> {
    void blueprintId;
    throw this.providerNotConfiguredError();
  }

  public async save(blueprintId: string): Promise<boolean> {
    void blueprintId;
    throw this.providerNotConfiguredError();
  }
}

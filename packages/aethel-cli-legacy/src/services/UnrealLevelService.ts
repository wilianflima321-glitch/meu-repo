import { EventBus } from './EventBus';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  location: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

export interface Actor {
  id: string;
  name: string;
  type: string;
  transform: Transform;
  properties: Record<string, any>;
}

export interface Level {
  id: string;
  name: string;
  path: string;
}

export interface BuildResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class UnrealLevelService {
  private static instance: UnrealLevelService;
  private eventBus: EventBus;
  private levels: Map<string, Level>;
  private actors: Map<string, Actor[]>;

  private providerNotConfiguredError(): Error {
    return new Error(
      'UNREAL_LEVEL_PROVIDER_NOT_CONFIGURED: Este projeto ainda não possui integração real com Levels/Actors do Unreal. '
      + 'Implemente um provider (ex.: Editor bridge/backend) e conecte este serviço.'
    );
  }

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.levels = new Map();
    this.actors = new Map();
    // real-or-fail: não inicializa dados mock
  }

  public static getInstance(): UnrealLevelService {
    if (!UnrealLevelService.instance) {
      UnrealLevelService.instance = new UnrealLevelService();
    }
    return UnrealLevelService.instance;
  }

  public async getLevels(): Promise<Level[]> {
    throw this.providerNotConfiguredError();
  }

  public async getLevel(id: string): Promise<Level | null> {
    void id;
    throw this.providerNotConfiguredError();
  }

  public async createLevel(level: Level): Promise<Level> {
    void level;
    throw this.providerNotConfiguredError();
  }

  public async deleteLevel(id: string): Promise<boolean> {
    void id;
    throw this.providerNotConfiguredError();
  }

  public async getActors(levelId: string): Promise<Actor[]> {
    void levelId;
    throw this.providerNotConfiguredError();
  }

  public async addActor(levelId: string, actor: Actor): Promise<Actor> {
    void levelId;
    void actor;
    throw this.providerNotConfiguredError();
  }

  public async updateActor(levelId: string, actorId: string, updates: Partial<Actor>): Promise<boolean> {
    void levelId;
    void actorId;
    void updates;
    throw this.providerNotConfiguredError();
  }

  public async deleteActor(levelId: string, actorId: string): Promise<boolean> {
    void levelId;
    void actorId;
    throw this.providerNotConfiguredError();
  }

  public async buildLighting(levelId: string): Promise<BuildResult> {
    void levelId;
    throw this.providerNotConfiguredError();
  }

  public async playInEditor(levelId: string): Promise<boolean> {
    void levelId;
    throw this.providerNotConfiguredError();
  }

  public async save(levelId: string): Promise<boolean> {
    void levelId;
    throw this.providerNotConfiguredError();
  }
}

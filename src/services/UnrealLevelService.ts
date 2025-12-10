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

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.levels = new Map();
    this.actors = new Map();
    this.initializeMockData();
  }

  public static getInstance(): UnrealLevelService {
    if (!UnrealLevelService.instance) {
      UnrealLevelService.instance = new UnrealLevelService();
    }
    return UnrealLevelService.instance;
  }

  private initializeMockData(): void {
    const mockLevel: Level = {
      id: 'level_main',
      name: 'MainLevel',
      path: '/Game/Maps/MainLevel'
    };

    this.levels.set(mockLevel.id, mockLevel);

    const mockActors: Actor[] = [
      {
        id: 'actor_1',
        name: 'Floor',
        type: 'StaticMesh',
        transform: {
          location: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 10, y: 10, z: 1 }
        },
        properties: { mesh: 'Cube' }
      },
      {
        id: 'actor_2',
        name: 'DirectionalLight',
        type: 'Light',
        transform: {
          location: { x: 0, y: 0, z: 500 },
          rotation: { x: -45, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        properties: { intensity: 5, color: '#ffffff' }
      },
      {
        id: 'actor_3',
        name: 'PlayerStart',
        type: 'PlayerStart',
        transform: {
          location: { x: 0, y: 0, z: 100 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        properties: {}
      }
    ];

    this.actors.set(mockLevel.id, mockActors);
  }

  public async getLevels(): Promise<Level[]> {
    return Array.from(this.levels.values());
  }

  public async getLevel(id: string): Promise<Level | null> {
    return this.levels.get(id) || null;
  }

  public async createLevel(level: Level): Promise<Level> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.levels.set(level.id, level);
        this.actors.set(level.id, []);
        this.eventBus.emit('unreal:levelCreated', { level });
        resolve(level);
      }, 300);
    });
  }

  public async deleteLevel(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const deleted = this.levels.delete(id);
        if (deleted) {
          this.actors.delete(id);
          this.eventBus.emit('unreal:levelDeleted', { id });
        }
        resolve(deleted);
      }, 300);
    });
  }

  public async getActors(levelId: string): Promise<Actor[]> {
    return this.actors.get(levelId) || [];
  }

  public async addActor(levelId: string, actor: Actor): Promise<Actor> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const actors = this.actors.get(levelId) || [];
        actors.push(actor);
        this.actors.set(levelId, actors);
        this.eventBus.emit('unreal:actorAdded', { levelId, actor });
        resolve(actor);
      }, 100);
    });
  }

  public async updateActor(levelId: string, actorId: string, updates: Partial<Actor>): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const actors = this.actors.get(levelId);
        if (!actors) {
          resolve(false);
          return;
        }

        const index = actors.findIndex(a => a.id === actorId);
        if (index === -1) {
          resolve(false);
          return;
        }

        actors[index] = { ...actors[index], ...updates };
        this.eventBus.emit('unreal:actorUpdated', { levelId, actorId, updates });
        resolve(true);
      }, 100);
    });
  }

  public async deleteActor(levelId: string, actorId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const actors = this.actors.get(levelId);
        if (!actors) {
          resolve(false);
          return;
        }

        const filtered = actors.filter(a => a.id !== actorId);
        this.actors.set(levelId, filtered);
        this.eventBus.emit('unreal:actorDeleted', { levelId, actorId });
        resolve(true);
      }, 100);
    });
  }

  public async buildLighting(levelId: string): Promise<BuildResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const actors = this.actors.get(levelId) || [];
        const errors: string[] = [];
        const warnings: string[] = [];

        const lights = actors.filter(a => a.type === 'Light');
        if (lights.length === 0) {
          warnings.push('No lights in level');
        }

        const result: BuildResult = {
          success: errors.length === 0,
          errors,
          warnings
        };

        this.eventBus.emit('unreal:lightingBuilt', { levelId, result });
        resolve(result);
      }, 2000);
    });
  }

  public async playInEditor(levelId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.eventBus.emit('unreal:playInEditor', { levelId });
        resolve(true);
      }, 500);
    });
  }

  public async save(levelId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.eventBus.emit('unreal:levelSaved', { levelId });
        resolve(true);
      }, 500);
    });
  }
}

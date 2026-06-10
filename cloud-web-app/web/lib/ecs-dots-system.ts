/**
 * ENTITY COMPONENT SYSTEM (ECS/DOTS) - Aethel Engine
 *
 * Sistema de entidades de alta performance inspirado em Unity DOTS e Unreal Mass.
 * Arquitetura data-oriented para máximo aproveitamento de cache.
 *
 * FEATURES:
 * - Archetype-based storage
 * - Sparse set for entity lookup
 * - Query system eficiente
 * - System scheduling
 * - Job system para paralelização
 * - Change detection
 * - Structural changes batching
 * - World serialization
 */

// ============================================================================
// TYPES
// ============================================================================

import type {
  Archetype,
  ComponentField,
  ComponentSchema,
  ComponentType,
  Entity,
  Query,
  SystemId,
  WorldConfig,
} from './ecs-dots-contracts';
export type {
  Archetype,
  ComponentField,
  ComponentSchema,
  ComponentType,
  Entity,
  Query,
  SystemId,
  WorldConfig,
} from './ecs-dots-contracts';
import { ArchetypeStorage } from './ecs-dots-archetype-storage';
import { SystemScheduler, type SystemConfig } from './ecs-dots-scheduler';
export type { SystemConfig } from './ecs-dots-scheduler';

// ============================================================================
// COMPONENT REGISTRY
// ============================================================================
import { ComponentRegistry } from './ecs-dots-registry';
import { ComponentDataView } from './ecs-dots-data-view';
export { ComponentDataView } from './ecs-dots-data-view';
export { ComponentRegistry } from './ecs-dots-registry';
export { registerCommonComponents } from './ecs-dots-common-components';
export type { RenderData, TransformData, VelocityData } from './ecs-dots-common-components';


// ============================================================================
// ARCHETYPE
// ============================================================================

export { ArchetypeStorage } from './ecs-dots-archetype-storage';

// ============================================================================
// COMPONENT DATA ACCESSOR
// ============================================================================

export { SystemScheduler } from './ecs-dots-scheduler';

// ============================================================================
// JOB SYSTEM (Web Workers)
// ============================================================================

export class JobSystem {
  private workers: Worker[] = [];
  private workerCount: number;
  private pendingJobs: Map<number, { resolve: (result: unknown) => void; reject: (err: Error) => void }> = new Map();
  private nextJobId: number = 0;
  private availableWorkers: Worker[] = [];

  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    this.workerCount = workerCount;
  }

  initialize(): void {
    // Criar worker inline
    const workerCode = `
      self.onmessage = function(e) {
        const { jobId, fn, data } = e.data;
        try {
          // Executar função serializada
          const result = new Function('data', fn)(data);
          self.postMessage({ jobId, result, error: null });
        } catch (error) {
          self.postMessage({ jobId, result: null, error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(workerUrl);
      worker.onmessage = (e) => this.handleWorkerMessage(e);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Executa um job em um worker
   */
  async schedule<T>(fn: (data: unknown) => T, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const jobId = this.nextJobId++;
      this.pendingJobs.set(jobId, { resolve: resolve as (r: unknown) => void, reject });

      // Aguardar worker disponível
      const trySchedule = () => {
        if (this.availableWorkers.length > 0) {
          const worker = this.availableWorkers.pop()!;
          worker.postMessage({
            jobId,
            fn: fn.toString(),
            data,
          });
        } else {
          // Tentar novamente em breve
          setTimeout(trySchedule, 1);
        }
      };

      trySchedule();
    });
  }

  /**
   * Executa jobs em paralelo
   */
  async parallel<T>(jobs: Array<{ fn: (data: unknown) => T; data: unknown }>): Promise<T[]> {
    return Promise.all(jobs.map(job => this.schedule(job.fn, job.data)));
  }

  private handleWorkerMessage(e: MessageEvent): void {
    const { jobId, result, error } = e.data;
    const job = this.pendingJobs.get(jobId);

    if (job) {
      this.pendingJobs.delete(jobId);

      // Devolver worker para pool
      const workerIndex = this.workers.findIndex(w => w === e.target);
      if (workerIndex !== -1) {
        this.availableWorkers.push(this.workers[workerIndex]);
      }

      if (error) {
        job.reject(new Error(error));
      } else {
        job.resolve(result);
      }
    }
  }

  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.availableWorkers = [];
  }
}

// ============================================================================
// WORLD
// ============================================================================

export class World {
  private registry: ComponentRegistry;
  private storage: ArchetypeStorage;
  private scheduler: SystemScheduler;
  private jobSystem: JobSystem;

  private nextEntityId: Entity = 0;
  private freeEntities: Entity[] = [];
  private entityVersions: Uint32Array;
  private maxEntities: number;

  private pendingAdditions: Array<{ entity: Entity; components: ComponentType[] }> = [];
  private pendingRemovals: Entity[] = [];

  private changeDetectionEnabled: boolean;
  private changedEntities: Set<Entity> = new Set();

  constructor(config: WorldConfig = {}) {
    this.maxEntities = config.maxEntities ?? 100000;
    this.changeDetectionEnabled = config.enableChangeDetection ?? true;

    this.registry = new ComponentRegistry();
    this.storage = new ArchetypeStorage(this.registry, config.initialCapacity ?? 1024);
    this.scheduler = new SystemScheduler();
    this.jobSystem = new JobSystem();

    this.entityVersions = new Uint32Array(this.maxEntities);

    // Inicializar job system
    this.jobSystem.initialize();
  }

  // === COMPONENT REGISTRATION ===

  registerComponent<T extends object>(name: string, fields: Omit<ComponentField, 'offset' | 'size'>[]): ComponentType {
    return this.registry.register<T>(name, fields);
  }

  // === ENTITY LIFECYCLE ===

  createEntity(): Entity {
    let entity: Entity;

    if (this.freeEntities.length > 0) {
      entity = this.freeEntities.pop()!;
      this.entityVersions[entity]++;
    } else {
      entity = this.nextEntityId++;
      if (entity >= this.maxEntities) {
        throw new Error('Maximum entity count reached');
      }
    }

    return entity;
  }

  destroyEntity(entity: Entity): void {
    this.pendingRemovals.push(entity);
  }

  isEntityValid(entity: Entity): boolean {
    return entity < this.nextEntityId && !this.freeEntities.includes(entity);
  }

  // === COMPONENT OPERATIONS ===

  addComponent(entity: Entity, componentType: ComponentType): void {
    const archetype = this.storage.getEntityArchetype(entity);
    const currentTypes = archetype ? Array.from(archetype.componentTypes) : [];

    if (!currentTypes.includes(componentType)) {
      const newTypes = [...currentTypes, componentType];
      this.storage.moveEntity(entity, newTypes);
      this.markChanged(entity);
    }
  }

  removeComponent(entity: Entity, componentType: ComponentType): void {
    const archetype = this.storage.getEntityArchetype(entity);
    if (!archetype) return;

    const newTypes = Array.from(archetype.componentTypes).filter(t => t !== componentType);
    this.storage.moveEntity(entity, newTypes);
    this.markChanged(entity);
  }

  hasComponent(entity: Entity, componentType: ComponentType): boolean {
    const archetype = this.storage.getEntityArchetype(entity);
    return archetype?.componentTypes.has(componentType) ?? false;
  }

  getComponent<T extends object>(entity: Entity, componentType: ComponentType): ComponentDataView<T> | null {
    const archetype = this.storage.getEntityArchetype(entity);
    if (!archetype || !archetype.componentTypes.has(componentType)) return null;

    const buffer = archetype.componentArrays.get(componentType)!;
    const schema = this.registry.getSchema(componentType)!;
    const index = this.storage.getEntityIndex(entity)!;

    return new ComponentDataView<T>(buffer, schema, index);
  }

  setComponentData<T extends object>(entity: Entity, componentType: ComponentType, data: Partial<T>): void {
    const view = this.getComponent<T>(entity, componentType);
    if (!view) return;

    for (const [key, value] of Object.entries(data)) {
      view.set(key as keyof T, value as T[keyof T]);
    }

    this.markChanged(entity);
  }

  // === QUERIES ===

  query(query: Query): Entity[] {
    const archetypes = this.storage.queryArchetypes(query);
    const entities: Entity[] = [];

    for (const archetype of archetypes) {
      for (let i = 0; i < archetype.entityCount; i++) {
        entities.push(archetype.entityIds[i]);
      }
    }

    return entities;
  }

  /**
   * Query com callback para cada entidade (mais eficiente)
   */
  forEach(query: Query, callback: (entity: Entity, archetype: Archetype, index: number) => void): void {
    const archetypes = this.storage.queryArchetypes(query);

    for (const archetype of archetypes) {
      for (let i = 0; i < archetype.entityCount; i++) {
        callback(archetype.entityIds[i], archetype, i);
      }
    }
  }

  /**
   * Query com acesso direto aos arrays de componentes (mais eficiente para processamento em batch)
   */
  forEachChunk(
    query: Query,
    callback: (entities: Entity[], count: number, components: Map<ComponentType, ArrayBuffer>) => void
  ): void {
    const archetypes = this.storage.queryArchetypes(query);

    for (const archetype of archetypes) {
      callback(archetype.entityIds, archetype.entityCount, archetype.componentArrays);
    }
  }

  // === SYSTEMS ===

  registerSystem(config: SystemConfig): void {
    this.scheduler.registerSystem(config);
  }

  unregisterSystem(id: SystemId): boolean {
    return this.scheduler.unregisterSystem(id);
  }

  enableSystem(id: SystemId, enabled: boolean): void {
    this.scheduler.enableSystem(id, enabled);
  }

  // === UPDATE LOOP ===

  update(deltaTime: number): void {
    // Processar mudanças estruturais pendentes
    this.processStructuralChanges();

    // Executar sistemas
    const systems = this.scheduler.getSystems();

    for (const system of systems) {
      const entities = this.query(system.query);
      system.update(this, entities, deltaTime);
    }

    // Limpar change detection
    if (this.changeDetectionEnabled) {
      this.changedEntities.clear();
    }
  }

  private processStructuralChanges(): void {
    // Processar adições
    for (const { entity, components } of this.pendingAdditions) {
      this.storage.getOrCreateArchetype(components);
      for (const comp of components) {
        this.addComponent(entity, comp);
      }
    }
    this.pendingAdditions = [];

    // Processar remoções
    for (const entity of this.pendingRemovals) {
      this.storage.removeEntity(entity);
      this.freeEntities.push(entity);
    }
    this.pendingRemovals = [];
  }

  // === CHANGE DETECTION ===

  private markChanged(entity: Entity): void {
    if (this.changeDetectionEnabled) {
      this.changedEntities.add(entity);
    }
  }

  hasChanged(entity: Entity): boolean {
    return this.changedEntities.has(entity);
  }

  getChangedEntities(): Entity[] {
    return Array.from(this.changedEntities);
  }

  // === SERIALIZATION ===

  serialize(): ArrayBuffer {
    // Serializar mundo para formato binário
    const encoder = new TextEncoder();
    const json = JSON.stringify({
      entities: Array.from(this.storage.getAllArchetypes()).map(arch => ({
        components: Array.from(arch.componentTypes),
        entityCount: arch.entityCount,
        entityIds: Array.from(arch.entityIds.slice(0, arch.entityCount)),
        // Dados dos componentes seriam serializados aqui
      })),
      nextEntityId: this.nextEntityId,
      freeEntities: this.freeEntities,
    });

    return encoder.encode(json).buffer;
  }

  deserialize(buffer: ArrayBuffer): void {
    const decoder = new TextDecoder();
    const json = JSON.parse(decoder.decode(buffer));

    this.nextEntityId = json.nextEntityId;
    this.freeEntities = json.freeEntities;

    // Reconstruir archetypes e entidades
    // (implementação simplificada)
  }

  // === UTILITIES ===

  getEntityCount(): number {
    let count = 0;
    for (const arch of this.storage.getAllArchetypes()) {
      count += arch.entityCount;
    }
    return count;
  }

  getArchetypeCount(): number {
    return this.storage.getAllArchetypes().length;
  }

  getRegistry(): ComponentRegistry {
    return this.registry;
  }

  dispose(): void {
    this.jobSystem.dispose();
  }
}

// ============================================================================
// COMMON COMPONENTS
// ============================================================================
export const createWorld = (config?: WorldConfig): World => {
  return new World(config);
};

export const createJobSystem = (workerCount?: number): JobSystem => {
  const js = new JobSystem(workerCount);
  js.initialize();
  return js;
};

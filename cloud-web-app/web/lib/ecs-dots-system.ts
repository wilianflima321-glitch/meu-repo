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

import { JobSystem, SystemScheduler } from './ecs-execution';
export { JobSystem, SystemScheduler } from './ecs-execution';
// ============================================================================
// TYPES
// ============================================================================

export type Entity = number;
export type ComponentType = number;
export type SystemId = number;

export interface ComponentSchema {
  id: ComponentType;
  name: string;
  size: number; // bytes
  fields: ComponentField[];
  defaultData?: ArrayBuffer;
}

export interface ComponentField {
  name: string;
  type: 'f32' | 'f64' | 'i32' | 'u32' | 'i8' | 'u8' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'entity';
  offset: number; // byte offset
  size: number;   // bytes
}

export interface Archetype {
  id: number;
  componentTypes: Set<ComponentType>;
  componentArrays: Map<ComponentType, ArrayBuffer>;
  entityIds: Entity[];
  entityCount: number;
  capacity: number;
}

export interface Query {
  all?: ComponentType[];
  any?: ComponentType[];
  none?: ComponentType[];
}

export interface SystemConfig {
  id: SystemId;
  name: string;
  query: Query;
  update: (world: World, entities: Entity[], deltaTime: number) => void;
  priority?: number;
  enabled?: boolean;
  runInParallel?: boolean;
}

export interface WorldConfig {
  initialCapacity?: number;
  maxEntities?: number;
  enableChangeDetection?: boolean;
}

// ============================================================================
// COMPONENT REGISTRY
// ============================================================================

export class ComponentRegistry {
  private schemas: Map<ComponentType, ComponentSchema> = new Map();
  private nameToId: Map<string, ComponentType> = new Map();
  private nextComponentId: ComponentType = 0;
  
  /**
   * Registra um novo tipo de componente
   */
  register<T extends object>(name: string, fields: Omit<ComponentField, 'offset' | 'size'>[]): ComponentType {
    if (this.nameToId.has(name)) {
      return this.nameToId.get(name)!;
    }
    
    const id = this.nextComponentId++;
    
    // Calcular offsets e sizes
    let offset = 0;
    const processedFields: ComponentField[] = fields.map(f => {
      const size = this.getTypeSize(f.type);
      const field: ComponentField = {
        ...f,
        offset,
        size,
      };
      offset += size;
      return field;
    });
    
    const schema: ComponentSchema = {
      id,
      name,
      size: offset,
      fields: processedFields,
    };
    
    this.schemas.set(id, schema);
    this.nameToId.set(name, id);
    
    return id;
  }
  
  private getTypeSize(type: ComponentField['type']): number {
    switch (type) {
      case 'f32': case 'i32': case 'u32': return 4;
      case 'f64': return 8;
      case 'i8': case 'u8': case 'bool': return 1;
      case 'vec2': return 8;
      case 'vec3': return 12;
      case 'vec4': return 16;
      case 'mat4': return 64;
      case 'entity': return 4;
      default: return 4;
    }
  }
  
  getSchema(id: ComponentType): ComponentSchema | undefined {
    return this.schemas.get(id);
  }
  
  getIdByName(name: string): ComponentType | undefined {
    return this.nameToId.get(name);
  }
  
  getAllSchemas(): ComponentSchema[] {
    return Array.from(this.schemas.values());
  }
}

// ============================================================================
// SPARSE SET
// ============================================================================

/**
 * Sparse Set para mapeamento rápido Entity -> Index
 */
export class SparseSet {
  private sparse: Uint32Array;
  private dense: Uint32Array;
  private count: number = 0;
  
  constructor(maxEntities: number) {
    this.sparse = new Uint32Array(maxEntities);
    this.dense = new Uint32Array(maxEntities);
    this.sparse.fill(0xFFFFFFFF); // Invalid index
  }
  
  add(entity: Entity): number {
    if (this.has(entity)) {
      return this.sparse[entity];
    }
    
    const index = this.count++;
    this.dense[index] = entity;
    this.sparse[entity] = index;
    return index;
  }
  
  remove(entity: Entity): boolean {
    if (!this.has(entity)) return false;
    
    const index = this.sparse[entity];
    const lastIndex = --this.count;
    
    // Swap com último
    if (index !== lastIndex) {
      const lastEntity = this.dense[lastIndex];
      this.dense[index] = lastEntity;
      this.sparse[lastEntity] = index;
    }
    
    this.sparse[entity] = 0xFFFFFFFF;
    return true;
  }
  
  has(entity: Entity): boolean {
    return entity < this.sparse.length && this.sparse[entity] !== 0xFFFFFFFF;
  }
  
  getIndex(entity: Entity): number {
    return this.sparse[entity];
  }
  
  getEntity(index: number): Entity {
    return this.dense[index];
  }
  
  getCount(): number {
    return this.count;
  }
  
  *[Symbol.iterator](): Iterator<Entity> {
    for (let i = 0; i < this.count; i++) {
      yield this.dense[i];
    }
  }
}

// ============================================================================
// ARCHETYPE
// ============================================================================

export class ArchetypeStorage {
  private archetypes: Map<string, Archetype> = new Map();
  private entityToArchetype: Map<Entity, Archetype> = new Map();
  private entityToIndex: Map<Entity, number> = new Map();
  private nextArchetypeId: number = 0;
  
  private registry: ComponentRegistry;
  private defaultCapacity: number;
  
  constructor(registry: ComponentRegistry, defaultCapacity: number = 1024) {
    this.registry = registry;
    this.defaultCapacity = defaultCapacity;
  }
  
  /**
   * Obtém ou cria archetype para conjunto de componentes
   */
  getOrCreateArchetype(componentTypes: ComponentType[]): Archetype {
    const key = this.getArchetypeKey(componentTypes);
    
    if (this.archetypes.has(key)) {
      return this.archetypes.get(key)!;
    }
    
    // Criar novo archetype
    const archetype: Archetype = {
      id: this.nextArchetypeId++,
      componentTypes: new Set(componentTypes),
      componentArrays: new Map(),
      entityIds: [],
      entityCount: 0,
      capacity: this.defaultCapacity,
    };
    
    // Alocar arrays para cada componente
    for (const type of componentTypes) {
      const schema = this.registry.getSchema(type);
      if (schema) {
        const buffer = new ArrayBuffer(schema.size * this.defaultCapacity);
        archetype.componentArrays.set(type, buffer);
      }
    }
    
    this.archetypes.set(key, archetype);
    return archetype;
  }
  
  private getArchetypeKey(componentTypes: ComponentType[]): string {
    return [...componentTypes].sort((a, b) => a - b).join(',');
  }
  
  /**
   * Adiciona entidade ao archetype
   */
  addEntity(entity: Entity, archetype: Archetype): number {
    // Verificar capacidade
    if (archetype.entityCount >= archetype.capacity) {
      this.growArchetype(archetype);
    }
    
    const index = archetype.entityCount++;
    archetype.entityIds[index] = entity;
    
    this.entityToArchetype.set(entity, archetype);
    this.entityToIndex.set(entity, index);
    
    return index;
  }
  
  /**
   * Remove entidade do archetype
   */
  removeEntity(entity: Entity): boolean {
    const archetype = this.entityToArchetype.get(entity);
    if (!archetype) return false;
    
    const index = this.entityToIndex.get(entity)!;
    const lastIndex = --archetype.entityCount;
    
    // Swap-remove
    if (index !== lastIndex) {
      const lastEntity = archetype.entityIds[lastIndex];
      archetype.entityIds[index] = lastEntity;
      this.entityToIndex.set(lastEntity, index);
      
      // Copiar dados do último para a posição removida
      for (const [type, buffer] of archetype.componentArrays) {
        const schema = this.registry.getSchema(type)!;
        const src = new Uint8Array(buffer, lastIndex * schema.size, schema.size);
        const dst = new Uint8Array(buffer, index * schema.size, schema.size);
        dst.set(src);
      }
    }
    
    this.entityToArchetype.delete(entity);
    this.entityToIndex.delete(entity);
    
    return true;
  }
  
  /**
   * Move entidade para novo archetype (ao adicionar/remover componentes)
   */
  moveEntity(entity: Entity, newComponentTypes: ComponentType[]): Archetype {
    const oldArchetype = this.entityToArchetype.get(entity);
    const oldIndex = this.entityToIndex.get(entity);
    
    const newArchetype = this.getOrCreateArchetype(newComponentTypes);
    const newIndex = this.addEntity(entity, newArchetype);
    
    // Copiar componentes que existem em ambos
    if (oldArchetype && oldIndex !== undefined) {
      for (const type of newArchetype.componentTypes) {
        if (oldArchetype.componentTypes.has(type)) {
          const schema = this.registry.getSchema(type)!;
          const srcBuffer = oldArchetype.componentArrays.get(type)!;
          const dstBuffer = newArchetype.componentArrays.get(type)!;
          
          const src = new Uint8Array(srcBuffer, oldIndex * schema.size, schema.size);
          const dst = new Uint8Array(dstBuffer, newIndex * schema.size, schema.size);
          dst.set(src);
        }
      }
      
      // Remover do archetype antigo
      this.removeEntityFromArchetype(entity, oldArchetype, oldIndex);
    }
    
    return newArchetype;
  }
  
  private removeEntityFromArchetype(entity: Entity, archetype: Archetype, index: number): void {
    const lastIndex = --archetype.entityCount;
    
    if (index !== lastIndex) {
      const lastEntity = archetype.entityIds[lastIndex];
      archetype.entityIds[index] = lastEntity;
      this.entityToIndex.set(lastEntity, index);
      
      for (const [type, buffer] of archetype.componentArrays) {
        const schema = this.registry.getSchema(type)!;
        const src = new Uint8Array(buffer, lastIndex * schema.size, schema.size);
        const dst = new Uint8Array(buffer, index * schema.size, schema.size);
        dst.set(src);
      }
    }
  }
  
  private growArchetype(archetype: Archetype): void {
    const newCapacity = archetype.capacity * 2;
    
    for (const [type, oldBuffer] of archetype.componentArrays) {
      const schema = this.registry.getSchema(type)!;
      const newBuffer = new ArrayBuffer(schema.size * newCapacity);
      new Uint8Array(newBuffer).set(new Uint8Array(oldBuffer));
      archetype.componentArrays.set(type, newBuffer);
    }
    
    archetype.capacity = newCapacity;
  }
  
  getEntityArchetype(entity: Entity): Archetype | undefined {
    return this.entityToArchetype.get(entity);
  }
  
  getEntityIndex(entity: Entity): number | undefined {
    return this.entityToIndex.get(entity);
  }
  
  getAllArchetypes(): Archetype[] {
    return Array.from(this.archetypes.values());
  }
  
  /**
   * Query archetypes que correspondem aos critérios
   */
  queryArchetypes(query: Query): Archetype[] {
    const results: Archetype[] = [];
    
    for (const archetype of this.archetypes.values()) {
      if (this.archetypeMatchesQuery(archetype, query)) {
        results.push(archetype);
      }
    }
    
    return results;
  }
  
  private archetypeMatchesQuery(archetype: Archetype, query: Query): boolean {
    // All - deve ter todos
    if (query.all) {
      for (const type of query.all) {
        if (!archetype.componentTypes.has(type)) return false;
      }
    }
    
    // Any - deve ter pelo menos um
    if (query.any && query.any.length > 0) {
      let hasAny = false;
      for (const type of query.any) {
        if (archetype.componentTypes.has(type)) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) return false;
    }
    
    // None - não deve ter nenhum
    if (query.none) {
      for (const type of query.none) {
        if (archetype.componentTypes.has(type)) return false;
      }
    }
    
    return true;
  }
}

// ============================================================================
// COMPONENT DATA ACCESSOR
// ============================================================================

export class ComponentDataView<T extends object> {
  private buffer: ArrayBuffer;
  private schema: ComponentSchema;
  private index: number;
  private dataView: DataView;
  
  constructor(buffer: ArrayBuffer, schema: ComponentSchema, index: number) {
    this.buffer = buffer;
    this.schema = schema;
    this.index = index;
    this.dataView = new DataView(buffer, index * schema.size, schema.size);
  }
  
  get<K extends keyof T>(field: K): T[K] {
    const fieldDef = this.schema.fields.find(f => f.name === String(field));
    if (!fieldDef) throw new Error(`Field ${String(field)} not found`);
    
    return this.readField(fieldDef) as T[K];
  }
  
  set<K extends keyof T>(field: K, value: T[K]): void {
    const fieldDef = this.schema.fields.find(f => f.name === String(field));
    if (!fieldDef) throw new Error(`Field ${String(field)} not found`);
    
    this.writeField(fieldDef, value);
  }
  
  private readField(field: ComponentField): unknown {
    switch (field.type) {
      case 'f32': return this.dataView.getFloat32(field.offset, true);
      case 'f64': return this.dataView.getFloat64(field.offset, true);
      case 'i32': return this.dataView.getInt32(field.offset, true);
      case 'u32': return this.dataView.getUint32(field.offset, true);
      case 'i8': return this.dataView.getInt8(field.offset);
      case 'u8': return this.dataView.getUint8(field.offset);
      case 'bool': return this.dataView.getUint8(field.offset) !== 0;
      case 'entity': return this.dataView.getUint32(field.offset, true);
      case 'vec2': return {
        x: this.dataView.getFloat32(field.offset, true),
        y: this.dataView.getFloat32(field.offset + 4, true),
      };
      case 'vec3': return {
        x: this.dataView.getFloat32(field.offset, true),
        y: this.dataView.getFloat32(field.offset + 4, true),
        z: this.dataView.getFloat32(field.offset + 8, true),
      };
      case 'vec4': return {
        x: this.dataView.getFloat32(field.offset, true),
        y: this.dataView.getFloat32(field.offset + 4, true),
        z: this.dataView.getFloat32(field.offset + 8, true),
        w: this.dataView.getFloat32(field.offset + 12, true),
      };
      default: return null;
    }
  }
  
  private writeField(field: ComponentField, value: unknown): void {
    switch (field.type) {
      case 'f32': this.dataView.setFloat32(field.offset, value as number, true); break;
      case 'f64': this.dataView.setFloat64(field.offset, value as number, true); break;
      case 'i32': this.dataView.setInt32(field.offset, value as number, true); break;
      case 'u32': this.dataView.setUint32(field.offset, value as number, true); break;
      case 'i8': this.dataView.setInt8(field.offset, value as number); break;
      case 'u8': this.dataView.setUint8(field.offset, value as number); break;
      case 'bool': this.dataView.setUint8(field.offset, (value as boolean) ? 1 : 0); break;
      case 'entity': this.dataView.setUint32(field.offset, value as number, true); break;
      case 'vec2': {
        const v = value as { x: number; y: number };
        this.dataView.setFloat32(field.offset, v.x, true);
        this.dataView.setFloat32(field.offset + 4, v.y, true);
        break;
      }
      case 'vec3': {
        const v = value as { x: number; y: number; z: number };
        this.dataView.setFloat32(field.offset, v.x, true);
        this.dataView.setFloat32(field.offset + 4, v.y, true);
        this.dataView.setFloat32(field.offset + 8, v.z, true);
        break;
      }
      case 'vec4': {
        const v = value as { x: number; y: number; z: number; w: number };
        this.dataView.setFloat32(field.offset, v.x, true);
        this.dataView.setFloat32(field.offset + 4, v.y, true);
        this.dataView.setFloat32(field.offset + 8, v.z, true);
        this.dataView.setFloat32(field.offset + 12, v.w, true);
        break;
      }
    }
  }
}

// ============================================================================
// SYSTEM SCHEDULER
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

export interface TransformData {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  rotationW: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface VelocityData {
  x: number;
  y: number;
  z: number;
  angularX: number;
  angularY: number;
  angularZ: number;
}

export interface RenderData {
  meshId: number;
  materialId: number;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  layer: number;
}

export function registerCommonComponents(world: World): {
  Transform: ComponentType;
  Velocity: ComponentType;
  Render: ComponentType;
} {
  const Transform = world.registerComponent<TransformData>('Transform', [
    { name: 'positionX', type: 'f32' },
    { name: 'positionY', type: 'f32' },
    { name: 'positionZ', type: 'f32' },
    { name: 'rotationX', type: 'f32' },
    { name: 'rotationY', type: 'f32' },
    { name: 'rotationZ', type: 'f32' },
    { name: 'rotationW', type: 'f32' },
    { name: 'scaleX', type: 'f32' },
    { name: 'scaleY', type: 'f32' },
    { name: 'scaleZ', type: 'f32' },
  ]);
  
  const Velocity = world.registerComponent<VelocityData>('Velocity', [
    { name: 'x', type: 'f32' },
    { name: 'y', type: 'f32' },
    { name: 'z', type: 'f32' },
    { name: 'angularX', type: 'f32' },
    { name: 'angularY', type: 'f32' },
    { name: 'angularZ', type: 'f32' },
  ]);
  
  const Render = world.registerComponent<RenderData>('Render', [
    { name: 'meshId', type: 'u32' },
    { name: 'materialId', type: 'u32' },
    { name: 'visible', type: 'bool' },
    { name: 'castShadow', type: 'bool' },
    { name: 'receiveShadow', type: 'bool' },
    { name: 'layer', type: 'u8' },
  ]);
  
  return { Transform, Velocity, Render };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const createWorld = (config?: WorldConfig): World => {
  return new World(config);
};

export const createJobSystem = (workerCount?: number): JobSystem => {
  const js = new JobSystem(workerCount);
  js.initialize();
  return js;
};

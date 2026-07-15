// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * Game Engine Core - Motor de Jogos Real
 *
 * Sistema completo de game engine com ECS (Entity Component System),
 * física, renderização e scripting.
 *
 * Integrado com react-three-fiber para renderização 3D.
 */

import * as THREE from 'three';

// ============================================================================
// ECS - ENTITY COMPONENT SYSTEM
// ============================================================================

import type {
  AnimatorComponent,
  AudioSourceComponent,
  CameraComponent,
  ColliderComponent,
  CollisionContact,
  Component,
  ComponentType,
  Entity,
  EntityId,
  LightComponent,
  MeshComponent,
  ParticleSystemComponent,
  Prefab,
  PrefabComponent,
  RigidbodyComponent,
  SpriteComponent,
  System,
  TransformComponent,
  UIComponent,
} from './game-engine-core.contracts';

export type {
  AnimatorComponent,
  AudioSourceComponent,
  CameraComponent,
  ColliderComponent,
  CollisionContact,
  Component,
  ComponentType,
  Entity,
  EntityId,
  LightComponent,
  MeshComponent,
  ParticleSystemComponent,
  Prefab,
  PrefabComponent,
  RigidbodyComponent,
  SpriteComponent,
  System,
  TransformComponent,
  UIComponent,
} from './game-engine-core.contracts';

// ============================================================================
// BASE CLASS PARA SCRIPTS
// ============================================================================

export { GameScript } from './game-engine-scripting';
export type { AnyComponent, ScriptComponent } from './game-engine-scripting';
import { GameScript, type ScriptComponent } from './game-engine-scripting';

export class World {
  private entities: Map<EntityId, Entity> = new Map();
  private components: Map<EntityId, Map<ComponentType, Component>> = new Map();
  private systems: System[] = [];
  private prefabs: Map<string, Prefab> = new Map();
  private scriptRegistry: Map<string, new () => GameScript> = new Map();

  private entitiesToDestroy: { entity: Entity; delay: number }[] = [];
  private nextEntityId = 1;

  // Time
  time = {
    deltaTime: 0,
    fixedDeltaTime: 1 / 60,
    timeScale: 1,
    elapsedTime: 0,
    frameCount: 0,
  };

  // Physics settings
  physics = {
    gravity: new THREE.Vector3(0, -9.81, 0),
    fixedTimestep: 1 / 60,
    maxSubsteps: 8,
  };

  // Input
  input = {
    keys: new Set<string>(),
    keysDown: new Set<string>(),
    keysUp: new Set<string>(),
    mousePosition: new THREE.Vector2(),
    mouseDelta: new THREE.Vector2(),
    mouseButtons: new Set<number>(),
    mouseButtonsDown: new Set<number>(),
    mouseButtonsUp: new Set<number>(),
    getAxis: (axis: string): number => {
      if (axis === 'Horizontal') {
        return (this.input.keys.has('KeyD') || this.input.keys.has('ArrowRight') ? 1 : 0) -
               (this.input.keys.has('KeyA') || this.input.keys.has('ArrowLeft') ? 1 : 0);
      }
      if (axis === 'Vertical') {
        return (this.input.keys.has('KeyW') || this.input.keys.has('ArrowUp') ? 1 : 0) -
               (this.input.keys.has('KeyS') || this.input.keys.has('ArrowDown') ? 1 : 0);
      }
      return 0;
    },
  };

  constructor() {
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (!this.input.keys.has(e.code)) {
        this.input.keysDown.add(e.code);
      }
      this.input.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys.delete(e.code);
      this.input.keysUp.add(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      this.input.mouseDelta.set(
        e.movementX,
        e.movementY
      );
      this.input.mousePosition.set(e.clientX, e.clientY);
    });

    window.addEventListener('mousedown', (e) => {
      this.input.mouseButtons.add(e.button);
      this.input.mouseButtonsDown.add(e.button);
    });

    window.addEventListener('mouseup', (e) => {
      this.input.mouseButtons.delete(e.button);
      this.input.mouseButtonsUp.add(e.button);
    });
  }

  // ============================================================================
  // ENTITY MANAGEMENT
  // ============================================================================

  createEntity(name: string = 'Entity'): Entity {
    const id = `entity_${this.nextEntityId++}`;
    const entity: Entity = {
      id,
      name,
      active: true,
      tags: new Set(),
      children: [],
    };

    this.entities.set(id, entity);
    this.components.set(id, new Map());

    // Adicionar Transform por padrão
    this.addComponent<TransformComponent>(id, {
      type: 'transform',
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1),
      localPosition: new THREE.Vector3(),
      localRotation: new THREE.Euler(),
      localScale: new THREE.Vector3(1, 1, 1),
    } as TransformComponent);

    // Notificar sistemas
    this.systems.forEach(sys => sys.onEntityAdded?.(entity));

    return entity;
  }

  destroy(entity: Entity, delay: number = 0): void {
    this.entitiesToDestroy.push({ entity, delay });
  }

  private destroyImmediate(entity: Entity): void {
    // Destruir filhos primeiro
    entity.children.forEach(childId => {
      const child = this.entities.get(childId);
      if (child) this.destroyImmediate(child);
    });

    // Chamar onDestroy em scripts
    const scripts = this.getComponent<ScriptComponent>(entity.id, 'script');
    if (scripts?.instance) {
      scripts.instance.onDestroy();
    }

    // Notificar sistemas
    this.systems.forEach(sys => sys.onEntityRemoved?.(entity));

    // Remover do pai
    if (entity.parent) {
      const parent = this.entities.get(entity.parent);
      if (parent) {
        parent.children = parent.children.filter(id => id !== entity.id);
      }
    }

    // Limpar
    this.components.delete(entity.id);
    this.entities.delete(entity.id);
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  findEntity(name: string): Entity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.name === name) return entity;
    }
    return undefined;
  }

  findEntitiesWithTag(tag: string): Entity[] {
    return Array.from(this.entities.values()).filter(e => e.tags.has(tag));
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  // ============================================================================
  // COMPONENT MANAGEMENT
  // ============================================================================

  addComponent<T extends Component>(entityId: EntityId, component: Omit<T, 'entityId'> | T): T {
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const fullComponent = {
      ...component,
      entityId,
    } as T;

    entityComponents.set(component.type, fullComponent);
    return fullComponent;
  }

  getComponent<T extends Component>(entityId: EntityId, type: ComponentType): T | undefined {
    return this.components.get(entityId)?.get(type) as T | undefined;
  }

  hasComponent(entityId: EntityId, type: ComponentType): boolean {
    return this.components.get(entityId)?.has(type) ?? false;
  }

  removeComponent(entityId: EntityId, type: ComponentType): void {
    this.components.get(entityId)?.delete(type);
  }

  getEntitiesWithComponents(types: ComponentType[]): Entity[] {
    return Array.from(this.entities.values()).filter(entity =>
      types.every(type => this.hasComponent(entity.id, type))
    );
  }

  // ============================================================================
  // SYSTEM MANAGEMENT
  // ============================================================================

  addSystem(system: System): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
  }

  removeSystem(name: string): void {
    this.systems = this.systems.filter(s => s.name !== name);
  }

  // ============================================================================
  // PREFAB SYSTEM
  // ============================================================================

  registerPrefab(prefab: Prefab): void {
    this.prefabs.set(prefab.name, prefab);
  }

  instantiate(prefabName: string, position?: THREE.Vector3): Entity {
    const prefab = this.prefabs.get(prefabName);
    if (!prefab) {
      throw new Error(`Prefab ${prefabName} not found`);
    }

    return this.instantiatePrefab(prefab, position);
  }

  private instantiatePrefab(prefab: Prefab, position?: THREE.Vector3, parent?: Entity): Entity {
    const entity = this.createEntity(prefab.name);

    if (parent) {
      entity.parent = parent.id;
      parent.children.push(entity.id);
    }

    // Adicionar componentes
    prefab.components.forEach(comp => {
      this.addComponent(entity.id, comp);
    });

    // Aplicar posição se fornecida
    if (position) {
      const transform = this.getComponent<TransformComponent>(entity.id, 'transform');
      if (transform) {
        transform.position.copy(position);
      }
    }

    // Instanciar filhos
    prefab.children?.forEach(childPrefab => {
      this.instantiatePrefab(childPrefab, undefined, entity);
    });

    // Inicializar scripts
    const scriptComp = this.getComponent<ScriptComponent>(entity.id, 'script');
    if (scriptComp) {
      const ScriptClass = this.scriptRegistry.get(scriptComp.scriptName);
      if (ScriptClass) {
        scriptComp.instance = new ScriptClass();
        scriptComp.instance._init(entity, this);
        scriptComp.instance.awake();
      }
    }

    return entity;
  }

  // ============================================================================
  // SCRIPT REGISTRY
  // ============================================================================

  registerScript(name: string, scriptClass: new () => GameScript): void {
    this.scriptRegistry.set(name, scriptClass);
  }

  // ============================================================================
  // GAME LOOP
  // ============================================================================

  update(deltaTime: number): void {
    this.time.deltaTime = deltaTime * this.time.timeScale;
    this.time.elapsedTime += this.time.deltaTime;
    this.time.frameCount++;

    // Update systems
    this.systems.forEach(system => {
      const entities = this.getEntitiesWithComponents(system.requiredComponents);
      system.update(entities.filter(e => e.active), this.time.deltaTime);
    });

    // Update scripts
    this.entities.forEach(entity => {
      if (!entity.active) return;

      const scriptComp = this.getComponent<ScriptComponent>(entity.id, 'script');
      if (scriptComp?.instance) {
        scriptComp.instance.update(this.time.deltaTime);
      }
    });

    // Process destruction queue
    this.entitiesToDestroy = this.entitiesToDestroy.filter(item => {
      item.delay -= deltaTime;
      if (item.delay <= 0) {
        this.destroyImmediate(item.entity);
        return false;
      }
      return true;
    });

    // Clear frame input
    this.input.keysDown.clear();
    this.input.keysUp.clear();
    this.input.mouseButtonsDown.clear();
    this.input.mouseButtonsUp.clear();
    this.input.mouseDelta.set(0, 0);
  }

  fixedUpdate(): void {
    // Physics update
    this.entities.forEach(entity => {
      if (!entity.active) return;

      const scriptComp = this.getComponent<ScriptComponent>(entity.id, 'script');
      if (scriptComp?.instance) {
        scriptComp.instance.fixedUpdate(this.time.fixedDeltaTime);
      }
    });
  }

  lateUpdate(): void {
    this.entities.forEach(entity => {
      if (!entity.active) return;

      const scriptComp = this.getComponent<ScriptComponent>(entity.id, 'script');
      if (scriptComp?.instance) {
        scriptComp.instance.lateUpdate(this.time.deltaTime);
      }
    });
  }

  // Start all scripts
  start(): void {
    this.entities.forEach(entity => {
      const scriptComp = this.getComponent<ScriptComponent>(entity.id, 'script');
      if (scriptComp?.instance) {
        scriptComp.instance.start();
      }
    });
  }
}

// ============================================================================
// BUILT-IN SYSTEMS
// ============================================================================

export { PhysicsSystem, TransformSystem } from './game-engine-systems';
import { PhysicsSystem, TransformSystem } from './game-engine-systems';

let worldInstance: World | null = null;

export function getWorld(): World {
  if (!worldInstance) {
    worldInstance = new World();
    worldInstance.addSystem(new TransformSystem());
    worldInstance.addSystem(new PhysicsSystem(worldInstance));
  }
  return worldInstance;
}

export function resetWorld(): void {
  worldInstance = null;
}

export default World;

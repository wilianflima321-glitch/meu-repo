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

export type EntityId = string;
export type ComponentType = string;

/**
 * Entidade - Apenas um ID que agrupa componentes
 */
export interface Entity {
  id: EntityId;
  name: string;
  active: boolean;
  tags: Set<string>;
  parent?: EntityId;
  children: EntityId[];
}

/**
 * Componente - Dados puros, sem lógica
 */
export interface Component {
  type: ComponentType;
  entityId: EntityId;
}

/**
 * Sistema - Lógica que opera em componentes
 */
export interface System {
  name: string;
  requiredComponents: ComponentType[];
  priority: number; // Menor = executa primeiro
  update(entities: Entity[], deltaTime: number): void;
  onEntityAdded?(entity: Entity): void;
  onEntityRemoved?(entity: Entity): void;
}

// ============================================================================
// COMPONENTES BUILT-IN
// ============================================================================

export interface TransformComponent extends Component {
  type: 'transform';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  localPosition: THREE.Vector3;
  localRotation: THREE.Euler;
  localScale: THREE.Vector3;
}

export interface MeshComponent extends Component {
  type: 'mesh';
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface RigidbodyComponent extends Component {
  type: 'rigidbody';
  mass: number;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  drag: number;
  angularDrag: number;
  useGravity: boolean;
  isKinematic: boolean;
  constraints: {
    freezePositionX: boolean;
    freezePositionY: boolean;
    freezePositionZ: boolean;
    freezeRotationX: boolean;
    freezeRotationY: boolean;
    freezeRotationZ: boolean;
  };
}

export interface ColliderComponent extends Component {
  type: 'collider';
  shape: 'box' | 'sphere' | 'capsule' | 'mesh';
  size: THREE.Vector3;
  center: THREE.Vector3;
  isTrigger: boolean;
  physicMaterial?: {
    friction: number;
    bounciness: number;
  };
}

export interface CameraComponent extends Component {
  type: 'camera';
  fov: number;
  near: number;
  far: number;
  isMain: boolean;
  clearColor?: number;
}

export interface LightComponent extends Component {
  type: 'light';
  lightType: 'directional' | 'point' | 'spot' | 'ambient';
  color: number;
  intensity: number;
  castShadow: boolean;
  shadowMapSize: number;
  // Spot/Point specific
  range?: number;
  // Spot specific
  angle?: number;
  penumbra?: number;
}

export interface AudioSourceComponent extends Component {
  type: 'audioSource';
  clip?: string;
  volume: number;
  pitch: number;
  loop: boolean;
  playOnAwake: boolean;
  spatialBlend: number; // 0 = 2D, 1 = 3D
  minDistance: number;
  maxDistance: number;
}

export interface AnimatorComponent extends Component {
  type: 'animator';
  clips: Map<string, THREE.AnimationClip>;
  currentClip?: string;
  speed: number;
  mixer?: THREE.AnimationMixer;
}

export interface ScriptComponent extends Component {
  type: 'script';
  scriptName: string;
  properties: Record<string, unknown>;
  instance?: GameScript;
}

export interface SpriteComponent extends Component {
  type: 'sprite';
  texture: string;
  color: number;
  flipX: boolean;
  flipY: boolean;
  pixelsPerUnit: number;
}

export interface UIComponent extends Component {
  type: 'ui';
  uiType: 'text' | 'image' | 'button' | 'panel' | 'slider';
  text?: string;
  fontSize?: number;
  color?: number;
  onClick?: () => void;
}

export interface ParticleSystemComponent extends Component {
  type: 'particleSystem';
  maxParticles: number;
  emissionRate: number;
  lifetime: { min: number; max: number };
  startSpeed: { min: number; max: number };
  startSize: { min: number; max: number };
  startColor: { min: number; max: number };
  gravity: number;
  texture?: string;
  shape: 'sphere' | 'cone' | 'box';
}

// Tipo união de todos componentes
export type AnyComponent = 
  | TransformComponent
  | MeshComponent
  | RigidbodyComponent
  | ColliderComponent
  | CameraComponent
  | LightComponent
  | AudioSourceComponent
  | AnimatorComponent
  | ScriptComponent
  | SpriteComponent
  | UIComponent
  | ParticleSystemComponent;

// ============================================================================
// BASE CLASS PARA SCRIPTS
// ============================================================================

export abstract class GameScript {
  protected entity!: Entity;
  protected world!: World;
  protected transform!: TransformComponent;

  _init(entity: Entity, world: World): void {
    this.entity = entity;
    this.world = world;
    this.transform = world.getComponent<TransformComponent>(entity.id, 'transform')!;
  }

  // Lifecycle methods - override these
  awake(): void {}
  start(): void {}
  update(_deltaTime: number): void {}
  fixedUpdate(_fixedDeltaTime: number): void {}
  lateUpdate(_deltaTime: number): void {}
  onDestroy(): void {}
  
  // Collision callbacks
  onCollisionEnter(_other: Entity, _contact: CollisionContact): void {}
  onCollisionStay(_other: Entity, _contact: CollisionContact): void {}
  onCollisionExit(_other: Entity): void {}
  onTriggerEnter(_other: Entity): void {}
  onTriggerStay(_other: Entity): void {}
  onTriggerExit(_other: Entity): void {}

  // Helper methods
  protected getComponent<T extends Component>(type: ComponentType): T | undefined {
    return this.world.getComponent<T>(this.entity.id, type);
  }

  protected addComponent<T extends Component>(component: Omit<T, 'entityId'>): T {
    return this.world.addComponent<T>(this.entity.id, component as T);
  }

  protected findEntity(name: string): Entity | undefined {
    return this.world.findEntity(name);
  }

  protected findEntitiesWithTag(tag: string): Entity[] {
    return this.world.findEntitiesWithTag(tag);
  }

  protected instantiate(prefabName: string, position?: THREE.Vector3): Entity {
    return this.world.instantiate(prefabName, position);
  }

  protected destroy(entity?: Entity, delay?: number): void {
    this.world.destroy(entity || this.entity, delay);
  }
}

export interface CollisionContact {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  impulse: number;
}

// ============================================================================
// PREFAB SYSTEM
// ============================================================================

export interface Prefab {
  name: string;
  components: Omit<AnyComponent, 'entityId'>[];
  children?: Prefab[];
}

// ============================================================================
// WORLD - GERENCIADOR CENTRAL
// ============================================================================

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

export class TransformSystem implements System {
  name = 'TransformSystem';
  requiredComponents = ['transform'];
  priority = 0;

  update(entities: Entity[]): void {
    // Atualizar transforms hierárquicos
    const roots = entities.filter(e => !e.parent);
    roots.forEach(entity => this.updateTransformHierarchy(entity, entities));
  }

  private updateTransformHierarchy(
    entity: Entity,
    allEntities: Entity[],
    parentMatrix?: THREE.Matrix4
  ): void {
    // Aqui você atualizaria as transforms world baseado nas locais
    // Simplificado por brevidade
    entity.children.forEach(childId => {
      const child = allEntities.find(e => e.id === childId);
      if (child) {
        this.updateTransformHierarchy(child, allEntities, parentMatrix);
      }
    });
  }
}

export class PhysicsSystem implements System {
  name = 'PhysicsSystem';
  requiredComponents = ['transform', 'rigidbody'];
  priority = 10;

  private world?: World;

  constructor(world: World) {
    this.world = world;
  }

  update(entities: Entity[], deltaTime: number): void {
    if (!this.world) return;

    entities.forEach(entity => {
      const transform = this.world!.getComponent<TransformComponent>(entity.id, 'transform')!;
      const rb = this.world!.getComponent<RigidbodyComponent>(entity.id, 'rigidbody')!;

      if (rb.isKinematic) return;

      // Aplicar gravidade
      if (rb.useGravity) {
        rb.velocity.add(
          this.world!.physics.gravity.clone().multiplyScalar(deltaTime)
        );
      }

      // Aplicar drag
      rb.velocity.multiplyScalar(1 - rb.drag * deltaTime);
      rb.angularVelocity.multiplyScalar(1 - rb.angularDrag * deltaTime);

      // Atualizar posição
      if (!rb.constraints.freezePositionX) transform.position.x += rb.velocity.x * deltaTime;
      if (!rb.constraints.freezePositionY) transform.position.y += rb.velocity.y * deltaTime;
      if (!rb.constraints.freezePositionZ) transform.position.z += rb.velocity.z * deltaTime;

      // Atualizar rotação
      if (!rb.constraints.freezeRotationX) transform.rotation.x += rb.angularVelocity.x * deltaTime;
      if (!rb.constraints.freezeRotationY) transform.rotation.y += rb.angularVelocity.y * deltaTime;
      if (!rb.constraints.freezeRotationZ) transform.rotation.z += rb.angularVelocity.z * deltaTime;
    });
  }
}

// ============================================================================
// SINGLETON WORLD
// ============================================================================

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

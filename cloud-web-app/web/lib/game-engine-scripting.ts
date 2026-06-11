// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three'
import type {
  AnimatorComponent,
  AudioSourceComponent,
  CameraComponent,
  ColliderComponent,
  CollisionContact,
  Component,
  ComponentType,
  Entity,
  LightComponent,
  MeshComponent,
  ParticleSystemComponent,
  RigidbodyComponent,
  SpriteComponent,
  TransformComponent,
  UIComponent,
} from './game-engine-core.contracts'
import type { World } from './game-engine-core'

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

export interface ScriptComponent extends Component {
  type: 'script';
  scriptName: string;
  properties: Record<string, unknown>;
  instance?: GameScript;
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
// WORLD - GERENCIADOR CENTRAL
// ============================================================================


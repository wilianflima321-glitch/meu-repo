/**
 * OMNI-PLAN GAS — `GasWorld`: the ergonomic entry point wiring
 * `attribute-set.ts` + `tag-registry.ts` + `effect-pool.ts` + `cue.ts` onto
 * one `lib/ecs-dots-system.ts#World` instance and registering the effect
 * tick as a real ECS system via `World.registerSystem` (not a bespoke
 * `setInterval` loop living outside the ECS scheduler).
 */
import { createWorld, type World } from '../ecs-dots-system';
import type { ComponentType, Entity, SystemId } from '../ecs-dots-contracts';
import { type AttributeSetSchema, type AttributeBounds, initAttributeSet, registerAttributeSetComponent, serializeAttributeSet } from './attribute-set';
import { GameplayTagRegistry, TagSetIndex, registerTagSetComponent } from './tag-registry';
import { GameplayEffectPool } from './effect-pool';
import { GameplayCueDispatcher } from './cue';
import { CORE_ATTRIBUTE_NAMES, type GameplayEffectDefinition } from './types';

const GAS_EFFECT_TICK_SYSTEM_ID: SystemId = 9001;

export interface CreateGasWorldOptions {
  /** Attribute names this world's `AttributeSet` component exposes. Defaults to `CORE_ATTRIBUTE_NAMES` (Health, Mana, Stamina, MovementSpeed) — pass a custom list for "Temperatura do Motor" / "Sanidade Mental do Cthulhu"-style bespoke attributes. */
  attributeNames?: string[];
  attributeBounds?: Record<string, AttributeBounds>;
  initialEffectPoolCapacity?: number;
  now?: () => number;
}

export class GasWorld {
  readonly ecs: World;
  readonly attributeSchema: AttributeSetSchema;
  readonly tagSetComponentType: ComponentType;
  readonly tagRegistry: GameplayTagRegistry;
  readonly tags: TagSetIndex;
  readonly cues: GameplayCueDispatcher;
  readonly effects: GameplayEffectPool;

  constructor(options: CreateGasWorldOptions = {}) {
    this.ecs = createWorld();
    this.attributeSchema = registerAttributeSetComponent(
      this.ecs,
      options.attributeNames ?? [...CORE_ATTRIBUTE_NAMES],
      options.attributeBounds
    );
    this.tagSetComponentType = registerTagSetComponent(this.ecs);
    this.tagRegistry = new GameplayTagRegistry();
    this.tags = new TagSetIndex(this.ecs, this.tagSetComponentType, this.tagRegistry);
    this.cues = new GameplayCueDispatcher();
    this.effects = new GameplayEffectPool(
      { world: this.ecs, attributeSchema: this.attributeSchema, tags: this.tags, cues: this.cues, now: options.now },
      options.initialEffectPoolCapacity
    );

    // Registered through the real scheduler (`ecs-dots-scheduler.ts`) so a
    // consumer calling `world.update(dt)` drives GAS the same way it drives
    // any other system (Transform/Velocity, physics, ...) — the effect pool
    // is not a parallel, un-scheduled timer loop bolted on the side.
    // `query` only gates whether this system is considered "relevant" to
    // the AttributeSet archetype for scheduling purposes; `effects.tick`
    // ignores the `entities` argument the scheduler computes from it and
    // walks its own internal pool directly (see `effect-pool.ts`) — that
    // pool, not an ECS query, is the batch-processing structure the brief
    // asks for.
    this.ecs.registerSystem({
      id: GAS_EFFECT_TICK_SYSTEM_ID,
      name: 'GameplayEffectTick',
      query: { all: [this.attributeSchema.componentType] },
      update: (_world, _entities, deltaTime) => this.effects.tick(deltaTime),
    });
  }

  /** Creates an entity with both the AttributeSet and TagSet components initialized (TagSet starts empty — `TagSetIndex` lazily adds the component itself on first `addTag`, this just pre-attaches it so `hasTag`/`getComponent` never has to special-case "entity has no TagSet yet"). */
  createEntity(initialAttributeValues: Record<string, number> = {}): Entity {
    const entity = this.ecs.createEntity();
    initAttributeSet(this.ecs, entity, this.attributeSchema, initialAttributeValues);
    this.ecs.addComponent(entity, this.tagSetComponentType);
    return entity;
  }

  applyGameplayEffect(target: Entity, definition: GameplayEffectDefinition, source?: Entity): boolean {
    return this.effects.apply(target, definition, source);
  }

  removeGameplayEffect(target: Entity, effectId: string): boolean {
    return this.effects.remove(target, effectId);
  }

  getAttribute(target: Entity, attribute: string): number {
    return serializeAttributeSet(this.ecs, target, this.attributeSchema)[attribute] ?? 0;
  }

  hasTag(target: Entity, tag: string): boolean {
    return this.tags.hasTag(target, tag);
  }

  /** Advances every scheduled system, including the GameplayEffect batch tick. */
  tick(deltaTimeSeconds: number): void {
    this.ecs.update(deltaTimeSeconds);
  }
}

export function createGasWorld(options?: CreateGasWorldOptions): GasWorld {
  return new GasWorld(options);
}

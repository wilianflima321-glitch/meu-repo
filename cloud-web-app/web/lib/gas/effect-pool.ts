/**
 * OMNI-PLAN GAS — GameplayEffect batch-processing engine.
 *
 * This is the direct answer to the brief's "O motor (ECS) fará o
 * batch-processing desses cálculos" / "1.000 magias rodando ao mesmo tempo
 * não [devem] engasgar a simulação": every active effect instance
 * (buff/DOT/HOT currently ticking on some entity) lives as one row across a
 * small set of flat typed arrays (`entity`, `source`, `remainingMs`,
 * `nextPeriodMs`, `alive`) — a hybrid SoA layout (object references for the
 * rarely-touched `GameplayEffectDefinition` pointer live in a plain array
 * alongside the hot numeric fields; see the class doc comment for why this
 * is "hybrid", not pure SoA). `tick()` is ONE linear pass over that pool,
 * not N per-entity `Map` walks — the legacy
 * `lib/gameplay-ability-component.ts#AbilitySystemComponent.tick` pattern
 * this replaces iterates a `Map<string, ActiveGameplayEffect>` *per
 * entity*, which is O(entities) separate hash-map walks; this is one
 * O(active effects) walk regardless of entity count.
 *
 * Expiry uses tombstone-and-recycle (`alive[i] = 0` + push the index onto a
 * free-list `allocateRow` pops from first) rather than `ArchetypeStorage`'s
 * swap-remove: effect rows don't need to stay densely packed for archetype
 * queries the way entity/component rows do, and recycling by index keeps
 * `tick()`'s scan order stable, which is easier to reason about than
 * swap-remove's "the last row silently became row `i`" behavior.
 */
import type { Entity } from '../ecs-dots-contracts';
import type { World } from '../ecs-dots-system';
import type { AttributeSetSchema } from './attribute-set';
import {
  addToAttributeBase,
  getAttributeBase,
  multiplyAttributeBase,
  overrideAttributeBase,
  setAttributeCurrent,
} from './attribute-set';
import type { TagSetIndex } from './tag-registry';
import type { GameplayCueDispatcher, GameplayCueEventType } from './cue';
import type { GameplayEffectDefinition, GameplayEffectModifier } from './types';

export interface GameplayEffectPoolDeps {
  world: World;
  attributeSchema: AttributeSetSchema;
  tags: TagSetIndex;
  cues: GameplayCueDispatcher;
  /** Injectable for deterministic tests; defaults to `Date.now`. */
  now?: () => number;
}

interface PoolArrays {
  entity: Uint32Array;
  source: Int32Array; // -1 sentinel = no source
  remainingMs: Float64Array;
  nextPeriodMs: Float64Array;
  alive: Uint8Array;
}

function allocateArrays(capacity: number): PoolArrays {
  return {
    entity: new Uint32Array(capacity),
    source: new Int32Array(capacity).fill(-1),
    remainingMs: new Float64Array(capacity),
    nextPeriodMs: new Float64Array(capacity).fill(Number.POSITIVE_INFINITY),
    alive: new Uint8Array(capacity),
  };
}

export class GameplayEffectPool {
  private capacity = 0;
  private count = 0;
  private arrays: PoolArrays;
  private definitions: Array<GameplayEffectDefinition | null> = [];
  private freeIndices: number[] = [];
  /** Rows for standing (non-periodic duration/infinite) modifiers only — see `recomputeAttribute`. */
  private entityToStandingRows = new Map<Entity, Set<number>>();

  constructor(
    private readonly deps: GameplayEffectPoolDeps,
    initialCapacity = 256
  ) {
    this.arrays = allocateArrays(initialCapacity);
    this.capacity = initialCapacity;
  }

  get activeCount(): number {
    return this.count - this.freeIndices.length;
  }

  private grow(minCapacity: number): void {
    const newCapacity = Math.max(minCapacity, this.capacity * 2);
    const next = allocateArrays(newCapacity);
    next.entity.set(this.arrays.entity);
    next.source.set(this.arrays.source);
    next.remainingMs.set(this.arrays.remainingMs);
    next.nextPeriodMs.set(this.arrays.nextPeriodMs);
    next.alive.set(this.arrays.alive);
    this.arrays = next;
    this.capacity = newCapacity;
  }

  private allocateRow(): number {
    const reused = this.freeIndices.pop();
    if (reused !== undefined) return reused;
    if (this.count >= this.capacity) this.grow(this.capacity * 2);
    const index = this.count++;
    this.definitions[index] = null;
    return index;
  }

  private fireCue(cueTag: string | undefined, eventType: GameplayCueEventType, target: Entity, source: Entity | undefined, effectId: string): void {
    if (!cueTag) return;
    this.deps.cues.dispatch({
      cueTag,
      eventType,
      target,
      source,
      effectId,
      timestampMs: (this.deps.now ?? Date.now)(),
    });
  }

  private grantTags(target: Entity, tagNames: string[] | undefined): void {
    if (!tagNames) return;
    for (const tag of tagNames) this.deps.tags.addTag(target, tag);
  }

  private revokeTags(target: Entity, tagNames: string[] | undefined): void {
    if (!tagNames) return;
    for (const tag of tagNames) this.deps.tags.removeTag(target, tag);
  }

  /** Applies one modifier as a direct BaseValue mutation (instant application, or one periodic DOT/HOT pulse), then re-derives `current` in case standing modifiers are also active on that attribute. */
  private applyModifierPulse(target: Entity, modifier: GameplayEffectModifier): void {
    const { world, attributeSchema } = this.deps;
    switch (modifier.operation) {
      case 'add':
        addToAttributeBase(world, target, attributeSchema, modifier.attribute, modifier.magnitude);
        break;
      case 'multiply':
        multiplyAttributeBase(world, target, attributeSchema, modifier.attribute, modifier.magnitude);
        break;
      case 'override':
        overrideAttributeBase(world, target, attributeSchema, modifier.attribute, modifier.magnitude);
        break;
    }
    this.recomputeAttribute(target, modifier.attribute);
  }

  /**
   * Recomputes `current = override ?? (base + Σadd) * Πmultiply` for one
   * (entity, attribute) pair from every alive *standing* modifier row —
   * mirrors `lib/gameplay-attributes.ts#AttributeSet.getAttribute`'s exact
   * math semantics, just sourced from the flat pool instead of a per-entity
   * modifier `Map`.
   */
  private recomputeAttribute(target: Entity, attribute: string): void {
    const { world, attributeSchema } = this.deps;
    let additive = 0;
    let multiplicative = 1;
    let overrideValue: number | null = null;

    const rows = this.entityToStandingRows.get(target);
    if (rows) {
      for (const rowIndex of rows) {
        if (!this.arrays.alive[rowIndex]) continue;
        const definition = this.definitions[rowIndex];
        if (!definition) continue;
        for (const modifier of definition.modifiers) {
          if (modifier.attribute !== attribute) continue;
          if (modifier.operation === 'add') additive += modifier.magnitude;
          else if (modifier.operation === 'multiply') multiplicative *= modifier.magnitude;
          else if (modifier.operation === 'override') overrideValue = modifier.magnitude;
        }
      }
    }

    const base = getAttributeBase(world, target, attributeSchema, attribute);
    const value = overrideValue !== null ? overrideValue : (base + additive) * multiplicative;
    setAttributeCurrent(world, target, attributeSchema, attribute, value);
  }

  private recomputeAffectedAttributes(target: Entity, modifiers: GameplayEffectModifier[]): void {
    const seen = new Set<string>();
    for (const modifier of modifiers) {
      if (seen.has(modifier.attribute)) continue;
      seen.add(modifier.attribute);
      this.recomputeAttribute(target, modifier.attribute);
    }
  }

  /**
   * Applies `definition` to `target`. Returns `false` (no-op) if
   * `requiredTags`/`blockedTags` reject it. `instant` effects mutate
   * BaseValue once and never enter the pool; `duration`/`infinite` effects
   * allocate a pool row tracked until expiry or `removeGameplayEffect`.
   */
  apply(target: Entity, definition: GameplayEffectDefinition, source?: Entity): boolean {
    const { tags } = this.deps;
    if (definition.requiredTags?.length && !tags.hasAll(target, definition.requiredTags)) return false;
    if (definition.blockedTags?.length && tags.hasAny(target, definition.blockedTags)) return false;

    if (definition.durationPolicy === 'instant') {
      for (const modifier of definition.modifiers) this.applyModifierPulse(target, modifier);
      this.grantTags(target, definition.grantedTags);
      this.fireCue(definition.applicationCueTag, 'applied', target, source, definition.id);
      return true;
    }

    const rowIndex = this.allocateRow();
    this.arrays.entity[rowIndex] = target;
    this.arrays.source[rowIndex] = source ?? -1;
    this.arrays.remainingMs[rowIndex] = (definition.durationSeconds ?? 0) * 1000;
    this.arrays.nextPeriodMs[rowIndex] = definition.periodSeconds ? definition.periodSeconds * 1000 : Number.POSITIVE_INFINITY;
    this.arrays.alive[rowIndex] = 1;
    this.definitions[rowIndex] = definition;

    if (!definition.periodSeconds) {
      const set = this.entityToStandingRows.get(target) ?? new Set<number>();
      set.add(rowIndex);
      this.entityToStandingRows.set(target, set);
      this.recomputeAffectedAttributes(target, definition.modifiers);
    }

    this.grantTags(target, definition.grantedTags);
    this.fireCue(definition.applicationCueTag, 'applied', target, source, definition.id);
    return true;
  }

  private expireRow(rowIndex: number): void {
    const target = this.arrays.entity[rowIndex];
    const sourceRaw = this.arrays.source[rowIndex];
    const source = sourceRaw >= 0 ? (sourceRaw as Entity) : undefined;
    const definition = this.definitions[rowIndex];
    if (!definition) return;

    this.arrays.alive[rowIndex] = 0;
    this.definitions[rowIndex] = null;
    this.freeIndices.push(rowIndex);

    const set = this.entityToStandingRows.get(target);
    if (set) {
      set.delete(rowIndex);
      if (set.size === 0) this.entityToStandingRows.delete(target);
    }

    this.revokeTags(target, definition.grantedTags);
    if (!definition.periodSeconds) this.recomputeAffectedAttributes(target, definition.modifiers);
    this.fireCue(definition.removalCueTag, 'removed', target, source, definition.id);
  }

  /** Explicit early removal (e.g. a cleanse ability) — finds the first alive row for `target` matching `effectId`. Returns whether a row was removed. */
  remove(target: Entity, effectId: string): boolean {
    for (let i = 0; i < this.count; i++) {
      if (!this.arrays.alive[i]) continue;
      if (this.arrays.entity[i] !== target) continue;
      if (this.definitions[i]?.id !== effectId) continue;
      this.expireRow(i);
      return true;
    }
    return false;
  }

  hasActiveEffect(target: Entity, effectId: string): boolean {
    for (let i = 0; i < this.count; i++) {
      if (!this.arrays.alive[i]) continue;
      if (this.arrays.entity[i] !== target) continue;
      if (this.definitions[i]?.id === effectId) return true;
    }
    return false;
  }

  /** One batch pass over every active effect instance. Call once per GAS tick (typically from a `SystemScheduler` system — see `gas-world.ts`). */
  tick(dtSeconds: number): void {
    const dtMs = dtSeconds * 1000;
    if (dtMs <= 0) return;

    // Forward scan is safe here: `expireRow` only tombstones `alive[i]` and
    // recycles the index via `freeIndices` — unlike a swap-remove, no other
    // row's data ever moves during this pass.
    for (let i = 0; i < this.count; i++) {
      if (!this.arrays.alive[i]) continue;
      const definition = this.definitions[i];
      if (!definition) continue;
      const target = this.arrays.entity[i];

      // Period pulse is checked BEFORE duration expiry on purpose: a 3s
      // Poison ticking every 1s must deal its 3rd pulse exactly at the
      // moment its duration also elapses (t=1,2,3 — three pulses over three
      // seconds), not silently drop that last pulse because expiry was
      // evaluated first. Checking duration first would make a period that
      // evenly divides the duration fire one fewer time than intended.
      if (definition.periodSeconds) {
        this.arrays.nextPeriodMs[i] -= dtMs;
        if (this.arrays.nextPeriodMs[i] <= 0) {
          this.arrays.nextPeriodMs[i] += definition.periodSeconds * 1000;
          const sourceRaw = this.arrays.source[i];
          const source = sourceRaw >= 0 ? (sourceRaw as Entity) : undefined;
          for (const modifier of definition.modifiers) this.applyModifierPulse(target, modifier);
          this.fireCue(definition.periodicCueTag, 'periodic', target, source, definition.id);
        }
      }

      if (definition.durationPolicy === 'duration') {
        this.arrays.remainingMs[i] -= dtMs;
        if (this.arrays.remainingMs[i] <= 0) {
          this.expireRow(i);
        }
      }
    }
  }
}

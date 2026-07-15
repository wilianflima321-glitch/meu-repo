/**
 * OMNI-PLAN GAS — hierarchical GameplayTag as an ECS-native bitset component.
 *
 * `lib/gameplay-tags.ts` (legacy) already implements dot-hierarchy matching
 * (`GameplayTag`/`GameplayTagContainer`) correctly — this module does not
 * reimplement that logic differently, it re-hosts the SAME semantics
 * ("State.Debuff.Stun" matches queries for "State" or "State.Debuff") on top
 * of a fixed-size integer bitset component instead of a per-entity
 * `Set<string>`, so `GameplayEffectDefinition.requiredTags`/`blockedTags`
 * checks inside the hot per-tick effect loop (`effect-pool.ts`) are O(1)
 * bitwise ANDs across up to `WORDS_PER_TAG_SET * 32` interned tags, not a
 * string-hash Set lookup per tag per entity per tick.
 *
 * DESIGN NOTE (Unreal-accurate, documented trade-off): a tag bitset alone
 * cannot correctly support *removal* of one specific tag when several
 * active effects grant overlapping tags/ancestors (e.g. two different
 * "Stun" sources both implying the "State" ancestor bit) — clearing the
 * "State" bit the moment ONE of them is removed would incorrectly clear it
 * while the other Stun effect is still active. Unreal's own
 * `FGameplayTagContainer` solves this with a parent-tag reference count;
 * this module keeps the equivalent as a small per-entity `explicitTags`
 * side table (see `TagSetIndex`) used only to recompute the bitset on
 * add/remove — never read on the hot query path (`hasTag`/`hasAny`/`hasAll`
 * are pure bitset reads).
 */
import type { ComponentField, ComponentType, Entity } from '../ecs-dots-contracts';
import type { World } from '../ecs-dots-system';

export type TagId = number;

/** 4 x u32 = 128 interned tags per world. Raise if a game's tag vocabulary is larger — see `registerTagSetComponent`. */
export const WORDS_PER_TAG_SET = 4;
export const MAX_TAGS_PER_SET = WORDS_PER_TAG_SET * 32;

/**
 * Interns hierarchical tag strings ("State.Debuff.Stun") into stable integer
 * ids, auto-registering every ancestor level ("State", "State.Debuff") so
 * that granting the leaf tag also implies its ancestors for matching
 * purposes — exactly Unreal `FGameplayTag`'s native-tag-manifest behavior.
 */
export class GameplayTagRegistry {
  private nameToId = new Map<string, TagId>();
  private idToName: string[] = [];
  /** `ancestorsOf[id]` includes `id` itself, root-first. */
  private ancestorsOf: TagId[][] = [];

  register(name: string): TagId {
    const existing = this.nameToId.get(name);
    if (existing !== undefined) return existing;

    if (this.idToName.length >= MAX_TAGS_PER_SET) {
      throw new Error(
        `GameplayTagRegistry: exceeded MAX_TAGS_PER_SET (${MAX_TAGS_PER_SET}) while registering "${name}". Raise WORDS_PER_TAG_SET.`
      );
    }

    const segments = name.split('.');
    const ancestors: TagId[] = [];
    let prefix = '';
    for (const segment of segments) {
      prefix = prefix ? `${prefix}.${segment}` : segment;
      let id = this.nameToId.get(prefix);
      if (id === undefined) {
        id = this.idToName.length;
        this.nameToId.set(prefix, id);
        this.idToName.push(prefix);
        this.ancestorsOf.push([...ancestors, id]);
      }
      ancestors.push(id);
    }

    return this.nameToId.get(name)!;
  }

  getId(name: string): TagId | undefined {
    return this.nameToId.get(name);
  }

  getName(id: TagId): string {
    return this.idToName[id] ?? '';
  }

  /** All tag ids implied by holding `id` (itself + every ancestor level). */
  getAncestors(id: TagId): TagId[] {
    return this.ancestorsOf[id] ?? [id];
  }

  size(): number {
    return this.idToName.length;
  }
}

export function bitLocation(id: TagId): { word: number; bit: number } {
  return { word: id >>> 5, bit: id & 31 };
}

/** Registers the fixed-size `TagSet` ECS component (word0..wordN, u32 each). */
export function registerTagSetComponent(world: World): ComponentType {
  const fields: Omit<ComponentField, 'offset' | 'size'>[] = [];
  for (let i = 0; i < WORDS_PER_TAG_SET; i++) {
    fields.push({ name: `word${i}`, type: 'u32' });
  }
  return world.registerComponent<Record<string, number>>('TagSet', fields);
}

function wordFieldName(word: number): string {
  return `word${word}`;
}

/**
 * Per-world bookkeeping bridging the fast ECS bitset component (read by
 * every effect-application/query) and an explicit-tag side table (written
 * only on add/remove) needed for correct multi-source tag removal — see
 * module doc comment.
 */
export class TagSetIndex {
  private explicitTags = new Map<Entity, Set<TagId>>();

  constructor(
    private world: World,
    private componentType: ComponentType,
    private registry: GameplayTagRegistry
  ) {}

  private ensureComponent(entity: Entity): void {
    if (!this.world.hasComponent(entity, this.componentType)) {
      this.world.addComponent(entity, this.componentType);
    }
  }

  private recompute(entity: Entity): void {
    const words = new Array<number>(WORDS_PER_TAG_SET).fill(0);
    const explicit = this.explicitTags.get(entity);
    if (explicit) {
      for (const tagId of explicit) {
        for (const ancestorId of this.registry.getAncestors(tagId)) {
          const { word, bit } = bitLocation(ancestorId);
          words[word] |= 1 << bit;
        }
      }
    }

    this.ensureComponent(entity);
    const view = this.world.getComponent<Record<string, number>>(entity, this.componentType);
    if (!view) return;
    for (let i = 0; i < WORDS_PER_TAG_SET; i++) {
      // `>>> 0` keeps the value in the u32 range the DataView writer expects.
      view.set(wordFieldName(i), words[i] >>> 0);
    }
  }

  addTag(entity: Entity, tagName: string): void {
    const id = this.registry.register(tagName);
    const set = this.explicitTags.get(entity) ?? new Set<TagId>();
    set.add(id);
    this.explicitTags.set(entity, set);
    this.recompute(entity);
  }

  removeTag(entity: Entity, tagName: string): void {
    const id = this.registry.getId(tagName);
    if (id === undefined) return;
    const set = this.explicitTags.get(entity);
    if (!set || !set.delete(id)) return;
    this.recompute(entity);
  }

  clearEntity(entity: Entity): void {
    this.explicitTags.delete(entity);
    this.recompute(entity);
  }

  /** O(1): reads the ECS bitset directly, no explicit-tag lookups. */
  hasTag(entity: Entity, tagName: string): boolean {
    const id = this.registry.getId(tagName);
    if (id === undefined) return false;
    const view = this.world.getComponent<Record<string, number>>(entity, this.componentType);
    if (!view) return false;
    const { word, bit } = bitLocation(id);
    return ((view.get(wordFieldName(word)) >>> bit) & 1) === 1;
  }

  hasAny(entity: Entity, tagNames: string[]): boolean {
    return tagNames.some((tag) => this.hasTag(entity, tag));
  }

  hasAll(entity: Entity, tagNames: string[]): boolean {
    return tagNames.every((tag) => this.hasTag(entity, tag));
  }

  /** Returns the explicitly-granted tags (not the ancestor-expanded set) for debugging/serialization. */
  getExplicitTags(entity: Entity): string[] {
    const set = this.explicitTags.get(entity);
    if (!set) return [];
    return Array.from(set).map((id) => this.registry.getName(id));
  }
}

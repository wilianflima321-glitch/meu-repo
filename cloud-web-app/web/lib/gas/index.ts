/**
 * OMNI-PLAN — Data-Oriented Gameplay Ability System (GAS).
 *
 * WHY THIS EXISTS ALONGSIDE `lib/gameplay-ability-system.ts`:
 *
 * This repository already ships a working, Unreal-GAS-inspired ability
 * system (`gameplay-ability-system.ts` + `gameplay-attributes.ts` +
 * `gameplay-tags.ts` + `gameplay-ability-component.ts` +
 * `gameplay-ability-contracts.ts`) — it is real, not a stub, and its
 * hierarchical tag matching / modifier math (Add·Multiply·Override,
 * Instant·Duration·Infinite, Period/DOT, stacking policies) already covers
 * most of this brief's functional requirements.
 *
 * It is, however, built as one `AbilitySystemComponent` class instance per
 * entity, each privately owning several `Map`s (`abilities`,
 * `activeEffects`, `cooldowns`, and — inside its `AttributeSet` — three more
 * `Map`s per instance). That is exactly the "Orientação a Objetos pesada"
 * this Director's brief instructs against for the new system: N entities
 * means N heap objects and N independent `Map` walks per tick, with no
 * shared contiguous memory a batch system could stride over.
 *
 * This module (`lib/gas/*`) is the data-oriented rebuild the brief asks
 * for, targeting the exact same math/semantics but storing state as flat,
 * ECS-registered component buffers (`lib/ecs-dots-system.ts`) and processing
 * every active effect in one linear pass (`effect-pool.ts`) instead of one
 * pass per entity. Concretely:
 *
 *   | Concept        | Legacy (`gameplay-ability-system.ts`)      | Here (`lib/gas`)                                  |
 *   |----------------|---------------------------------------------|----------------------------------------------------|
 *   | AttributeSet   | Class w/ 3 `Map`s per entity                 | `base_*`/`current_*` f32 fields, packed per archetype (`attribute-set.ts`) |
 *   | GameplayTag    | `Set<string>` per entity                     | Interned integer ids + fixed bitset component (`tag-registry.ts`) |
 *   | GameplayEffect | `Map<string, ActiveGameplayEffect>` / entity | One flat pool across ALL entities (`effect-pool.ts`) |
 *   | Tick           | O(entities) separate `Map` walks             | O(active effects) single pass                     |
 *
 * Both are real and neither is scheduled for deletion in this pass — the
 * legacy system is not touched here, and existing call sites keep working
 * unmodified. New ability-graph work (this brief's Visual Scripting nodes,
 * `visual-script-gas-nodes.ts`) is built against THIS module, per the
 * Director's explicit "ECS estrito" instruction.
 */
export * from './types';
export * from './attribute-set';
export * from './tag-registry';
export * from './cue';
export * from './effect-pool';
export * from './gas-world';

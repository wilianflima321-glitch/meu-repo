/**
 * OMNI-PLAN — Data-Oriented Gameplay Ability System (GAS), shared types.
 *
 * This module intentionally reuses `AttributeModifierOp` from the existing
 * `gameplay-ability-contracts.ts` (the legacy, per-entity OOP GAS already
 * shipped in this repo) rather than redefining an equivalent union — the
 * math semantics (`add` / `multiply` / `override`) are identical, only the
 * *storage and batch-processing model* differs here. See `lib/gas/index.ts`
 * for the full rationale of why two GAS implementations coexist.
 */
import type { AttributeModifierOp } from '../gameplay-ability-contracts';

export type { AttributeModifierOp };

/** A single mathematical modifier a `GameplayEffectDefinition` applies to one attribute. */
export interface GameplayEffectModifier {
  attribute: string;
  operation: AttributeModifierOp;
  magnitude: number;
}

/**
 * - `instant`   — applied once, directly mutates the attribute's BaseValue
 *                 (e.g. a potion that permanently heals 20 HP).
 * - `duration`  — a standing modifier layered on top of BaseValue for
 *                 `durationSeconds`, then automatically removed (e.g. a
 *                 10s "+50% MovementSpeed" haste buff).
 * - `infinite`  — a standing modifier with no expiry, removed only by an
 *                 explicit `removeGameplayEffect` call (e.g. an equipped
 *                 item's passive bonus).
 */
export type GameplayEffectDurationPolicy = 'instant' | 'duration' | 'infinite';

export interface GameplayEffectDefinition {
  id: string;
  name?: string;
  durationPolicy: GameplayEffectDurationPolicy;
  /** Required when `durationPolicy === 'duration'`. Ignored otherwise. */
  durationSeconds?: number;
  /**
   * When set, the effect's `modifiers` are re-applied as an INSTANT pulse
   * (mutating BaseValue directly) every `periodSeconds`, instead of acting
   * as one standing modifier — this is the "Damage/Heal Over Time" case
   * from the brief (e.g. Poison: -5 HP every 1s for `durationSeconds`).
   * Combine with `durationPolicy: 'duration'` to bound the total number of
   * pulses, or `'infinite'` for a periodic effect only removable explicitly.
   */
  periodSeconds?: number;
  modifiers: GameplayEffectModifier[];
  /** Tags granted to the target for as long as this effect instance is active. */
  grantedTags?: string[];
  /** Effect only applies if the target has ALL of these tags. */
  requiredTags?: string[];
  /** Effect is rejected if the target has ANY of these tags. */
  blockedTags?: string[];
  /** GameplayCue tag fired once, on application — see `lib/gas/cue.ts`. */
  applicationCueTag?: string;
  /** GameplayCue tag fired once, on removal/expiry. */
  removalCueTag?: string;
  /** GameplayCue tag fired on every periodic pulse (only meaningful with `periodSeconds`). */
  periodicCueTag?: string;
}

/** Fixed set of base attributes named in the Director's brief — a game may register additional custom attribute names at world-creation time (see `createGasWorld`). */
export const CORE_ATTRIBUTE_NAMES = ['Health', 'Mana', 'Stamina', 'MovementSpeed'] as const;

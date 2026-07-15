/**
 * OMNI-PLAN GAS — named `GameplayEffectDefinition` registry.
 *
 * The Ability Graph's `ApplyGameplayEffect` node (see
 * `visual-script-gas-nodes.ts`) references effects by a short string id
 * (e.g. "Burn") rather than embedding the full modifier/duration/period
 * JSON inline on every node — this registry is where a game's effect
 * catalog is registered once (by game code, or eventually a future
 * "Gameplay Effect Editor" panel) and looked up by id at apply-time.
 */
import type { GameplayEffectDefinition } from './types';

const registry = new Map<string, GameplayEffectDefinition>();

export function registerGameplayEffect(definition: GameplayEffectDefinition): void {
  registry.set(definition.id, definition);
}

export function getGameplayEffect(id: string): GameplayEffectDefinition | undefined {
  return registry.get(id);
}

export function listGameplayEffectIds(): string[] {
  return Array.from(registry.keys());
}

/** The brief's own worked example: "Veneno que tira 5 de HP a cada 1 segundo" for 5 seconds. */
registerGameplayEffect({
  id: 'Burn',
  name: 'Burn (Damage Over Time)',
  durationPolicy: 'duration',
  durationSeconds: 5,
  periodSeconds: 1,
  modifiers: [{ attribute: 'Health', operation: 'add', magnitude: -5 }],
  grantedTags: ['State.Debuff.Burn'],
  blockedTags: ['State.Debuff.FireImmune'],
  applicationCueTag: 'Cue.Fire.Ignite',
  periodicCueTag: 'Cue.Fire.Tick',
  removalCueTag: 'Cue.Fire.Extinguish',
});

/** A short standing buff, useful as a smoke-test fixture and as a template for "Haste"-style effects. */
registerGameplayEffect({
  id: 'Haste',
  name: 'Haste (+50% Movement Speed)',
  durationPolicy: 'duration',
  durationSeconds: 10,
  modifiers: [{ attribute: 'MovementSpeed', operation: 'multiply', magnitude: 1.5 }],
  grantedTags: ['State.Buff.Haste'],
  applicationCueTag: 'Cue.Wind.Rush',
});

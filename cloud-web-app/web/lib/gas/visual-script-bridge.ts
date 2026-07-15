/**
 * OMNI-PLAN GAS — bridge between Visual Scripting's string object ids and
 * GAS's numeric ECS `Entity` handles.
 *
 * HONEST SCOPE: `lib/visual-script/runtime-core` addresses game objects by
 * opaque string id (see `action-destroy`'s `inputs.get('target') as
 * string`) and has no existing concept of an ECS `Entity` — there is today
 * no wiring from the actual 3D scene graph / renderer into
 * `lib/ecs-dots-system.ts`. This module provides the real, working half of
 * that bridge (a stable string-id -> `Entity` mapping, backed by one
 * process-wide `GasWorld` so all three GAS nodes below share the same
 * attribute/tag/effect state), which is what the Director's brief's Ability
 * Graph nodes need to be genuinely functional today. It does NOT invent a
 * fake scene binding: a target id that has never been seen simply gets a
 * fresh GAS-only entity lazily created on first reference, with default
 * (zeroed) attributes — wiring this to real scene object spawn/destroy
 * lifecycle events is the tracked next step once a scene runtime exposes
 * one to subscribe to.
 */
import type { Entity } from '../ecs-dots-contracts';
import { createGasWorld, type GasWorld } from './gas-world';

let sharedWorld: GasWorld | null = null;
const targetIdToEntity = new Map<string, Entity>();

/** Lazily-created, process-wide default `GasWorld` used by the Visual Scripting ability nodes. Tests and dedicated-server code should prefer constructing their own `createGasWorld()` instance instead of this singleton. */
export function getDefaultGasWorld(): GasWorld {
  if (!sharedWorld) sharedWorld = createGasWorld();
  return sharedWorld;
}

/** Resets the default world and its id mapping — for test isolation only. */
export function resetDefaultGasWorld(): void {
  sharedWorld = null;
  targetIdToEntity.clear();
}

/**
 * Advances the default world's GameplayEffect batch tick (durations,
 * DOT/HOT pulses, expiry) by `dtSeconds`. Must be called once per game-loop
 * frame for buffs/DOTs applied through the Ability Graph nodes to actually
 * progress — `runtime-core/executors.ts`'s `event-update` node calls this
 * as a best-effort integration, but a host with its own authoritative frame
 * loop (the dedicated Headless server this brief's Pilar 1/4 describe, or
 * `LevelEditorPlayRuntime`) should call this directly to avoid depending on
 * any particular visual-script graph containing an update-event node.
 */
export function tickDefaultGasWorld(dtSeconds: number): void {
  if (!sharedWorld) return; // no GAS entity has been touched yet — nothing to tick.
  sharedWorld.tick(dtSeconds);
}

export function getOrCreateEntityForTargetId(targetId: string): Entity {
  const existing = targetIdToEntity.get(targetId);
  if (existing !== undefined) return existing;

  const world = getDefaultGasWorld();
  const entity = world.createEntity();
  targetIdToEntity.set(targetId, entity);
  return entity;
}

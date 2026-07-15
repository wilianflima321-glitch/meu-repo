/**
 * OMNI-PLAN GAS — GameplayCue scaffold (audiovisual trigger contract).
 *
 * A GameplayCue is the "dumb" client-side presentation layer Unreal's GAS
 * separates from gameplay logic on purpose: applying a `GameplayEffect`
 * server-side (damage, a buff, a stun) is authoritative simulation state;
 * spawning the fire particle / playing the burn sound / shaking the camera
 * is a *side effect* a client renders in response, and must never itself
 * mutate gameplay state (so replaying/predicting/rolling back a cue is
 * always safe).
 *
 * HONEST SCOPE: this is the scaffold the brief asks for — a real, typed
 * pub/sub dispatcher that `effect-pool.ts` calls into on
 * application/removal/periodic-tick, and that a renderer subscribes to. It
 * does NOT yet:
 *   - cross the network (no `MessageType.GAMEPLAY_CUE` exists in
 *     `lib/networking-multiplayer.types.ts` yet — a dedicated server running
 *     this GAS engine would need to broadcast `GameplayCueEvent`s to clients
 *     the same way `ANOMALY_CORRECTION` is broadcast today);
 *   - bind to any actual particle/audio system (`apps/studio-local`'s wgpu
 *     renderer / `lib/engine/audio-manager-real.ts` are the eventual
 *     subscribers — none is wired here).
 * Both are real, scoped next steps, not silently-assumed features.
 */
import type { Entity } from '../ecs-dots-contracts';

export type GameplayCueEventType = 'applied' | 'removed' | 'periodic';

export interface GameplayCueEvent {
  /** The GameplayCue tag this dispatch corresponds to, e.g. "Cue.Fire.Burn". */
  cueTag: string;
  eventType: GameplayCueEventType;
  target: Entity;
  source?: Entity;
  /** The `GameplayEffectDefinition.id` that triggered this cue, for correlation/debugging. */
  effectId: string;
  timestampMs: number;
}

export type GameplayCueListener = (event: GameplayCueEvent) => void;

/**
 * In-process pub/sub. One instance is created per `GasWorld` (see
 * `gas-world.ts`) — a dedicated server process and a client renderer would
 * each own their own instance today; wiring them together over the network
 * is the tracked next step noted above.
 */
export class GameplayCueDispatcher {
  private listeners: Set<GameplayCueListener> = new Set();
  private byTag: Map<string, Set<GameplayCueListener>> = new Map();

  /** Subscribe to every cue, regardless of tag (e.g. a debug overlay). */
  subscribeAll(listener: GameplayCueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Subscribe to one specific cue tag (e.g. the VFX system registering "Cue.Fire.Burn" -> spawn embers). */
  subscribe(cueTag: string, listener: GameplayCueListener): () => void {
    const set = this.byTag.get(cueTag) ?? new Set<GameplayCueListener>();
    set.add(listener);
    this.byTag.set(cueTag, set);
    return () => set.delete(listener);
  }

  dispatch(event: GameplayCueEvent): void {
    for (const listener of this.listeners) listener(event);
    const tagged = this.byTag.get(event.cueTag);
    if (tagged) for (const listener of tagged) listener(event);
  }
}

/**
 * Typed ports for Apex MoA / MultiSurfaceContextPack / NPC BT / World·Character physics.
 * Live listen/subscribe: live-wire.ts + apex-moa-orchestrator / behavior-tree-nodes (az)
 * + physics subscribe (ba). Path: lib/ambient/ports.ts
 */

import type { AmbientDeltaEvent, AmbientEmotionDelta } from './types'
import type { AmbientEscalationDecision } from './cost-guard-suppressor'

/** Shared NPC / character priority vocabulary (BT + physics hints). */
export type AmbientNpcPriorityBias = 'low' | 'normal' | 'elevated' | 'critical'

/**
 * Port into apex-moa-orchestrator / MultiSurfaceContextPack.
 * Live wire: listen only on critical deltas after CostGuard suppressor allow (letter az).
 * Existing files: apex-moa-orchestrator.ts, multi-surface-context-pack.ts —
 * do NOT bypass CreativeBridge for paid emotion narration.
 */
export interface AmbientApexMoAPort {
  /** Optional slice appended to MultiSurface pack when critical + allowed */
  ambientEmotionSlice?: {
    label: AmbientEmotionDelta['label']
    confidence: number
    source: AmbientEmotionDelta['source']
    /** Always note held physiology in pack text */
    physiologyHeld: true
  }
}

/**
 * Build MoA/context slice from emotion delta — only when escalation allowed.
 * Returns undefined when suppressed (settle: 0 path — no pack pollution).
 */
export function buildAmbientApexMoAPort(
  event: AmbientDeltaEvent,
  decision: AmbientEscalationDecision,
): AmbientApexMoAPort | undefined {
  if (!decision.allow || !event.emotion) return undefined
  return {
    ambientEmotionSlice: {
      label: event.emotion.label,
      confidence: event.emotion.confidence,
      source: event.emotion.source,
      physiologyHeld: true,
    },
  }
}

/**
 * NPC Behavior Tree blackboard port — AmbientEmotionDelta → BT condition keys.
 * Live wire: NPC BT blackboard bind via applyAmbientEmotionToBlackboard / wireAmbientEmotionDeltaLive.
 * Physics/ragdoll: see AmbientPhysicsPort — user-wired apply; never auto Rapier impulse from CSI.
 */
export interface AmbientNpcBtPort {
  blackboardKeys: {
    ambientEmotion: AmbientEmotionDelta['label']
    ambientConfidence: number
    ambientSource: AmbientEmotionDelta['source']
    /** Explicit: BT must not treat as medical HR */
    heartRateHeld: true
  }
  /** Suggested BT condition ids — scaffold labels only */
  suggestedConditions: Array<{
    id: string
    label: string
    stub: true
  }>
}

export function buildAmbientNpcBtPort(emotion: AmbientEmotionDelta): AmbientNpcBtPort {
  return {
    blackboardKeys: {
      ambientEmotion: emotion.label,
      ambientConfidence: emotion.confidence,
      ambientSource: emotion.source,
      heartRateHeld: true,
    },
    suggestedConditions: [
      {
        id: `ambient_is_${emotion.label}`,
        label: `Ambient emotion is ${emotion.label}`,
        stub: true,
      },
    ],
  }
}

/**
 * MultiSurfaceContextPack extension field.
 * Populated only via buildAmbientApexMoAPort after suppressor allow (Law XVI).
 */
export interface AmbientMultiSurfaceExtension {
  /** Present only on critical allowed escalations */
  ambientCriticalDelta?: AmbientApexMoAPort['ambientEmotionSlice']
}

/**
 * Posture / motion hint for Rapier · Active Ragdoll · character motion consumers.
 * Hint only — never an impulse. Apply path: `lib/physics/active-ragdoll-apply.ts` (letter bb).
 */
export type AmbientPostureHint =
  | 'classic'
  | 'relaxed'
  | 'tense'
  | 'flinch_ready'
  | 'idle_absent'

export interface AmbientPhysicsPortOptions {
  /**
   * Law III honesty stamp from Active Ragdoll apply probe.
   * Default true (held) until consumer proves Rapier substrate + apply path.
   */
  activeRagdollHeld?: boolean
}

/**
 * World / Character physics subscribe port (letter ba + bb honesty stamp).
 * Default when csiReady false + enhancement off: classic no-op.
 * Enhancement path may apply posture/priority hints without CSI hardware (heuristic).
 * Consumers (Rapier / Active Ragdoll / MotionMatching) opt-in — never auto-apply forces.
 */
export interface AmbientPhysicsPort {
  /** False → keep classic physics/motion; ignore postureHint bias */
  enhancementActive: boolean
  /** True on classic path — consumer treats as identity / no ambient bias */
  noop: boolean
  postureHint: AmbientPostureHint
  priorityBias: AmbientNpcPriorityBias
  emotionLabel?: AmbientEmotionDelta['label']
  confidence: number
  source?: AmbientEmotionDelta['source']
  physiologyHeld: true
  /** Hard rule: ambient never writes Rapier impulses / joint torques itself */
  autoApplyForces: false
  /**
   * Honest Law III flip (letter bb): false only when muscle/balance apply path
   * + Rapier substrate are real. CSI remains independent (`physiologyHeld`).
   */
  activeRagdollHeld: boolean
}

/** Classic identity port — Zero-UI default when CSI missing / enhancement off. */
export function buildClassicAmbientPhysicsPort(
  options?: AmbientPhysicsPortOptions,
): AmbientPhysicsPort {
  return {
    enhancementActive: false,
    noop: true,
    postureHint: 'classic',
    priorityBias: 'normal',
    confidence: 0,
    physiologyHeld: true,
    autoApplyForces: false,
    activeRagdollHeld: options?.activeRagdollHeld ?? true,
  }
}

export function postureHintFromEmotion(
  label: AmbientEmotionDelta['label'],
): AmbientPostureHint {
  switch (label) {
    case 'panicked':
      return 'flinch_ready'
    case 'stressed':
      return 'tense'
    case 'absent':
      return 'idle_absent'
    case 'calm':
    default:
      return 'relaxed'
  }
}

export function priorityBiasFromEmotion(
  label: AmbientEmotionDelta['label'],
): AmbientNpcPriorityBias {
  switch (label) {
    case 'panicked':
      return 'critical'
    case 'stressed':
      return 'elevated'
    case 'absent':
      return 'low'
    case 'calm':
    default:
      return 'normal'
  }
}

/**
 * Build physics port from emotion when enhancement is active.
 * When enhancementActive is false → classic no-op (ignore emotion body).
 * `activeRagdollHeld` defaults true until Law III apply honesty stamps ready (bb).
 */
export function buildAmbientPhysicsPort(
  emotion: AmbientEmotionDelta | undefined,
  options: { enhancementActive: boolean } & AmbientPhysicsPortOptions,
): AmbientPhysicsPort {
  if (!options.enhancementActive || !emotion) {
    return buildClassicAmbientPhysicsPort({
      activeRagdollHeld: options.activeRagdollHeld,
    })
  }
  return {
    enhancementActive: true,
    noop: false,
    postureHint: postureHintFromEmotion(emotion.label),
    priorityBias: priorityBiasFromEmotion(emotion.label),
    emotionLabel: emotion.label,
    confidence: emotion.confidence,
    source: emotion.source,
    physiologyHeld: true,
    autoApplyForces: false,
    activeRagdollHeld: options.activeRagdollHeld ?? true,
  }
}

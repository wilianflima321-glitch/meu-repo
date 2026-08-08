/**
 * Law XVI Trava III — VideoToMechanic scaffold extractor
 * Output = State Machine + Behavior Tree scaffold ONLY. Never auto-wires physics / "video → GTA".
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('video-to-scaffold-extractor')

export interface VideoScaffoldClipMeta {
  clipId: string
  durationMs: number
  label?: string
}

export interface StateMachineScaffold {
  id: string
  name: string
  states: Array<{ id: string; label: string }>
  transitions: Array<{ from: string; to: string; event: string }>
}

export interface BehaviorTreeScaffold {
  id: string
  name: string
  root: {
    type: 'selector' | 'sequence'
    children: Array<{ type: 'action' | 'condition'; id: string; label: string; stub: true }>
  }
}

export interface VideoToMechanicScaffoldResult {
  success: true
  scaffoldId: string
  stateMachine: StateMachineScaffold
  behaviorTree: BehaviorTreeScaffold
  /** Explicit: user must wire physics/GAS in Visual Script — never auto */
  physicsWiringRequired: true
  autoPhysics: false
  evidenceNote: string
}

export interface VideoToMechanicDenied {
  success: false
  reason: 'invalid_clip' | 'marketing_claim_rejected'
  message: string
}

/**
 * Extract BT + SM scaffold from coarse clip labels. Does NOT invent playable combat.
 */
export function extractVideoToMechanicScaffold(input: {
  projectId: string
  clips: VideoScaffoldClipMeta[]
  missionLabel?: string
}): VideoToMechanicScaffoldResult | VideoToMechanicDenied {
  if (!input.clips.length) {
    return {
      success: false,
      reason: 'invalid_clip',
      message: 'At least one clip meta required',
    }
  }

  const mission = input.missionLabel?.trim() || 'VideoMechanic'
  if (/gta|playable aaa|full physics|auto combat/i.test(mission)) {
    log.warn('trava_iii_marketing_rejected', { mission })
    return {
      success: false,
      reason: 'marketing_claim_rejected',
      message:
        'Trava III: VideoToMechanic cannot claim video→playable AAA / auto physics. Use scaffold-only mission labels.',
    }
  }

  const states = input.clips.map((c, i) => ({
    id: `state_${i}_${slug(c.label || c.clipId)}`,
    label: c.label || `Clip ${i + 1}`,
  }))

  const transitions = states.slice(0, -1).map((s, i) => ({
    from: s.id,
    to: states[i + 1].id,
    event: `advance_${i}`,
  }))

  const scaffoldId = `v2m_${createHash('sha256')
    .update(`${input.projectId}:${states.map((s) => s.id).join('|')}`)
    .digest('hex')
    .slice(0, 12)}`

  const result: VideoToMechanicScaffoldResult = {
    success: true,
    scaffoldId,
    stateMachine: {
      id: `sm_${scaffoldId}`,
      name: `${mission} StateMachine`,
      states,
      transitions,
    },
    behaviorTree: {
      id: `bt_${scaffoldId}`,
      name: `${mission} BehaviorTree`,
      root: {
        type: 'sequence',
        children: states.map((s) => ({
          type: 'action' as const,
          id: `act_${s.id}`,
          label: `USER_WIRE: ${s.label}`,
          stub: true as const,
        })),
      },
    },
    physicsWiringRequired: true,
    autoPhysics: false,
    evidenceNote:
      'Scaffold only — user must wire physics/GAS in Visual Script. Capsule proxies are not shipped characters.',
  }

  log.info('video_scaffold_extracted', {
    scaffoldId,
    states: states.length,
    projectId: input.projectId,
  })

  return result
}

/** @deprecated Use extractVideoToMechanicScaffold — kept for CLAUDE.md contract alias */
export const extractMechanicScaffoldFromVideo = extractVideoToMechanicScaffold

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || randomUUID().slice(0, 6)
}

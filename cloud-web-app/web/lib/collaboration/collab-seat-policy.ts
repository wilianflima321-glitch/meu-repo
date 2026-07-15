/**
 * Block 2A.4 — Yjs write seats vs spectator from plans.ts extras.
 * Overflow joiners become spectators (not hard 403) when yjsSpectatorAllowed.
 */

import { getPlanById } from '@/lib/plans'

export type CollabSeatRole = 'write' | 'spectator'

export interface CollabSeatDecision {
  role: CollabSeatRole
  writeSeats: number
  writeSeatsUsed: number
  spectatorAllowed: boolean
  reason: string
}

export function resolveCollabSeat(input: {
  planId: string
  /** Current writers already in the room (excluding this joiner) */
  roomWriteCount: number
}): CollabSeatDecision {
  const plan = getPlanById(input.planId.replace(/_trial$/, ''))
  const writeSeats =
    typeof plan?.extras?.yjsWriteSeats === 'number' ? plan.extras.yjsWriteSeats : 0
  const spectatorAllowed = plan?.extras?.yjsSpectatorAllowed !== false

  if (writeSeats <= 0) {
    if (spectatorAllowed) {
      return {
        role: 'spectator',
        writeSeats: 0,
        writeSeatsUsed: input.roomWriteCount,
        spectatorAllowed: true,
        reason: 'Plan has zero write seats — joining as spectator.',
      }
    }
    return {
      role: 'spectator',
      writeSeats: 0,
      writeSeatsUsed: input.roomWriteCount,
      spectatorAllowed: false,
      reason: 'Plan has zero write seats and spectator is not allowed.',
    }
  }

  if (input.roomWriteCount < writeSeats) {
    return {
      role: 'write',
      writeSeats,
      writeSeatsUsed: input.roomWriteCount + 1,
      spectatorAllowed,
      reason: `Write seat ${input.roomWriteCount + 1} of ${writeSeats}.`,
    }
  }

  return {
    role: 'spectator',
    writeSeats,
    writeSeatsUsed: input.roomWriteCount,
    spectatorAllowed,
    reason: spectatorAllowed
      ? `Write seats full (${writeSeats}) — joining as spectator.`
      : `Write seats full (${writeSeats}) — spectator not allowed on this plan.`,
  }
}

export function canApplyYjsWrite(role: CollabSeatRole): boolean {
  return role === 'write'
}

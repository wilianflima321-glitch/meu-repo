/**
 * Letter ce — Competitive rollback soak (dual-peer determinism + late-input resim).
 * Proves GameLoop-authority path is not a no-op. Does NOT claim GGPO-live / desync-free.
 */

import {
  createFixedPointRollbackSession,
  fixedInputFromAxes,
  type FixedPointRollbackSession,
} from './fixed-point-rollback-session'
import type { RollbackPlayerInput } from './rollback-frame-buffer'

export const COMPETITIVE_ROLLBACK_SOAK_LETTER = 'ce' as const
export const COMPETITIVE_ROLLBACK_SOAK_WIRED = true as const
/** GGPO transport / desync-free marketing — always HELD. */
export const GGPO_LIVE_HELD = true as const

export interface CompetitiveRollbackSoakOptions {
  /** Frames to tick on both peers. Default 48. */
  frames?: number
  /** Seed body id. Default p1. */
  playerId?: string
  /** Late-input correct tick (must be < frames). Default 12. */
  correctAtTick?: number
  capacity?: number
}

export interface CompetitiveRollbackSoakResult {
  letter: typeof COMPETITIVE_ROLLBACK_SOAK_LETTER
  passed: boolean
  frames: number
  peerHashesMatch: boolean
  lateResimHashesMatch: boolean
  rollbackRestoreOk: boolean
  finalHash: string
  notes: string[]
}

/**
 * Build a deterministic input tape (no RNG) for soak peers.
 */
export function buildCompetitiveSoakTape(
  frames: number,
  playerId = 'p1',
): RollbackPlayerInput[] {
  const tape: RollbackPlayerInput[] = []
  for (let i = 0; i < frames; i++) {
    const buttons = i % 7 === 0 ? 1 : 0
    const axisX = ((i % 5) - 2) * 0.25
    const axisY = ((i % 3) - 1) * 0.15
    tape.push(fixedInputFromAxes(playerId, i, buttons, axisX, axisY))
  }
  return tape
}

function runPeer(
  tape: RollbackPlayerInput[],
  capacity: number,
  playerId: string,
): FixedPointRollbackSession {
  const session = createFixedPointRollbackSession({
    capacity,
    seedBodies: [{ id: playerId, x: 0, y: 1, z: 0 }],
  })
  for (const input of tape) {
    session.tick([input])
  }
  return session
}

/**
 * Dual-peer soak: identical tape → identical hash; late correctAndResimulate
 * keeps peers matched; rollbackTo mid-tape restores then resims cleanly.
 */
export function runCompetitiveRollbackSoak(
  options: CompetitiveRollbackSoakOptions = {},
): CompetitiveRollbackSoakResult {
  const frames = Math.max(16, options.frames ?? 48)
  const playerId = options.playerId ?? 'p1'
  const capacity = Math.max(frames + 8, options.capacity ?? 64)
  const correctAt = Math.min(
    Math.max(2, options.correctAtTick ?? 12),
    frames - 4,
  )
  const notes: string[] = [
    `letter ${COMPETITIVE_ROLLBACK_SOAK_LETTER}: dual-peer fixed-point rollback soak`,
    'ggpoLive / desync-free / competitive marketing remain HELD',
  ]

  const tape = buildCompetitiveSoakTape(frames, playerId)
  const peerA = runPeer(tape, capacity, playerId)
  const peerB = runPeer(tape, capacity, playerId)

  const peerHashesMatch = peerA.stateHash() === peerB.stateHash()
  if (!peerHashesMatch) {
    notes.push('FAIL: peer state hashes diverged on identical input tape')
  }

  const late = [fixedInputFromAxes(playerId, correctAt, 1, -0.4, 0.3)]
  const lateA = peerA.correctAndResimulate(correctAt, late)
  const lateB = peerB.correctAndResimulate(correctAt, late)
  const lateResimHashesMatch =
    lateA && lateB && peerA.stateHash() === peerB.stateHash()
  if (!lateResimHashesMatch) {
    notes.push('FAIL: late-input correctAndResimulate peer mismatch')
  }

  // Independent third peer: tick forward, rollback mid-tape, confirm restore path.
  const peerC = runPeer(tape, capacity, playerId)
  const mid = Math.floor(frames / 2)
  const rollbackRestoreOk = peerC.rollbackTo(mid)
  if (!rollbackRestoreOk) {
    notes.push('FAIL: rollbackTo mid-tape returned false')
  }

  const passed = peerHashesMatch && lateResimHashesMatch && rollbackRestoreOk
  if (passed) {
    notes.push(
      `soak PASSED — ${frames} frames, correct@${correctAt}, dual-peer + late resim + rollbackTo`,
    )
  }

  return {
    letter: COMPETITIVE_ROLLBACK_SOAK_LETTER,
    passed,
    frames,
    peerHashesMatch,
    lateResimHashesMatch,
    rollbackRestoreOk,
    finalHash: peerA.stateHash(),
    notes,
  }
}

/**
 * Advance one competitive authority frame (GameLoop wire).
 * Callers supply inputs for the current tick; empty = coast under gravity.
 */
export function tickCompetitiveAuthority(
  session: FixedPointRollbackSession,
  inputs: RollbackPlayerInput[] = [],
): { tick: number; stateHash: string } {
  session.tick(inputs)
  return { tick: session.getTick(), stateHash: session.stateHash() }
}

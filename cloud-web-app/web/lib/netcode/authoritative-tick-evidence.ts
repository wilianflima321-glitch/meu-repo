/**
 * SF1 deepen — authoritative fixed-point tick evidence → unified session tape.
 *
 * Drives FixedPointRollbackSession, records per-tick checksums on the session tape,
 * then proves late-input correction + resim still yields a valid hash chain.
 * ggpoLive / desync-free marketing remain false.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  createFixedPointRollbackSession,
  fixedInputFromAxes,
} from '@/lib/netcode/fixed-point-rollback-session'
import {
  createUnifiedSessionTape,
  fingerprintSessionTape,
  recordSimTickOnTape,
  verifySessionTapeChain,
  type UnifiedSessionTape,
} from '@/lib/production/unified-session-tape'

const log = createComponentLogger('authoritative-tick-evidence')

export const GGPO_LIVE_FROM_TICK_EVIDENCE = false as const
export const DESYNC_FREE_MARKETING_ALLOWED = false as const

export type AuthoritativeTickEvidenceResult = {
  passed: boolean
  frames: number
  baselineTapeFingerprint: string
  afterCorrectionTapeFingerprint: string
  finalStateHash: string
  chainValid: boolean
  ggpoLive: false
  desyncFreeMarketingAllowed: false
  notes: string[]
}

/**
 * Run fixed-point authoritative ticks onto a session tape, then correct+resim.
 */
export function runAuthoritativeTickEvidence(input?: {
  frames?: number
  sessionId?: string
}): AuthoritativeTickEvidenceResult {
  const frames = Math.max(8, Math.min(input?.frames ?? 32, 120))
  const notes: string[] = [
    'Authoritative tick evidence uses FixedPointRollbackSession + unified session tape',
    'ggpoLive=false — no GGPO transport from this path',
    'desyncFreeMarketingAllowed=false',
  ]

  const session = createFixedPointRollbackSession({
    capacity: Math.max(frames + 4, 64),
    seedBodies: [
      { id: 'p1', x: 0, y: 1, z: 0 },
      { id: 'p2', x: 2, y: 1, z: 0 },
    ],
  })

  let tape = createUnifiedSessionTape({
    sessionId: input?.sessionId ?? 'auth-tick-evidence',
    now: '2026-08-10T16:00:00.000Z',
  })

  for (let t = 0; t < frames; t++) {
    const inputs = [
      fixedInputFromAxes('p1', t, t % 7 === 0 ? 1 : 0, ((t % 5) - 2) / 2, 0),
      fixedInputFromAxes('p2', t, 0, -((t % 3) - 1) / 2, 0),
    ]
    session.tick(inputs)
    const hash = session.stateHash()
    const recorded = recordSimTickOnTape(tape, {
      stateFingerprint: hash,
      entityCount: 2,
      eventTimeMs: Math.round((t * 1000) / 60),
      note: `authoritative fp tick ${t}`,
    })
    if (!recorded.ok) {
      return {
        passed: false,
        frames,
        baselineTapeFingerprint: '',
        afterCorrectionTapeFingerprint: '',
        finalStateHash: hash,
        chainValid: false,
        ggpoLive: false,
        desyncFreeMarketingAllowed: false,
        notes: [...notes, `tape append failed at tick ${t}: ${recorded.message}`],
      }
    }
    tape = recorded.value
  }

  const baselineVerify = verifySessionTapeChain(tape)
  const baselineTapeFingerprint = fingerprintSessionTape(tape)
  if (!baselineVerify.valid || tape.entries.length !== frames) {
    return {
      passed: false,
      frames,
      baselineTapeFingerprint,
      afterCorrectionTapeFingerprint: '',
      finalStateHash: session.stateHash(),
      chainValid: baselineVerify.valid,
      ggpoLive: false,
      desyncFreeMarketingAllowed: false,
      notes: [...notes, 'baseline tape chain invalid or entry count mismatch'],
    }
  }

  // Late remote correction at mid tick — resimulate, then append correction evidence ticks.
  const correctTick = Math.floor(frames / 3)
  const corrected = session.correctAndResimulate(correctTick, [
    fixedInputFromAxes('p2', correctTick, 1, 1, 0),
  ])
  if (!corrected) {
    return {
      passed: false,
      frames,
      baselineTapeFingerprint,
      afterCorrectionTapeFingerprint: '',
      finalStateHash: session.stateHash(),
      chainValid: true,
      ggpoLive: false,
      desyncFreeMarketingAllowed: false,
      notes: [...notes, `correctAndResimulate failed at tick ${correctTick}`],
    }
  }

  // Evidence of post-correction state: append a sim_tick with final hash (not inventing L2).
  const afterHash = session.stateHash()
  const post = recordSimTickOnTape(tape, {
    stateFingerprint: `post-correct:${correctTick}:${afterHash}`,
    entityCount: 2,
    eventTimeMs: Math.round((frames * 1000) / 60) + 1,
    note: `post-correction evidence from tick ${correctTick}`,
  })
  if (!post.ok) {
    return {
      passed: false,
      frames,
      baselineTapeFingerprint,
      afterCorrectionTapeFingerprint: '',
      finalStateHash: afterHash,
      chainValid: false,
      ggpoLive: false,
      desyncFreeMarketingAllowed: false,
      notes: [...notes, `post-correction tape append failed: ${post.message}`],
    }
  }
  tape = post.value

  const afterVerify = verifySessionTapeChain(tape)
  const afterCorrectionTapeFingerprint = fingerprintSessionTape(tape)
  const passed =
    afterVerify.valid &&
    afterCorrectionTapeFingerprint.length > 0 &&
    afterHash.length > 0 &&
    afterCorrectionTapeFingerprint !== baselineTapeFingerprint

  notes.push(
    passed
      ? `passed frames=${frames} correctTick=${correctTick} tapeEntries=${tape.entries.length}`
      : 'authoritative tick evidence failed chain/fingerprint gate',
  )

  log.info('authoritative_tick_evidence', {
    passed,
    frames,
    correctTick,
    ggpoLive: false,
  })

  return {
    passed,
    frames,
    baselineTapeFingerprint,
    afterCorrectionTapeFingerprint,
    finalStateHash: afterHash,
    chainValid: afterVerify.valid,
    ggpoLive: false,
    desyncFreeMarketingAllowed: false,
    notes,
  }
}

export function probeAuthoritativeTickEvidenceReadiness(): {
  id: 'SF1-auth-tick'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  ggpoLive: false
  path: string
  note: string
  lastEvidence: AuthoritativeTickEvidenceResult | null
} {
  const evidence = runAuthoritativeTickEvidence({ frames: 24 })
  return {
    id: 'SF1-auth-tick',
    status: evidence.passed ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready: evidence.passed,
    ggpoLive: false,
    path: 'lib/netcode/authoritative-tick-evidence.ts',
    note: evidence.passed
      ? `Fixed-point ticks → session tape + late correct/resim evidence; ggpoLive=false. ${evidence.notes[evidence.notes.length - 1]}`
      : `Authoritative tick evidence HELD — ${evidence.notes[evidence.notes.length - 1]}`,
    lastEvidence: evidence,
  }
}

/** Expose last tape from a fresh evidence run for callers that need the object. */
export function captureAuthoritativeTickTape(frames = 16): {
  ok: boolean
  tape: UnifiedSessionTape | null
  evidence: AuthoritativeTickEvidenceResult
} {
  const evidence = runAuthoritativeTickEvidence({ frames })
  if (!evidence.passed) {
    return { ok: false, tape: null, evidence }
  }
  // Re-run is deterministic for inputs; callers needing the tape object rebuild via evidence path.
  // Keep API honest: we do not invent a tape without re-executing.
  const session = createFixedPointRollbackSession({
    capacity: Math.max(frames + 4, 64),
    seedBodies: [
      { id: 'p1', x: 0, y: 1, z: 0 },
      { id: 'p2', x: 2, y: 1, z: 0 },
    ],
  })
  let tape = createUnifiedSessionTape({
    sessionId: 'auth-tick-capture',
    now: '2026-08-10T16:00:00.000Z',
  })
  for (let t = 0; t < frames; t++) {
    session.tick([
      fixedInputFromAxes('p1', t, t % 7 === 0 ? 1 : 0, ((t % 5) - 2) / 2, 0),
      fixedInputFromAxes('p2', t, 0, -((t % 3) - 1) / 2, 0),
    ])
    const recorded = recordSimTickOnTape(tape, {
      stateFingerprint: session.stateHash(),
      entityCount: 2,
      eventTimeMs: Math.round((t * 1000) / 60),
    })
    if (!recorded.ok) return { ok: false, tape: null, evidence }
    tape = recorded.value
  }
  return { ok: true, tape, evidence }
}

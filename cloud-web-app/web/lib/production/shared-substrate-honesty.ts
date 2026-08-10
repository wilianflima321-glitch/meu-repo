/**
 * Engine + Finance shared substrate honesty — determinism, replay, audit chain, timebase.
 * Fail-closed: `sharedSubstrateReady` false until web soak + evidence chain pass.
 * Vanguard Quant (FIX/order book/HFT) always HELD — spec-only until Onda N ships.
 */

import { probeCompetitiveRollbackHonesty } from '@/lib/netcode/competitive-rollback-honesty'
import { runDeterministicReplayFixture } from '@/lib/networking/deterministic-rollback-replay'
import { probeMonotonicTimebaseReadiness } from '@/lib/production/monotonic-timebase'
import {
  appendChainedTaskEvidence,
  createTaskEvidenceLedger,
  fingerprintEvidenceLedger,
  verifyEvidenceAuditChain,
} from '@/lib/production/task-evidence-ledger'
import { probeSessionTapeReadiness } from '@/lib/production/unified-session-tape'
import { probeSignedWormReadiness } from '@/lib/production/signed-worm-evidence-store'

export const VANGUARD_QUANT_FINANCE_READY = false as const
export const FIX_PROTOCOL_READY = false as const
export const HFT_MARKETING_ALLOWED = false as const

export interface SharedSubstrateHonestyReport {
  /** Dual-use substrate (games replay + audit chain) — not quant trading. */
  sharedSubstrateReady: boolean
  /** SF1 — fixed-tick session tape with hash chain (sim + paper trade anchors). */
  sf1SessionTapeReady: boolean
  sf1Status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  /** SF2 — signed WORM evidence store (HMAC + optional durable JSONL). */
  sf2SignedWormReady: boolean
  sf2Status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  /** SF3 — sim-tick vs wall isolation + optional exchange timestamp hook. */
  sf3MonotonicTimebaseReady: boolean
  sf3Status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  deterministicWebReplayReady: boolean
  competitiveRollbackSoakReady: boolean
  evidenceAuditChainReady: boolean
  monotonicTimebaseReady: boolean
  /** Always false — Onda N / Vanguard Quant not implemented in kernel. */
  vanguardQuantFinanceReady: typeof VANGUARD_QUANT_FINANCE_READY
  fixProtocolReady: typeof FIX_PROTOCOL_READY
  hftMarketingAllowed: typeof HFT_MARKETING_ALLOWED
  webReplayBaselineHash: string
  webReplayReplayHash: string
  evidenceLedgerFingerprint: string
  sessionTapeFingerprint: string
  sessionTapeEntryCount: number
  wormFingerprint: string
  wormEntryCount: number
  notes: string[]
}

function proveEvidenceAuditChainSample(): boolean {
  const base = createTaskEvidenceLedger({
    taskId: 'substrate-audit-sample',
    projectId: 'substrate-probe',
    mission: 'Shared substrate audit chain sample',
    ownerAgent: 'substrate-probe',
    now: '2026-08-10T12:00:00.000Z',
  })
  const chained = appendChainedTaskEvidence(base, {
    kind: 'deterministic-replay',
    title: 'Deterministic replay soak',
    summary: 'Web rollback ring baseline==replay',
    refs: ['substrate:web-replay'],
    actor: 'substrate-probe',
    createdAt: '2026-08-10T12:00:01.000Z',
  })
  const audit = appendChainedTaskEvidence(chained, {
    kind: 'audit-chain',
    title: 'Audit chain link',
    summary: 'Append-only evidence digest',
    refs: ['substrate:audit-chain'],
    actor: 'substrate-probe',
    createdAt: '2026-08-10T12:00:02.000Z',
  })
  return verifyEvidenceAuditChain(audit).valid
}

/**
 * Probe shared substrate readiness for games + institutional audit posture.
 * Does not claim finance execution, FIX, or colocation.
 */
export function probeSharedSubstrateHonesty(): SharedSubstrateHonestyReport {
  const notes: string[] = [
    'Shared substrate = determinism + replay + append-only evidence — not Vanguard Quant trading',
    'vanguardQuantFinanceReady=false — no FIX/order book/blind-brain vault in repo',
    '§23 silent shadow telemetry FORBIDDEN — consent-gated only; GPU Priority Mux HELD',
  ]

  const replay = runDeterministicReplayFixture()
  const deterministicWebReplayReady =
    replay.baselineHash === replay.replayHash &&
    replay.afterRollbackA === replay.afterRollbackB &&
    replay.baselineHash.length > 0

  if (!deterministicWebReplayReady) {
    notes.push('deterministicWebReplayReady HELD — web rollback ring mismatch')
  }

  const competitive = probeCompetitiveRollbackHonesty({ forceSoak: true })
  notes.push(...competitive.notes.slice(0, 3))

  const evidenceAuditChainReady = proveEvidenceAuditChainSample()
  if (!evidenceAuditChainReady) {
    notes.push('evidenceAuditChainReady HELD — audit chain verification failed')
  }

  const sf3 = probeMonotonicTimebaseReadiness()
  const sf3MonotonicTimebaseReady = sf3.ready
  const sf3Status: SharedSubstrateHonestyReport['sf3Status'] = sf3.status
  const monotonicTimebaseReady = sf3MonotonicTimebaseReady
  if (!monotonicTimebaseReady) {
    notes.push('monotonicTimebaseReady HELD — SF3 sim/wall isolation probe failed')
  } else {
    notes.push(
      `sf3MonotonicTimebaseReady PARTIAL — ${sf3.note}; PTP / licensed exchange ingest HELD`,
    )
  }

  const sessionTape = probeSessionTapeReadiness()
  const sf1SessionTapeReady = sessionTape.ready && sessionTape.chainValid
  const sf1Status: SharedSubstrateHonestyReport['sf1Status'] = sf1SessionTapeReady
    ? 'PARTIAL'
    : 'NOT_IMPLEMENTED'
  if (!sf1SessionTapeReady) {
    notes.push('sf1SessionTapeReady HELD — unified session tape chain verify failed')
  } else {
    notes.push(
      `sf1SessionTapeReady PARTIAL — ${sessionTape.entryCount} entries @ ${sessionTape.tickHz}Hz; no full GameLoop wire`,
    )
  }

  const worm = probeSignedWormReadiness()
  const sf2SignedWormReady = worm.ready && worm.chainValid
  const sf2Status: SharedSubstrateHonestyReport['sf2Status'] = worm.status
  if (!sf2SignedWormReady) {
    notes.push('sf2SignedWormReady HELD — signed WORM chain/signature verify failed')
  } else {
    notes.push(
      `sf2SignedWormReady PARTIAL — HMAC-signed WORM (${worm.entryCount} entries); durable optional; N3 trade-audit sink + cloud consent gate; Hub Coins isolated`,
    )
  }

  const sampleLedger = appendChainedTaskEvidence(
    createTaskEvidenceLedger({
      taskId: 'substrate-fingerprint',
      projectId: 'substrate-probe',
      mission: 'Fingerprint sample',
      ownerAgent: 'substrate-probe',
      now: '2026-08-10T12:00:00.000Z',
    }),
    {
      kind: 'audit-chain',
      title: 'Chain head',
      summary: 'Probe fingerprint anchor',
      refs: [],
      actor: 'substrate-probe',
    }
  )

  const sharedSubstrateReady =
    deterministicWebReplayReady &&
    competitive.competitiveRollbackSoakReady &&
    evidenceAuditChainReady &&
    monotonicTimebaseReady

  if (!sharedSubstrateReady) {
    notes.push('sharedSubstrateReady HELD — dual-use substrate incomplete')
  }

  return {
    sharedSubstrateReady,
    sf1SessionTapeReady,
    sf1Status,
    sf2SignedWormReady,
    sf2Status,
    sf3MonotonicTimebaseReady,
    sf3Status,
    deterministicWebReplayReady,
    competitiveRollbackSoakReady: competitive.competitiveRollbackSoakReady,
    evidenceAuditChainReady,
    monotonicTimebaseReady,
    vanguardQuantFinanceReady: VANGUARD_QUANT_FINANCE_READY,
    fixProtocolReady: FIX_PROTOCOL_READY,
    hftMarketingAllowed: HFT_MARKETING_ALLOWED,
    webReplayBaselineHash: replay.baselineHash,
    webReplayReplayHash: replay.replayHash,
    evidenceLedgerFingerprint: fingerprintEvidenceLedger(sampleLedger),
    sessionTapeFingerprint: sessionTape.fingerprint,
    sessionTapeEntryCount: sessionTape.entryCount,
    wormFingerprint: worm.fingerprint,
    wormEntryCount: worm.entryCount,
    notes,
  }
}

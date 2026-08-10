/**
 * Critic — G.% Evidence Ladder 15→30 band checklist (machine-readable).
 *
 * Each gate is pass | fail | held. Band uplift (`g3Band15To30Passed`) stays false
 * until a human Critic cites ALL gates + commit SHAs — this module never auto-passes
 * the band and never allows Progress / CapScore % bumps.
 *
 * Web/shared honesty only — does not invent engine product_present or 60s soak.
 * No Nanite / Lumen claims. No UI.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'
import {
  FRAME_PARITY_HARNESS_FIXTURE_ID,
  evaluateFrameParityHarnessReadiness,
} from '@/lib/production/frame-parity-harness-3b2'

const log = createComponentLogger('g3-band-15-to-30-critic-checklist')

export const G3_BAND_15_TO_30_CRITIC_LETTER = 'g3-critic-15-30' as const
export const G3_BAND_15_TO_30_CHECKLIST_ID = 'G3-BAND-15-30-CHECKLIST' as const

/** Band never auto-passes from this helper — Critic citation required. */
export const G3_BAND_15_TO_30_PASSED_FROM_CHECKLIST = false as const
export const NANITE_FROM_15_30_CHECKLIST = false as const
export const LUMEN_FROM_15_30_CHECKLIST = false as const

const THEATER_RE =
  /^(mock|fake|todo|tbd|placeholder|pending|n\/a|none|null|undefined|invent|example|empty|always.?pass)([:_-].*)?$/i

export type G3BandGateStatus = 'pass' | 'fail' | 'held'

export type G3Band15To30GateId =
  | 'pp03_persistent_loop'
  | 'session_ownership'
  | 'soak_60s_frame_graph'
  | 'parity_3b2_harness'
  | 'capscore_lock'
  | 'cargo_dual_stack'
  | 'changelog_index_sync'

export type G3Band15To30Gate = {
  id: G3Band15To30GateId
  status: G3BandGateStatus
  required: true
  reason: string
  evidenceFingerprint: string | null
}

export type G3Band15To30EvidenceInput = {
  /** Engine: PP-03 persistent loop proven (not secondary-only theater). */
  pp03PersistentLoopProven?: boolean
  /** Product session owns the present loop (not soak-orphan window). */
  sessionOwnedByProduct?: boolean
  /** Instant bag + IPC timings soak ≥60s with no pass-drop. */
  soak60sNoPassDrop?: boolean
  soakDurationSec?: number
  soakEvidenceFingerprint?: string
  /** product_present_ready from engine honesty — web never invents true. */
  productPresentReady?: boolean
  /** Dual-stack gates reported by CI / Critic (web cannot run cargo here). */
  cargoCheckGreen?: boolean
  cargoClippyGreen?: boolean
  /** Changelog + Index scorecard cite commits + fixture IDs. */
  changelogIndexSynced?: boolean
  criticCitationSha?: string
}

export type G3Band15To30ChecklistResult = {
  version: 1
  letter: typeof G3_BAND_15_TO_30_CRITIC_LETTER
  checklistId: typeof G3_BAND_15_TO_30_CHECKLIST_ID
  gates: G3Band15To30Gate[]
  /** Count helpers for honesty JSON. */
  passCount: number
  failCount: number
  heldCount: number
  allGatesPass: boolean
  /**
   * ALWAYS false from this module — even if allGatesPass.
   * Human Critic must cite SHAs before Progress/CapScore may move.
   */
  g3Band15To30Passed: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  proposedG3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  naniteReady: false
  lumenReady: false
  marketingAllowed: false
  evidenceFingerprint: string
  status: 'PARTIAL' | 'HELD' | 'FAIL'
  ready: boolean
  reason: string
  claim: string
}

export type RefuseProgressPercentBumpResult = {
  allowed: false
  proposedPercent: number
  lockedAt: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band15To30Passed: false
  reason: string
  checklistId: typeof G3_BAND_15_TO_30_CHECKLIST_ID
}

function isTheaterFingerprint(value: string | undefined): boolean {
  if (value === undefined) return false
  const t = value.trim()
  if (!t) return true
  return THEATER_RE.test(t)
}

function gate(
  id: G3Band15To30GateId,
  status: G3BandGateStatus,
  reason: string,
  evidenceFingerprint: string | null = null,
): G3Band15To30Gate {
  return { id, status, required: true, reason, evidenceFingerprint }
}

/**
 * Evaluate machine-readable 15→30 gates.
 * Defaults: 3B.2 harness + CapScore lock can pass from web evidence;
 * PP-03 / session / 60s soak stay HELD unless honest engine evidence is supplied.
 */
export function evaluateG3Band15To30CriticChecklist(
  evidence: G3Band15To30EvidenceInput = {},
): G3Band15To30ChecklistResult {
  const parity = evaluateFrameParityHarnessReadiness()
  const gates: G3Band15To30Gate[] = []

  // (1) PP-03 persistent loop — never invent from web.
  if (evidence.pp03PersistentLoopProven === true && evidence.productPresentReady === true) {
    // product_present_ready alone is not enough without session ownership; still record loop claim.
    gates.push(
      gate(
        'pp03_persistent_loop',
        'held',
        'PP-03 loop claimed with product_present_ready — still HELD until Studio session ownership + Critic cite (web refuse auto-pass)',
        null,
      ),
    )
  } else if (evidence.pp03PersistentLoopProven === true) {
    gates.push(
      gate(
        'pp03_persistent_loop',
        'held',
        'PP-03 persistent_loop_proven reported — product_present_ready still false / session wire open; band HELD',
        null,
      ),
    )
  } else if (evidence.pp03PersistentLoopProven === false) {
    gates.push(
      gate(
        'pp03_persistent_loop',
        'fail',
        'PP-03 persistent loop explicitly false — secondary_winit ≠ product present',
        null,
      ),
    )
  } else {
    gates.push(
      gate(
        'pp03_persistent_loop',
        'held',
        'PP-03 persistent present loop evidence absent (engine session wire HELD)',
        null,
      ),
    )
  }

  // Session ownership (product session owns present — not soak-orphan).
  if (evidence.sessionOwnedByProduct === true && evidence.pp03PersistentLoopProven === true) {
    gates.push(
      gate(
        'session_ownership',
        'held',
        'Session ownership claimed — Critic must verify Studio product session wire; web honesty refuse auto-pass',
        null,
      ),
    )
  } else if (evidence.sessionOwnedByProduct === false) {
    gates.push(
      gate(
        'session_ownership',
        'fail',
        'Session ownership explicitly false — present not owned by product session',
        null,
      ),
    )
  } else {
    gates.push(
      gate(
        'session_ownership',
        'held',
        'Product session ownership of present loop HELD (engine doing ownership work)',
        null,
      ),
    )
  }

  // (3) ≥60s Instant bag soak, no pass-drop.
  if (isTheaterFingerprint(evidence.soakEvidenceFingerprint)) {
    gates.push(
      gate(
        'soak_60s_frame_graph',
        'fail',
        '60s soak refused — theater/placeholder soakEvidenceFingerprint',
        null,
      ),
    )
  } else if (
    evidence.soak60sNoPassDrop === true &&
    typeof evidence.soakDurationSec === 'number' &&
    evidence.soakDurationSec >= 60 &&
    evidence.soakEvidenceFingerprint &&
    evidence.soakEvidenceFingerprint.trim().length >= 8
  ) {
    gates.push(
      gate(
        'soak_60s_frame_graph',
        'held',
        `60s soak fingerprint reported (${evidence.soakDurationSec}s) — Critic must verify Instant bag + no pass-drop; web refuse auto-pass`,
        evidence.soakEvidenceFingerprint.trim().slice(0, 16),
      ),
    )
  } else if (evidence.soak60sNoPassDrop === false) {
    gates.push(
      gate(
        'soak_60s_frame_graph',
        'fail',
        '60s frame-graph soak explicitly failed (pass-drop or duration)',
        null,
      ),
    )
  } else {
    gates.push(
      gate(
        'soak_60s_frame_graph',
        'held',
        '60s Instant bag + IPC soak evidence absent or incomplete (engine soak in flight)',
        null,
      ),
    )
  }

  // (4) 3B.2 harness exists — web can prove.
  if (parity.ready && parity.harnessExists) {
    gates.push(
      gate(
        'parity_3b2_harness',
        'pass',
        `3B.2 harness EXISTS (${FRAME_PARITY_HARNESS_FIXTURE_ID}) — band still HELD without PP-03+soak`,
        parity.evidenceFingerprint,
      ),
    )
  } else {
    gates.push(
      gate(
        'parity_3b2_harness',
        'fail',
        '3B.2 parity harness not ready — gate #4 fail-closed',
        null,
      ),
    )
  }

  // (7) CapScore lock intact at 15 until Critic cites full band.
  if (G3_CODE_DEPTH_PERCENT_LOCKED === 15) {
    gates.push(
      gate(
        'capscore_lock',
        'pass',
        'CapScore g3CodeDepthPercent locked at 15 — Progress % bump refused until Critic cites band',
        null,
      ),
    )
  } else {
    gates.push(
      gate(
        'capscore_lock',
        'fail',
        `CapScore lock violated — expected 15, got ${G3_CODE_DEPTH_PERCENT_LOCKED}`,
        null,
      ),
    )
  }

  // (5) cargo dual-stack — web cannot invent green.
  if (evidence.cargoCheckGreen === true && evidence.cargoClippyGreen === true) {
    gates.push(
      gate(
        'cargo_dual_stack',
        'held',
        'cargo check+clippy reported green — Critic must verify targeted GPU soak tests; web refuse auto-pass',
        null,
      ),
    )
  } else if (evidence.cargoCheckGreen === false || evidence.cargoClippyGreen === false) {
    gates.push(
      gate(
        'cargo_dual_stack',
        'fail',
        'cargo check and/or clippy -D warnings not green',
        null,
      ),
    )
  } else {
    gates.push(
      gate(
        'cargo_dual_stack',
        'held',
        'Rust dual-stack gates not reported to web Critic checklist',
        null,
      ),
    )
  }

  // (6) Changelog + Index sync.
  if (isTheaterFingerprint(evidence.criticCitationSha)) {
    gates.push(
      gate(
        'changelog_index_sync',
        'fail',
        'Changelog/Index citation refused — theater criticCitationSha',
        null,
      ),
    )
  } else if (evidence.changelogIndexSynced === true && evidence.criticCitationSha) {
    gates.push(
      gate(
        'changelog_index_sync',
        'held',
        'Changelog/Index sync claimed — human Critic must confirm scorecard SHAs',
        evidence.criticCitationSha.trim().slice(0, 16),
      ),
    )
  } else {
    gates.push(
      gate(
        'changelog_index_sync',
        'held',
        'Changelog + Index scorecard sync open until Critic cites commits + fixture IDs',
        null,
      ),
    )
  }

  const passCount = gates.filter((g) => g.status === 'pass').length
  const failCount = gates.filter((g) => g.status === 'fail').length
  const heldCount = gates.filter((g) => g.status === 'held').length
  const allGatesPass = gates.every((g) => g.status === 'pass')

  const evidenceFingerprint = createHash('sha256')
    .update(
      [
        G3_BAND_15_TO_30_CHECKLIST_ID,
        ...gates.map((g) => `${g.id}:${g.status}`),
        String(G3_CODE_DEPTH_PERCENT_LOCKED),
      ].join('|'),
    )
    .digest('hex')
    .slice(0, 16)

  const status: G3Band15To30ChecklistResult['status'] =
    failCount > 0 ? 'FAIL' : heldCount > 0 ? 'PARTIAL' : allGatesPass ? 'PARTIAL' : 'HELD'

  const result: G3Band15To30ChecklistResult = {
    version: 1,
    letter: G3_BAND_15_TO_30_CRITIC_LETTER,
    checklistId: G3_BAND_15_TO_30_CHECKLIST_ID,
    gates,
    passCount,
    failCount,
    heldCount,
    allGatesPass,
    g3Band15To30Passed: G3_BAND_15_TO_30_PASSED_FROM_CHECKLIST,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    proposedG3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    naniteReady: NANITE_FROM_15_30_CHECKLIST,
    lumenReady: LUMEN_FROM_15_30_CHECKLIST,
    marketingAllowed: false,
    evidenceFingerprint,
    status,
    ready: passCount >= 2 && failCount === 0,
    reason:
      '15→30 band HELD — Critic checklist machine-readable; g3Band15To30Passed=false; Progress % bump refused; PP-03/session/60s soak still open',
    claim: `G.% 15→30 Critic checklist ${status} — pass=${passCount} held=${heldCount} fail=${failCount}; CapScore locked ${G3_CODE_DEPTH_PERCENT_LOCKED}; Nanite/Lumen false; band NOT passed`,
  }

  log.info('g3_band_15_30_critic_checklist', {
    status: result.status,
    passCount,
    heldCount,
    failCount,
    g3Band15To30Passed: false,
    evidenceFingerprint,
  })

  return result
}

/**
 * Refuse Progress / CapScore % bumps — this helper never allows uplift.
 * Critic must edit G3_CODE_DEPTH_PERCENT_LOCKED only after citing every gate + SHAs.
 */
export function refuseG3ProgressPercentBump(input: {
  proposedPercent: number
  checklist?: G3Band15To30ChecklistResult
}): RefuseProgressPercentBumpResult {
  const proposed = Number(input.proposedPercent)
  const locked = G3_CODE_DEPTH_PERCENT_LOCKED
  let reason: string

  if (!Number.isFinite(proposed)) {
    reason = 'Progress % bump refused — proposedPercent not finite'
  } else if (proposed !== locked) {
    reason = `Progress % bump refused — proposed ${proposed} ≠ CapScore lock ${locked}; g3Band15To30Passed=false; Critic citation required`
  } else {
    reason = `Progress % bump refused — even proposed=${locked} cannot be written via helper; CapScore constant is Critic-owned after full band cite`
  }

  if (input.checklist?.allGatesPass) {
    reason += ' (allGatesPass machine-true still insufficient without human Critic SHA cite)'
  }

  log.info('g3_progress_percent_bump_refused', {
    proposed,
    locked,
    allowed: false,
  })

  return {
    allowed: false,
    proposedPercent: proposed,
    lockedAt: locked,
    g3Band15To30Passed: false,
    reason,
    checklistId: G3_BAND_15_TO_30_CHECKLIST_ID,
  }
}

export function evaluateG3Band15To30CriticReadiness(
  evidence: G3Band15To30EvidenceInput = {},
): {
  letter: typeof G3_BAND_15_TO_30_CRITIC_LETTER
  checklistId: typeof G3_BAND_15_TO_30_CHECKLIST_ID
  ready: boolean
  status: G3Band15To30ChecklistResult['status']
  g3Band15To30Passed: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  passCount: number
  heldCount: number
  failCount: number
  evidenceFingerprint: string
  naniteReady: false
  lumenReady: false
  reason: string
  gates: G3Band15To30Gate[]
} {
  const c = evaluateG3Band15To30CriticChecklist(evidence)
  return {
    letter: c.letter,
    checklistId: c.checklistId,
    ready: c.ready,
    status: c.status,
    g3Band15To30Passed: false,
    g3CodeDepthPercent: c.g3CodeDepthPercent,
    passCount: c.passCount,
    heldCount: c.heldCount,
    failCount: c.failCount,
    evidenceFingerprint: c.evidenceFingerprint,
    naniteReady: false,
    lumenReady: false,
    reason: c.reason,
    gates: c.gates,
  }
}

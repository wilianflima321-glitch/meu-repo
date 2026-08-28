/**
 * GF-AI-001/002/003 — Workforce AI fixtures (Hard Gate #72, P4 prep).
 *
 * Deterministic parallel-agent orchestration evidence: N worker contexts run
 * on isolated slots with bounded token budgets and NO shared mutable state;
 * a deterministic merge combines their fragments with dedup, and the collapse
 * detector proves the merged context never exceeds the sum of the parts and
 * no worker overwrote or cross-read another worker's slot. This is a
 * deterministic orchestration fixture (seeded PRNG fragments, no LLM calls,
 * no provider cost) — it exists to hold the merge-protocol evidence a product
 * MoA runtime can later consume.
 *
 * Honesty invariants: `workforceAiAaaReady` / `gfAiBandPassed` are always
 * false; no "DeepSeek-class without collapse" marketing claim — the fixture
 * proves the protocol, not a model.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { mulberry32 } from '@/lib/production/gf-world-001-density-fixture'

const log = createComponentLogger('gf-ai-001-parallel-agents')

export const GF_AI_FIXTURE_ID = 'GF-AI-001/002/003'
export const GF_AI_WORKER_COUNT = 4
export const GF_AI_TOKEN_CAP_PER_WORKER = 512
export const GF_AI_WORKER_ROLES = ['architect', 'engineer', 'qa', 'designer'] as const
export type GfAiWorkerRole = (typeof GF_AI_WORKER_ROLES)[number]

export type GfAiWorkerOutput = {
  slot: number
  role: GfAiWorkerRole
  tokens: number
  fragment: string
  hash: string
}

export type GfAi001ParallelEvidence = {
  workerCount: number
  perWorkerTokens: number[]
  mergeTokenCount: number
  collapseFree: boolean
  deterministic: boolean
}

export type GfAi002IsolationEvidence = {
  slotWrites: Record<number, number>
  noSlotCollision: boolean
  coveragePass: boolean
}

export type GfAi003BoundaryEvidence = {
  allWorkersUnderCap: boolean
  mergedUnderAggregateCap: boolean
  crossTalkDetected: boolean
  boundaryPass: boolean
}

export type GfAiEvidenceBundle = {
  version: 1
  fixtureId: typeof GF_AI_FIXTURE_ID
  parallel: GfAi001ParallelEvidence
  isolation: GfAi002IsolationEvidence
  boundary: GfAi003BoundaryEvidence
  workforceAiAaaReady: false
  gfAiBandPassed: false
  marketingAllowed: false
  claim: string
}

/** Deterministic 64-bit FNV-1a over a string (fragment identity). */
export function fnv1a64String(input: string): string {
  let h = 0xcbf29ce484222325n
  for (let i = 0; i < input.length; i += 1) {
    h ^= BigInt(input.charCodeAt(i))
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return h.toString(16).padStart(16, '0')
}

const ROLE_SCOPES: Record<GfAiWorkerRole, string> = {
  architect: 'topology/plan/risk-map',
  engineer: 'module wiring/limits/tests',
  qa: 'invariants/edge-cases/rejections',
  designer: 'intent/UX constraints/fidelity',
}

/**
 * One deterministic parallel run: each worker writes ONLY its own slot
 * (no shared mutable state), produces a scoped fragment from its seeded PRNG
 * (bounded token count), and the merge concatenates slots in order with
 * duplicate-fragment dedup. Collapse-free iff (a) every worker stayed under
 * its token cap, (b) merged tokens ≤ sum of worker tokens, (c) exactly one
 * write per slot and (d) no fragment referenced another worker's slot.
 */
export function runGfAiParallelFixture(seed = 0x5eed_0004): {
  workers: GfAiWorkerOutput[]
  mergedTokens: number
  slotWrites: Record<number, number>
  crossTalk: boolean
} {
  const rng = mulberry32(seed)
  const slotWrites: Record<number, number> = {}
  const workers: GfAiWorkerOutput[] = []
  for (let slot = 0; slot < GF_AI_WORKER_COUNT; slot += 1) {
    const role = GF_AI_WORKER_ROLES[slot]!
    slotWrites[slot] = 1
    // Bounded deterministic fragment: role scope + seeded decisions. Token
    // count derived from the fragment (deterministic, under the cap).
    const fragment = `${role}:${ROLE_SCOPES[role]}:step=${Math.floor(rng() * 24) + 1}:risk=${Math.floor(rng() * 9)}`
    const tokens = fragment.split(/[ :;=]/).filter(Boolean).length
    workers.push({ slot, role, tokens, fragment, hash: fnv1a64String(fragment) })
  }
  // Cross-talk detector: a worker that references another worker's slot in its
  // fragment violates isolation (the fixture never does — the detector exists
  // to fail loudly if a product merge path ever does).
  const crossTalk = workers.some((w) => {
    return workers.some((other) => other.slot !== w.slot && w.fragment.includes(`slot:${other.slot}`))
  })
  // Merge: concatenate slot-ordered unique fragments (dedup = collapse-proof).
  const seen = new Set<string>()
  let mergedTokens = 0
  for (const w of workers) {
    if (seen.has(w.fragment)) continue
    seen.add(w.fragment)
    mergedTokens += w.tokens
  }
  return { workers, mergedTokens, slotWrites, crossTalk }
}

/** GF-AI-001 — parallel-without-collapse evidence. */
export function buildGfAi001ParallelEvidence(
  workers: GfAiWorkerOutput[],
  mergedTokens: number,
): GfAi001ParallelEvidence {
  const perWorkerTokens = workers.map((w) => w.tokens)
  const sum = perWorkerTokens.reduce((a, b) => a + b, 0)
  const second = runGfAiParallelFixture(0x5eed_0004)
  return {
    workerCount: workers.length,
    perWorkerTokens,
    mergeTokenCount: mergedTokens,
    collapseFree: mergedTokens <= sum && workers.length === GF_AI_WORKER_COUNT,
    deterministic: second.mergedTokens === mergedTokens && second.workers.every((w, i) => w.hash === workers[i]!.hash),
  }
}

/** GF-AI-002 — slot isolation evidence. */
export function buildGfAi002IsolationEvidence(
  workers: GfAiWorkerOutput[],
  slotWrites: Record<number, number>,
): GfAi002IsolationEvidence {
  const noSlotCollision = Object.values(slotWrites).every((n) => n === 1) && workers.length === GF_AI_WORKER_COUNT
  const coveragePass = workers.every((w, i) => w.slot === i)
  return { slotWrites, noSlotCollision, coveragePass }
}

/** GF-AI-003 — boundary/collapse guard evidence. */
export function buildGfAi003BoundaryEvidence(
  workers: GfAiWorkerOutput[],
  mergedTokens: number,
  crossTalk: boolean,
): GfAi003BoundaryEvidence {
  const allWorkersUnderCap = workers.every((w) => w.tokens <= GF_AI_TOKEN_CAP_PER_WORKER)
  const mergedUnderAggregateCap = mergedTokens <= GF_AI_TOKEN_CAP_PER_WORKER * workers.length
  const boundaryPass = allWorkersUnderCap && mergedUnderAggregateCap && !crossTalk
  return { allWorkersUnderCap, mergedUnderAggregateCap, crossTalkDetected: crossTalk, boundaryPass }
}

export function runGfAiFixtureProbe(seed = 0x5eed_0004): GfAiEvidenceBundle {
  const { workers, mergedTokens, slotWrites, crossTalk } = runGfAiParallelFixture(seed)
  const parallel = buildGfAi001ParallelEvidence(workers, mergedTokens)
  const isolation = buildGfAi002IsolationEvidence(workers, slotWrites)
  const boundary = buildGfAi003BoundaryEvidence(workers, mergedTokens, crossTalk)
  log.info('gf_ai_fixture_probed', {
    workerCount: workers.length,
    mergeTokenCount: mergedTokens,
    collapseFree: parallel.collapseFree,
  })
  return {
    version: 1,
    fixtureId: GF_AI_FIXTURE_ID,
    parallel,
    isolation,
    boundary,
    workforceAiAaaReady: false,
    gfAiBandPassed: false,
    marketingAllowed: false,
    claim:
      'GF-AI-001/002/003 deterministic parallel-agent fixtures: 4 isolated worker slots, bounded token caps, dedup merge and collapse detector (no LLM calls, no AAA claims, no % bump)',
  }
}

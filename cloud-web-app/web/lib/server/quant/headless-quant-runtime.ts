/**
 * SF5 — Headless quant runtime probe (orders/ticks without UI).
 * Drives N6 SPSC ring + N7 math evidence; no FIX binary, no live broker, no RPA CV.
 * investmentGrade always false.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { createFinanceProjectVault } from '@/lib/server/quant/finance-domain-vault'
import {
  createMathematicalEvidenceReport,
  type MathematicalEvidenceReport,
} from '@/lib/server/quant/mathematical-evidence'
import { createSyntheticFixtureIngest } from '@/lib/server/quant/market-data-ingest'
import { createMarketTickSpscRing } from '@/lib/server/quant/tick-spsc-ring'

const log = createComponentLogger('headless-quant-runtime')

export const HEADLESS_FIX_BINARY_READY = false as const
export const HEADLESS_LIVE_BROKER_READY = false as const

export interface HeadlessQuantRuntimeReport {
  ranWithoutUi: true
  ticksIngested: number
  ticksDrained: number
  ringFingerprint: string
  evidence: MathematicalEvidenceReport
  fixBinaryReady: typeof HEADLESS_FIX_BINARY_READY
  liveBrokerReady: typeof HEADLESS_LIVE_BROKER_READY
  investmentGrade: false
  note: string
}

export type HeadlessRuntimeRejectCode = 'ring_create_failed' | 'ingest_failed' | 'evidence_failed'

export type HeadlessRuntimeResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: HeadlessRuntimeRejectCode; message: string }

/**
 * Run a headless paper/research tick soak — no React, no FIX session.
 */
export function runHeadlessQuantRuntimeProbe(input?: {
  projectId?: string
  strategyId?: string
}): HeadlessRuntimeResult<HeadlessQuantRuntimeReport> {
  const projectId = input?.projectId ?? 'sf5-headless'
  const strategyId = input?.strategyId ?? 'headless-probe'
  const vault = createFinanceProjectVault({ projectId, strategyCapitalUsd: 0 })

  const ringResult = createMarketTickSpscRing(16)
  if (!ringResult.ok) {
    return { ok: false, code: 'ring_create_failed', message: ringResult.message }
  }
  const ring = ringResult.value

  const ingest = createSyntheticFixtureIngest({
    label: 'SF5-headless-fixture',
    ticks: [
      { symbol: 'PROBE', price: 100, volume: 10, eventTimeMs: 1_000 },
      { symbol: 'PROBE', price: 101, volume: 12, eventTimeMs: 2_000 },
      { symbol: 'PROBE', price: 99.5, volume: 8, eventTimeMs: 3_000 },
    ],
  })

  let ticksIngested = 0
  for (const raw of [
    { symbol: 'PROBE', price: 100, volume: 10, eventTimeMs: 1_000 },
    { symbol: 'PROBE', price: 101, volume: 12, eventTimeMs: 2_000 },
    { symbol: 'PROBE', price: 99.5, volume: 8, eventTimeMs: 3_000 },
  ]) {
    const result = ingest.ingest(raw)
    if (!result.ok) {
      return { ok: false, code: 'ingest_failed', message: result.message }
    }
    const pushed = ring.tryPush(result.tick)
    if (!pushed.ok) {
      return { ok: false, code: 'ingest_failed', message: pushed.message }
    }
    ticksIngested += 1
  }

  const drained = ring.drain(16)
  const evidence = createMathematicalEvidenceReport({
    kind: 'headless_probe',
    projectId: vault.projectId,
    strategyId,
    summary: `Headless runtime drained ${drained.length} ticks without UI; FIX binary absent`,
    metrics: {
      ticksIngested,
      ticksDrained: drained.length,
      fixBinary: 0,
      liveBroker: 0,
    },
    refs: ['sf5:headless', ring.fingerprint(), vault.sealedYjsScope],
    createdAt: '2026-08-10T12:00:00.000Z',
  })
  if (!evidence.ok) {
    return { ok: false, code: 'evidence_failed', message: evidence.message }
  }

  const report: HeadlessQuantRuntimeReport = {
    ranWithoutUi: true,
    ticksIngested,
    ticksDrained: drained.length,
    ringFingerprint: ring.fingerprint(),
    evidence: evidence.value,
    fixBinaryReady: HEADLESS_FIX_BINARY_READY,
    liveBrokerReady: HEADLESS_LIVE_BROKER_READY,
    investmentGrade: false,
    note: 'Headless tick soak via N6 ring + N7 evidence — no FIX order router, no live broker',
  }

  log.info('headless_quant_runtime_probe', {
    projectId,
    ticksIngested,
    ticksDrained: drained.length,
    fixBinaryReady: false,
  })
  return { ok: true, value: report }
}

export function probeHeadlessQuantRuntimeReadiness(): {
  id: 'SF5'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  fixBinaryReady: false
  investmentGrade: false
} {
  const run = runHeadlessQuantRuntimeProbe()
  const ready =
    run.ok &&
    run.value.ranWithoutUi &&
    run.value.ticksDrained === 3 &&
    run.value.fixBinaryReady === false &&
    run.value.liveBrokerReady === false &&
    run.value.investmentGrade === false

  return {
    id: 'SF5',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/headless-quant-runtime.ts',
    note: ready
      ? 'Headless tick runtime probe (no UI) via SPSC ring; FIX binary / live order kernel still HELD.'
      : 'SF5 headless runtime probe failed.',
    fixBinaryReady: false,
    investmentGrade: false,
  }
}

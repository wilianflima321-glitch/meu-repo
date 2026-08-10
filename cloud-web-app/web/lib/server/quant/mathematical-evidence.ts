/**
 * N7 — Mathematical Evidence Report schema (JSON wire; Cap'n Proto HELD).
 * Zero-copy Cap'n Proto / FlatBuffers not shipped — schema + hash fingerprint only.
 * investmentGrade always false.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('mathematical-evidence')

export const MATH_EVIDENCE_SCHEMA_VERSION = 1 as const
export const CAPNP_MATH_EVIDENCE_READY = false as const

export type MathEvidenceKind =
  | 'pulse_veto'
  | 'regime_flag'
  | 'vpin_proxy'
  | 'risk_reject'
  | 'headless_probe'

export interface MathematicalEvidenceReport {
  schemaVersion: typeof MATH_EVIDENCE_SCHEMA_VERSION
  kind: MathEvidenceKind
  projectId: string
  strategyId: string
  /** Deterministic content digest of payload fields */
  evidenceHash: string
  createdAt: string
  /** Maestro may veto; Mini-IA never submits from this report alone */
  miniIaMaySubmit: false
  investmentGrade: false
  capnpReady: typeof CAPNP_MATH_EVIDENCE_READY
  payload: {
    summary: string
    metrics: Record<string, number>
    refs: string[]
  }
}

export type MathEvidenceRejectCode = 'invalid_input' | 'empty_summary'

export type MathEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: MathEvidenceRejectCode; message: string }

function stableMetrics(metrics: Record<string, number>): string {
  return Object.keys(metrics)
    .sort()
    .map((k) => `${k}=${metrics[k]}`)
    .join('&')
}

export function fingerprintMathEvidence(parts: {
  kind: MathEvidenceKind
  projectId: string
  strategyId: string
  summary: string
  metrics: Record<string, number>
  refs: string[]
  createdAt: string
}): string {
  const raw = [
    `v=${MATH_EVIDENCE_SCHEMA_VERSION}`,
    `kind=${parts.kind}`,
    `p=${parts.projectId}`,
    `s=${parts.strategyId}`,
    `sum=${parts.summary}`,
    `m=${stableMetrics(parts.metrics)}`,
    `r=${parts.refs.join(',')}`,
    `t=${parts.createdAt}`,
  ].join('|')
  return createHash('sha256').update(raw).digest('hex')
}

export function createMathematicalEvidenceReport(input: {
  kind: MathEvidenceKind
  projectId: string
  strategyId: string
  summary: string
  metrics?: Record<string, number>
  refs?: string[]
  createdAt?: string
}): MathEvidenceResult<MathematicalEvidenceReport> {
  if (!input.projectId?.trim() || !input.strategyId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId and strategyId required' }
  }
  const summary = input.summary?.trim() ?? ''
  if (!summary) {
    return { ok: false, code: 'empty_summary', message: 'evidence summary required' }
  }
  const metrics = input.metrics ?? {}
  for (const v of Object.values(metrics)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return { ok: false, code: 'invalid_input', message: 'metrics must be finite numbers' }
    }
  }
  const createdAt = input.createdAt ?? new Date().toISOString()
  const refs = input.refs ?? []
  const evidenceHash = fingerprintMathEvidence({
    kind: input.kind,
    projectId: input.projectId,
    strategyId: input.strategyId,
    summary,
    metrics,
    refs,
    createdAt,
  })

  const report: MathematicalEvidenceReport = {
    schemaVersion: MATH_EVIDENCE_SCHEMA_VERSION,
    kind: input.kind,
    projectId: input.projectId,
    strategyId: input.strategyId,
    evidenceHash,
    createdAt,
    miniIaMaySubmit: false,
    investmentGrade: false,
    capnpReady: CAPNP_MATH_EVIDENCE_READY,
    payload: { summary, metrics, refs },
  }

  log.info('math_evidence_created', {
    kind: report.kind,
    evidenceHash: report.evidenceHash.slice(0, 12),
    capnpReady: false,
  })
  return { ok: true, value: report }
}

export function probeMathematicalEvidenceReadiness(): {
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  capnpReady: false
  investmentGrade: false
} {
  const a = createMathematicalEvidenceReport({
    kind: 'pulse_veto',
    projectId: 'probe',
    strategyId: 's1',
    summary: 'VPIN proxy elevated — Maestro veto',
    metrics: { vpinProxy: 0.8 },
    refs: ['n7:pulse'],
    createdAt: '2026-08-10T12:00:00.000Z',
  })
  const b = createMathematicalEvidenceReport({
    kind: 'pulse_veto',
    projectId: 'probe',
    strategyId: 's1',
    summary: 'VPIN proxy elevated — Maestro veto',
    metrics: { vpinProxy: 0.8 },
    refs: ['n7:pulse'],
    createdAt: '2026-08-10T12:00:00.000Z',
  })
  const ready =
    a.ok &&
    b.ok &&
    a.value.evidenceHash === b.value.evidenceHash &&
    a.value.miniIaMaySubmit === false &&
    a.value.capnpReady === false &&
    a.value.investmentGrade === false

  return {
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/mathematical-evidence.ts',
    note: ready
      ? 'JSON Mathematical Evidence schema + fingerprint; Cap\'n Proto / FlatBuffers zero-copy bus HELD.'
      : 'Mathematical Evidence schema probe failed.',
    capnpReady: false,
    investmentGrade: false,
  }
}

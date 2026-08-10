/**
 * Chaos / destruction physics evidence (TS production path).
 *
 * Runs real FractureGraph strain → bond break → detach soak.
 * Never flips Chaos AAA / Unreal Chaos parity marketing flags.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  FractureGraph,
  type AdjacencyEdge,
  type ImpactEvent,
  type VoronoiCell,
} from '@/lib/physics/chaos-destruction'

const log = createComponentLogger('chaos-destruction-evidence')

/** Product marketing — always false until G.2 Chaos soak + Founder AAA gate. */
export const CHAOS_DESTRUCTION_AAA_READY = false as const
export const UNREAL_CHAOS_PARITY_READY = false as const
export const CHAOS_DESTRUCTION_MARKETING_ALLOWED = false as const

export type ChaosEvidenceRejectCode =
  | 'invalid_fixture'
  | 'no_bond_break'
  | 'empty_evidence'
  | 'aaa_claim_held'
  | 'parity_claim_held'

export type ChaosEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ChaosEvidenceRejectCode; message: string }

export type ChaosDestructionEvidence = {
  version: 1
  cellCount: number
  edgeCount: number
  brokenEdgeCount: number
  detachedCellCount: number
  peakStrain: number
  impactForceN: number
  fingerprint: string
  /** Always false — strain soak ≠ Chaos AAA. */
  chaosDestructionAaaReady: false
  unrealChaosParityReady: false
  marketingAllowed: false
}

function fingerprintEvidence(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

/** Minimal bond lattice for evidence soak (no mesh theater required). */
export function buildChaosEvidenceFixture(input?: {
  cellCount?: number
  tensileStrength?: number
  contactArea?: number
}): { cells: VoronoiCell[]; edges: AdjacencyEdge[] } {
  const cellCount = Math.max(3, Math.min(input?.cellCount ?? 6, 32))
  const tensile = input?.tensileStrength ?? 5e5
  const contactArea = input?.contactArea ?? 0.25

  const cells: VoronoiCell[] = []
  for (let i = 0; i < cellCount; i++) {
    const x = (i % 3) * 0.5
    const y = Math.floor(i / 3) * 0.5
    cells.push({
      id: `ev-cell-${i}`,
      centroid: [x, y, 0],
      geometry: new Float32Array([x, y, 0]),
      mass: 1,
      tensileStrength: tensile,
      rigidBodyHandle: null,
      spawned: false,
    })
  }

  const edges: AdjacencyEdge[] = []
  for (let i = 0; i < cellCount - 1; i++) {
    edges.push({
      id: `ev-edge-${i}-${i + 1}`,
      cellA: `ev-cell-${i}`,
      cellB: `ev-cell-${i + 1}`,
      contactArea,
      stressLimit: 1,
      broken: false,
    })
  }

  return { cells, edges }
}

/**
 * Apply impact to FractureGraph and seal measurable evidence.
 * Fail-closed if no bonds break (insufficient force / fixture).
 */
export function runChaosDestructionEvidenceSoak(input?: {
  impact?: Partial<ImpactEvent>
  fixture?: ReturnType<typeof buildChaosEvidenceFixture>
}): ChaosEvidenceResult<ChaosDestructionEvidence> {
  const fixture = input?.fixture ?? buildChaosEvidenceFixture()
  if (fixture.cells.length < 2 || fixture.edges.length < 1) {
    return { ok: false, code: 'invalid_fixture', message: 'Chaos evidence fixture needs ≥2 cells and ≥1 edge' }
  }

  const graph = new FractureGraph(fixture.cells, fixture.edges)
  const impact: ImpactEvent = {
    point: input?.impact?.point ?? [0.25, 0, 0],
    direction: input?.impact?.direction ?? [1, 0, 0],
    force: input?.impact?.force ?? 5e6,
    radius: input?.impact?.radius ?? 2,
  }

  // Peak strain estimate for evidence (same formula as FractureGraph).
  let peakStrain = 0
  for (const edge of fixture.edges) {
    const cellA = fixture.cells.find((c) => c.id === edge.cellA)
    const cellB = fixture.cells.find((c) => c.id === edge.cellB)
    if (!cellA || !cellB) continue
    const material = Math.min(cellA.tensileStrength, cellB.tensileStrength)
    const strain = impact.force / (edge.contactArea * material)
    peakStrain = Math.max(peakStrain, strain)
  }

  const result = graph.registerCollision(impact)
  if (result.brokenEdges.length === 0) {
    return {
      ok: false,
      code: 'no_bond_break',
      message: 'Chaos evidence soak produced zero bond breaks — refuse empty destruction evidence',
    }
  }

  const fingerprint = fingerprintEvidence([
    String(fixture.cells.length),
    String(fixture.edges.length),
    String(result.brokenEdges.length),
    String(result.detachedCells.length),
    peakStrain.toFixed(6),
    String(impact.force),
    ...result.brokenEdges.slice(0, 8),
  ])

  const evidence: ChaosDestructionEvidence = {
    version: 1,
    cellCount: fixture.cells.length,
    edgeCount: fixture.edges.length,
    brokenEdgeCount: result.brokenEdges.length,
    detachedCellCount: result.detachedCells.length,
    peakStrain,
    impactForceN: impact.force,
    fingerprint,
    chaosDestructionAaaReady: false,
    unrealChaosParityReady: false,
    marketingAllowed: false,
  }

  log.info('chaos_destruction_evidence_sealed', {
    fingerprint,
    broken: evidence.brokenEdgeCount,
    detached: evidence.detachedCellCount,
    peakStrain,
    aaa: false,
  })

  return { ok: true, value: evidence }
}

export function claimChaosDestructionAaa(): ChaosEvidenceResult<never> {
  return {
    ok: false,
    code: 'aaa_claim_held',
    message:
      'CHAOS_DESTRUCTION_AAA_READY=false — FractureGraph strain soak ≠ Unreal Chaos Destruction AAA',
  }
}

export function claimUnrealChaosParity(): ChaosEvidenceResult<never> {
  return {
    ok: false,
    code: 'parity_claim_held',
    message: 'UNREAL_CHAOS_PARITY_READY=false — no Chaos parity marketing from evidence soak',
  }
}

export function probeChaosDestructionEvidenceReadiness(): {
  id: 'chaos-destruction-evidence'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  chaosDestructionAaaReady: false
  unrealChaosParityReady: false
  marketingAllowed: false
  path: string
  note: string
} {
  const soak = runChaosDestructionEvidenceSoak()
  const weak = runChaosDestructionEvidenceSoak({
    impact: { force: 1, radius: 0.01, point: [100, 100, 100] },
  })
  const aaa = claimChaosDestructionAaa()
  const parity = claimUnrealChaosParity()

  const ready =
    soak.ok &&
    soak.value.brokenEdgeCount > 0 &&
    soak.value.fingerprint.length >= 8 &&
    soak.value.chaosDestructionAaaReady === false &&
    !weak.ok &&
    !aaa.ok &&
    !parity.ok &&
    CHAOS_DESTRUCTION_AAA_READY === false &&
    UNREAL_CHAOS_PARITY_READY === false &&
    CHAOS_DESTRUCTION_MARKETING_ALLOWED === false

  return {
    id: 'chaos-destruction-evidence',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    chaosDestructionAaaReady: false,
    unrealChaosParityReady: false,
    marketingAllowed: false,
    path: 'lib/destruction/chaos-destruction-evidence.ts',
    note: ready
      ? 'FractureGraph strain→break evidence PARTIAL; Chaos AAA / Unreal parity marketing HELD.'
      : 'Chaos destruction evidence probe failed.',
  }
}

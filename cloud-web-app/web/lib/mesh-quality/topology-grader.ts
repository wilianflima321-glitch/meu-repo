/**
 * Letter bw — Deterministic TS mirror of the kernel topology grader.
 *
 * Mirrors `AssetTopologyQuality::grade()` from
 * `packages/aethel-kernel-rust/src/asset_quality_gate.rs` BIT-EXACTLY so the web
 * Actor-Critic topology gate and the kernel can NEVER disagree on the same mesh.
 *
 * Penalties (weights): degenerate ×40, non-manifold ×30, open boundary ×15,
 * isolated vertex ×5. Grade = `100 − Σ(ratio × weight)`, clamped to [0,100] then
 * rounded half-away-from-zero (identical to Rust `f32::round()` for non-negative
 * inputs). `ready` = finite AND grade >= universal floor (60). The per-tier floor
 * (60/80/90/95) is applied by the verdict / critic — not here, mirroring the kernel.
 *
 * The kernel test `topology_grader_weights_match_the_ts_mirror` asserts the Rust
 * side against these same weights/floors — any drift fails both stacks.
 */

import type { GameAssetQualityTier } from '@/lib/production/game-asset-quality-pipeline'

export const KERNEL_TOPOLOGY_GRADER_MIRROR_WIRED = true as const

/** Kernel bw grader weights — MUST stay bit-identical to asset_quality_gate.rs. */
export const TOPOLOGY_GRADER_WEIGHTS = {
  degenerate: 40,
  nonManifold: 30,
  boundary: 15,
  isolated: 5,
} as const

/** Universal topology grade floor (kernel `AssetTopologyQuality::grade` ready). */
export const TOPOLOGY_GRADE_FLOOR = 60 as const

/** Per-tier minimum topology grade — mirror of `AssetQualityTier::min_topology_grade()`. */
export const TIER_MIN_TOPOLOGY_GRADES: Readonly<Record<GameAssetQualityTier, number>> = {
  'ai-draft': 60,
  'curated-marketplace': 80,
  'studio-local-optimized': 90,
  'cloud-render-grade': 95,
}

/** Metric report a mesh loader/cooker produces — kernel `AssetTopologyMetrics`. */
export interface AssetTopologyMetricsInput {
  vertices: number
  triangles: number
  degenerateFaces: number
  nonManifoldEdges: number
  openBoundaryLoops: number
  isolatedVertices: number
}

/** Malha com topologia perfeita (zero defeitos) — kernel `perfect_topology()`. */
export function perfectTopologyMetrics(vertices: number, triangles: number): AssetTopologyMetricsInput {
  return {
    vertices,
    triangles,
    degenerateFaces: 0,
    nonManifoldEdges: 0,
    openBoundaryLoops: 0,
    isolatedVertices: 0,
  }
}

/** Amostra de qualidade topológica — nota 0–100 e razões de defeito. */
export interface TopologyQualitySample {
  /** Nota 0–100 (100 = malha perfeita). */
  grade: number
  /** Faces degeneradas / triângulos. */
  degenerateRatio: number
  /** Arestas non-manifold / vértices. */
  nonManifoldRatio: number
  /** Loops de borda abertos / vértices. */
  boundaryRatio: number
  /** Vértices isolados / vértices. */
  isolatedRatio: number
  /** Todas as razões são finitas. */
  allFinite: boolean
  /** Computável E acima do piso universal (60). O mínimo do tier é aplicado pelo veredito. */
  ready: boolean
}

/**
 * Avaliador topológico — mirror EXATO de `AssetTopologyQuality::grade()`.
 *
 * Clamp ANTES de round (ordem do kernel `raw.clamp(0.0, 100.0).round()`); para
 * entradas finitas o resultado é idêntico entre `f32` (Rust) e `f64` (JS).
 */
export function gradeAssetTopology(m: AssetTopologyMetricsInput): TopologyQualitySample {
  const tri = Math.max(m.triangles, 1)
  const vert = Math.max(m.vertices, 1)
  const degenerateRatio = m.degenerateFaces / tri
  const nonManifoldRatio = m.nonManifoldEdges / vert
  const boundaryRatio = m.openBoundaryLoops / vert
  const isolatedRatio = m.isolatedVertices / vert
  const allFinite = [degenerateRatio, nonManifoldRatio, boundaryRatio, isolatedRatio].every(Number.isFinite)
  const raw =
    100 -
    degenerateRatio * TOPOLOGY_GRADER_WEIGHTS.degenerate -
    nonManifoldRatio * TOPOLOGY_GRADER_WEIGHTS.nonManifold -
    boundaryRatio * TOPOLOGY_GRADER_WEIGHTS.boundary -
    isolatedRatio * TOPOLOGY_GRADER_WEIGHTS.isolated
  const grade = allFinite ? Math.round(Math.min(100, Math.max(0, raw))) : 0
  const ready = allFinite && grade >= TOPOLOGY_GRADE_FLOOR
  return {
    grade,
    degenerateRatio,
    nonManifoldRatio,
    boundaryRatio,
    isolatedRatio,
    allFinite,
    ready,
  }
}

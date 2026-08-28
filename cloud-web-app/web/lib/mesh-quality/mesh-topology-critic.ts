/**
 * Letter bw/bz — Actor-Critic topology gate on game-ready ship path.
 * Rejects bad topology before pack / viewport claim (Law XI dual-stack posture).
 * Letter bz: manifold / non-manifold / degenerate metrics in receipt.
 * Letter bw: optional tier gate runs the kernel-mirror grade (gradeAssetTopology)
 * bit-identically to Rust — the critic and the kernel can never disagree.
 */

import { measureMeshTopology } from '@/lib/mesh-quality/mesh-topology-metrics'
import { countTriangles, countVertices, type MeshQualityStageReceipt, type RawMeshBuffer } from '@/lib/mesh-quality/types'
import {
  gradeAssetTopology,
  TIER_MIN_TOPOLOGY_GRADES,
  type AssetTopologyMetricsInput,
} from '@/lib/mesh-quality/topology-grader'
import type { GameAssetQualityTier } from '@/lib/production/game-asset-quality-pipeline'

export const MESH_TOPOLOGY_CRITIC_WIRED = true as const

export interface TopologyCriticInput {
  mesh: RawMeshBuffer
  maxTriangles?: number
  minTriangles?: number
  requireUvs?: boolean
  requireNormals?: boolean
  /** Max allowed non-manifold edge count (default: generous for clay; tighten post-retopo). */
  maxNonManifoldEdges?: number
  /** Reject when manifoldEdgeRatio falls below this (0–1). Default off (0). */
  minManifoldEdgeRatio?: number
  /**
   * Optional tier gate — when set, the kernel-mirror topology grade
   * (`gradeAssetTopology`, bit-identical to Rust `AssetTopologyQuality::grade()`)
   * must meet the tier's `TIER_MIN_TOPOLOGY_GRADES` floor (60/80/90/95).
   */
  tier?: GameAssetQualityTier
  /** Explicit floor override for the kernel-mirror grade (defaults to the tier floor). */
  minTopologyGrade?: number
}

export interface TopologyCriticResult {
  approved: boolean
  rejectReasons: string[]
  receipt: MeshQualityStageReceipt
}

export function critiqueMeshTopology(input: TopologyCriticInput): TopologyCriticResult {
  const reasons: string[] = []
  const tris = countTriangles(input.mesh)
  const verts = countVertices(input.mesh)
  const maxT = input.maxTriangles ?? 200_000
  const minT = input.minTriangles ?? 4
  const topo = measureMeshTopology(input.mesh)

  // Kernel-mirror topology grade gate (bit-identical to the Rust bw grader).
  const tierFloor = input.tier !== undefined ? TIER_MIN_TOPOLOGY_GRADES[input.tier] : undefined
  const minGrade = input.minTopologyGrade ?? tierFloor
  const topologyInput: AssetTopologyMetricsInput = {
    vertices: topo.vertices,
    triangles: topo.triangles,
    degenerateFaces: topo.degenerateFaces,
    nonManifoldEdges: topo.nonManifoldEdges,
    openBoundaryLoops: topo.openBoundaryLoops,
    isolatedVertices: topo.isolatedVertices,
  }
  const topologySample = gradeAssetTopology(topologyInput)
  const topologyGrade = topologySample.grade
  if (minGrade !== undefined && topologyGrade < minGrade) {
    reasons.push('topology_grade_below_tier_floor')
  }

  if (verts < 3) reasons.push('vertex_count_too_low')
  if (tris < minT) reasons.push('triangle_count_too_low')
  if (tris > maxT) reasons.push('triangle_count_over_budget')
  if (input.requireUvs !== false && (!input.mesh.uvs || input.mesh.uvs.length < verts * 2)) {
    reasons.push('uv_missing')
  }
  if (input.requireNormals !== false && (!input.mesh.normals || input.mesh.normals.length < verts * 3)) {
    reasons.push('normals_missing')
  }

  if (topo.degenerateFaces > Math.max(2, Math.floor(tris / 30))) {
    reasons.push('excessive_degenerate_faces')
  }

  const maxNm = input.maxNonManifoldEdges ?? Math.max(32, Math.floor(tris * 0.05))
  if (topo.nonManifoldEdges > maxNm) {
    reasons.push('excessive_non_manifold_edges')
  }

  const minManifold = input.minManifoldEdgeRatio ?? 0
  if (minManifold > 0 && topo.manifoldEdgeRatio < minManifold) {
    reasons.push('manifold_edge_ratio_too_low')
  }

  const approved = reasons.length === 0
  return {
    approved,
    rejectReasons: reasons,
    receipt: {
      stage: 'topology-critic',
      status: approved ? 'closed' : 'rejected',
      evidence: approved
        ? ['topology-critic-pass', 'manifold-metrics-bz']
        : reasons.map((r) => `reject:${r}`),
      heldReason: approved ? undefined : reasons.join(','),
      metrics: {
        tris,
        verts,
        approved,
        nonManifoldEdges: topo.nonManifoldEdges,
        boundaryEdges: topo.boundaryEdges,
        manifoldEdgeRatio: topo.manifoldEdgeRatio,
        quadIshRatio: topo.quadIshRatio,
        degenerateFaces: topo.degenerateFaces,
        openBoundaryLoops: topo.openBoundaryLoops,
        isolatedVertices: topo.isolatedVertices,
        topologyGrade,
        topologyAllFinite: topologySample.allFinite,
      },
    },
  }
}

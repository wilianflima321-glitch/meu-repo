/**
 * Letter bw — Asset Quality Gate verdict mirror (web ⇄ kernel anti-drift).
 *
 * This suite pins the web-side deterministic mirror (`asset-quality-gate-verdict.ts`)
 * and the pure topology grader (`topology-grader.ts`) to the SAME literal math the
 * Rust kernel asserts in `asset_quality_gate.rs` (`topology_grader_weights_match_the_ts_mirror`).
 * Any drift on either stack fails one of the two sides — Law XI dual-stack posture.
 */

import { describe, expect, it } from 'vitest'
import {
  gradeAssetTopology,
  perfectTopologyMetrics,
  TOPOLOGY_GRADER_WEIGHTS,
  TOPOLOGY_GRADE_FLOOR,
  TIER_MIN_TOPOLOGY_GRADES,
  type AssetTopologyMetricsInput,
} from '@/lib/mesh-quality/topology-grader'
import { critiqueMeshTopology } from '@/lib/mesh-quality/mesh-topology-critic'
import { buildTestIcosphere } from '@/lib/mesh-quality/types'
import {
  ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
  assetTextureVramBytes,
  evaluateAssetQualityManifest,
  failClosedAssetQualityVerdict,
  KERNEL_ASSET_QUALITY_TIER_CATALOG,
  referenceAssetQualityManifest,
  type AssetQualityManifestInput,
} from '@/lib/production/asset-quality-gate-verdict'
import { consultAssetQualityGateForDispatch } from '@/lib/production/kernel-asset-quality-gate-honesty'
import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import {
  buildGameAssetQualityPipeline,
  type GameAssetQualityTier,
} from '@/lib/production/game-asset-quality-pipeline'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'
import { createMemoryCostGuardLedger } from '@/lib/production/creative-cost-guard'

const DEGRADED_TOPOLOGY: AssetTopologyMetricsInput = {
  vertices: 100,
  triangles: 100,
  degenerateFaces: 40,
  nonManifoldEdges: 5,
  openBoundaryLoops: 10,
  isolatedVertices: 4,
}

/** Manifesto de referência com a topologia degradada de 81 substituída. */
function degradedManifest(tier: GameAssetQualityTier): AssetQualityManifestInput {
  return {
    ...referenceAssetQualityManifest(tier),
    topology: DEGRADED_TOPOLOGY,
  }
}

describe('Topology grader (bw) — bit-exact mirror of AssetTopologyQuality::grade()', () => {
  it('perfect topology scores 100 and is ready', () => {
    const perfect = gradeAssetTopology(perfectTopologyMetrics(10_000, 20_000))
    expect(perfect.grade).toBe(100)
    expect(perfect.ready).toBe(true)
    expect(perfect.allFinite).toBe(true)
    expect(perfect.degenerateRatio).toBe(0)
    expect(perfect.nonManifoldRatio).toBe(0)
  })

  it('degraded fixture (100/100, 40/5/10/4) grades EXACTLY 81 — mirrors kernel test', () => {
    const degraded = gradeAssetTopology(DEGRADED_TOPOLOGY)
    // raw = 100 − 0.4·40 − 0.05·30 − 0.1·15 − 0.04·5 = 80.8 → clamp → round = 81.
    expect(degraded.grade).toBe(81)
    expect(degraded.ready).toBe(true)
    expect(degraded.allFinite).toBe(true)
    expect(degraded.degenerateRatio).toBe(0.4)
    expect(degraded.nonManifoldRatio).toBe(0.05)
    expect(degraded.boundaryRatio).toBe(0.1)
    expect(degraded.isolatedRatio).toBe(0.04)
  })

  it('weights and floor match the kernel literals (anti-drift)', () => {
    expect(TOPOLOGY_GRADER_WEIGHTS).toEqual({
      degenerate: 40,
      nonManifold: 30,
      boundary: 15,
      isolated: 5,
    })
    expect(TOPOLOGY_GRADE_FLOOR).toBe(60)
  })

  it('per-tier minimum grades match the canonical catalog (60/80/90/95)', () => {
    for (const tier of KERNEL_ASSET_QUALITY_TIER_CATALOG) {
      expect(TIER_MIN_TOPOLOGY_GRADES[tier.tag]).toBe(tier.minTopologyGrade)
    }
    expect([...KERNEL_ASSET_QUALITY_TIER_CATALOG.map((t) => t.minTopologyGrade)]).toEqual([60, 80, 90, 95])
  })

  it('non-finite inputs fail closed to grade 0', () => {
    const nan = gradeAssetTopology({
      vertices: 0,
      triangles: 0,
      degenerateFaces: NaN,
      nonManifoldEdges: 0,
      openBoundaryLoops: 0,
      isolatedVertices: 0,
    })
    expect(nan.allFinite).toBe(false)
    expect(nan.grade).toBe(0)
    expect(nan.ready).toBe(false)
  })
})

describe('Asset Quality Gate verdict (bw) — 9-blocker mirror of evaluate_asset_quality()', () => {
  it('reference manifest passes all four tiers', () => {
    for (const tier of KERNEL_ASSET_QUALITY_TIER_CATALOG) {
      const v = evaluateAssetQualityManifest(referenceAssetQualityManifest(tier.tag))
      expect(v.ready).toBe(true)
      expect(v.blockerCount).toBe(0)
      expect(v.tier).toBe(tier.tag)
    }
  })

  it('fail-closed verdict is all-false with 9 blockers', () => {
    const v = failClosedAssetQualityVerdict()
    expect(v.ready).toBe(false)
    expect(v.blockerCount).toBe(9)
    expect(v.triangleBudgetOk).toBe(false)
    expect(v.topologyOk).toBe(false)
    expect(v.provenanceOk).toBe(false)
  })

  it('triangle overflow fails closed', () => {
    const v = evaluateAssetQualityManifest({
      ...referenceAssetQualityManifest('cloud-render-grade'),
      heroTriangles: 10_000_000 + 1,
    })
    expect(v.triangleBudgetOk).toBe(false)
    expect(v.ready).toBe(false)
    expect(v.blockerCount).toBe(1)
  })

  it('missing LOD levels fails closed', () => {
    const v = evaluateAssetQualityManifest({
      ...referenceAssetQualityManifest('cloud-render-grade'),
      lodLevelsPresent: 0,
    })
    expect(v.lodManifestOk).toBe(false)
    expect(v.ready).toBe(false)
  })

  it('missing collision proxy fails closed when the tier requires it', () => {
    const v = evaluateAssetQualityManifest({
      ...referenceAssetQualityManifest('curated-marketplace'),
      hasCollisionProxy: false,
    })
    expect(v.collisionProxyOk).toBe(false)
    expect(v.ready).toBe(false)
  })

  it('missing navmesh proxy fails closed when the tier requires it', () => {
    const v = evaluateAssetQualityManifest({
      ...referenceAssetQualityManifest('studio-local-optimized'),
      hasNavmeshProxy: false,
    })
    expect(v.navmeshProxyOk).toBe(false)
    expect(v.ready).toBe(false)
  })

  it('low texel density fails closed', () => {
    const v = evaluateAssetQualityManifest({
      ...referenceAssetQualityManifest('cloud-render-grade'),
      texelsPerMeter: 1,
    })
    expect(v.texelDensityOk).toBe(false)
    expect(v.ready).toBe(false)
  })

  it('zero provenance hash fails closed', () => {
    const v = evaluateAssetQualityManifest({
      ...referenceAssetQualityManifest('cloud-render-grade'),
      provenanceHash: 0,
    })
    expect(v.provenanceOk).toBe(false)
    expect(v.ready).toBe(false)
  })

  it('degraded topology (81) fails cloud/studio tiers but passes ai-draft', () => {
    const cloud = evaluateAssetQualityManifest(degradedManifest('cloud-render-grade'))
    expect(cloud.topologyGrade).toBe(81)
    expect(cloud.topologyOk).toBe(false)
    expect(cloud.ready).toBe(false)

    const studio = evaluateAssetQualityManifest(degradedManifest('studio-local-optimized'))
    expect(studio.topologyOk).toBe(false)

    const draft = evaluateAssetQualityManifest(degradedManifest('ai-draft'))
    expect(draft.topologyOk).toBe(true)
  })

  it('KTX2/Basis transport is strictly cheaper than legacy RGBA8', () => {
    // 4K RGBA8 legado = cap exato (64 MiB); 8K KTX2 = 32 MiB.
    expect(assetTextureVramBytes('curated-marketplace', 4096, 4096)).toBe(ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES)
    expect(assetTextureVramBytes('cloud-render-grade', 8192, 8192)).toBe(33_554_432)
    expect(assetTextureVramBytes('cloud-render-grade', 8192, 8192)).toBeLessThan(
      assetTextureVramBytes('curated-marketplace', 4096, 4096),
    )
  })

  it('same manifest is deterministic', () => {
    const a = evaluateAssetQualityManifest(referenceAssetQualityManifest('cloud-render-grade'))
    const b = evaluateAssetQualityManifest(referenceAssetQualityManifest('cloud-render-grade'))
    expect(a).toEqual(b)
  })
})

describe('Critic unifies with the kernel grader (bw)', () => {
  it('perfect icosphere meets the cloud tier floor and reports topologyGrade', () => {
    const mesh = buildTestIcosphere(2)
    const result = critiqueMeshTopology({
      mesh,
      tier: 'cloud-render-grade',
      requireUvs: false,
      requireNormals: false,
    })
    expect(result.receipt.metrics.topologyGrade).toBe(100)
    expect(result.receipt.metrics.topologyAllFinite).toBe(true)
    expect(result.approved).toBe(true)
  })

  it('rejects when the kernel-mirror grade is below the explicit floor', () => {
    const mesh = buildTestIcosphere(2)
    const result = critiqueMeshTopology({
      mesh,
      minTopologyGrade: 200,
      requireUvs: false,
      requireNormals: false,
    })
    expect(result.approved).toBe(false)
    expect(result.rejectReasons).toContain('topology_grade_below_tier_floor')
    expect(result.receipt.metrics.topologyGrade).toBe(100)
  })
})

describe('J.1 choke consult (bw) computes the declarative verdict', () => {
  it('computes a ready verdict when a manifest is supplied (web never claims IPC readiness)', () => {
    const ledger = createTaskEvidenceLedger({
      taskId: 'aqg-consult-1',
      projectId: 'p1',
      mission: 'asset quality gate consult test',
      ownerAgent: 'vitest',
    })
    const { consult, ledger: nextLedger } = consultAssetQualityGateForDispatch(
      {
        domain: 'mesh',
        targetTier: 'cloud-render-grade',
        manifest: referenceAssetQualityManifest('cloud-render-grade'),
      },
      ledger,
    )
    expect(consult.declarativeVerdict.ready).toBe(true)
    expect(consult.declarativeVerdict.blockerCount).toBe(0)
    expect(consult.declarativeVerdict.topologyGrade).toBe(100)
    expect(consult.consultNote).toContain('verdict(manifest)')
    // Honestidade: web é compiled-only — tierReady nunca é flipado sem IPC desktop.
    expect(consult.tierReady).toBe(false)
    expect(consult.gate.assetQualityGateReady).toBe(false)
    expect(nextLedger.events.length).toBeGreaterThan(1)
  })

  it('fails closed when no manifest is supplied', () => {
    const ledger = createTaskEvidenceLedger({
      taskId: 'aqg-consult-2',
      projectId: 'p1',
      mission: 'asset quality gate consult fail-closed test',
      ownerAgent: 'vitest',
    })
    const { consult } = consultAssetQualityGateForDispatch(
      {
        domain: 'texture',
        targetTier: 'studio-local-optimized',
      },
      ledger,
    )
    expect(consult.declarativeVerdict.ready).toBe(false)
    expect(consult.declarativeVerdict.blockerCount).toBe(9)
    expect(consult.consultNote).toContain('fail_closed')
  })
})

describe('Pipeline LANES derive from the kernel catalog (GAP 1 — single source of truth)', () => {
  it('every lane budget equals its canonical catalog entry (anti-drift)', () => {
    const pipeline = buildGameAssetQualityPipeline()
    expect(pipeline.lanes.map((l) => l.tier).sort()).toEqual(
      KERNEL_ASSET_QUALITY_TIER_CATALOG.map((c) => c.tag).sort(),
    )
    for (const lane of pipeline.lanes) {
      const entry = KERNEL_ASSET_QUALITY_TIER_CATALOG.find((c) => c.tag === lane.tier)
      if (!entry) {
        throw new Error(`catalog missing tier ${lane.tier}`)
      }
      expect(lane.maxPreviewTriangles).toBe(entry.maxPreviewTriangles)
      expect(lane.maxHeroTriangles).toBe(entry.maxHeroTriangles)
    }
  })
})

describe('Bridge honors request.targetTier in the J.1 consult (GAP 3 — no hardcoded ai-draft)', () => {
  it('records the requested tier ref, never a hardcoded ai-draft', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const { result, ledger } = await dispatchCreativeArtifact({
      request: {
        domain: 'texture',
        prompt: 'refine pbr textures',
        projectId: 'p-gap3',
        userId: 'u1',
        targetTier: 'studio-local-optimized',
        costGuard: {
          byokProfileId: 'byok-1',
          estimatedTokenWeight: 1_000,
          planId: 'pro',
        },
        requiresFusionWrite: false,
      },
      adapter,
      provider: async () => ({
        artifactId: 'gap3-artifact-1',
        provider: 'test-refine',
        costUsd: 0,
        actualTokenWeight: 1_000,
        empty: false,
      }),
    })
    expect(result.success).toBe(true)
    const tierRefs = ledger.events
      .flatMap((e) => e.refs)
      .filter((r) => r.startsWith('asset-quality-gate:tier:'))
    expect(tierRefs).toContain('asset-quality-gate:tier:studio-local-optimized')
    expect(tierRefs).not.toContain('asset-quality-gate:tier:ai-draft')
  })
})

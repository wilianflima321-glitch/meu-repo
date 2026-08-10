/**
 * GF-MESH-001 golden visibility / mesh fixture Vitest.
 * Ladder 30→50 prep — does not bump G.3%; Nanite/OpenUSD stay false.
 */

import { describe, expect, it } from 'vitest'

import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'
import {
  GF_MESH_001_FIXTURE_ID,
  buildGfMesh001DogfoodMesh,
  cookGfMesh001Meshlets,
  computeGoldenVisibilityHash,
  evaluateGfMesh001Readiness,
  isCapsuleOrProxyCharacter,
  loadGfMesh001FixtureFromDisk,
  runGfMesh001VisibilityEvidence,
} from '@/lib/production/gf-mesh-001-visibility-fixture'

describe('GF-MESH-001 golden visibility fixture', () => {
  it('dogfood mesh is deterministic and not a capsule', () => {
    const a = buildGfMesh001DogfoodMesh(4)
    const b = buildGfMesh001DogfoodMesh(4)
    expect(a.triangleCount).toBeGreaterThan(24)
    expect(a.positions).toEqual(b.positions)
    expect(a.indices).toEqual(b.indices)
    expect(
      isCapsuleOrProxyCharacter({
        name: a.name,
        fixtureId: a.fixtureId,
        triangleCount: a.triangleCount,
      }),
    ).toBe(false)
    expect(isCapsuleOrProxyCharacter({ name: 'hero-capsule', proxyCapsule: true })).toBe(true)
  })

  it('meshlet cook is deterministic and non-empty', () => {
    const mesh = buildGfMesh001DogfoodMesh(4)
    const c1 = cookGfMesh001Meshlets(mesh)
    const c2 = cookGfMesh001Meshlets(mesh)
    expect(c1.meshletCount).toBeGreaterThan(0)
    expect(c1.meshletCount).toBe(c2.meshletCount)
    expect(c1.packedIndices).toEqual(c2.packedIndices)
    expect(c1.clusters.every((c) => c.vertexCount <= 64 && c.indexCount / 3 <= 128)).toBe(true)
  })

  it('golden visibility hash is stable and not empty', () => {
    const mesh = buildGfMesh001DogfoodMesh(4)
    const v1 = computeGoldenVisibilityHash(mesh)
    const v2 = computeGoldenVisibilityHash(mesh)
    expect(v1.coveredPixels).toBeGreaterThan(0)
    expect(v1.goldenVisibilityHash).toBe(v2.goldenVisibilityHash)
    expect(v1.goldenVisibilityHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('loads on-disk fixture and matches sealed golden hash', () => {
    const loaded = loadGfMesh001FixtureFromDisk()
    expect('mesh' in loaded).toBe(true)
    if (!('mesh' in loaded)) return
    expect(loaded.mesh.fixtureId).toBe(GF_MESH_001_FIXTURE_ID)
    expect(loaded.sealedHash).toBeTruthy()

    const result = runGfMesh001VisibilityEvidence()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.evidence.success).toBe(true)
    expect(result.evidence.fixtureOnDisk).toBe(true)
    expect(result.evidence.visibility.goldenVisibilityHash).toBe(loaded.sealedHash)
    expect(result.evidence.naniteReady).toBe(false)
    expect(result.evidence.openUsdStageReady).toBe(false)
    expect(result.evidence.lumenReady).toBe(false)
    expect(result.evidence.g3CodeDepthPercent).toBe(G3_CODE_DEPTH_PERCENT_LOCKED)
    expect(result.evidence.g3Band30To50Passed).toBe(false)
    expect(result.evidence.marketingAllowed).toBe(false)
    expect(result.evidence.frameGraphLive).toBe(false)
  })

  it('fail-closes capsule / OpenUSD claims / empty success paths', () => {
    const capsule = runGfMesh001VisibilityEvidence({ proxyCapsule: true })
    expect(capsule.ok).toBe(false)
    if (!capsule.ok) {
      expect(capsule.success).toBe(false)
      expect(capsule.code).toBe('capsule_proxy_forbidden')
    }

    const usd = runGfMesh001VisibilityEvidence({ claimsOpenUsdStage: true })
    expect(usd.ok).toBe(false)
    if (!usd.ok) expect(usd.code).toBe('open_usd_claim_forbidden')

    const empty = runGfMesh001VisibilityEvidence({
      mesh: {
        fixtureId: GF_MESH_001_FIXTURE_ID,
        name: 'dogfood-subdivided-box',
        version: 1,
        positions: new Float32Array(0),
        indices: new Uint32Array(0),
        vertexCount: 0,
        triangleCount: 0,
      },
    })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.code).toBe('empty_mesh')
  })

  it('readiness is PARTIAL without band uplift or Nanite claim', () => {
    const ready = evaluateGfMesh001Readiness()
    expect(ready.ready).toBe(true)
    expect(ready.status).toBe('PARTIAL')
    expect(ready.fixtureOnDisk).toBe(true)
    expect(ready.meshletCount).toBeGreaterThan(0)
    expect(ready.naniteReady).toBe(false)
    expect(ready.openUsdStageReady).toBe(false)
    expect(ready.g3Band30To50Passed).toBe(false)
    expect(ready.g3CodeDepthPercent).toBe(15)
    expect(ready.band30To50HeldReason).toMatch(/30→50 band HELD/)
  })
})

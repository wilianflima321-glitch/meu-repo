/**
 * GF-MESH PBR golden maps + Hi-Z occlusion win harness Vitest.
 */

import { describe, expect, it } from 'vitest'

import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'
import {
  buildGfMesh001PbrMaps,
  evaluateGfMesh001PbrReadiness,
  isIdColorOnlyMaterial,
  runGfMesh001PbrEvidence,
} from '@/lib/production/gf-mesh-001-material-pbr-fixture'
import {
  evaluateHizOcclusionWinReadiness,
  runHizOcclusionWinEvidence,
} from '@/lib/production/hiz-occlusion-win-harness'

describe('GF-MESH-001 golden PBR materials', () => {
  it('builds real PBR maps and refuses ID-color-only theater', () => {
    const real = buildGfMesh001PbrMaps({ width: 32, height: 32 })
    expect(isIdColorOnlyMaterial(real)).toBe(false)

    const idColor = buildGfMesh001PbrMaps({
      width: 32,
      height: 32,
      forceIdColorTheater: true,
      meshletCount: 8,
    })
    expect(isIdColorOnlyMaterial(idColor)).toBe(true)

    const refused = runGfMesh001PbrEvidence({ forceIdColorTheater: true })
    expect(refused.ok).toBe(false)
    if (!refused.ok) {
      expect(refused.success).toBe(false)
      expect(refused.code).toBe('id_color_only_forbidden')
    }
  })

  it('seals deterministic golden PBR fingerprint without Nanite claim', () => {
    const a = runGfMesh001PbrEvidence()
    const b = runGfMesh001PbrEvidence()
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.evidence.goldenPbrFingerprint).toBe(b.evidence.goldenPbrFingerprint)
    expect(a.evidence.realPbrMaps).toBe(true)
    expect(a.evidence.idColorOnly).toBe(false)
    expect(a.evidence.naniteReady).toBe(false)
    expect(a.evidence.lumenReady).toBe(false)
    expect(a.evidence.g3CodeDepthPercent).toBe(G3_CODE_DEPTH_PERCENT_LOCKED)
    expect(a.evidence.g3Band30To50Passed).toBe(false)
    expect(a.evidence.marketingAllowed).toBe(false)

    const ready = evaluateGfMesh001PbrReadiness()
    expect(ready.ready).toBe(true)
    expect(ready.status).toBe('PARTIAL')
    expect(ready.naniteReady).toBe(false)
  })
})

describe('Hi-Z occlusion win harness', () => {
  it('refuses invented wins and theater labels', () => {
    const invent = runHizOcclusionWinEvidence({ inventWinRatio: 0.5 })
    expect(invent.ok).toBe(false)
    if (!invent.ok) expect(invent.code).toBe('invented_win_forbidden')

    const theater = runHizOcclusionWinEvidence({ label: 'mock' })
    expect(theater.ok).toBe(false)
    if (!theater.ok) expect(theater.code).toBe('theater_payload')
  })

  it('measures frustum vs Hi-Z cull reduction with evidence fingerprint', () => {
    const result = runHizOcclusionWinEvidence()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.evidence.frustumOnly.drawn).toBeGreaterThan(0)
    expect(result.evidence.frustumHiz.drawn).toBeLessThan(result.evidence.frustumOnly.drawn)
    expect(result.evidence.occlusionWinRatio).toBeGreaterThan(0)
    expect(result.evidence.evidenceFingerprint).toMatch(/^[a-f0-9]{16}$/)
    expect(result.evidence.hizReady).toBe(false)
    expect(result.evidence.naniteReady).toBe(false)
    expect(result.evidence.lumenReady).toBe(false)
    expect(result.evidence.g3CodeDepthPercent).toBe(15)
    expect(result.evidence.g3Band30To50Passed).toBe(false)
    expect(result.evidence.marketingAllowed).toBe(false)

    const ready = evaluateHizOcclusionWinReadiness()
    expect(ready.ready).toBe(true)
    expect(ready.status).toBe('PARTIAL')
    expect(ready.hizReady).toBe(false)
    expect(ready.occlusionWinRatio).toBeGreaterThan(0)
  })
})

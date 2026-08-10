/**
 * J.7 deepen — USD stage compose fail-closed (no empty success / no capsule / no OpenUSD).
 */

import { describe, expect, it } from 'vitest'

import {
  OPEN_USD_STAGE_READY,
  composeUsdStagePreview,
  probeUsdStageComposeReadiness,
} from '@/lib/production/usd-stage-compose'

const SAMPLE_USDA = `#usda 1.0
def Xform "Root" {
  def Mesh "Body" {
    float3[] extent = [(-1, 0, -1), (1, 2, 1)]
  }
}
`

describe('J.7 USD stage compose', () => {
  it('composes USDA hierarchy with non-empty boxes and never claims OpenUSD', () => {
    const result = composeUsdStagePreview({
      format: 'usda',
      bytes: new TextEncoder().encode(SAMPLE_USDA),
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.openUsdStageClaimable).toBe(false)
    expect(result.openUsdStageReady).toBe(false)
    expect(result.artifact.primCount).toBeGreaterThanOrEqual(2)
    expect(result.artifact.boxCount).toBeGreaterThanOrEqual(1)
    expect(result.artifact.boxes.length).toBe(result.artifact.boxCount)
    expect(result.artifact.previewKind).toBe('hierarchy_wireframe_only')
    expect(result.artifact.contentFingerprint.length).toBeGreaterThanOrEqual(8)
  })

  it('rejects empty payload — no success:true empty artifact', () => {
    const result = composeUsdStagePreview({ format: 'usda', bytes: new Uint8Array(0) })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.artifact).toBeNull()
    expect(result.code).toBe('empty_payload')
  })

  it('rejects capsule-as-character', () => {
    const result = composeUsdStagePreview({
      format: 'usda',
      bytes: new TextEncoder().encode(SAMPLE_USDA),
      shipKind: 'character',
      geometryProxy: 'capsule',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('proxy_capsule_forbidden')
  })

  it('rejects full OpenUSD stage claim', () => {
    const result = composeUsdStagePreview({
      format: 'usda',
      bytes: new TextEncoder().encode(SAMPLE_USDA),
      claimFullUsdStage: true,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('openusd_stage_held')
  })

  it('fail-closes USDC crate compose', () => {
    const crate = new Uint8Array([0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43])
    const result = composeUsdStagePreview({ format: 'usdc', bytes: crate })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('intake_held')
  })

  it('USDZ ZIP compose succeeds as preview-only with fingerprint', () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01])
    const result = composeUsdStagePreview({ format: 'usdz', bytes: zip })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.artifact.previewKind).toBe('usdz_zip_preview_only')
    expect(result.openUsdStageClaimable).toBe(false)
    expect(result.artifact.contentFingerprint.length).toBeGreaterThanOrEqual(8)
  })

  it('probe stays PARTIAL with openUsdStageReady false', () => {
    expect(OPEN_USD_STAGE_READY).toBe(false)
    const probe = probeUsdStageComposeReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.openUsdStageReady).toBe(false)
  })
})

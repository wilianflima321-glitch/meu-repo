/**
 * Honesty Matrix #7 — J.7 refined GLB/USDZ cook receipt.
 */

import { describe, expect, it } from 'vitest'

import {
  MESH_CLAY_SURPASS_CLAIM,
  OPEN_USD_COOK_STAGE_READY,
  USDC_MESH_COOK_READY,
  cookRefinedMeshToUsdPreview,
  packGlbIntoUsdzPreviewZip,
  probeGlbHeader,
} from '@/lib/production/usd-refined-mesh-cook'

/** Minimal GLB v2 header — declared length matches buffer. */
function minimalGlb(extra = 0): Uint8Array {
  const len = 12 + extra
  const buf = new Uint8Array(len)
  // 'glTF' LE
  buf[0] = 0x67
  buf[1] = 0x6c
  buf[2] = 0x54
  buf[3] = 0x46
  buf[4] = 2
  buf[5] = 0
  buf[6] = 0
  buf[7] = 0
  buf[8] = len & 0xff
  buf[9] = (len >> 8) & 0xff
  buf[10] = (len >> 16) & 0xff
  buf[11] = (len >> 24) & 0xff
  for (let i = 0; i < extra; i++) buf[12 + i] = (i * 17) & 0xff
  return buf
}

describe('J.7 refined mesh cook (Honesty #7)', () => {
  it('probes GLB header and seals cook receipt without OpenUSD claim', () => {
    const glb = minimalGlb(64)
    const header = probeGlbHeader(glb)
    expect(header.ok).toBe(true)

    const cooked = cookRefinedMeshToUsdPreview({ glbBytes: glb })
    expect(cooked.success).toBe(true)
    if (!cooked.success) return
    expect(cooked.receipt.openUsdStageReady).toBe(false)
    expect(cooked.receipt.openUsdStageReady).toBe(OPEN_USD_COOK_STAGE_READY)
    expect(cooked.receipt.usdcMeshCookReady).toBe(USDC_MESH_COOK_READY)
    expect(cooked.receipt.meshClaySurpassClaim).toBe(MESH_CLAY_SURPASS_CLAIM)
    expect(cooked.receipt.contentFingerprint.length).toBe(32)
    expect(cooked.receipt.sourceFormat).toBe('glb')
    expect(cooked.receipt.outputFormat).toBe('glb')
    expect(cooked.receipt.triangleBudgetHint).toBeGreaterThan(0)
    expect(cooked.usdzBytes).toBeNull()
  })

  it('packs USDZ preview ZIP eligible for ZIP magic (not OpenUSD stage)', () => {
    const glb = minimalGlb(32)
    const cooked = cookRefinedMeshToUsdPreview({ glbBytes: glb, packUsdzPreview: true })
    expect(cooked.success).toBe(true)
    if (!cooked.success) return
    expect(cooked.receipt.outputFormat).toBe('usdz_preview_pack')
    expect(cooked.receipt.usdzPreviewEligible).toBe(true)
    expect(cooked.usdzBytes).toBeTruthy()
    expect(cooked.usdzBytes![0]).toBe(0x50)
    expect(cooked.usdzBytes![1]).toBe(0x4b)
    expect(cooked.receipt.openUsdStageReady).toBe(false)

    const zip = packGlbIntoUsdzPreviewZip(glb)
    expect(zip.byteLength).toBeGreaterThan(glb.byteLength)
  })

  it('fail-closes empty / non-GLB / capsule / OpenUSD theater', () => {
    expect(cookRefinedMeshToUsdPreview({ glbBytes: new Uint8Array(0) }).success).toBe(false)
    expect(
      cookRefinedMeshToUsdPreview({ glbBytes: new TextEncoder().encode('not-glb') }).success,
    ).toBe(false)

    const glb = minimalGlb(8)
    const capsule = cookRefinedMeshToUsdPreview({
      glbBytes: glb,
      shipKind: 'character',
      geometryProxy: 'capsule',
    })
    expect(capsule.success).toBe(false)
    if (!capsule.success) expect(capsule.code).toBe('proxy_capsule_forbidden')

    const openUsd = cookRefinedMeshToUsdPreview({
      glbBytes: glb,
      claimOpenUsdStage: true,
    })
    expect(openUsd.success).toBe(false)
    if (!openUsd.success) expect(openUsd.code).toBe('openusd_stage_held')

    const usdc = cookRefinedMeshToUsdPreview({
      glbBytes: glb,
      claimUsdcMeshCook: true,
    })
    expect(usdc.success).toBe(false)
    if (!usdc.success) expect(usdc.code).toBe('usdc_mesh_cook_held')
  })

  it('rejects truncated GLB declared length', () => {
    const bad = minimalGlb(0)
    bad[8] = 255
    bad[9] = 255
    const result = cookRefinedMeshToUsdPreview({ glbBytes: bad })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('glb_truncated')
  })
})

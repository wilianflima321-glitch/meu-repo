/**
 * J.7 backend — USD stage intake fail-closed (OpenUSD HELD).
 */

import { describe, expect, it } from 'vitest'

import {
  OPENUSD_STAGE_HELD_REASONS,
  USD_BROWSER_VIEWER_SHIP_STATUS,
  classifyUsdPayloadBytes,
  describeOpenUsdStageHonesty,
  evaluateUsdStageIntake,
  isUsdcCrateBytes,
  isUsdzZipBytes,
  resolveUsdFormatFromExtension,
} from '@/lib/production/usd-integrator'

const SAMPLE_USDA = `#usda 1.0
def Xform "Root" {
  def Mesh "Body" {
    float3[] extent = [(-1, 0, -1), (1, 2, 1)]
  }
}
`

describe('J.7 USD stage intake (backend)', () => {
  it('never claims OpenUSD stage claimable', () => {
    const honesty = describeOpenUsdStageHonesty()
    expect(honesty.openUsdStageClaimable).toBe(false)
    expect(honesty.aggregateShipStatus).toBe(USD_BROWSER_VIEWER_SHIP_STATUS)
    expect(Object.keys(honesty.heldReasons).length).toBeGreaterThanOrEqual(5)
  })

  it('classifies USDC crate by PXR-USDC magic', () => {
    const crate = new Uint8Array([0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43, 0x00])
    expect(isUsdcCrateBytes(crate)).toBe(true)
    expect(classifyUsdPayloadBytes(crate)).toBe('usdc_crate')
  })

  it('classifies USDA ASCII and ZIP USDZ bytes', () => {
    const usda = new TextEncoder().encode(SAMPLE_USDA)
    expect(classifyUsdPayloadBytes(usda)).toBe('usda_ascii')

    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])
    expect(isUsdzZipBytes(zip)).toBe(true)
    expect(classifyUsdPayloadBytes(zip)).toBe('usdz_zip')
  })

  it('fail-closes USDC intake with documented HELD reason', () => {
    const crate = new Uint8Array([0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43])
    const intake = evaluateUsdStageIntake({ format: 'usdc', bytes: crate })
    expect(intake.openUsdStageClaimable).toBe(false)
    expect(intake.shipStatus).toBe('HELD')
    expect(intake.viewerStatus).toBe('held')
    expect(intake.heldReason).toBe('usdc_crate_unsupported')
    expect(intake.hierarchyWireframeEligible).toBe(false)
    expect(intake.message).toBe(OPENUSD_STAGE_HELD_REASONS.usdc_crate_unsupported.summary)
  })

  it('USDA intake allows hierarchy wireframe only — not mesh stage', () => {
    const bytes = new TextEncoder().encode(SAMPLE_USDA)
    const intake = evaluateUsdStageIntake({ format: 'usda', bytes })
    expect(intake.openUsdStageClaimable).toBe(false)
    expect(intake.shipStatus).toBe('HELD')
    expect(intake.viewerStatus).toBe('held')
    expect(intake.hierarchyWireframeEligible).toBe(true)
    expect(intake.heldReason).toBe('usda_mesh_stage_held')
    expect(intake.message).toMatch(/wireframe/i)
    expect(intake.message).toMatch(/not/i)
  })

  it('USDZ intake is PARTIAL live only with ZIP magic — still not OpenUSD stage', () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])
    const intake = evaluateUsdStageIntake({ format: 'usdz', bytes: zip })
    expect(intake.viewerStatus).toBe('live')
    expect(intake.shipStatus).toBe('PARTIAL')
    expect(intake.openUsdStageClaimable).toBe(false)
    expect(intake.heldReason).toBe('usdz_not_openusd_stage')
    expect(intake.message).toMatch(/OpenUSD/i)

    const bad = evaluateUsdStageIntake({ format: 'usdz', bytes: new Uint8Array([0, 1, 2, 3]) })
    expect(bad.viewerStatus).toBe('held')
  })

  it('resolveUsdFormatFromExtension includes usdc', () => {
    expect(resolveUsdFormatFromExtension('hero.usdc')).toBe('usdc')
    expect(resolveUsdFormatFromExtension('stage.usda')).toBe('usda')
    expect(resolveUsdFormatFromExtension('model.glb')).toBeNull()
  })

  it('empty payload fail-closed', () => {
    const intake = evaluateUsdStageIntake({ format: 'usd', bytes: new Uint8Array(0) })
    expect(intake.payloadKind).toBe('empty')
    expect(intake.heldReason).toBe('empty_payload')
    expect(intake.viewerStatus).toBe('held')
  })
})

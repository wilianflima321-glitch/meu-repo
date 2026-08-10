/**
 * R8 — USDC crate bootstrap + TOC substrate (mesh stage HELD).
 */

import { describe, expect, it } from 'vitest'

import {
  USDC_MESH_STAGE_READY,
  buildUsdcCrateHeaderFixture,
  parseUsdcCrateHeader,
  refuseUsdcMeshStageClaim,
  sealUsdcCrateHeaderReceipt,
} from '@/lib/production/usdc-crate-substrate'

describe('USDC crate substrate', () => {
  it('parses bootstrap + TOC section names', () => {
    const bytes = buildUsdcCrateHeaderFixture({
      sections: [
        { name: 'TOKENS', offset: 88, size: 0 },
        { name: 'PATHS', offset: 88, size: 0 },
      ],
    })
    const parsed = parseUsdcCrateHeader(bytes)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.crateVersion).toEqual({ major: 0, minor: 8, patch: 0 })
    expect(parsed.value.sections.map((s) => s.name)).toEqual(['TOKENS', 'PATHS'])
  })

  it('seals receipt with meshStageReady false', () => {
    const sealed = sealUsdcCrateHeaderReceipt(buildUsdcCrateHeaderFixture())
    expect(sealed.ok).toBe(true)
    if (!sealed.ok) return
    expect(sealed.value.meshStageReady).toBe(false)
    expect(sealed.value.openUsdStageReady).toBe(false)
    expect(USDC_MESH_STAGE_READY).toBe(false)
    expect(sealed.value.fingerprint).toHaveLength(16)
  })

  it('refuses mesh stage claims and short magic-only payloads', () => {
    expect(refuseUsdcMeshStageClaim({ claimMeshStage: true }).ok).toBe(false)
    expect(parseUsdcCrateHeader(new Uint8Array([0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43])).ok).toBe(
      false,
    )
  })
})

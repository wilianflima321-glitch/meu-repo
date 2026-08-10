/**
 * Viewport asset-drop → J.7 cook + Fusion fail-closed wire (no TSX).
 */

import { beforeEach, describe, expect, it } from 'vitest'

import {
  __resetCreativeFusionTransactionsForTests,
  createMemoryFusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import {
  VIEWPORT_DROP_COOK_WIRED,
  VIEWPORT_DROP_OPENUSD_STAGE_READY,
  ingestViewportAssetDropToCook,
} from '@/lib/viewport/viewport-asset-drop-cook-wire'

function minimalGlb(extra = 32): Uint8Array {
  const len = 12 + extra
  const buf = new Uint8Array(len)
  buf[0] = 0x67
  buf[1] = 0x6c
  buf[2] = 0x54
  buf[3] = 0x46
  buf[4] = 2
  buf[8] = len & 0xff
  buf[9] = (len >> 8) & 0xff
  buf[10] = (len >> 16) & 0xff
  buf[11] = (len >> 24) & 0xff
  return buf
}

describe('viewport asset-drop → cook/Fusion wire', () => {
  beforeEach(() => {
    __resetCreativeFusionTransactionsForTests()
  })

  it('is wired and never claims OpenUSD stage', () => {
    expect(VIEWPORT_DROP_COOK_WIRED).toBe(true)
    expect(VIEWPORT_DROP_OPENUSD_STAGE_READY).toBe(false)
  })

  it('cooks GLB drop and seals FusionTx receipt', async () => {
    const store = createMemoryFusionScopeStore()
    const result = await ingestViewportAssetDropToCook({
      fileName: 'hero.glb',
      bytes: minimalGlb(),
      projectId: 'proj-drop',
      fusionStore: store,
      fusionScope: 'manifest',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.cook.contentFingerprint.length).toBe(32)
    expect(result.fusionTransactionId).toBeTruthy()
    expect(result.openUsdStageReady).toBe(false)
    const snap = JSON.parse(store.getSnapshot('proj-drop', 'manifest'))
    expect(snap.kind).toBe('viewport-drop-cook')
    expect(snap.cookId).toBe(result.cook.cookId)
  })

  it('fail-closes empty / capsule / OpenUSD / non-GLB', async () => {
    const empty = await ingestViewportAssetDropToCook({
      fileName: 'empty.glb',
      bytes: new Uint8Array(0),
      projectId: 'p',
    })
    expect(empty.success).toBe(false)
    if (!empty.success) expect(empty.code).toBe('empty_payload')

    const capsule = await ingestViewportAssetDropToCook({
      fileName: 'hero.glb',
      bytes: minimalGlb(),
      projectId: 'p',
      shipKind: 'character',
      geometryProxy: 'capsule',
    })
    expect(capsule.success).toBe(false)
    if (!capsule.success) expect(capsule.code).toBe('proxy_capsule_forbidden')

    const openUsd = await ingestViewportAssetDropToCook({
      fileName: 'hero.glb',
      bytes: minimalGlb(),
      projectId: 'p',
      claimOpenUsdStage: true,
    })
    expect(openUsd.success).toBe(false)
    if (!openUsd.success) expect(openUsd.code).toBe('openusd_stage_held')

    const usda = await ingestViewportAssetDropToCook({
      fileName: 'stage.usda',
      bytes: new TextEncoder().encode('#usda 1.0\n'),
      projectId: 'p',
    })
    expect(usda.success).toBe(false)
    if (!usda.success) expect(usda.code).toBe('unsupported_format')
  })

  it('requireFusion without store fails closed', async () => {
    const result = await ingestViewportAssetDropToCook({
      fileName: 'a.glb',
      bytes: minimalGlb(),
      projectId: 'p',
      requireFusion: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('fusion_required')
  })
})

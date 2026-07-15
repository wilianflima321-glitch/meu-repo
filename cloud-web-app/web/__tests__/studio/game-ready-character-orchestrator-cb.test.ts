/**
 * Letter cb — Studio game-ready character route selection + CreativeBridge wire.
 * nativeOnnxReady HELD → BYOK path; Zero-UI when BYOK missing.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  selectGameReadyCharacterRoute,
  runGameReadyCharacterGeneration,
  buildGameReadyCharacterHonestyBadges,
  GAME_READY_CHARACTER_LETTER,
  GAME_READY_CHARACTER_WIRED,
} from '@/lib/studio/game-ready-character-orchestrator'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import { buildMinimalObjFixture } from '@/lib/mesh-quality/clay-provider-adapters'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetCreativeFusionTransactionsForTests()
})

describe('Route selection (cb)', () => {
  it('nativeOnnxReady HELD → BYOK path when keys+BYOK present', () => {
    expect(NATIVE_ONNX_READY).toBe(false)
    expect(GAME_READY_CHARACTER_LETTER).toBe('cb')
    expect(GAME_READY_CHARACTER_WIRED).toBe(true)

    const d = selectGameReadyCharacterRoute({
      capabilityScore: 90,
      nativeOnnxReady: false,
      hasByok: true,
      hasClayKeys: true,
    })
    expect(d.route).toBe('byok-bx')
    expect(d.zeroUi).toBe(false)
    expect(d.reason).toBe('native_onnx_held_byok_clay_poll')
  })

  it('native HELD + no BYOK → Zero-UI silent MoA fallback', () => {
    const d = selectGameReadyCharacterRoute({
      capabilityScore: 90,
      nativeOnnxReady: false,
      hasByok: false,
      hasClayKeys: false,
    })
    expect(d.route).toBe('zero-ui-held')
    expect(d.zeroUi).toBe(true)
    expect(d.reason).toBe('native_onnx_held_byok_missing_zero_ui')
  })

  it('native ready + capable GPU → native-ca', () => {
    const d = selectGameReadyCharacterRoute({
      capabilityScore: 90,
      dedicatedVramMb: 8192,
      nativeOnnxReady: true,
      hasByok: true,
      hasClayKeys: true,
    })
    expect(d.route).toBe('native-ca')
    expect(d.reason).toBe('native_onnx_ready_pager_path')
  })

  it('native ready but weak GPU → BYOK when present', () => {
    const d = selectGameReadyCharacterRoute({
      capabilityScore: 10,
      nativeOnnxReady: true,
      hasByok: true,
      hasClayKeys: true,
    })
    expect(d.route).toBe('byok-bx')
    expect(d.gate.zeroUiFallback).toBe(true)
  })
})

describe('Honesty badges (cb)', () => {
  it('labels native HELD vs BYOK path', () => {
    const badges = buildGameReadyCharacterHonestyBadges({
      nativeOnnxReady: false,
      liveClayPollReady: true,
      route: 'byok-bx',
    })
    expect(badges.find((b) => b.id === 'native-onnx')?.status).toBe('held')
    expect(badges.find((b) => b.id === 'byok-clay')?.status).toBe('available')
    expect(badges.find((b) => b.id === 'route')?.label).toContain('byok-bx')
  })
})

describe('runGameReadyCharacterGeneration (cb)', () => {
  it('default production: native HELD → Zero-UI without BYOK (no error spam)', async () => {
    const result = await runGameReadyCharacterGeneration({
      projectId: 'p-cb',
      userId: 'u1',
      prompt: 'knight',
      capabilityScore: 80,
    })
    expect(result.letter).toBe('cb')
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.route).toBe('zero-ui-held')
    expect(result.zeroUi).toBe(true)
    expect(result.success).toBe(false)
    expect(result.fusionViewportStamped).toBe(false)
  })

  it('native HELD → BYOK offline OBJ → CreativeBridge conveyor + FusionTx', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const fusionStore = createMemoryFusionScopeStore()
    const result = await runGameReadyCharacterGeneration({
      projectId: 'p-cb',
      userId: 'u1',
      prompt: 'dark fantasy clay knight',
      capabilityScore: 80,
      costGuardAdapter: adapter,
      byokProfileId: 'byok-1',
      planId: 'pro',
      offlineObjText: buildMinimalObjFixture(2),
      fusionStore,
      writePackEntry: true,
      hasByok: true,
      hasClayKeys: true,
    })
    expect(result.route).toBe('byok-bx')
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.success).toBe(true)
    expect(result.mesh).toBeDefined()
    expect(result.fusionViewportStamped).toBe(true)
    expect(result.notes.some((n) => n.includes('creative-bridge'))).toBe(true)
  })

  it('CostGuard deny on BYOK path remains fail-closed', async () => {
    const adapter = createMemoryCostGuardLedger()
    // no enableByok — free plan deny
    const result = await runGameReadyCharacterGeneration({
      projectId: 'p-cb',
      userId: 'u1',
      prompt: 'clay',
      capabilityScore: 80,
      costGuardAdapter: adapter,
      planId: 'free',
      offlineObjText: buildMinimalObjFixture(),
      hasByok: true,
      hasClayKeys: true,
    })
    expect(result.route).toBe('byok-bx')
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBeTruthy()
  })
})

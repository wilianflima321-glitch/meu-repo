/**
 * Letter cb — Native Gen IDE route + CreativeBridge wire.
 * nativeOnnxReady HELD → BYOK path; forced ready → native pager.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  selectGameReadyCharacterRoute,
  NATIVE_GEN_IDE_LETTER,
  NATIVE_GEN_IDE_ROUTE_WIRED,
} from '@/lib/native-gen/native-gen-ide-route'
import { generateGameReadyCharacter } from '@/lib/native-gen/native-gen-ide-bridge'
import { probeNativeGenIdeHonesty } from '@/lib/native-gen/native-gen-ide-honesty'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import { buildTestIcosphere, countTriangles } from '@/lib/mesh-quality/types'
import { buildMinimalObjFixture } from '@/lib/mesh-quality/clay-provider-adapters'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'
import { getTool } from '@/lib/studio/studio-registry'

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetCreativeFusionTransactionsForTests()
})

describe('selectGameReadyCharacterRoute (cb)', () => {
  it('nativeOnnxReady HELD → BYOK clay path', () => {
    expect(NATIVE_ONNX_READY).toBe(false)
    const route = selectGameReadyCharacterRoute()
    expect(route.letter).toBe('cb')
    expect(route.path).toBe('byok-clay')
    expect(route.nativeOnnxReady).toBe(false)
    expect(route.creativeBridgeRequired).toBe(true)
    expect(route.honestyBadge).toBe('byok')
    expect(route.zeroUiSilentFallback).toBe(true)
    expect(route.localNativeCostUsd).toBe(0)
  })

  it('forced nativeOnnxReady → native pager path', () => {
    const route = selectGameReadyCharacterRoute({ nativeOnnxReady: true })
    expect(route.path).toBe('native-pager')
    expect(route.nativeOnnxReady).toBe(true)
    expect(route.creativeBridgeRequired).toBe(false)
    expect(route.honestyBadge).toBe('native')
    expect(route.zeroUiSilentFallback).toBe(false)
  })

  it('route module wired', () => {
    expect(NATIVE_GEN_IDE_ROUTE_WIRED).toBe(true)
    expect(NATIVE_GEN_IDE_LETTER).toBe('cb')
  })
})

describe('generateGameReadyCharacter (cb)', () => {
  it('default HELD → BYOK CreativeBridge ingest + FusionTx', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u-cb')
    const store = createMemoryFusionScopeStore()
    const result = await generateGameReadyCharacter({
      projectId: 'p-cb',
      userId: 'u-cb',
      prompt: 'game-ready knight',
      costGuardAdapter: adapter,
      fusionStore: store,
      offlineObjText: buildMinimalObjFixture(),
      byokProfileId: 'byok-cb',
      planId: 'pro',
    })
    expect(result.letter).toBe('cb')
    expect(result.path).toBe('byok-clay')
    expect(result.honestyBadge).toBe('byok')
    expect(result.creativeBridgeUsed).toBe(true)
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.localNativeCostUsd).toBe(0)
    expect(result.success).toBe(true)
    expect(result.byokPipeline?.success).toBe(true)
    expect(result.byokPipeline?.mesh).toBeDefined()
    expect(countTriangles(result.byokPipeline!.mesh!)).toBeGreaterThan(0)
  })

  it('BYOK without CostGuard adapter — fail-closed Zero-UI', async () => {
    const result = await generateGameReadyCharacter({
      projectId: 'p-cb',
      userId: 'u-cb',
      prompt: 'knight',
    })
    expect(result.success).toBe(false)
    expect(result.path).toBe('byok-clay')
    expect(result.zeroUi).toBe(true)
    expect(result.blockedReason).toBe('cost_guard_adapter_required')
    expect(result.creativeBridgeUsed).toBe(false)
  })

  it('forced native path uses native conveyor + local $0 FusionTx', async () => {
    const store = createMemoryFusionScopeStore()
    const mesh = buildTestIcosphere(3)
    const result = await generateGameReadyCharacter({
      projectId: 'p-cb-native',
      userId: 'u-cb',
      prompt: 'native knight',
      forceNativeOnnxReady: true,
      mesh,
      fusionStore: store,
      skipOnnx: true,
      capabilityScore: 80,
    })
    expect(result.path).toBe('native-pager')
    expect(result.honestyBadge).toBe('native')
    expect(result.creativeBridgeUsed).toBe(false)
    expect(result.localNativeCostUsd).toBe(0)
    expect(result.native).toBeDefined()
    expect(result.native?.stages.some((s) => s.stage === 'fusion-viewport')).toBe(true)
  })
})

describe('probeNativeGenIdeHonesty (cb)', () => {
  it('flips nativeGenIdeReady; nativeOnnxReady stays false', () => {
    const honesty = probeNativeGenIdeHonesty({
      ideProven: true,
      studioToolRegistered: true,
    })
    expect(honesty.letter).toBe('cb')
    expect(honesty.nativeGenIdeReady).toBe(true)
    expect(honesty.nativeOnnxReady).toBe(false)
    expect(honesty.defaultPathIsByok).toBe(true)
    expect(honesty.creativeBridgeChokeForCloudClay).toBe(true)
    expect(honesty.localNativeStillFusionTx).toBe(true)
    expect(honesty.modules.routeSelect).toBe(true)
    expect(honesty.modules.ideBridge).toBe(true)
  })

  it('studio registry has Generate character tool', () => {
    const tool = getTool('Character', 'gen-character')
    expect(tool).toBeDefined()
    expect(tool?.label).toBe('Generate character')
    expect(tool?.dynamicPath).toContain('GenerateGameReadyCharacterPanel')
    expect(tool?.maturity).toBe('BETA')
  })
})

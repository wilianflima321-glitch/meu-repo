/**
 * Letter cd — World Forge Studio IDE route + conveyor wire.
 * loraClayReady HELD → math-pcg; forced ready → lora-enriched.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  selectWorldForgeRoute,
  WORLD_FORGE_IDE_LETTER,
  WORLD_FORGE_IDE_ROUTE_WIRED,
} from '@/lib/world-forge/world-forge-ide-route'
import { generateWorldForge } from '@/lib/world-forge/world-forge-ide-bridge'
import { probeWorldForgeIdeHonesty } from '@/lib/world-forge/world-forge-ide-honesty'
import { LORA_CLAY_READY } from '@/lib/world-forge/lora-clay-registry'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'
import { getTool } from '@/lib/studio/studio-registry'

beforeEach(() => {
  __resetCreativeFusionTransactionsForTests()
})

describe('selectWorldForgeRoute (cd)', () => {
  it('loraClayReady HELD → math-pcg path', () => {
    expect(LORA_CLAY_READY).toBe(false)
    expect(NATIVE_ONNX_READY).toBe(false)
    const route = selectWorldForgeRoute()
    expect(route.letter).toBe('cd')
    expect(route.path).toBe('math-pcg')
    expect(route.loraClayReady).toBe(false)
    expect(route.nativeOnnxReady).toBe(false)
    expect(route.mathWorldReady).toBe(true)
    expect(route.honestyBadge).toBe('math-pcg')
    expect(route.zeroUiSilentLoraFallback).toBe(true)
    expect(route.localMathCostUsd).toBe(0)
  })

  it('forced lora+onnx ready → lora-enriched path', () => {
    const route = selectWorldForgeRoute({
      loraClayReady: true,
      nativeOnnxReady: true,
    })
    expect(route.path).toBe('lora-enriched')
    expect(route.honestyBadge).toBe('lora-enriched')
    expect(route.zeroUiSilentLoraFallback).toBe(false)
    expect(route.mathWorldReady).toBe(true)
  })

  it('route module wired', () => {
    expect(WORLD_FORGE_IDE_ROUTE_WIRED).toBe(true)
    expect(WORLD_FORGE_IDE_LETTER).toBe('cd')
  })
})

describe('generateWorldForge (cd)', () => {
  it('default HELD → math PCG conveyor + FusionTx', async () => {
    const store = createMemoryFusionScopeStore()
    const result = await generateWorldForge({
      projectId: 'p-cd',
      userId: 'u-cd',
      prompt: 'highland pine ridges',
      fusionStore: store,
      capabilityScore: 80,
      preferWebBudget: true,
    })
    expect(result.letter).toBe('cd')
    expect(result.path).toBe('math-pcg')
    expect(result.honestyBadge).toBe('math-pcg')
    expect(result.loraClayReady).toBe(false)
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.mathWorldReady).toBe(true)
    expect(result.localMathCostUsd).toBe(0)
    expect(result.success).toBe(true)
    expect(result.zeroUi).toBe(true)
    expect(result.conveyor).toBeDefined()
    expect(result.conveyor?.heightfield).toBeDefined()
    expect(result.conveyor?.heightfield?.meta.resolution).toBeGreaterThan(0)
    expect(result.conveyor?.biomeMask).toBeDefined()
    expect(result.conveyor?.foliage).toBeDefined()
    expect(result.conveyor?.navmesh?.walkableCount).toBeGreaterThan(0)
    expect(result.conveyor?.fusionTxId).toBeTruthy()
    expect(
      result.conveyor?.stages.some((s) => s.stage === 'sdf-sculpt' && s.status === 'closed'),
    ).toBe(true)
    expect(
      result.conveyor?.stages.some((s) => s.stage === 'pcg-scatter' && s.status === 'closed'),
    ).toBe(true)
    expect(
      result.conveyor?.stages.some(
        (s) => s.stage === 'navmesh-rebuild' && s.status === 'closed',
      ),
    ).toBe(true)
    expect(
      result.conveyor?.stages.some((s) => s.stage === 'fusion-viewport' && s.status === 'closed'),
    ).toBe(true)
  })

  it('forced lora path still runs math conveyor', async () => {
    const store = createMemoryFusionScopeStore()
    const result = await generateWorldForge({
      projectId: 'p-cd-lora',
      userId: 'u-cd',
      prompt: 'gothic ruin valley',
      forceLoraClayReady: true,
      forceNativeOnnxReady: true,
      skipLora: false,
      fusionStore: store,
      capabilityScore: 80,
      loraGenreId: 'medieval-horror',
    })
    expect(result.path).toBe('lora-enriched')
    expect(result.honestyBadge).toBe('lora-enriched')
    expect(result.success).toBe(true)
    expect(result.conveyor?.heightfield).toBeDefined()
    expect(result.conveyor?.navmesh?.walkableCount).toBeGreaterThan(0)
  })
})

describe('probeWorldForgeIdeHonesty (cd)', () => {
  it('flips worldForgeIdeReady; loraClayReady stays false', () => {
    const honesty = probeWorldForgeIdeHonesty({
      ideProven: true,
      studioToolRegistered: true,
    })
    expect(honesty.letter).toBe('cd')
    expect(honesty.worldForgeIdeReady).toBe(true)
    expect(honesty.loraClayReady).toBe(false)
    expect(honesty.nativeOnnxReady).toBe(false)
    expect(honesty.defaultPathIsMathPcg).toBe(true)
    expect(honesty.mathWorldReady).toBe(true)
    expect(honesty.localMathStillFusionTx).toBe(true)
    expect(honesty.modules.routeSelect).toBe(true)
    expect(honesty.modules.ideBridge).toBe(true)
    expect(honesty.modules.conveyor).toBe(true)
  })

  it('studio registry has Generate world tool', () => {
    const tool = getTool('World', 'gen-world')
    expect(tool).toBeDefined()
    expect(tool?.label).toBe('Generate world')
    expect(tool?.dynamicPath).toContain('GenerateWorldForgePanel')
    expect(tool?.maturity).toBe('BETA')
    expect(tool?.preferredSlot).toBe('viewport')
  })

  it('World Studio mounts gen-world viewport + /studio/gen-world redirect', async () => {
    const { CREATIVE_STUDIO_ROUTE_REDIRECTS } = await import(
      '@/app/studio/creative-studio-routes'
    )
    expect(CREATIVE_STUDIO_ROUTE_REDIRECTS['/studio/gen-world']).toBe(
      '/studio/level?tool=gen-world',
    )
    expect(getTool('World', 'gen-world')?.dynamicPath).toBe(
      '@/components/world/GenerateWorldForgePanel',
    )
  })
})

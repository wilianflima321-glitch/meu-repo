/**
 * Letter cy — GPU Fracture + Mass ECS playtest wire Vitest.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  FRACTURE_MASS_PLAYTEST_LETTER,
  createFractureMassPlaytestSession,
  tickFractureMassPlaytest,
  proveFractureMassPlaytestSoak,
  proveFractureMassPlaytestWire,
  probeFractureMassPlaytestHonesty,
  resetFractureMassPlaytestHonestyCache,
} from '@/lib/playtest'
import { createMockGpuFractureDevice } from '@/lib/destruction'
import { createMockGpuMassEcsDevice } from '@/lib/mass-ecs'

describe('fracture + mass playtest wire (cy)', () => {
  beforeEach(() => {
    resetFractureMassPlaytestHonestyCache()
  })

  it('tick moves debris + steps mass agents; Zero-UI when off', () => {
    const session = createFractureMassPlaytestSession({
      capabilityScore: 38,
      webgpuAvailable: false,
      webgpuComputeAvailable: false,
      agentCount: 32,
    })
    const on = tickFractureMassPlaytest({ session, enabled: true })
    expect(on.letter).toBe(FRACTURE_MASS_PLAYTEST_LETTER)
    expect(on.zeroUiUnavailable).toBe(false)
    expect(on.debrisMoved).toBe(true)
    expect(on.massAgentsActive).toBeGreaterThan(0)
    expect(on.fractureBackend).toBe('cpu-debris-fallback')
    expect(on.massBackend).toBe('cpu-soa-fallback')

    const off = tickFractureMassPlaytest({ session, enabled: false })
    expect(off.zeroUiUnavailable).toBe(true)
    expect(off.applied).toBe(false)

    const unbound = tickFractureMassPlaytest({ session: null, enabled: true })
    expect(unbound.zeroUiUnavailable).toBe(true)
  })

  it('WebGPU mocks select compute backends when CapScore allows', () => {
    const session = createFractureMassPlaytestSession({
      capabilityScore: 40,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      fractureSoakPassed: true,
      massSoakPassed: true,
      fractureDevice: createMockGpuFractureDevice(),
      massDevice: createMockGpuMassEcsDevice(),
      agentCount: 32,
    })
    const tick = tickFractureMassPlaytest({ session, enabled: true })
    expect(tick.fractureBackend).toBe('webgpu-compute')
    expect(tick.massBackend).toBe('webgpu-compute')
    expect(tick.debrisMoved).toBe(true)
    expect(tick.massAgentsActive).toBeGreaterThan(0)
  })

  it('CapScore GT730 forces CPU fallback (Zero-UI GPU blocked)', () => {
    const session = createFractureMassPlaytestSession({
      capabilityScore: 12,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      fractureSoakPassed: true,
      massSoakPassed: true,
      fractureDevice: createMockGpuFractureDevice(),
      massDevice: createMockGpuMassEcsDevice(),
      agentCount: 24,
    })
    const tick = tickFractureMassPlaytest({ session, enabled: true })
    expect(tick.fractureBackend).toBe('cpu-debris-fallback')
    expect(tick.massBackend).toBe('cpu-soa-fallback')
    expect(tick.debrisMoved).toBe(true)
    expect(tick.massAgentsActive).toBeGreaterThan(0)
  })

  it('soak flips fractureMassPlaytestReady; distinct from cv/cw; marketing HELD', () => {
    const soak = proveFractureMassPlaytestSoak({
      capabilityScore: 38,
      withGpuMocks: true,
      frames: 4,
    })
    expect(soak.letter).toBe('cy')
    expect(soak.passed).toBe(true)
    expect(soak.fractureMassPlaytestReady).toBe(true)
    expect(soak.fractureStepped).toBe(true)
    expect(soak.massStepped).toBe(true)
    expect(soak.cpuFallbackGt730).toBe(true)
    expect(soak.zeroUiOptOut).toBe(true)
    expect(soak.gpuPathWhenAvailable).toBe(true)

    const proved = proveFractureMassPlaytestWire()
    expect(proved.passed).toBe(true)

    const honesty = probeFractureMassPlaytestHonesty()
    expect(honesty.fractureMassPlaytestReady).toBe(true)
    expect(honesty.chaosParityAllowed).toBe(false)
    expect(honesty.mass100kClaimAllowed).toBe(false)
    expect(honesty.unrealMassParityAllowed).toBe(false)
    expect(honesty.coinsReady).toBe(false)
    expect(honesty.agonesReady).toBe(false)
    expect(honesty.naniteReady).toBe(false)
    expect(honesty.dlssReady).toBe(false)
    expect(honesty.gpuFractureLibWired).toBe(true)
    expect(honesty.gpuMassEcsLibWired).toBe(true)
  })
})

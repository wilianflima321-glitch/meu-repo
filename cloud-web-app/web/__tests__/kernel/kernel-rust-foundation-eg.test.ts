/**
 * Letter eg — web kernel honesty catalog deepen (dq–ef).
 * Documents probe names honestly; does NOT flip kernelRustFoundationReady.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  probeKernelRustFoundationHonesty,
  getKernelRustExtendedSurfaceDocumented,
  resetKernelRustFoundationHonestyCache,
  KERNEL_RUST_EXTENDED_SURFACE_LETTER,
  KERNEL_RUST_EXTENDED_SURFACE_DOCUMENTED,
  KERNEL_RUST_FOUNDATION_SURFACE_VERSION,
} from '@/lib/kernel/kernel-rust-foundation-honesty'
import {
  KERNEL_RUST_EXTENDED_SURFACE,
  KERNEL_RUST_EXTENDED_SURFACE_GATES,
  KERNEL_RUST_EXTENDED_SURFACE_LETTERS,
  KERNEL_RUST_FOUNDATION_SOAK_GATES,
  KERNEL_RUST_FOUNDATION_SURFACE,
  isKernelRustExtendedSurfaceDocumented,
} from '@/lib/kernel/kernel-rust-foundation-surface'
import {
  buildKernelRustFoundationHonestyBadgeModel,
} from '@/lib/kernel/kernel-rust-foundation-studio-badge'

beforeEach(() => {
  resetKernelRustFoundationHonestyCache()
})

describe('letter eg — kernelRustExtendedSurfaceDocumented (dq–ef catalog deepen)', () => {
  it('documents all dq–ef probes without flipping kernelRustFoundationReady', () => {
    expect(KERNEL_RUST_EXTENDED_SURFACE_LETTER).toBe('eg')
    expect(KERNEL_RUST_EXTENDED_SURFACE_DOCUMENTED).toBe(true)
    expect(KERNEL_RUST_FOUNDATION_SURFACE_VERSION).toBe('dn+eg')
    expect(isKernelRustExtendedSurfaceDocumented()).toBe(true)
    expect(getKernelRustExtendedSurfaceDocumented()).toBe(true)

    expect([...KERNEL_RUST_EXTENDED_SURFACE_LETTERS]).toEqual([
      'dq',
      'dr',
      'ds',
      'dt',
      'du',
      'dv',
      'dw',
      'dx',
      'dy',
      'dz',
      'ea',
      'eb',
      'ec',
      'ed',
      'ee',
      'ef',
    ])
    expect(KERNEL_RUST_EXTENDED_SURFACE).toHaveLength(16)
    expect(KERNEL_RUST_EXTENDED_SURFACE_GATES).toHaveLength(16)

    const gates = KERNEL_RUST_EXTENDED_SURFACE.map((e) => e.gate)
    expect(gates).toEqual([...KERNEL_RUST_EXTENDED_SURFACE_GATES])
    expect(gates).toContain('unifiedFieldNetworkReady')
    expect(gates).toContain('autonomousEntropyCorrectorReady')
    expect(gates).toContain('fractalEnergyPerturbationReady')
    expect(gates).toContain('curvedRaymarcherReady')
    expect(gates).toContain('shadowTimeReversalReady')
    expect(gates).toContain('fourDimensionalTimeSdfReady')
    expect(gates).toContain('mnemonicMatterEntropyReady')
    expect(gates).toContain('synestheticSensoryRemapReady')
    expect(gates).toContain('autonomousConflictGeneratorReady')
    expect(gates).toContain('atmosphericPhysicalDampingReady')
    expect(gates).toContain('positionBasedDynamicsReady')
    expect(gates).toContain('hybridEulerianLagrangianPbdReady')
    expect(gates).toContain('matterThermodynamicsSphReady')
    expect(gates).toContain('aerodynamicNavierStokesReady')
    expect(gates).toContain('latticeBoltzmannFluidSolverReady')
    expect(gates).toContain('acousticRaytracingEchoReady')

    // Foundation soak gates stay dc–dm only (ready path unchanged)
    expect(KERNEL_RUST_FOUNDATION_SURFACE).toHaveLength(11)
    expect([...KERNEL_RUST_FOUNDATION_SOAK_GATES]).not.toContain(
      'unifiedFieldNetworkReady',
    )
    expect([...KERNEL_RUST_FOUNDATION_SOAK_GATES]).not.toContain(
      'acousticRaytracingEchoReady',
    )

    const probe = probeKernelRustFoundationHonesty()
    expect(probe.extendedSurfaceLetter).toBe('eg')
    expect(probe.surfaceVersion).toBe('dn+eg')
    expect(probe.kernelRustExtendedSurfaceDocumented).toBe(true)
    expect(probe.extendedSurface).toHaveLength(16)
    expect(probe.kernelRustFoundationReady).toBe(false)
    expect(probe.stamp).toBe('HELD')
    expect(probe.heldReason).toBe(
      'kernel_rust_foundation_no_desktop_soak_evidence',
    )
    expect(probe.coinsReady).toBe(false)
    expect(probe.agonesReady).toBe(false)
    expect(probe.naniteReady).toBe(false)
    expect(probe.dlssReady).toBe(false)
    expect(probe.notes.join(' ')).toMatch(
      /kernelRustExtendedSurfaceDocumented|dq–ef|distinct from ready/i,
    )
  })

  it('badge shows extended catalog chip while ready stays HELD', () => {
    const probe = probeKernelRustFoundationHonesty()
    const model = buildKernelRustFoundationHonestyBadgeModel(probe)
    expect(model.kernelRustFoundationReady).toBe(false)
    expect(model.kernelRustExtendedSurfaceDocumented).toBe(true)
    expect(model.chips.map((c) => c.id)).toEqual([
      'wire',
      'ready',
      'extended',
    ])
    expect(model.chips[2]?.label).toBe('dq–ef catalog')
    expect(model.chips[2]?.tone).toBe('info')
    expect(model.productLabel).toMatch(/dq–ef cataloged/i)
  })

  it('each extended entry has rustPath + tauriWire and unique letter/gate', () => {
    const letters = new Set<string>()
    const gateSet = new Set<string>()
    for (const entry of KERNEL_RUST_EXTENDED_SURFACE) {
      expect(entry.rustPath).toMatch(/^packages\/aethel-kernel-rust\/src\//)
      expect(entry.tauriWire).toMatch(
        /^apps\/studio-local\/src-tauri\/src\/kernel_/,
      )
      expect(entry.summary.length).toBeGreaterThan(8)
      expect(letters.has(entry.letter)).toBe(false)
      expect(gateSet.has(entry.gate)).toBe(false)
      letters.add(entry.letter)
      gateSet.add(entry.gate)
    }
    expect(letters.size).toBe(16)
    expect(gateSet.size).toBe(16)
  })
})

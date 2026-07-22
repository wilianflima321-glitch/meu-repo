/**
 * Letter dn — web/TS Kernel Rust foundation honesty bridge.
 * Fail-closed without desktop soak evidence; inject proves flip path.
 * Distinct from cv/cw/cy mass/fracture probes.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  probeKernelRustFoundationHonesty,
  acceptKernelRustFoundationDesktopSoakEvidence,
  getKernelRustFoundationReady,
  kernelRustFoundationReady,
  assertKernelRustFoundationFailClosedDefault,
  makeKernelRustFoundationInjectEvidence,
  resetKernelRustFoundationHonestyCache,
  KERNEL_RUST_FOUNDATION_HONESTY_LETTER,
  KERNEL_RUST_FOUNDATION_HONESTY_WIRED,
  KERNEL_RUST_FOUNDATION_PRIOR_LETTERS,
} from '@/lib/kernel/kernel-rust-foundation-honesty'
import {
  KERNEL_RUST_FOUNDATION_SURFACE,
  KERNEL_RUST_FOUNDATION_SURFACE_LETTERS,
  KERNEL_RUST_FOUNDATION_SOAK_GATES,
  emptyKernelRustFoundationSoakGates,
} from '@/lib/kernel/kernel-rust-foundation-surface'

beforeEach(() => {
  resetKernelRustFoundationHonestyCache()
})

describe('letter dn — kernelRustFoundationReady fail-closed (web honesty bridge)', () => {
  it('documents dc–dm surface and stays HELD without desktop soak evidence', () => {
    expect(KERNEL_RUST_FOUNDATION_HONESTY_LETTER).toBe('dn')
    expect(KERNEL_RUST_FOUNDATION_HONESTY_WIRED).toBe(true)
    expect([...KERNEL_RUST_FOUNDATION_PRIOR_LETTERS]).toEqual([
      ...KERNEL_RUST_FOUNDATION_SURFACE_LETTERS,
    ])
    expect(KERNEL_RUST_FOUNDATION_SURFACE_LETTERS).toEqual([
      'dc',
      'dd',
      'de',
      'df',
      'dg',
      'dh',
      'di',
      'dj',
      'dk',
      'dl',
      'dm',
    ])
    expect(KERNEL_RUST_FOUNDATION_SURFACE).toHaveLength(11)
    expect(KERNEL_RUST_FOUNDATION_SOAK_GATES).toContain('slabAllocatorMmapReady')
    expect(KERNEL_RUST_FOUNDATION_SOAK_GATES).toContain('probeKernelFoundation')

    const probe = probeKernelRustFoundationHonesty()
    expect(probe.letter).toBe('dn')
    expect(probe.wired).toBe(true)
    expect(probe.kernelRustFoundationReady).toBe(false)
    expect(probe.desktopSoakEvidenceProven).toBe(false)
    expect(probe.evidenceSource).toBe('none')
    expect(probe.stamp).toBe('HELD')
    expect(probe.heldReason).toBe(
      'kernel_rust_foundation_no_desktop_soak_evidence',
    )
    expect(probe.gpuFractureReady).toBe(false)
    expect(probe.gpuMassEcsReady).toBe(false)
    expect(probe.fractureMassPlaytestReady).toBe(false)
    expect(probe.coinsReady).toBe(false)
    expect(probe.agonesReady).toBe(false)
    expect(probe.naniteReady).toBe(false)
    expect(probe.dlssReady).toBe(false)
    expect(probe.mmapSabProductionReady).toBe(false)
    expect(probe.avx512KernelReady).toBe(false)
    expect(probe.chaosParityReady).toBe(false)
    expect(probe.mass100kClaimReady).toBe(false)
    expect(probe.zeroUiWhenUnavailable).toBe(true)
    expect(probe.notes.join(' ')).toMatch(/fail-closed|HELD|dc–dm|distinct from cv/i)
    expect(getKernelRustFoundationReady()).toBe(false)
    expect(kernelRustFoundationReady()).toBe(false)
  })

  it('default env fail-closed assertion (no invented green)', () => {
    const failClosed = assertKernelRustFoundationFailClosedDefault()
    expect(failClosed.kernelRustFoundationReady).toBe(false)
    expect(failClosed.stamp).toBe('HELD')
    expect(failClosed.heldReason).toBe(
      'kernel_rust_foundation_no_desktop_soak_evidence',
    )
  })

  it('incomplete soak gates → HELD even when proven flag set', () => {
    const gates = emptyKernelRustFoundationSoakGates()
    gates.probeKernelFoundation = true
    gates.kernelDesktopWireReady = true
    // leave remaining false

    const probe = probeKernelRustFoundationHonesty({
      evidence: {
        proven: true,
        source: 'vitest-inject',
        gates,
      },
    })
    expect(probe.kernelRustFoundationReady).toBe(false)
    expect(probe.stamp).toBe('HELD')
    expect(probe.heldReason).toBe(
      'kernel_rust_foundation_soak_gates_incomplete',
    )
  })

  it('force-disable stays HELD after full inject', () => {
    const evidence = makeKernelRustFoundationInjectEvidence()
    acceptKernelRustFoundationDesktopSoakEvidence(evidence)

    const forced = probeKernelRustFoundationHonesty({
      evidence,
      forceDisabled: true,
    })
    expect(forced.kernelRustFoundationReady).toBe(false)
    expect(forced.heldReason).toBe('kernel_rust_foundation_force_disabled')
    expect(forced.stamp).toBe('HELD')
  })

  it('injected desktop soak evidence flips kernelRustFoundationReady', () => {
    const evidence = makeKernelRustFoundationInjectEvidence()
    expect(evidence.proven).toBe(true)
    expect(evidence.source).toBe('vitest-inject')
    for (const k of KERNEL_RUST_FOUNDATION_SOAK_GATES) {
      expect(evidence.gates[k]).toBe(true)
    }

    acceptKernelRustFoundationDesktopSoakEvidence(evidence)
    expect(getKernelRustFoundationReady()).toBe(true)

    const probe = probeKernelRustFoundationHonesty({ evidence })
    expect(probe.kernelRustFoundationReady).toBe(true)
    expect(probe.stamp).toBe('IMPLEMENTED')
    expect(probe.heldReason).toBeUndefined()
    expect(probe.desktopSoakEvidenceProven).toBe(true)
    expect(probe.evidenceSource).toBe('vitest-inject')
    expect(probe.notes.join(' ')).toMatch(/IMPLEMENTED|desktop soak evidence/i)

    // Distinct from cv/cw/cy — never claims those ready flags
    expect(probe.gpuFractureReady).toBe(false)
    expect(probe.gpuMassEcsReady).toBe(false)
    expect(probe.fractureMassPlaytestReady).toBe(false)

    // Reset — production without evidence must not stay ready
    resetKernelRustFoundationHonestyCache()
    const production = probeKernelRustFoundationHonesty()
    expect(production.kernelRustFoundationReady).toBe(false)
    expect(production.stamp).toBe('HELD')
    expect(getKernelRustFoundationReady()).toBe(false)
  })

  it('tauri-ipc evidence source also flips when gates complete', () => {
    const evidence = makeKernelRustFoundationInjectEvidence({
      source: 'tauri-ipc',
      notes: ['letter dn — Tauri IPC desktop soak evidence'],
    })
    const probe = probeKernelRustFoundationHonesty({ evidence })
    expect(probe.kernelRustFoundationReady).toBe(true)
    expect(probe.evidenceSource).toBe('tauri-ipc')
    expect(probe.stamp).toBe('IMPLEMENTED')
  })

  it('source=none never flips even with all gates true', () => {
    const evidence = makeKernelRustFoundationInjectEvidence({
      source: 'none',
      proven: true,
    })
    const probe = probeKernelRustFoundationHonesty({ evidence })
    expect(probe.kernelRustFoundationReady).toBe(false)
    expect(probe.heldReason).toBe(
      'kernel_rust_foundation_no_desktop_soak_evidence',
    )
  })
})

/**
 * Letter do — Tauri IPC web wire for Kernel Rust foundation soak evidence.
 * Mock invoke proves ready flip; plain browser / no-Tauri stays HELD.
 * `kernelRustFoundationWebWireReady` (wire exists) ≠ `kernelRustFoundationReady`.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  probeKernelRustFoundationHonesty,
  getKernelRustFoundationReady,
  resetKernelRustFoundationHonestyCache,
  KERNEL_RUST_FOUNDATION_HONESTY_LETTER,
} from '@/lib/kernel/kernel-rust-foundation-honesty'
import {
  KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_READY,
  KERNEL_RUST_FOUNDATION_TAURI_PROBE_CMDS,
  detectKernelRustFoundationTauriBridgeAvailable,
  fetchKernelRustFoundationDesktopSoakEvidenceFromTauri,
  syncKernelRustFoundationDesktopSoakFromTauri,
  makeKernelRustFoundationMockTauriInvoke,
  getKernelRustFoundationWebWireReady,
} from '@/lib/kernel/kernel-rust-foundation-tauri-bridge'
import { KERNEL_RUST_FOUNDATION_SOAK_GATES } from '@/lib/kernel/kernel-rust-foundation-surface'

beforeEach(() => {
  resetKernelRustFoundationHonestyCache()
})

describe('letter do — kernelRustFoundationWebWireReady + Tauri soak bridge', () => {
  it('web wire exists (distinct from ready) and no-Tauri stays HELD', async () => {
    expect(KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER).toBe('do')
    expect(KERNEL_RUST_FOUNDATION_WEB_WIRE_READY).toBe(true)
    expect(getKernelRustFoundationWebWireReady()).toBe(true)
    expect(KERNEL_RUST_FOUNDATION_TAURI_PROBE_CMDS).toHaveLength(
      KERNEL_RUST_FOUNDATION_SOAK_GATES.length,
    )

    const probe = probeKernelRustFoundationHonesty()
    expect(probe.letter).toBe(KERNEL_RUST_FOUNDATION_HONESTY_LETTER)
    expect(probe.webWireLetter).toBe('do')
    expect(probe.kernelRustFoundationWebWireReady).toBe(true)
    expect(probe.kernelRustFoundationReady).toBe(false)
    expect(probe.stamp).toBe('HELD')
    expect(detectKernelRustFoundationTauriBridgeAvailable()).toBe(false)

    const evidence = await fetchKernelRustFoundationDesktopSoakEvidenceFromTauri()
    expect(evidence.proven).toBe(false)
    expect(evidence.source).toBe('none')
    expect(getKernelRustFoundationReady()).toBe(false)

    const sync = await syncKernelRustFoundationDesktopSoakFromTauri()
    expect(sync.accepted).toBe(false)
    expect(sync.kernelRustFoundationWebWireReady).toBe(true)
    expect(getKernelRustFoundationReady()).toBe(false)
  })

  it('mock Tauri invoke with all gates flips kernelRustFoundationReady via tauri-ipc', async () => {
    const invoke = makeKernelRustFoundationMockTauriInvoke()
    const sync = await syncKernelRustFoundationDesktopSoakFromTauri({
      invoke,
      forceInvoke: true,
    })

    expect(sync.accepted).toBe(true)
    expect(sync.evidence.source).toBe('tauri-ipc')
    expect(sync.evidence.proven).toBe(true)
    for (const k of KERNEL_RUST_FOUNDATION_SOAK_GATES) {
      expect(sync.evidence.gates[k]).toBe(true)
    }

    expect(getKernelRustFoundationReady()).toBe(true)
    const probe = probeKernelRustFoundationHonesty()
    expect(probe.kernelRustFoundationReady).toBe(true)
    expect(probe.kernelRustFoundationWebWireReady).toBe(true)
    expect(probe.evidenceSource).toBe('tauri-ipc')
    expect(probe.stamp).toBe('IMPLEMENTED')
    expect(probe.gpuFractureReady).toBe(false)
    expect(probe.coinsReady).toBe(false)
    expect(probe.naniteReady).toBe(false)
    expect(probe.dlssReady).toBe(false)
  })

  it('mock invoke with incomplete gates stays HELD', async () => {
    const invoke = makeKernelRustFoundationMockTauriInvoke({
      slabAllocatorMmapReady: false,
    })
    const sync = await syncKernelRustFoundationDesktopSoakFromTauri({
      invoke,
      forceInvoke: true,
    })

    expect(sync.accepted).toBe(false)
    expect(sync.evidence.proven).toBe(false)
    expect(sync.evidence.source).toBe('tauri-ipc')
    expect(sync.evidence.gates.slabAllocatorMmapReady).toBe(false)
    expect(getKernelRustFoundationReady()).toBe(false)

    const probe = probeKernelRustFoundationHonesty()
    expect(probe.kernelRustFoundationReady).toBe(false)
    expect(probe.stamp).toBe('HELD')
    expect(probe.kernelRustFoundationWebWireReady).toBe(true)
  })

  it('invoke throw fail-closes without inventing green', async () => {
    const invoke = async () => {
      throw new Error('tauri down')
    }
    const evidence = await fetchKernelRustFoundationDesktopSoakEvidenceFromTauri({
      invoke,
      forceInvoke: true,
    })
    expect(evidence.proven).toBe(false)
    expect(evidence.source).toBe('tauri-ipc')
    expect(evidence.notes?.join(' ')).toMatch(/failed|tauri down/i)
    expect(getKernelRustFoundationReady()).toBe(false)
  })
})

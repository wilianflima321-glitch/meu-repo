/**
 * Letter dp — Studio IDE Kernel Rust foundation honesty badge.
 * Wire (do) vs ready (dn); fail-closed HELD without live Tauri soak.
 * Zero-UI when probe unavailable. Does not invent green.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import {
  probeKernelRustFoundationHonesty,
  resetKernelRustFoundationHonestyCache,
  makeKernelRustFoundationInjectEvidence,
  acceptKernelRustFoundationDesktopSoakEvidence,
} from '@/lib/kernel/kernel-rust-foundation-honesty'
import {
  makeKernelRustFoundationMockTauriInvoke,
  syncKernelRustFoundationDesktopSoakFromTauri,
} from '@/lib/kernel/kernel-rust-foundation-tauri-bridge'
import {
  KERNEL_RUST_FOUNDATION_STUDIO_BADGE_LETTER,
  buildKernelRustFoundationHonestyBadgeModel,
  kernelRustFoundationHonestyBadgeUnavailable,
  resolveKernelRustFoundationStudioBadge,
} from '@/lib/kernel/kernel-rust-foundation-studio-badge'
import { KernelRustFoundationHonestyBadge } from '@/components/kernel/KernelRustFoundationHonestyBadge'

beforeEach(() => {
  resetKernelRustFoundationHonestyCache()
})

describe('letter dp — KernelRustFoundationHonestyBadge', () => {
  it('default env: wire live chip + ready HELD (no invent green)', async () => {
    const model = await resolveKernelRustFoundationStudioBadge()
    expect(KERNEL_RUST_FOUNDATION_STUDIO_BADGE_LETTER).toBe('dp')
    expect(model.show).toBe(true)
    expect(model.kernelRustFoundationWebWireReady).toBe(true)
    expect(model.kernelRustFoundationReady).toBe(false)
    expect(model.stamp).toBe('HELD')
    expect(model.chips.map((c) => c.id)).toEqual([
      'wire',
      'ready',
      'extended',
    ])
    expect(model.chips[0]?.label).toBe('Wire live')
    expect(model.chips[1]?.label).toBe('Ready [HELD]')
    expect(model.chips[2]?.label).toBe('dq–ef catalog')
    expect(model.kernelRustExtendedSurfaceDocumented).toBe(true)
    expect(model.productLabel).toMatch(/Wire ≠ ready/i)

    const probe = probeKernelRustFoundationHonesty()
    const fromProbe = buildKernelRustFoundationHonestyBadgeModel(probe)
    expect(fromProbe.kernelRustFoundationReady).toBe(false)
    expect(fromProbe.chips[1]?.tone).toBe('warning')
  })

  it('mock Tauri soak flips ready chip without inventing Coins/Nanite/DLSS', async () => {
    const invoke = makeKernelRustFoundationMockTauriInvoke()
    const model = await resolveKernelRustFoundationStudioBadge({
      invoke,
      forceInvoke: true,
    })
    expect(model.show).toBe(true)
    expect(model.kernelRustFoundationWebWireReady).toBe(true)
    expect(model.kernelRustFoundationReady).toBe(true)
    expect(model.stamp).toBe('IMPLEMENTED')
    expect(model.evidenceSource).toBe('tauri-ipc')
    expect(model.chips[1]?.label).toBe('Ready')
    expect(model.chips[1]?.tone).toBe('success')

    const probe = probeKernelRustFoundationHonesty()
    expect(probe.coinsReady).toBe(false)
    expect(probe.agonesReady).toBe(false)
    expect(probe.naniteReady).toBe(false)
    expect(probe.dlssReady).toBe(false)
  })

  it('vitest-inject evidence builds Ready chip; unavailable is Zero-UI', async () => {
    acceptKernelRustFoundationDesktopSoakEvidence(
      makeKernelRustFoundationInjectEvidence(),
    )
    const probe = probeKernelRustFoundationHonesty()
    const model = buildKernelRustFoundationHonestyBadgeModel(probe)
    expect(model.kernelRustFoundationReady).toBe(true)
    expect(model.chips[1]?.label).toBe('Ready')

    const hidden = kernelRustFoundationHonestyBadgeUnavailable()
    expect(hidden.show).toBe(false)
    expect(hidden.chips).toHaveLength(0)
  })

  it('incomplete Tauri gates keep Ready [HELD]', async () => {
    const invoke = makeKernelRustFoundationMockTauriInvoke({
      slabAllocatorMmapReady: false,
    })
    const sync = await syncKernelRustFoundationDesktopSoakFromTauri({
      invoke,
      forceInvoke: true,
    })
    expect(sync.accepted).toBe(false)

    const model = await resolveKernelRustFoundationStudioBadge({
      invoke,
      forceInvoke: true,
    })
    expect(model.kernelRustFoundationReady).toBe(false)
    expect(model.chips[1]?.label).toBe('Ready [HELD]')
  })

  it('renders Studio chips; Zero-UI when show=false', async () => {
    const held = await resolveKernelRustFoundationStudioBadge()
    const { container, rerender } = render(
      <KernelRustFoundationHonestyBadge model={held} />,
    )
    const status = container.querySelector(
      '[data-aethel-dp="kernel-rust-foundation-honesty"]',
    )
    expect(status).toBeTruthy()
    expect(status?.getAttribute('data-wire')).toBe('true')
    expect(status?.getAttribute('data-ready')).toBe('false')
    expect(screen.getByText('Wire live')).toBeTruthy()
    expect(screen.getByText('Ready [HELD]')).toBeTruthy()
    expect(screen.getByText('dq–ef catalog')).toBeTruthy()
    expect(status?.getAttribute('data-extended')).toBe('true')
    expect(screen.getByText(/Wire ≠ ready/i)).toBeTruthy()

    rerender(
      <KernelRustFoundationHonestyBadge
        model={kernelRustFoundationHonestyBadgeUnavailable()}
      />,
    )
    await waitFor(() => {
      expect(screen.queryByText('Wire live')).toBeNull()
      expect(
        container.querySelector(
          '[data-aethel-dp="kernel-rust-foundation-honesty"]',
        ),
      ).toBeNull()
    })
  })
})

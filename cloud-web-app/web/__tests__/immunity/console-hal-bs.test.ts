/**
 * Letter bs — Console HAL / wgpu desktop deepen (Zero-MVP honesty).
 * consoleHalReady flips for documented desktop backends (WebGPU/Vulkan/DX12);
 * PS5 GNM always fail-closed; live present/submit soak stays HELD.
 */

import { describe, expect, it } from 'vitest'
import {
  CONSOLE_HAL_DESKTOP_WIRED,
  CONSOLE_HAL_DOCUMENTED_DESKTOP_BACKENDS,
  createDx12DesktopHalPartial,
  createPs5GnmHalHeld,
  createVulkanDesktopHalPartial,
  createWgpuPortableHalScaffold,
  evaluateConsoleHalHonesty,
  negotiateConsoleHal,
  proveConsoleHalDesktopReady,
} from '@/lib/immunity/console-hal'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'

describe('Console HAL negotiate (bs)', () => {
  it('wires desktop HAL flag + documented backends', () => {
    expect(CONSOLE_HAL_DESKTOP_WIRED).toBe(true)
    expect(CONSOLE_HAL_DOCUMENTED_DESKTOP_BACKENDS).toEqual(
      expect.arrayContaining(['webgpu', 'vulkan', 'dx12', 'wgpu-portable']),
    )
  })

  it('negotiates WebGPU / Vulkan / DX12 and flips consoleHalReady', () => {
    for (const backend of ['webgpu', 'vulkan', 'dx12', 'wgpu-portable'] as const) {
      const r = negotiateConsoleHal({ requestedBackend: backend })
      expect(r.ok).toBe(true)
      expect(r.consoleHalReady).toBe(true)
      expect(r.ps5GnmReady).toBe(false)
    }
    expect(proveConsoleHalDesktopReady()).toBe(true)
  })

  it('fail-closed PS5 GNM — never ready', () => {
    for (const backend of ['ps5-gnm', 'ps5-gnm-held'] as const) {
      const r = negotiateConsoleHal({ requestedBackend: backend })
      expect(r.ok).toBe(false)
      expect(r.consoleHalReady).toBe(false)
      expect(r.ps5GnmReady).toBe(false)
      expect(r.reason).toMatch(/PS5 GNM/i)
    }
    expect(proveConsoleHalDesktopReady({ preferredBackend: 'ps5-gnm-held' })).toBe(false)

    const held = createPs5GnmHalHeld()
    expect(held.status).toBe('held')
    expect(held.probeCaps().proprietarySdkPresent).toBe(false)
    expect(held.submit({ frameId: 1, commandBufferCasHash: 'x', present: true }).accepted).toBe(
      false,
    )
  })

  it('Vulkan/DX12 fail when studio-local wgpu marked absent', () => {
    const v = negotiateConsoleHal({
      requestedBackend: 'vulkan',
      studioLocalWgpuPresent: false,
    })
    expect(v.ok).toBe(false)
    expect(v.consoleHalReady).toBe(false)
  })

  it('submit stays held even when desktop negotiate ok', () => {
    const webgpu = createWgpuPortableHalScaffold()
    const vulkan = createVulkanDesktopHalPartial()
    const dx12 = createDx12DesktopHalPartial()
    for (const hal of [webgpu, vulkan, dx12]) {
      expect(hal.status).toBe('partial')
      expect(hal.submit({ frameId: 9, commandBufferCasHash: 'cas', present: true }).accepted).toBe(
        false,
      )
    }
  })

  it('honesty auto-proves desktop; force-off and PS5 stay false', () => {
    const ok = evaluateConsoleHalHonesty()
    expect(ok.consoleHalReady).toBe(true)
    expect(ok.ps5GnmReady).toBe(false)
    expect(ok.dx12VulkanPath).toBe('partial')
    expect(ok.placeboForbidden).toBe(true)

    const off = evaluateConsoleHalHonesty({ consoleHalProven: false })
    expect(off.consoleHalReady).toBe(false)

    const ps5 = evaluateConsoleHalHonesty({
      preferredBackend: 'ps5-gnm-held',
      consoleHalProven: true,
    })
    expect(ps5.consoleHalReady).toBe(false)
    expect(ps5.ps5GnmReady).toBe(false)
  })
})

describe('AAA production Console HAL wire (bs)', () => {
  it('capability consoleHalReady follows desktop negotiate; PS5 always false', () => {
    const cap = probeAaaProductionCapability()
    expect(cap.consoleHalReady).toBe(true)
    expect(cap.ps5GnmReady).toBe(false)

    const forcedOff = probeAaaProductionCapability({ consoleHalProven: false })
    expect(forcedOff.consoleHalReady).toBe(false)
    expect(forcedOff.ps5GnmReady).toBe(false)
  })

  it('honesty gap2 shipStatus CLOSED when desktop ready; never invents Coins/Agones/BC7', () => {
    const report = evaluateAaaProductionHonesty()
    const gap2 = report.gaps.find((g) => g.id === 2)
    expect(gap2?.scaffoldStatus).toBe('CLOSED')
    expect(gap2?.shipStatus).toBe('CLOSED')
    expect(report.capability.consoleHalReady).toBe(true)
    expect(report.capability.ps5GnmReady).toBe(false)
    expect(report.capability.nativeGpuEncodeReady).toBe(false)
    expect(report.claim).not.toMatch(/Coins|Agones|BC7 ready/i)
    expect(report.productCopy).toMatch(/PS5 GNM HELD/i)
  })
})

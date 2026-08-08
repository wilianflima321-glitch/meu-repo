/**
 * CW3 — render-path honesty catalog + live present classification + present root.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CANONICAL_PRESENT_ROOT_ID,
  RENDER_PATH_CATALOG,
  buildCanonicalPresentRootDocument,
  clearPresentPathTickForTests,
  evaluateWebGpuPresentClaim,
  getLastPresentPathTick,
  isRenderPathMarketingAllowed,
  probeWebGpuAdapterAcquisition,
  recordPresentPathTick,
  resolveLiveRenderPathHonesty,
} from '@/lib/production/render-path-honesty'
import {
  evaluateRendererHonesty,
  formatRendererHonestyPrimaryLabel,
} from '@/lib/production/renderer-honesty-capability'
import { planAethelRenderer } from '@/lib/aaa-renderer-webgpu'

afterEach(() => {
  clearPresentPathTickForTests()
})

describe('CW3 render-path honesty catalog', () => {
  it('classifies canonical R3F present and condemns dual-pipeline hooks', () => {
    const canonical = RENDER_PATH_CATALOG.find((e) => e.id === 'web-r3f-webgl2')
    const condemned = RENDER_PATH_CATALOG.find((e) => e.id === 'web-use-render-pipeline')
    const desktop = RENDER_PATH_CATALOG.find((e) => e.id === 'desktop-wgpu-mount')
    const webgpuPlan = RENDER_PATH_CATALOG.find((e) => e.id === 'web-three-webgpu-renderer')

    expect(canonical?.classification).toBe('canonical')
    expect(canonical?.presentsFrames).toBe(true)
    expect(condemned?.classification).toBe('condemned')
    expect(desktop?.classification).toBe('experimental')
    expect(desktop?.presentsFrames).toBe(false)
    expect(webgpuPlan?.presentsFrames).toBe(false)
    expect(isRenderPathMarketingAllowed('canonical')).toBe(false)
  })

  it('exposes a single operator-facing canonical present root document', () => {
    const root = buildCanonicalPresentRootDocument()
    expect(root.version).toBe('cw3-present-root-v1')
    expect(root.canonicalPresentId).toBe(CANONICAL_PRESENT_ROOT_ID)
    expect(root.canonicalPresentLabel).toBe('R3F/WebGL2')
    expect(root.webgpuRole).toBe('adapter_probe_only')
    expect(root.desktopWgpuRole).toBe('experimental_mount')
    expect(root.marketingNaniteLumenAllowed).toBe(false)
    expect(root.condemnedPathIds.length).toBeGreaterThanOrEqual(1)
    expect(root.condemnedPathIds).toContain('web-use-render-pipeline')
    expect(root.remainingVsUeSinglePipeline).toMatch(/UE ships one RHI/i)
    expect(root.operatorSummary).toMatch(/Canonical present = R3F\/WebGL2/i)
  })

  it('flips desktop role to live_present only when probe presented+submitted', () => {
    const unproven = buildCanonicalPresentRootDocument({
      desktopPresentProbe: { presented: false, backend: 'Vulkan' },
    })
    expect(unproven.desktopWgpuRole).toBe('experimental_mount')

    // presented without submitted must not inflate live_present.
    const presentedOnly = buildCanonicalPresentRootDocument({
      desktopPresentProbe: { presented: true, submitted: false, backend: 'Vulkan' },
    })
    expect(presentedOnly.desktopWgpuRole).toBe('experimental_mount')

    const proven = buildCanonicalPresentRootDocument({
      desktopPresentProbe: {
        presented: true,
        submitted: true,
        backend: 'Vulkan',
        surfaceKind: 'secondary_winit',
        webviewExclusivePresentHeld: true,
        unrealRhiParityReady: false,
      },
    })
    expect(proven.desktopWgpuRole).toBe('live_present')
    expect(proven.desktopWgpuRoleNote).toMatch(/WebView exclusive/i)
    expect(proven.remainingVsUeSinglePipeline).toMatch(/secondary-winit|HELD/i)
    expect(proven.marketingNaniteLumenAllowed).toBe(false)

    const report = evaluateRendererHonesty({
      webgl2Available: true,
      desktopWgpuAvailable: true,
      desktopPresentProbe: {
        presented: true,
        submitted: true,
        backend: 'Dx12',
        surfaceKind: 'secondary_winit',
      },
    })
    expect(report.desktop.activePath).toBe('wgpu-live-present')
    // Secondary present ≠ Studio dual-live — status stays fallback; web remains live.
    expect(report.desktop.status).toBe('fallback')
    expect(report.web.status).toBe('live')
    expect(report.presentRoot?.desktopWgpuRole).toBe('live_present')
    expect(report.marketingAllowed).toBe(false)
    expect(report.claim).toMatch(/UE RHI|Nanite HELD/i)
  })

  it('resolves live present as R3F/WebGL2 even when WebGPU adapter exists', () => {
    const live = resolveLiveRenderPathHonesty({
      webgl2Available: true,
      webgpuAvailable: true,
      webgpuAdapterAcquired: true,
      desktopWgpuMounted: true,
    })
    expect(live.livePathId).toBe('web-r3f-webgl2')
    expect(live.classification).toBe('canonical')
    expect(live.presentsFrames).toBe(true)
    expect(live.webgpuAdapterAvailable).toBe(true)
    expect(live.webgpuAdapterAcquired).toBe(true)
    expect(live.marketingPresentAllowed).toBe(false)
    expect(live.claim).toMatch(/requestAdapter acquired|compute/i)
    expect(live.claim).not.toMatch(/WebGPU present path/i)
    expect(live.presentRoot.canonicalPresentId).toBe(CANONICAL_PRESENT_ROOT_ID)
    expect(live.presentRoot.webgpuRole).toBe('adapter_probe_only')
  })

  it('wires path class + present root into renderer honesty report fail-closed', () => {
    const report = evaluateRendererHonesty({
      webgl2Available: true,
      webgpuAvailable: true,
      desktopWgpuAvailable: true,
    })
    expect(report.web.activePath).toBe('r3f-webgl2')
    expect(report.web.pathClass).toBe('canonical')
    expect(report.web.status).toBe('live')
    expect(report.desktop.pathClass).toBe('experimental')
    expect(report.desktop.activePath).toBe('wgpu-mount')
    expect(report.desktop.status).not.toBe('live')
    expect(report.marketingAllowed).toBe(false)
    expect(report.livePath?.livePathId).toBe('web-r3f-webgl2')
    expect(report.livePath?.claim).toMatch(/API probed/i)
    expect(report.livePath?.claim).not.toMatch(/WebGPU present path/i)
    expect(report.presentRoot?.canonicalPresentId).toBe(CANONICAL_PRESENT_ROOT_ID)
    expect(report.presentRoot?.marketingNaniteLumenAllowed).toBe(false)
    expect(report.webgpuPresentClaim?.allowed).toBe(false)
    expect(report.gatedMarketingNames).toContain('Nanite')
    expect(report.gatedMarketingNames).toContain('Lumen')
  })

  it('fail-closes dual WebGPU present claims without adapter+device', () => {
    const noDevice = evaluateWebGpuPresentClaim({
      claimsWebGpuPresent: true,
      adapterAcquired: true,
      deviceReady: false,
    })
    expect(noDevice.allowed).toBe(false)
    expect(noDevice.failClosed).toBe(true)
    expect(noDevice.presentsFrames).toBe(false)
    expect(noDevice.reason).toMatch(/adapter\+device/i)

    const withBoth = evaluateWebGpuPresentClaim({
      claimsWebGpuPresent: true,
      adapterAcquired: true,
      deviceReady: true,
    })
    expect(withBoth.allowed).toBe(false)
    expect(withBoth.reason).toMatch(/canonical = R3F\/WebGL2/i)

    const report = evaluateRendererHonesty({
      webgl2Available: true,
      webgpuAvailable: true,
      webgpuAdapterAcquired: true,
      webgpuDeviceReady: false,
      claimsWebGpuPresent: true,
    })
    expect(report.web.activePath).toBe('r3f-webgl2')
    expect(report.webgpuPresentClaim?.allowed).toBe(false)
    expect(report.claim).toMatch(/R3F\/WebGL2/i)
  })

  it('planAethelRenderer never prefers WebGPU present without adapter+device', () => {
    const apiOnly = planAethelRenderer({
      navigatorGpuAvailable: true,
      webgpuModuleAvailable: true,
      webgpuInitOk: true,
    })
    expect(apiOnly.preferred).toBe('webgl2')
    expect(apiOnly.webgpuPresentClaimAllowed).toBe(false)

    const withDevice = planAethelRenderer({
      navigatorGpuAvailable: true,
      webgpuModuleAvailable: true,
      webgpuInitOk: true,
      webgpuAdapterAcquired: true,
      webgpuDeviceReady: true,
    })
    expect(withDevice.preferred).toBe('webgpu')
    expect(withDevice.webgpuPresentClaimAllowed).toBe(false)
    expect(withDevice.reason).toMatch(/canonical present remains R3F\/WebGL2/i)
  })

  it('records present-path ticks without WebGPU present claims', () => {
    const tick = recordPresentPathTick('web-aaa-webgl-offcanvas', { frameId: 7 })
    expect(tick.pathId).toBe('web-aaa-webgl-offcanvas')
    expect(tick.webgpuPresentClaimed).toBe(false)
    expect(getLastPresentPathTick()?.frameId).toBe(7)
  })

  it('keeps R3F/WebGL2 status live when WebGPU API is absent (no fallback theater)', () => {
    const report = evaluateRendererHonesty({
      webgl2Available: true,
      webgpuAvailable: false,
    })
    expect(report.web.status).toBe('live')
    expect(report.web.activePath).toBe('r3f-webgl2')
    expect(report.web.pathClass).toBe('canonical')
    expect(report.marketingAllowed).toBe(false)
  })

  it('catalog is attached on every live resolve (runtime consult, not dead inventory)', () => {
    const live = resolveLiveRenderPathHonesty({ webgl2Available: true })
    expect(live.catalog.length).toBeGreaterThanOrEqual(8)
    expect(live.catalog.some((e) => e.classification === 'condemned')).toBe(true)
    expect(live.catalog.some((e) => e.id === 'web-r3f-webgl2')).toBe(true)
    expect(live.presentRoot.condemned.length).toBeGreaterThanOrEqual(1)
  })

  it('badge primary label keeps live present path (not marketing [HELD] theater)', () => {
    const report = evaluateRendererHonesty({
      webgl2Available: true,
      webgpuAvailable: false,
    })
    expect(report.marketingAllowed).toBe(false)
    const label = formatRendererHonestyPrimaryLabel({
      webStatus: report.web.status,
      activePath: report.web.activePath,
      capabilityScore: 42,
      renderTier: 'mid',
    })
    expect(label).toMatch(/^Render · r3f-webgl2/)
    expect(label).not.toMatch(/^\[HELD\]/)
    expect(label).toContain('Cap 42')
  })

  it('badge primary label uses [HELD] only when present path is held', () => {
    const label = formatRendererHonestyPrimaryLabel({
      webStatus: 'held',
      activePath: 'held',
    })
    expect(label).toBe('[HELD] · held')
  })

  it('distinguishes requestAdapter acquisition from API-exists (never present)', async () => {
    const withApiOnly = resolveLiveRenderPathHonesty({
      webgl2Available: true,
      webgpuAvailable: true,
      webgpuAdapterAcquired: false,
    })
    expect(withApiOnly.webgpuAdapterAvailable).toBe(true)
    expect(withApiOnly.webgpuAdapterAcquired).toBe(false)
    expect(withApiOnly.presentsFrames).toBe(true)
    expect(withApiOnly.livePathId).toBe('web-r3f-webgl2')
    expect(withApiOnly.claim).toMatch(/requestAdapter failed|null/i)
    expect(withApiOnly.claim).not.toMatch(/WebGPU present path/i)

    const probe = await probeWebGpuAdapterAcquisition()
    expect(probe.presentsFrames).toBe(false)
    expect(typeof probe.apiAvailable).toBe('boolean')
    expect(typeof probe.adapterAcquired).toBe('boolean')
  })

  it('RendererHonestyBadge never markets Unified RHI / WebGPU Target / exclusive_rhi default', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/preview/RendererHonestyBadge.tsx'),
      'utf8',
    )
    expect(src).not.toContain('Unified RHI Acquired')
    expect(src).not.toContain('WebGPU Target Active')
    expect(src).not.toContain("|| 'exclusive_rhi'")
    expect(src).toContain("|| 'adapter_probe_only'")
    expect(src).toContain('desktopRole === \'live_present\'')
    expect(src).toContain('AAA marketing blocked')
    expect(src).toContain('WebGPU adapter probed (not present)')
  })
})

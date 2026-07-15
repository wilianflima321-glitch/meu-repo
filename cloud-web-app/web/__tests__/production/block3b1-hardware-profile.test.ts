/**
 * Block 3B.1 — Law XV Capability Score + Scalable Render Graph blueprint registry.
 */

import { describe, expect, it } from 'vitest'
import {
  buildHardwareStaticProfile,
  computeWebCapabilityScore,
  deriveUMABudget,
  fidelityLevelFromCapabilityScore,
  resolveCullingPolicy,
  scoreFromDesktopAdapterSample,
  tierFromCapabilityScore,
} from '@aethel/engine/render/hardware-profile'
import {
  BLUEPRINTS,
  buildScalableRenderGraphReport,
  getBlueprintForScore,
} from '@aethel/engine/render/scalable-render-graph'
import { resolveAutoFidelity } from '@/lib/production/viewport-fidelity'

describe('Block 3B.1 hardware-profile Capability Score', () => {
  it('maps score bands to blueprint tiers', () => {
    expect(tierFromCapabilityScore(10)).toBe('webgl2')
    expect(tierFromCapabilityScore(30)).toBe('integrated')
    expect(tierFromCapabilityScore(50)).toBe('discrete')
    expect(tierFromCapabilityScore(80)).toBe('enthusiast')
  })

  it('scores WebGL2 below WebGPU and never invents enthusiast on web', () => {
    const gl = computeWebCapabilityScore({
      webgpuAvailable: false,
      webgl2Available: true,
      hardwareConcurrency: 4,
      deviceMemoryGb: 4,
    })
    const gpu = computeWebCapabilityScore({
      webgpuAvailable: true,
      webgl2Available: true,
      hardwareConcurrency: 16,
      deviceMemoryGb: 16,
      maxTextureDimension2D: 16384,
    })
    expect(gl.score).toBeLessThan(gpu.score)
    expect(gpu.score).toBeLessThanOrEqual(62)
    expect(gl.confidence).toBe('low')
  })

  it('builds static profile with desktopFrameGraphLive false', () => {
    const profile = buildHardwareStaticProfile({
      webgpuAvailable: true,
      webgl2Available: true,
      hardwareConcurrency: 8,
      deviceMemoryGb: 8,
    })
    expect(profile.capabilityScore).toBeGreaterThanOrEqual(0)
    expect(profile.capabilityScore).toBeLessThanOrEqual(100)
    expect(profile.desktopFrameGraphLive).toBe(false)
    expect(profile.dedicatedVramMb).toBeNull()
    expect(profile.supportsRayTracing).toBe(false)
  })

  it('derives UMA budget and CPU-preferring culling on webgl2', () => {
    const profile = buildHardwareStaticProfile({
      webgpuAvailable: false,
      webgl2Available: true,
      hardwareConcurrency: 4,
      deviceMemoryGb: 4,
    })
    const uma = deriveUMABudget(profile)
    expect(uma.maxResidentTextureMb).toBeGreaterThan(0)
    const cull = resolveCullingPolicy(profile)
    expect(cull.backend).toBe('cpu_workers')
  })

  it('maps desktop adapter sample without fabricating VRAM', () => {
    const sample = scoreFromDesktopAdapterSample({
      adapterName: 'NVIDIA GeForce RTX 4080',
      backend: 'Vulkan',
      cpuCoreCount: 16,
      memoryTotalMb: 32768,
    })
    expect(sample.score).toBeGreaterThan(50)
    expect(sample.confidence).toBe('medium')
  })
})

describe('Block 3B.1 scalable-render-graph registry', () => {
  it('returns webgl2 blueprint nodes for low scores (includes CapScore FSR ci)', () => {
    expect(getBlueprintForScore(12).nodes).toEqual(BLUEPRINTS.webgl2.nodes)
    expect(BLUEPRINTS.webgl2.nodes).toContain('FSR')
  })

  it('registers FSR spatial executor only — full frame graph still HELD', () => {
    const profile = buildHardwareStaticProfile({
      webgpuAvailable: true,
      hardwareConcurrency: 12,
      deviceMemoryGb: 16,
    })
    const report = buildScalableRenderGraphReport(profile)
    expect(report.frameGraphLive).toBe(false)
    expect(report.fsrExecutorLive).toBe(true)
    expect(report.executableNodeCount).toBeGreaterThanOrEqual(1)
    const fsr = report.nodes.find((n) => n.id === 'FSR')
    expect(fsr?.status).toBe('registered')
    expect(report.nodes.filter((n) => n.id !== 'FSR').every((n) => n.status === 'held')).toBe(
      true,
    )
    expect(report.claim).toMatch(/FSR spatial executor \[CLOSED letter ci\]/)
    expect(report.claim).toMatch(/\[HELD\]/)
  })
})

describe('Block 3B.1 Auto Fidelity from Capability Score', () => {
  it('drives Auto Fidelity from Law XV score', () => {
    expect(resolveAutoFidelity({ capabilityScore: 15 })).toBe('performance')
    expect(resolveAutoFidelity({ capabilityScore: 35 })).toBe('balanced')
    expect(resolveAutoFidelity({ capabilityScore: 55 })).toBe('quality')
    expect(fidelityLevelFromCapabilityScore(70)).toBe('ultra')
  })
})

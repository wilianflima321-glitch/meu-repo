/**
 * Block 3A — AAA render honesty (strip placebo, fidelity, finalRenderSafe, pause helpers).
 */

import { describe, expect, it } from 'vitest'
import { evaluateRendererHonesty } from '@/lib/production/renderer-honesty-capability'
import {
  getViewportFidelityParams,
  isViewportFidelityLevel,
  resolveAutoFidelity,
} from '@/lib/production/viewport-fidelity'
import { isNaniteViewportEnabled } from '@/lib/settings/engine-settings'

describe('Block 3A.1/3A.2 placebo strip', () => {
  it('never enables Nanite viewport badge path', () => {
    expect(isNaniteViewportEnabled()).toBe(false)
  })
})

describe('Block 3A.3 finalRenderSafe honesty', () => {
  it('reports finalRenderSafe false with gated marketing names', () => {
    const report = evaluateRendererHonesty({
      webgl2Available: true,
      webgpuAvailable: false,
      desktopWgpuAvailable: false,
    })
    expect(report.finalRenderSafe).toBe(false)
    expect(report.finalRenderNote).toMatch(/\[HELD\]/)
    expect(report.gatedMarketingNames).toContain('Nanite')
    expect(report.gatedMarketingNames).toContain('Lumen')
    expect(report.marketingAllowed).toBe(false)
  })
})

describe('Block 3A.5 viewport fidelity', () => {
  it('accepts Auto/Perf/Balanced/Quality/Ultra', () => {
    for (const level of ['auto', 'performance', 'balanced', 'quality', 'ultra'] as const) {
      expect(isViewportFidelityLevel(level)).toBe(true)
    }
    expect(isViewportFidelityLevel('deferred')).toBe(false)
  })

  it('maps fidelity to real R3F knobs — never deferred fiction', () => {
    const perf = getViewportFidelityParams('performance')
    expect(perf.pipelineLabel).toBe('r3f-webgl2')
    expect(perf.shadows).toBe(false)
    expect(perf.postFx).toBe(false)
    expect(perf.finalRenderSafe).toBe(false)

    const ultra = getViewportFidelityParams('ultra')
    expect(ultra.shadowMapSize).toBeGreaterThanOrEqual(2048)
    expect(ultra.postFx).toBe(true)
    expect(ultra.finalRenderSafe).toBe(false)
  })

  it('auto resolves toward performance on low-end probes', () => {
    expect(
      resolveAutoFidelity({ hardwareConcurrency: 2, deviceMemoryGb: 2, webgpuAvailable: false })
    ).toBe('performance')
  })
})

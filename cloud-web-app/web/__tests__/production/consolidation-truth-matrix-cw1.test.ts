/**
 * CW1 — consolidation truth matrix contracts (live probes, fail-closed marketing).
 */

import { describe, expect, it } from 'vitest'
import {
  buildConsolidationTruthMatrix,
  isConsolidationMarketingAllowedForClaim,
} from '@/lib/production/consolidation-truth-matrix'

describe('CW1 consolidation truth matrix', () => {
  it('imports live probes and returns machine-readable rows', () => {
    const matrix = buildConsolidationTruthMatrix({
      renderer: {
        webgl2Available: true,
        webgpuAvailable: true,
        webgpuAdapterAcquired: true,
        desktopWgpuAvailable: true,
      },
    })

    expect(matrix.wave).toBe('CW1')
    expect(matrix.marketingAaaAllowed).toBe(false)
    expect(matrix.rows.length).toBeGreaterThanOrEqual(7)

    const renderer = matrix.rows.find((r) => r.id === 'renderer.web.present')
    const path = matrix.rows.find((r) => r.id === 'render.path.live')
    const presentRoot = matrix.rows.find((r) => r.id === 'render.path.present-root')
    const hub = matrix.rows.find((r) => r.id === 'hub.rtv1')
    const kernel = matrix.rows.find((r) => r.id === 'kernel.rust.foundation')
    const agents = matrix.rows.find((r) => r.id === 'agents.receipt.completeness')

    expect(renderer?.path).toContain('renderer-honesty-capability')
    expect(path?.path).toContain('render-path-honesty')
    expect(presentRoot?.path).toContain('render-path-honesty')
    expect(hub?.path).toContain('hub-honesty')
    expect(kernel?.path).toContain('kernel-rust-foundation-honesty')
    expect(agents?.path).toContain('agents-receipt-completeness')

    expect(renderer?.lastEvidence).toMatch(/r3f-webgl2|held/)
    expect(path?.lastEvidence).toMatch(/web-r3f-webgl2|held/)
    expect(presentRoot?.lastEvidence).toMatch(/cw3-present-root-v1|web-r3f-webgl2/)
    expect(presentRoot?.status).toBe('PARTIAL')
    expect(presentRoot?.marketingAllowed).toBe(false)
  })

  it('keeps marketingAllowed false for HELD AAA names', () => {
    const matrix = buildConsolidationTruthMatrix({
      renderer: { webgl2Available: true, webgpuAvailable: false },
    })

    expect(matrix.rows.every((row) => row.marketingAllowed === false)).toBe(true)
    expect(matrix.summary.marketingBlockedRows).toBe(matrix.rows.length)
    expect(isConsolidationMarketingAllowedForClaim('Nanite')).toBe(false)
    expect(isConsolidationMarketingAllowedForClaim('Coins')).toBe(false)

    const path = matrix.rows.find((r) => r.id === 'render.path.live')
    expect(path?.gatedNames).toEqual(expect.arrayContaining(['Nanite', 'Lumen']))
    expect(path?.marketingAllowed).toBe(false)
  })

  it('does not invent implemented kernel foundation without soak', () => {
    const matrix = buildConsolidationTruthMatrix()
    const kernel = matrix.rows.find((r) => r.id === 'kernel.rust.foundation')
    expect(kernel?.status).toBe('HELD')
    expect(kernel?.marketingAllowed).toBe(false)
  })

  it('keeps CW4 spine row PARTIAL (no criticalPath=DONE theater)', () => {
    const matrix = buildConsolidationTruthMatrix()
    const spine = matrix.rows.find((r) => r.id === 'ui.persistence.spine')
    expect(spine?.status).toBe('PARTIAL')
    expect(spine?.lastEvidence).toMatch(/criticalPath=PARTIAL/)
    expect(spine?.lastEvidence).not.toMatch(/criticalPath=DONE/)
    expect(spine?.marketingAllowed).toBe(false)
  })
})

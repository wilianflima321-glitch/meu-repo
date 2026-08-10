/**
 * CW1 — consolidation truth matrix contracts (live probes, fail-closed marketing).
 */

import { describe, expect, it } from 'vitest'
import {
  applyConsolidationMarketingFailClosed,
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
    expect(matrix.rows.length).toBeGreaterThanOrEqual(11)

    const renderer = matrix.rows.find((r) => r.id === 'renderer.web.present')
    const path = matrix.rows.find((r) => r.id === 'render.path.live')
    const presentRoot = matrix.rows.find((r) => r.id === 'render.path.present-root')
    const hub = matrix.rows.find((r) => r.id === 'hub.rtv1')
    const kernel = matrix.rows.find((r) => r.id === 'kernel.rust.foundation')
    const agents = matrix.rows.find((r) => r.id === 'agents.receipt.completeness')
    const forge = matrix.rows.find((r) => r.id === 'forge.sandbox.providers')
    const cw2 = matrix.rows.find((r) => r.id === 'kernel.load-scale.cw2')
    const cw7 = matrix.rows.find((r) => r.id === 'disk.austerity.cw7')

    expect(renderer?.path).toContain('renderer-honesty-capability')
    expect(path?.path).toContain('render-path-honesty')
    expect(presentRoot?.path).toContain('render-path-honesty')
    expect(hub?.path).toContain('hub-honesty')
    expect(kernel?.path).toContain('kernel-rust-foundation-honesty')
    expect(agents?.path).toContain('agents-receipt-completeness')
    expect(forge?.path).toContain('forge-sandbox-honesty')
    expect(cw2?.path).toContain('kernel-load-scale-honesty')
    expect(cw7?.path).toContain('disk-austerity-honesty')

    expect(renderer?.lastEvidence).toMatch(/r3f-webgl2|held/)
    expect(path?.lastEvidence).toMatch(/web-r3f-webgl2|held/)
    expect(presentRoot?.lastEvidence).toMatch(/cw3-present-root-v1|web-r3f-webgl2/)
    expect(presentRoot?.status).toBe('PARTIAL')
    expect(presentRoot?.marketingAllowed).toBe(false)
    expect(forge?.marketingAllowed).toBe(false)
    expect(forge?.lastEvidence).toMatch(/firecracker=false/)
    expect(cw2?.status).toBe('PARTIAL')
    expect(cw7?.status).toBe('PARTIAL')
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

  it('marks CW4 spine IMPLEMENTED with allowlist heldReason (marketing still false)', () => {
    const matrix = buildConsolidationTruthMatrix()
    const spine = matrix.rows.find((r) => r.id === 'ui.persistence.spine')
    expect(spine?.status).toBe('IMPLEMENTED')
    expect(spine?.lastEvidence).toMatch(/criticalPath=DONE/)
    expect(spine?.lastEvidence).toMatch(/lockLWW=DONE/)
    expect(spine?.lastEvidence).toMatch(/legacyMirror=DONE/)
    expect(spine?.lastEvidence).toMatch(/exceptionOnly=DONE/)
    expect(spine?.lastEvidence).toMatch(/openChromeDebt=0/)
    expect(spine?.marketingAllowed).toBe(false)
    expect(spine?.heldReason).toBe('cw4_secret_domain_allowlist')
  })

  it('blocks marketing for P2b BLOCKER rows 7–9 (J.9 / J.11–J.12 / CW1 15-panel) + CW4 allowlist', () => {
    const matrix = buildConsolidationTruthMatrix()
    const blockedIds = [
      'agents.receipt.completeness',
      'agents.nexus.task-graph',
      'ui.persistence.spine',
      'master-ux.hero-panels',
    ] as const

    for (const id of blockedIds) {
      const row = matrix.rows.find((r) => r.id === id)
      expect(row, `missing row ${id}`).toBeDefined()
      expect(row?.marketingAllowed, `${id} marketing must be false`).toBe(false)
      expect(row?.heldReason, `${id} must cite heldReason`).toBeTruthy()
    }

    const receipt = matrix.rows.find((r) => r.id === 'agents.receipt.completeness')
    expect(receipt?.heldReason).toBe('j9_visual_evidence_webm_held')
    expect(receipt?.lastEvidence).toMatch(/j9WebM=HELD/)
    expect(receipt?.status).not.toBe('IMPLEMENTED')

    const nexus = matrix.rows.find((r) => r.id === 'agents.nexus.task-graph')
    expect(nexus?.heldReason).toBe('j11_j12_founder_stop')
    expect(nexus?.lastEvidence).toMatch(/j11j12=STOPPED/)
    expect(nexus?.status).not.toBe('IMPLEMENTED')

    const hero = matrix.rows.find((r) => r.id === 'master-ux.hero-panels')
    expect(hero?.heldReason).toBe('cw1_hero_panel_product_depth')
    expect(hero?.lastEvidence).toMatch(/benchColumns=CLOSED/)
    expect(hero?.lastEvidence).toMatch(/slots=15/)
    expect(hero?.status).not.toBe('IMPLEMENTED')

    const spine = matrix.rows.find((r) => r.id === 'ui.persistence.spine')
    expect(spine?.status).toBe('IMPLEMENTED')
    expect(spine?.marketingAllowed).toBe(false)
  })

  it('applyConsolidationMarketingFailClosed cannot re-enable blocked rows', () => {
    const rows = buildConsolidationTruthMatrix().rows.map((row) => ({
      ...row,
      marketingAllowed: true,
      status: 'IMPLEMENTED' as const,
    }))
    applyConsolidationMarketingFailClosed(rows)

    const blockedIds = [
      'agents.receipt.completeness',
      'agents.nexus.task-graph',
      'ui.persistence.spine',
      'master-ux.hero-panels',
    ]
    for (const id of blockedIds) {
      expect(rows.find((r) => r.id === id)?.marketingAllowed).toBe(false)
    }
  })
})

/**
 * CW1 — Master UX 15-slot hero panel bench (real surfaces only; no mock heroes).
 */

import { describe, expect, it } from 'vitest'
import {
  CREATIVE_WORKBENCH_DOCK_SLOTS,
  FORBIDDEN_MOCK_HERO_REL_PATHS,
  MASTER_UX_HERO_PANEL_SPEC_COUNT,
  buildMasterUxHeroPanelBench,
  listMissingRequiredRealSurfaces,
  listPresentForbiddenMockHeroFiles,
} from '@/lib/production/master-ux-hero-panel-bench'
import { buildConsolidationTruthMatrix } from '@/lib/production/consolidation-truth-matrix'

describe('CW1 master-ux hero panel bench', () => {
  it('fills exactly 15 Spec slots with claim/path/status/bench/marketing', () => {
    const bench = buildMasterUxHeroPanelBench()

    expect(bench.specSlotCount).toBe(MASTER_UX_HERO_PANEL_SPEC_COUNT)
    expect(bench.rows).toHaveLength(15)
    expect(bench.benchColumnsClosed).toBe(true)
    expect(bench.productStatus).toBe('PARTIAL')
    expect(bench.marketingAaaAllowed).toBe(false)
    expect(bench.heldReason).toBe('cw1_hero_panel_product_depth')

    for (const row of bench.rows) {
      expect(row.claim.length).toBeGreaterThan(8)
      expect(row.specFile.endsWith('.tsx')).toBe(true)
      expect(row.bench).toBe('CLOSED')
      expect(row.marketingAllowed).toBe(false)
      expect(['PARTIAL', 'HELD', 'NOT_IMPLEMENTED']).toContain(row.status)
    }
  })

  it('keeps Spec-named mock hero files absent and required real surfaces present', () => {
    expect(listPresentForbiddenMockHeroFiles()).toEqual([])
    expect(listMissingRequiredRealSurfaces()).toEqual([])
    expect(FORBIDDEN_MOCK_HERO_REL_PATHS.length).toBeGreaterThanOrEqual(15)
  })

  it('registers only real dock / studio / IDE surfaces (no fake 15 dock invent)', () => {
    const bench = buildMasterUxHeroPanelBench()

    expect(bench.workbenchDockDefaults.creativeSlots).toEqual([...CREATIVE_WORKBENCH_DOCK_SLOTS])
    expect(bench.workbenchDockDefaults.ideRegions).toEqual(
      expect.arrayContaining(['sidebar', 'editor', 'preview', 'chat', 'terminal']),
    )
    expect(bench.workbenchDockDefaults.studioToolCount).toBeGreaterThan(0)

    const docked = bench.rows.filter((r) => r.dockRegistered)
    expect(docked.length).toBeGreaterThanOrEqual(8)
    expect(docked.length).toBeLessThan(15)

    const heldNoDock = bench.rows.filter((r) => r.status === 'HELD' && !r.dockRegistered)
    expect(heldNoDock.map((r) => r.id)).toEqual(
      expect.arrayContaining([
        'ux.world-partition',
        'ux.multiplayer-netcode',
        'ux.voronoi-destruction',
      ]),
    )

    // Honesty: never claim IMPLEMENTED ship for Spec hero invent
    expect(bench.summary.mockHeroFilesPresent).toBe(0)
    expect(bench.summary.realSurfaces).toBe(15)
    expect(bench.summary.partial + bench.summary.held).toBe(15)
  })

  it('wires live bench evidence into consolidation truth matrix', () => {
    const matrix = buildConsolidationTruthMatrix()
    const hero = matrix.rows.find((r) => r.id === 'master-ux.hero-panels')

    expect(hero).toBeDefined()
    expect(hero?.path).toContain('master-ux-hero-panel-bench')
    expect(hero?.status).toBe('PARTIAL')
    expect(hero?.marketingAllowed).toBe(false)
    expect(hero?.heldReason).toBe('cw1_hero_panel_product_depth')
    expect(hero?.lastEvidence).toMatch(/benchColumns=CLOSED/)
    expect(hero?.lastEvidence).toMatch(/slots=15/)
    expect(hero?.lastEvidence).toMatch(/mockHeroPresent=0/)
    expect(hero?.lastEvidence).not.toMatch(/cw1Bench=OPEN/)
  })
})

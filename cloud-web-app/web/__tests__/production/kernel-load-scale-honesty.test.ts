/**
 * CW2 — Kernel load-scale honesty catalog tests.
 */

import { describe, expect, it } from 'vitest'
import {
  CW2_LOAD_SCALE_MIN_N,
  CW2_SOAK_WALL_BUDGET_SEC,
  probeKernelLoadScaleHonesty,
} from '@/lib/production/kernel-load-scale-honesty'

describe('CW2 kernel load-scale honesty', () => {
  it('catalogs N≥2048 peers without AAA marketing ready', () => {
    const report = probeKernelLoadScaleHonesty()
    expect(report.wave).toBe('CW2')
    expect(report.overallStatus).toBe('PARTIAL')
    expect(report.minPeerN).toBe(CW2_LOAD_SCALE_MIN_N)
    expect(report.wallBudgetSec).toBe(CW2_SOAK_WALL_BUDGET_SEC)
    expect(report.marketingAllowed).toBe(false)
    expect(report.chaosDestructionAaaReady).toBe(false)
    expect(report.gpuMemoryMatrixReady).toBe(false)
    expect(report.heldReason).toBe('cw2_gpu_matrix_chaos_aaa_open')

    for (const peer of report.peers) {
      expect(peer.soakN).toBeGreaterThanOrEqual(CW2_LOAD_SCALE_MIN_N)
      expect(peer.readyGateN).toBe(CW2_LOAD_SCALE_MIN_N)
      expect(peer.aaaMarketingReady).toBe(false)
      expect(peer.heldFlags.length).toBeGreaterThan(0)
    }
  })

  it('includes SPH/XPBD/LBM/Voronoi peer ids from Progress ledger', () => {
    const report = probeKernelLoadScaleHonesty()
    const ids = report.peers.map((p) => p.id)
    expect(ids).toContain('matter_thermodynamics_sph_hash')
    expect(ids).toContain('position_based_dynamics_xpbd')
    expect(ids).toContain('lattice_boltzmann_fluid')
    expect(ids).toContain('gpu_fracture_voronoi')
  })
})

/**
 * CW7 — Disk austerity honesty probe tests.
 */

import { describe, expect, it } from 'vitest'
import {
  CW7_OVERALL_STATUS,
  CW7_RECOMMENDED_TARGET_DIR,
  probeDiskAusterityHonesty,
} from '@/lib/production/disk-austerity-honesty'

describe('CW7 disk austerity honesty', () => {
  it('stays PARTIAL — orphan prune / CAS / CI not enforced', () => {
    const report = probeDiskAusterityHonesty()
    expect(report.wave).toBe('CW7')
    expect(report.overallStatus).toBe(CW7_OVERALL_STATUS)
    expect(report.stamp).toBe('PARTIAL')
    expect(report.marketingAllowed).toBe(false)
    expect(report.orphanPruneEnforced).toBe(false)
    expect(report.casCookEnforced).toBe(false)
    expect(report.ciSingleTargetEnforced).toBe(false)
    expect(report.heldReason).toBe('cw7_orphan_prune_cas_ci_open')
  })

  it('finds trackable docs and example config from web cwd', () => {
    const report = probeDiskAusterityHonesty()
    expect(report.artifacts.some((a) => a.id === 'kernel-rust-disk-doc' && a.exists)).toBe(true)
    expect(report.artifacts.some((a) => a.id === 'studio-local-disk-doc' && a.exists)).toBe(true)
    expect(
      report.artifacts.some((a) => a.id === 'studio-local-cargo-example' && a.exists),
    ).toBe(true)
    expect(CW7_RECOMMENDED_TARGET_DIR).toContain('aethel-target-gnu')
  })
})

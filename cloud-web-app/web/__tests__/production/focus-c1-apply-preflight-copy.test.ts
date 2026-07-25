import { describe, expect, it } from 'vitest'
import {
  formatApplyPreflightBanner,
  mapApplyPreflightDeny,
} from '@/lib/ai/apply-preflight-user-copy'

describe('apply-preflight-user-copy Focus C1', () => {
  it('maps LAZY_INSPECTOR_REJECT to calm EN fail-closed copy', () => {
    const copy = mapApplyPreflightDeny({
      error: 'LAZY_INSPECTOR_REJECT',
      message: 'Truncation detected',
      metadata: { runId: 'run_lazy_1' },
    })
    expect(copy.title).toMatch(/incomplete/i)
    expect(copy.detail).toContain('Truncation')
    expect(copy.needsFullAccess).toBe(false)
    expect(formatApplyPreflightBanner(copy)).toContain('run_lazy_1')
  })

  it('maps L5_PROJECT_TYPECHECK_FAIL', () => {
    const copy = mapApplyPreflightDeny({ error: 'L5_PROJECT_TYPECHECK_FAIL' })
    expect(copy.title).toMatch(/typecheck/i)
    expect(copy.detail).toMatch(/Nothing was written/i)
  })

  it('maps L5_LINT_FAIL', () => {
    const copy = mapApplyPreflightDeny({ error: 'L5_LINT_FAIL' })
    expect(copy.title).toMatch(/lint/i)
    expect(copy.detail).toMatch(/Nothing was written/i)
  })

  it('maps RUST_GATE_SANDBOX_UNAVAILABLE', () => {
    const copy = mapApplyPreflightDeny({ error: 'RUST_GATE_SANDBOX_UNAVAILABLE' })
    expect(copy.title).toMatch(/rust gate/i)
    expect(copy.detail).toMatch(/Nothing was written/i)
    expect(copy.needsFullAccess).toBe(false)
  })

  it('maps CREATIVE_COST_GUARD_DENIED with blockedReason', () => {
    const copy = mapApplyPreflightDeny({
      error: 'CREATIVE_COST_GUARD_DENIED',
      blockedReason: 'Free tier requires BYOK',
    })
    expect(copy.title).toMatch(/cost guard/i)
    expect(copy.detail).toContain('BYOK')
  })

  it('maps FULL_ACCESS_GRANT_REQUIRED with CTA flag', () => {
    const copy = mapApplyPreflightDeny({ error: 'FULL_ACCESS_GRANT_REQUIRED' })
    expect(copy.needsFullAccess).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'

import { resolveWorkbenchConvergenceRedirect } from '@/lib/routes/workbench-convergence'

describe('workbench convergence redirects', () => {
  it('converges /nexus into Film Studio director tool', () => {
    const redirect = resolveWorkbenchConvergenceRedirect('/nexus')
    expect(redirect).toEqual({
      target: '/studio/film?tool=director',
      reason: 'ide',
    })
  })

  it('converges nested /nexus paths into Film Studio director tool', () => {
    const redirect = resolveWorkbenchConvergenceRedirect('/nexus/research')
    expect(redirect?.target).toBe('/studio/film?tool=director')
  })
})

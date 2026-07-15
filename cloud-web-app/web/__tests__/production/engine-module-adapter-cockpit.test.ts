import { describe, expect, it } from 'vitest'

import {
  ENGINE_SPINE_MODULES,
  getEngineSpineDecisionMatrix,
  getEngineSpinePriorityModules,
  getEngineSpineReadinessModel,
  getEngineSpineSummary,
} from '@/lib/studio/engine-spine-modules'

describe('engine module adapter cockpit data', () => {
  it('keeps the engine spine visible without pretending heavy modules are ready', () => {
    const summary = getEngineSpineSummary()
    const readiness = getEngineSpineReadinessModel()

    expect(summary.totalModules).toBeGreaterThanOrEqual(14)
    expect(summary.heavyHeld).toBeGreaterThan(0)
    expect(readiness.state).toBe('worker-held')
    expect(readiness.blockers.join(' ')).toContain('must not be loaded directly')
    expect(readiness.nextAction).toContain('worker')
  })

  it('prioritizes high-risk held modules before low-risk ready modules', () => {
    const priority = getEngineSpinePriorityModules(4)

    expect(priority.length).toBe(4)
    expect(priority[0].risk).toBe('high')
    expect(priority.map((module) => module.status)).toContain('worker-held')
    expect(priority.map((module) => module.loadStrategy)).toContain('worker-or-sidecar')
  })

  it('creates deterministic decision matrix rows for product surfaces', () => {
    const matrix = getEngineSpineDecisionMatrix('domain')
    const domains = matrix.map((row) => row.key)

    expect(domains).toEqual(expect.arrayContaining(['render', 'world', 'film', 'systems', 'network', 'assets', 'native']))
    expect(matrix.every((row) => row.modules.length > 0)).toBe(true)
    expect(matrix.reduce((sum, row) => sum + row.modules.length, 0)).toBe(ENGINE_SPINE_MODULES.length)
  })

  it('does not mark high-risk modules as directly visible', () => {
    const unsafe = ENGINE_SPINE_MODULES.filter((module) => module.risk === 'high' && module.loadStrategy === 'already-visible')

    expect(unsafe).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'

import {
  ENGINE_MODULE_ADAPTERS,
  createSequencerAdapterSummary,
  validateEngineModuleAdapters,
} from '@/lib/production/engine-module-adapters'
import {
  ENGINE_MODULE_INTEGRATION_DECISIONS,
  listEngineModuleDecisions,
  validateEngineModuleIntegrationPlan,
} from '@/lib/production/engine-module-integration-plan'

describe('engine module integration plan', () => {
  it('forces every low-import engine module into a wire or retire decision', () => {
    expect(ENGINE_MODULE_INTEGRATION_DECISIONS.map((item) => item.modulePath)).toEqual(
      expect.arrayContaining([
        'lib/sequencer-cinematics.ts',
        'lib/postprocessing/post-processing-system.ts',
        'lib/particles/advanced-particle-system.ts',
        'lib/particle-system-real.ts',
        'lib/ai/behavior-tree-system.tsx',
        'lib/control-rig-system.ts',
        'lib/facial-animation-system.ts',
        'lib/world/world-streaming.tsx',
        'lib/collaboration/collaboration-realtime.ts',
        'lib/theme-service.ts',
        'lib/workspace-store.ts',
      ])
    )
    expect(validateEngineModuleIntegrationPlan()).toEqual([])
  })

  it('keeps wire decisions attached to visible Studio owner surfaces', () => {
    const wired = listEngineModuleDecisions('wire')

    expect(wired.length).toBeGreaterThanOrEqual(6)
    expect(wired.every((item) => item.ownerSurface.startsWith('/studio/'))).toBe(true)
    expect(wired.every((item) => item.status === 'adapter-wired')).toBe(true)
    expect(wired.flatMap((item) => item.acceptanceCriteria).join(' ')).toContain('evidence')
  })

  it('keeps executable adapters attached to evidence-bearing contracts', () => {
    expect(validateEngineModuleAdapters()).toEqual([])
    expect(ENGINE_MODULE_ADAPTERS.map((adapter) => adapter.modulePath)).toEqual(
      expect.arrayContaining([
        'lib/sequencer-cinematics.ts',
        'lib/postprocessing/post-processing-system.ts',
        'lib/particles/advanced-particle-system.ts',
        'lib/world/world-streaming.tsx',
      ])
    )
    expect(ENGINE_MODULE_ADAPTERS.every((adapter) => adapter.evidenceSignals.length >= 2)).toBe(true)
    expect(createSequencerAdapterSummary().easingKeys).toContain('linear')
  })
})

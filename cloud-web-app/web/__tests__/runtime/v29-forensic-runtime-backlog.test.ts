import { describe, expect, it } from 'vitest'

import {
  buildV29ForensicRuntimeBacklogReport,
  validateV29ForensicRuntimeBacklog,
  V29_FORENSIC_FORBIDDEN_PROMOTIONS,
  V29_FORENSIC_RUNTIME_BLOCKS,
} from '@/lib/runtime/v29-forensic-runtime-backlog'

describe('v29 forensic runtime backlog', () => {
  it('tracks the hard internal gaps from the forensic audit as executable blocks', () => {
    expect(validateV29ForensicRuntimeBacklog()).toEqual([])
    expect(V29_FORENSIC_RUNTIME_BLOCKS.map((block) => block.id)).toEqual(
      expect.arrayContaining([
        'webgpu-render-kernel',
        'sequencer-kernel',
        'agent-runtime-tools',
        'mcp-plugin-host',
        'studio-local-native-kernel',
        'cloud-render-export',
        'asset-library-quality',
        'physics-ai-ondevice-photogrammetry',
        'i18n-single-source',
      ]),
    )
  })

  it('keeps every forensic block below availability until dedicated receipts exist', () => {
    const report = buildV29ForensicRuntimeBacklogReport()

    expect(report.blockCount).toBeGreaterThanOrEqual(9)
    expect(report.p0Count).toBeGreaterThanOrEqual(6)
    expect(report.heldOrBlockedCount).toBe(report.blockCount)
    expect(report.nextExecutionBlock).toBe('webgpu-render-kernel')
    expect(report.blocks.every((block) => block.state !== 'available')).toBe(true)
  })

  it('keeps forbidden market claims explicit and centralized', () => {
    expect(V29_FORENSIC_FORBIDDEN_PROMOTIONS).toEqual(
      expect.arrayContaining([
        'Unreal-grade',
        'final asset',
        'production ready',
        'signed installer ready',
        'autonomous execution ready',
      ]),
    )
  })
})

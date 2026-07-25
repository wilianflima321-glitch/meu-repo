import { beforeEach, describe, expect, it } from 'vitest'

import {
  mapMonacoDiagnosticsToProblems,
  publishMonacoDiagnosticsToProblems,
} from '@/lib/problems/monaco-diagnostics-bridge'
import { getProblemsManager } from '@/lib/problems/problems-manager'

describe('monaco-diagnostics-bridge', () => {
  beforeEach(() => {
    getProblemsManager().clearProblems()
  })

  it('maps Monaco 1-based lines to Problems 0-based ranges', () => {
    const mapped = mapMonacoDiagnosticsToProblems('/src/a.ts', [
      {
        line: 3,
        column: 5,
        endLine: 3,
        endColumn: 10,
        message: 'Expected ;',
        severity: 'error',
        source: 'ts',
        code: 1005,
      },
    ])
    expect(mapped).toHaveLength(1)
    expect(mapped[0]).toMatchObject({
      uri: '/src/a.ts',
      severity: 'error',
      message: 'Expected ;',
      source: 'ts',
      range: {
        start: { line: 2, character: 4 },
        end: { line: 2, character: 9 },
      },
    })
  })

  it('publishes into ProblemsManager and clears on empty', () => {
    publishMonacoDiagnosticsToProblems('/src/b.ts', [
      {
        line: 1,
        column: 1,
        message: 'Unused',
        severity: 'warning',
      },
    ])
    expect(getProblemsManager().getStats().warnings).toBe(1)
    expect(getProblemsManager().getProblems()[0]?.uri).toBe('/src/b.ts')

    publishMonacoDiagnosticsToProblems('/src/b.ts', [])
    expect(getProblemsManager().getProblemsForFile('/src/b.ts')).toHaveLength(0)
  })

  it('fail-closed empty authority reports zero totals', () => {
    expect(getProblemsManager().getStats().total).toBe(0)
    expect(getProblemsManager().getProblems()).toEqual([])
  })
})

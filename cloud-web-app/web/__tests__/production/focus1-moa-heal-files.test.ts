import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { runApexMoACell } from '@/lib/production/apex-moa-orchestrator'
import {
  runAutoHealLoop,
  stubValidatePatchForTests,
} from '@/lib/production/auto-heal-loop'
import {
  assertAllowedPathsOnDisk,
  listRealWorkspaceChildren,
} from '@/lib/production/workspace-tree-authority'
import { assertDisjointAllowedPaths, buildMaestroDelegationPlan } from '@/lib/production/maestro-delegation'
import { evaluateGovernedAgentToolJob } from '@/lib/production/agent-tool-job-runner'

describe('apex-moa-orchestrator', () => {
  it('fans out adaptive width and LazyInspector PASS yields CANDIDATE', async () => {
    const result = await runApexMoACell({
      job: {
        taskDomain: 'code',
        prompt: 'fix jump',
        riskScore: 55,
        planId: 'pro',
        lawsPackId: 'laws',
        contextPackId: 'pack',
        projectMemoryDigestId: 'mem',
      },
      generate: async ({ modelId }) => ({
        patchText: `export function jump() {\n  return 1 // ${modelId}\n}\n`,
      }),
    })
    expect(result.generatorWidth).toBe(2)
    expect(result.proposals.length).toBe(2)
    expect(result.verdict).toBe('CANDIDATE')
    expect(result.supremePatch).toContain('export function jump')
  })

  it('rejects lazy stubs with LAZY_RETRY', async () => {
    const result = await runApexMoACell({
      job: {
        taskDomain: 'code',
        prompt: 'broken',
        riskScore: 10,
        planId: 'pro',
        lawsPackId: 'l',
        contextPackId: 'c',
        projectMemoryDigestId: 'm',
      },
      generate: async () => ({
        patchText: 'export function x() {\n  // TODO: implement\n}\n',
      }),
    })
    expect(result.verdict).toBe('LAZY_RETRY')
    expect(result.lazy?.settleZero).toBe(true)
  })
})

describe('auto-heal-loop', () => {
  it('heals SYNTAX_ERROR_MARKER within max rounds', async () => {
    let attempt = 0
    const result = await runAutoHealLoop({
      initialPatch: 'const x = SYNTAX_ERROR_MARKER',
      validate: stubValidatePatchForTests,
      maxRounds: 3,
      repair: async () => {
        attempt += 1
        return { patchText: attempt >= 1 ? 'const x = 1\n' : 'const x = SYNTAX_ERROR_MARKER' }
      },
    })
    expect(result.verdict).toBe('APPLY')
    expect(result.finalPatch).toContain('const x = 1')
  })
})

describe('maestro-delegation paths', () => {
  it('detects overlapping allowedPaths', () => {
    const plan = buildMaestroDelegationPlan({
      missionId: 'm1',
      maestroModelId: 'sonnet',
      projectMemoryDigestId: 'mem',
      lawsPackId: 'laws',
      contextPackId: 'pack',
      critical: {
        domain: 'code',
        intent: 'core',
        allowedPaths: ['/src/a.ts'],
        successCriteria: ['compiles'],
        riskScore: 80,
      },
      peripherals: [
        {
          domain: 'ui',
          intent: 'chrome',
          allowedPaths: ['/src/a.ts'],
          successCriteria: ['renders'],
          riskScore: 30,
        },
      ],
    })
    const check = assertDisjointAllowedPaths(plan)
    expect(check.ok).toBe(false)
    expect(check.conflicts.length).toBeGreaterThan(0)
  })
})

describe('workspace-tree-authority Focus 1B', () => {
  it('lists real disk children under scoped workspace', async () => {
    const prev = process.env.AETHEL_WORKSPACE_ROOT
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-ws-'))
    process.env.AETHEL_WORKSPACE_ROOT = tmp
    try {
      const listed = await listRealWorkspaceChildren({
        userId: 'user-test',
        projectId: 'proj-test',
        virtualPath: '/',
      })
      const fileAbs = path.join(listed.root, 'hello.ts')
      await fs.writeFile(fileAbs, 'export const n = 1\n', 'utf8')
      const again = await listRealWorkspaceChildren({
        userId: 'user-test',
        projectId: 'proj-test',
      })
      expect(again.children.some((c) => c.name === 'hello.ts')).toBe(true)
      expect(again.children.every((c) => typeof c.path === 'string')).toBe(true)

      const onlyMissing = await assertAllowedPathsOnDisk({
        userId: 'user-test',
        projectId: 'proj-test',
        allowedPaths: ['/nope-does-not-exist.ts'],
      })
      expect(onlyMissing.ok).toBe(false)
      expect(
        onlyMissing.missing.length > 0 ||
          onlyMissing.resolved.some((r) => r.exists === false) ||
          onlyMissing.outsideScope.length > 0,
      ).toBe(true)
    } finally {
      if (prev === undefined) delete process.env.AETHEL_WORKSPACE_ROOT
      else process.env.AETHEL_WORKSPACE_ROOT = prev
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})

describe('agent-tool-job-runner Laws gate #58', () => {
  it('blocks mutating job when architecture context missing and enforceArchitectureLaws', () => {
    const decision = evaluateGovernedAgentToolJob({
      toolId: 'diff-proposal',
      mode: 'Builder',
      projectId: 'p1',
      agent: 'Builder',
      mission: 'patch',
      intent: 'apply file',
      targetPaths: ['/a.ts'],
      enforcement: 'enforced',
      enforceArchitectureLaws: true,
      hasDiffEvidence: true,
      idempotencyKey: 'k1',
      rollbackRef: 'rb1',
      approvalToken: 'ok',
      readReceiptRefs: ['rr'],
      scopeLockRef: 'sl',
      evidenceRefs: ['diff:1'],
    })
    expect(decision.architectureLaws?.verdict).toBe('BLOCK')
    expect(decision.ready).toBe(false)
    expect(decision.allowed).toBe(false)
  })
})

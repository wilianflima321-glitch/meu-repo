/**
 * CW6 — merge governance receipts + task-graph dependency edges + receipt graph.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  appendGovernedApplyReceipt,
  buildMergeReceiptDependencyGraph,
  buildNexusTaskDependencyList,
  buildReceiptTaskDependencyList,
  buildTouchedPathStatusList,
  extractPatchHashRefsFromLedgerEvents,
  extractTaskDependenciesFromApplyResult,
  extractTouchedPathsFromApplyResult,
  summarizeMergeReceiptConflict,
  toGovernedApplyReceipt,
} from '@/lib/production/agents-merge-governance'
import type { NexusCellUi } from '@/lib/production/nexus-mission-phases'

describe('CW6 agents merge governance', () => {
  it('builds deny/apply receipts with marketing fail-closed', () => {
    const denied = toGovernedApplyReceipt('src/a.ts', {
      ok: false,
      copy: {
        code: 'APPLY_PREFLIGHT_DENIED',
        title: 'Blocked',
        detail: 'Risk gate',
        needsFullAccess: false,
      },
      banner: 'Blocked — Risk gate',
      error: 'APPLY_PREFLIGHT_DENIED',
      runId: 'run_1',
    })
    expect(denied.outcome).toBe('denied')
    expect(denied.code).toBe('APPLY_PREFLIGHT_DENIED')
    expect(denied.marketingAllowed).toBe(false)
    expect(denied.touchedPaths).toEqual(['src/a.ts'])
    expect(denied.taskDependencies).toEqual([])

    const applied = toGovernedApplyReceipt('src/a.ts', {
      ok: true,
      message: 'Apply succeeded.',
      runId: 'run_2',
      rollbackToken: 'rb_1',
      metadata: {
        touchedPaths: ['src/a.ts', 'src/b.ts'],
        taskDependencies: [{ taskId: 'peri_1', dependsOnTaskIds: ['nucleus_1'] }],
      },
    })
    expect(applied.outcome).toBe('applied')
    expect(applied.rollbackToken).toBe('rb_1')
    expect(applied.marketingAllowed).toBe(false)
    expect(applied.touchedPaths).toEqual(['src/a.ts', 'src/b.ts'])
    expect(applied.taskDependencies).toEqual([
      { taskId: 'peri_1', dependsOnTaskIds: ['nucleus_1'], source: 'receipt-metadata' },
    ])
  })

  it('builds touched-path status list with conflict/deny clarity (no success theater)', () => {
    const applied = toGovernedApplyReceipt('src/shared.ts', {
      ok: true,
      message: 'ok',
      runId: 'run_ok',
      rollbackToken: 'rb',
      metadata: { touchedPaths: ['src/shared.ts', 'src/only-ok.ts'] },
    })
    const denied = toGovernedApplyReceipt('src/shared.ts', {
      ok: false,
      copy: {
        code: 'APPLY_PREFLIGHT_DENIED',
        title: 'Blocked',
        detail: 'Risk gate',
        needsFullAccess: false,
      },
      banner: 'Blocked',
      error: 'APPLY_PREFLIGHT_DENIED',
      runId: 'run_deny',
    })
    const list = buildTouchedPathStatusList([applied, denied])
    const shared = list.find((e) => e.path === 'src/shared.ts')
    const onlyOk = list.find((e) => e.path === 'src/only-ok.ts')
    expect(shared?.status).toBe('conflict')
    expect(shared?.applyCount).toBe(1)
    expect(shared?.denyCount).toBe(1)
    expect(onlyOk?.status).toBe('applied')
    const summary = summarizeMergeReceiptConflict([applied, denied])
    expect(summary.conflictPathCount).toBe(1)
    expect(summary.operatorSummary).toMatch(/Merge blocked/i)
    expect(summary.operatorSummary).toMatch(/mixed applied\+denied/i)
  })

  it('extracts receipt-metadata task deps without fabricating Nexus roots', () => {
    const deps = extractTaskDependenciesFromApplyResult({
      ok: true,
      message: 'ok',
      runId: 'r',
      rollbackToken: 'rb',
      metadata: {
        taskId: 't2',
        dependsOnTaskIds: ['t1'],
      },
    })
    expect(deps).toEqual([
      { taskId: 't2', dependsOnTaskIds: ['t1'], source: 'receipt-metadata' },
    ])
    expect(extractTaskDependenciesFromApplyResult({
      ok: false,
      copy: {
        code: 'APPLY_PREFLIGHT_DENIED',
        title: 'Blocked',
        detail: 'x',
        needsFullAccess: false,
      },
      banner: 'Blocked',
      error: 'APPLY_PREFLIGHT_DENIED',
    })).toEqual([])

    const receipt = toGovernedApplyReceipt('src/a.ts', {
      ok: true,
      message: 'ok',
      runId: 'r',
      rollbackToken: 'rb',
      metadata: {
        taskDependencies: [
          { taskId: 't2', dependsOnTaskIds: ['t1'] },
          { taskId: 't3', dependsOnTaskIds: ['t2'] },
        ],
      },
    })
    const list = buildReceiptTaskDependencyList([receipt])
    expect(list.map((e) => e.taskId).sort()).toEqual(['t2', 't3'])
    expect(list.every((e) => e.source === 'receipt-metadata')).toBe(true)
  })

  it('extracts touched paths from apply result metadata (no fabrication)', () => {
    const paths = extractTouchedPathsFromApplyResult('lib/main.ts', {
      ok: true,
      message: 'ok',
      runId: 'r',
      rollbackToken: 'rb',
      metadata: { changedFiles: ['lib/main.ts', 'lib/util.ts'] },
    })
    expect(paths).toEqual(expect.arrayContaining(['lib/main.ts', 'lib/util.ts']))
  })

  it('does not invent peripheral→nucleus edges when dependsOnTaskIds absent', () => {
    const cells: NexusCellUi[] = [
      {
        taskId: 'nucleus_1',
        role: 'nucleus',
        domainLabel: 'Nucleus',
        status: 'completed',
      },
      {
        taskId: 'peri_1',
        role: 'peripheral',
        domainLabel: 'Swarm',
        status: 'working',
      },
    ]
    const edges = buildNexusTaskDependencyList(cells)
    expect(edges.find((e) => e.taskId === 'nucleus_1')?.dependsOnTaskIds).toEqual([])
    expect(edges.find((e) => e.taskId === 'peri_1')?.dependsOnTaskIds).toEqual([])
  })

  it('honors explicit dependsOnTaskIds only (no role-heuristic theater)', () => {
    const cells: NexusCellUi[] = [
      {
        taskId: 'nucleus_1',
        role: 'nucleus',
        domainLabel: 'Nucleus',
        status: 'completed',
      },
      {
        taskId: 'peri_1',
        role: 'peripheral',
        domainLabel: 'Swarm',
        status: 'working',
        dependsOnTaskIds: ['nucleus_1'],
      },
    ]
    const edges = buildNexusTaskDependencyList(cells)
    expect(edges.find((e) => e.taskId === 'peri_1')?.dependsOnTaskIds).toEqual(['nucleus_1'])
  })

  it('builds merge receipt dependency graph from cells + apply path', () => {
    const cells: NexusCellUi[] = [
      {
        taskId: 'nucleus_1',
        role: 'nucleus',
        domainLabel: 'Nucleus',
        status: 'completed',
      },
      {
        taskId: 'peri_1',
        role: 'peripheral',
        domainLabel: 'Swarm',
        status: 'working',
        dependsOnTaskIds: ['nucleus_1'],
      },
    ]
    const denied = toGovernedApplyReceipt('src/foo.ts', {
      ok: false,
      copy: {
        code: 'APPLY_PREFLIGHT_DENIED',
        title: 'Blocked',
        detail: 'Risk gate',
        needsFullAccess: false,
      },
      banner: 'Blocked',
      error: 'APPLY_PREFLIGHT_DENIED',
      runId: 'run_deny',
    })
    const applied = toGovernedApplyReceipt('src/bar.ts', {
      ok: true,
      message: 'ok',
      runId: 'run_ok',
      rollbackToken: 'rb',
      metadata: { touchedPaths: ['src/bar.ts', 'src/shared.ts'] },
    })
    const nodes = buildMergeReceiptDependencyGraph({
      cells,
      applyReceipts: [denied, applied],
    })
    expect(nodes.some((n) => n.kind === 'task' && n.id === 'task:peri_1')).toBe(true)
    const pathNodes = nodes.filter((n) => n.kind === 'path')
    expect(pathNodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(['path:src/foo.ts', 'path:src/bar.ts', 'path:src/shared.ts']),
    )
    expect(pathNodes.every((n) => n.dependsOnIds.length === 0)).toBe(true)
    expect(pathNodes.find((n) => n.id === 'path:src/foo.ts')?.status).toBe('denied')
    expect(pathNodes.find((n) => n.id === 'path:src/bar.ts')?.status).toBe('applied')
    const applyNodes = nodes.filter((n) => n.kind === 'apply')
    expect(applyNodes).toHaveLength(2)
    expect(applyNodes[0]?.status).toBe('denied')
    expect(applyNodes[0]?.code).toBe('APPLY_PREFLIGHT_DENIED')
    // Real structured deps: apply → touched path nodes only (never fabricated Nexus roots).
    expect(applyNodes[0]?.dependsOnIds).toEqual(['path:src/foo.ts'])
    expect(applyNodes[1]?.dependsOnIds).toEqual(['path:src/bar.ts', 'path:src/shared.ts'])
    expect(applyNodes.every((n) => n.dependsOnIds.every((id) => id.startsWith('path:')))).toBe(
      true,
    )
    expect(applyNodes.every((n) => n.dependsOnIds.every((id) => !id.startsWith('task:')))).toBe(
      true,
    )
  })

  it('wires live applyReceipts from useAIChatOpsState through Agents ops strip', () => {
    const webRoot = join(__dirname, '../..')
    const panel = readFileSync(
      join(webRoot, '../packages/ide-ui/AIChatPanelPro.tsx'),
      'utf8',
    )
    const sidebar = readFileSync(
      join(webRoot, 'components/agents/chat/ops/AIChatOpsSidebar.tsx'),
      'utf8',
    )
    const strip = readFileSync(
      join(webRoot, 'components/agents/chat/ledger/MergeReceiptGraphStrip.tsx'),
      'utf8',
    )
    const state = readFileSync(
      join(webRoot, 'components/agents/chat/state/useAIChatOpsState.ts'),
      'utf8',
    )
    expect(state).toContain('pushReceipt')
    expect(state).toContain('toGovernedApplyReceipt')
    expect(panel).toContain('useAIChatOpsState')
    expect(panel).toContain('applyReceipts={applyReceipts}')
    expect(sidebar).toContain('MergeReceiptGraphStrip')
    expect(sidebar).toContain('applyReceipts={applyReceipts}')
    expect(strip).toContain('buildMergeReceiptDependencyGraph')
    expect(strip).toContain('summarizeMergeReceiptConflict')
    expect(strip).toContain('buildTouchedPathStatusList')
    expect(strip).toContain('touched-path-list')
    expect(strip).toContain('task-dependency-list')
  })

  it('summarizes conflict/deny clarity for operators (no success theater)', () => {
    const denied = toGovernedApplyReceipt('src/a.ts', {
      ok: false,
      copy: {
        code: 'APPLY_PREFLIGHT_DENIED',
        title: 'Blocked',
        detail: 'Risk gate',
        needsFullAccess: false,
      },
      banner: 'Blocked',
      error: 'APPLY_PREFLIGHT_DENIED',
      runId: 'run_1',
    })
    const applied = toGovernedApplyReceipt('src/b.ts', {
      ok: true,
      message: 'ok',
      runId: 'run_2',
      rollbackToken: 'rb',
      metadata: null,
    })
    const history = appendGovernedApplyReceipt([], applied)
    const withDeny = appendGovernedApplyReceipt(history, denied)
    const summary = summarizeMergeReceiptConflict(withDeny)
    expect(summary.appliedCount).toBe(1)
    expect(summary.deniedCount).toBe(1)
    expect(summary.marketingAllowed).toBe(false)
    expect(summary.operatorSummary).toMatch(/Merge blocked/i)
    expect(summary.operatorSummary).toMatch(/APPLY_PREFLIGHT_DENIED/)
  })

  it('extracts patch-hash refs for VisualEvidence HELD UX', () => {
    const refs = extractPatchHashRefsFromLedgerEvents([
      { refs: ['file:a.ts', 'sha256:abc123'] },
      { refs: ['patch-hash:def456', 'other'] },
    ])
    expect(refs).toEqual(expect.arrayContaining(['sha256:abc123', 'patch-hash:def456']))
  })
})

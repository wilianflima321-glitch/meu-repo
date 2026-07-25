/**
 * CW6 — Agents receipt completeness + task graph honesty (not J.11/J.12).
 */

import { describe, expect, it } from 'vitest'
import {
  evaluateCreativeReceiptCompleteness,
  evaluateEvidenceReceiptCompleteness,
  evaluateNexusTaskGraphCompleteness,
} from '@/lib/production/agents-receipt-completeness'
import type { AIChatLedgerArtifact } from '@/components/agents/evidence'
import type { NexusMissionUiPayload } from '@/lib/production/nexus-mission-phases'

describe('CW6 agents receipt completeness', () => {
  it('marks empty evidence incomplete fail-closed', () => {
    const report = evaluateEvidenceReceiptCompleteness(null)
    expect(report.complete).toBe(false)
    expect(report.marketingAllowed).toBe(false)
    expect(report.missingCount).toBeGreaterThan(0)
  })

  it('scores ledger fields including VisualEvidence held — never marks complete', () => {
    const ledger: AIChatLedgerArtifact = {
      kind: 'ledger',
      taskId: 'task_1',
      projectId: 'proj_1',
      mission: 'Wire receipts',
      updatedAt: new Date().toISOString(),
      eventCount: 1,
      events: [{ kind: 'apply', title: 'Patch', summary: 'ok', refs: ['a.ts'] }],
      fusionTransactionId: 'ftx_abc',
      visualEvidenceHeld: true,
    }
    const report = evaluateEvidenceReceiptCompleteness(ledger)
    expect(report.kind).toBe('ledger')
    expect(report.presentCount).toBeGreaterThanOrEqual(4)
    expect(report.heldCount).toBeGreaterThanOrEqual(1)
    expect(report.complete).toBe(false)
    expect(report.summary).toMatch(/incomplete|held/i)
    expect(report.fields.find((f) => f.id === 'visualEvidence')?.status).toBe('held')
    expect(report.marketingAllowed).toBe(false)
  })

  it('treats VisualEvidence as platform HELD even when held-flag is absent (not missing theater)', () => {
    const ledger: AIChatLedgerArtifact = {
      kind: 'ledger',
      taskId: 'task_2',
      projectId: 'proj_1',
      mission: 'Receipt honesty',
      updatedAt: new Date().toISOString(),
      eventCount: 1,
      events: [{ kind: 'apply', title: 'Patch', summary: 'ok', refs: ['b.ts'] }],
      fusionTransactionId: 'ftx_def',
      visualEvidenceHeld: false,
    }
    const report = evaluateEvidenceReceiptCompleteness(ledger)
    expect(report.fields.find((f) => f.id === 'visualEvidence')?.status).toBe('held')
    expect(report.missingCount).toBe(0)
    expect(report.heldCount).toBeGreaterThanOrEqual(1)
    expect(report.complete).toBe(false)
    expect(report.marketingAllowed).toBe(false)
  })

  it('scores nexus task graph cells + phases', () => {
    const nexus: NexusMissionUiPayload = {
      missionId: 'm1',
      currentPhase: 'apply',
      phaseLabel: 'Apply candidate ready',
      phases: [
        {
          phase: 'maestro_planning',
          at: '2026-07-23T00:00:00.000Z',
          label: 'Maestro planning…',
        },
      ],
      cells: [
        {
          taskId: 'c1',
          role: 'nucleus',
          domainLabel: 'Graph',
          status: 'completed',
        },
      ],
      verdict: 'APPLY',
      estimatedSpendTokens: 12,
      fusionTransactionId: 'ftx_1',
      visualEvidence: {
        status: 'HELD',
        kind: 'patch_hash',
        refs: [],
        message: 'WebM held',
      },
    }
    const report = evaluateNexusTaskGraphCompleteness(nexus)
    expect(report.kind).toBe('nexus')
    expect(report.fields.find((f) => f.id === 'cells')?.status).toBe('present')
    expect(report.fields.find((f) => f.id === 'visualEvidence')?.status).toBe('held')
    expect(report.complete).toBe(false)
    expect(report.marketingAllowed).toBe(false)
  })

  it('marks nexus APPLY without fusionTx incomplete (real receipt fields)', () => {
    const nexus: NexusMissionUiPayload = {
      missionId: 'm2',
      currentPhase: 'apply',
      phaseLabel: 'Apply',
      phases: [
        {
          phase: 'maestro_planning',
          at: '2026-07-23T00:00:00.000Z',
          label: 'Plan',
        },
      ],
      cells: [
        {
          taskId: 'c2',
          role: 'nucleus',
          domainLabel: 'Patch',
          status: 'completed',
        },
      ],
      verdict: 'APPLY',
      estimatedSpendTokens: 1,
      // fusionTransactionId missing on APPLY → missing, not held
      visualEvidence: {
        status: 'IMPLEMENTED',
        kind: 'patch_hash',
        refs: ['a.ts'],
        message: 'hash ok',
      },
    }
    const report = evaluateNexusTaskGraphCompleteness(nexus)
    expect(report.fields.find((f) => f.id === 'fusionTx')?.status).toBe('missing')
    expect(report.complete).toBe(false)
    expect(report.marketingAllowed).toBe(false)
  })

  it('scores creative graph-operator receipt incompleteness', () => {
    const report = evaluateCreativeReceiptCompleteness({
      operator: { kind: 'graph-operator', target: 'behavior-tree' },
      graphId: 'g1',
      nodeCount: 3,
      // fusionTransactionId intentionally missing
    })
    expect(report.kind).toBe('creative')
    expect(report.complete).toBe(false)
    expect(report.fields.find((f) => f.id === 'fusionTx')?.status).toBe('missing')
    expect(report.marketingAllowed).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { buildAgentReadReceiptState } from '@/lib/production/agent-read-receipts'
import {
  appendDeepSpineScanEvidence,
  buildDeepSpineScanManifest,
  buildDeepSpineScanReadReceipts,
  evaluateDeepSpineScanReadiness,
  mergeDeepSpineScanIntoProductionState,
  readDeepSpineScanManifestFromSettings,
  writeDeepSpineScanManifestToSettings,
} from '@/lib/production/deep-spine-scan'
import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { createTaskEvidenceLedger, summarizeTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'

describe('deep spine scan', () => {
  it('builds governed findings, work packets, read receipts, and no-auto-fix evidence', () => {
    const manifest = buildDeepSpineScanManifest({
      projectId: 'aethel-v17',
      mode: 'aaa',
      generatedAt: '2026-05-15T12:00:00.000Z',
      artifacts: [
        { path: 'cloud-web-app/web/lib/aaa-renderer-impl.ts', sizeBytes: 4_000, hash: 'sha256:renderer' },
        { path: 'cloud-web-app/web/lib/world-partition.ts', sizeBytes: 80_000, hash: 'sha256:world' },
        { path: 'cloud-web-app/web/components/viewport/VideoTimeline.tsx', sizeBytes: 120_000, hash: 'sha256:video' },
      ],
      surfaceSignals: [
        { path: 'cloud-web-app/web/lib/aaa-renderer-impl.ts', lineCount: 106 },
        { path: 'cloud-web-app/web/lib/world-partition.ts', lineCount: 1176, importerCount: 0 },
        { path: 'cloud-web-app/web/components/viewport/VideoTimeline.tsx', lineCount: 986 },
      ],
      budget: { maxFiles: 20, maxBytes: 10_000_000, maxFindings: 20 },
    })

    expect(manifest.scanId).toContain('deep-spine-aethel-v17-aaa')
    expect(manifest.findings.map((finding) => finding.category)).toEqual(
      expect.arrayContaining(['rendering', 'dead-code', 'god-file'])
    )
    expect(manifest.findings.every((finding) => finding.safeAutofix === false)).toBe(true)
    expect(manifest.readReceipts.length).toBeGreaterThan(1)
    expect(manifest.evidenceRefs).toEqual(expect.arrayContaining(['policy:no-auto-fix']))
    expect(manifest.workPackets.length).toBeGreaterThan(0)
    expect(manifest.blockedActions.join(' ')).toContain('Do not auto-fix')
    expect(manifest.handoffPrompt).toContain('Deep Spine Scan')
  })

  it('keeps huge scans budgeted instead of raw-loading the whole project', () => {
    const manifest = buildDeepSpineScanManifest({
      projectId: 'huge-repo',
      mode: 'deep',
      generatedAt: '2026-05-15T12:05:00.000Z',
      artifacts: [
        { path: 'src/a.ts', sizeBytes: 1_000, hash: 'sha256:a' },
        { path: 'src/b.ts', sizeBytes: 1_000, hash: 'sha256:b' },
        { path: 'assets/world.glb', sizeBytes: 600_000_000, hash: null },
      ],
      budget: { maxFiles: 2, maxBytes: 4_000, maxFindings: 20 },
    })

    expect(manifest.filesScanned).toBe(2)
    expect(manifest.bytesSkipped).toBeGreaterThan(0)
    expect(manifest.budgetExhausted).toBe(true)
    expect(manifest.findings.map((finding) => finding.category)).toContain('runtime-budget')
    expect(manifest.blockedActions.join(' ')).toContain('browser main thread')
  })

  it('holds external scans without license and checksum evidence', () => {
    const manifest = buildDeepSpineScanManifest({
      projectId: 'external-tool',
      mode: 'external',
      generatedAt: '2026-05-15T12:10:00.000Z',
      artifacts: [
        {
          path: 'downloads/unknown-render-tool/bin/tool.exe',
          sizeBytes: 12_000_000,
          sourceKind: 'github',
          hash: null,
          license: null,
          sourceUrl: null,
        },
      ],
      surfaceSignals: [
        {
          path: 'downloads/unknown-render-tool/bin/tool.exe',
          hasLicenseEvidence: false,
          hasChecksumEvidence: false,
        },
      ],
    })

    const externalFinding = manifest.findings.find((finding) => finding.category === 'external-provenance')
    expect(externalFinding?.severity).toBe('high')
    expect(externalFinding?.evidence.join(' ')).toContain('license:missing')
    expect(externalFinding?.evidence.join(' ')).toContain('checksum:missing')
    expect(externalFinding?.requiresHumanReview).toBe(true)
    expect(manifest.blockedActions.join(' ')).toContain('External adaptation is held')
  })

  it('accepts a browser AAA renderer only when capability and frame evidence are explicit', () => {
    const manifest = buildDeepSpineScanManifest({
      projectId: 'renderer-evidence',
      mode: 'aaa',
      generatedAt: '2026-05-15T12:12:00.000Z',
      artifacts: [
        { path: 'cloud-web-app/web/lib/aaa-renderer-impl.ts', sizeBytes: 8_000, hash: 'sha256:renderer' },
        { path: 'cloud-web-app/web/lib/runtime/runtime-renderer-adapter.ts', sizeBytes: 8_000, hash: 'sha256:webgpu' },
      ],
      surfaceSignals: [
        {
          path: 'cloud-web-app/web/lib/aaa-renderer-impl.ts',
          lineCount: 224,
          hasAaaRendererEvidence: true,
        },
        {
          path: 'cloud-web-app/web/lib/runtime/runtime-renderer-adapter.ts',
          hasWebGpuReference: true,
        },
      ],
    })

    expect(manifest.findings.find((finding) => finding.path.endsWith('aaa-renderer-impl.ts'))).toBeUndefined()
  })

  it('turns scan manifests into read receipts and task ledger evidence', () => {
    const manifest = buildDeepSpineScanManifest({
      projectId: 'ledger-project',
      mode: 'quick',
      generatedAt: '2026-05-15T12:15:00.000Z',
      artifacts: [{ path: 'src/index.ts', sizeBytes: 2_000, hash: 'sha256:index' }],
    })

    const receipts = buildDeepSpineScanReadReceipts({ manifest, agent: 'Research Agent' })
    const receiptState = buildAgentReadReceiptState({
      projectId: 'ledger-project',
      receipts,
      now: '2026-05-15T12:16:00.000Z',
    })
    const ledger = appendDeepSpineScanEvidence({
      ledger: createTaskEvidenceLedger({
        taskId: 'scan-task',
        projectId: 'ledger-project',
        mission: 'Run pente fino before edits',
        ownerAgent: 'Research Agent',
        now: '2026-05-15T12:15:00.000Z',
      }),
      manifest,
      actor: 'Research Agent',
    })
    const readiness = evaluateDeepSpineScanReadiness(manifest)

    expect(receiptState.receipts.map((receipt) => receipt.kind)).toEqual(expect.arrayContaining(['repository-cartography', 'repo-surface']))
    expect(summarizeTaskEvidenceLedger(ledger)).toContain('read-receipt')
    expect(summarizeTaskEvidenceLedger(ledger)).toContain('runtime-budget')
    expect(readiness.ready).toBe(true)
  })

  it('persists scan manifests and merges blockers into production state', () => {
    const manifest = buildDeepSpineScanManifest({
      projectId: 'merge-project',
      mode: 'aaa',
      generatedAt: '2026-05-15T12:20:00.000Z',
      artifacts: [{ path: 'cloud-web-app/web/lib/aaa-renderer-impl.ts', sizeBytes: 4_000, hash: 'sha256:renderer' }],
      surfaceSignals: [{ path: 'cloud-web-app/web/lib/aaa-renderer-impl.ts', lineCount: 106 }],
    })
    const settings = writeDeepSpineScanManifestToSettings({}, manifest)
    const restored = readDeepSpineScanManifestFromSettings(settings)
    const state = mergeDeepSpineScanIntoProductionState(
      buildDefaultAgenticProductionState({
        projectName: 'Merge Project',
        projectType: 'game',
        now: '2026-05-15T12:20:00.000Z',
      }),
      manifest
    )

    expect(restored?.scanId).toBe(manifest.scanId)
    expect(state.ledger[0]?.id).toBe('deep-spine-scan')
    expect(state.graphs.evidenceGraph[0]?.id).toBe('deep-spine-evidenceGraph')
    expect(state.graphs.validationGraph[0]?.status).toBe('blocked')
    expect(state.runtimePolicy.requiresHumanApproval).toBe(true)
    expect(state.brain.technicalBible.constraints.join(' ')).toContain('auto-fix is forbidden')
  })
})

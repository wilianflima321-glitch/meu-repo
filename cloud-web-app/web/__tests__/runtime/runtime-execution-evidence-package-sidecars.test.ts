import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildRuntimeJobRequest } from '@/lib/production/governed-runtime-jobs'
import {
  buildRuntimeExecutionEvidencePackage,
  verifyRuntimeExecutionEvidencePackage,
} from '@/lib/production/runtime-execution-evidence-package'
import { buildRuntimeJobReceiptState } from '@/lib/production/runtime-job-receipts'
import type { RuntimeFailureSmokeBrowserRunnerState } from '@/lib/production/runtime-failure-smoke-browser-runner-state'
import type { RuntimeFailureSmokePackState } from '@/lib/production/runtime-failure-smoke-pack-state'
import { buildRuntimeResilienceLedger } from '@/lib/runtime/runtime-resilience-ledger'
import {
  buildV29SidecarInstallArtifact,
  buildV29SidecarInstallManifest,
} from '@/lib/runtime/v29-sidecar-install-manifest'
import {
  buildV29SidecarLifecycleEntry,
  buildV29SidecarLifecycleReport,
  V29_REQUIRED_SIDECARS,
} from '@/lib/runtime/v29-sidecar-lifecycle'

const NOW = '2026-06-07T12:00:00.000Z'

function completeSmokePackState(): RuntimeFailureSmokePackState {
  return {
    version: 1,
    projectId: 'project-runtime',
    updatedAt: NOW,
    packs: [{
      runId: 'runtime-smoke:complete',
      generatedAt: NOW,
      scenarioCount: 3,
      governedFailureCount: 3,
      recoveredWithReceiptsCount: 3,
      blockedForReviewCount: 3,
      marketClaimAllowed: false,
      releaseReady: false,
      evidenceRefs: ['runtime-smoke:complete', 'rollback:receipt'],
    }],
    summary: {
      totalPacks: 1,
      totalScenarios: 3,
      governedFailureCount: 3,
      blockedForReviewCount: 3,
      recoveredWithReceiptsCount: 3,
      lastRunId: 'runtime-smoke:complete',
      releaseReady: false,
    },
    releasePolicy: 'human-review-required',
  }
}

function completeBrowserRunnerState(): RuntimeFailureSmokeBrowserRunnerState {
  return {
    version: 1,
    projectId: 'project-runtime',
    updatedAt: NOW,
    reports: [{
      runId: 'runtime-browser-smoke:complete',
      generatedAt: NOW,
      baseUrl: 'http://127.0.0.1:3000',
      harnessCount: 2,
      passedCount: 2,
      strictReceiptMatchCount: 2,
      marketClaimAllowed: false,
      releaseReady: false,
      evidenceRefs: [
        'browser-runner:complete',
        'ide-shell:receipt',
        'preview-viewport:receipt',
        'screenshot:ide',
        'screenshot:preview',
        'receipt:strict-match',
      ],
      screenshotRefs: ['screenshot:ide', 'screenshot:preview'],
    }],
    summary: {
      totalReports: 1,
      totalHarnesses: 2,
      totalPassedHarnesses: 2,
      strictReceiptMatchCount: 2,
      lastRunId: 'runtime-browser-smoke:complete',
      releaseReady: false,
    },
    releasePolicy: 'human-review-required',
  }
}

function completeSidecarLifecycleReport() {
  return buildV29SidecarLifecycleReport({
    generatedAt: NOW,
    sidecars: V29_REQUIRED_SIDECARS.map((id) =>
      buildV29SidecarLifecycleEntry({
        id,
        state: 'available',
        requiredFor: ['desktop-runtime', 'creative-runtime'],
        stages: [
          'discovered',
          'acquired',
          'checksum-verified',
          'installed',
          'health-checked',
          'crash-recoverable',
          'update-channel-bound',
          'human-reviewed',
        ],
        checksum: `sha256:${id}`,
        signatureRef: `signature:${id}`,
        lastProbeRef: `health-probe:${id}`,
        crashStateRef: `crash-state:${id}`,
        updateRef: `update-channel:${id}`,
        evidenceRefs: [`sidecar:${id}`, `sidecar-health:${id}`],
      }),
    ),
  })
}

function completeSidecarInstallManifest() {
  return buildV29SidecarInstallManifest({
    generatedAt: NOW,
    artifacts: (['windows', 'macos', 'linux'] as const).map((os) =>
      buildV29SidecarInstallArtifact({
        os,
        state: 'available',
        templatePath: `runtime-templates/${os}`,
        packageName: `aethel-studio-local-${os}`,
        version: '0.1.0',
        artifactPatterns: [`dist/${os}/*`],
        buildCommands: ['npm ci', 'npm run build'],
        checksumRef: `checksum:${os}`,
        signatureRef: `signature:${os}`,
        smokeTestRef: `install-smoke:${os}`,
        rollbackRef: `rollback:${os}`,
        evidenceRefs: [`sidecar-install:${os}`, `install-smoke:${os}`],
      }),
    ),
  })
}

function buildCompleteEvidencePackage() {
  const state = buildDefaultAgenticProductionState({
    projectName: 'Runtime sidecar package',
    projectType: 'game',
    now: NOW,
  })
  const job = buildRuntimeJobRequest({
    id: 'local-worker-render',
    kind: 'runtime-render',
    requestedRuntimeTarget: 'local-worker',
    runtimeCapabilityStatus: 'available',
    reason: 'Render review with governed evidence package',
    evidenceRefs: ['runtime-job:local-worker-render'],
    approvedForQueue: true,
    now: NOW,
  })
  const receiptState = buildRuntimeJobReceiptState({
    projectId: 'project-runtime',
    now: NOW,
    receipts: [
      { jobId: job.id, kind: 'dispatch', runtimeTarget: 'local-worker', capturedBy: 'Runtime Orchestrator Agent', refs: ['dispatch:ok'] },
      { jobId: job.id, kind: 'capability-probe', runtimeTarget: 'local-worker', capturedBy: 'Runtime Orchestrator Agent', refs: ['capability:ok'] },
      { jobId: job.id, kind: 'artifact', runtimeTarget: 'local-worker', capturedBy: 'Render Queue Agent', refs: ['artifact:preview'] },
      { jobId: job.id, kind: 'validation', runtimeTarget: 'local-worker', capturedBy: 'QA Agent', refs: ['validation:ok'] },
    ],
  })
  const resilienceLedger = buildRuntimeResilienceLedger({
    runId: 'runtime-sidecar-package',
    events: [{
      surfaceId: 'studio-local',
      kind: 'retry-attempted',
      recoveryMode: 'retry-with-backoff',
      message: 'Desktop retry receipt attached before stronger runtime claims.',
      evidenceRefs: ['retry policy receipt:studio-local'],
    }],
  })

  return buildRuntimeExecutionEvidencePackage({
    projectId: 'project-runtime',
    projectName: 'Runtime sidecar package',
    state,
    job,
    receiptState,
    failureSmokePackState: completeSmokePackState(),
    failureSmokeBrowserRunnerState: completeBrowserRunnerState(),
    sidecarLifecycleReport: completeSidecarLifecycleReport(),
    sidecarInstallManifest: completeSidecarInstallManifest(),
    resilienceLedger,
    generatedAt: NOW,
  })
}

describe('runtime execution evidence package sidecar integration', () => {
  it('blocks package review when sidecar lifecycle or install manifest is missing', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Missing sidecars', projectType: 'game', now: NOW })
    const job = buildRuntimeJobRequest({
      id: 'missing-sidecars-job',
      kind: 'runtime-render',
      requestedRuntimeTarget: 'local-worker',
      runtimeCapabilityStatus: 'available',
      reason: 'Package without sidecar evidence should remain blocked.',
      approvedForQueue: true,
      now: NOW,
    })
    const receiptState = buildRuntimeJobReceiptState({
      projectId: 'project-runtime',
      now: NOW,
      receipts: [
        { jobId: job.id, kind: 'dispatch', runtimeTarget: 'local-worker', capturedBy: 'Runtime Orchestrator Agent', refs: ['dispatch:ok'] },
        { jobId: job.id, kind: 'capability-probe', runtimeTarget: 'local-worker', capturedBy: 'Runtime Orchestrator Agent', refs: ['capability:ok'] },
        { jobId: job.id, kind: 'artifact', runtimeTarget: 'local-worker', capturedBy: 'Render Queue Agent', refs: ['artifact:preview'] },
        { jobId: job.id, kind: 'validation', runtimeTarget: 'local-worker', capturedBy: 'QA Agent', refs: ['validation:ok'] },
      ],
    })
    const withoutSidecars = buildRuntimeExecutionEvidencePackage({
      projectId: 'project-runtime',
      projectName: 'Missing sidecars',
      state,
      job,
      receiptState,
      failureSmokePackState: completeSmokePackState(),
      failureSmokeBrowserRunnerState: completeBrowserRunnerState(),
      resilienceLedger: buildRuntimeResilienceLedger({
        runId: 'missing-sidecars',
        events: [{
          surfaceId: 'studio-local',
          kind: 'retry-attempted',
          recoveryMode: 'retry-with-backoff',
          message: 'Retry policy evidence attached.',
          evidenceRefs: ['retry policy receipt:studio-local'],
        }],
      }),
      sidecarLifecycleReport: null,
      sidecarInstallManifest: null,
      generatedAt: NOW,
    })

    expect(withoutSidecars.blockers).toEqual(expect.arrayContaining([
      'Sidecar lifecycle report is missing from the evidence package.',
      'Sidecar install manifest is missing from the evidence package.',
    ]))
    expect(verifyRuntimeExecutionEvidencePackage(withoutSidecars).errors).toEqual(expect.arrayContaining([
      'Runtime execution package must include sidecar lifecycle report.',
      'Runtime execution package must include sidecar install manifest.',
    ]))
  })

  it('attaches sidecar refs and keeps installer/native claims prohibited', () => {
    const evidencePackage = buildCompleteEvidencePackage()
    const verification = verifyRuntimeExecutionEvidencePackage(evidencePackage)

    expect(evidencePackage.sidecarLifecycleReport?.summary.total).toBe(V29_REQUIRED_SIDECARS.length)
    expect(evidencePackage.sidecarInstallManifest?.summary.osTargets).toBe(3)
    expect(evidencePackage.evidenceRefs).toEqual(expect.arrayContaining([
      `sidecar-lifecycle-report:${NOW}`,
      `sidecar-install-manifest:${NOW}`,
      'sidecar:wgpu-renderer',
      'sidecar-install:windows',
    ]))
    expect(evidencePackage.claimPolicy.prohibitedClaims).toEqual(expect.arrayContaining([
      'native renderer ready',
      'signed installer',
      'public download ready',
    ]))
    expect(verification.errors).not.toEqual(expect.arrayContaining([
      'Runtime execution package must include sidecar lifecycle report.',
      'Runtime execution package must include sidecar install manifest.',
      'Claim policy must prohibit signed installer.',
      'Claim policy must prohibit public download ready.',
    ]))
  })
})

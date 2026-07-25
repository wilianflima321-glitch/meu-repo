import { NextResponse, type NextRequest } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import { appendChangeRunLedgerEvent } from '@/lib/server/change-run-ledger'
import { createRollbackSnapshot, type RollbackSnapshotRecord } from '@/lib/server/change-rollback-store'
import { getScopedProjectId } from '@/lib/server/workspace-scope'
import { findActiveFullAccessGrant, type FullAccessGrantRecord } from '@/lib/server/full-access-ledger'
import { runQaGate } from '@/lib/server/qa-gate'
import {
  CAPABILITY,
  RUN_SOURCE,
  MAX_BATCH_CHANGES,
  type ApplyBody,
  type PreparedApplyChange,
} from './types'
import { getRequestedChanges, normalizeExecutionMode } from './request'
import { buildPreparedChange } from './preflight'
import { enforceAgentApplyGuards } from './agent-guards'
import {
  evaluateGovernedAgentToolJob,
  recordGovernedToolExecution,
  type GovernedAgentToolJobDecision,
  type GovernedToolJobEnforcement,
} from '@/lib/production/agent-tool-job-runner'
import { summarizeTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import { persistGovernedTaskEvidence } from './persist-governed-evidence'
import { mirrorAppliedChangesToCanonicalStore } from './mirror-canonical-store'
import { runMultiFileApplySwarm } from '@/lib/production/multi-file-apply-swarm'
import { healDocumentBeforeApply } from '@/lib/production/auto-heal-apply'

export async function applyAiChanges(params: {
  request: NextRequest
  userId: string
  body: ApplyBody | null
}) {
  const { request, userId, body } = params
  const runId = `apply_${Date.now().toString(36)}`

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
  }

  const requestedChanges = getRequestedChanges(body)
  if (requestedChanges.length === 0) {
    return capabilityResponse({
      error: 'MISSING_CHANGES',
      message: 'No changes were provided.',
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }

  if (requestedChanges.length > MAX_BATCH_CHANGES) {
    return capabilityResponse({
      error: 'CHANGE_BATCH_LIMIT_EXCEEDED',
      message: `Maximum ${MAX_BATCH_CHANGES} changes per apply request.`,
      status: 413,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        limit: MAX_BATCH_CHANGES,
        received: requestedChanges.length,
      },
    })
  }

  const projectId = getScopedProjectId(request, body as unknown as Record<string, unknown>)
  const defaultApproval = body.approvedHighRisk === true
  const executionMode = normalizeExecutionMode(body.executionMode)
  const enforceAgentScope = body.enforceAgentScope === true || typeof body.agent === 'string' || requestedChanges.length > 1
  const fsRuntime = getFileSystemRuntime()
  let cachedFullAccessGrant: FullAccessGrantRecord | null | undefined
  const resolveFullAccessGrant = async () => {
    if (cachedFullAccessGrant !== undefined) return cachedFullAccessGrant
    cachedFullAccessGrant = await findActiveFullAccessGrant({
      userId,
      projectId,
      requiredScopes: ['workspace:apply'],
    })
    return cachedFullAccessGrant
  }

  const preparedChanges: PreparedApplyChange[] = []
  for (const requested of requestedChanges) {
    const prepared = await buildPreparedChange({
      runId,
      userId,
      projectId,
      fsRuntime,
      requested,
      defaultApproval,
      resolveFullAccessGrant,
      enableAutoHeal: requested.enableAutoHeal === true || body.enableAutoHeal === true,
      autoHealModelId: body.autoHealModelId,
    })
    if (prepared.ok === false) return prepared.response
    preparedChanges.push(prepared.value)
  }

  const guardDecision = await enforceAgentApplyGuards({
    userId,
    projectId,
    runId,
    body,
    requestedChanges,
    preparedChanges,
    enforceAgentScope,
  })
  if (guardDecision.ok === false) return guardDecision.response

  const { readReceiptDecision, surfaceLockDecision } = guardDecision

  if (executionMode === 'sandbox') {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: preparedChanges[0]?.virtualPath || 'sandbox',
      outcome: 'blocked',
      metadata: {
        runId,
        reason: 'SANDBOX_SIMULATION_DISABLED',
        runSource: RUN_SOURCE,
      },
    }).catch(() => {})

    return capabilityResponse({
      error: 'SANDBOX_SIMULATION_DISABLED',
      message: 'Sandbox simulation is disabled. Use executionMode=workspace for real apply.',
      status: 423,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        runId,
        executionMode,
        runSource: RUN_SOURCE,
      },
    })
  }

  const qaGate = await runQaGate()
  if (!qaGate.ok) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: preparedChanges[0]?.virtualPath || 'qa-gate',
      outcome: 'blocked',
      metadata: {
        runId,
        reason: 'QA_GATE_BLOCKED',
        runSource: RUN_SOURCE,
        qaGate,
      },
    }).catch(() => {})

    return capabilityResponse({
      error: 'QA_GATE_BLOCKED',
      message: 'QA gate blocked apply. Resolve failures before retrying.',
      status: 422,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        runId,
        runSource: RUN_SOURCE,
        qaGate,
      },
    })
  }

  // CW6 Path B — parallel AST/Lazy prep + batch L.5 overlay (fail-closed receipt).
  const enableAutoHeal = body.enableAutoHeal === true
  const swarm = await runMultiFileApplySwarm({
    cells: preparedChanges.map((prepared, index) => ({
      taskId: `apply_cell_${index}`,
      path: prepared.virtualPath,
      content: prepared.nextDocument,
      role: index === 0 ? 'critical' : 'peripheral',
    })),
    enableAutoHeal,
    maxHealRounds: 3,
    heal: enableAutoHeal
      ? async ({ path, content }) => {
          const healed = await healDocumentBeforeApply({
            filePath: path,
            document: content,
            repairModelId: body.autoHealModelId,
          })
          return { content: healed.ok ? healed.document : content }
        }
      : undefined,
  })

  if (!swarm.ok) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: preparedChanges[0]?.virtualPath || 'swarm-gate',
      outcome: 'blocked',
      metadata: {
        runId,
        reason: swarm.code || 'MULTI_FILE_VALIDATION_DENIED',
        runSource: RUN_SOURCE,
        fileValidation: swarm.fileValidation,
        parallelCells: swarm.parallelCells,
        healRoundsUsed: swarm.healRoundsUsed,
        composerSurpassClaim: false,
        treeSitterAstIndexerWebWired: false,
      },
    }).catch(() => {})

    return capabilityResponse({
      error: swarm.code || 'MULTI_FILE_VALIDATION_DENIED',
      message:
        preparedChanges.length > 1
          ? 'Multi-file apply blocked by AST/L.5 validation swarm. Nothing was written.'
          : 'Apply blocked by AST/L.5 validation gate. Nothing was written.',
      status: 422,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        runId,
        runSource: RUN_SOURCE,
        fileValidation: swarm.fileValidation,
        compilerLog: swarm.compilerLog.slice(0, 4000),
        parallelCells: swarm.parallelCells,
        healRoundsUsed: swarm.healRoundsUsed,
        touchedPaths: preparedChanges.map((p) => p.virtualPath),
        composerSurpassClaim: false,
        treeSitterAstIndexerWebWired: false,
        marketingAllowed: false,
      },
    })
  }

  // Prefer swarm-healed documents for the write path.
  const contentByPath = new Map(swarm.files.map((f) => [f.path, f.content]))
  for (const prepared of preparedChanges) {
    const next = contentByPath.get(prepared.virtualPath.replace(/\\/g, '/'))
    if (typeof next === 'string') prepared.nextDocument = next
  }

  const snapshots: Array<{ prepared: PreparedApplyChange; snapshot: RollbackSnapshotRecord }> = []
  for (const prepared of preparedChanges) {
    const snapshot = await createRollbackSnapshot({
      userId,
      projectId,
      filePath: prepared.virtualPath,
      absolutePath: prepared.absolutePath,
      beforeContent: prepared.currentContent,
      afterContent: prepared.nextDocument,
    })
    snapshots.push({ prepared, snapshot })
  }

  const enforcement: GovernedToolJobEnforcement =
    process.env.NODE_ENV === 'production'
      ? body.enforceToolBus === false
        ? 'observe'
        : 'enforced'
      : body.enforceToolBus === true
        ? 'enforced'
        : 'observe'
  const governedDecision: GovernedAgentToolJobDecision = evaluateGovernedAgentToolJob({
    toolId: 'diff-proposal',
    mode: 'Builder',
    projectId,
    agent: typeof body.agent === 'string' && body.agent.length > 0 ? body.agent : 'workspace-apply',
    mission: `Apply ${snapshots.length} file change(s)`,
    intent: `Apply ${snapshots.length} file change(s)`,
    taskId: runId,
    targetPaths: snapshots.map((entry) => entry.prepared.virtualPath),
    idempotencyKey: runId,
    rollbackRef: snapshots[0]?.snapshot.token ?? null,
    readReceiptRefs: readReceiptDecision?.allowed ? readReceiptDecision.metadata.acceptedReceiptIds : undefined,
    scopeLockRef: surfaceLockDecision?.allowed ? surfaceLockDecision.lock.id : undefined,
    maxCostUsd: 0,
    enforcement,
  })

  if (enforcement === 'enforced' && !governedDecision.allowed) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: snapshots[0]?.prepared.virtualPath || 'tool-bus',
      outcome: 'blocked',
      metadata: {
        runId,
        reason: 'TOOL_BUS_BLOCKED',
        runSource: RUN_SOURCE,
        blockers: governedDecision.blockers,
        toolStatus: governedDecision.toolDecision.status,
        missingEvidence: governedDecision.evidenceReadiness.missingKinds,
      },
    }).catch(() => {})

    return capabilityResponse({
      error: 'TOOL_BUS_BLOCKED',
      message:
        'Governed tool bus blocked apply. Provide read receipts, scope lock, and rollback evidence before retrying.',
      status: 409,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        runId,
        runSource: RUN_SOURCE,
        projectId,
        blockers: governedDecision.blockers,
        toolStatus: governedDecision.toolDecision.status,
        missingEvidence: governedDecision.evidenceReadiness.missingKinds,
      },
    })
  }

  const applied: Array<{ prepared: PreparedApplyChange; snapshot: RollbackSnapshotRecord }> = []
  for (const entry of snapshots) {
    try {
      await fsRuntime.writeFile(entry.prepared.absolutePath, entry.prepared.nextDocument, {
        atomic: true,
        backup: true,
        createDirectories: true,
      })
      applied.push(entry)
    } catch {
      let recovered = true
      for (const previous of [...applied].reverse()) {
        try {
          await fsRuntime.writeFile(previous.prepared.absolutePath, previous.prepared.currentContent, {
            atomic: true,
            backup: false,
            createDirectories: true,
          })
        } catch {
          recovered = false
        }
      }

      await appendChangeRunLedgerEvent({
        eventType: 'apply_blocked',
        capability: CAPABILITY,
        userId,
        projectId,
        filePath: entry.prepared.virtualPath,
        outcome: 'failed',
        metadata: {
          runId,
          reason: 'APPLY_WRITE_FAILED',
          runSource: RUN_SOURCE,
          recovered,
          appliedCountBeforeFailure: applied.length,
        },
      }).catch(() => {})

      return capabilityResponse({
        error: 'APPLY_WRITE_FAILED',
        message: 'Apply failed during file write. Prior writes were reverted when possible.',
        status: 500,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          failedPath: entry.prepared.virtualPath,
          recovered,
          appliedCountBeforeFailure: applied.length,
        },
      })
    }
  }

  const changeSummary = snapshots.map((entry) => ({
    path: entry.snapshot.filePath,
    rollbackToken: entry.snapshot.token,
    rollbackExpiresAt: entry.snapshot.expiresAt,
    beforeHash: entry.snapshot.beforeHash,
    afterHash: entry.snapshot.afterHash,
    dependencyImpact: entry.prepared.validation.dependencyImpact,
    projectImpact: {
      scannedFiles: entry.prepared.projectImpact.scannedFiles,
      reverseDependents: entry.prepared.projectImpact.reverseDependents.length,
      impactedTests: entry.prepared.projectImpact.impactedTests.length,
      impactedEndpoints: entry.prepared.projectImpact.impactedEndpoints,
      depth: entry.prepared.projectImpact.depth,
      truncated: entry.prepared.projectImpact.truncated,
      risk: entry.prepared.projectImpact.risk,
    },
  }))

  for (const entry of snapshots) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: entry.snapshot.filePath,
      outcome: 'success',
      metadata: {
        runId,
        rollbackToken: entry.snapshot.token,
        beforeHash: entry.snapshot.beforeHash,
        afterHash: entry.snapshot.afterHash,
        batchSize: snapshots.length,
        executionMode: 'workspace',
        runSource: RUN_SOURCE,
        validationVerdict: entry.prepared.validation.verdict,
        dependencyGraphRisk: entry.prepared.projectImpact.risk,
        reverseDependents: entry.prepared.projectImpact.reverseDependents.length,
        fullAccessGrantId: entry.prepared.approvalGrantId,
        readReceiptIds: readReceiptDecision?.allowed ? readReceiptDecision.metadata.acceptedReceiptIds : undefined,
        surfaceLockId: surfaceLockDecision?.allowed ? surfaceLockDecision.lock.id : undefined,
      },
    }).catch(() => {})
  }

  const governedLedger = recordGovernedToolExecution(governedDecision, {
    status: 'success',
    appliedPaths: snapshots.map((entry) => entry.prepared.virtualPath),
    rollbackRefs: snapshots.map((entry) => entry.snapshot.token),
    validationVerdict: preparedChanges[0]?.validation.verdict,
  })

  const evidencePersisted = await persistGovernedTaskEvidence({
    userId,
    projectId,
    ledger: governedLedger,
  }).catch(() => false)

  const canonicalMirror = await mirrorAppliedChangesToCanonicalStore({
    userId,
    projectId,
    changes: snapshots.map((entry) => ({
      virtualPath: entry.prepared.virtualPath,
      content: entry.prepared.nextDocument,
      language: entry.prepared.language,
    })),
  })

  return capabilityResponse({
    error: 'NONE',
    message: snapshots.length === 1 ? 'Change applied successfully.' : `Applied ${snapshots.length} changes successfully.`,
    status: 200,
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    milestone: 'P0',
    metadata: {
      runId,
      applyMode:
        snapshots.length === 1 ? 'single-file-atomic' : 'multi-file-swarm-validated',
      runSource: RUN_SOURCE,
      projectId,
      changeCount: snapshots.length,
      changes: changeSummary,
      fileValidation: swarm.fileValidation,
      parallelCells: swarm.parallelCells,
      healRoundsUsed: swarm.healRoundsUsed,
      touchedPaths: snapshots.map((entry) => entry.prepared.virtualPath),
      composerSurpassClaim: false,
      treeSitterAstIndexerWebWired: false,
      marketingAllowed: false,
      rollbackToken: snapshots.length === 1 ? snapshots[0].snapshot.token : undefined,
      governance: {
        toolStatus: governedDecision.toolDecision.status,
        enforced: enforcement === 'enforced',
        ready: governedDecision.ready,
        missingEvidence: governedDecision.evidenceReadiness.missingKinds,
        evidenceSummary: summarizeTaskEvidenceLedger(governedLedger),
        evidencePersisted,
        canonicalBackend: canonicalMirror.backend,
        canonicalMirrored: canonicalMirror.mirrored,
      },
      readReceipts: readReceiptDecision?.allowed
        ? {
            enforcement: readReceiptDecision.enforcement,
            acceptedReceiptIds: readReceiptDecision.metadata.acceptedReceiptIds,
          }
        : undefined,
      surfaceLock: surfaceLockDecision?.allowed
        ? {
            id: surfaceLockDecision.lock.id,
            expiresAt: surfaceLockDecision.lock.expiresAt,
            paths: surfaceLockDecision.lock.paths,
          }
        : undefined,
    },
  })
}

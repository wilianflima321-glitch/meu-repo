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

  return capabilityResponse({
    error: 'NONE',
    message: snapshots.length === 1 ? 'Change applied successfully.' : `Applied ${snapshots.length} changes successfully.`,
    status: 200,
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    milestone: 'P0',
    metadata: {
      runId,
      applyMode: snapshots.length === 1 ? 'single-file-atomic' : 'multi-file-serial',
      runSource: RUN_SOURCE,
      projectId,
      changeCount: snapshots.length,
      changes: changeSummary,
      rollbackToken: snapshots.length === 1 ? snapshots[0].snapshot.token : undefined,
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

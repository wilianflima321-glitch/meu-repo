import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { validateAiChange, type ChangeValidationResult } from '@/lib/server/change-validation'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import { appendChangeRunLedgerEvent } from '@/lib/server/change-run-ledger'
import {
  createRollbackSnapshot,
  hashContent,
  type RollbackSnapshotRecord,
} from '@/lib/server/change-rollback-store'
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'
import { analyzeDependencyImpact, type DependencyImpactAnalysis } from '@/lib/server/dependency-impact-guard'
import { findActiveFullAccessGrant, type FullAccessGrantRecord } from '@/lib/server/full-access-ledger'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CHANGE_APPLY'
const RUN_SOURCE = 'production'
const MAX_BATCH_CHANGES = 50
const MAX_LOCAL_IMPORT_FANOUT = 40
const MAX_REVERSE_DEPENDENTS = 80
const SANDBOX_PREFIX = 'change-apply-'
const SANDBOX_TTL_MS = 6 * 60 * 60 * 1000

type ApplyExecutionMode = 'workspace' | 'sandbox'

type ApplyChangeInput = {
  filePath?: string
  original?: string
  modified?: string
  fullDocument?: string
  language?: string
  enforceOriginalMatch?: boolean
  approvedHighRisk?: boolean
}

type ApplyBody = ApplyChangeInput & {
  projectId?: string
  approvedHighRisk?: boolean
  changes?: ApplyChangeInput[]
  executionMode?: ApplyExecutionMode
}

type PreparedApplyChange = {
  absolutePath: string
  virtualPath: string
  currentContent: string
  nextDocument: string
  language?: string
  validation: ChangeValidationResult
  projectImpact: DependencyImpactAnalysis
  approvalGrantId?: string
}

const HIGH_RISK_PATH_PATTERNS = [
  /\/app\/api\/auth\//i,
  /\/app\/api\/billing\//i,
  /\/app\/admin\//i,
]

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asRawString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getRequestedChanges(body: ApplyBody): ApplyChangeInput[] {
  if (Array.isArray(body.changes) && body.changes.length > 0) {
    return body.changes
  }
  return [body]
}

function normalizeExecutionMode(value: unknown): ApplyExecutionMode {
  if (value === 'sandbox') return 'sandbox'
  return 'workspace'
}

function sanitizeVirtualPath(virtualPath: string): string {
  return virtualPath.replace(/\\/g, '/').replace(/^\/+/, '')
}

async function applyInSandbox(params: {
  runId: string
  userId: string
  projectId: string
  preparedChanges: PreparedApplyChange[]
}): Promise<NextResponse> {
  await pruneExpiredSandboxes().catch(() => {})
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), SANDBOX_PREFIX))
  const sandboxId = path.basename(sandboxRoot)
  const artifacts: Array<{
    path: string
    beforeHash: string
    afterHash: string
    dependencyImpact: ChangeValidationResult['dependencyImpact']
    projectImpact: {
      scannedFiles: number
      reverseDependents: number
      impactedTests: number
      impactedEndpoints: string[]
      depth: number
      truncated: boolean
      risk: DependencyImpactAnalysis['risk']
    }
  }> = []

  for (const change of params.preparedChanges) {
    const relativePath = sanitizeVirtualPath(change.virtualPath)
    const targetPath = path.join(sandboxRoot, relativePath)
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, change.nextDocument, 'utf8')

    artifacts.push({
      path: change.virtualPath,
      beforeHash: hashContent(change.currentContent),
      afterHash: hashContent(change.nextDocument),
      dependencyImpact: change.validation.dependencyImpact,
      projectImpact: {
        scannedFiles: change.projectImpact.scannedFiles,
        reverseDependents: change.projectImpact.reverseDependents.length,
        impactedTests: change.projectImpact.impactedTests.length,
        impactedEndpoints: change.projectImpact.impactedEndpoints,
        depth: change.projectImpact.depth,
        truncated: change.projectImpact.truncated,
        risk: change.projectImpact.risk,
      },
    })

    await appendChangeRunLedgerEvent({
      eventType: 'apply',
      capability: CAPABILITY,
      userId: params.userId,
      projectId: params.projectId,
      filePath: change.virtualPath,
      outcome: 'success',
      metadata: {
        runId: params.runId,
        executionMode: 'sandbox',
        runSource: RUN_SOURCE,
        sandboxId,
        beforeHash: hashContent(change.currentContent),
        afterHash: hashContent(change.nextDocument),
        validationVerdict: change.validation.verdict,
        fullAccessGrantId: change.approvalGrantId,
      },
    }).catch(() => {})
  }

  return capabilityResponse({
    error: 'NONE',
    message:
      params.preparedChanges.length === 1
        ? 'Sandbox apply simulation completed.'
        : `Sandbox apply simulation completed for ${params.preparedChanges.length} changes.`,
    status: 200,
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    milestone: 'P0',
      metadata: {
        runId: params.runId,
        applyMode: 'sandbox-simulated',
        executionMode: 'sandbox',
        runSource: RUN_SOURCE,
        sandboxId,
        projectId: params.projectId,
        changeCount: params.preparedChanges.length,
      changes: artifacts,
    },
  })
}

async function pruneExpiredSandboxes(): Promise<void> {
  const tmp = os.tmpdir()
  const entries = await fs.readdir(tmp, { withFileTypes: true })
  const now = Date.now()

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (!entry.name.startsWith(SANDBOX_PREFIX)) continue
    const fullPath = path.join(tmp, entry.name)
    const stat = await fs.stat(fullPath).catch(() => null)
    if (!stat) continue
    if (now - stat.mtimeMs <= SANDBOX_TTL_MS) continue
    await fs.rm(fullPath, { recursive: true, force: true }).catch(() => {})
  }
}

function isHighRiskPath(virtualPath: string): boolean {
  return HIGH_RISK_PATH_PATTERNS.some((pattern) => pattern.test(virtualPath))
}

async function buildPreparedChange(params: {
  runId: string
  userId: string
  projectId: string
  fsRuntime: ReturnType<typeof getFileSystemRuntime>
  requested: ApplyChangeInput
  defaultApproval: boolean
  resolveFullAccessGrant: () => Promise<FullAccessGrantRecord | null>
}): Promise<
  | { ok: true; value: PreparedApplyChange }
  | { ok: false; response: NextResponse }
> {
  const filePath = asString(params.requested.filePath)
  if (!filePath) {
    return {
      ok: false,
      response: capabilityResponse({
        error: 'MISSING_FILE_PATH',
        message: 'Each change requires filePath.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { runId: params.runId },
      }),
    }
  }

  const requestedApproval =
    params.requested.approvedHighRisk === true || params.defaultApproval === true
  let approvalGrantId: string | undefined
  const normalizedVirtualPath = filePath.replace(/\\/g, '/')

  if (isHighRiskPath(normalizedVirtualPath) && !requestedApproval) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: 'AI_CHANGE_APPLY',
      userId: params.userId,
      projectId: params.projectId,
      filePath: normalizedVirtualPath,
      outcome: 'blocked',
      metadata: { reason: 'HIGH_RISK_APPROVAL_REQUIRED', runId: params.runId, runSource: RUN_SOURCE },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: 'HIGH_RISK_APPROVAL_REQUIRED',
        message: 'High-risk paths require explicit approval before apply.',
        status: 403,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          runId: params.runId,
          filePath: normalizedVirtualPath,
          approvalField: 'approvedHighRisk',
          riskCategory: 'auth-billing-admin',
        },
      }),
    }
  }
  if (isHighRiskPath(normalizedVirtualPath) && requestedApproval) {
    const grant = await params.resolveFullAccessGrant()
    if (!grant) {
      await appendChangeRunLedgerEvent({
        eventType: 'apply_blocked',
        capability: 'AI_CHANGE_APPLY',
        userId: params.userId,
        projectId: params.projectId,
        filePath: normalizedVirtualPath,
        outcome: 'blocked',
        metadata: { reason: 'FULL_ACCESS_GRANT_REQUIRED', runId: params.runId, runSource: RUN_SOURCE },
      }).catch(() => {})

      return {
        ok: false,
        response: capabilityResponse({
          error: 'FULL_ACCESS_GRANT_REQUIRED',
          message: 'High-risk apply requires an active Full Access grant.',
          status: 403,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            runId: params.runId,
            filePath: normalizedVirtualPath,
            requiredScope: 'workspace:apply',
            grantEndpoint: '/api/studio/access/full',
          },
        }),
      }
    }
    approvalGrantId = grant.grantId
  }

  const { absolutePath, root: scopedRoot } = resolveScopedWorkspacePath({
    userId: params.userId,
    projectId: params.projectId,
    requestedPath: filePath,
  })
  const virtualPath = toVirtualWorkspacePath(absolutePath, scopedRoot)

  const current = await params.fsRuntime.readFile(absolutePath).catch(() => null)
  if (!current) {
    return {
      ok: false,
      response: capabilityResponse({
        error: 'FILE_NOT_FOUND',
        message: 'Target file was not found for apply operation.',
        status: 404,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { runId: params.runId, filePath: virtualPath },
      }),
    }
  }

  const currentContent = current.content
  const requestedOriginal = asRawString(params.requested.original)
  const nextDocument = asRawString(params.requested.fullDocument) || asRawString(params.requested.modified)
  if (!nextDocument.trim()) {
    return {
      ok: false,
      response: capabilityResponse({
        error: 'MISSING_MODIFIED_CONTENT',
        message: 'Each change requires modified or fullDocument.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { runId: params.runId },
      }),
    }
  }

  const enforceOriginalMatch = params.requested.enforceOriginalMatch !== false
  if (enforceOriginalMatch && requestedOriginal && requestedOriginal !== currentContent) {
    return {
      ok: false,
      response: capabilityResponse({
        error: 'ORIGINAL_MISMATCH',
        message: 'Apply aborted: file content changed since proposal was generated.',
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          filePath: virtualPath,
          runId: params.runId,
          currentHash: hashContent(currentContent),
          providedHash: hashContent(requestedOriginal),
        },
      }),
    }
  }

  const validation = validateAiChange({
    original: currentContent,
    modified: nextDocument,
    fullDocument: nextDocument,
    language: asString(params.requested.language) || current.language,
    filePath,
  })

  const projectImpact = await analyzeDependencyImpact({
    workspaceRoot: scopedRoot,
    absolutePath,
  }).catch(() => ({
    targetPath: virtualPath.replace(/^\/+/, ''),
    scannedFiles: 0,
    directImports: [] as string[],
    reverseDependents: [] as string[],
    impactedTests: [] as string[],
    impactedEndpoints: [] as string[],
    depth: 0,
    truncated: false,
    risk: 'low' as const,
  }))

  if (!validation.canApply) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: 'AI_CHANGE_APPLY',
      userId: params.userId,
      projectId: params.projectId,
      filePath: virtualPath,
      outcome: 'blocked',
      metadata: { reason: 'VALIDATION_BLOCKED', verdict: validation.verdict, runId: params.runId, runSource: RUN_SOURCE },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: 'VALIDATION_BLOCKED',
        message: 'Apply blocked by deterministic validation.',
        status: 422,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          path: virtualPath,
          runId: params.runId,
          verdict: validation.verdict,
          checks: validation.checks,
          dependencyImpact: validation.dependencyImpact,
          projectImpact: {
            scannedFiles: projectImpact.scannedFiles,
            reverseDependents: projectImpact.reverseDependents.length,
            impactedTests: projectImpact.impactedTests.length,
            impactedEndpoints: projectImpact.impactedEndpoints,
            depth: projectImpact.depth,
            truncated: projectImpact.truncated,
            risk: projectImpact.risk,
          },
        },
      }),
    }
  }

  const localImportFanout = validation.dependencyImpact.localImports.length
  if (localImportFanout > MAX_LOCAL_IMPORT_FANOUT && !requestedApproval) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: 'AI_CHANGE_APPLY',
      userId: params.userId,
      projectId: params.projectId,
      filePath: virtualPath,
      outcome: 'blocked',
      metadata: {
        reason: 'DEPENDENCY_IMPACT_APPROVAL_REQUIRED',
        localImportFanout,
        runId: params.runId,
        runSource: RUN_SOURCE,
      },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: 'DEPENDENCY_IMPACT_APPROVAL_REQUIRED',
        message: 'Apply blocked: dependency fanout is high and requires explicit approval.',
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          path: virtualPath,
          runId: params.runId,
          localImportFanout,
          threshold: MAX_LOCAL_IMPORT_FANOUT,
          approvalField: 'approvedHighRisk',
        },
      }),
    }
  }
  if (localImportFanout > MAX_LOCAL_IMPORT_FANOUT && requestedApproval) {
    const grant = await params.resolveFullAccessGrant()
    if (!grant) {
      await appendChangeRunLedgerEvent({
        eventType: 'apply_blocked',
        capability: 'AI_CHANGE_APPLY',
        userId: params.userId,
        projectId: params.projectId,
        filePath: virtualPath,
        outcome: 'blocked',
        metadata: {
          reason: 'FULL_ACCESS_GRANT_REQUIRED',
          localImportFanout,
          runId: params.runId,
          runSource: RUN_SOURCE,
        },
      }).catch(() => {})

      return {
        ok: false,
        response: capabilityResponse({
          error: 'FULL_ACCESS_GRANT_REQUIRED',
          message: 'Dependency-fanout override requires an active Full Access grant.',
          status: 403,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            path: virtualPath,
            runId: params.runId,
            localImportFanout,
            threshold: MAX_LOCAL_IMPORT_FANOUT,
            requiredScope: 'workspace:apply',
            grantEndpoint: '/api/studio/access/full',
          },
        }),
      }
    }
    approvalGrantId = grant.grantId
  }

  const reverseDependents = projectImpact.reverseDependents.length
  if (reverseDependents > MAX_REVERSE_DEPENDENTS && !requestedApproval) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: 'AI_CHANGE_APPLY',
      userId: params.userId,
      projectId: params.projectId,
      filePath: virtualPath,
      outcome: 'blocked',
      metadata: {
        reason: 'DEPENDENCY_GRAPH_APPROVAL_REQUIRED',
        reverseDependents,
        threshold: MAX_REVERSE_DEPENDENTS,
        depth: projectImpact.depth,
        runId: params.runId,
        runSource: RUN_SOURCE,
      },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: 'DEPENDENCY_GRAPH_APPROVAL_REQUIRED',
        message: 'Apply blocked: transitive dependency impact is high and requires explicit approval.',
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          path: virtualPath,
          runId: params.runId,
          reverseDependents,
          threshold: MAX_REVERSE_DEPENDENTS,
          impactedTests: projectImpact.impactedTests.length,
          impactedEndpoints: projectImpact.impactedEndpoints,
          depth: projectImpact.depth,
          approvalField: 'approvedHighRisk',
        },
      }),
    }
  }
  if (reverseDependents > MAX_REVERSE_DEPENDENTS && requestedApproval) {
    const grant = await params.resolveFullAccessGrant()
    if (!grant) {
      await appendChangeRunLedgerEvent({
        eventType: 'apply_blocked',
        capability: 'AI_CHANGE_APPLY',
        userId: params.userId,
        projectId: params.projectId,
        filePath: virtualPath,
        outcome: 'blocked',
        metadata: {
          reason: 'FULL_ACCESS_GRANT_REQUIRED',
          reverseDependents,
          threshold: MAX_REVERSE_DEPENDENTS,
          depth: projectImpact.depth,
          runId: params.runId,
          runSource: RUN_SOURCE,
        },
      }).catch(() => {})

      return {
        ok: false,
        response: capabilityResponse({
          error: 'FULL_ACCESS_GRANT_REQUIRED',
          message: 'Dependency-graph override requires an active Full Access grant.',
          status: 403,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            path: virtualPath,
            runId: params.runId,
            reverseDependents,
            threshold: MAX_REVERSE_DEPENDENTS,
            impactedTests: projectImpact.impactedTests.length,
            impactedEndpoints: projectImpact.impactedEndpoints,
            depth: projectImpact.depth,
            requiredScope: 'workspace:apply',
            grantEndpoint: '/api/studio/access/full',
          },
        }),
      }
    }
    approvalGrantId = grant.grantId
  }

  return {
    ok: true,
    value: {
      absolutePath,
      virtualPath,
      currentContent,
      nextDocument,
      language: current.language,
      validation,
      projectImpact,
      approvalGrantId,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const runId = `apply_${Date.now().toString(36)}`
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => null)) as ApplyBody | null

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
    const fsRuntime = getFileSystemRuntime()
    let cachedFullAccessGrant: FullAccessGrantRecord | null | undefined
    const resolveFullAccessGrant = async () => {
      if (cachedFullAccessGrant !== undefined) return cachedFullAccessGrant
      cachedFullAccessGrant = await findActiveFullAccessGrant({
        userId: user.userId,
        projectId,
        requiredScopes: ['workspace:apply'],
      })
      return cachedFullAccessGrant
    }

    const preparedChanges: PreparedApplyChange[] = []
    for (const requested of requestedChanges) {
      const prepared = await buildPreparedChange({
        runId,
        userId: user.userId,
        projectId,
        fsRuntime,
        requested,
        defaultApproval,
        resolveFullAccessGrant,
      })
      if (!prepared.ok) return prepared.response
      preparedChanges.push(prepared.value)
    }

    if (executionMode === 'sandbox') {
      return applyInSandbox({
        runId,
        userId: user.userId,
        projectId,
        preparedChanges,
      })
    }

    const snapshots: Array<{ prepared: PreparedApplyChange; snapshot: RollbackSnapshotRecord }> = []
    for (const prepared of preparedChanges) {
      const snapshot = await createRollbackSnapshot({
        userId: user.userId,
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
      } catch (error) {
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
          capability: 'AI_CHANGE_APPLY',
          userId: user.userId,
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
        capability: 'AI_CHANGE_APPLY',
        userId: user.userId,
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
      },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped

    return NextResponse.json(
      {
        error: 'APPLY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process apply request',
      },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import { capabilityResponse } from '@/lib/server/capability-response'
import { validateAiChange } from '@/lib/server/change-validation'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import { appendChangeRunLedgerEvent } from '@/lib/server/change-run-ledger'
import { hashContent } from '@/lib/server/change-rollback-store'
import { resolveScopedWorkspacePath, toVirtualWorkspacePath } from '@/lib/server/workspace-scope'
import { analyzeDependencyImpact } from '@/lib/server/dependency-impact-guard'
import { inspectLazyPatch } from '@/lib/production/lazy-inspector'
import { validateDocumentWithProjectL5 } from '@/lib/production/project-l5-typecheck'
import { healDocumentBeforeApply } from '@/lib/production/auto-heal-apply'
import type { FullAccessGrantRecord } from '@/lib/server/full-access-ledger'
import {
  CAPABILITY,
  RUN_SOURCE,
  MAX_LOCAL_IMPORT_FANOUT,
  MAX_REVERSE_DEPENDENTS,
  type ApplyChangeInput,
  type PreparedApplyChange,
} from './types'
import { asRawString, asString } from './request'

const HIGH_RISK_PATH_PATTERNS = [
  /\/app\/api\/auth\//i,
  /\/app\/api\/billing\//i,
  /\/app\/admin\//i,
]

export function isHighRiskPath(virtualPath: string): boolean {
  return HIGH_RISK_PATH_PATTERNS.some((pattern) => pattern.test(virtualPath))
}

export async function buildPreparedChange(params: {
  runId: string
  userId: string
  projectId: string
  fsRuntime: ReturnType<typeof getFileSystemRuntime>
  requested: ApplyChangeInput
  defaultApproval: boolean
  resolveFullAccessGrant: () => Promise<FullAccessGrantRecord | null>
  /** Focus 1A / A1 — live Auto-Heal on L.5 FAIL before block */
  enableAutoHeal?: boolean
  autoHealModelId?: string
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
  const lastModified = await fs
    .stat(absolutePath)
    .then((stat) => stat.mtime.toISOString())
    .catch(() => undefined)
  const requestedOriginal = asRawString(params.requested.original)
  let nextDocument = asRawString(params.requested.fullDocument) || asRawString(params.requested.modified)
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

  // Decision #66 — LazyInspector BEFORE L.5 / change-validation (save Fast burn)
  const lazyScan = inspectLazyPatch(nextDocument, 0)
  if (lazyScan.verdict === 'REJECT') {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: 'AI_CHANGE_APPLY',
      userId: params.userId,
      projectId: params.projectId,
      filePath: virtualPath,
      outcome: 'blocked',
      metadata: {
        reason: 'LAZY_INSPECTOR_REJECT',
        matchedPatterns: lazyScan.matchedPatterns,
        hunkRefs: lazyScan.hunkRefs,
        settleZero: true,
        runId: params.runId,
        runSource: RUN_SOURCE,
      },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: 'LAZY_INSPECTOR_REJECT',
        message:
          'Apply blocked: incomplete or stubbed patch (TODO/FIXME/elision). Regenerate full code — user not charged for this lazy reject.',
        status: 422,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          path: virtualPath,
          runId: params.runId,
          matchedPatterns: lazyScan.matchedPatterns,
          hunkRefs: lazyScan.hunkRefs,
          settleZero: true,
          antiLazy: true,
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

  // L.5 project typecheck (Focus 1A) — fail-closed before apply
  let documentForL5 = nextDocument
  let l5 = validateDocumentWithProjectL5({
    filePath: virtualPath,
    content: documentForL5,
  })
  if (l5.verdict === 'FAIL' && params.enableAutoHeal === true) {
    const healed = await healDocumentBeforeApply({
      filePath: virtualPath,
      document: documentForL5,
      repairModelId: params.autoHealModelId,
    })
    if (healed.ok) {
      documentForL5 = healed.document
      l5 = validateDocumentWithProjectL5({
        filePath: virtualPath,
        content: documentForL5,
      })
    } else {
      await appendChangeRunLedgerEvent({
        eventType: 'apply_blocked',
        capability: 'AI_CHANGE_APPLY',
        userId: params.userId,
        projectId: params.projectId,
        filePath: virtualPath,
        outcome: 'blocked',
        metadata: {
          reason: 'L5_AUTO_HEAL_EXHAUSTED',
          compilerLog: healed.compilerLog.slice(0, 4000),
          healRounds: healed.rounds,
          runId: params.runId,
          runSource: RUN_SOURCE,
        },
      }).catch(() => {})

      return {
        ok: false,
        response: capabilityResponse({
          error: 'L5_AUTO_HEAL_EXHAUSTED',
          message:
            'Apply blocked: Auto-Heal could not clear project L.5 typecheck within 3 rounds.',
          status: 422,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            path: virtualPath,
            runId: params.runId,
            compilerLog: healed.compilerLog.slice(0, 4000),
            healRounds: healed.rounds,
            autoHealLive: true,
          },
        }),
      }
    }
  }

  if (l5.verdict === 'FAIL') {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: 'AI_CHANGE_APPLY',
      userId: params.userId,
      projectId: params.projectId,
      filePath: virtualPath,
      outcome: 'blocked',
      metadata: {
        reason: 'L5_PROJECT_TYPECHECK_FAIL',
        compilerLog: l5.compilerLog.slice(0, 4000),
        runId: params.runId,
        runSource: RUN_SOURCE,
      },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: 'L5_PROJECT_TYPECHECK_FAIL',
        message:
          'Apply blocked by project L.5 typecheck. Pass enableAutoHeal=true to run live Auto-Heal (≤3 rounds).',
        status: 422,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          path: virtualPath,
          runId: params.runId,
          compilerLog: l5.compilerLog.slice(0, 4000),
          checks: l5.checks,
        },
      }),
    }
  }

  // Prefer healed document for the rest of the apply pipeline
  nextDocument = documentForL5

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
      lastModified,
    },
  }
}

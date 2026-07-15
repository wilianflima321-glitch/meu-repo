import type { NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import { appendChangeRunLedgerEvent } from '@/lib/server/change-run-ledger'
import { loadAgentHandoffContext } from '@/lib/production/agent-handoff-context'
import { evaluateAgentApplyScope } from '@/lib/production/agent-scope-enforcement'
import { acquireAgentSurfaceLocks } from '@/lib/production/agent-surface-locks'
import {
  evaluateAgentReadinessForApply,
  readAgentReadReceiptStateFromSettings,
} from '@/lib/production/agent-read-receipts'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import { readResearchIntelligencePacketFromSettings } from '@/lib/production/research-intelligence-bridge'
import { CAPABILITY, RUN_SOURCE, type ApplyBody, type ApplyChangeInput, type PreparedApplyChange } from './types'

export type ApplyAgentGuardsResult =
  | {
      ok: true
      handoff: Awaited<ReturnType<typeof loadAgentHandoffContext>>
      readReceiptDecision: ReturnType<typeof evaluateAgentReadinessForApply> | null
      surfaceLockDecision: ReturnType<typeof acquireAgentSurfaceLocks> | null
    }
  | { ok: false; response: NextResponse }

export async function enforceAgentApplyGuards(params: {
  userId: string
  projectId: string
  runId: string
  body: ApplyBody
  requestedChanges: ApplyChangeInput[]
  preparedChanges: PreparedApplyChange[]
  enforceAgentScope: boolean
}): Promise<ApplyAgentGuardsResult> {
  const { userId, projectId, runId, body, requestedChanges, preparedChanges, enforceAgentScope } = params
  const handoff = await loadAgentHandoffContext({
    userId,
    projectId,
    routeKind: 'inline-edit',
    requestedAgent: body.agent,
    promptText: requestedChanges.map((change) => `${change.filePath ?? ''}
${change.language ?? ''}`).join('\n'),
    filePath: preparedChanges[0]?.virtualPath,
  })

  const scopeDecision = evaluateAgentApplyScope({
    packet: handoff.packet,
    virtualPaths: preparedChanges.map((change) => change.virtualPath),
    enforceAgentScope,
    broadEdit: requestedChanges.length > 1,
    pathModifiedAt: Object.fromEntries(
      preparedChanges.map((change) => [change.virtualPath, change.lastModified])
    ),
  })

  if (!scopeDecision.allowed) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: preparedChanges[0]?.virtualPath || 'agent-scope',
      outcome: 'blocked',
      metadata: {
        reason: scopeDecision.code,
        runId,
        runSource: RUN_SOURCE,
        agent: handoff.agent,
        ...scopeDecision.metadata,
      },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: scopeDecision.code,
        message: scopeDecision.message,
        status: scopeDecision.status,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          runId,
          runSource: RUN_SOURCE,
          projectId,
          agent: handoff.agent,
          ...scopeDecision.metadata,
        },
      }),
    }
  }

  const readReceiptDecision = body.enforceReadReceipts === true
    ? await (async () => {
        const { prisma } = await import('@/lib/db')
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            OR: [{ userId }, { members: { some: { userId } } }],
          },
          select: { settings: true },
        })

        return evaluateAgentReadinessForApply({
          agent: handoff.agent,
          targetPaths: preparedChanges.map((change) => change.virtualPath),
          enforceReadReceipts: true,
          manifest: readRepositoryCartographyManifestFromSettings(project?.settings),
          researchPacket: readResearchIntelligencePacketFromSettings(project?.settings),
          receiptState: readAgentReadReceiptStateFromSettings(project?.settings),
        })
      })()
    : null

  if (readReceiptDecision && !readReceiptDecision.allowed) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: preparedChanges[0]?.virtualPath || 'agent-read-receipts',
      outcome: 'blocked',
      metadata: {
        reason: readReceiptDecision.code,
        runId,
        runSource: RUN_SOURCE,
        ...readReceiptDecision.metadata,
      },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: readReceiptDecision.code,
        message: readReceiptDecision.message,
        status: readReceiptDecision.status,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          runId,
          runSource: RUN_SOURCE,
          projectId,
          ...readReceiptDecision.metadata,
        },
      }),
    }
  }

  const shouldLockSurfaces = enforceAgentScope || requestedChanges.length > 1
  const surfaceLockDecision = shouldLockSurfaces
    ? acquireAgentSurfaceLocks({
        projectId,
        agent: handoff.agent,
        ownerUserId: userId,
        paths: preparedChanges.map((change) => change.virtualPath),
        source: 'apply',
        reason: CAPABILITY,
        runId,
      })
    : null

  if (surfaceLockDecision && !surfaceLockDecision.allowed) {
    await appendChangeRunLedgerEvent({
      eventType: 'apply_blocked',
      capability: CAPABILITY,
      userId,
      projectId,
      filePath: preparedChanges[0]?.virtualPath || 'agent-surface-lock',
      outcome: 'blocked',
      metadata: {
        reason: surfaceLockDecision.code,
        runId,
        runSource: RUN_SOURCE,
        agent: handoff.agent,
        ...surfaceLockDecision.metadata,
      },
    }).catch(() => {})

    return {
      ok: false,
      response: capabilityResponse({
        error: surfaceLockDecision.code,
        message: surfaceLockDecision.message,
        status: surfaceLockDecision.status,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          runId,
          runSource: RUN_SOURCE,
          projectId,
          agent: handoff.agent,
          ...surfaceLockDecision.metadata,
        },
      }),
    }
  }

  return { ok: true, handoff, readReceiptDecision, surfaceLockDecision }
}

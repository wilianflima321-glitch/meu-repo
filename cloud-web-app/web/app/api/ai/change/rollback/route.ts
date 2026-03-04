import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  hashContent,
  loadRollbackSnapshot,
  markRollbackSnapshotUsed,
  type RollbackSnapshotRecord,
} from '@/lib/server/change-rollback-store'
import { appendChangeRunLedgerEvent, readChangeRunLedgerEvents } from '@/lib/server/change-run-ledger'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import {
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CHANGE_ROLLBACK'
const RUN_SOURCE = 'production'
const MAX_BATCH_ROLLBACKS = 50

type RollbackBody = {
  rollbackToken?: string
  rollbackTokens?: string[]
  runId?: string
  expectedCurrentHash?: string
  expectedCurrentHashes?: Record<string, string>
  force?: boolean
}

type LoadedRollbackTarget = {
  token: string
  snapshot: RollbackSnapshotRecord
  absolutePath: string
  scopedRoot: string
  currentContent: string
}

export async function POST(request: NextRequest) {
  try {
    const runId = `rollback_${Date.now().toString(36)}`
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => null)) as RollbackBody | null

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const rollbackTokens = Array.isArray(body.rollbackTokens)
      ? body.rollbackTokens.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : []
    const singleToken = typeof body.rollbackToken === 'string' ? body.rollbackToken.trim() : ''
    const requestedRunId = typeof body.runId === 'string' ? body.runId.trim() : ''
    let tokens = rollbackTokens.length > 0 ? rollbackTokens : singleToken ? [singleToken] : []

    if (tokens.length === 0 && requestedRunId) {
      const events = await readChangeRunLedgerEvents({
        userId: user.userId,
        eventTypes: ['apply'],
        sinceIso: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        limit: 500,
      })

      const collected = new Set<string>()
      for (const event of events) {
        if (!event.metadata || typeof event.metadata !== 'object') continue
        const meta = event.metadata as Record<string, unknown>
        if (meta.runId !== requestedRunId) continue
        const rollbackToken = typeof meta.rollbackToken === 'string' ? meta.rollbackToken.trim() : ''
        if (!rollbackToken) continue
        collected.add(rollbackToken)
      }

      tokens = [...collected]
      if (tokens.length === 0) {
        return capabilityResponse({
          error: 'ROLLBACK_RUN_NOT_FOUND',
          message: 'No rollback tokens found for the provided runId.',
          status: 404,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: { runId: requestedRunId },
        })
      }
    }

    if (tokens.length === 0) {
      return capabilityResponse({
        error: 'MISSING_ROLLBACK_TOKEN',
        message: 'rollbackToken, rollbackTokens or runId is required.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
      })
    }

    if (tokens.length > MAX_BATCH_ROLLBACKS) {
      return capabilityResponse({
        error: 'ROLLBACK_BATCH_LIMIT_EXCEEDED',
        message: `Maximum ${MAX_BATCH_ROLLBACKS} rollback tokens per request.`,
        status: 413,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          limit: MAX_BATCH_ROLLBACKS,
          received: tokens.length,
        },
      })
    }

    const expectedCurrentHashes =
      body.expectedCurrentHashes && typeof body.expectedCurrentHashes === 'object'
        ? body.expectedCurrentHashes
        : {}
    const force = body.force === true
    const fsRuntime = getFileSystemRuntime()
    const loaded: LoadedRollbackTarget[] = []

    for (const token of tokens) {
      const snapshot = await loadRollbackSnapshot(token)
      if (!snapshot) {
        return capabilityResponse({
          error: 'ROLLBACK_TOKEN_NOT_FOUND',
          message: `Rollback token not found: ${token}.`,
          status: 404,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: { rollbackToken: token },
        })
      }

      if (snapshot.userId !== user.userId) {
        await appendChangeRunLedgerEvent({
          eventType: 'rollback_blocked',
          capability: 'AI_CHANGE_ROLLBACK',
          userId: user.userId,
          projectId: snapshot.projectId,
          filePath: snapshot.filePath,
          outcome: 'blocked',
          metadata: { reason: 'ROLLBACK_TOKEN_FORBIDDEN', runSource: RUN_SOURCE },
        }).catch(() => {})

        return capabilityResponse({
          error: 'ROLLBACK_TOKEN_FORBIDDEN',
          message: 'Rollback token does not belong to this user.',
          status: 403,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: { rollbackToken: token },
        })
      }

      if (snapshot.usedAt) {
        return capabilityResponse({
          error: 'ROLLBACK_TOKEN_ALREADY_USED',
          message: 'Rollback token was already used.',
          status: 409,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: { rollbackToken: token, usedAt: snapshot.usedAt },
        })
      }

      const now = Date.now()
      if (new Date(snapshot.expiresAt).getTime() < now) {
        return capabilityResponse({
          error: 'ROLLBACK_TOKEN_EXPIRED',
          message: 'Rollback token expired.',
          status: 410,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: { rollbackToken: token, expiresAt: snapshot.expiresAt },
        })
      }

      const { absolutePath, root: scopedRoot } = resolveScopedWorkspacePath({
        userId: user.userId,
        projectId: snapshot.projectId,
        requestedPath: snapshot.filePath,
      })

      const current = await fsRuntime.readFile(absolutePath).catch(() => null)
      const currentContent = current?.content || ''
      const currentHash = hashContent(currentContent)
      const expectedCurrentHash =
        typeof expectedCurrentHashes[token] === 'string'
          ? expectedCurrentHashes[token].trim()
          : typeof body.expectedCurrentHash === 'string'
            ? body.expectedCurrentHash.trim()
            : ''

      if (!force && expectedCurrentHash && expectedCurrentHash !== currentHash) {
        await appendChangeRunLedgerEvent({
          eventType: 'rollback_blocked',
          capability: 'AI_CHANGE_ROLLBACK',
          userId: user.userId,
          projectId: snapshot.projectId,
          filePath: snapshot.filePath,
          outcome: 'blocked',
          metadata: { reason: 'CURRENT_HASH_MISMATCH', currentHash, expectedCurrentHash, runSource: RUN_SOURCE },
        }).catch(() => {})

        return capabilityResponse({
          error: 'CURRENT_HASH_MISMATCH',
          message: 'Rollback blocked: current hash does not match expectedCurrentHash.',
          status: 409,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: { rollbackToken: token, currentHash, expectedCurrentHash },
        })
      }

      loaded.push({
        token,
        snapshot,
        absolutePath,
        scopedRoot,
        currentContent,
      })
    }

    const restored: LoadedRollbackTarget[] = []
    for (const target of loaded) {
      try {
        await fsRuntime.writeFile(target.absolutePath, target.snapshot.beforeContent, {
          atomic: true,
          backup: true,
          createDirectories: true,
        })
        await markRollbackSnapshotUsed(target.token)
        restored.push(target)
      } catch (error) {
        let recovered = true
        for (const previous of [...restored].reverse()) {
          try {
            await fsRuntime.writeFile(previous.absolutePath, previous.currentContent, {
              atomic: true,
              backup: false,
              createDirectories: true,
            })
          } catch {
            recovered = false
          }
        }

        await appendChangeRunLedgerEvent({
          eventType: 'rollback_blocked',
          capability: 'AI_CHANGE_ROLLBACK',
          userId: user.userId,
          projectId: target.snapshot.projectId,
          filePath: target.snapshot.filePath,
          outcome: 'failed',
          metadata: {
            runId,
            reason: 'ROLLBACK_WRITE_FAILED',
            runSource: RUN_SOURCE,
            recovered,
            restoredCountBeforeFailure: restored.length,
          },
        }).catch(() => {})

        return capabilityResponse({
          error: 'ROLLBACK_WRITE_FAILED',
          message: 'Rollback failed during file write. Prior restores were reverted when possible.',
          status: 500,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            rollbackToken: target.token,
            recovered,
            restoredCountBeforeFailure: restored.length,
          },
        })
      }
    }

    for (const target of restored) {
      await appendChangeRunLedgerEvent({
        eventType: 'rollback',
        capability: 'AI_CHANGE_ROLLBACK',
        userId: user.userId,
        projectId: target.snapshot.projectId,
        filePath: target.snapshot.filePath,
        outcome: 'success',
        metadata: {
          runId,
          rollbackToken: target.token,
          restoredHash: hashContent(target.snapshot.beforeContent),
          batchSize: restored.length,
          runSource: RUN_SOURCE,
        },
      }).catch(() => {})
    }

    const rollbackSummary = restored.map((target) => ({
      rollbackToken: target.token,
      path: toVirtualWorkspacePath(target.absolutePath, target.scopedRoot),
      restoredHash: hashContent(target.snapshot.beforeContent),
      rollbackUsedAt: new Date().toISOString(),
    }))

    return capabilityResponse({
      error: 'NONE',
      message: restored.length === 1 ? 'Rollback applied successfully.' : `Applied ${restored.length} rollbacks successfully.`,
      status: 200,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P0',
      metadata: {
        runId,
        runSource: RUN_SOURCE,
        requestedRunId: requestedRunId || undefined,
        rollbackCount: restored.length,
        rollbackToken: restored.length === 1 ? restored[0].token : undefined,
        rollbacks: rollbackSummary,
      },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped

    return NextResponse.json(
      {
        error: 'ROLLBACK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process rollback request',
      },
      { status: 500 }
    )
  }
}

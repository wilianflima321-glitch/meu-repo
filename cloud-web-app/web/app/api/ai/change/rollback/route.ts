import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { consumeRollbackSnapshot, getRollbackSnapshot } from '@/lib/server/change-apply-runtime'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import {
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'

type RollbackRequestBody = {
  rollbackToken?: string
}

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAuth(request)
    await requireEntitlementsForUser(auth.userId)

    const body = (await request.json().catch(() => null)) as RollbackRequestBody | null
    const rollbackToken = String(body?.rollbackToken || '').trim()

    if (!rollbackToken) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'rollbackToken is required.' },
        { status: 400 }
      )
    }

    const snapshot = getRollbackSnapshot(rollbackToken, auth.userId)
    if (!snapshot) {
      return NextResponse.json(
        {
          error: 'ROLLBACK_TOKEN_INVALID',
          message: 'Rollback token not found or expired.',
          capability: 'AI_CHANGE_ROLLBACK',
          capabilityStatus: 'PARTIAL',
        },
        { status: 404 }
      )
    }

    const scoped = resolveScopedWorkspacePath({
      userId: auth.userId,
      projectId: snapshot.projectId,
      requestedPath: snapshot.filePath,
    })
    const fsRuntime = getFileSystemRuntime()
    const current = await fsRuntime.readFile(scoped.absolutePath)
    const currentHash = computeHash(current.content)

    if (snapshot.expectedCurrentHash && snapshot.expectedCurrentHash !== currentHash) {
      return NextResponse.json(
        {
          error: 'ROLLBACK_STALE_CONTEXT',
          message: 'File changed after apply. Rollback refused to avoid clobbering newer edits.',
          capability: 'AI_CHANGE_ROLLBACK',
          capabilityStatus: 'PARTIAL',
          metadata: {
            expectedCurrentHash: snapshot.expectedCurrentHash,
            currentHash,
            projectId: snapshot.projectId,
          },
        },
        { status: 409 }
      )
    }

    const consumedSnapshot = consumeRollbackSnapshot(rollbackToken, auth.userId)
    if (!consumedSnapshot) {
      return NextResponse.json(
        {
          error: 'ROLLBACK_TOKEN_INVALID',
          message: 'Rollback token no longer available.',
          capability: 'AI_CHANGE_ROLLBACK',
          capabilityStatus: 'PARTIAL',
        },
        { status: 404 }
      )
    }

    await fsRuntime.writeFile(scoped.absolutePath, consumedSnapshot.content, {
      atomic: true,
      backup: true,
      createDirectories: true,
    })

    return NextResponse.json({
      success: true,
      capability: 'AI_CHANGE_ROLLBACK',
      capabilityStatus: 'IMPLEMENTED',
      projectId: consumedSnapshot.projectId,
      filePath: toVirtualWorkspacePath(scoped.absolutePath, scoped.root),
      hash: computeHash(consumedSnapshot.content),
      content: consumedSnapshot.content,
      restoredAt: new Date().toISOString(),
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped

    return NextResponse.json(
      {
        error: 'ROLLBACK_FAILED',
        message: error instanceof Error ? error.message : 'Unknown rollback error',
      },
      { status: 500 }
    )
  }
}

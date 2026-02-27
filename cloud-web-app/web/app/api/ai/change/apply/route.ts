import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { validateAiChange } from '@/lib/server/change-validation'
import { createRollbackSnapshot } from '@/lib/server/change-apply-runtime'
import { capabilityResponse } from '@/lib/server/capability-response'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'

type ApplyRequestBody = {
  filePath?: string
  projectId?: string
  original?: string
  modified?: string
  language?: string
  range?: {
    startOffset?: number
    endOffset?: number
  }
}

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function parseOffset(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }
  return fallback
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-change-apply-post',
      key: auth.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many AI apply change requests. Please wait before retrying.',
    })
    if (rateLimitResponse) return rateLimitResponse
    await requireEntitlementsForUser(auth.userId)

    const body = (await request.json().catch(() => null)) as ApplyRequestBody | null
    const filePath = String(body?.filePath || '').trim()
    const original = typeof body?.original === 'string' ? body.original : ''
    const modified = typeof body?.modified === 'string' ? body.modified : ''
    const language = typeof body?.language === 'string' ? body.language : undefined
    const projectId = getScopedProjectId(request, (body || {}) as Record<string, unknown>)

    if (!filePath) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'filePath is required.' },
        { status: 400 }
      )
    }

    const scoped = resolveScopedWorkspacePath({
      userId: auth.userId,
      projectId,
      requestedPath: filePath,
    })
    const fsRuntime = getFileSystemRuntime()
    const readResult = await fsRuntime.readFile(scoped.absolutePath)
    const currentContent = readResult.content

    const hasRange = body?.range && (body.range.startOffset !== undefined || body.range.endOffset !== undefined)
    const startOffset = hasRange ? parseOffset(body?.range?.startOffset, 0) : 0
    const endOffset = hasRange ? parseOffset(body?.range?.endOffset, currentContent.length) : currentContent.length

    if (startOffset > endOffset || endOffset > currentContent.length) {
      return NextResponse.json(
        { error: 'INVALID_RANGE', message: 'range offsets are invalid for current document.' },
        { status: 400 }
      )
    }

    const originalSlice = currentContent.slice(startOffset, endOffset)
    if (original !== originalSlice) {
      return capabilityResponse({
        error: 'STALE_CONTEXT',
        message: 'Document changed before apply. Refresh editor context and retry.',
        status: 409,
        capability: 'AI_CHANGE_APPLY',
        capabilityStatus: 'PARTIAL',
        metadata: {
          expectedLength: original.length,
          currentLength: originalSlice.length,
          projectId,
        },
      })
    }

    const nextDocument = `${currentContent.slice(0, startOffset)}${modified}${currentContent.slice(endOffset)}`
    const validation = validateAiChange({
      original,
      modified,
      fullDocument: nextDocument,
      language,
      filePath,
    })

    if (!validation.canApply) {
      return capabilityResponse({
        error: 'VALIDATION_BLOCKED',
        message: 'Validation blocked apply.',
        status: 422,
        capability: 'AI_CHANGE_APPLY',
        capabilityStatus: 'PARTIAL',
        metadata: {
          projectId,
          checks: validation.checks,
          verdict: validation.verdict,
        },
      })
    }

    await fsRuntime.writeFile(scoped.absolutePath, nextDocument, {
      atomic: true,
      backup: true,
      createDirectories: true,
    })

    const snapshot = createRollbackSnapshot({
      userId: auth.userId,
      projectId,
      filePath: toVirtualWorkspacePath(scoped.absolutePath, scoped.root),
      content: currentContent,
      expectedCurrentHash: computeHash(nextDocument),
    })

    return NextResponse.json({
      success: true,
      capability: 'AI_CHANGE_APPLY',
      capabilityStatus: 'IMPLEMENTED',
      projectId,
      filePath: toVirtualWorkspacePath(scoped.absolutePath, scoped.root),
      content: nextDocument,
      hashBefore: computeHash(currentContent),
      hashAfter: computeHash(nextDocument),
      validation: {
        canApply: validation.canApply,
        verdict: validation.verdict,
        checks: validation.checks,
      },
      rollback: {
        token: snapshot.token,
        expiresAt: snapshot.expiresAt,
      },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped

    return NextResponse.json(
      {
        error: 'APPLY_FAILED',
        message: error instanceof Error ? error.message : 'Unknown apply error',
      },
      { status: 500 }
    )
  }
}

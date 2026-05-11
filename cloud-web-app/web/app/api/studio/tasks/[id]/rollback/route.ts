import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { appendTaskLog, loadTask, updateTaskStatus } from '@/lib/server/task-store'

type RollbackBody = {
  rollbackToken?: string
  rollbackTokens?: string[]
  runId?: string
  expectedCurrentHash?: string
  expectedCurrentHashes?: Record<string, string>
  force?: boolean
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  const copy = ['cookie', 'authorization', 'x-request-id', 'x-trace-id']
  for (const key of copy) {
    const value = request.headers.get(key)
    if (value) headers.set(key, value)
  }
  headers.set('content-type', 'application/json')
  return headers
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const taskId = context.params?.id
    if (!taskId) {
      return NextResponse.json({ error: 'MISSING_TASK_ID' }, { status: 400 })
    }

    const task = await loadTask(user.userId, taskId)
    if (!task) {
      return NextResponse.json({ error: 'TASK_NOT_FOUND' }, { status: 404 })
    }

    const body = (await request.json().catch(() => null)) as RollbackBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const hasToken = typeof body.rollbackToken === 'string' && body.rollbackToken.trim().length > 0
    const hasTokens = Array.isArray(body.rollbackTokens) && body.rollbackTokens.length > 0
    const hasRunId = typeof body.runId === 'string' && body.runId.trim().length > 0
    if (!hasToken && !hasTokens && !hasRunId) {
      await appendTaskLog(task, {
        level: 'warning',
        message: 'Rollback blocked: missing rollback token or run id.',
      })
      await updateTaskStatus(task, 'blocked', { error: 'MISSING_ROLLBACK_REFERENCE' })
      return NextResponse.json({ error: 'MISSING_ROLLBACK_REFERENCE' }, { status: 400 })
    }

    const origin = new URL(request.url).origin
    const response = await fetch(`${origin}/api/ai/change/rollback`, {
      method: 'POST',
      headers: buildForwardHeaders(request),
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)
    const success = response.ok && payload?.error === 'NONE'

    await appendTaskLog(task, {
      level: success ? 'info' : 'error',
      message: success ? 'Rollback completed.' : 'Rollback failed.',
      metadata: payload ?? { status: response.status },
    })

    await updateTaskStatus(task, success ? 'done' : 'blocked', {
      result: payload ?? { status: response.status },
      error: success ? undefined : String(payload?.error || 'ROLLBACK_FAILED'),
    })

    return NextResponse.json(payload ?? { error: 'ROLLBACK_FAILED' }, { status: response.status })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'STUDIO_TASK_ROLLBACK_FAILED' }, { status: 500 })
  }
}

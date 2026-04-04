import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { validateAiChange } from '@/lib/server/change-validation'
import { generateUnifiedDiff } from '@/lib/server/patch-engine'
import { appendTaskLog, loadTask, updateTaskStatus } from '@/lib/server/task-store'
import { loadExecutionContext } from '@/lib/server/execution-context'

type RunBody = {
  projectId?: string
  changes?: Array<{
    filePath?: string
    original?: string
    modified?: string
    fullDocument?: string
    language?: string
    enforceOriginalMatch?: boolean
    approvedHighRisk?: boolean
  }>
  executionMode?: 'workspace' | 'sandbox'
  approvedHighRisk?: boolean
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

    const body = (await request.json().catch(() => null)) as RunBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    if (!Array.isArray(body.changes) || body.changes.length === 0) {
      await appendTaskLog(task, {
        level: 'warning',
        message: 'Run blocked: no changes provided.',
      })
      await updateTaskStatus(task, 'blocked', { error: 'MISSING_CHANGES' })
      return NextResponse.json({ error: 'MISSING_CHANGES' }, { status: 400 })
    }

    await updateTaskStatus(task, 'running')

    const fileTargets = body.changes
      .map((change) => (typeof change.filePath === 'string' ? change.filePath : ''))
      .filter(Boolean)

    if (fileTargets.length > 0 && task.projectId) {
      const contextData = await loadExecutionContext({
        userId: user.userId,
        projectId: task.projectId,
        filePaths: fileTargets,
      })
      await appendTaskLog(task, {
        level: 'info',
        message: 'Execution context loaded.',
        metadata: { context: contextData },
      })
    }

    const validationResults = body.changes.map((change) =>
      validateAiChange({
        original: typeof change.original === 'string' ? change.original : '',
        modified: typeof change.modified === 'string' ? change.modified : '',
        fullDocument: typeof change.fullDocument === 'string' ? change.fullDocument : undefined,
        language: typeof change.language === 'string' ? change.language : undefined,
        filePath: typeof change.filePath === 'string' ? change.filePath : undefined,
      })
    )

    const canApply = validationResults.every((result) => result.canApply)
    const diffResults = await Promise.all(
      body.changes.map((change) =>
        generateUnifiedDiff({
          original: typeof change.original === 'string' ? change.original : '',
          modified: typeof change.modified === 'string' ? change.modified : '',
          filePath: typeof change.filePath === 'string' ? change.filePath : undefined,
        })
      )
    )

    await appendTaskLog(task, {
      level: canApply ? 'info' : 'warning',
      message: canApply ? 'Validation passed.' : 'Validation blocked apply.',
      metadata: { validationResults, diffs: diffResults },
    })

    if (!canApply) {
      await updateTaskStatus(task, 'blocked', { error: 'VALIDATION_BLOCKED' })
      return NextResponse.json({ error: 'VALIDATION_BLOCKED', validationResults, diffs: diffResults }, { status: 422 })
    }

    const origin = new URL(request.url).origin
    const response = await fetch(`${origin}/api/ai/change/apply`, {
      method: 'POST',
      headers: buildForwardHeaders(request),
      body: JSON.stringify({
        projectId: body.projectId || task.projectId,
        changes: body.changes,
        approvedHighRisk: body.approvedHighRisk,
        executionMode: body.executionMode || 'workspace',
      }),
    })

    const payload = await response.json().catch(() => null)
    const success = response.ok && payload?.error === 'NONE'

    await appendTaskLog(task, {
      level: success ? 'info' : 'error',
      message: success ? 'Run completed.' : 'Run failed.',
      metadata: payload ?? { status: response.status },
    })

    await updateTaskStatus(task, success ? 'done' : 'failed', {
      result: payload ?? { status: response.status },
      error: success ? undefined : String(payload?.error || 'RUN_FAILED'),
    })

    return NextResponse.json(payload ?? { error: 'RUN_FAILED' }, { status: response.status })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'RUN_FAILED' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { validateAiChange } from '@/lib/server/change-validation'
import { generateUnifiedDiff } from '@/lib/server/patch-engine'
import { appendTaskLog, loadTask, updateTaskStep } from '@/lib/server/task-store'

type ValidateBody = {
  filePath?: string
  original?: string
  modified?: string
  fullDocument?: string
  language?: string
  stepId?: string
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

    const body = (await request.json().catch(() => null)) as ValidateBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const original = typeof body.original === 'string' ? body.original : ''
    const modified = typeof body.modified === 'string' ? body.modified : ''
    const fullDocument = typeof body.fullDocument === 'string' ? body.fullDocument : undefined
    const language = typeof body.language === 'string' ? body.language : undefined
    const filePath = typeof body.filePath === 'string' ? body.filePath : undefined

    if (!modified.trim()) {
      return NextResponse.json({ error: 'MISSING_MODIFIED_CONTENT' }, { status: 400 })
    }

    const validation = validateAiChange({
      original,
      modified,
      fullDocument,
      language,
      filePath,
    })

    const diff = await generateUnifiedDiff({
      original,
      modified,
      filePath,
    })

    await appendTaskLog(task, {
      level: validation.canApply ? 'info' : 'warning',
      message: validation.canApply ? 'Validation passed.' : 'Validation blocked apply.',
      metadata: {
        validation,
        diff,
      },
    })

    if (body.stepId) {
      await updateTaskStep(task, body.stepId, {
        status: validation.canApply ? 'done' : 'blocked',
        finishedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      canApply: validation.canApply,
      verdict: validation.verdict,
      checks: validation.checks,
      dependencyImpact: validation.dependencyImpact,
      diff,
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 500 })
  }
}

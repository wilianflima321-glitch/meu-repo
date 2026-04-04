import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import { apiErrorToResponse } from '@/lib/api-errors'
import { buildBaselineSteps, createTask } from '@/lib/server/task-store'

type PlanBody = {
  goal?: string
  projectId?: string
  steps?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => null)) as PlanBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const goal = typeof body.goal === 'string' ? body.goal.trim() : ''
    if (!goal) {
      return capabilityResponse({
        error: 'MISSING_GOAL',
        message: 'Goal is required to plan a task.',
        status: 400,
        capability: 'STUDIO_TASK_PLAN',
        capabilityStatus: 'PARTIAL',
      })
    }

    const steps =
      Array.isArray(body.steps) && body.steps.length > 0
        ? body.steps.map((title) => ({
            id: crypto.randomUUID(),
            title: String(title),
            status: 'pending' as const,
          }))
        : buildBaselineSteps()

    const task = await createTask({
      userId: user.userId,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      goal,
      steps,
    })

    return capabilityResponse({
      error: 'NONE',
      message: 'Task plan created.',
      status: 200,
      capability: 'STUDIO_TASK_PLAN',
      capabilityStatus: 'IMPLEMENTED',
      metadata: { task },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'PLAN_FAILED', message: 'Failed to plan task.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { buildBaselineSteps, createTask } from '@/lib/server/task-store'
import { attachStudioSessionTask, loadStudioSession } from '@/lib/server/studio-session-store'

type WaveAgent = {
  id?: string
  role?: string
  goal?: string
  surface?: string
}

type RunWaveBody = {
  sessionId?: string
  projectId?: string
  goal?: string
  agents?: WaveAgent[]
}

const MAX_WAVE_AGENTS = 8

function normalizeAgentGoal(agent: WaveAgent, fallbackGoal: string, index: number): string {
  const role = typeof agent.role === 'string' && agent.role.trim() ? agent.role.trim() : `Agent ${index + 1}`
  const goal = typeof agent.goal === 'string' && agent.goal.trim() ? agent.goal.trim() : fallbackGoal
  const surface = typeof agent.surface === 'string' && agent.surface.trim() ? ` Surface: ${agent.surface.trim()}.` : ''
  return `${role}: ${goal}.${surface}`
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => null)) as RunWaveBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const goal = typeof body.goal === 'string' ? body.goal.trim() : ''
    if (!goal) {
      return NextResponse.json({ error: 'MISSING_GOAL', message: 'Goal is required to run a task wave.' }, { status: 400 })
    }

    const agents = Array.isArray(body.agents) && body.agents.length > 0 ? body.agents.slice(0, MAX_WAVE_AGENTS) : [{}]
    const session = typeof body.sessionId === 'string' ? await loadStudioSession(user.userId, body.sessionId) : null
    if (body.sessionId && !session) {
      return NextResponse.json({ error: 'STUDIO_SESSION_NOT_FOUND' }, { status: 404 })
    }
    if (session?.status === 'stopped') {
      return NextResponse.json({ error: 'STUDIO_SESSION_STOPPED' }, { status: 409 })
    }

    const tasks = []
    for (let index = 0; index < agents.length; index += 1) {
      const task = await createTask({
        userId: user.userId,
        projectId: typeof body.projectId === 'string' ? body.projectId : session?.projectId,
        goal: normalizeAgentGoal(agents[index], goal, index),
        steps: buildBaselineSteps(),
      })
      tasks.push(task)
      if (session) {
        await attachStudioSessionTask(session, task.id, `mission-ledger://${session.id}/${task.id}`)
      }
    }

    return NextResponse.json({
      status: 'planned',
      sessionId: session?.id,
      taskCount: tasks.length,
      tasks,
      maxWaveAgents: MAX_WAVE_AGENTS,
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'STUDIO_TASK_RUN_WAVE_FAILED' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { loadTask } from '@/lib/server/task-store'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
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

    return NextResponse.json({ task })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'TASK_LOAD_FAILED' }, { status: 500 })
  }
}
